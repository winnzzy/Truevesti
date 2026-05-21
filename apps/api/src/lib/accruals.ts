import { prisma } from "./prisma.js";

function computeInvestmentDailyAccrual(investment: { principalUsd: string; startedAt: Date; maturesAt: Date; plan: any }) {
  const principal = Number(investment.principalUsd);
  const durationDays = Number(investment.plan.durationDays) || 0;
  const yieldMin = Number(investment.plan.estimatedYieldMin) || 0;
  const yieldMax = Number(investment.plan.estimatedYieldMax) || 0;
  const avgYield = (yieldMin + yieldMax) / 2;
  const totalInterest = principal * avgYield;
  const dailyAccrual = durationDays > 0 ? totalInterest / durationDays : 0;
  return { dailyAccrual, totalInterest };
}

export async function runDailyAccruals(date = new Date()) {
  // normalize to UTC date (midnight)
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

  const investments = await prisma.investment.findMany({ where: { status: "ACTIVE" }, include: { plan: true } });
  let created = 0;
  for (const inv of investments) {
    const { dailyAccrual } = computeInvestmentDailyAccrual({ principalUsd: inv.principalUsd.toString(), startedAt: inv.startedAt, maturesAt: inv.maturesAt, plan: inv.plan });
    if (dailyAccrual <= 0) continue;

    // idempotent insert: skip if already exists for investment+date
    const existing = await prisma.$queryRaw`
      SELECT id FROM "Accrual" WHERE "investmentId" = ${inv.id} AND "date" = ${day.toISOString().slice(0, 10)}::date LIMIT 1
    `;
    if ((existing as any[]).length > 0) continue;

    await prisma.$executeRaw`
      INSERT INTO "Accrual" ("investmentId", "amountUsd", "date") VALUES (${inv.id}, ${dailyAccrual.toFixed(2)}, ${day.toISOString().slice(0, 10)}::date)
    `;
    created++;
  }
  return { processed: investments.length, created };
}

export default runDailyAccruals;
