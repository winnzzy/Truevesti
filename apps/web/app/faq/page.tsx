import Link from "next/link";
import { Nav } from "@/components/nav";
import { PageIntro } from "@/components/page-intro";

const faqs = [
  ["Are returns guaranteed?", "No. Returns are estimates and digital assets carry substantial risk."],
  ["How are deposit addresses generated?", "The backend uses a crypto provider adapter. Production deployments must use a compliant custody or payment provider."],
  ["When can users withdraw?", "Withdrawals are available after maturity and can be subject to KYC, AML, fraud, and admin review."],
  ["Does this include KYC?", "The schema and admin queue are ready for KYC provider integration; provider credentials must be configured before launch."]
];

export default function FaqPage() {
  return (
    <>
      <Nav />
      <main>
        <PageIntro
          description="Straight answers for investors and operators reviewing how the platform handles plans, custody, verification, withdrawals, and support."
          eyebrow="FAQ"
          title="Common platform questions"
        />
        <section className="mx-auto max-w-4xl px-5 py-14">
          <div className="space-y-4">
            {faqs.map(([question, answer]) => (
              <section key={question} className="glass rounded-lg p-5">
                <h2 className="text-lg font-semibold text-white">{question}</h2>
                <p className="mt-2 leading-7 text-slate-300">{answer}</p>
              </section>
            ))}
          </div>
          <div className="mt-10 rounded-lg border border-white/10 bg-white/[0.03] p-6 text-center">
            <p className="text-sm text-slate-300">Still have questions?</p>
            <Link className="focus-ring mt-3 inline-flex rounded-md bg-mint px-5 py-3 text-sm font-semibold text-ink transition hover:bg-white" href="/contact">
              Contact support
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
