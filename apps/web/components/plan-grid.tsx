import { plans } from "@/lib/data";
import { Card } from "./card";
import { StatusPill } from "./status-pill";

export function PlanGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {plans.map((plan) => (
        <Card key={plan.name} className="plan-card flex min-h-72 flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white">{plan.name}</h3>
              <StatusPill tone={plan.risk === "Elevated" ? "gold" : "mint"}>{plan.risk}</StatusPill>
            </div>
            <p className="mt-5 text-3xl font-semibold text-white">{plan.yield}</p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="plan-meter h-full rounded-full bg-mint" style={{ width: plan.meter }} />
            </div>
            <p className="mt-3 text-sm text-slate-300">{plan.assets}</p>
          </div>
          <dl className="mt-6 space-y-2 text-sm text-slate-300">
            <div className="flex justify-between">
              <dt>Range</dt>
              <dd className="text-white">{plan.range}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Duration</dt>
              <dd className="text-white">{plan.duration}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Review</dt>
              <dd className="text-white">{plan.review}</dd>
            </div>
          </dl>
        </Card>
      ))}
    </div>
  );
}
