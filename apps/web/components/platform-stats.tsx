"use client";

import { useCountUp, useInView } from "./use-count-up";

const STATS = [
  { label: "Total Paid Out", value: 12847562, prefix: "$", suffix: "", format: true },
  { label: "Active Investors", value: 14258, prefix: "", suffix: "", format: true },
  { label: "Completed Withdrawals", value: 38914, prefix: "", suffix: "", format: true },
  { label: "Verified Accounts", value: 11203, prefix: "", suffix: "", format: true },
  { label: "Countries Served", value: 75, prefix: "", suffix: "+", format: true },
];

function StatCard({ label, value, prefix, suffix, format, delay }: {
  label: string; value: number; prefix: string; suffix: string; format: boolean; delay: number;
}) {
  const { ref, inView } = useInView(0.3);
  const count = useCountUp(inView ? value : 0, 2500);

  const formatted = format ? count.toLocaleString() : count.toString();

  return (
    <div
      ref={ref}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 text-center transition-all duration-500 hover:border-emerald-500/30 hover:bg-white/[0.08] hover:shadow-lg hover:shadow-emerald-500/5"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Subtle glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/0 to-emerald-500/0 group-hover:from-emerald-500/5 group-hover:to-transparent transition-all duration-500 pointer-events-none" />

      <div className="relative">
        <p className="text-3xl md:text-4xl font-bold text-white">
          {prefix}{formatted}{suffix}
        </p>
        <p className="mt-2 text-sm text-gray-400">{label}</p>
      </div>
    </div>
  );
}

export default function PlatformStats() {
  return (
    <section className="relative overflow-hidden border-y border-white/10 bg-gradient-to-r from-[#0a101a] via-[#0d1520] to-[#0a101a]">
      {/* Animated gradient line at top */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

      <div className="mx-auto max-w-7xl px-5 py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-white">Platform Statistics</h2>
          <p className="mt-2 text-sm text-gray-500">Marketing estimates — not a guarantee of future results</p>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {STATS.map((stat, i) => (
            <StatCard key={stat.label} {...stat} delay={i * 100} />
          ))}
        </div>
      </div>

      {/* Animated gradient line at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
    </section>
  );
}