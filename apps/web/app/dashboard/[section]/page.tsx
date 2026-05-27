import { notFound } from "next/navigation";
import { DashboardClient } from "../dashboard-client";

const sections = ["plans", "deposits", "withdrawals", "kyc", "notifications", "support"] as const;

export default function DashboardSectionPage({ params }: { params: { section: string } }) {
  if (!sections.includes(params.section as typeof sections[number])) notFound();
  return <DashboardClient initialSection={params.section as typeof sections[number]} />;
}
