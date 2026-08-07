"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { apiRequest } from "../../lib/api";
import UserMenu from "../../components/user-menu";
import ProfilePage from "../../components/dashboard/profile-page";
import SettingsPage from "../../components/dashboard/settings-page";
import KycPage from "../../components/dashboard/kyc-page";
import SecurityPage from "../../components/dashboard/security-page";
import NotificationsPage from "../../components/dashboard/notifications-page";
import { KYC_STATUS, kycStatusLabel, isApprovedKycStatus, type KycStatus } from "../../lib/verification-status";

/* ── Types matching actual backend API responses ── */
interface Me { user: { id: string; email: string; role: string; emailVerified?: boolean; profile?: { firstName?: string | null; lastName?: string | null; country?: string | null } } }
interface BalanceData { depositedUsd: string; activeInvestmentPrincipalUsd: string; completedReturnUsd: string; lockedWithdrawalUsd: string; availableUsd: string }
interface InvestmentPlan { name: string; durationDays: number; estimatedYieldMin: string; estimatedYieldMax: string; riskLevel?: string; supportedAssets?: string[] }
interface Investment { id: string; plan: InvestmentPlan; principalUsd: string; expectedReturnUsd: string; assetSymbol: string; status: string; startedAt: string; maturesAt: string; accruedInterestUsd?: string; currentAccruedValueUsd?: string; progressPercent?: number; daysElapsed?: number; daysRemaining?: number; dailyAccrualUsd?: string; projectedPayoutUsd?: string }
interface Withdrawal { id: string; amountUsd: string; assetSymbol: string; network: string; destination: string; status: string; createdAt: string; investmentId?: string | null; investment?: { id: string; plan: { name: string }; principalUsd: string; maturesAt: string; status: string } | null }
interface Deposit { id: string; amountUsd: string; assetSymbol: string; network: string; status: string; depositAddress: string; txHash?: string; createdAt: string; proofUrl?: string }
interface KycCheck { id: string; status: KycStatus; provider: string; createdAt: string }
interface ApiNotification { id: string; title: string; body: string; readAt: string | null; createdAt: string }
interface DepositOption { assetSymbol: string; network: string; label: string; wallet: { id: string; address: string; instructions: string; provider: string } | null }

function usd(v: string | number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(Number(v)); }
function shortDate(d: string) { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }

function AnimatedNumber({ value, prefix = "", suffix = "", decimals = 2 }: { value: number; prefix?: string; suffix?: string; decimals?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const duration = 1200;
    const startTime = performance.now();
    function tick(now: number) {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(eased * value);
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [value]);
  return <>{prefix}{display.toFixed(decimals)}{suffix}</>;
}

function getInvestorLevel(totalInvested: number) {
  if (totalInvested >= 100000) return { name: "Diamond Investor", cls: "level-diamond", icon: "💎" };
  if (totalInvested >= 50000) return { name: "Platinum Investor", cls: "level-platinum", icon: "🏆" };
  if (totalInvested >= 20000) return { name: "Gold Investor", cls: "level-gold", icon: "🥇" };
  if (totalInvested >= 5000) return { name: "Silver Investor", cls: "level-silver", icon: "🥈" };
  return { name: "Bronze Investor", cls: "level-bronze", icon: "🥉" };
}

function FloatingParticles() {
  const particles = useMemo(() => Array.from({ length: 30 }, (_, i) => ({ id: i, left: `${Math.random() * 100}%`, delay: `${Math.random() * 8}s`, duration: `${8 + Math.random() * 12}s`, size: `${1 + Math.random() * 3}px`, opacity: 0.1 + Math.random() * 0.3 })), []);
  return <div className="bg-particles">{particles.map(p => <div key={p.id} className="particle" style={{ left: p.left, animationDelay: p.delay, animationDuration: p.duration, width: p.size, height: p.size, opacity: p.opacity }} />)}</div>;
}

function CircularProgress({ percent, size = 56, stroke = 4, color = "#68f1c4" }: { percent: number; size?: number; stroke?: number; color?: string }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  return (
    <svg width={size} height={size} className="circular-progress">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
      <motion.circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={circumference} strokeLinecap="round" initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: offset }} transition={{ duration: 1.5, ease: "easeOut" }} />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fill="white" fontSize={size * 0.22} fontWeight="700">{Math.round(percent)}%</text>
    </svg>
  );
}

function PortfolioChart({ investments }: { investments: Investment[] }) {
  const [range, setRange] = useState<"7d" | "30d" | "90d" | "1y">("30d");
  const chartData = useMemo(() => {
    const now = new Date();
    const days = range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 365;
    const totalInvested = investments.reduce((s, i) => s + Number(i.principalUsd), 0);
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(now.getTime() - (days - i) * 86400000);
      return { date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), value: Math.round(totalInvested * (1 + 0.004 * i) * 100) / 100 };
    });
  }, [investments, range]);
  const totalValue = chartData[chartData.length - 1]?.value ?? 0;
  const startValue = chartData[0]?.value ?? 0;
  const change = startValue > 0 ? ((totalValue - startValue) / startValue) * 100 : 0;
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card-static p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-medium text-slate-400">Portfolio Performance</h3>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="text-3xl font-bold text-white">{usd(totalValue)}</span>
            <span className={`flex items-center gap-1 text-sm font-semibold ${change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              <svg className={`h-3.5 w-3.5 ${change < 0 ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
              {change.toFixed(2)}%
            </span>
          </div>
        </div>
        <div className="flex gap-1 rounded-xl bg-white/5 p-1">
          {(["7d", "30d", "90d", "1y"] as const).map(r => (
            <button key={r} onClick={() => setRange(r)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${range === r ? "bg-mint/20 text-mint" : "text-slate-400 hover:text-white"}`}>{r.toUpperCase()}</button>
          ))}
        </div>
      </div>
      <div className="mt-6 h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <defs><linearGradient id="mintGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#68f1c4" stopOpacity={0.3} /><stop offset="100%" stopColor="#68f1c4" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}K`} />
            <Tooltip contentStyle={{ background: "rgba(8,17,31,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", backdropFilter: "blur(20px)", color: "#f8fafc" }} formatter={(value: number) => [usd(value), "Value"]} />
            <Area type="monotone" dataKey="value" stroke="#68f1c4" strokeWidth={2.5} fill="url(#mintGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

/* ── QR Code component using external API ── */
function QRCodeImage({ data, size = 180 }: { data: string; size?: number }) {
  if (!data) return null;
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&bgcolor=08111f00&color=68f1c4&margin=8`;
  return <img src={url} alt="QR Code" width={size} height={size} className="rounded-xl border border-white/10" />;
}

export default function DashboardClient({ initialToken }: { initialToken?: string }) {
  const [me, setMe] = useState<Me | null>(null);
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [kycChecks, setKycChecks] = useState<KycCheck[]>([]);
  const [apiNotifications, setApiNotifications] = useState<ApiNotification[]>([]);
  const [referralCode, setReferralCode] = useState("");
  const [referralCount, setReferralCount] = useState(0);
  const [referralEarnings, setReferralEarnings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "investments" | "deposits" | "withdrawals" | "referrals" | "achievements" | "profile" | "settings" | "kyc" | "security" | "notifications">("overview");
  const [showNotifications, setShowNotifications] = useState(false);

  /* ── Deposit form state ── */
  const [depositOptions, setDepositOptions] = useState<DepositOption[]>([]);
  const [selectedDepositOption, setSelectedDepositOption] = useState<DepositOption | null>(null);
  const [depositAmountUsd, setDepositAmountUsd] = useState("");
  const [depositTxHash, setDepositTxHash] = useState("");
  const [depositProofUrl, setDepositProofUrl] = useState("");
  const [depositSubmitting, setDepositSubmitting] = useState(false);
  const [depositError, setDepositError] = useState("");
  const [depositSuccess, setDepositSuccess] = useState("");
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [showCreateDeposit, setShowCreateDeposit] = useState(false);

  /* ── Withdrawal form state ── */
  const [showCreateWithdrawal, setShowCreateWithdrawal] = useState(false);
  const [withdrawalAsset, setWithdrawalAsset] = useState<"BTC" | "ETH" | "USDT" | "USDC" | "BNB" | "SOL">("USDT");
  const [withdrawalNetwork, setWithdrawalNetwork] = useState("");
  const [withdrawalDestination, setWithdrawalDestination] = useState("");
  const [withdrawalAmountUsd, setWithdrawalAmountUsd] = useState("");
  const [withdrawalSubmitting, setWithdrawalSubmitting] = useState(false);
  const [withdrawalError, setWithdrawalError] = useState("");
  const [withdrawalSuccess, setWithdrawalSuccess] = useState("");

  const fetchData = useCallback(() => {
    return Promise.all([
      apiRequest<Me>("/auth/me").then(setMe).catch(() => {}),
      apiRequest<{ balance: BalanceData }>("/payments/balance").then(d => setBalance(d.balance)).catch(() => {}),
      apiRequest<{ investments: Investment[] }>("/investments").then(d => setInvestments(d.investments)).catch(() => setInvestments([])),
      apiRequest<{ withdrawals: Withdrawal[] }>("/withdrawals").then(d => setWithdrawals(d.withdrawals)).catch(() => setWithdrawals([])),
      apiRequest<{ deposits: Deposit[] }>("/payments/deposits").then(d => setDeposits(d.deposits)).catch(() => setDeposits([])),
      apiRequest<{ checks: KycCheck[] }>("/kyc/status").then(d => setKycChecks(d.checks)).catch(() => setKycChecks([])),
      apiRequest<{ notifications: ApiNotification[] }>("/notifications").then(d => setApiNotifications(d.notifications)).catch(() => setApiNotifications([])),
      apiRequest<{ referralCode: string; referralCount: number; referralEarnings: string }>("/referrals").then(d => { setReferralCode(d.referralCode || ""); setReferralCount(d.referralCount || 0); setReferralEarnings(Number(d.referralEarnings) || 0); }).catch(() => {}),
      apiRequest<{ options: DepositOption[] }>("/payments/deposit-options").then(d => setDepositOptions(d.options)).catch(() => setDepositOptions([])),
    ]);
  }, []);

  useEffect(() => {
    if (initialToken) { localStorage.setItem("truevesti.session", JSON.stringify({ accessToken: initialToken, refreshToken: "", user: {} })); }
    fetchData().finally(() => setLoading(false));
  }, [initialToken, fetchData]);

  /* ── Computed values from real backend data ── */
  const availableBalance = Number(balance?.availableUsd ?? 0);
  const totalInvested = Number(balance?.activeInvestmentPrincipalUsd ?? 0);
  const totalProfit = Number(balance?.completedReturnUsd ?? 0);
  const totalDeposited = Number(balance?.depositedUsd ?? 0);
  /* Portfolio value = deposited + accrued interest from active investments */
  const totalAccruedFromActive = investments.filter(i => i.status === "ACTIVE").reduce((s, i) => s + Number(i.accruedInterestUsd || 0), 0);
  const totalPortfolio = totalDeposited + totalAccruedFromActive;
  const activeInvestments = investments.filter(i => i.status === "ACTIVE");
  const pendingWithdrawals = withdrawals.filter(w => w.status === "PENDING" || w.status === "APPROVED").reduce((s, w) => s + Number(w.amountUsd), 0);
  const totalWithdrawn = withdrawals.filter(w => w.status === "PAID").reduce((s, w) => s + Number(w.amountUsd), 0);
  const todayEarnings = activeInvestments.reduce((s, i) => s + Number(i.dailyAccrualUsd || 0), 0);
  const weekEarnings = todayEarnings * 7;
  const monthEarnings = todayEarnings * 30;
  const investorLevel = getInvestorLevel(totalInvested);
  const latestKycStatus = kycChecks.length > 0 ? kycChecks[0].status : KYC_STATUS.NOT_SUBMITTED;
  /* KYC display: derive from same KycCheck.status field used by admin */
  const kycDisplayText = kycStatusLabel(latestKycStatus).replace(" Review", "");

  /* ── Withdrawal eligibility: compute per-investment maturity-aware amounts ── */
  const withdrawalEligibility = useMemo(() => {
    return investments.filter(i => i.status === "ACTIVE" || i.status === "MATURED").map(inv => {
      const now = new Date();
      const maturesAt = new Date(inv.maturesAt);
      const isMatured = now >= maturesAt;
      const principal = Number(inv.principalUsd);
      const accruedProfit = Number(inv.accruedInterestUsd || 0);
      const daysRemaining = inv.daysRemaining || 0;
      return {
        investment: inv,
        isMatured,
        principal,
        accruedProfit,
        daysRemaining,
        /* Before maturity: only profit is withdrawable. After maturity: principal + profit */
        withdrawableProfit: accruedProfit,
        withdrawablePrincipal: isMatured ? principal : 0,
        totalWithdrawable: isMatured ? principal + accruedProfit : accruedProfit,
      };
    });
  }, [investments]);

  const totalWithdrawableBeforeMaturity = withdrawalEligibility.filter(w => !w.isMatured).reduce((s, w) => s + w.withdrawableProfit, 0);
  const totalWithdrawableAfterMaturity = withdrawalEligibility.filter(w => w.isMatured).reduce((s, w) => s + w.totalWithdrawable, 0);
  const totalWithdrawable = availableBalance + totalWithdrawableBeforeMaturity;

  const notifications = [
    ...apiNotifications.slice(0, 5).map(n => ({ msg: `${n.title}: ${n.body}`, time: n.createdAt, icon: "🔔" })),
    ...deposits.slice(0, 3).map(d => ({ msg: `Deposit ${usd(d.amountUsd)} ${d.status}`, time: d.createdAt, icon: "💰" })),
    ...withdrawals.slice(0, 3).map(w => ({ msg: `Withdrawal ${usd(w.amountUsd)} ${w.status}`, time: w.createdAt, icon: "🏦" })),
    ...activeInvestments.slice(0, 2).map(i => ({ msg: `${i.plan.name} earning ${usd(i.dailyAccrualUsd || 0)}/day`, time: i.startedAt, icon: "📈" })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 8);

  const tabs = [
    { id: "overview" as const, label: "Overview", icon: "📊" },
    { id: "investments" as const, label: "Investments", icon: "📈" },
    { id: "deposits" as const, label: "Deposits", icon: "💰" },
    { id: "withdrawals" as const, label: "Withdrawals", icon: "🏦" },
    { id: "referrals" as const, label: "Referrals", icon: "🤝" },
    { id: "achievements" as const, label: "Achievements", icon: "🏆" },
  ];

  /* ── Deposit handlers ── */
  async function handleCopyAddress(address: string) {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch { /* fallback */ }
  }

  async function handleSubmitDeposit() {
    if (!selectedDepositOption) { setDepositError("Please select an asset"); return; }
    if (!depositAmountUsd || Number(depositAmountUsd) <= 0) { setDepositError("Please enter a valid amount"); return; }
    if (!depositTxHash || depositTxHash.length < 8) { setDepositError("Please enter a valid transaction hash"); return; }
    setDepositError("");
    setDepositSubmitting(true);
    try {
      await apiRequest("/payments/deposits/manual", {
        method: "POST",
        body: JSON.stringify({
          assetSymbol: selectedDepositOption.assetSymbol,
          network: selectedDepositOption.network,
          amountUsd: Number(depositAmountUsd),
          txHash: depositTxHash,
          proofUrl: depositProofUrl || undefined,
        }),
      });
      setDepositSuccess("Deposit submitted successfully! Awaiting admin approval.");
      setDepositAmountUsd("");
      setDepositTxHash("");
      setDepositProofUrl("");
      setSelectedDepositOption(null);
      setShowCreateDeposit(false);
      fetchData();
    } catch (err) {
      setDepositError(err instanceof Error ? err.message : "Failed to submit deposit");
    } finally {
      setDepositSubmitting(false);
    }
  }

  /* ── Withdrawal handler ── */
  async function handleSubmitWithdrawal() {
    if (!withdrawalNetwork) { setWithdrawalError("Please enter a network"); return; }
    if (!withdrawalDestination || withdrawalDestination.length < 8) { setWithdrawalError("Please enter a valid destination address"); return; }
    if (!withdrawalAmountUsd || Number(withdrawalAmountUsd) <= 0) { setWithdrawalError("Please enter a valid amount"); return; }
    if (Number(withdrawalAmountUsd) > totalWithdrawable) { setWithdrawalError(`Amount exceeds withdrawable balance of ${usd(totalWithdrawable)}`); return; }
    setWithdrawalError("");
    setWithdrawalSubmitting(true);
    try {
      await apiRequest("/withdrawals", {
        method: "POST",
        body: JSON.stringify({
          assetSymbol: withdrawalAsset,
          network: withdrawalNetwork.toUpperCase(),
          destination: withdrawalDestination,
          amountUsd: Number(withdrawalAmountUsd),
        }),
      });
      setWithdrawalSuccess("Withdrawal request submitted successfully!");
      setWithdrawalAmountUsd("");
      setWithdrawalDestination("");
      setWithdrawalNetwork("");
      setShowCreateWithdrawal(false);
      fetchData();
    } catch (err) {
      setWithdrawalError(err instanceof Error ? err.message : "Failed to submit withdrawal");
    } finally {
      setWithdrawalSubmitting(false);
    }
  }

  if (loading) return (<div className="relative min-h-screen overflow-hidden bg-ink"><FloatingParticles /><div className="flex min-h-screen items-center justify-center"><div className="flex flex-col items-center gap-4"><div className="h-12 w-12 animate-spin rounded-full border-2 border-mint/20 border-t-mint" /><p className="text-sm text-slate-400">Loading your dashboard...</p></div></div></div>);

  return (
    <div className="relative min-h-screen overflow-hidden bg-ink">
      <FloatingParticles />
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute left-1/4 top-0 h-[600px] w-[600px] rounded-full bg-mint/[0.03] blur-[120px]" />
        <div className="absolute right-1/4 top-1/3 h-[400px] w-[400px] rounded-full bg-gold/[0.03] blur-[100px]" />
      </div>
      <div className="relative z-10 mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xl font-extrabold tracking-tight gradient-text-mint">TrueVesti</Link>
            <span className={`level-badge ${investorLevel.cls}`}>{investorLevel.icon} {investorLevel.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <UserMenu
              user={me?.user ? { id: me.user.id, email: me.user.email, role: me.user.role, emailVerified: me.user.emailVerified, profile: me.user.profile } : null}
              initials={me?.user?.profile?.firstName?.[0] || me?.user?.email?.[0]?.toUpperCase() || "U"}
              onNavigate={(section: string) => setActiveTab(section as typeof activeTab)}
            />
          </div>
        </div>

        <AnimatePresence>{showNotifications && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="fixed right-4 top-20 z-50 w-80 rounded-2xl border border-white/10 bg-ink/95 p-4 shadow-2xl backdrop-blur-xl sm:right-8">
            <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-bold text-white">Notifications</h3><button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-white">✕</button></div>
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {notifications.length === 0 && <p className="py-4 text-center text-xs text-slate-500">No notifications</p>}
              {notifications.map((n, i) => (<motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-start gap-3 rounded-xl p-2.5 transition hover:bg-white/5"><span className="text-lg">{n.icon}</span><div className="min-w-0 flex-1"><p className="truncate text-xs text-slate-300">{n.msg}</p><p className="mt-0.5 text-[10px] text-slate-500">{shortDate(n.time)}</p></div></motion.div>))}
            </div>
          </motion.div>
        )}</AnimatePresence>

        <div className="flex flex-col gap-6 lg:flex-row">
          <nav className="flex gap-1 overflow-x-auto pb-2 lg:w-56 lg:flex-col lg:overflow-visible lg:pb-0">
            {tabs.map(t => (<button key={t.id} onClick={() => setActiveTab(t.id)} className={`dash-tab flex items-center gap-2.5 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${activeTab === t.id ? "active bg-mint/10 text-mint" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}><span>{t.icon}</span>{t.label}</button>))}
          </nav>

          <main className="min-w-0 flex-1">
            <AnimatePresence mode="wait">
              {activeTab === "overview" && (
                <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                    {[
                      { label: "Portfolio Value", value: usd(totalPortfolio), icon: "💵", accent: "mint" },
                      { label: "Today's Earnings", value: usd(todayEarnings), icon: "📈", accent: "gold" },
                      { label: "Active Investments", value: String(activeInvestments.length), icon: "📊", accent: "blue" },
                      { label: "Pending Withdrawals", value: usd(pendingWithdrawals), icon: "⏳", accent: "gold" },
                      { label: "Verification", value: kycDisplayText, icon: isApprovedKycStatus(latestKycStatus) ? "✅" : "⚠️", accent: "mint" },
                    ].map((s, i) => (
                      <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass-card group relative overflow-hidden p-5">
                        <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br from-mint/20 to-mint/5 opacity-60 blur-2xl transition-opacity group-hover:opacity-100" />
                        <div className="relative">
                          <div className="flex items-center justify-between">
                            <span className="text-2xl">{s.icon}</span>
                          </div>
                          <p className="mt-3 text-sm font-medium text-slate-400">{s.label}</p>
                          <p className="mt-1 text-xl font-bold text-white">{s.value}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <PortfolioChart investments={investments} />

                  <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    {[{ label: "Available Balance", value: usd(availableBalance), icon: "💳" }, { label: "Invested Capital", value: usd(totalInvested), icon: "📊" }, { label: "Total Profit", value: usd(totalProfit + totalAccruedFromActive), icon: "💰" }, { label: "Total Withdrawn", value: usd(totalWithdrawn), icon: "🏦" }].map((c, i) => (
                      <motion.div key={c.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.1 }} className="glass-card group relative overflow-hidden p-5">
                        <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br from-mint/10 to-transparent opacity-0 blur-2xl transition-opacity group-hover:opacity-100" />
                        <span className="text-2xl">{c.icon}</span>
                        <p className="mt-2 text-xs font-medium text-slate-400">{c.label}</p>
                        <p className="mt-1 text-lg font-bold text-white">{c.value}</p>
                      </motion.div>
                    ))}
                  </div>

                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="glass-card-static p-6">
                    <h3 className="mb-4 text-sm font-bold text-slate-300">Live Earnings</h3>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                      {[{ label: "Today", value: todayEarnings, color: "text-mint" }, { label: "This Week", value: weekEarnings, color: "text-blue-400" }, { label: "This Month", value: monthEarnings, color: "text-gold" }, { label: "Est. Next Payout", value: todayEarnings, color: "text-emerald-400" }].map(e => (
                        <div key={e.label} className="text-center"><p className="text-xs text-slate-500">{e.label}</p><p className={`mt-1 text-xl font-bold ${e.color}`}><AnimatedNumber value={e.value} prefix="$" /></p></div>
                      ))}
                    </div>
                  </motion.div>

                  {activeInvestments.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="glass-card-static p-6">
                      <div className="mb-4 flex items-center justify-between"><h3 className="text-sm font-bold text-slate-300">Active Investments</h3><button onClick={() => setActiveTab("investments")} className="text-xs font-semibold text-mint hover:text-mint/80">View All →</button></div>
                      <div className="space-y-3">
                        {activeInvestments.slice(0, 3).map((inv, i) => {
                          const progress = inv.progressPercent || 0;
                          const daysRemaining = inv.daysRemaining || 0;
                          return (
                            <motion.div key={inv.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.9 + i * 0.1 }} className="flex items-center gap-4 rounded-xl bg-white/[0.03] p-4">
                              <CircularProgress percent={progress} size={48} stroke={3} />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between"><p className="text-sm font-semibold text-white">{inv.plan.name}</p><span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">Active</span></div>
                                <div className="mt-1 flex items-center gap-4 text-xs text-slate-400"><span>{usd(inv.principalUsd)} invested</span><span className="text-emerald-400">+{usd(inv.accruedInterestUsd || 0)} earned</span><span>{daysRemaining} days left</span></div>
                                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5"><motion.div className="h-full rounded-full bg-gradient-to-r from-mint to-emerald-400 progress-bar-animated" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1.5, delay: 1 + i * 0.1 }} /></div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }} className="glass-card-static p-6">
                    <h3 className="mb-4 text-sm font-bold text-slate-300">Recent Activity</h3>
                    <div className="space-y-2">
                      {[...deposits.slice(0, 3).map(d => ({ type: "Deposit", amount: d.amountUsd, status: d.status, date: d.createdAt, icon: "💰" })), ...withdrawals.slice(0, 3).map(w => ({ type: "Withdrawal", amount: w.amountUsd, status: w.status, date: w.createdAt, icon: "🏦" })), ...activeInvestments.slice(0, 2).map(i => ({ type: "Investment", amount: i.principalUsd, status: i.status, date: i.startedAt, icon: "📈" }))].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6).map((a, i) => (
                        <motion.div key={`${a.type}-${i}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.1 + i * 0.05 }} className="flex items-center gap-3 rounded-xl p-3 transition hover:bg-white/[0.03]">
                          <span className="text-xl">{a.icon}</span>
                          <div className="min-w-0 flex-1"><p className="text-sm font-medium text-white">{a.type}</p><p className="text-xs text-slate-500">{shortDate(a.date)}</p></div>
                          <div className="text-right"><p className="text-sm font-semibold text-white">{usd(a.amount)}</p><span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${a.status === "CONFIRMED" || a.status === "PAID" || a.status === "ACTIVE" ? "status-approved" : a.status === "REJECTED" ? "status-rejected" : "status-pending"}`}>{a.status}</span></div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>

                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {[{ label: "Deposit", href: "/dashboard/deposit", icon: "💰" }, { label: "Invest", href: "/dashboard/investments", icon: "📈" }, { label: "Withdraw", href: "/dashboard/withdrawals", icon: "🏦" }, { label: "Referrals", href: "/dashboard/referrals", icon: "🤝" }].map((q, i) => (
                      <motion.div key={q.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 + i * 0.1 }}>
                        <Link href={q.href} className="glass-card group flex items-center gap-3 p-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-mint/20 to-mint/5 text-lg">{q.icon}</div>
                          <span className="text-sm font-semibold text-slate-300 group-hover:text-white">{q.label}</span>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === "investments" && (
                <motion.div key="investments" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    {[{ label: "Active", value: String(activeInvestments.length), color: "text-mint" }, { label: "Total Invested", value: usd(totalInvested), color: "text-white" }, { label: "Total Profit", value: usd(totalProfit + totalAccruedFromActive), color: "text-emerald-400" }].map((s, i) => (
                      <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass-card-static p-4 text-center"><p className="text-xs text-slate-400">{s.label}</p><p className={`mt-1 text-xl font-bold ${s.color}`}>{s.value}</p></motion.div>
                    ))}
                  </div>
                  {investments.length === 0 ? (
                    <div className="glass-card-static p-12 text-center"><span className="text-4xl">📊</span><p className="mt-4 text-sm text-slate-400">No investments yet</p><p className="mt-1 text-xs text-slate-500">Fund your account and start investing.</p>{availableBalance > 0 ? <Link href="/plans" className="mt-4 inline-block rounded-xl bg-gradient-to-r from-mint to-emerald-400 px-6 py-3 text-sm font-bold text-ink transition hover:opacity-90">Browse Plans & Invest</Link> : <button onClick={() => setActiveTab("deposits")} className="mt-4 rounded-xl bg-mint/20 px-6 py-3 text-sm font-semibold text-mint transition hover:bg-mint/30">Make a Deposit First</button>}</div>
                  ) : (
                    <div className="space-y-4">{investments.map((inv, i) => {
                      const progress = inv.progressPercent || 0;
                      const daysRemaining = inv.daysRemaining || 0;
                      const daysElapsed = inv.daysElapsed || 0;
                      const isMatured = new Date(inv.maturesAt) <= new Date();
                      return (
                        <motion.div key={inv.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass-card group p-6">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                            <CircularProgress percent={progress} size={64} stroke={4} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-3">
                                <h3 className="text-lg font-bold text-white">{inv.plan.name}</h3>
                                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${inv.status === "ACTIVE" ? "status-approved" : inv.status === "COMPLETED" ? "status-completed" : "status-pending"}`}>{inv.status}</span>
                                {isMatured && inv.status === "ACTIVE" && <span className="rounded-full bg-gold/20 px-2.5 py-0.5 text-[10px] font-bold text-gold">MATURED</span>}
                              </div>
                              <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
                                <div><span className="text-slate-500">Invested: </span><span className="font-semibold text-white">{usd(inv.principalUsd)}</span></div>
                                <div><span className="text-slate-500">Profit: </span><span className="font-semibold text-emerald-400">+{usd(inv.accruedInterestUsd || 0)}</span></div>
                                <div><span className="text-slate-500">Days Left: </span><span className="font-semibold text-white">{isMatured ? 0 : daysRemaining}</span></div>
                                <div><span className="text-slate-500">Maturity: </span><span className="font-semibold text-white">{shortDate(inv.maturesAt)}</span></div>
                              </div>
                              <div className="mt-1 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
                                <div><span className="text-slate-500">Asset: </span><span className="font-semibold text-white">{inv.assetSymbol}</span></div>
                                <div><span className="text-slate-500">Daily: </span><span className="font-semibold text-mint">{usd(inv.dailyAccrualUsd || 0)}</span></div>
                                <div><span className="text-slate-500">Elapsed: </span><span className="font-semibold text-white">{daysElapsed}d</span></div>
                                <div><span className="text-slate-500">Expected: </span><span className="font-semibold text-emerald-400">{usd(inv.expectedReturnUsd)}</span></div>
                              </div>
                              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5"><motion.div className="h-full rounded-full bg-gradient-to-r from-mint to-emerald-400 progress-bar-animated" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1.5, delay: 0.3 + i * 0.1 }} /></div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}</div>
                  )}
                </motion.div>
              )}

              {/* ═══════════════════════════════════════════════════════════════
                  DEPOSITS TAB — Create Deposit + Deposit History
                  ═══════════════════════════════════════════════════════════════ */}
              {activeTab === "deposits" && (
                <motion.div key="deposits" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                  {/* ── Create Deposit ── */}
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card-static p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-white">Create Deposit</h3>
                        <p className="mt-1 text-sm text-slate-400">Select an asset, send funds to the wallet address, then submit proof.</p>
                      </div>
                      <button onClick={() => { setShowCreateDeposit(!showCreateDeposit); setDepositError(""); setDepositSuccess(""); }} className="rounded-xl bg-mint/20 px-5 py-2.5 text-sm font-semibold text-mint transition hover:bg-mint/30">
                        {showCreateDeposit ? "Cancel" : "+ New Deposit"}
                      </button>
                    </div>

                    <AnimatePresence>
                      {showCreateDeposit && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                          <div className="mt-6 space-y-5">
                            {/* Step 1: Select Asset */}
                            <div>
                              <label className="mb-2 block text-sm font-medium text-slate-300">Select Asset & Network</label>
                              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                {depositOptions.map((opt) => {
                                  const isSelected = selectedDepositOption?.assetSymbol === opt.assetSymbol && selectedDepositOption?.network === opt.network;
                                  return (
                                    <button key={`${opt.assetSymbol}-${opt.network}`} onClick={() => { setSelectedDepositOption(opt); setCopiedAddress(false); }} disabled={!opt.wallet} className={`rounded-xl border p-3 text-center transition ${isSelected ? "border-mint bg-mint/10 text-mint" : opt.wallet ? "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20 hover:bg-white/[0.06]" : "cursor-not-allowed border-white/5 bg-white/[0.02] text-slate-600"}`}>
                                      <p className="text-sm font-bold">{opt.assetSymbol}</p>
                                      <p className="mt-0.5 text-[10px] text-slate-500">{opt.network}</p>
                                      {!opt.wallet && <p className="mt-1 text-[10px] text-red-400">Unavailable</p>}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Step 2: Wallet Address + QR Code */}
                            {selectedDepositOption?.wallet && (
                              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                                  <p className="text-sm font-medium text-slate-300">Send {selectedDepositOption.assetSymbol} on {selectedDepositOption.network} to:</p>
                                  <div className="mt-3 flex items-center gap-3">
                                    <code className="flex-1 break-all rounded-lg bg-white/5 px-4 py-3 font-mono text-sm text-mint">{selectedDepositOption.wallet.address}</code>
                                    <button onClick={() => handleCopyAddress(selectedDepositOption.wallet!.address)} className={`flex-shrink-0 rounded-xl px-4 py-3 text-sm font-semibold transition ${copiedAddress ? "bg-emerald-500/20 text-emerald-400" : "bg-mint/20 text-mint hover:bg-mint/30"}`}>
                                      {copiedAddress ? "✓ Copied" : "Copy"}
                                    </button>
                                  </div>
                                  {selectedDepositOption.wallet.instructions && (
                                    <p className="mt-3 text-xs text-slate-500">{selectedDepositOption.wallet.instructions}</p>
                                  )}
                                </div>

                                {/* QR Code */}
                                <div className="flex justify-center">
                                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
                                    <QRCodeImage data={selectedDepositOption.wallet.address} size={180} />
                                    <p className="mt-2 text-[10px] text-slate-500">Scan to copy address</p>
                                  </div>
                                </div>
                              </motion.div>
                            )}

                            {/* Step 3: Deposit Details */}
                            {selectedDepositOption?.wallet && (
                              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-4">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                  <div>
                                    <label className="mb-2 block text-sm font-medium text-slate-300">Amount (USD)</label>
                                    <input type="number" value={depositAmountUsd} onChange={e => setDepositAmountUsd(e.target.value)} placeholder="100.00" min="1" step="0.01" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition focus:border-mint/50 focus:ring-1 focus:ring-mint/30" />
                                  </div>
                                  <div>
                                    <label className="mb-2 block text-sm font-medium text-slate-300">Transaction Hash (TXID)</label>
                                    <input type="text" value={depositTxHash} onChange={e => setDepositTxHash(e.target.value)} placeholder="0x..." className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition focus:border-mint/50 focus:ring-1 focus:ring-mint/30" />
                                  </div>
                                </div>
                                <div>
                                  <label className="mb-2 block text-sm font-medium text-slate-300">Proof URL (optional — link to screenshot)</label>
                                  <input type="url" value={depositProofUrl} onChange={e => setDepositProofUrl(e.target.value)} placeholder="https://..." className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition focus:border-mint/50 focus:ring-1 focus:ring-mint/30" />
                                </div>

                                {depositError && <p className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{depositError}</p>}
                                {depositSuccess && <p className="rounded-lg bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400">{depositSuccess}</p>}

                                <button onClick={handleSubmitDeposit} disabled={depositSubmitting} className="w-full rounded-xl bg-gradient-to-r from-mint to-emerald-400 px-6 py-3 text-sm font-bold text-ink transition hover:opacity-90 disabled:opacity-50">
                                  {depositSubmitting ? "Submitting..." : "Submit Deposit Proof"}
                                </button>
                              </motion.div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>

                  {/* ── Deposit History ── */}
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-300">Deposit History</h3>
                      <span className="text-sm text-slate-500">Total: {usd(deposits.reduce((s, d) => s + Number(d.amountUsd), 0))}</span>
                    </div>
                    {deposits.length === 0 ? (
                      <div className="glass-card-static p-12 text-center"><span className="text-4xl">💰</span><p className="mt-4 text-sm text-slate-400">No deposits yet</p><p className="mt-1 text-xs text-slate-500">Click "+ New Deposit" above to make your first deposit.</p></div>
                    ) : (
                      <div className="space-y-3">
                        {deposits.map((dep, i) => (
                          <motion.div key={dep.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card flex items-center gap-4 p-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-mint/10"><svg className="h-5 w-5 text-mint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-white">{usd(dep.amountUsd)}</p>
                              <p className="text-xs text-slate-500">{shortDate(dep.createdAt)} • {dep.assetSymbol} • {dep.network}</p>
                              {dep.txHash && <p className="mt-0.5 font-mono text-[10px] text-slate-600">TX: {dep.txHash.slice(0, 16)}...</p>}
                            </div>
                            <span className={`rounded-full px-3 py-1 text-[10px] font-bold ${dep.status === "CONFIRMED" ? "status-approved" : dep.status === "PENDING" ? "status-pending" : dep.status === "REJECTED" ? "status-rejected" : "status-processing"}`}>{dep.status}</span>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                </motion.div>
              )}

              {/* ═══════════════════════════════════════════════════════════════
                  WITHDRAWALS TAB — Maturity-aware rules + Withdrawal History
                  ═══════════════════════════════════════════════════════════════ */}
              {activeTab === "withdrawals" && (
                <motion.div key="withdrawals" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                  {/* ── Withdrawal Summary ── */}
                  <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    {[{ label: "Available Balance", value: usd(availableBalance), color: "text-mint" }, { label: "Withdrawable Now", value: usd(totalWithdrawable), color: "text-emerald-400" }, { label: "Pending", value: usd(pendingWithdrawals), color: "text-gold" }, { label: "Total Paid", value: usd(totalWithdrawn), color: "text-white" }].map((s, i) => (
                      <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass-card-static p-4 text-center"><p className="text-xs text-slate-400">{s.label}</p><p className={`mt-1 text-xl font-bold ${s.color}`}>{s.value}</p></motion.div>
                    ))}
                  </div>

                  {/* ── Withdrawal Rules Info ── */}
                  {withdrawalEligibility.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card-static p-6">
                      <h3 className="mb-4 text-sm font-bold text-slate-300">Withdrawal Eligibility by Investment</h3>
                      <div className="space-y-3">
                        {withdrawalEligibility.map((item, i) => (
                          <div key={item.investment.id} className="flex items-center justify-between rounded-xl bg-white/[0.03] p-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-white">{item.investment.plan.name}</p>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${item.isMatured ? "bg-gold/20 text-gold" : "bg-blue-500/20 text-blue-400"}`}>
                                  {item.isMatured ? "Matured" : `${item.daysRemaining}d remaining`}
                                </span>
                              </div>
                              <div className="mt-1 flex gap-4 text-xs text-slate-500">
                                <span>Principal: <span className="text-white">{usd(item.principal)}</span></span>
                                <span>Profit: <span className="text-emerald-400">{usd(item.accruedProfit)}</span></span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-slate-500">Withdrawable</p>
                              <p className="text-lg font-bold text-emerald-400">{usd(item.totalWithdrawable)}</p>
                              {!item.isMatured && <p className="text-[10px] text-slate-600">Profit only (before maturity)</p>}
                              {item.isMatured && <p className="text-[10px] text-gold">Full amount available</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* ── Create Withdrawal ── */}
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card-static p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-white">Request Withdrawal</h3>
                        <p className="mt-1 text-sm text-slate-400">Withdrawable balance: <span className="font-semibold text-emerald-400">{usd(totalWithdrawable)}</span></p>
                      </div>
                      <button onClick={() => { setShowCreateWithdrawal(!showCreateWithdrawal); setWithdrawalError(""); setWithdrawalSuccess(""); }} className="rounded-xl bg-gold/20 px-5 py-2.5 text-sm font-semibold text-gold transition hover:bg-gold/30">
                        {showCreateWithdrawal ? "Cancel" : "+ Withdraw"}
                      </button>
                    </div>

                    <AnimatePresence>
                      {showCreateWithdrawal && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                          <div className="mt-6 space-y-4">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                              <div>
                                <label className="mb-2 block text-sm font-medium text-slate-300">Asset</label>
                                <select value={withdrawalAsset} onChange={e => setWithdrawalAsset(e.target.value as typeof withdrawalAsset)} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-mint/50 focus:ring-1 focus:ring-mint/30">
                                  {["BTC", "ETH", "USDT", "USDC", "BNB", "SOL"].map(a => <option key={a} value={a}>{a}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="mb-2 block text-sm font-medium text-slate-300">Network</label>
                                <input type="text" value={withdrawalNetwork} onChange={e => setWithdrawalNetwork(e.target.value)} placeholder="e.g. ERC20, TRC20, Bitcoin" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition focus:border-mint/50 focus:ring-1 focus:ring-mint/30" />
                              </div>
                            </div>
                            <div>
                              <label className="mb-2 block text-sm font-medium text-slate-300">Destination Address</label>
                              <input type="text" value={withdrawalDestination} onChange={e => setWithdrawalDestination(e.target.value)} placeholder="Enter wallet address" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition focus:border-mint/50 focus:ring-1 focus:ring-mint/30" />
                            </div>
                            <div>
                              <label className="mb-2 block text-sm font-medium text-slate-300">Amount (USD) — Max: {usd(totalWithdrawable)}</label>
                              <input type="number" value={withdrawalAmountUsd} onChange={e => setWithdrawalAmountUsd(e.target.value)} placeholder="100.00" min="1" max={totalWithdrawable} step="0.01" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition focus:border-mint/50 focus:ring-1 focus:ring-mint/30" />
                            </div>

                            {withdrawalError && <p className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{withdrawalError}</p>}
                            {withdrawalSuccess && <p className="rounded-lg bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400">{withdrawalSuccess}</p>}

                            <button onClick={handleSubmitWithdrawal} disabled={withdrawalSubmitting || totalWithdrawable <= 0} className="w-full rounded-xl bg-gradient-to-r from-gold to-yellow-400 px-6 py-3 text-sm font-bold text-ink transition hover:opacity-90 disabled:opacity-50">
                              {withdrawalSubmitting ? "Submitting..." : totalWithdrawable <= 0 ? "No funds available" : "Submit Withdrawal Request"}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>

                  {/* ── Withdrawal History ── */}
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                    <h3 className="mb-4 text-sm font-bold text-slate-300">Withdrawal History</h3>
                    {withdrawals.length === 0 ? (
                      <div className="glass-card-static p-12 text-center"><span className="text-4xl">🏦</span><p className="mt-4 text-sm text-slate-400">No withdrawals yet</p></div>
                    ) : (
                      <div className="space-y-3">
                        {withdrawals.map((w, i) => (
                          <motion.div key={w.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card flex items-center gap-4 p-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/10"><svg className="h-5 w-5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg></div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-white">{usd(w.amountUsd)}</p>
                              <p className="text-xs text-slate-500">{shortDate(w.createdAt)} • {w.assetSymbol} • {w.destination?.slice(0, 16)}...</p>
                              {w.investment && <p className="mt-0.5 text-[10px] text-slate-600">From: {w.investment.plan.name}</p>}
                            </div>
                            <span className={`rounded-full px-3 py-1 text-[10px] font-bold ${w.status === "PAID" ? "status-approved" : w.status === "PENDING" ? "status-pending" : w.status === "APPROVED" ? "status-processing" : "status-rejected"}`}>{w.status}</span>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                </motion.div>
              )}

              {activeTab === "referrals" && (
                <motion.div key="referrals" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card-static overflow-hidden p-6">
                    <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-to-br from-purple-500/10 to-transparent blur-3xl" />
                    <h3 className="text-lg font-bold text-white">Refer & Earn</h3>
                    <p className="mt-1 text-sm text-slate-400">Share your code and earn commissions on every referral deposit.</p>
                    <div className="mt-4 flex gap-2">
                      <input readOnly value={referralCode || "No referral code available"} className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white font-mono" />
                      <button onClick={() => { if (referralCode) navigator.clipboard.writeText(referralCode); }} className="rounded-xl bg-mint/20 px-6 py-2.5 text-sm font-semibold text-mint hover:bg-mint/30">Copy</button>
                    </div>
                  </motion.div>
                  <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                    {[{ label: "Total Referrals", value: String(referralCount), icon: "👥" }, { label: "Referral Earnings", value: usd(referralEarnings), icon: "💰" }, { label: "Your Code", value: referralCode || "N/A", icon: "🔑" }].map((s, i) => (
                      <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.1 }} className="glass-card-static p-4 text-center"><span className="text-2xl">{s.icon}</span><p className="mt-2 text-xs text-slate-400">{s.label}</p><p className="mt-1 text-xl font-bold text-white">{s.value}</p></motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === "achievements" && (
                <motion.div key="achievements" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card-static p-6">
                    <div className="flex items-center gap-4">
                      <span className="text-4xl">{investorLevel.icon}</span>
                      <div>
                        <span className={`level-badge ${investorLevel.cls}`}>{investorLevel.name}</span>
                        <p className="mt-2 text-sm text-slate-400">Total invested: {usd(totalInvested)}</p>
                      </div>
                    </div>
                  </motion.div>
                  <div className="flex items-center justify-between gap-2">
                    {[{ name: "Bronze", threshold: 0, icon: "🥉" }, { name: "Silver", threshold: 5000, icon: "🥈" }, { name: "Gold", threshold: 20000, icon: "🥇" }, { name: "Platinum", threshold: 50000, icon: "🏆" }, { name: "Diamond", threshold: 100000, icon: "💎" }].map((l, i) => {
                      const active = totalInvested >= l.threshold;
                      return <motion.div key={l.name} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 + i * 0.1 }} className={`flex flex-1 flex-col items-center gap-2 rounded-xl p-3 ${active ? "bg-white/[0.06]" : "bg-white/[0.02] opacity-40"}`}><span className="text-2xl">{l.icon}</span><span className={`text-[10px] font-bold uppercase ${active ? "text-mint" : "text-slate-500"}`}>{l.name}</span><span className="text-[10px] text-slate-500">{usd(l.threshold)}</span></motion.div>;
                    })}
                  </div>
                  <div>
                    <h3 className="mb-4 text-sm font-bold text-slate-300">Achievements</h3>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {[
                        { name: "First Deposit", icon: "💰", desc: "Made your first deposit", unlocked: deposits.length > 0 },
                        { name: "First Investment", icon: "📈", desc: "Started your first investment", unlocked: investments.length > 0 },
                        { name: "First Withdrawal", icon: "🏦", desc: "Made your first withdrawal", unlocked: withdrawals.length > 0 },
                        { name: "Portfolio Builder", icon: "🔥", desc: "Portfolio reached $1,000", unlocked: totalInvested >= 1000 },
                        { name: "Diversified", icon: "📊", desc: "3+ active investments", unlocked: activeInvestments.length >= 3 },
                        { name: "Verified", icon: "✅", desc: "Completed KYC verification", unlocked: isApprovedKycStatus(latestKycStatus) },
                      ].map((a, i) => (
                        <motion.div key={a.name} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 + i * 0.1 }} className={`achievement-badge ${a.unlocked ? "unlocked" : "locked"}`}>
                          <span className="text-3xl">{a.icon}</span>
                          <p className="text-xs font-bold text-white">{a.name}</p>
                          <p className="text-[10px] text-slate-400">{a.desc}</p>
                          {a.unlocked && <span className="text-[10px] font-bold text-mint">✓ Unlocked</span>}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "profile" && (
                <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <ProfilePage />
                </motion.div>
              )}

              {activeTab === "settings" && (
                <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <SettingsPage />
                </motion.div>
              )}

              {activeTab === "kyc" && (
                <motion.div key="kyc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <KycPage />
                </motion.div>
              )}

              {activeTab === "security" && (
                <motion.div key="security" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <SecurityPage />
                </motion.div>
              )}

              {activeTab === "notifications" && (
                <motion.div key="notifications" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <NotificationsPage />
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}
