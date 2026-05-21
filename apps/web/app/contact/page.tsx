import { Nav } from "@/components/nav";
import { PageIntro } from "@/components/page-intro";
import { ContactClient } from "./contact-client";

export default function ContactPage() {
  return (
    <>
      <Nav />
      <main>
        <PageIntro
          description="Support tickets, live chat hooks, and notification delivery are modeled in the backend so customer operations can be connected to a real help desk."
          eyebrow="Support"
          title="Contact operations"
        />
        <section className="mx-auto grid max-w-6xl gap-8 px-5 py-12 lg:grid-cols-[0.8fr_1fr]">
          <div className="space-y-5">
            {[
              ["Ticket routing", "Requests include priority, status, timestamps, and account ownership."],
              ["Admin visibility", "Operations teams can review open tickets alongside KYC and withdrawal queues."],
              ["Notification ready", "The data model supports email, in-app, and external help desk delivery."]
            ].map(([title, detail]) => (
              <div className="feature-strip" key={title}>
                <span>{title}</span>
                <p>{detail}</p>
              </div>
            ))}
          </div>
          <ContactClient />
        </section>
      </main>
    </>
  );
}
