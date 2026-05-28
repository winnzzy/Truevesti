"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiRequest, readSession } from "@/lib/api";
import { Card } from "./card";

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

function money(value: string | number) {
  return new Intl.NumberFormat("en-US", { currency: "USD", style: "currency", maximumFractionDigits: 0 }).format(Number(value));
}

function riskTone(level: string) {
  const l = level.toLowerCase();
  if (l === "elevated" || l === "high") return "border-gold/30 bg-gold/10 text-gold";
  return "border-mint/30 bg-mint/10 text-mint";
}

export function PlanGridClient() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const session = readSession();

  useEffect(() => {
    let mounted = true;
    apiRequest<{ plans: Plan[] }>("/investments/plans")
      .then((data) => { if (mounted) setPlans(data.plans); })
      .catch(() => { /* fallback to empty */ })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div className="h-72 animate-pulse rounded-lg border border-white/10 bg-white/5" key={i} />
        ))}
      </div>
    );
  }

  if (!plans.length) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {plans.map((plan) => {
        const yieldMin = (Number(plan.estimatedYieldMin) * 100).toFixed(0);
        const yieldMax = (Number(plan.estimatedYieldMax) * 100).toFixed(0);
        return (
          <Card key={plan.id} className="plan-card flex min-h-72 flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">{plan.name}</h3>
                <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${riskTone(plan.riskLevel)}`}>
                  {plan.riskLevel}
                </span>
              </div>
              <p className="mt-5 text-3xl font-semibold text-white">{yieldMin}%–{yieldMax}%</p>
              <p className="mt-3 text-sm text-slate-300">{plan.supportedAssets.join(", ")}</p>
            </div>
            <dl className="mt-6 space-y-2 text-sm text-slate-300">
              <div className="flex justify-between">
                <dt>Range</dt>
                <dd className="text-white">{money(plan.minDepositUsd)} – {money(plan.maxDepositUsd)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Duration</dt>
                <dd className="text-white">{plan.durationDays} days</dd>
              </div>
            </dl>
            <Link
              className="focus-ring mt-4 inline-flex items-center justify-center rounded-md bg-mint px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-white"
              href={session ? "/dashboard/plans" : "/plans"}
            >
              {session ? "Invest" : "View plan"}
            </Link>
          </Card>
        );
      })}
    </div>
  );
}