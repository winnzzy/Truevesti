"use client";

import { useEffect, useMemo, useState } from "react";
import { apiRequest, clearSession, readSession, type AuthSession } from "@/lib/api";
import { Card } from "@/components/card";
import { Nav } from "@/components/nav";

type Overview = {
  users: number;
  pendingWithdrawals: number;
  pendingKyc: number;
  openTickets: number;
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
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const canViewAdmin = useMemo(() => session?.user.role === "ADMIN", [session]);

  useEffect(() => {
    async function load() {
      if (!session) {
        setIsLoading(false);
        return;
      }

      try {
        const headers = { Authorization: `Bearer ${session.accessToken}` };
        const [overviewResponse, auditResponse, readinessResponse] = await Promise.all([
          apiRequest<Overview>("/admin/overview", { headers }),
          apiRequest<{ logs: AuditLog[] }>("/admin/audit-logs", { headers }),
          apiRequest<Readiness>("/admin/readiness", { headers })
        ]);
        setOverview(overviewResponse);
        setLogs(auditResponse.logs);
        setReadiness(readinessResponse);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load admin data");
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [session]);

  function signOut() {
    clearSession();
    setSession(null);
    setOverview(null);
    setLogs([]);
    setReadiness(null);
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

  if (!canViewAdmin || error) {
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
      <div className="mt-4 grid gap-4 md:grid-cols-4">
        {stats.map(([label, value]) => (
          <Card key={label}>
            <p className="text-sm text-slate-400">{label}</p>
            <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
          </Card>
        ))}
      </div>
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
