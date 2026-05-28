"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiRequest, readSession } from "@/lib/api";

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

export function PlansClient() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const session = readSession();

  useEffect(() => {
    let mounted = true;
    apiRequest<{ plans: Plan[] }>("/investments/plans")
      .then((data) => { if (mounted) setPlans(data.plans); })
      .catch((err) => { if (mounted) setError(err instanceof Error ? err.message : "Unable to load plans"); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

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
        <p className="mt-2 text-xs text-slate-400">Showing static plan information instead.</p>
      </div>
    );
  }

  if (!plans.length) {
    return <p className="text-slate-400">No investment plans are currently available. Please check back later.</p>;
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {plans.map((plan) => {
        const yieldMin = (Number(plan.estimatedYieldMin) * 100).toFixed(0);
        const yieldMax = (Number(plan.estimatedYieldMax) * 100).toFixed(0);
        const ctaHref = session ? "/dashboard/plans" : "/auth/signup";

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
              <Link
                className="focus-ring inline-flex flex-1 items-center justify-center rounded-md bg-mint px-4 py-3 text-sm font-semibold text-ink transition hover:bg-white"
                href={ctaHref}
              >
                {session ? "Invest now" : "Get started"}
              </Link>
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
  );
}