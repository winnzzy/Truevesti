"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { apiRequest, readSession, ApiRequestError, logoutSession } from "@/lib/api";

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
  isActive: boolean;
};

type Balance = {
  depositedUsd: string;
  activeInvestmentPrincipalUsd: string;
  completedReturnUsd: string;
  lockedWithdrawalUsd: string;
  availableUsd: string;
};

function money(value: string | number) {
  return new Intl.NumberFormat("en-US", { currency: "USD", style: "currency", maximumFractionDigits: 0 }).format(Number(value));
}

function riskColor(level: string) {
  const l = level.toLowerCase();
  if (l === "low") return "border-mint/30 bg-mint/10 text-mint";
  if (l === "moderate" || l === "balanced") return "border-gold/30 bg-gold/10 text-gold";
  if (l === "high" || l === "elevated") return "border-red-400/30 bg-red-500/10 text-red-200";
  return "border-slate-500/30 bg-slate-500/10 text-slate-200";
}

function inputClass() {
  return "focus-ring w-full rounded-md border border-white/10 bg-white/10 px-3 py-2.5 text-sm text-white placeholder:text-slate-500";
}

export function PlansClient() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [investingPlan, setInvestingPlan] = useState<Plan | null>(null);
  const [investAmount, setInvestAmount] = useState("");
  const [investAsset, setInvestAsset] = useState("USDC");
  const [investStatus, setInvestStatus] = useState("");
  const [investError, setInvestError] = useState("");
  const [amountError, setAmountError] = useState("");
  const [investLoading, setInvestLoading] = useState(false);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const session = readSession();

  useEffect(() => {
    let mounted = true;
    apiRequest<{ plans: Plan[] }>("/investments/plans")
      .then((data) => { if (mounted) setPlans(data.plans); })
      .catch((err) => { if (mounted) setError(err instanceof Error ? err.message : "Unable to load plans"); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!session?.accessToken) return;
    let mounted = true;
    setBalanceLoading(true);
    apiRequest<{ investments: []; balance: Balance }>("/investments", {
      headers: { Authorization: `Bearer ${session.accessToken}` }
    })
      .then((data) => { if (mounted) setBalance(data.balance); })
      .catch(() => { /* ignore */ })
      .finally(() => { if (mounted) setBalanceLoading(false); });
    return () => { mounted = false; };
  }, [session?.accessToken]);

  const availableBalance = balance ? Number(balance.availableUsd) : null;
  const hasApprovedBalance = availableBalance !== null && availableBalance > 0;

  function validateAmount(amount: string, plan: Plan | null): string {
    if (!amount || Number(amount) <= 0 || !plan) return "";
    const num = Number(amount);
    const min = Number(plan.minDepositUsd);
    const max = Number(plan.maxDepositUsd);
    if (num < min) return `Minimum investment for ${plan.name} is ${money(min)}`;
    if (num > max) return `Maximum investment for ${plan.name} is ${money(max)}`;
    if (availableBalance !== null && availableBalance <= 0) return "You have no approved balance. Please make a deposit first.";
    if (availableBalance !== null && num > availableBalance) return `Insufficient balance. Your available balance is ${money(availableBalance)}.`;
    return "";
  }

  async function handleInvest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!investingPlan || !session) return;
    setInvestStatus("");
    setInvestError("");
    setAmountError("");

    const err = validateAmount(investAmount, investingPlan);
    if (err) {
      setAmountError(err);
      return;
    }

    setInvestLoading(true);

    try {
      const headers = { Authorization: `Bearer ${session.accessToken}` };
      await apiRequest("/investments", {
        method: "POST",
        headers,
        body: JSON.stringify({
          planId: investingPlan.id,
          principalUsd: Number(investAmount),
          assetSymbol: investAsset,
          disclosureHash: `risk-disclosure-${Date.now()}`
        })
      });
      setInvestStatus(`Successfully started ${investingPlan.name} investment with ${money(investAmount)} in ${investAsset}. Check your dashboard for details.`);
      setInvestingPlan(null);
      setInvestAmount("");
      setAmountError("");
      // Refresh balance after investment
      apiRequest<{ investments: []; balance: Balance }>("/investments", { headers })
        .then((data) => setBalance(data.balance))
        .catch(() => {});
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 401) {
        setInvestError("Your session has expired. Please sign in again.");
      } else if (err instanceof ApiRequestError && err.status === 403) {
        setInvestError(err.message || "You do not have permission to perform this action.");
      } else {
        setInvestError(err instanceof Error ? err.message : "Unable to start investment");
      }
    } finally {
      setInvestLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div className="h-72 animate-pulse rounded-xl border border-white/10 bg-white/5" key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-6 text-center">
        <p className="text-sm text-red-200">{error}</p>
        <p className="mt-2 text-xs text-slate-400">Please try refreshing the page.</p>
      </div>
    );
  }

  if (!plans.length) {
    return <p className="text-slate-400">No investment plans are currently available. Please check back later.</p>;
  }

  return (
    <div>
      {investStatus ? <p className="mb-4 rounded-md bg-mint/10 p-3 text-sm text-mint">{investStatus}</p> : null}
      {investError ? <p className="mb-4 rounded-md bg-red-500/10 p-3 text-sm text-red-200">{investError}</p> : null}

      {session && investingPlan ? (
        <div className="mb-8 glass rounded-xl border border-mint/30 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mint">Invest now</p>
              <h3 className="mt-1 text-xl font-semibold text-white">{investingPlan.name}</h3>
            </div>
            <button
              className="rounded-md border border-white/20 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/10"
              onClick={() => { setInvestingPlan(null); setInvestError(""); setInvestStatus(""); setAmountError(""); }}
              type="button"
            >
              Cancel
            </button>
          </div>

          {balanceLoading ? (
            <p className="mt-3 text-sm text-slate-400">Loading your balance...</p>
          ) : availableBalance !== null ? (
            hasApprovedBalance ? (
              <p className="mt-3 text-sm text-slate-400">Available balance: <span className="font-semibold text-white">{money(availableBalance)}</span></p>
            ) : (
              <div className="mt-3 rounded-md border border-gold/30 bg-gold/10 p-4 text-sm text-gold">
                <p className="font-semibold">No approved balance</p>
                <p className="mt-1 text-slate-300">You need to make a deposit and have it approved before you can start investing. Visit the <Link className="underline text-white" href="/dashboard/deposits">Deposits</Link> section to submit a deposit request.</p>
              </div>
            )
          ) : null}

          <form className="mt-4 grid gap-3 sm:grid-cols-3" onSubmit={handleInvest}>
            <label className="grid gap-1.5 text-sm font-medium text-slate-300">
              Amount (USD)
              <input
                className={inputClass()}
                max={Number(investingPlan.maxDepositUsd)}
                min={Number(investingPlan.minDepositUsd)}
                onChange={(e) => {
                  setInvestAmount(e.target.value);
                  setAmountError(validateAmount(e.target.value, investingPlan));
                }}
                placeholder={`Min ${money(investingPlan.minDepositUsd)} – Max ${money(investingPlan.maxDepositUsd)}`}
                required
                type="number"
                value={investAmount}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-300">
              Asset
              <select className={inputClass()} onChange={(e) => setInvestAsset(e.target.value)} value={investAsset}>
                {investingPlan.supportedAssets.map((asset) => <option key={asset}>{asset}</option>)}
              </select>
            </label>
            <div className="flex items-end">
              <button
                className="focus-ring w-full rounded-md bg-mint px-4 py-2.5 text-sm font-semibold text-ink disabled:opacity-50"
                disabled={investLoading || !investAmount || !!amountError || (availableBalance !== null && availableBalance <= 0)}
                type="submit"
              >
                {investLoading ? "Starting..." : "Start investment"}
              </button>
            </div>
          </form>
          {amountError ? <p className="mt-2 text-xs text-red-300">{amountError}</p> : null}
          <p className="mt-3 text-xs text-slate-500">
            Range: {money(investingPlan.minDepositUsd)} – {money(investingPlan.maxDepositUsd)} · Duration: {investingPlan.durationDays} days · Returns are estimates and may vary with market conditions.
          </p>
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        {plans.map((plan) => {
          const yieldMin = (Number(plan.estimatedYieldMin) * 100).toFixed(0);
          const yieldMax = (Number(plan.estimatedYieldMax) * 100).toFixed(0);

          return (
            <div className="glass flex min-h-[340px] flex-col justify-between rounded-xl p-6" key={plan.id}>
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold text-white">{plan.name}</h3>
                    <p className="mt-1 text-sm text-slate-400">{plan.durationDays} days duration</p>
                  </div>
                  <span className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${riskColor(plan.riskLevel)}`}>
                    {plan.riskLevel}
                  </span>
                </div>

                <p className="mt-5 text-3xl font-semibold text-mint">
                  {yieldMin}%–{yieldMax}%
                </p>
                <p className="mt-1 text-xs text-slate-400">Estimated annual yield</p>

                <div className="mt-5 grid gap-2 text-sm text-slate-300">
                  <div className="flex justify-between">
                    <span>Investment range</span>
                    <span className="font-medium text-white">{money(plan.minDepositUsd)} – {money(plan.maxDepositUsd)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Supported assets</span>
                    <span className="font-medium text-white">{plan.supportedAssets.join(", ")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Allocation strategy</span>
                    <span className="font-medium text-white text-right max-w-[200px]">{plan.assetAllocation}</span>
                  </div>
                </div>

                {plan.riskNote ? (
                  <p className="mt-4 rounded-md border border-white/10 bg-white/5 p-3 text-xs leading-5 text-slate-400">{plan.riskNote}</p>
                ) : null}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                {session ? (
                  <button
                    className="focus-ring inline-flex flex-1 items-center justify-center rounded-md bg-mint px-4 py-3 text-sm font-semibold text-ink transition hover:bg-white"
                    onClick={() => {
                      setInvestingPlan(plan);
                      setInvestAmount("");
                      setInvestAsset(plan.supportedAssets[0] || "USDC");
                      setInvestError("");
                      setInvestStatus("");
                      setAmountError("");
                    }}
                    type="button"
                  >
                    Invest now
                  </button>
                ) : (
                  <Link
                    className="focus-ring inline-flex flex-1 items-center justify-center rounded-md bg-mint px-4 py-3 text-sm font-semibold text-ink transition hover:bg-white"
                    href="/auth/signup"
                  >
                    Get started
                  </Link>
                )}
                {!session && (
                  <Link
                    className="focus-ring inline-flex items-center justify-center rounded-md border border-white/20 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                    href="/auth/login"
                  >
                    Sign in
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}