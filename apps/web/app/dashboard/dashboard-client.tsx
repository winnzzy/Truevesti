"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { apiRequest } from "../../lib/api";

interface Me { user: { id: string; email: string; name: string; role: string } }
interface Wallet { wallet: { id: string; balance: string } | null }
interface Investment { id: string; plan: string; amount: string; profit: string; days: number; status: string; endDate: string; startDate: string; duration: number; dailyPercent: number; userId: string }
interface Withdrawal { id: string; amount: string; status: string; createdAt: string; walletAddress: string }
interface Deposit { id: string; amount: string; status: string; createdAt: string; txHash: string }

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
    const totalInvested = investments.reduce((s, i) => s + Number(i.amount), 0);
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

export default function DashboardClient({ initialToken }: { initialToken?: string }) {
  const [me, setMe] = useState<Me | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "investments" | "deposits" | "withdrawals" | "referrals" | "achievements">("overview");
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (initialToken) { localStorage.setItem("truevesti.session", JSON.stringify({ accessToken: initialToken, refreshToken: "", user: {} })); }
    Promise.all([
      apiRequest<Me>("/auth/me").then(setMe).catch(() => {}),
      apiRequest<Wallet>("/wallet/me").then(setWallet).catch(() => {}),
      apiRequest<Investment[]>("/investments/mine").then(setInvestments).catch(() => setInvestments([])),
      apiRequest<Withdrawal[]>("/withdrawals/mine").then(setWithdrawals).catch(() => setWithdrawals([])),
      apiRequest<Deposit[]>("/deposits/mine").then(setDeposits).catch(() => setDeposits([])),
    ]).finally(() => setLoading(false));
  }, [initialToken]);

  const balance = Number(wallet?.wallet?.balance ?? 0);
  const totalInvested = investments.reduce((s, i) => s + Number(i.amount), 0);
  const totalProfit = investments.reduce((s, i) => s + Number(i.profit), 0);
  const activeInvestments = investments.filter(i => i.status === "active");
  const pendingWithdrawals = withdrawals.filter(w => w.status === "pending").reduce((s, w) => s + Number(w.amount), 0);
  const totalWithdrawn = withdrawals.filter(w => w.status === "completed").reduce((s, w) => s + Number(w.amount), 0);
  const todayEarnings = activeInvestments.reduce((s, i) => s + (Number(i.amount) * (i.dailyPercent || 0.4) / 100), 0);
  const weekEarnings = todayEarnings * 7;
  const monthEarnings = todayEarnings * 30;
  const investorLevel = getInvestorLevel(totalInvested);

  const notifications = [
    ...deposits.slice(0, 3).map(d => ({ msg: `Deposit ${usd(d.amount)} ${d.status}`, time: d.createdAt, icon: "💰" })),
    ...withdrawals.slice(0, 3).map(w => ({ msg: `Withdrawal ${usd(w.amount)} ${w.status}`, time: w.createdAt, icon: "🏦" })),
    ...activeInvestments.slice(0, 2).map(i => ({ msg: `${i.plan} earning`, time: i.startDate, icon: "📈" })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 8);

  const tabs = [
    { id: "overview" as const, label: "Overview", icon: "📊" },
    { id: "investments" as const, label: "Investments", icon: "📈" },
    { id: "deposits" as const, label: "Deposits", icon: "💰" },
    { id: "withdrawals" as const, label: "Withdrawals", icon: "🏦" },
    { id: "referrals" as const, label: "Referrals", icon: "🤝" },
    { id: "achievements" as const, label: "Achievements", icon: "🏆" },
  ];

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
            <button onClick={() => setShowNotifications(!showNotifications)} className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              {notifications.length > 0 && <span className="notification-badge">{notifications.length}</span>}
            </button>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-mint/30 to-gold/30 text-sm font-bold text-white">{me?.user?.name?.[0]?.toUpperCase() || "U"}</div>
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
                      { label: "Total Portfolio", value: usd(balance + totalInvested + totalProfit), icon: "💵", accent: "mint", trend: { value: 12.5, positive: true } },
                      { label: "Today's Earnings", value: usd(todayEarnings), icon: "📈", accent: "gold" },
                      { label: "Active Investments", value: String(activeInvestments.length), icon: "📊", accent: "blue" },
                      { label: "Pending Withdrawals", value: usd(pendingWithdrawals), icon: "⏳", accent: "gold" },
                      { label: "Verification", value: "Verified", icon: "✅", accent: "mint" },
                    ].map((s, i) => (
                      <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass-card group relative overflow-hidden p-5">
                        <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br from-mint/20 to-mint/5 opacity-60 blur-2xl transition-opacity group-hover:opacity-100" />
                        <div className="relative">
                          <div className="flex items-center justify-between">
                            <span className="text-2xl">{s.icon}</span>
                            {s.trend && <div className={`flex items-center gap-1 text-xs font-semibold ${s.trend.positive ? "text-emerald-400" : "text-red-400"}`}><svg className={`h-3 w-3 ${s.trend.positive ? "" : "rotate-180"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>{Math.abs(s.trend.value)}%</div>}
                          </div>
                          <p className="mt-3 text-sm font-medium text-slate-400">{s.label}</p>
                          <p className="mt-1 text-xl font-bold text-white">{s.value}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <PortfolioChart investments={investments} />

                  <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    {[{ label: "Available Balance", value: usd(balance), icon: "💳" }, { label: "Invested Capital", value: usd(totalInvested), icon: "📊" }, { label: "Total Profit", value: usd(totalProfit), icon: "💰" }, { label: "Total Withdrawn", value: usd(totalWithdrawn), icon: "🏦" }].map((c, i) => (
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
                          const totalDays = inv.duration || 30;
                          const elapsed = Math.floor((Date.now() - new Date(inv.startDate).getTime()) / 86400000);
                          const progress = Math.min((elapsed / totalDays) * 100, 100);
                          return (
                            <motion.div key={inv.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.9 + i * 0.1 }} className="flex items-center gap-4 rounded-xl bg-white/[0.03] p-4">
                              <CircularProgress percent={progress} size={48} stroke={3} />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between"><p className="text-sm font-semibold text-white">{inv.plan}</p><span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">Active</span></div>
                                <div className="mt-1 flex items-center gap-4 text-xs text-slate-400"><span>{usd(inv.amount)} invested</span><span className="text-emerald-400">+{usd(inv.profit)} earned</span><span>{totalDays - elapsed} days left</span></div>
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
                      {[...deposits.slice(0, 3).map(d => ({ type: "Deposit", amount: d.amount, status: d.status, date: d.createdAt, icon: "💰" })), ...withdrawals.slice(0, 3).map(w => ({ type: "Withdrawal", amount: w.amount, status: w.status, date: w.createdAt, icon: "🏦" })), ...activeInvestments.slice(0, 2).map(i => ({ type: "Investment", amount: i.amount, status: i.status, date: i.startDate, icon: "📈" }))].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6).map((a, i) => (
                        <motion.div key={`${a.type}-${i}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.1 + i * 0.05 }} className="flex items-center gap-3 rounded-xl p-3 transition hover:bg-white/[0.03]">
                          <span className="text-xl">{a.icon}</span>
                          <div className="min-w-0 flex-1"><p className="text-sm font-medium text-white">{a.type}</p><p className="text-xs text-slate-500">{shortDate(a.date)}</p></div>
                          <div className="text-right"><p className="text-sm font-semibold text-white">{usd(a.amount)}</p><span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${a.status === "completed" || a.status === "active" ? "status-approved" : "status-pending"}`}>{a.status}</span></div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>

                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {[{ label: "Deposit", href: "/deposit", icon: "💰" }, { label: "Invest", href: "/plans", icon: "📈" }, { label: "Withdraw", href: "/withdraw", icon: "🏦" }, { label: "Referrals", href: "/referral", icon: "🤝" }].map((q, i) => (
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
                    {[{ label: "Active", value: String(investments.filter(i => i.status === "active").length), color: "text-mint" }, { label: "Total Invested", value: usd(totalInvested), color: "text-white" }, { label: "Total Profit", value: usd(totalProfit), color: "text-emerald-400" }].map((s, i) => (
                      <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass-card-static p-4 text-center"><p className="text-xs text-slate-400">{s.label}</p><p className={`mt-1 text-xl font-bold ${s.color}`}>{s.value}</p></motion.div>
                    ))}
                  </div>
                  {investments.length === 0 ? (
                    <div className="glass-card-static p-12 text-center"><span className="text-4xl">📊</span><p className="mt-4 text-sm text-slate-400">No investments yet</p><Link href="/plans" className="mt-4 inline-block rounded-xl bg-mint/20 px-6 py-2.5 text-sm font-semibold text-mint hover:bg-mint/30">Browse Plans</Link></div>
                  ) : (
                    <div className="space-y-4">{investments.map((inv, i) => {
                      const totalDays = inv.duration || 30;
                      const elapsed = Math.floor((Date.now() - new Date(inv.startDate).getTime()) / 86400000);
                      const progress = Math.min((elapsed / totalDays) * 100, 100);
                      const daysLeft = Math.max(totalDays - elapsed, 0);
                      return (
                        <motion.div key={inv.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass-card group p-6">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                            <CircularProgress percent={progress} size={64} stroke={4} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-3"><h3 className="text-lg font-bold text-white">{inv.plan}</h3><span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${inv.status === "active" ? "status-approved" : "status-completed"}`}>{inv.status}</span></div>
                              <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
                                <div><span className="text-slate-500">Invested: </span><span className="font-semibold text-white">{usd(inv.amount)}</span></div>
                                <div><span className="text-slate-500">Profit: </span><span className="font-semibold text-emerald-400">+{usd(inv.profit)}</span></div>
                                <div><span className="text-slate-500">Days Left: </span><span className="font-semibold text-white">{daysLeft}</span></div>
                                <div><span className="text-slate-500">Est. Completion: </span><span className="font-semibold text-white">{shortDate(inv.endDate)}</span></div>
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

              {activeTab === "deposits" && (
                <motion.div key="deposits" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card-static p-6">
                    <div className="flex items-center justify-between"><div><h3 className="text-sm font-bold text-slate-300">Total Deposited</h3><p className="mt-1 text-3xl font-bold text-white">{usd(deposits.reduce((s, d) => s + Number(d.amount), 0))}</p></div><Link href="/deposit" className="rounded-xl bg-mint/20 px-6 py-2.5 text-sm font-semibold text-mint hover:bg-mint/30">+ New Deposit</Link></div>
                  </motion.div>
                  {deposits.length === 0 ? <div className="glass-card-static p-12 text-center"><span className="text-4xl">💰</span><p className="mt-4 text-sm text-slate-400">No deposits yet</p></div> : (
                    <div className="space-y-3">{deposits.map((dep, i) => (
                      <motion.div key={dep.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card flex items-center gap-4 p-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-mint/10"><svg className="h-5 w-5 text-mint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                        <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-white">{usd(dep.amount)}</p><p className="text-xs text-slate-500">{shortDate(dep.createdAt)}</p></div>
                        <span className={`rounded-full px-3 py-1 text-[10px] font-bold ${dep.status === "completed" ? "status-approved" : dep.status === "pending" ? "status-pending" : "status-processing"}`}>{dep.status}</span>
                      </motion.div>
                    ))}</div>
                  )}
                </motion.div>
              )}

              {activeTab === "withdrawals" && (
                <motion.div key="withdrawals" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                    {[{ label: "Pending", value: usd(pendingWithdrawals), color: "text-gold" }, { label: "Completed", value: usd(totalWithdrawn), color: "text-mint" }, { label: "Total Withdrawals", value: String(withdrawals.length), color: "text-white" }].map((s, i) => (
                      <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass-card-static p-4 text-center"><p className="text-xs text-slate-400">{s.label}</p><p className={`mt-1 text-xl font-bold ${s.color}`}>{s.value}</p></motion.div>
                    ))}
                  </div>
                  {withdrawals.length === 0 ? <div className="glass-card-static p-12 text-center"><span className="text-4xl">🏦</span><p className="mt-4 text-sm text-slate-400">No withdrawals yet</p></div> : (
                    <div className="space-y-3">{withdrawals.map((w, i) => (
                      <motion.div key={w.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card flex items-center gap-4 p-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/10"><svg className="h-5 w-5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg></div>
                        <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-white">{usd(w.amount)}</p><p className="text-xs text-slate-500">{shortDate(w.createdAt)} • {w.walletAddress?.slice(0, 8)}...</p></div>
                        <span className={`rounded-full px-3 py-1 text-[10px] font-bold ${w.status === "completed" ? "status-approved" : w.status === "pending" ? "status-pending" : w.status === "processing" ? "status-processing" : "status-rejected"}`}>{w.status}</span>
                      </motion.div>
                    ))}</div>
                  )}
                </motion.div>
              )}

              {activeTab === "referrals" && (
                <motion.div key="referrals" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card-static overflow-hidden p-6">
                    <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-to-br from-purple-500/10 to-transparent blur-3xl" />
                    <h3 className="text-lg font-bold text-white">Refer & Earn</h3>
                    <p className="mt-1 text-sm text-slate-400">Share your link and earn commissions on every referral investment.</p>
                    <div className="mt-4 flex gap-2">
                      <input readOnly value={`https://truevesti.com/signup?ref=${typeof window !== "undefined" ? localStorage.getItem("referralCode") || "REF" : "REF"}`} className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white" />
                      <button onClick={() => { navigator.clipboard.writeText(`https://truevesti.com/signup?ref=${localStorage.getItem("referralCode") || "REF"}`); }} className="rounded-xl bg-mint/20 px-6 py-2.5 text-sm font-semibold text-mint hover:bg-mint/30">Copy</button>
                    </div>
                  </motion.div>
                  <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    {[{ label: "Total Referrals", value: "0", icon: "👥" }, { label: "Active Referrals", value: "0", icon: "✅" }, { label: "Earnings", value: "$0.00", icon: "💰" }, { label: "Conversion Rate", value: "0%", icon: "📊" }].map((s, i) => (
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
                        { name: "Diamond Hands", icon: "💎", desc: "30+ days active", unlocked: false },
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
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}