"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest, clearSession, readSession, type AuthSession } from "@/lib/api";
import { Card } from "@/components/card";
import { Nav } from "@/components/nav";

type Overview = {
  users: number;
  pendingWithdrawals: number;
  pendingDeposits: number;
  activeInvestments: number;
  pendingKyc: number;
  openTickets: number;
};

type CompanyWallet = {
  id: string;
  assetSymbol: string;
  network: string;
  label: string;
  address: string;
  instructions: string;
  isActive: boolean;
};

type AdminDeposit = {
  id: string;
  assetSymbol: string;
  network: string;
  depositAddress: string;
  txHash: string | null;
  amountUsd: string | null;
  status: string;
  rejectionReason: string | null;
  createdAt: string;
  user: { email: string };
};

type AdminWithdrawal = {
  id: string;
  assetSymbol: string;
  network: string;
  destination: string;
  amountUsd: string;
  txHash: string | null;
  status: string;
  rejectionReason: string | null;
  adminNote: string | null;
  createdAt: string;
  paidAt: string | null;
  user: { email: string; profile?: { firstName?: string | null; lastName?: string | null } | null };
};

type AdminPlan = {
  id: string;
  name: string;
  minDepositUsd: string;
  maxDepositUsd: string;
  durationDays: number;
  estimatedYieldMin: string;
  estimatedYieldMax: string;
  riskLevel: string;
  riskNote: string | null;
  assetAllocation: string;
  supportedAssets: string[];
  isActive: boolean;
};

type AdminInvestment = {
  id: string;
  principalUsd: string;
  expectedReturnUsd: string;
  status: string;
  startedAt: string;
  maturesAt: string;
  user: { email: string; profile?: { firstName?: string | null; lastName?: string | null } | null };
  plan: { name: string };
};

type AdminUser = {
  id: string;
  email: string;
  role: string;
  emailVerifiedAt: string | null;
  createdAt: string;
  profile?: { firstName?: string | null; lastName?: string | null } | null;
  balance: { availableUsd: string };
};

type AdminKyc = {
  id: string;
  status: string;
  reason: string | null;
  updatedAt: string;
  user: { email: string; profile?: { firstName?: string | null; lastName?: string | null } | null };
};

type AdminTicket = {
  id: string;
  subject: string;
  status: string;
  priority: string;
  message: string;
  adminResponse: string | null;
  createdAt: string;
  user: { email: string; profile?: { firstName?: string | null; lastName?: string | null } | null };
};

type AuditLog = {
  id: string;
  actorId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  createdAt: string;
};

type ReadinessCheck = {
  key: string;
  label: string;
  ok: boolean;
  severity: "critical" | "warning";
  detail: string;
};

type Readiness = {
  checks: ReadinessCheck[];
  summary: {
    criticalOpen: number;
    ready: boolean;
    warningsOpen: number;
  };
};

function money(value: string | number | null | undefined) {
  return new Intl.NumberFormat("en-US", { currency: "USD", style: "currency", maximumFractionDigits: 0 }).format(Number(value ?? 0));
}

function badgeClass(status: string) {
  if (["CONFIRMED", "APPROVED", "PAID", "VERIFIED", "ACTIVE", "COMPLETED", "ANSWERED"].includes(status)) return "border-mint/30 bg-mint/10 text-mint";
  if (["REJECTED", "FAILED", "CANCELLED"].includes(status)) return "border-red-400/30 bg-red-500/10 text-red-200";
  return "border-gold/30 bg-gold/10 text-gold";
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${badgeClass(status)}`}>{status}</span>;
}

function adminDisplayName(user: { email: string; profile?: { firstName?: string | null; lastName?: string | null } | null }) {
  return [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(" ").trim() || user.email;
}

export function AdminClient() {
  const [session, setSession] = useState<AuthSession | null>(() => readSession());
  const [overview, setOverview] = useState<Overview | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [wallets, setWallets] = useState<CompanyWallet[]>([]);
  const [deposits, setDeposits] = useState<AdminDeposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawal[]>([]);
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [investments, setInvestments] = useState<AdminInvestment[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [kycChecks, setKycChecks] = useState<AdminKyc[]>([]);
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [walletAsset, setWalletAsset] = useState("USDT");
  const [walletNetwork, setWalletNetwork] = useState("TRC20");
  const [walletLabel, setWalletLabel] = useState("USDT TRC20");
  const [walletAddress, setWalletAddress] = useState("");
  const [walletInstructions, setWalletInstructions] = useState("Send only the selected coin on the selected network. Submit the transaction hash after payment.");
  const [decisionReasons, setDecisionReasons] = useState<Record<string, string>>({});
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [txHashes, setTxHashes] = useState<Record<string, string>>({});
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [planName, setPlanName] = useState("");
  const [planMin, setPlanMin] = useState("100");
  const [planMax, setPlanMax] = useState("5000");
  const [planDuration, setPlanDuration] = useState("30");
  const [planReturnMin, setPlanReturnMin] = useState("0.05");
  const [planReturnMax, setPlanReturnMax] = useState("0.08");
  const [planRisk, setPlanRisk] = useState("Moderate");
  const [planRiskNote, setPlanRiskNote] = useState("Crypto markets can move against the strategy. Returns are estimates and may vary.");
  const [planAssets, setPlanAssets] = useState("USDT,BTC,ETH");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const canViewAdmin = useMemo(() => session?.user.role === "ADMIN", [session]);

  const load = useCallback(async () => {
      if (!session) {
        setIsLoading(false);
        return;
      }

      try {
        const headers = { Authorization: `Bearer ${session.accessToken}` };
        const [overviewResponse, auditResponse, readinessResponse, walletResponse, depositResponse, withdrawalResponse, planResponse, investmentResponse, userResponse, kycResponse, ticketResponse] = await Promise.all([
          apiRequest<Overview>("/admin/overview", { headers }),
          apiRequest<{ logs: AuditLog[] }>("/admin/audit-logs", { headers }),
          apiRequest<Readiness>("/admin/readiness", { headers }),
          apiRequest<{ wallets: CompanyWallet[] }>("/admin/company-wallets", { headers }),
          apiRequest<{ deposits: AdminDeposit[] }>("/admin/deposits", { headers }),
          apiRequest<{ withdrawals: AdminWithdrawal[] }>("/admin/withdrawals", { headers }),
          apiRequest<{ plans: AdminPlan[] }>("/admin/plans", { headers }),
          apiRequest<{ investments: AdminInvestment[] }>("/admin/investments", { headers }),
          apiRequest<{ users: AdminUser[] }>("/admin/users", { headers }),
          apiRequest<{ checks: AdminKyc[] }>("/admin/kyc", { headers }),
          apiRequest<{ tickets: AdminTicket[] }>("/admin/support/tickets", { headers })
        ]);
        setOverview(overviewResponse);
        setLogs(auditResponse.logs);
        setReadiness(readinessResponse);
        setWallets(walletResponse.wallets);
        setDeposits(depositResponse.deposits);
        setWithdrawals(withdrawalResponse.withdrawals);
        setPlans(planResponse.plans);
        setInvestments(investmentResponse.investments);
        setUsers(userResponse.users);
        setKycChecks(kycResponse.checks);
        setTickets(ticketResponse.tickets);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load admin data");
      } finally {
        setIsLoading(false);
      }
  }, [session]);

  useEffect(() => {
    void load();
  }, [load]);

  function signOut() {
    clearSession();
    setSession(null);
    setOverview(null);
    setLogs([]);
    setReadiness(null);
    setWallets([]);
    setDeposits([]);
    setWithdrawals([]);
    setPlans([]);
    setInvestments([]);
    setUsers([]);
    setKycChecks([]);
    setTickets([]);
  }

  function applyWalletPreset(value: string) {
    const [assetSymbol, network] = value.split(":");
    setWalletAsset(assetSymbol);
    setWalletNetwork(network);
    setWalletLabel(network === "Bitcoin" || network === "Ethereum" ? assetSymbol : `${assetSymbol} ${network}`);
  }

  async function saveWallet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    setError("");
    try {
      const headers = { Authorization: `Bearer ${session!.accessToken}` };
      await apiRequest("/admin/company-wallets", {
        method: "POST",
        headers,
        body: JSON.stringify({
          assetSymbol: walletAsset,
          network: walletNetwork,
          label: walletLabel,
          address: walletAddress,
          instructions: walletInstructions,
          isActive: true
        })
      });
      setWalletAddress("");
      setNotice("Company wallet saved.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save wallet");
    }
  }

  async function decideDeposit(id: string, status: "CONFIRMED" | "REJECTED", txHash?: string | null) {
    if (!window.confirm(status === "CONFIRMED" ? "Approve this deposit?" : "Reject this deposit?")) return;
    setNotice("");
    setError("");
    try {
      const headers = { Authorization: `Bearer ${session!.accessToken}` };
      await apiRequest(`/admin/deposits/${id}/decision`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(status === "CONFIRMED" ? { status, txHash: txHash || undefined } : { status, reason: decisionReasons[id] || "Deposit proof could not be verified" })
      });
      setNotice(status === "CONFIRMED" ? "Deposit approved." : "Deposit rejected.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update deposit");
    }
  }

  async function savePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!window.confirm("Save this investment plan?")) return;
    setNotice("");
    setError("");
    try {
      const headers = { Authorization: `Bearer ${session!.accessToken}` };
      await apiRequest("/admin/plans", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: planName,
          minDepositUsd: Number(planMin),
          maxDepositUsd: Number(planMax),
          durationDays: Number(planDuration),
          estimatedYieldMin: Number(planReturnMin),
          estimatedYieldMax: Number(planReturnMax),
          riskLevel: planRisk,
          riskNote: planRiskNote,
          assetAllocation: planAssets,
          supportedAssets: planAssets.split(",").map((asset) => asset.trim()).filter(Boolean),
          isActive: true
        })
      });
      setPlanName("");
      setNotice("Investment plan saved.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save plan");
    }
  }

  async function updatePlan(plan: AdminPlan, data: Partial<AdminPlan>) {
    if (!window.confirm("Update this investment plan?")) return;
    setNotice("");
    setError("");
    try {
      const headers = { Authorization: `Bearer ${session!.accessToken}` };
      await apiRequest(`/admin/plans/${plan.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(data)
      });
      setNotice("Investment plan updated.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update plan");
    }
  }

  async function decideWithdrawal(id: string, status: "APPROVED" | "REJECTED" | "PAID") {
    if (!window.confirm(`${status === "PAID" ? "Mark this withdrawal as paid" : status.toLowerCase()}?`)) return;
    setNotice("");
    setError("");
    try {
      const headers = { Authorization: `Bearer ${session!.accessToken}` };
      await apiRequest(`/admin/withdrawals/${id}/decision`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(
          status === "APPROVED"
            ? { status, adminNote: adminNotes[id] || undefined }
            : status === "REJECTED"
              ? { status, reason: decisionReasons[id] || "Withdrawal could not be approved" }
              : { status, txHash: txHashes[id], adminNote: adminNotes[id] || undefined }
        )
      });
      setNotice("Withdrawal updated.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update withdrawal");
    }
  }

  async function updateKyc(id: string, status: "VERIFIED" | "REJECTED" | "PENDING") {
    if (!window.confirm(`Set KYC status to ${status}?`)) return;
    setNotice("");
    setError("");
    try {
      const headers = { Authorization: `Bearer ${session!.accessToken}` };
      await apiRequest(`/admin/kyc/${id}/decision`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status, reason: decisionReasons[id] || undefined })
      });
      setNotice("KYC updated.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update KYC");
    }
  }

  async function respondTicket(id: string, status = "ANSWERED") {
    if (!window.confirm("Send this support response?")) return;
    setNotice("");
    setError("");
    try {
      const headers = { Authorization: `Bearer ${session!.accessToken}` };
      await apiRequest(`/admin/support/tickets/${id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status, adminResponse: responses[id] || "Operations has reviewed your ticket." })
      });
      setNotice("Support ticket updated.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update support ticket");
    }
  }

  async function runAccruals() {
    if (!window.confirm("Run accrual processing now?")) return;
    setNotice("");
    setError("");
    try {
      const headers = { Authorization: `Bearer ${session!.accessToken}` };
      const result = await apiRequest<{ result: { processed: number; created: number; completed: number } }>("/admin/run-accruals", { method: "POST", headers });
      setNotice(`Accruals processed: ${result.result.processed}, completed: ${result.result.completed}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to run accruals");
    }
  }

  if (isLoading) {
    return (
      <>
        <Nav />
        <main className="mx-auto max-w-3xl px-5 py-16">
          <Card className="text-slate-300">Loading admin console...</Card>
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
            <h1 className="text-xl font-semibold text-white">Page not found</h1>
            <p className="mt-2 text-sm text-slate-300">The requested page is unavailable.</p>
          </Card>
        </main>
      </>
    );
  }

  if (!canViewAdmin) {
    return (
      <>
        <Nav />
        <main className="mx-auto max-w-3xl px-5 py-16">
          <Card>
            <h1 className="text-xl font-semibold text-white">Page not found</h1>
            <p className="mt-2 text-sm text-slate-300">The requested page is unavailable.</p>
            <button className="focus-ring mt-5 rounded-md border border-white/20 px-4 py-3 font-semibold text-white" onClick={signOut}>
              Sign out
            </button>
          </Card>
        </main>
      </>
    );
  }

  const stats = [
    ["Total users", overview?.users ?? 0],
    ["KYC pending", overview?.pendingKyc ?? 0],
    ["Pending deposits", overview?.pendingDeposits ?? 0],
    ["Pending withdrawals", overview?.pendingWithdrawals ?? 0],
    ["Active investments", overview?.activeInvestments ?? 0],
    ["Open tickets", overview?.openTickets ?? 0]
  ];

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-7xl px-5 py-8">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-mint">Operations workspace</p>
      <h1 className="mt-2 text-4xl font-semibold text-white">Admin Console</h1>
      <p className="mt-2 max-w-3xl text-slate-300">Operations view for users, KYC, deposits, withdrawals, plans, support, and audit trails.</p>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-slate-300">
          Signed in as <span className="font-semibold text-white">{session.user.email}</span>
        </p>
        <button className="focus-ring rounded-md border border-white/20 px-4 py-3 font-semibold text-white" onClick={signOut}>
          Sign out
        </button>
      </div>
      {notice ? <p className="mt-4 rounded-md bg-mint/10 p-3 text-sm text-mint">{notice}</p> : null}
      {error ? <p className="mt-4 rounded-md bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}
      <div className="mt-4 grid gap-4 md:grid-cols-6">
        {stats.map(([label, value]) => (
          <Card key={label}>
            <p className="text-sm text-slate-400">{label}</p>
            <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
          </Card>
        ))}
      </div>
      <Card className="mt-4 overflow-x-auto">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-white">Users</h2>
          <p className="text-sm text-slate-400">{users.length} recent accounts</p>
        </div>
        <table className="mt-4 w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-slate-500">
            <tr><th className="py-3">Name</th><th>Email</th><th>Role</th><th>Balance</th><th>Joined</th></tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="py-4 pr-4 text-white">{adminDisplayName(user)}</td>
                <td className="py-4 pr-4 text-slate-300">{user.email}</td>
                <td className="py-4 pr-4 text-slate-300">{user.role}</td>
                <td className="py-4 pr-4 text-slate-300">{money(user.balance.availableUsd)}</td>
                <td className="py-4 text-slate-400">{new Date(user.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <div className="mt-4 grid gap-4 xl:grid-cols-[360px_1fr]">
        <Card>
          <h2 className="text-xl font-semibold text-white">Investment plans</h2>
          <form className="mt-4 grid gap-3" onSubmit={savePlan}>
            <input className="focus-ring rounded-md border border-white/10 bg-white/10 px-3 py-2.5 text-white" onChange={(event) => setPlanName(event.target.value)} placeholder="Plan name" required value={planName} />
            <div className="grid grid-cols-2 gap-3">
              <input className="focus-ring rounded-md border border-white/10 bg-white/10 px-3 py-2.5 text-white" onChange={(event) => setPlanMin(event.target.value)} placeholder="Minimum" type="number" value={planMin} />
              <input className="focus-ring rounded-md border border-white/10 bg-white/10 px-3 py-2.5 text-white" onChange={(event) => setPlanMax(event.target.value)} placeholder="Maximum" type="number" value={planMax} />
            </div>
            <input className="focus-ring rounded-md border border-white/10 bg-white/10 px-3 py-2.5 text-white" onChange={(event) => setPlanDuration(event.target.value)} placeholder="Duration days" type="number" value={planDuration} />
            <div className="grid grid-cols-2 gap-3">
              <input className="focus-ring rounded-md border border-white/10 bg-white/10 px-3 py-2.5 text-white" onChange={(event) => setPlanReturnMin(event.target.value)} placeholder="Return min e.g. 0.05" type="number" value={planReturnMin} />
              <input className="focus-ring rounded-md border border-white/10 bg-white/10 px-3 py-2.5 text-white" onChange={(event) => setPlanReturnMax(event.target.value)} placeholder="Return max e.g. 0.08" type="number" value={planReturnMax} />
            </div>
            <input className="focus-ring rounded-md border border-white/10 bg-white/10 px-3 py-2.5 text-white" onChange={(event) => setPlanRisk(event.target.value)} placeholder="Risk level" value={planRisk} />
            <textarea className="focus-ring min-h-24 rounded-md border border-white/10 bg-white/10 px-3 py-2.5 text-white" onChange={(event) => setPlanRiskNote(event.target.value)} placeholder="Risk note" value={planRiskNote} />
            <input className="focus-ring rounded-md border border-white/10 bg-white/10 px-3 py-2.5 text-white" onChange={(event) => setPlanAssets(event.target.value)} placeholder="Assets, comma separated" value={planAssets} />
            <button className="focus-ring rounded-md bg-mint px-4 py-3 text-sm font-semibold text-ink">Create plan</button>
          </form>
        </Card>
        <Card className="overflow-x-auto">
          <h2 className="text-xl font-semibold text-white">Plan controls</h2>
          <table className="mt-4 w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-slate-500">
              <tr><th className="py-3">Plan</th><th>Limits</th><th>Duration</th><th>Return range</th><th>Status</th><th>Action</th></tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {plans.map((plan) => (
                <tr key={plan.id}>
                  <td className="py-4 pr-4 text-white">{plan.name}<p className="mt-1 text-xs text-slate-500">{plan.riskNote}</p></td>
                  <td className="py-4 pr-4 text-slate-300">{money(plan.minDepositUsd)} - {money(plan.maxDepositUsd)}</td>
                  <td className="py-4 pr-4 text-slate-300">{plan.durationDays} days</td>
                  <td className="py-4 pr-4 text-slate-300">{(Number(plan.estimatedYieldMin) * 100).toFixed(1)}%-{(Number(plan.estimatedYieldMax) * 100).toFixed(1)}%</td>
                  <td className="py-4 pr-4"><StatusBadge status={plan.isActive ? "ACTIVE" : "INACTIVE"} /></td>
                  <td className="py-4"><button className="focus-ring rounded-md border border-white/20 px-3 py-2 text-white" onClick={() => updatePlan(plan, { isActive: !plan.isActive })}>{plan.isActive ? "Disable" : "Enable"}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[360px_1fr]">
        <Card>
          <h2 className="text-xl font-semibold text-white">Company wallets</h2>
          <form className="mt-4 grid gap-3" onSubmit={saveWallet}>
            <label className="grid gap-2 text-sm text-slate-300">
              Coin / network
              <select
                className="focus-ring rounded-md border border-white/10 bg-ink px-3 py-2.5 text-white"
                onChange={(event) => applyWalletPreset(event.target.value)}
                value={`${walletAsset}:${walletNetwork}`}
              >
                <option value="USDT:TRC20">USDT TRC20</option>
                <option value="USDT:ERC20">USDT ERC20</option>
                <option value="BTC:Bitcoin">BTC</option>
                <option value="ETH:Ethereum">ETH</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm text-slate-300">
              Label
              <input className="focus-ring rounded-md border border-white/10 bg-white/10 px-3 py-2.5 text-white" onChange={(event) => setWalletLabel(event.target.value)} value={walletLabel} />
            </label>
            <label className="grid gap-2 text-sm text-slate-300">
              Public wallet address
              <input className="focus-ring rounded-md border border-white/10 bg-white/10 px-3 py-2.5 text-white" onChange={(event) => setWalletAddress(event.target.value)} required value={walletAddress} />
            </label>
            <label className="grid gap-2 text-sm text-slate-300">
              Payment instructions
              <textarea className="focus-ring min-h-28 rounded-md border border-white/10 bg-white/10 px-3 py-2.5 text-white" onChange={(event) => setWalletInstructions(event.target.value)} required value={walletInstructions} />
            </label>
            <button className="focus-ring rounded-md bg-mint px-4 py-3 text-sm font-semibold text-ink">Save wallet</button>
          </form>
        </Card>
        <Card className="overflow-x-auto">
          <h2 className="text-xl font-semibold text-white">Configured wallets</h2>
          <table className="mt-4 w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-slate-500">
              <tr>
                <th className="py-3">Label</th>
                <th className="py-3">Address</th>
                <th className="py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {wallets.length ? wallets.map((wallet) => (
                <tr key={wallet.id}>
                  <td className="py-4 pr-4 text-white">{wallet.label}</td>
                  <td className="break-all py-4 pr-4 text-slate-300">{wallet.address}</td>
                  <td className="py-4 text-slate-300">{wallet.isActive ? "Active" : "Inactive"}</td>
                </tr>
              )) : (
                <tr><td className="py-4 text-slate-300" colSpan={3}>No company wallets configured.</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>
      <Card className="mt-4 overflow-x-auto">
        <h2 className="text-xl font-semibold text-white">Manual deposit approvals</h2>
        <table className="mt-4 w-full min-w-[980px] text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-slate-500">
            <tr>
              <th className="py-3">User</th>
              <th className="py-3">Coin</th>
              <th className="py-3">Amount</th>
              <th className="py-3">Tx hash</th>
              <th className="py-3">Status</th>
              <th className="py-3">Decision</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {deposits.length ? deposits.map((deposit) => (
              <tr key={deposit.id}>
                <td className="py-4 pr-4 text-white">{deposit.user.email}</td>
                <td className="py-4 pr-4 text-slate-300">{deposit.assetSymbol} {deposit.network}</td>
                <td className="py-4 pr-4 text-slate-300">{deposit.amountUsd ? `$${Number(deposit.amountUsd).toLocaleString()}` : "-"}</td>
                <td className="max-w-[220px] truncate py-4 pr-4 text-slate-300">{deposit.txHash || "-"}</td>
                <td className="py-4 pr-4 text-slate-300">{deposit.status}</td>
                <td className="py-4">
                  {deposit.status === "PENDING" ? (
                    <div className="grid min-w-[280px] gap-2">
                      <input
                        className="focus-ring rounded-md border border-white/10 bg-white/10 px-3 py-2 text-white"
                        onChange={(event) => setDecisionReasons((current) => ({ ...current, [deposit.id]: event.target.value }))}
                        placeholder="Rejection reason"
                        value={decisionReasons[deposit.id] || ""}
                      />
                      <div className="flex gap-2">
                        <button className="focus-ring rounded-md bg-mint px-3 py-2 font-semibold text-ink" onClick={() => decideDeposit(deposit.id, "CONFIRMED", deposit.txHash)} type="button">Approve</button>
                        <button className="focus-ring rounded-md border border-red-300/40 px-3 py-2 font-semibold text-red-100" onClick={() => decideDeposit(deposit.id, "REJECTED")} type="button">Reject</button>
                      </div>
                    </div>
                  ) : deposit.rejectionReason || "Reviewed"}
                </td>
              </tr>
            )) : (
              <tr><td className="py-4 text-slate-300" colSpan={6}>No deposit requests yet.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
      <Card className="mt-4 overflow-x-auto">
        <h2 className="text-xl font-semibold text-white">Withdrawal approvals</h2>
        <table className="mt-4 w-full min-w-[1080px] text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-slate-500">
            <tr><th className="py-3">User</th><th>Coin</th><th>Amount</th><th>Destination</th><th>Status</th><th>Decision</th></tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {withdrawals.map((withdrawal) => (
              <tr key={withdrawal.id}>
                <td className="py-4 pr-4 text-white">{adminDisplayName(withdrawal.user)}<p className="text-xs text-slate-500">{withdrawal.user.email}</p></td>
                <td className="py-4 pr-4 text-slate-300">{withdrawal.assetSymbol} {withdrawal.network}</td>
                <td className="py-4 pr-4 text-slate-300">{money(withdrawal.amountUsd)}</td>
                <td className="max-w-[220px] truncate py-4 pr-4 text-slate-300">{withdrawal.destination}</td>
                <td className="py-4 pr-4"><StatusBadge status={withdrawal.status} /></td>
                <td className="py-4">
                  {["PENDING", "APPROVED"].includes(withdrawal.status) ? (
                    <div className="grid min-w-[340px] gap-2">
                      <input className="focus-ring rounded-md border border-white/10 bg-white/10 px-3 py-2 text-white" onChange={(event) => setAdminNotes((current) => ({ ...current, [withdrawal.id]: event.target.value }))} placeholder="Admin note" value={adminNotes[withdrawal.id] || ""} />
                      <input className="focus-ring rounded-md border border-white/10 bg-white/10 px-3 py-2 text-white" onChange={(event) => setDecisionReasons((current) => ({ ...current, [withdrawal.id]: event.target.value }))} placeholder="Rejection reason" value={decisionReasons[withdrawal.id] || ""} />
                      <input className="focus-ring rounded-md border border-white/10 bg-white/10 px-3 py-2 text-white" onChange={(event) => setTxHashes((current) => ({ ...current, [withdrawal.id]: event.target.value }))} placeholder="Payout tx hash" value={txHashes[withdrawal.id] || ""} />
                      <div className="flex flex-wrap gap-2">
                        {withdrawal.status === "PENDING" ? <button className="focus-ring rounded-md bg-mint px-3 py-2 font-semibold text-ink" onClick={() => decideWithdrawal(withdrawal.id, "APPROVED")} type="button">Approve</button> : null}
                        <button className="focus-ring rounded-md border border-red-300/40 px-3 py-2 font-semibold text-red-100" onClick={() => decideWithdrawal(withdrawal.id, "REJECTED")} type="button">Reject</button>
                        <button className="focus-ring rounded-md border border-white/20 px-3 py-2 font-semibold text-white" onClick={() => decideWithdrawal(withdrawal.id, "PAID")} type="button">Mark paid</button>
                      </div>
                    </div>
                  ) : withdrawal.adminNote || withdrawal.rejectionReason || "Reviewed"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card className="overflow-x-auto">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-white">User investments</h2>
            <button className="focus-ring rounded-md border border-white/20 px-3 py-2 text-sm font-semibold text-white" onClick={runAccruals}>Run accruals</button>
          </div>
          <table className="mt-4 w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-slate-500">
              <tr><th className="py-3">User</th><th>Plan</th><th>Amount</th><th>Expected</th><th>Status</th><th>End date</th></tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {investments.map((investment) => (
                <tr key={investment.id}>
                  <td className="py-4 pr-4 text-white">{adminDisplayName(investment.user)}</td>
                  <td className="py-4 pr-4 text-slate-300">{investment.plan.name}</td>
                  <td className="py-4 pr-4 text-slate-300">{money(investment.principalUsd)}</td>
                  <td className="py-4 pr-4 text-slate-300">{money(investment.expectedReturnUsd)}</td>
                  <td className="py-4 pr-4"><StatusBadge status={investment.status} /></td>
                  <td className="py-4 text-slate-400">{new Date(investment.maturesAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card className="overflow-x-auto">
          <h2 className="text-xl font-semibold text-white">KYC review</h2>
          <table className="mt-4 w-full min-w-[680px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-slate-500">
              <tr><th className="py-3">User</th><th>Status</th><th>Reason</th><th>Action</th></tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {kycChecks.map((check) => (
                <tr key={check.id}>
                  <td className="py-4 pr-4 text-white">{adminDisplayName(check.user)}<p className="text-xs text-slate-500">{check.user.email}</p></td>
                  <td className="py-4 pr-4"><StatusBadge status={check.status} /></td>
                  <td className="py-4 pr-4 text-slate-300"><input className="focus-ring rounded-md border border-white/10 bg-white/10 px-3 py-2 text-white" onChange={(event) => setDecisionReasons((current) => ({ ...current, [check.id]: event.target.value }))} placeholder={check.reason || "Reason"} value={decisionReasons[check.id] || ""} /></td>
                  <td className="py-4"><div className="flex gap-2"><button className="focus-ring rounded-md bg-mint px-3 py-2 font-semibold text-ink" onClick={() => updateKyc(check.id, "VERIFIED")}>Verify</button><button className="focus-ring rounded-md border border-red-300/40 px-3 py-2 font-semibold text-red-100" onClick={() => updateKyc(check.id, "REJECTED")}>Reject</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
      <Card className="mt-4 overflow-x-auto">
        <h2 className="text-xl font-semibold text-white">Support tickets</h2>
        <table className="mt-4 w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-slate-500">
            <tr><th className="py-3">User</th><th>Subject</th><th>Priority</th><th>Status</th><th>Response</th></tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {tickets.map((ticket) => (
              <tr key={ticket.id}>
                <td className="py-4 pr-4 text-white">{adminDisplayName(ticket.user)}</td>
                <td className="py-4 pr-4 text-slate-300">{ticket.subject}<p className="mt-1 max-w-md text-xs text-slate-500">{ticket.message}</p></td>
                <td className="py-4 pr-4 text-slate-300">{ticket.priority}</td>
                <td className="py-4 pr-4"><StatusBadge status={ticket.status} /></td>
                <td className="py-4"><div className="grid min-w-[300px] gap-2"><textarea className="focus-ring min-h-20 rounded-md border border-white/10 bg-white/10 px-3 py-2 text-white" onChange={(event) => setResponses((current) => ({ ...current, [ticket.id]: event.target.value }))} placeholder={ticket.adminResponse || "Response"} value={responses[ticket.id] || ""} /><button className="focus-ring rounded-md bg-mint px-3 py-2 font-semibold text-ink" onClick={() => respondTicket(ticket.id)}>Respond</button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <div className="mt-4 grid gap-4 lg:grid-cols-[.85fr_1.15fr]">
        <Card>
          <h2 className="text-xl font-semibold text-white">Launch readiness</h2>
          <p className="mt-2 text-sm text-slate-300">
            {readiness?.summary.ready ? "Critical launch gates are configured." : `${readiness?.summary.criticalOpen ?? 0} critical gates need attention.`}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-md bg-white/[0.08] p-3">
              <p className="text-slate-400">Critical</p>
              <p className="mt-1 text-2xl font-semibold text-white">{readiness?.summary.criticalOpen ?? 0}</p>
            </div>
            <div className="rounded-md bg-white/[0.08] p-3">
              <p className="text-slate-400">Warnings</p>
              <p className="mt-1 text-2xl font-semibold text-white">{readiness?.summary.warningsOpen ?? 0}</p>
            </div>
          </div>
        </Card>
        <Card>
          <h2 className="text-xl font-semibold text-white">Provider gates</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {readiness?.checks.map((check) => (
              <div className="rounded-md border border-white/10 bg-white/[0.06] p-3" key={check.key}>
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-white">{check.label}</p>
                  <span className={check.ok ? "text-sm font-semibold text-mint" : check.severity === "critical" ? "text-sm font-semibold text-red-200" : "text-sm font-semibold text-gold"}>
                    {check.ok ? "Ready" : check.severity === "critical" ? "Critical" : "Warning"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-300">{check.detail}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
        <Card className="overflow-x-auto">
          <h2 className="text-xl font-semibold text-white">Audit log</h2>
          <table className="mt-4 w-full min-w-[680px] text-left text-sm">
            <tbody className="divide-y divide-white/10">
              {logs.length ? (
                logs.slice(0, 12).map((log) => (
                  <tr key={log.id}>
                    <td className="py-4 text-white">{log.action}</td>
                    <td className="py-4 text-slate-300">{log.entity}</td>
                    <td className="py-4 text-slate-400">{new Date(log.createdAt).toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="py-4 text-slate-300" colSpan={3}>No audit events yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
        <Card>
          <h2 className="text-xl font-semibold text-white">Operations queue</h2>
          <div className="mt-5 space-y-3 text-sm">
            {["KYC review", "Withdrawal approvals", "Support escalation", "Plan controls"].map((item) => (
              <div className="flex items-center justify-between rounded-md bg-white/[0.08] p-3" key={item}>
                <span>{item}</span>
                <span className="text-mint">Live</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
      </main>
    </>
  );
}
