"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { Nav } from "@/components/nav";
import { PageIntro } from "@/components/page-intro";
import { RiskBanner } from "@/components/risk-banner";
import { PlansClient } from "./plans-client";

export default function PlansPage() {
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    apiRequest("/auth/me")
      .then(() => setIsAuthed(true))
      .catch(() => setIsAuthed(false));
  }, []);

  // Still loading auth state
  if (isAuthed === null) {
    return (
      <>
        <Nav />
        <main className="flex min-h-[60vh] items-center justify-center">
          <p className="text-slate-400 text-sm">Loading…</p>
        </main>
      </>
    );
  }

  // Authenticated user - show dashboard-style investment page
  if (isAuthed) {
    return (
      <>
        <Nav />
        <main className="mx-auto max-w-7xl px-5 py-10">
          <div className="mb-8">
            <button
              onClick={() => router.push("/dashboard")}
              className="text-sm text-mint hover:text-white transition mb-4 inline-block"
            >
              ← Back to Dashboard
            </button>
            <h1 className="text-2xl font-bold text-white">Browse Plans & Invest</h1>
            <p className="text-slate-400 mt-1 text-sm">
              Select a plan and invest using your available balance.
            </p>
          </div>
          <RiskBanner />
          <PlansClient />
        </main>
      </>
    );
  }

  // Non-authenticated user - show public marketing page
  return (
    <>
      <Nav />
      <main>
        <PageIntro
          description="Plans are configurable by authorized admins. Users must accept risk disclosures and complete required verification before investing."
          eyebrow="Investment plans"
          title="Clear ranges, maturity windows, and review paths"
        >
          <div className="flex flex-wrap gap-3">
            <Link className="focus-ring rounded-md bg-mint px-5 py-3 text-sm font-semibold text-ink transition hover:bg-white" href="/auth/signup">
              Open account
            </Link>
            <Link className="focus-ring rounded-md border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10" href="/auth/login">
              Sign in to invest
            </Link>
          </div>
        </PageIntro>
        <RiskBanner />
        <section className="mx-auto max-w-7xl px-5 py-14">
          <PlansClient />
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              ["Verification first", "Identity, consent, and risk acknowledgements are captured before a user can invest."],
              ["Maturity aware", "Withdrawal requests are tied to investment maturity and compliance review."],
              ["Admin controlled", "Plan limits, provider gates, support queues, and audit events remain visible to operations."]
            ].map(([title, detail]) => (
              <div className="feature-strip" key={title}>
                <span>{title}</span>
                <p>{detail}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 rounded-lg border border-white/10 bg-white/[0.03] p-6 text-center">
            <p className="text-sm text-slate-300">Ready to start investing?</p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <Link className="focus-ring rounded-md bg-mint px-5 py-3 text-sm font-semibold text-ink transition hover:bg-white" href="/auth/signup">
                Create free account
              </Link>
              <Link className="focus-ring rounded-md border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10" href="/pricing">
                View pricing
              </Link>
              <Link className="focus-ring rounded-md border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10" href="/faq">
                Read FAQ
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}