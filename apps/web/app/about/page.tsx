import { Nav } from "@/components/nav";
import { Card } from "@/components/card";
import { PageIntro } from "@/components/page-intro";
import { StatusPill } from "@/components/status-pill";

const pillars = [
  ["Compliance operations", "Risk consent, KYC readiness, withdrawal review, and audit logs are treated as core product workflows."],
  ["Provider-first custody", "Wallet, payment, email, OAuth, and monitoring layers are adapters so production teams can plug in approved vendors."],
  ["Investor clarity", "Plans surface ranges, durations, estimated returns, review levels, and risk language without implying guaranteed outcomes."]
];

const timeline = [
  ["01", "Verify", "Collect profile details, disclosures, and provider-backed identity checks before access expands."],
  ["02", "Allocate", "Match deposits to plan limits, supported assets, maturity windows, and operational review rules."],
  ["03", "Operate", "Monitor deposits, investments, withdrawals, support tickets, provider gates, and admin actions."]
];

export default function AboutPage() {
  return (
    <>
      <Nav />
      <main>
        <PageIntro
          description="Truevestii is a venture-grade software foundation for compliant crypto investment operations, combining secure onboarding, provider-based wallet infrastructure, admin controls, audit logs, user consent, and transparent risk presentation."
          eyebrow="About the platform"
          title="Built for disciplined digital asset operations"
        >
          <div className="flex flex-wrap gap-3">
            <StatusPill tone="mint">KYC-ready</StatusPill>
            <StatusPill tone="gold">Risk disclosed</StatusPill>
            <StatusPill>Audit-oriented</StatusPill>
          </div>
        </PageIntro>
        <section className="mx-auto max-w-7xl px-5 py-14">
          <div className="grid gap-4 md:grid-cols-3">
            {pillars.map(([title, copy]) => (
              <Card key={title}>
                <h2 className="text-xl font-semibold text-white">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-300">{copy}</p>
              </Card>
            ))}
          </div>
        </section>
        <section className="border-y border-white/10 bg-white/[0.03]">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-mint">Operating model</p>
              <h2 className="mt-3 text-3xl font-semibold text-white">From account creation to admin review</h2>
              <p className="mt-4 leading-7 text-slate-300">
                The app is structured around the back-office realities of a brokerage: verified users,
                clear plan limits, traceable approvals, and readiness checks before launch.
              </p>
            </div>
            <div className="grid gap-4">
              {timeline.map(([step, title, copy]) => (
                <div className="grid gap-4 rounded-lg border border-white/10 bg-white/[0.04] p-5 sm:grid-cols-[64px_1fr]" key={title}>
                  <span className="flex h-12 w-12 items-center justify-center rounded-md bg-mint font-semibold text-ink">{step}</span>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{copy}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
