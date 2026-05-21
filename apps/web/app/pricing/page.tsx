import { Nav } from "@/components/nav";
import { Card } from "@/components/card";
import { PageIntro } from "@/components/page-intro";
import { PlanGrid } from "@/components/plan-grid";

const feeNotes = [
  ["Platform fees", "Disclose subscription, management, or performance fees before accepting funds."],
  ["Network costs", "Surface chain fees, settlement timing, and confirmation requirements per asset."],
  ["Tax treatment", "Provide jurisdiction-specific reporting language through qualified advisors."],
  ["Custody terms", "Explain provider responsibilities, wallet controls, insurance limits, and recovery processes."]
];

export default function PricingPage() {
  return (
    <>
      <Nav />
      <main>
        <PageIntro
          description="Investment plans show estimated ranges only. Platform fees, custody costs, network fees, and tax treatment should be disclosed per jurisdiction."
          eyebrow="Pricing and disclosures"
          title="Transparent costs before committed capital"
        />
        <section className="mx-auto max-w-7xl px-5 py-14">
          <PlanGrid />
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {feeNotes.map(([title, copy]) => (
              <Card key={title}>
                <h2 className="text-lg font-semibold text-white">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-300">{copy}</p>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
