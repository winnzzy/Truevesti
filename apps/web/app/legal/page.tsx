import { Nav } from "@/components/nav";
import { PageIntro } from "@/components/page-intro";

const legalSections = [
  [
    "Risk disclosure",
    "Truevesti does not guarantee profits, fabricate balances, or represent that estimated returns are certain. Crypto assets can lose value due to market, custody, technical, liquidity, and regulatory events."
  ],
  [
    "User obligations",
    "Users must consent to risk disclosures, provide accurate identity information when KYC is required, protect account credentials, and use withdrawal addresses they control or are authorized to use."
  ],
  [
    "Data handling",
    "Personal data is processed for account operation, security, compliance, transaction monitoring, support, and legal obligations. Production deployments should connect approved KYC, AML, custody, email, and payment providers."
  ],
  [
    "Provider dependencies",
    "Production launch depends on configured third-party services for identity verification, custody, payment processing, email delivery, transaction monitoring, and operational alerting."
  ]
];

export default function LegalPage() {
  return (
    <>
      <Nav />
      <main className="text-slate-300">
        <PageIntro
          description="This page summarizes the legal, privacy, and investment-risk posture that production operators should expand with qualified counsel before launch."
          eyebrow="Terms and risk"
          title="Terms, privacy, and risk disclosure"
        />
        <section className="mx-auto max-w-4xl px-5 py-14">
          <div className="space-y-4">
            {legalSections.map(([title, copy]) => (
              <section className="glass rounded-lg p-5" key={title}>
                <h2 className="text-xl font-semibold text-white">{title}</h2>
                <p className="mt-3 leading-7">{copy}</p>
              </section>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
