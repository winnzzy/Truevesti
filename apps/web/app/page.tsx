import Link from "next/link";
import { Nav } from "@/components/nav";
import { RiskBanner } from "@/components/risk-banner";
import { PlanGrid } from "@/components/plan-grid";
import { HeroScene } from "@/components/hero-scene";
import { AuthHomeRedirect } from "@/components/auth-home-redirect";

export default function HomePage() {
  return (
    <>
      <AuthHomeRedirect />
      <Nav />
      <main>
        <section className="relative min-h-[86vh] overflow-hidden bg-ink">
          <HeroScene />
          <div className="relative z-10 mx-auto flex min-h-[86vh] max-w-7xl items-center px-5 py-20">
            <div className="max-w-3xl">
              <p className="animate-rise text-sm font-semibold uppercase tracking-[0.28em] text-mint">Crypto brokerage operations</p>
              <h1 className="animate-rise mt-5 max-w-4xl text-5xl font-semibold leading-tight text-white md:text-7xl [animation-delay:120ms]">
                Truevesti
              </h1>
              <p className="animate-rise mt-6 max-w-2xl text-lg leading-8 text-slate-300 [animation-delay:220ms]">
                A compliance-ready investment platform scaffold for verified onboarding, crypto deposits,
                plan management, withdrawal approvals, support, and audit-grade administration.
              </p>
              <div className="animate-rise mt-8 max-w-2xl rounded-3xl border border-white/10 bg-white/5 p-6 text-slate-200 shadow-[0_32px_80px_rgba(0,0,0,0.18)] [animation-delay:320ms]">
                <p className="text-sm text-slate-300">
                  Create an account with your email, verify a one-time code, then sign in to manage investments and deposits.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link className="focus-ring rounded-md bg-mint px-5 py-3 font-semibold text-ink shadow-[0_18px_60px_rgba(104,241,196,.24)] transition hover:-translate-y-0.5 hover:bg-white" href="/auth/signup">
                    Sign up
                  </Link>
                  <Link className="focus-ring rounded-md border border-white/20 px-5 py-3 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/10" href="/auth/login">
                    Sign in
                  </Link>
                  <Link className="focus-ring rounded-md border border-white/20 px-5 py-3 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/10" href="/plans">
                    View plans
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
        <RiskBanner />
        <section className="relative mx-auto max-w-7xl px-5 py-16">
          <div className="mb-8 max-w-2xl">
            <h2 className="text-3xl font-semibold text-white">Investment Plans</h2>
            <p className="mt-3 text-slate-300">Admin-configurable plans with clear ranges, duration, risk profile, and estimated returns.</p>
          </div>
          <PlanGrid />
        </section>
        <section className="border-y border-white/10 bg-white/[0.03]">
          <div className="mx-auto grid max-w-7xl gap-4 px-5 py-10 md:grid-cols-4">
            {[
              ["Onboarding", "Risk consent, profile, KYC queue"],
              ["Wallets", "Manual company-wallet deposits"],
              ["Investing", "Plan limits and maturity dates"],
              ["Operations", "Audit logs and admin review"]
            ].map(([title, detail]) => (
              <div className="feature-strip" key={title}>
                <span>{title}</span>
                <p>{detail}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
