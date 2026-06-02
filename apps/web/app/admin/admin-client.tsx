"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, clearSession, readSession, type AuthSession } from "@/lib/api";
import { Card } from "@/components/card";
import { Nav } from "@/components/nav";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { AdminSidebar, type AdminSection } from "@/components/admin-sidebar";

/* ─── Types ─── */

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
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
};

/* ─── Helpers ─── */

function money(value: string | number | null | undefined) {
  return new Intl.NumberFormat("en-US", { currency: "USD", style: "currency", maximumFractionDigits: 0 }).format(Number(value ?? 0));
}

function badgeClass(status: string) {
  if (["CONFIRMED", "APPROVED", "PAID", "VERIFIED", "ACTIVE", "COMPLETED", "ANSWERED"].includes(status)) return "border-mint/30 bg-mint/10 text-mint";
  if (["REJECTED", "FAILED", "CANCELLED", "INACTIVE"].includes(status)) return "border-red-400/30 bg-red-500/10 text-red-200";
  return "border-gold/30 bg-gold/10 text-gold";
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${badgeClass(status)}`}>{status}</span>;
}

function adminDisplayName(user: { email: string; profile?: { firstName?: string | null; lastName?: string | null } | null }) {
  return [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(" ").trim() || user.email;
}

function SectionHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function FilterBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <input
      className="focus-ring w-full max-w-xs rounded-md border border-white/10 bg-white/10 px-3 py-2 text-sm text-white placeholder-slate-500"
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      value={value}
    />
  );
}

function SelectFilter({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select
      className="focus-ring rounded-md border border-white/10 bg-ink px-3 py-2 text-sm text-white"
      onChange={(e) => onChange(e.target.value)}
      value={value}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

function EmptyRow({ colSpan, message }: { colSpan: number; message: string }) {
  return <tr><td className="py-8 text-center text-sm text-slate-400" colSpan={colSpan}>{message}</td></tr>;
}

/* ─── Main Component ─── */

export function AdminClient() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(() => readSession());
  const [activeSection, setActiveSection] = useState<AdminSection>("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Data
  const [overview, setOverview] = useState<Overview | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [wallets, setWallets] = useState<CompanyWallet[]>([]);
  const [deposits, setDeposits] = useState<AdminDeposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawal[]>([]);
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [investments, setInvestments] = useState<AdminInvestment[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [kycChecks, setKycChecks] = useState<AdminKyc[]>([]);
  const [tickets, setTickets] = useState<AdminTicket[]>([]);

  // Filters
  const [userFilter, setUserFilter] = useState("");
  const [depositFilter, setDepositFilter] = useState("PENDING");
  const [withdrawalFilter, setWithdrawalFilter] = useState("PENDING");
  const [kycFilter, setKycFilter] = useState("PENDING");
  const [ticketFilter, setTicketFilter] = useState("OPEN");
  const [planFilter, setPlanFilter] = useState("ALL");
  const [investmentFilter, setInvestmentFilter] = useState("ALL");
  const [auditFilter, setAuditFilter] = useState("");

  // Forms
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
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [showWalletForm, setShowWalletForm] = useState(false);

  // UI
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Confirmation dialog
  const [confirm, setConfirm] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant?: "default" | "danger";
    confirmLabel?: string;
    onConfirm: () => void;
  }>({ open: false, title: "", message: "", onConfirm: () => {} });

  const canViewAdmin = useMemo(() => session?.user.role === "ADMIN", [session]);

  const sidebarCounts = useMemo(() => ({
    deposits: overview?.pendingDeposits,
    withdrawals: overview?.pendingWithdrawals,
    kyc: overview?.pendingKyc,
    support: overview?.openTickets
  }), [overview]);

  const load = useCallback(async () => {
    if (!session) {
      setIsLoading(false);
      return;
    }
    try {
      const headers = { Authorization: `Bearer ${session.accessToken}` };
      const [overviewRes, auditRes, walletRes, depositRes, withdrawalRes, planRes, investmentRes, userRes, kycRes, ticketRes] = await Promise.all([
        apiRequest<Overview>("/admin/overview", { headers }),
        apiRequest<{ logs: AuditLog[] }>("/admin/audit-logs", { headers }),
        apiRequest<{ wallets: CompanyWallet[] }>("/admin/company-wallets", { headers }),
        apiRequest<{ deposits: AdminDeposit[] }>("/admin/deposits", { headers }),
        apiRequest<{ withdrawals: AdminWithdrawal[] }>("/admin/withdrawals", { headers }),
        apiRequest<{ plans: AdminPlan[] }>("/admin/plans", { headers }),
        apiRequest<{ investments: AdminInvestment[] }>("/admin/investments", { headers }),
        apiRequest<{ users: AdminUser[] }>("/admin/users", { headers }),
        apiRequest<{ checks: AdminKyc[] }>("/admin/kyc", { headers }),
        apiRequest<{ tickets: AdminTicket[] }>("/admin/support/tickets", { headers })
      ]);
      setOverview(overviewRes);
      setLogs(auditRes.logs);
      setWallets(walletRes.wallets);
      setDeposits(depositRes.deposits);
      setWithdrawals(withdrawalRes.withdrawals);
      setPlans(planRes.plans);
      setInvestments(investmentRes.investments);
      setUsers(userRes.users);
      setKycChecks(kycRes.checks);
      setTickets(ticketRes.tickets);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load admin data");
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => { void load(); }, [load]);

  // Guard: redirect non-logged-in users to login, non-ADMIN to dashboard
  useEffect(() => {
    if (!isLoading) {
      if (!session) {
        router.replace("/auth/login");
      } else if (session.user.role !== "ADMIN") {
        router.replace("/dashboard");
      }
    }
  }, [isLoading, session, router]);

  function signOut() {
    clearSession();
    setSession(null);
  }

  function doConfirm(opts: Omit<typeof confirm, "open">) {
    setConfirm({ ...opts, open: true });
  }

  /* ─── Actions ─── */

  function applyWalletPreset(value: string) {
    const [assetSymbol, network] = value.split(":");
    setWalletAsset(assetSymbol);
    setWalletNetwork(network);
    setWalletLabel(network === "Bitcoin" || network === "Ethereum" ? assetSymbol : `${assetSymbol} ${network}`);
  }

  async function saveWallet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    doConfirm({
      title: "Save Company Wallet",
      message: `Save ${walletAsset} ${walletNetwork} wallet address?`,
      onConfirm: async () => {
        setNotice(""); setError("");
        try {
          const headers = { Authorization: `Bearer ${session!.accessToken}` };
          await apiRequest("/admin/company-wallets", {
            method: "POST", headers,
            body: JSON.stringify({ assetSymbol: walletAsset, network: walletNetwork, label: walletLabel, address: walletAddress, instructions: walletInstructions, isActive: true })
          });
          setWalletAddress("");
          setNotice("Company wallet saved.");
          await load();
        } catch (err) { setError(err instanceof Error ? err.message : "Unable to save wallet"); }
      }
    });
  }

  async function savePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    doConfirm({
      title: "Create Investment Plan",
      message: `Create the "${planName}" investment plan?`,
      onConfirm: async () => {
        setNotice(""); setError("");
        try {
          const headers = { Authorization: `Bearer ${session!.accessToken}` };
          await apiRequest("/admin/plans", {
            method: "POST", headers,
            body: JSON.stringify({
              name: planName, minDepositUsd: Number(planMin), maxDepositUsd: Number(planMax), durationDays: Number(planDuration),
              estimatedYieldMin: Number(planReturnMin), estimatedYieldMax: Number(planReturnMax), riskLevel: planRisk,
              riskNote: planRiskNote, assetAllocation: planAssets, supportedAssets: planAssets.split(",").map((a) => a.trim()).filter(Boolean), isActive: true
            })
          });
          setPlanName("");
          setNotice("Investment plan created.");
          await load();
        } catch (err) { setError(err instanceof Error ? err.message : "Unable to create plan"); }
      }
    });
  }

  async function togglePlan(plan: AdminPlan) {
    doConfirm({
      title: `${plan.isActive ? "Disable" : "Enable"} Plan`,
      message: `${plan.isActive ? "Disable" : "Enable"} the "${plan.name}" investment plan?`,
      variant: plan.isActive ? "danger" : "default",
      confirmLabel: plan.isActive ? "Disable" : "Enable",
      onConfirm: async () => {
        setNotice(""); setError("");
        try {
          const headers = { Authorization: `Bearer ${session!.accessToken}` };
          await apiRequest(`/admin/plans/${plan.id}`, { method: "PATCH", headers, body: JSON.stringify({ isActive: !plan.isActive }) });
          setNotice(`Plan ${plan.isActive ? "disabled" : "enabled"}.`);
          await load();
        } catch (err) { setError(err instanceof Error ? err.message : "Unable to update plan"); }
      }
    });
  }

  async function decideDeposit(id: string, status: "CONFIRMED" | "REJECTED") {
    doConfirm({
      title: status === "CONFIRMED" ? "Approve Deposit" : "Reject Deposit",
      message: status === "CONFIRMED" ? "Approve this deposit? The amount will be credited to the user's account." : "Reject this deposit? The user will be notified.",
      variant: status === "REJECTED" ? "danger" : "default",
      confirmLabel: status === "CONFIRMED" ? "Approve" : "Reject",
      onConfirm: async () => {
        setNotice(""); setError("");
        try {
          const headers = { Authorization: `Bearer ${session!.accessToken}` };
          await apiRequest(`/admin/deposits/${id}/decision`, {
            method: "PATCH", headers,
            body: JSON.stringify(status === "CONFIRMED" ? { status } : { status, reason: decisionReasons[id] || "Deposit proof could not be verified" })
          });
          setNotice(status === "CONFIRMED" ? "Deposit approved." : "Deposit rejected.");
          await load();
        } catch (err) { setError(err instanceof Error ? err.message : "Unable to update deposit"); }
      }
    });
  }

  async function decideWithdrawal(id: string, status: "APPROVED" | "REJECTED" | "PAID") {
    const labels = { APPROVED: "Approve Withdrawal", REJECTED: "Reject Withdrawal", PAID: "Mark as Paid" };
    const messages = {
      APPROVED: "Approve this withdrawal? It will be queued for manual payout.",
      REJECTED: "Reject this withdrawal? The user will be notified.",
      PAID: "Mark this withdrawal as paid? Ensure the transaction hash is correct."
    };
    doConfirm({
      title: labels[status],
      message: messages[status],
      variant: status === "REJECTED" ? "danger" : "default",
      confirmLabel: status === "APPROVED" ? "Approve" : status === "REJECTED" ? "Reject" : "Mark Paid",
      onConfirm: async () => {
        setNotice(""); setError("");
        try {
          const headers = { Authorization: `Bearer ${session!.accessToken}` };
          await apiRequest(`/admin/withdrawals/${id}/decision`, {
            method: "PATCH", headers,
            body: JSON.stringify(
              status === "APPROVED" ? { status, adminNote: adminNotes[id] || undefined }
                : status === "REJECTED" ? { status, reason: decisionReasons[id] || "Withdrawal could not be approved" }
                  : { status, txHash: txHashes[id], adminNote: adminNotes[id] || undefined }
            )
          });
          setNotice("Withdrawal updated.");
          await load();
        } catch (err) { setError(err instanceof Error ? err.message : "Unable to update withdrawal"); }
      }
    });
  }

  async function updateKyc(id: string, status: "VERIFIED" | "REJECTED") {
    doConfirm({
      title: status === "VERIFIED" ? "Verify KYC" : "Reject KYC",
      message: `Set KYC status to ${status.toLowerCase()}? The user will be notified.`,
      variant: status === "REJECTED" ? "danger" : "default",
      confirmLabel: status === "VERIFIED" ? "Verify" : "Reject",
      onConfirm: async () => {
        setNotice(""); setError("");
        try {
          const headers = { Authorization: `Bearer ${session!.accessToken}` };
          await apiRequest(`/admin/kyc/${id}/decision`, {
            method: "PATCH", headers,
            body: JSON.stringify({ status, reason: decisionReasons[id] || undefined })
          });
          setNotice("KYC updated.");
          await load();
        } catch (err) { setError(err instanceof Error ? err.message : "Unable to update KYC"); }
      }
    });
  }

  async function respondTicket(id: string) {
    doConfirm({
      title: "Send Response",
      message: "Send this support response to the user?",
      onConfirm: async () => {
        setNotice(""); setError("");
        try {
          const headers = { Authorization: `Bearer ${session!.accessToken}` };
          await apiRequest(`/admin/support/tickets/${id}`, {
            method: "PATCH", headers,
            body: JSON.stringify({ status: "ANSWERED", adminResponse: responses[id] || "Operations has reviewed your ticket." })
          });
          setNotice("Support ticket responded.");
          await load();
        } catch (err) { setError(err instanceof Error ? err.message : "Unable to respond to ticket"); }
      }
    });
  }

  async function runAccruals() {
    doConfirm({
      title: "Run Accruals",
      message: "Process daily accruals for all active investments now?",
      onConfirm: async () => {
        setNotice(""); setError("");
        try {
          const headers = { Authorization: `Bearer ${session!.accessToken}` };
          const result = await apiRequest<{ result: { processed: number; created: number; completed: number } }>("/admin/run-accruals", { method: "POST", headers });
          setNotice(`Accruals processed: ${result.result.processed}, completed: ${result.result.completed}.`);
          await load();
        } catch (err) { setError(err instanceof Error ? err.message : "Unable to run accruals"); }
      }
    });
  }

  /* ─── Filtered data ─── */

  const filteredUsers = useMemo(() => {
    const q = userFilter.toLowerCase();
    return users.filter((u) => {
      if (q) {
        const name = adminDisplayName(u).toLowerCase();
        return name.includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
      }
      return true;
    });
  }, [users, userFilter]);

  const filteredDeposits = useMemo(() => {
    return deposits.filter((d) => depositFilter === "ALL" || d.status === depositFilter);
  }, [deposits, depositFilter]);

  const filteredWithdrawals = useMemo(() => {
    return withdrawals.filter((w) => withdrawalFilter === "ALL" || w.status === withdrawalFilter);
  }, [withdrawals, withdrawalFilter]);

  const filteredKyc = useMemo(() => {
    return kycChecks.filter((k) => kycFilter === "ALL" || k.status === kycFilter);
  }, [kycChecks, kycFilter]);

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => ticketFilter === "ALL" || t.status === ticketFilter);
  }, [tickets, ticketFilter]);

  const filteredPlans = useMemo(() => {
    return plans.filter((p) => planFilter === "ALL" || (planFilter === "ACTIVE" ? p.isActive : !p.isActive));
  }, [plans, planFilter]);

  const filteredInvestments = useMemo(() => {
    return investments.filter((i) => investmentFilter === "ALL" || i.status === investmentFilter);
  }, [investments, investmentFilter]);

  const filteredLogs = useMemo(() => {
    const q = auditFilter.toLowerCase();
    return logs.filter((l) => !q || l.action.toLowerCase().includes(q) || l.entity.toLowerCase().includes(q));
  }, [logs, auditFilter]);

  /* ─── Inline state that was incorrectly placed after early returns ─── */

  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);

  async function deletePlan(planId: string) {
    setNotice("");
    setError("");
    try {
      await apiRequest(`/admin/plans/${planId}`, { method: "DELETE" });
      setPlans((prev) => prev.filter((p) => p.id !== planId));
      setNotice("Investment plan deleted successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete plan");
    } finally {
      setDeletingPlanId(null);
    }
  }

  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<{ id: string; email: string } | null>(null);

  async function deleteUser(userId: string) {
    setNotice("");
    setError("");
    try {
      await apiRequest(`/admin/users/${userId}`, { method: "DELETE" });
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setNotice("User deleted successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
    } finally {
      setDeletingUserId(null);
      setConfirmDeleteUser(null);
    }
  }

  /* ─── Loading / Auth gates ─── */

  if (isLoading) {
    return (
      <>
        <Nav />
        <main className="flex min-h-[60vh] items-center justify-center">
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
            <h1 className="text-xl font-semibold text-white">Access Denied</h1>
            <p className="mt-2 text-sm text-slate-300">You do not have permission to access the admin console.</p>
            <button className="focus-ring mt-5 rounded-md border border-white/20 px-4 py-3 font-semibold text-white" onClick={signOut}>Sign out</button>
          </Card>
        </main>
      </>
    );
  }

  /* ─── Section Renderers ─── */

  function renderOverview() {
    const stats = [
      { label: "Total Users", value: overview?.users ?? 0, icon: "👥" },
      { label: "Pending Deposits", value: overview?.pendingDeposits ?? 0, icon: "💰" },
      { label: "Pending Withdrawals", value: overview?.pendingWithdrawals ?? 0, icon: "💸" },
      { label: "Active Investments", value: overview?.activeInvestments ?? 0, icon: "📈" },
      { label: "KYC Pending", value: overview?.pendingKyc ?? 0, icon: "🪪" },
      { label: "Open Tickets", value: overview?.openTickets ?? 0, icon: "🎧" }
    ];
    return (
      <div className="space-y-6">
        <SectionHeader title="Dashboard Overview" subtitle="Real-time summary of platform activity" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((s) => (
            <Card key={s.label}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">{s.label}</p>
                  <p className="mt-1 text-3xl font-semibold text-white">{s.value}</p>
                </div>
                <span className="text-3xl">{s.icon}</span>
              </div>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <SectionHeader title="Quick Actions">
              <button className="focus-ring rounded-md border border-white/20 px-3 py-2 text-sm font-semibold text-white" onClick={runAccruals}>Run Accruals</button>
            </SectionHeader>
            <div className="mt-4 space-y-2 text-sm">
              {[
                { label: "Review pending deposits", count: overview?.pendingDeposits, section: "deposits" as AdminSection },
                { label: "Review pending withdrawals", count: overview?.pendingWithdrawals, section: "withdrawals" as AdminSection },
                { label: "Review KYC submissions", count: overview?.pendingKyc, section: "kyc" as AdminSection },
                { label: "Respond to support tickets", count: overview?.openTickets, section: "support" as AdminSection }
              ].map((item) => (
                <button
                  key={item.section}
                  className="flex w-full items-center justify-between rounded-md bg-white/[0.06] px-4 py-3 text-left text-slate-300 hover:bg-white/[0.1]"
                  onClick={() => setActiveSection(item.section)}
                >
                  <span>{item.label}</span>
                  {item.count != null && item.count > 0 && <span className="rounded-full bg-gold/20 px-2.5 py-0.5 text-xs font-semibold text-gold">{item.count}</span>}
                </button>
              ))}
            </div>
          </Card>
          <Card className="overflow-x-auto">
            <SectionHeader title="Recent Audit Events" />
            <table className="mt-4 w-full text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-slate-500">
                <tr><th className="py-3">Action</th><th>Entity</th><th>Time</th></tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {logs.length ? logs.slice(0, 8).map((log) => (
                  <tr key={log.id}>
                    <td className="py-3 pr-4 text-white">{log.action}</td>
                    <td className="py-3 pr-4 text-slate-300">{log.entity}</td>
                    <td className="py-3 text-slate-400">{new Date(log.createdAt).toLocaleString()}</td>
                  </tr>
                )) : <EmptyRow colSpan={3} message="No audit events yet." />}
              </tbody>
            </table>
          </Card>
        </div>
      </div>
    );
  }

  function renderUsers() {
    return (
      <div className="space-y-6">
        {confirmDeleteUser && (
          <ConfirmDialog
            open
            title={`Delete ${confirmDeleteUser.email}?`}
            message="This will permanently delete the user and all associated data including deposits, withdrawals, investments, and support tickets. This action cannot be undone."
            confirmLabel="Delete User"
            cancelLabel="Cancel"
            onConfirm={() => {
              setDeletingUserId(confirmDeleteUser.id);
              deleteUser(confirmDeleteUser.id);
            }}
            onCancel={() => setConfirmDeleteUser(null)}
          />
        )}
        <SectionHeader title="Manage Users" subtitle={`${filteredUsers.length} accounts`}>
          <FilterBar value={userFilter} onChange={setUserFilter} placeholder="Search by name, email, or role..." />
        </SectionHeader>
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-slate-500">
              <tr><th className="py-3">Name</th><th>Email</th><th>Role</th><th>Verified</th><th>Balance</th><th>Joined</th><th>Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredUsers.length ? filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td className="py-4 pr-4 text-white">{adminDisplayName(user)}</td>
                  <td className="py-4 pr-4 text-slate-300">{user.email}</td>
                  <td className="py-4 pr-4"><StatusBadge status={user.role} /></td>
                  <td className="py-4 pr-4">{user.emailVerifiedAt ? <StatusBadge status="VERIFIED" /> : <StatusBadge status="PENDING" />}</td>
                  <td className="py-4 pr-4 text-slate-300">{money(user.balance.availableUsd)}</td>
                  <td className="py-4 pr-4 text-slate-400">{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td className="py-4">
                    {user.role !== "ADMIN" ? (
                      <button
                        className="focus-ring rounded-md border border-red-300/40 px-3 py-2 text-xs font-semibold text-red-100 transition hover:bg-red-500/20 disabled:opacity-50"
                        disabled={deletingUserId === user.id}
                        onClick={() => setConfirmDeleteUser({ id: user.id, email: user.email })}
                      >
                        {deletingUserId === user.id ? "Deleting…" : "Delete"}
                      </button>
                    ) : <span className="text-xs text-slate-500">—</span>}
                  </td>
                </tr>
              )) : <EmptyRow colSpan={7} message="No users match your search." />}
            </tbody>
          </table>
        </Card>
      </div>
    );
  }

  function renderDeposits() {
    return (
      <div className="space-y-6">
        <SectionHeader title="Deposit Approvals" subtitle={`${filteredDeposits.length} deposits`}>
          <SelectFilter value={depositFilter} onChange={setDepositFilter} options={[
            { value: "PENDING", label: "Pending" }, { value: "CONFIRMED", label: "Approved" },
            { value: "REJECTED", label: "Rejected" }, { value: "ALL", label: "All" }
          ]} />
        </SectionHeader>
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-slate-500">
              <tr><th className="py-3">User</th><th>Coin</th><th>Amount</th><th>Tx Hash</th><th>Status</th><th>Date</th><th>Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredDeposits.length ? filteredDeposits.map((d) => (
                <tr key={d.id}>
                  <td className="py-4 pr-4 text-white">{d.user.email}</td>
                  <td className="py-4 pr-4 text-slate-300">{d.assetSymbol} {d.network}</td>
                  <td className="py-4 pr-4 text-slate-300">{d.amountUsd ? `$${Number(d.amountUsd).toLocaleString()}` : "-"}</td>
                  <td className="max-w-[180px] truncate py-4 pr-4 font-mono text-xs text-slate-400">{d.txHash || "-"}</td>
                  <td className="py-4 pr-4"><StatusBadge status={d.status} /></td>
                  <td className="py-4 pr-4 text-slate-400">{new Date(d.createdAt).toLocaleDateString()}</td>
                  <td className="py-4">
                    {d.status === "PENDING" ? (
                      <div className="flex gap-2">
                        <button className="focus-ring rounded-md bg-mint px-3 py-2 text-xs font-semibold text-ink" onClick={() => decideDeposit(d.id, "CONFIRMED")}>Approve</button>
                        <button className="focus-ring rounded-md border border-red-300/40 px-3 py-2 text-xs font-semibold text-red-100" onClick={() => decideDeposit(d.id, "REJECTED")}>Reject</button>
                      </div>
                    ) : <span className="text-xs text-slate-500">{d.rejectionReason || "Reviewed"}</span>}
                  </td>
                </tr>
              )) : <EmptyRow colSpan={7} message="No deposits match this filter." />}
            </tbody>
          </table>
        </Card>
      </div>
    );
  }

  function renderWithdrawals() {
    return (
      <div className="space-y-6">
        <SectionHeader title="Withdrawal Approvals" subtitle={`${filteredWithdrawals.length} withdrawals`}>
          <SelectFilter value={withdrawalFilter} onChange={setWithdrawalFilter} options={[
            { value: "PENDING", label: "Pending" }, { value: "APPROVED", label: "Approved" },
            { value: "PAID", label: "Paid" }, { value: "REJECTED", label: "Rejected" }, { value: "ALL", label: "All" }
          ]} />
        </SectionHeader>
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-slate-500">
              <tr><th className="py-3">User</th><th>Coin</th><th>Amount</th><th>Destination</th><th>Status</th><th>Date</th><th>Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredWithdrawals.length ? filteredWithdrawals.map((w) => (
                <tr key={w.id}>
                  <td className="py-4 pr-4 text-white">{adminDisplayName(w.user)}<p className="text-xs text-slate-500">{w.user.email}</p></td>
                  <td className="py-4 pr-4 text-slate-300">{w.assetSymbol} {w.network}</td>
                  <td className="py-4 pr-4 text-slate-300">{money(w.amountUsd)}</td>
                  <td className="max-w-[180px] truncate py-4 pr-4 font-mono text-xs text-slate-400">{w.destination}</td>
                  <td className="py-4 pr-4"><StatusBadge status={w.status} /></td>
                  <td className="py-4 pr-4 text-slate-400">{new Date(w.createdAt).toLocaleDateString()}</td>
                  <td className="py-4">
                    {w.status === "PENDING" ? (
                      <div className="grid min-w-[280px] gap-2">
                        <input className="focus-ring rounded-md border border-white/10 bg-white/10 px-2 py-1.5 text-xs text-white" onChange={(e) => setAdminNotes((c) => ({ ...c, [w.id]: e.target.value }))} placeholder="Admin note" value={adminNotes[w.id] || ""} />
                        <input className="focus-ring rounded-md border border-white/10 bg-white/10 px-2 py-1.5 text-xs text-white" onChange={(e) => setTxHashes((c) => ({ ...c, [w.id]: e.target.value }))} placeholder="Payout tx hash" value={txHashes[w.id] || ""} />
                        <div className="flex gap-2">
                          <button className="focus-ring rounded-md bg-mint px-2.5 py-1.5 text-xs font-semibold text-ink" onClick={() => decideWithdrawal(w.id, "APPROVED")}>Approve</button>
                          <button className="focus-ring rounded-md border border-red-300/40 px-2.5 py-1.5 text-xs font-semibold text-red-100" onClick={() => decideWithdrawal(w.id, "REJECTED")}>Reject</button>
                        </div>
                      </div>
                    ) : w.status === "APPROVED" ? (
                      <div className="grid min-w-[280px] gap-2">
                        <input className="focus-ring rounded-md border border-white/10 bg-white/10 px-2 py-1.5 text-xs text-white" onChange={(e) => setTxHashes((c) => ({ ...c, [w.id]: e.target.value }))} placeholder="Payout tx hash" value={txHashes[w.id] || ""} />
                        <div className="flex gap-2">
                          <button className="focus-ring rounded-md bg-mint px-2.5 py-1.5 text-xs font-semibold text-ink" onClick={() => decideWithdrawal(w.id, "PAID")}>Mark Paid</button>
                          <button className="focus-ring rounded-md border border-red-300/40 px-2.5 py-1.5 text-xs font-semibold text-red-100" onClick={() => decideWithdrawal(w.id, "REJECTED")}>Reject</button>
                        </div>
                      </div>
                    ) : <span className="text-xs text-slate-500">{w.adminNote || w.rejectionReason || "Reviewed"}</span>}
                  </td>
                </tr>
              )) : <EmptyRow colSpan={7} message="No withdrawals match this filter." />}
            </tbody>
          </table>
        </Card>
      </div>
    );
  }

  function renderPlans() {
    return (
      <div className="space-y-6">
        <SectionHeader title="Investment Plans" subtitle={`${filteredPlans.length} plans`}>
          <div className="flex gap-3">
            <SelectFilter value={planFilter} onChange={setPlanFilter} options={[
              { value: "ALL", label: "All" }, { value: "ACTIVE", label: "Active" }, { value: "INACTIVE", label: "Inactive" }
            ]} />
            <button className="focus-ring rounded-md bg-mint px-4 py-2 text-sm font-semibold text-ink" onClick={() => setShowPlanForm(!showPlanForm)}>
              {showPlanForm ? "Cancel" : "+ New Plan"}
            </button>
          </div>
        </SectionHeader>
        {showPlanForm && (
          <Card>
            <h3 className="text-lg font-semibold text-white">Create New Plan</h3>
            <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={savePlan}>
              <input className="focus-ring rounded-md border border-white/10 bg-white/10 px-3 py-2.5 text-white" onChange={(e) => setPlanName(e.target.value)} placeholder="Plan name" required value={planName} />
              <input className="focus-ring rounded-md border border-white/10 bg-white/10 px-3 py-2.5 text-white" onChange={(e) => setPlanRisk(e.target.value)} placeholder="Risk level" value={planRisk} />
              <input className="focus-ring rounded-md border border-white/10 bg-white/10 px-3 py-2.5 text-white" onChange={(e) => setPlanMin(e.target.value)} placeholder="Min deposit (USD)" type="number" value={planMin} />
              <input className="focus-ring rounded-md border border-white/10 bg-white/10 px-3 py-2.5 text-white" onChange={(e) => setPlanMax(e.target.value)} placeholder="Max deposit (USD)" type="number" value={planMax} />
              <input className="focus-ring rounded-md border border-white/10 bg-white/10 px-3 py-2.5 text-white" onChange={(e) => setPlanDuration(e.target.value)} placeholder="Duration (days)" type="number" value={planDuration} />
              <input className="focus-ring rounded-md border border-white/10 bg-white/10 px-3 py-2.5 text-white" onChange={(e) => setPlanAssets(e.target.value)} placeholder="Assets (comma separated)" value={planAssets} />
              <input className="focus-ring rounded-md border border-white/10 bg-white/10 px-3 py-2.5 text-white" onChange={(e) => setPlanReturnMin(e.target.value)} placeholder="Return min (e.g. 0.05)" type="number" value={planReturnMin} />
              <input className="focus-ring rounded-md border border-white/10 bg-white/10 px-3 py-2.5 text-white" onChange={(e) => setPlanReturnMax(e.target.value)} placeholder="Return max (e.g. 0.08)" type="number" value={planReturnMax} />
              <textarea className="focus-ring min-h-20 rounded-md border border-white/10 bg-white/10 px-3 py-2.5 text-white sm:col-span-2" onChange={(e) => setPlanRiskNote(e.target.value)} placeholder="Risk note" value={planRiskNote} />
              <div className="sm:col-span-2">
                <button className="focus-ring rounded-md bg-mint px-6 py-3 text-sm font-semibold text-ink">Create Plan</button>
              </div>
            </form>
          </Card>
        )}
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-slate-500">
              <tr><th className="py-3">Plan</th><th>Limits</th><th>Duration</th><th>Return</th><th>Risk</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredPlans.length ? filteredPlans.map((p) => (
                <tr key={p.id}>
                  <td className="py-4 pr-4 text-white">{p.name}<p className="mt-0.5 text-xs text-slate-500">{p.supportedAssets.join(", ")}</p></td>
                  <td className="py-4 pr-4 text-slate-300">{money(p.minDepositUsd)} - {money(p.maxDepositUsd)}</td>
                  <td className="py-4 pr-4 text-slate-300">{p.durationDays}d</td>
                  <td className="py-4 pr-4 text-slate-300">{(Number(p.estimatedYieldMin) * 100).toFixed(1)}% - {(Number(p.estimatedYieldMax) * 100).toFixed(1)}%</td>
                  <td className="py-4 pr-4 text-slate-300">{p.riskLevel}</td>
                  <td className="py-4 pr-4"><StatusBadge status={p.isActive ? "ACTIVE" : "INACTIVE"} /></td>
                  <td className="py-4">
                    <div className="flex gap-2">
                      <button className="focus-ring rounded-md border border-white/20 px-3 py-2 text-xs text-white" onClick={() => togglePlan(p)}>{p.isActive ? "Disable" : "Enable"}</button>
                      <button
                        className="focus-ring rounded-md border border-red-300/40 px-3 py-2 text-xs font-semibold text-red-100 transition hover:bg-red-500/20"
                        onClick={() => setDeletingPlanId(p.id)}
                        disabled={deletingPlanId === p.id}
                      >
                        {deletingPlanId === p.id ? "Deleting…" : "🗑 Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              )) : <EmptyRow colSpan={7} message="No plans match this filter." />}
            </tbody>
          </table>
        </Card>
        {deletingPlanId && (
          <div
            className="fixed inset-0 flex items-center justify-center bg-black/50"
            style={{ zIndex: 100 }}
            onClick={() => setDeletingPlanId(null)}
          >
            <div className="bg-card rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold mb-2 text-red-400">Delete Investment Plan?</h3>
              <p className="text-sm text-muted-foreground mb-1">This action cannot be undone.</p>
              <p className="text-sm text-muted-foreground mb-6">The selected investment plan will be permanently removed.</p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setDeletingPlanId(null)} className="px-4 py-2 rounded-md border border-border hover:bg-muted text-sm">Cancel</button>
                <button onClick={() => deletePlan(deletingPlanId)} className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white text-sm">Delete Plan</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderInvestments() {
    return (
      <div className="space-y-6">
        <SectionHeader title="User Investments" subtitle={`${filteredInvestments.length} investments`}>
          <div className="flex gap-3">
            <SelectFilter value={investmentFilter} onChange={setInvestmentFilter} options={[
              { value: "ALL", label: "All" }, { value: "ACTIVE", label: "Active" },
              { value: "COMPLETED", label: "Completed" }, { value: "CANCELLED", label: "Cancelled" }
            ]} />
            <button className="focus-ring rounded-md border border-white/20 px-3 py-2 text-sm font-semibold text-white" onClick={runAccruals}>Run Accruals</button>
          </div>
        </SectionHeader>
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-slate-500">
              <tr><th className="py-3">User</th><th>Plan</th><th>Principal</th><th>Expected</th><th>Status</th><th>Started</th><th>Matures</th></tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredInvestments.length ? filteredInvestments.map((inv) => (
                <tr key={inv.id}>
                  <td className="py-4 pr-4 text-white">{adminDisplayName(inv.user)}</td>
                  <td className="py-4 pr-4 text-slate-300">{inv.plan.name}</td>
                  <td className="py-4 pr-4 text-slate-300">{money(inv.principalUsd)}</td>
                  <td className="py-4 pr-4 text-slate-300">{money(inv.expectedReturnUsd)}</td>
                  <td className="py-4 pr-4"><StatusBadge status={inv.status} /></td>
                  <td className="py-4 pr-4 text-slate-400">{new Date(inv.startedAt).toLocaleDateString()}</td>
                  <td className="py-4 text-slate-400">{new Date(inv.maturesAt).toLocaleDateString()}</td>
                </tr>
              )) : <EmptyRow colSpan={7} message="No investments match this filter." />}
            </tbody>
          </table>
        </Card>
      </div>
    );
  }

  function renderKyc() {
    return (
      <div className="space-y-6">
        <SectionHeader title="KYC Review" subtitle={`${filteredKyc.length} submissions`}>
          <SelectFilter value={kycFilter} onChange={setKycFilter} options={[
            { value: "PENDING", label: "Pending" }, { value: "VERIFIED", label: "Verified" },
            { value: "REJECTED", label: "Rejected" }, { value: "ALL", label: "All" }
          ]} />
        </SectionHeader>
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-slate-500">
              <tr><th className="py-3">User</th><th>Status</th><th>Reason</th><th>Updated</th><th>Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredKyc.length ? filteredKyc.map((k) => (
                <tr key={k.id}>
                  <td className="py-4 pr-4 text-white">{adminDisplayName(k.user)}<p className="text-xs text-slate-500">{k.user.email}</p></td>
                  <td className="py-4 pr-4"><StatusBadge status={k.status} /></td>
                  <td className="py-4 pr-4">
                    {k.status === "PENDING" ? (
                      <input className="focus-ring w-full max-w-[200px] rounded-md border border-white/10 bg-white/10 px-2 py-1.5 text-xs text-white" onChange={(e) => setDecisionReasons((c) => ({ ...c, [k.id]: e.target.value }))} placeholder={k.reason || "Reason"} value={decisionReasons[k.id] || ""} />
                    ) : <span className="text-slate-400">{k.reason || "-"}</span>}
                  </td>
                  <td className="py-4 pr-4 text-slate-400">{new Date(k.updatedAt).toLocaleDateString()}</td>
                  <td className="py-4">
                    {k.status === "PENDING" ? (
                      <div className="flex gap-2">
                        <button className="focus-ring rounded-md bg-mint px-3 py-2 text-xs font-semibold text-ink" onClick={() => updateKyc(k.id, "VERIFIED")}>Verify</button>
                        <button className="focus-ring rounded-md border border-red-300/40 px-3 py-2 text-xs font-semibold text-red-100" onClick={() => updateKyc(k.id, "REJECTED")}>Reject</button>
                      </div>
                    ) : <span className="text-xs text-slate-500">Reviewed</span>}
                  </td>
                </tr>
              )) : <EmptyRow colSpan={5} message="No KYC submissions match this filter." />}
            </tbody>
          </table>
        </Card>
      </div>
    );
  }

  function renderSupport() {
    return (
      <div className="space-y-6">
        <SectionHeader title="Support Tickets" subtitle={`${filteredTickets.length} tickets`}>
          <SelectFilter value={ticketFilter} onChange={setTicketFilter} options={[
            { value: "OPEN", label: "Open" }, { value: "ANSWERED", label: "Answered" },
            { value: "CLOSED", label: "Closed" }, { value: "ALL", label: "All" }
          ]} />
        </SectionHeader>
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-slate-500">
              <tr><th className="py-3">User</th><th>Subject</th><th>Priority</th><th>Status</th><th>Created</th><th>Response</th></tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredTickets.length ? filteredTickets.map((t) => (
                <tr key={t.id}>
                  <td className="py-4 pr-4 text-white">{adminDisplayName(t.user)}</td>
                  <td className="py-4 pr-4 text-slate-300">{t.subject}<p className="mt-1 max-w-sm text-xs text-slate-500">{t.message}</p></td>
                  <td className="py-4 pr-4"><StatusBadge status={t.priority} /></td>
                  <td className="py-4 pr-4"><StatusBadge status={t.status} /></td>
                  <td className="py-4 pr-4 text-slate-400">{new Date(t.createdAt).toLocaleDateString()}</td>
                  <td className="py-4">
                    <div className="grid min-w-[260px] gap-2">
                      <textarea
                        className="focus-ring min-h-16 rounded-md border border-white/10 bg-white/10 px-3 py-2 text-xs text-white"
                        onChange={(e) => setResponses((c) => ({ ...c, [t.id]: e.target.value }))}
                        placeholder={t.adminResponse || "Type response..."}
                        value={responses[t.id] || ""}
                        disabled={t.status === "CLOSED"}
                      />
                      {t.status !== "CLOSED" && (
                        <button className="focus-ring w-fit rounded-md bg-mint px-3 py-1.5 text-xs font-semibold text-ink" onClick={() => respondTicket(t.id)}>Respond</button>
                      )}
                    </div>
                  </td>
                </tr>
              )) : <EmptyRow colSpan={6} message="No tickets match this filter." />}
            </tbody>
          </table>
        </Card>
      </div>
    );
  }

  function renderWallets() {
    return (
      <div className="space-y-6">
        <SectionHeader title="Company Wallet Addresses" subtitle={`${wallets.length} configured`}>
          <button className="focus-ring rounded-md bg-mint px-4 py-2 text-sm font-semibold text-ink" onClick={() => setShowWalletForm(!showWalletForm)}>
            {showWalletForm ? "Cancel" : "+ Add Wallet"}
          </button>
        </SectionHeader>
        {showWalletForm && (
          <Card>
            <h3 className="text-lg font-semibold text-white">Add / Update Wallet</h3>
            <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={saveWallet}>
              <label className="grid gap-1.5 text-sm text-slate-300">
                Coin / Network
                <select className="focus-ring rounded-md border border-white/10 bg-ink px-3 py-2.5 text-white" onChange={(e) => applyWalletPreset(e.target.value)} value={`${walletAsset}:${walletNetwork}`}>
                  <option value="USDT:TRC20">USDT TRC20</option>
                  <option value="USDT:ERC20">USDT ERC20</option>
                  <option value="BTC:Bitcoin">BTC</option>
                  <option value="ETH:Ethereum">ETH</option>
                </select>
              </label>
              <label className="grid gap-1.5 text-sm text-slate-300">
                Label
                <input className="focus-ring rounded-md border border-white/10 bg-white/10 px-3 py-2.5 text-white" onChange={(e) => setWalletLabel(e.target.value)} value={walletLabel} />
              </label>
              <label className="grid gap-1.5 text-sm text-slate-300 sm:col-span-2">
                Wallet Address
                <input className="focus-ring rounded-md border border-white/10 bg-white/10 px-3 py-2.5 text-white" onChange={(e) => setWalletAddress(e.target.value)} required value={walletAddress} />
              </label>
              <label className="grid gap-1.5 text-sm text-slate-300 sm:col-span-2">
                Payment Instructions
                <textarea className="focus-ring min-h-20 rounded-md border border-white/10 bg-white/10 px-3 py-2.5 text-white" onChange={(e) => setWalletInstructions(e.target.value)} required value={walletInstructions} />
              </label>
              <div className="sm:col-span-2">
                <button className="focus-ring rounded-md bg-mint px-6 py-3 text-sm font-semibold text-ink">Save Wallet</button>
              </div>
            </form>
          </Card>
        )}
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-slate-500">
              <tr><th className="py-3">Label</th><th>Asset</th><th>Network</th><th>Address</th><th>Status</th></tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {wallets.length ? wallets.map((w) => (
                <tr key={w.id}>
                  <td className="py-4 pr-4 text-white">{w.label}</td>
                  <td className="py-4 pr-4 text-slate-300">{w.assetSymbol}</td>
                  <td className="py-4 pr-4 text-slate-300">{w.network}</td>
                  <td className="max-w-[240px] truncate py-4 pr-4 font-mono text-xs text-slate-400">{w.address}</td>
                  <td className="py-4"><StatusBadge status={w.isActive ? "ACTIVE" : "INACTIVE"} /></td>
                </tr>
              )) : <EmptyRow colSpan={5} message="No company wallets configured." />}
            </tbody>
          </table>
        </Card>
      </div>
    );
  }

  function renderAudit() {
    return (
      <div className="space-y-6">
        <SectionHeader title="Audit Logs" subtitle={`${filteredLogs.length} events`}>
          <FilterBar value={auditFilter} onChange={setAuditFilter} placeholder="Search action or entity..." />
        </SectionHeader>
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-slate-500">
              <tr><th className="py-3">Action</th><th>Entity</th><th>Entity ID</th><th>IP Address</th><th>Time</th></tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredLogs.length ? filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td className="py-3 pr-4"><StatusBadge status={log.action} /></td>
                  <td className="py-3 pr-4 text-slate-300">{log.entity}</td>
                  <td className="max-w-[160px] truncate py-3 pr-4 font-mono text-xs text-slate-400">{log.entityId || "-"}</td>
                  <td className="py-3 pr-4 font-mono text-xs text-slate-400">{log.ipAddress || "-"}</td>
                  <td className="py-3 text-slate-400">{new Date(log.createdAt).toLocaleString()}</td>
                </tr>
              )) : <EmptyRow colSpan={5} message="No audit events match your search." />}
            </tbody>
          </table>
        </Card>
      </div>
    );
  }

  /* ─── Main Render ─── */

  function renderSection() {
    switch (activeSection) {
      case "overview": return renderOverview();
      case "users": return renderUsers();
      case "deposits": return renderDeposits();
      case "withdrawals": return renderWithdrawals();
      case "plans": return renderPlans();
      case "investments": return renderInvestments();
      case "kyc": return renderKyc();
      case "support": return renderSupport();
      case "wallets": return renderWallets();
      case "audit": return renderAudit();
    }
  }

  return (
    <>
      <Nav />
      <ConfirmDialog
        open={confirm.open}
        title={confirm.title}
        message={confirm.message}
        variant={confirm.variant}
        confirmLabel={confirm.confirmLabel}
        onConfirm={() => { setConfirm((c) => ({ ...c, open: false })); confirm.onConfirm(); }}
        onCancel={() => setConfirm((c) => ({ ...c, open: false }))}
      />
      <div className="flex min-h-[calc(100vh-64px)]">
        <AdminSidebar
          active={activeSection}
          onNavigate={setActiveSection}
          counts={sidebarCounts}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <main className="flex-1 overflow-x-auto px-6 py-8">
          <div className="mb-6 flex items-center justify-between">
            <p className="text-sm text-slate-400">
              Signed in as <span className="font-semibold text-white">{session.user.email}</span>
            </p>
            <button className="focus-ring rounded-md border border-white/20 px-3 py-2 text-xs font-semibold text-white" onClick={signOut}>Sign out</button>
          </div>
          {notice && <p className="mb-4 rounded-md bg-mint/10 p-3 text-sm text-mint">{notice}</p>}
          {error && <p className="mb-4 rounded-md bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
          {renderSection()}
        </main>
      </div>
    </>
  );
}