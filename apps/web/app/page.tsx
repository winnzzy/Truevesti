import Link from "next/link";
import { Nav } from "@/components/nav";
import { PlanGridClient } from "@/components/plan-grid-client";
import { AuthHomeRedirect } from "@/components/auth-home-redirect";
import Hero3D from "@/components/hero-3d";
import LiveActivityFeed from "@/components/live-activity-feed";
import WithdrawalTicker from "@/components/withdrawal-ticker";
import RecentPayouts from "@/components/recent-payouts";
import RecentWithdrawals from "@/components/recent-withdrawals";
import PlatformStats from "@/components/platform-stats";
import TrustSection from "@/components/trust-section";
import WhyChooseSection from "@/components/why-choose-section";

export default function HomePage() {
  return (
    <>
      <AuthHomeRedirect />
      <Nav />
      <main>
        {/* ===== HERO SECTION ===== */}
        <section className="relative min-h-screen overflow-hidden bg-[#050b14]">
          {/* Gradient background overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-900/10 via-transparent to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.08),transparent_70%)] pointer-events-none" />

          {/* 3D Canvas */}
          <div className="absolute inset-0 opacity-60">
            <Hero3D />
          </div>

          {/* Hero Content */}
          <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl items-center px-5 py-20">
            <div className="max-w-3xl">
              <div className="animate-rise inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm font-medium text-emerald-400 backdrop-blur-sm mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                Platform Active · 14,258 Investors Online
              </div>

              <h1 className="animate-rise text-5xl font-bold leading-tight text-white md:text-7xl [animation-delay:120ms]">
                <span className="bg-gradient-to-r from-white via-white to-emerald-200 bg-clip-text text-transparent">
                  Invest Smarter
                </span>
                <br />
                <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                  with Truevestii
                </span>
              </h1>

              <p className="animate-rise mt-6 max-w-xl text-lg leading-8 text-gray-400 [animation-delay:220ms]">
                A compliance-ready digital asset investment platform with secure onboarding, crypto deposits,
                managed plans, and transparent withdrawal processing.
              </p>

              <div className="animate-rise mt-8 flex flex-wrap gap-4 [animation-delay:320ms]">
                <Link
                  className="group relative inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-7 py-3.5 font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-500/30"
                  href="/auth/signup"
                >
                  Get Started
                  <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-7 py-3.5 font-semibold text-white backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-white/10 hover:border-white/25"
                  href="/auth/login"
                >
                  Sign In
                </Link>
                <Link
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-7 py-3.5 font-semibold text-white backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-white/10 hover:border-white/25"
                  href="/plans"
                >
                  View Plans
                </Link>
              </div>

              {/* Compliance disclaimer */}
              <p className="animate-rise mt-6 max-w-lg text-xs text-gray-500 [animation-delay:420ms]">
                Investment returns are estimated and subject to market conditions. Past performance does not guarantee future results. Returns are not guaranteed.
              </p>
            </div>

            {/* Live Activity Feed on right side (desktop only) */}
            <div className="hidden lg:block absolute right-8 top-1/2 -translate-y-1/2 w-80">
              <LiveActivityFeed />
            </div>
          </div>
        </section>

        {/* ===== PLATFORM STATS BAR ===== */}
        <PlatformStats />

        {/* ===== LIVE ACTIVITY + PAYOUTS + WITHDRAWALS ===== */}
        <section className="mx-auto max-w-7xl px-5 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white">Real-Time Platform Activity</h2>
            <p className="mt-3 text-gray-400">Watch as investors around the world manage their portfolios on Truevestii.</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <RecentPayouts />
            <RecentWithdrawals />
          </div>

          {/* Mobile Activity Feed */}
          <div className="mt-6 lg:hidden">
            <LiveActivityFeed />
          </div>
        </section>

        {/* ===== WHY CHOOSE TRUEVESTII ===== */}
        <WhyChooseSection />

        {/* ===== TRUST SECTION ===== */}
        <TrustSection />

        {/* ===== INVESTMENT PLANS ===== */}
        <section className="relative mx-auto max-w-7xl px-5 py-20">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-900/5 to-transparent pointer-events-none" />
          <div className="relative text-center mb-12">
            <h2 className="text-3xl font-bold text-white">Investment Plans</h2>
            <p className="mt-3 text-gray-400 max-w-2xl mx-auto">
              Admin-configurable plans with clear ranges, duration, risk profile, and estimated returns.
              All returns are historical estimates and subject to market conditions.
            </p>
          </div>
          <PlanGridClient />
        </section>

        {/* ===== RISK DISCLAIMER ===== */}
        <section className="border-y border-white/10 bg-white/[0.02]">
          <div className="mx-auto max-w-7xl px-5 py-10">
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <h3 className="font-semibold text-amber-300">Important Risk Disclosure</h3>
                  <p className="mt-2 text-sm text-amber-200/70">
                    Cryptocurrency investments carry significant risk. The value of investments can go down as well as up,
                    and you may receive back less than your original investment. Past performance is not a reliable indicator
                    of future results. Estimated returns shown are based on historical data and are not guaranteed.
                    Please ensure you understand the risks involved before investing. This platform does not provide
                    financial advice.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== FEATURE STRIPS ===== */}
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

        {/* ===== CTA FOOTER ===== */}
        <section className="relative overflow-hidden py-20">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/20 via-transparent to-cyan-900/20 pointer-events-none" />
          <div className="relative mx-auto max-w-3xl px-5 text-center">
            <h2 className="text-3xl font-bold text-white">Ready to Start Investing?</h2>
            <p className="mt-4 text-gray-400">
              Join thousands of verified investors on the Truevestii platform. Create your account today.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                className="group relative inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-8 py-4 font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:-translate-y-0.5 hover:shadow-xl"
                href="/auth/signup"
              >
                Create Account
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link
                className="inline-flex items-center rounded-xl border border-white/15 bg-white/5 px-8 py-4 font-semibold text-white backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-white/10"
                href="/about"
              >
                Learn More
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Withdrawal Ticker Notifications */}
      <WithdrawalTicker />
    </>
  );
}