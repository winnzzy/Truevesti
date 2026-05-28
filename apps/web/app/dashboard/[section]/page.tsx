import { notFound } from "next/navigation";
import { DashboardClient } from "../dashboard-client";

const sections = ["plans", "deposits", "withdrawals", "kyc", "notifications", "support"] as const;

export default async function DashboardSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!sections.includes(section as typeof sections[number])) notFound();
  return <DashboardClient initialSection={section as typeof sections[number]} />;
}
