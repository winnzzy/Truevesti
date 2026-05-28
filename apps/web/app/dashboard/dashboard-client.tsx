"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  BellIcon,
  BriefcaseIcon,
  CheckBadgeIcon,
  CreditCardIcon,
  InboxIcon,
  LifebuoyIcon,
  RectangleGroupIcon,
  ShieldCheckIcon
} from "@heroicons/react/24/outline";
import { Card } from "@/components/card";
import { Nav } from "@/components/nav";
import { apiRequest, readSession, userDisplayName, writeSession, type AuthSession } from "@/lib/api";

type Section = "overview" | "plans" | "deposits" | "withdrawals" | "kyc" | "notifications" | "support";

type Plan = {
  id: string;
  name: string;
  minDepositUsd: string;
  maxDepositUsd: string;
  durationDays: number;
  estimatedYieldMin: string;
  estimatedYieldMax: string;
  riskLevel: string;
  riskNote?: string | null;
  assetAllocation: string;
  supportedAssets: string[];
};

type Investment = {
  id: string;
  principalUsd: string;
  expectedReturnUsd: string;
  assetSymbol: string;
  status: string;
  startedAt: string;
  maturesAt: string;
  plan: Plan;
  projectedPayoutUsd: string;
  dailyAccrualUsd: string;
  accruedInterestUsd: string;
  currentAccruedValueUsd: string;
  yieldPercent: number;
  daysRemaining: number;
  progressPercent: number;
};

type Deposit = {
  id: string;
  companyWalletId?: string | null;
  assetSymbol: string;
  network: string;
  depositAddress: string;
  amountUsd: string | null;
  proofUrl?: string | null;
  rejectionReason?: string | null;
  status: string;
  confirmations: number;
  txHash?: string | null;
  createdAt: string;
};

type DepositOption = {
  assetSymbol: string;
  network: string;
  label: string;
  wallet: {
    id: string;
    address: string;
    instructions: string;
  } | null;
};

type Withdrawal = {
  id: string;
  assetSymbol: string;
  amountUsd: string;
  status: string;
  destination: string;
  network: string;
  txHash?: string | null;
  paidAt?: string | null;
  adminNote?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  investment?: { plan?: { name: string } } | null;
};

type Notification = {
  id: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

type KycCheck = {
  id: string;
  provider: string;
  status: string;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
};

type Ticket = {
  id: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  createdAt: string;
};

type DashboardData = {
  plans: Plan[];
  depositOptions: DepositOption[];
  investments: Investment[];
  deposits: Deposit[];
  withdrawals: Withdrawal[];
  notifications: Notification[];
  kycChecks: KycCheck[];
  currentKyc: KycCheck | null;
  tickets: Ticket[];
  balance: {
    depositedUsd: string;
    activeInvestmentPrincipalUsd: string;
    completedReturnUsd: string;
    lockedWithdrawalUsd: string;
    availableUsd: string;
  };
};

const emptyData: DashboardData = {
  plans: [],
  depositOptions: [],
  investments: [],
  deposits: [],
  withdrawals: [],
  notifications: [],
  kycChecks: [],
  currentKyc: null,
  tickets: [],
  balance: {
    depositedUsd: "0.00",
    activeInvestmentPrincipalUsd: "0.00",
    completedReturnUsd: "0.00",
    lockedWithdrawalUsd: "0.00",
    availableUsd: "0.00"
  }
};

const sectionMeta: Array<{ id: Section; label: string; href: string; icon: typeof RectangleGroupIcon }> = [
  { id: "overview", label: "Overview", href: "/dashboard", icon: RectangleGroupIcon },
  { id: "plans", label: "Plans", href: "/dashboard/plans", icon: BriefcaseIcon },
  { id: "deposits", label: "Deposits", href: "/dashboard/deposits", icon: CreditCardIcon },
  { id: "withdrawals", label: "Withdrawals", href: "/dashboard/withdrawals", icon: InboxIcon },
  { id: "kyc", label: "KYC", href: "/dashboard/kyc", icon: ShieldCheckIcon },
  { id: "notifications", label: "Notifications", href: "/dashboard/notifications", icon: BellIcon },
  { id: "support", label: "Support", href: "/dashboard/support", icon: LifebuoyIcon }
];

function money(value: string | number | null | undefined) {
  return new Intl.NumberFormat("en-US", { currency: "USD", style: "currency", maximumFractionDigits: 0 }).format(Number(value ?? 0));
}

function date(value: string | number | Date) {
  return new Date(value).toLocaleDateString();
}

function statusClass(status: string) {
  const normalized = status.toUpperCase();
  if (["CONFIRMED", "VERIFIED", "ACTIVE", "MATURED"].includes(normalized)) return "border-mint/30 bg-mint/10 text-mint";
  if (["REJECTED", "FAILED", "CANCELLED"].includes(normalized)) return "border-red-400/30 bg-red-500/10 text-red-200";
  return "border-gold/30 bg-gold/10 text-gold";
}

function StatusPill({ status }: { status: string }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${statusClass(status)}`}>{status}</span>;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="grid gap-2 text-sm font-medium text-slate-300">{children}</label>;
}

function inputClass() {
  return "focus-ring w-full rounded-md border border-white/10 bg-white/10 px-3 py-2.5 text-sm text-white placeholder:text-slate-500";
}

function DataTable({
  columns,
  rows,
  empty
}: {
  columns: string[];
  rows: Array<Array<React.ReactNode>>;
  empty: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] text-left text-sm">
        <thead className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-slate-500">
          <tr>{columns.map((column) => <th className="py-3 font-semibold" key={column}>{column}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {rows.length ? rows.map((row, index) => (
            <tr key={index}>{row.map((cell, cellIndex) => <td className="py-4 pr-4 text-slate-300" key={cellIndex}>{cell}</td>)}</tr>
          )) : (
            <tr><td className="py-5 text-slate-400" colSpan={columns.length}>{empty}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function DashboardClient({ initialSection = "overview" }: { initialSection?: Section }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<AuthSession | null>(() => readSession());
  const [data, setData] = useState<DashboardData>(emptyData);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [investmentAmount, setInvestmentAmount] = useState("");
  const [investmentAsset, setInvestmentAsset] = useState("");
  const [investmentAmountError, setInvestmentAmountError] = useState("");
  const [depositOptionKey, setDepositOptionKey] = useState("");
  const [depositAmount, setDepositAmount] = useState("500");
  const [depositTxHash, setDepositTxHash] = useState("");
  const [withdrawalAmount, setWithdrawalAmount] = useState("500");
  const [withdrawalOptionKey, setWithdrawalOptionKey] = useState("");
  const [withdrawalDestination, setWithdrawalDestination] = useState("");
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketPriority, setTicketPriority] = useState("NORMAL");
  const [ticketMessage, setTicketMessage] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const currentSection = sectionMeta.find((item) => pathname === item.href)?.id ?? initialSection;

  const headers = useMemo(() => session ? { Authorization: `Bearer ${session.accessToken}` } : undefined, [session]);

  useEffect(() => {
    if (!session?.accessToken) router.replace("/auth/login");
  }, [router, session]);

  const load = useCallback(async () => {
    try {
      const [plans, depositOptions, investments, deposits, withdrawals, notifications, kyc, support] = await Promise.all([
        apiRequest<{ plans: Plan[] }>("/investments/plans"),
        headers ? apiRequest<{ options: DepositOption[] }>("/payments/deposit-options", { headers }) : Promise.resolve({ options: [] }),
        headers ? apiRequest<{ investments: Investment[]; balance: DashboardData["balance"] }>("/investments", { headers }) : Promise.resolve({ investments: [], balance: emptyData.balance }),
        headers ? apiRequest<{ deposits: Deposit[] }>("/payments/deposits", { headers }) : Promise.resolve({ deposits: [] }),
        headers ? apiRequest<{ withdrawals: Withdrawal[] }>("/withdrawals", { headers }) : Promise.resolve({ withdrawals: [] }),
        headers ? apiRequest<{ notifications: Notification[] }>("/notifications", { headers }) : Promise.resolve({ notifications: [] }),
        headers ? apiRequest<{ checks: KycCheck[]; current: KycCheck | null }>("/kyc/status", { headers }) : Promise.resolve({ checks: [], current: null }),
        headers ? apiRequest<{ tickets: Ticket[] }>("/support/tickets", { headers }) : Promise.resolve({ tickets: [] })
      ]);
      setData({
        plans: plans.plans,
        depositOptions: depositOptions.options,
        investments: investments.investments,
        deposits: deposits.deposits,
        withdrawals: withdrawals.withdrawals,
        notifications: notifications.notifications,
        kycChecks: kyc.checks,
        currentKyc: kyc.current,
        tickets: support.tickets,
        balance: investments.balance
      });
      const firstPlan = plans.plans[0];
      setSelectedPlanId((current) => current || firstPlan?.id || "");
      setInvestmentAsset((current) => {
        if (current && firstPlan?.supportedAssets.includes(current)) return current;
        return firstPlan?.supportedAssets[0] || "USDC";
      });
      setDepositOptionKey((current) => current || depositOptions.options.find((option) => option.wallet)?.label || depositOptions.options[0]?.label || "");
      setWithdrawalOptionKey((current) => current || depositOptions.options.find((option) => option.wallet)?.label || depositOptions.options[0]?.label || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load dashboard");
    } finally {
      setIsLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    function handleStorage() {
      setSession(readSession());
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    let mounted = true;
    async function hydrate() {
      const current = readSession();
      if (!current) return;
      try {
        const response = await apiRequest<{ user: AuthSession["user"] }>("/auth/me");
        if (!mounted) return;
        const updated = { ...current, user: response.user };
        writeSession(updated);
        setSession(updated);
      } catch {
        // apiRequest handles refresh attempts.
      }
    }
    void hydrate();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submitManualDeposit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");
    setError("");
    try {
      const option = data.depositOptions.find((item) => item.label === depositOptionKey);
      if (!option?.wallet) {
        setError("Deposit address is not configured for the selected coin and network.");
        return;
      }
      await apiRequest<{ deposit: Deposit }>("/payments/deposits/manual", {
        method: "POST",
        headers,
        body: JSON.stringify({
          assetSymbol: option.assetSymbol,
          network: option.network,
          amountUsd: Number(depositAmount),
          txHash: depositTxHash
        })
      });
      setDepositTxHash("");
      setStatus("Deposit request submitted. Admin approval is required before balance changes.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit deposit");
    }
  }

  function getSelectedPlan(): Plan | undefined {
    return data.plans.find((p) => p.id === selectedPlanId);
  }

  function validateInvestmentAmount(amount: string, plan: Plan | undefined): string {
    if (!amount || Number(amount) <= 0) return "";
    if (!plan) return "";
    const num = Number(amount);
    const min = Number(plan.minDepositUsd);
    const max = Number(plan.maxDepositUsd);
    if (num < min) return `Minimum investment for ${plan.name} is ${money(min)}`;
    if (num > max) return `Maximum investment for ${plan.name} is ${money(max)}`;
    const available = Number(data.balance.availableUsd);
    if (available <= 0) return "You have no approved balance. Please make a deposit first.";
    if (num > available) return `Insufficient balance. Your available balance is ${money(available)}.`;
    return "";
  }

  async function createInvestment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");
    setError("");
    setInvestmentAmountError("");
    const plan = getSelectedPlan();
    const amountError = validateInvestmentAmount(investmentAmount, plan);
    if (amountError) {
      setInvestmentAmountError(amountError);
      return;
    }
    if (!plan) {
      setError("Please select a valid plan.");
      return;
    }
    try {
      await apiRequest("/investments", {
        method: "POST",
        headers,
        body: JSON.stringify({
          planId: selectedPlanId,
          principalUsd: Number(investmentAmount),
          assetSymbol: investmentAsset,
          disclosureHash: `risk-disclosure-${Date.now()}`
        })
      });
      setStatus("Investment started. Returns are estimates and may vary with market conditions.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start investment");
    }
  }

  async function createWithdrawal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");
    setError("");
    try {
      const option = data.depositOptions.find((item) => item.label === withdrawalOptionKey);
      if (!option) {
        setError("Select a coin and network before requesting withdrawal.");
        return;
      }
      await apiRequest<{ withdrawal: Withdrawal }>("/withdrawals", {
        method: "POST",
        headers,
        body: JSON.stringify({
          assetSymbol: option.assetSymbol,
          network: option.network,
          destination: withdrawalDestination,
          amountUsd: Number(withdrawalAmount)
        })
      });
      setWithdrawalDestination("");
      setStatus("Withdrawal request submitted for manual review.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to request withdrawal");
    }
  }

  async function requestKycReview() {
    setStatus("");
    setError("");
    try {
      await apiRequest("/kyc/manual", {
        method: "POST",
        headers,
        body: JSON.stringify({ reason: "User requested KYC review from dashboard" })
      });
      setStatus("KYC review request submitted.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to request KYC review");
    }
  }

  async function createTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");
    setError("");
    try {
      await apiRequest<{ ticket: Ticket }>("/support/tickets", {
        method: "POST",
        headers,
        body: JSON.stringify({ subject: ticketSubject, priority: ticketPriority, message: ticketMessage })
      });
      setTicketSubject("");
      setTicketMessage("");
      setTicketPriority("NORMAL");
      setStatus("Support ticket created.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create ticket");
    }
  }

  const totalDeposited = Number(data.balance.depositedUsd);
  const activeInvestments = data.investments.filter((item) => item.status === "ACTIVE");
  const activeInvestmentTotal = activeInvestments.reduce((sum, item) => sum + Number(item.principalUsd), 0);
  const totalAccrual = data.investments.reduce((sum, item) => sum + Number(item.accruedInterestUsd ?? 0), 0);
  const pendingWithdrawals = data.withdrawals.filter((item) => item.status === "PENDING").reduce((sum, item) => sum + Number(item.amountUsd), 0);
  const withdrawalBalance = Number(data.balance.availableUsd);
  const pendingDeposits = data.deposits.filter((item) => item.status === "PENDING").reduce((sum, item) => sum + Number(item.amountUsd ?? 0), 0);
  const investorName = userDisplayName(session?.user);
  const selectedDepositOption = data.depositOptions.find((item) => item.label === depositOptionKey);

  if (isLoading) {
    return (
      <>
        <Nav />
        <main className="mx-auto max-w-3xl px-5 py-16"><Card className="text-slate-300">Loading dashboard...</Card></main>
      </>
    );
  }

  if (!session) {
    return (
      <>
        <Nav />
        <main className="mx-auto max-w-3xl px-5 py-16"><Card className="text-slate-300">Sign in to access your dashboard.</Card></main>
      </>
    );
  }

  return (
    <>
      <Nav />
      <main className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[230px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card className="p-3">
            <p className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Dashboard</p>
            <nav className="grid gap-1">
              {sectionMeta.map((item) => {
                const Icon = item.icon;
                const active = currentSection === item.id;
                return (
                  <Link className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition ${active ? "bg-mint text-ink" : "text-slate-300 hover:bg-white/10 hover:text-white"}`} href={item.href} key={item.id}>
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </Card>
        </aside>

        <section className="min-w-0">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-mint">Investor workspace</p>
              <h1 className="mt-2 text-3xl font-semibold text-white">Welcome back, {investorName}</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-300">Manual deposits and withdrawals are reviewed by admins. Performance figures are estimates, not guaranteed outcomes.</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
              <p className="font-semibold text-slate-100">{session.user.email}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">Account {data.currentKyc?.status || "PENDING"}</p>
            </div>
          </div>

          {status ? <p className="mb-4 rounded-md bg-mint/10 p-3 text-sm text-mint">{status}</p> : null}
          {error ? <p className="mb-4 rounded-md bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}

          {currentSection === "overview" ? (
            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {[
                  ["Account status", data.currentKyc?.status || "Pending review"],
                  ["Total deposited", money(totalDeposited)],
                  ["Active investments", `${activeInvestments.length} (${money(activeInvestmentTotal)})`],
                  ["Profit/accrual", money(totalAccrual)],
                  ["Withdrawal balance", money(Math.max(0, withdrawalBalance))]
                ].map(([label, value]) => (
                  <Card key={label}>
                    <p className="text-sm text-slate-400">{label}</p>
                    <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
                  </Card>
                ))}
              </div>
              <div className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
                <Card>
                  <h2 className="text-lg font-semibold text-white">Active investments</h2>
                  <div className="mt-4 grid gap-3">
                    {data.investments.length ? data.investments.slice(0, 5).map((item) => (
                      <div className="rounded-lg border border-white/10 bg-white/5 p-4" key={item.id}>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-white">{item.plan.name}</p>
                            <p className="mt-1 text-sm text-slate-400">{money(item.principalUsd)} in {item.assetSymbol} · matures {date(item.maturesAt)}</p>
                          </div>
                          <StatusPill status={item.status} />
                        </div>
                        <div className="mt-3 h-2 rounded-full bg-white/10"><div className="h-2 rounded-full bg-mint" style={{ width: `${item.progressPercent}%` }} /></div>
                      </div>
                    )) : <p className="text-sm text-slate-400">No investments yet.</p>}
                  </div>
                </Card>
                <Card>
                  <h2 className="text-lg font-semibold text-white">Manual review queue</h2>
                  <div className="mt-4 grid gap-3 text-sm text-slate-300">
                    <p>Pending deposits: <span className="font-semibold text-white">{money(pendingDeposits)}</span></p>
                    <p>Pending withdrawals: <span className="font-semibold text-white">{money(pendingWithdrawals)}</span></p>
                    <p>Open support tickets: <span className="font-semibold text-white">{data.tickets.filter((ticket) => ticket.status === "OPEN").length}</span></p>
                    <p className="rounded-md border border-white/10 bg-white/5 p-3 text-slate-400">Admin approval is required before deposited funds become available or withdrawals are processed.</p>
                  </div>
                </Card>
              </div>
            </div>
          ) : null}

          {currentSection === "plans" ? (() => {
            const selectedPlan = getSelectedPlan();
            const availableBalance = Number(data.balance.availableUsd);
            return (
              <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
                <div className="grid gap-4 md:grid-cols-2">
                  {data.plans.length ? data.plans.map((plan) => (
                    <Card className={`grid gap-4 cursor-pointer transition ${selectedPlanId === plan.id ? "ring-2 ring-mint" : ""}`} key={plan.id} onClick={() => {
                      setSelectedPlanId(plan.id);
                      setInvestmentAsset(plan.supportedAssets[0] || "USDC");
                      setInvestmentAmount("");
                      setInvestmentAmountError("");
                    }}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h2 className="text-lg font-semibold text-white">{plan.name}</h2>
                          <p className="mt-1 text-sm text-slate-400">{plan.durationDays} days · {plan.riskLevel} risk</p>
                        </div>
                        <StatusPill status="Estimate" />
                      </div>
                      <p className="text-sm text-slate-300">Estimated range: {(Number(plan.estimatedYieldMin) * 100).toFixed(0)}%-{(Number(plan.estimatedYieldMax) * 100).toFixed(0)}%. Results can vary and principal is exposed to market risk.</p>
                      <div className="grid gap-2 text-sm text-slate-300">
                        <p>Limits: {money(plan.minDepositUsd)} to {money(plan.maxDepositUsd)}</p>
                        <p>Assets: {plan.supportedAssets.join(", ")}</p>
                        <p>Allocation: {plan.assetAllocation}</p>
                      </div>
                    </Card>
                  )) : (
                    <Card className="text-sm text-slate-400">No investment plans are currently available. Please check back later.</Card>
                  )}
                </div>
                <Card>
                  <h2 className="text-lg font-semibold text-white">Start investment</h2>
                  {availableBalance <= 0 ? (
                    <div className="mt-4 rounded-md border border-gold/30 bg-gold/10 p-4 text-sm text-gold">
                      <p className="font-semibold">No approved balance</p>
                      <p className="mt-1 text-slate-300">You need to make a deposit and have it approved before you can start investing. Visit the <Link className="underline text-white" href="/dashboard/deposits">Deposits</Link> section to submit a deposit request.</p>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-slate-400">Available balance: <span className="font-semibold text-white">{money(availableBalance)}</span></p>
                  )}
                  <form className="mt-4 grid gap-3" onSubmit={createInvestment}>
                    <FieldLabel>Plan<select className={inputClass()} onChange={(event) => {
                      setSelectedPlanId(event.target.value);
                      const plan = data.plans.find((p) => p.id === event.target.value);
                      if (plan) setInvestmentAsset(plan.supportedAssets[0] || "USDC");
                      setInvestmentAmount("");
                      setInvestmentAmountError("");
                    }} value={selectedPlanId}>{data.plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></FieldLabel>
                    <FieldLabel>
                      Amount USD
                      <input
                        className={inputClass()}
                        max={selectedPlan ? Number(selectedPlan.maxDepositUsd) : undefined}
                        min={selectedPlan ? Number(selectedPlan.minDepositUsd) : undefined}
                        onChange={(event) => {
                          setInvestmentAmount(event.target.value);
                          setInvestmentAmountError(validateInvestmentAmount(event.target.value, selectedPlan));
                        }}
                        placeholder={selectedPlan ? `Min ${money(selectedPlan.minDepositUsd)} – Max ${money(selectedPlan.maxDepositUsd)}` : "Select a plan first"}
                        type="number"
                        value={investmentAmount}
                      />
                      {investmentAmountError ? <span className="text-xs text-red-300">{investmentAmountError}</span> : null}
                    </FieldLabel>
                    <FieldLabel>
                      Asset
                      <select className={inputClass()} onChange={(event) => setInvestmentAsset(event.target.value)} value={investmentAsset}>
                        {selectedPlan ? selectedPlan.supportedAssets.map((asset) => <option key={asset} value={asset}>{asset}</option>) : <option>Select a plan first</option>}
                      </select>
                    </FieldLabel>
                    <p className="text-xs leading-5 text-slate-400">By starting, you confirm you understand estimated accruals are not guaranteed and may differ from actual results.</p>
                    <button className="focus-ring rounded-md bg-mint px-4 py-3 text-sm font-semibold text-ink disabled:opacity-50" disabled={availableBalance <= 0 || !investmentAmount || !!investmentAmountError}>Start investment</button>
                  </form>
                </Card>
              </div>
            );
          })() : null}

          {currentSection === "deposits" ? (
            <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
              <Card>
                <h2 className="text-lg font-semibold text-white">Manual deposit request</h2>
                <form className="mt-4 grid gap-3" onSubmit={submitManualDeposit}>
                  <FieldLabel>
                    Coin / network
                    <select className={inputClass()} onChange={(event) => setDepositOptionKey(event.target.value)} value={depositOptionKey}>
                      {data.depositOptions.map((option) => <option key={option.label} value={option.label}>{option.label}</option>)}
                    </select>
                  </FieldLabel>
                  <div className="rounded-md border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
                    {selectedDepositOption?.wallet ? (
                      <>
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Company wallet</p>
                        <p className="mt-2 break-all font-semibold text-white">{selectedDepositOption.wallet.address}</p>
                        <p className="mt-3 leading-6 text-slate-300">{selectedDepositOption.wallet.instructions}</p>
                      </>
                    ) : (
                      <p>This deposit option is not configured yet. Contact support or choose another network.</p>
                    )}
                  </div>
                  <FieldLabel>Amount USD<input className={inputClass()} min="1" onChange={(event) => setDepositAmount(event.target.value)} type="number" value={depositAmount} /></FieldLabel>
                  <FieldLabel>Transaction hash<input className={inputClass()} minLength={8} onChange={(event) => setDepositTxHash(event.target.value)} required value={depositTxHash} /></FieldLabel>
                  <button className="focus-ring rounded-md bg-mint px-4 py-3 text-sm font-semibold text-ink" disabled={!selectedDepositOption?.wallet}>Submit for approval</button>
                </form>
              </Card>
              <Card>
                <h2 className="mb-2 text-lg font-semibold text-white">Deposit history</h2>
                <DataTable
                  columns={["Asset", "Network", "Amount", "Status", "Created"]}
                  empty="No deposit requests yet."
                  rows={data.deposits.map((item) => [
                    item.assetSymbol,
                    item.network,
                    money(item.amountUsd),
                    <StatusPill key={item.id} status={item.status} />,
                    item.status === "REJECTED" && item.rejectionReason ? item.rejectionReason : date(item.createdAt)
                  ])}
                />
              </Card>
            </div>
          ) : null}

          {currentSection === "withdrawals" ? (
            <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
              <Card>
                  <h2 className="text-lg font-semibold text-white">Request withdrawal</h2>
                <p className="mt-2 text-sm text-slate-400">Available balance: {money(data.balance.availableUsd)}. Requests are reviewed and paid manually.</p>
                <form className="mt-4 grid gap-3" onSubmit={createWithdrawal}>
                  <FieldLabel>Coin / network<select className={inputClass()} onChange={(event) => setWithdrawalOptionKey(event.target.value)} value={withdrawalOptionKey}>{data.depositOptions.map((option) => <option key={option.label} value={option.label}>{option.label}</option>)}</select></FieldLabel>
                  <FieldLabel>Amount USD<input className={inputClass()} min="1" onChange={(event) => setWithdrawalAmount(event.target.value)} type="number" value={withdrawalAmount} /></FieldLabel>
                  <FieldLabel>Destination<input className={inputClass()} minLength={16} onChange={(event) => setWithdrawalDestination(event.target.value)} required value={withdrawalDestination} /></FieldLabel>
                  <button className="focus-ring rounded-md bg-mint px-4 py-3 text-sm font-semibold text-ink">Submit withdrawal</button>
                </form>
              </Card>
              <Card>
                <h2 className="mb-2 text-lg font-semibold text-white">Withdrawal history</h2>
                <DataTable
                  columns={["Investment", "Asset", "Amount", "Status", "Requested"]}
                  empty="No withdrawal requests yet."
                  rows={data.withdrawals.map((item) => [item.network, item.assetSymbol, money(item.amountUsd), <StatusPill key={item.id} status={item.status} />, item.status === "PAID" && item.txHash ? item.txHash : item.rejectionReason || date(item.createdAt)])}
                />
              </Card>
            </div>
          ) : null}

          {currentSection === "kyc" ? (
            <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
              <Card>
                <CheckBadgeIcon className="h-10 w-10 text-mint" />
                <h2 className="mt-3 text-lg font-semibold text-white">KYC status</h2>
                <p className="mt-2 text-sm text-slate-400">Current status: <span className="font-semibold text-white">{data.currentKyc?.status || "PENDING"}</span></p>
                <button className="focus-ring mt-5 rounded-md bg-mint px-4 py-3 text-sm font-semibold text-ink" onClick={requestKycReview} type="button">Request review</button>
              </Card>
              <Card>
                <h2 className="mb-2 text-lg font-semibold text-white">KYC history</h2>
                <DataTable
                  columns={["Provider", "Status", "Reason", "Updated"]}
                  empty="No KYC checks yet."
                  rows={data.kycChecks.map((item) => [item.provider, <StatusPill key={item.id} status={item.status} />, item.reason || "Manual review", date(item.updatedAt)])}
                />
              </Card>
            </div>
          ) : null}

          {currentSection === "notifications" ? (
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-white">Notifications</h2>
                {data.notifications.some((n) => !n.readAt) ? (
                  <button
                    className="focus-ring rounded-md border border-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-300 hover:bg-white/10 hover:text-white"
                    onClick={async () => {
                      try {
                        await apiRequest("/notifications/read-all", { method: "POST", headers });
                        await load();
                      } catch {}
                    }}
                    type="button"
                  >
                    Mark all read
                  </button>
                ) : null}
              </div>
              <div className="mt-4 divide-y divide-white/10">
                {data.notifications.length ? data.notifications.map((item) => (
                  <article className={`py-4 ${!item.readAt ? "rounded-md bg-white/5 -mx-3 px-3" : ""}`} key={item.id}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {!item.readAt && <span className="inline-block h-2 w-2 rounded-full bg-mint" />}
                        <h3 className="font-semibold text-white">{item.title}</h3>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{date(item.createdAt)}</p>
                        {!item.readAt ? (
                          <button
                            className="focus-ring rounded-md border border-white/10 px-2 py-1 text-xs text-slate-400 hover:bg-white/10 hover:text-white"
                            onClick={async () => {
                              try {
                                await apiRequest(`/notifications/${item.id}/read`, { method: "PATCH", headers });
                                await load();
                              } catch {}
                            }}
                            type="button"
                          >
                            Mark read
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-slate-300">{item.body}</p>
                  </article>
                )) : <p className="text-sm text-slate-400">No notifications yet.</p>}
              </div>
            </Card>
          ) : null}

          {currentSection === "support" ? (
            <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
              <Card>
                <h2 className="text-lg font-semibold text-white">New support ticket</h2>
                <form className="mt-4 grid gap-3" onSubmit={createTicket}>
                  <FieldLabel>Subject<input className={inputClass()} maxLength={160} minLength={3} onChange={(event) => setTicketSubject(event.target.value)} required value={ticketSubject} /></FieldLabel>
                  <FieldLabel>Priority<select className={inputClass()} onChange={(event) => setTicketPriority(event.target.value)} value={ticketPriority}>{["LOW", "NORMAL", "HIGH", "URGENT"].map((priority) => <option key={priority}>{priority}</option>)}</select></FieldLabel>
                  <FieldLabel>Message<textarea className={`${inputClass()} min-h-36`} maxLength={4000} minLength={10} onChange={(event) => setTicketMessage(event.target.value)} required value={ticketMessage} /></FieldLabel>
                  <button className="focus-ring rounded-md bg-mint px-4 py-3 text-sm font-semibold text-ink">Create ticket</button>
                </form>
              </Card>
              <Card>
                <h2 className="mb-2 text-lg font-semibold text-white">Tickets</h2>
                <DataTable
                  columns={["Subject", "Priority", "Status", "Created"]}
                  empty="No support tickets yet."
                  rows={data.tickets.map((item) => [item.subject, item.priority, <StatusPill key={item.id} status={item.status} />, date(item.createdAt)])}
                />
              </Card>
            </div>
          ) : null}
        </section>
      </main>
    </>
  );
}
