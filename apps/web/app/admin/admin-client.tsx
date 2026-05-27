"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest, clearSession, readSession, type AuthSession } from "@/lib/api";
import { Card } from "@/components/card";
import { Nav } from "@/components/nav";

type Overview = {
  users: number;
  pendingWithdrawals: number;
  pendingDeposits: number;
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

export function AdminClient() {
  const [session, setSession] = useState<AuthSession | null>(() => readSession());
  const [overview, setOverview] = useState<Overview | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [wallets, setWallets] = useState<CompanyWallet[]>([]);
  const [deposits, setDeposits] = useState<AdminDeposit[]>([]);
  const [walletAsset, setWalletAsset] = useState("USDT");
  const [walletNetwork, setWalletNetwork] = useState("TRC20");
  const [walletLabel, setWalletLabel] = useState("USDT TRC20");
  const [walletAddress, setWalletAddress] = useState("");
  const [walletInstructions, setWalletInstructions] = useState("Send only the selected coin on the selected network. Submit the transaction hash after payment.");
  const [decisionReasons, setDecisionReasons] = useState<Record<string, string>>({});
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
        const [overviewResponse, auditResponse, readinessResponse, walletResponse, depositResponse] = await Promise.all([
          apiRequest<Overview>("/admin/overview", { headers }),
          apiRequest<{ logs: AuditLog[] }>("/admin/audit-logs", { headers }),
          apiRequest<Readiness>("/admin/readiness", { headers }),
          apiRequest<{ wallets: CompanyWallet[] }>("/admin/company-wallets", { headers }),
          apiRequest<{ deposits: AdminDeposit[] }>("/admin/deposits", { headers })
        ]);
        setOverview(overviewResponse);
        setLogs(auditResponse.logs);
        setReadiness(readinessResponse);
        setWallets(walletResponse.wallets);
        setDeposits(depositResponse.deposits);
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
      <div className="mt-4 grid gap-4 md:grid-cols-5">
        {stats.map(([label, value]) => (
          <Card key={label}>
            <p className="text-sm text-slate-400">{label}</p>
            <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
          </Card>
        ))}
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
