import { clsx } from "clsx";

type PageIntroProps = {
  eyebrow?: string;
  title: string;
  description: string;
  children?: React.ReactNode;
  className?: string;
};

export function PageIntro({ eyebrow, title, description, children, className }: PageIntroProps) {
  return (
    <section className={clsx("relative overflow-hidden border-b border-white/10 bg-white/[0.03]", className)}>
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(104,241,196,0.10),transparent_38%,rgba(216,182,107,0.08))]" />
      <div className="relative mx-auto max-w-7xl px-5 py-14 md:py-20">
        <div className="max-w-3xl">
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-mint">{eyebrow}</p>
          ) : null}
          <h1 className="mt-3 text-4xl font-semibold leading-tight text-white md:text-6xl">{title}</h1>
          <p className="mt-5 text-base leading-8 text-slate-300 md:text-lg">{description}</p>
        </div>
        {children ? <div className="mt-8">{children}</div> : null}
      </div>
    </section>
  );
}
