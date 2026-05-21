import { Nav } from "@/components/nav";
import { PlanGrid } from "@/components/plan-grid";
import { PageIntro } from "@/components/page-intro";
import { RiskBanner } from "@/components/risk-banner";

export default function PlansPage() {
  return (
    <>
      <Nav />
      <RiskBanner />
      <main>
        <PageIntro
          description="Plans are configurable by authorized admins. Users must accept risk disclosures and complete required verification before investing."
          eyebrow="Investment plans"
          title="Clear ranges, maturity windows, and review paths"
        />
        <section className="mx-auto max-w-7xl px-5 py-14">
          <PlanGrid />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
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
        </section>
      </main>
    </>
  );
}
