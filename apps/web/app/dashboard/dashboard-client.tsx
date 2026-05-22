"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/card";
import { Nav } from "@/components/nav";
import { PortfolioChart } from "@/components/portfolio-chart";
import { apiRequest, readSession, writeSession, type AuthSession } from "@/lib/api";

type Plan = {
  id: string;
  name: string;
  minDepositUsd: string;
  maxDepositUsd: string;
  durationDays: number;
  estimatedYieldMin: string;
  estimatedYieldMax: string;
  riskLevel: string;
  supportedAssets: string[];
};

type Investment = {
  id: string;
  principalUsd: string;
  assetSymbol: string;
  status: string;
  startedAt: string;
  maturesAt: string;
  plan: Plan;
  projectedPayoutUsd: string;
  dailyAccrualUsd: string;
  accruedInterestUsd: string;
  yieldPercent: number;
  daysElapsed: number;
  daysRemaining: number;
  progressPercent: number;
};

type Deposit = {
  id: string;
  assetSymbol: string;
  network: string;
  depositAddress: string;
  amountUsd: string | null;
  status: string;
  confirmations: number;
  createdAt: string;
};

type Withdrawal = {
  id: string;
  assetSymbol: string;
  amountUsd: string;
  status: string;
  createdAt: string;
};

type Notification = {
  id: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

type DashboardData = {
  plans: Plan[];
  investments: Investment[];
  deposits: Deposit[];
  withdrawals: Withdrawal[];
  notifications: Notification[];
};

const emptyData: DashboardData = {
  plans: [],
  investments: [],
  deposits: [],
  withdrawals: [],
  notifications: []
};

function money(value: string | number | null | undefined) {
  return new Intl.NumberFormat("en-US", { currency: "USD", style: "currency", maximumFractionDigits: 0 }).format(Number(value ?? 0));
}

export function DashboardClient() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(() => readSession());
  const [data, setData] = useState<DashboardData>(emptyData);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [investmentAmount, setInvestmentAmount] = useState("1000");
  const [investmentAsset, setInvestmentAsset] = useState("USDC");
  const [depositAsset, setDepositAsset] = useState("USDC");
  const [depositNetwork, setDepositNetwork] = useState("Ethereum");
  const [withdrawalInvestmentId, setWithdrawalInvestmentId] = useState("");
  const [withdrawalAmount, setWithdrawalAmount] = useState("500");
  const [withdrawalAsset, setWithdrawalAsset] = useState("USDC");
  const [withdrawalNetwork, setWithdrawalNetwork] = useState("Ethereum");
  const [withdrawalDestination, setWithdrawalDestination] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [isLoading, setIsLoading] = useState(true);

  const headers = useMemo(() => session ? { Authorization: `Bearer ${session.accessToken}` } : undefined, [session]);

  useEffect(() => {
    if (!session?.accessToken) {
      router.replace("/auth/login");
    }
  }, [router, session]);

  const load = useCallback(async () => {
    try {
      const [plans, investments, deposits, withdrawals, notifications] = await Promise.all([
        apiRequest<{ plans: Plan[] }>("/investments/plans"),
        headers ? apiRequest<{ investments: Investment[] }>("/investments", { headers }) : Promise.resolve({ investments: [] }),
        headers ? apiRequest<{ deposits: Deposit[] }>("/payments/deposits", { headers }) : Promise.resolve({ deposits: [] }),
        headers ? apiRequest<{ withdrawals: Withdrawal[] }>("/withdrawals", { headers }) : Promise.resolve({ withdrawals: [] }),
        headers ? apiRequest<{ notifications: Notification[] }>("/notifications", { headers }) : Promise.resolve({ notifications: [] })
      ]);
      const loadedAt = Date.now();

      setData({
        plans: plans.plans,
        investments: investments.investments,
        deposits: deposits.deposits,
        withdrawals: withdrawals.withdrawals,
        notifications: notifications.notifications
      });
      setCurrentTime(loadedAt);
      setSelectedPlanId((current) => current || plans.plans[0]?.id || "");
      setWithdrawalInvestmentId((current) => {
        if (current) return current;
        return investments.investments.find((item) => new Date(item.maturesAt).getTime() <= loadedAt)?.id || "";
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load dashboard");
    } finally {
      setIsLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

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
      const s = readSession();
      if (!s) return;
      try {
        const data = await apiRequest<{ user: { id: string; email: string; role: string; emailVerifiedAt?: string } }>("/auth/me");
        if (!mounted) return;
        const updated = { ...s, user: data.user } as AuthSession;
        writeSession(updated);
        setSession(updated);
      } catch {
        // ignore; apiRequest will attempt refresh if needed
      }
    }
    void hydrate();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    // Reload dashboard data when session changes
    void load();
  }, [session, load]);

  async function createDeposit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!headers) return setError("Sign in to create a deposit address");

    setStatus("");
    setError("");
    try {
      const response = await apiRequest<{ deposit: Deposit }>("/payments/deposit-address", {
        method: "POST",
        headers,
        body: JSON.stringify({ assetSymbol: depositAsset, network: depositNetwork })
      });
      setStatus(`Deposit address created: ${response.deposit.depositAddress}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create deposit address");
    }
  }

  async function createInvestment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!headers) return setError("Sign in to start an investment");

    setStatus("");
    setError("");
    try {
      await apiRequest<{ investment: Investment }>("/investments", {
        method: "POST",
        headers,
        body: JSON.stringify({
          planId: selectedPlanId,
          principalUsd: Number(investmentAmount),
          assetSymbol: investmentAsset,
          disclosureHash: `risk-disclosure-${Date.now()}`
        })
      });
      setStatus("Investment created and added to your portfolio.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create investment");
    }
  }

  async function createWithdrawal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!headers) return setError("Sign in to request a withdrawal");
    if (!withdrawalInvestmentId) return setError("No matured investment is available for withdrawal");

    setStatus("");
    setError("");
    try {
      await apiRequest<{ withdrawal: Withdrawal }>("/withdrawals", {
        method: "POST",
        headers,
        body: JSON.stringify({
          investmentId: withdrawalInvestmentId,
          assetSymbol: withdrawalAsset,
          network: withdrawalNetwork,
          destination: withdrawalDestination,
          amountUsd: Number(withdrawalAmount)
        })
      });
      setWithdrawalDestination("");
      setStatus("Withdrawal request submitted for compliance review.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to request withdrawal");
    }
  }

  const investorName = session?.user.email.split("@")[0] || "Investor";
  const totalInvested = data.investments.reduce((sum, item) => sum + Number(item.principalUsd), 0);
  const activePlans = data.investments.filter((item) => item.status === "ACTIVE").length;
  const walletBalance = data.deposits
    .filter((item) => item.status === "CONFIRMED")
    .reduce((sum, item) => sum + Number(item.amountUsd ?? 0), 0);
  const portfolioValue = totalInvested + walletBalance;
  const pendingWithdrawals = data.withdrawals.filter((item) => item.status === "PENDING").length;
  const openDeposits = data.deposits.filter((item) => item.status !== "CONFIRMED").length;
  const nextMaturity = data.investments
    .filter((item) => item.status === "ACTIVE")
    .map((item) => new Date(item.maturesAt).getTime())
    .sort((a, b) => a - b)[0];
  const maturedInvestments = data.investments.filter((item) => new Date(item.maturesAt).getTime() <= currentTime && ["ACTIVE", "MATURED"].includes(item.status));
  const maturedValue = maturedInvestments.reduce((sum, item) => sum + Number(item.principalUsd), 0);

  const totalProjectedPayout = data.investments.reduce((sum, item) => sum + Number(item.projectedPayoutUsd ?? 0), 0);
  const totalAccruedInterest = data.investments.reduce((sum, item) => sum + Number(item.accruedInterestUsd ?? 0), 0);
  const todayInterest = data.investments
    .filter((item) => item.status === "ACTIVE")
    .reduce((sum, item) => sum + Number(item.dailyAccrualUsd ?? 0), 0);

  const featureMap = [
    { label: "Portfolio", value: money(portfolioValue), tone: "text-mint" },
    { label: "Daily interest", value: money(todayInterest), tone: "text-mint" },
    { label: "Accrued interest", value: money(totalAccruedInterest), tone: "text-slate-200" },
    { label: "Projected payout", value: money(totalProjectedPayout), tone: "text-slate-200" },
    { label: "Pending withdrawals", value: `${pendingWithdrawals} request${pendingWithdrawals === 1 ? "" : "s"}`, tone: "text-slate-200" },
    { label: "Deposit addresses", value: `${openDeposits} open`, tone: "text-slate-200" }
  ];

  const activity = [
    ...data.deposits.map((item) => ({
      id: item.id,
      label: `${item.assetSymbol} deposit`,
      detail: item.network,
      status: `${item.status} (${item.confirmations} conf.)`,
      value: item.amountUsd ? money(item.amountUsd) : "Address issued",
      date: item.createdAt
    })),
    ...data.investments.map((item) => ({
      id: item.id,
      label: item.plan.name,
      detail: `Matures ${new Date(item.maturesAt).toLocaleDateString()}`,
      status: item.status,
      value: money(item.principalUsd),
      date: item.startedAt
    })),
    ...data.withdrawals.map((item) => ({
      id: item.id,
      label: `${item.assetSymbol} withdrawal`,
      detail: "Risk review",
      status: item.status,
      value: money(item.amountUsd),
      date: item.createdAt
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (isLoading) {
    return (
      <>
        <Nav />
        <main className="mx-auto max-w-3xl px-5 py-16">
          <Card className="text-slate-300">Loading portfolio workspace...</Card>
        </main>
      </>
    );
  }

  if (!session) {
    return (
      <>
        <Nav />
        <main className="mx-auto max-w-3xl px-5 py-16">
          <Card>
            <h1 className="text-xl font-semibold text-white">Sign in required</h1>
            <p className="mt-2 text-sm text-slate-300">Create an account or sign in to access your portfolio workspace.</p>
          </Card>
        </main>
      </>
    );
  }

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-7xl px-5 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-mint">Investor workspace</p>
          <h1 className="mt-2 text-4xl font-semibold text-white">Welcome back, {investorName}</h1>
          <p className="mt-2 max-w-3xl text-slate-300">Your portfolio summary, deposit addresses, investment activity, and withdrawal status are all in one place.</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
          <p className="font-semibold text-slate-100">Account</p>
          <p>{session.user.email}</p>
          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-400">Role: {session.user.role}</p>
        </div>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-4">
        {featureMap.map((feature) => (
          <Card key={feature.label}>
            <p className="text-sm text-slate-400">{feature.label}</p>
            <p className={`mt-2 text-3xl font-semibold ${feature.tone}`}>{feature.value}</p>
          </Card>
        ))}
      </div>
      {status ? <p className="mt-4 rounded-md bg-mint/10 p-3 text-sm text-mint">{status}</p> : null}
      {error ? <p className="mt-4 rounded-md bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_.9fr]">
        <Card>
          <h2 className="text-xl font-semibold text-white">Portfolio overview</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-slate-400">Current holdings</p>
              <p className="mt-2 text-3xl font-semibold text-white">{money(totalInvested)}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-slate-400">Deposited balance</p>
              <p className="mt-2 text-3xl font-semibold text-white">{money(walletBalance)}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-slate-400">Next payout</p>
              <p className="mt-2 text-3xl font-semibold text-white">{nextMaturity ? new Date(nextMaturity).toLocaleDateString() : "No upcoming maturity"}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-slate-400">Available actions</p>
              <p className="mt-2 text-3xl font-semibold text-white">{pendingWithdrawals} pending</p>
            </div>
          </div>
        </Card>
        <Card>
          <h2 className="text-xl font-semibold text-white">Portfolio details</h2>
          <div className="mt-4 space-y-3">
            {data.investments.length ? data.investments.map((investment) => (
              <div key={investment.id} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-400">{investment.plan.name}</p>
                    <p className="mt-2 text-lg font-semibold text-white">{investment.assetSymbol} {money(investment.principalUsd)}</p>
                  </div>
                  <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-slate-300">
                    {investment.yieldPercent}% yield
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-300">Status: {investment.status}</p>
                <p className="text-sm text-slate-300">Matures {new Date(investment.maturesAt).toLocaleDateString()}</p>
                <div className="mt-4 rounded-full bg-white/5 p-1">
                  <div className="h-2 rounded-full bg-mint" style={{ width: `${investment.progressPercent}%` }} />
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Accrued</p>
                    <p className="mt-2 font-semibold text-white">{money(investment.accruedInterestUsd)}</p>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Daily</p>
                    <p className="mt-2 font-semibold text-white">{money(investment.dailyAccrualUsd)}</p>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Payout</p>
                    <p className="mt-2 font-semibold text-white">{money(investment.projectedPayoutUsd)}</p>
                  </div>
                </div>
                <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-400">
                  {investment.daysRemaining > 0 ? `${investment.daysRemaining} days remaining` : "Matured"}
                </p>
              </div>
            )) : <p className="text-sm text-slate-300">No investments yet. Start with a plan above.</p>}
          </div>
        </Card>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_.9fr]">
        <Card>
          <h2 className="text-xl font-semibold text-white">Performance estimate</h2>
          <PortfolioChart />
        </Card>
        <Card>
          <h2 className="text-xl font-semibold text-white">New deposit</h2>
          <form className="mt-5 space-y-3" onSubmit={createDeposit}>
            <select className="focus-ring w-full rounded-md border border-white/10 bg-ink px-4 py-3 text-white" onChange={(event) => setDepositAsset(event.target.value)} value={depositAsset}>
              {["USDC", "USDT", "BTC", "ETH", "SOL", "BNB"].map((asset) => <option key={asset}>{asset}</option>)}
            </select>
            <input className="focus-ring w-full rounded-md border border-white/10 bg-white/10 px-4 py-3 text-white" onChange={(event) => setDepositNetwork(event.target.value)} value={depositNetwork} />
            <button className="focus-ring w-full rounded-md bg-mint px-4 py-3 font-semibold text-ink">Create address</button>
          </form>
        </Card>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[.9fr_1.4fr]">
        <Card>
          <h2 className="text-xl font-semibold text-white">Start investment</h2>
          <form className="mt-5 space-y-3" onSubmit={createInvestment}>
            <select className="focus-ring w-full rounded-md border border-white/10 bg-ink px-4 py-3 text-white" onChange={(event) => setSelectedPlanId(event.target.value)} value={selectedPlanId}>
              {data.plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
            </select>
            <div className="grid gap-3 sm:grid-cols-2">
              <input className="focus-ring w-full rounded-md border border-white/10 bg-white/10 px-4 py-3 text-white" min="1" onChange={(event) => setInvestmentAmount(event.target.value)} type="number" value={investmentAmount} />
              <input className="focus-ring w-full rounded-md border border-white/10 bg-white/10 px-4 py-3 text-white" onChange={(event) => setInvestmentAsset(event.target.value)} value={investmentAsset} />
            </div>
            <button className="focus-ring w-full rounded-md bg-mint px-4 py-3 font-semibold text-ink">Create investment</button>
          </form>
        </Card>
        <Card>
          <h2 className="text-xl font-semibold text-white">Request withdrawal</h2>
          <form className="mt-5 space-y-3" onSubmit={createWithdrawal}>
            <select
              className="focus-ring w-full rounded-md border border-white/10 bg-ink px-4 py-3 text-white"
              disabled={!maturedInvestments.length}
              onChange={(event) => setWithdrawalInvestmentId(event.target.value)}
              value={withdrawalInvestmentId}
            >
              {maturedInvestments.length ? maturedInvestments.map((item) => (
                <option key={item.id} value={item.id}>{item.plan.name} - {money(item.principalUsd)}</option>
              )) : <option>No matured investments</option>}
            </select>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                className="focus-ring w-full rounded-md border border-white/10 bg-white/10 px-4 py-3 text-white"
                min="1"
                onChange={(event) => setWithdrawalAmount(event.target.value)}
                type="number"
                value={withdrawalAmount}
              />
              <select className="focus-ring w-full rounded-md border border-white/10 bg-ink px-4 py-3 text-white" onChange={(event) => setWithdrawalAsset(event.target.value)} value={withdrawalAsset}>
                {["USDC", "USDT", "BTC", "ETH", "SOL", "BNB"].map((asset) => <option key={asset}>{asset}</option>)}
              </select>
            </div>
            <input className="focus-ring w-full rounded-md border border-white/10 bg-white/10 px-4 py-3 text-white" onChange={(event) => setWithdrawalNetwork(event.target.value)} value={withdrawalNetwork} />
            <input
              className="focus-ring w-full rounded-md border border-white/10 bg-white/10 px-4 py-3 text-white"
              minLength={16}
              onChange={(event) => setWithdrawalDestination(event.target.value)}
              placeholder="Destination wallet address"
              required
              value={withdrawalDestination}
            />
            <button className="focus-ring w-full rounded-md bg-mint px-4 py-3 font-semibold text-ink" disabled={!maturedInvestments.length}>
              Submit withdrawal
            </button>
          </form>
        </Card>
      </div>
      <div className="mt-4">
        <div className="grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
          <Card className="overflow-x-auto">
            <h2 className="text-xl font-semibold text-white">Recent activity</h2>
            <table className="mt-4 w-full min-w-[640px] text-left text-sm">
              <tbody className="divide-y divide-white/10">
                {activity.length ? activity.slice(0, 12).map((row) => (
                  <tr key={row.id}>
                    <td className="py-4 text-white">{row.label}</td>
                    <td className="py-4 text-slate-300">{row.detail}</td>
                    <td className="py-4 text-slate-300">{row.status}</td>
                    <td className="py-4 text-slate-200">{row.value}</td>
                  </tr>
                )) : (
                  <tr>
                    <td className="py-4 text-slate-300" colSpan={4}>No account activity yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
          <Card>
            <h2 className="text-xl font-semibold text-white">Notifications</h2>
            <div className="mt-4 divide-y divide-white/10">
              {data.notifications.length ? data.notifications.slice(0, 5).map((item) => (
                <div className="py-3" key={item.id}>
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-300">{item.body}</p>
                </div>
              )) : <p className="py-3 text-sm text-slate-300">No notifications yet.</p>}
            </div>
          </Card>
        </div>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card className="overflow-x-auto">
          <h2 className="text-xl font-semibold text-white">Deposit history</h2>
          <table className="mt-4 w-full min-w-[620px] text-left text-sm">
            <thead className="border-b border-white/10 text-slate-400">
              <tr>
                <th className="py-3">Asset</th>
                <th className="py-3">Network</th>
                <th className="py-3">Amount</th>
                <th className="py-3">Status</th>
                <th className="py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {data.deposits.length ? data.deposits.map((deposit) => (
                <tr key={deposit.id}>
                  <td className="py-4 text-white">{deposit.assetSymbol}</td>
                  <td className="py-4 text-slate-300">{deposit.network}</td>
                  <td className="py-4 text-slate-200">{deposit.amountUsd ? money(deposit.amountUsd) : "Address only"}</td>
                  <td className="py-4 text-slate-300">{deposit.status}</td>
                  <td className="py-4 text-slate-300">{new Date(deposit.createdAt).toLocaleDateString()}</td>
                </tr>
              )) : (
                <tr>
                  <td className="py-4 text-slate-300" colSpan={5}>No deposit history yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
        <Card className="overflow-x-auto">
          <h2 className="text-xl font-semibold text-white">Withdrawal history</h2>
          <table className="mt-4 w-full min-w-[620px] text-left text-sm">
            <thead className="border-b border-white/10 text-slate-400">
              <tr>
                <th className="py-3">Asset</th>
                <th className="py-3">Amount</th>
                <th className="py-3">Status</th>
                <th className="py-3">Requested</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {data.withdrawals.length ? data.withdrawals.map((withdrawal) => (
                <tr key={withdrawal.id}>
                  <td className="py-4 text-white">{withdrawal.assetSymbol}</td>
                  <td className="py-4 text-slate-200">{money(withdrawal.amountUsd)}</td>
                  <td className="py-4 text-slate-300">{withdrawal.status}</td>
                  <td className="py-4 text-slate-300">{new Date(withdrawal.createdAt).toLocaleDateString()}</td>
                </tr>
              )) : (
                <tr>
                  <td className="py-4 text-slate-300" colSpan={4}>No withdrawal history yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>
      </main>
    </>
  );
}
