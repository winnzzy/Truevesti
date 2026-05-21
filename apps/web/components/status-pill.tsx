import { clsx } from "clsx";

const tones = {
  mint: "border-mint/35 bg-mint/10 text-mint",
  gold: "border-gold/35 bg-gold/10 text-gold",
  slate: "border-white/15 bg-white/[0.08] text-slate-200",
  red: "border-red-300/25 bg-red-500/10 text-red-200"
};

type StatusPillProps = {
  children: React.ReactNode;
  tone?: keyof typeof tones;
  className?: string;
};

export function StatusPill({ children, tone = "slate", className }: StatusPillProps) {
  return (
    <span className={clsx("inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold", tones[tone], className)}>
      {children}
    </span>
  );
}
