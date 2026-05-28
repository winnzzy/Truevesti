import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import { computeAccrualSnapshot } from "./investment-math.js";

export async function runDailyAccruals(date = new Date()) {
  // normalize to UTC date (midnight)
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

  const investments = await prisma.investment.findMany({ where: { status: "ACTIVE" }, include: { plan: true } });
  let created = 0;
  let completed = 0;
  const errors: string[] = [];

  for (const inv of investments) {
    try {
      const snapshot = computeAccrualSnapshot({
        principalUsd: inv.principalUsd.toString(),
        expectedReturnUsd: inv.expectedReturnUsd.toString(),
        startedAt: inv.startedAt,
        maturesAt: inv.maturesAt,
        plan: inv.plan
      });
      const dailyAccrual = Number(snapshot.dailyAccrualUsd);
      if (dailyAccrual <= 0) continue;

      // idempotent insert: skip if already exists for investment+date
      const existing = await prisma.$queryRaw`
        SELECT id FROM "Accrual" WHERE "investmentId" = ${inv.id} AND "date" = ${day.toISOString().slice(0, 10)}::date LIMIT 1
      `;
      if ((existing as { id: string }[]).length > 0) continue;

      await prisma.$executeRaw`
        INSERT INTO "Accrual" ("investmentId", "amountUsd", "date") VALUES (${inv.id}, ${dailyAccrual.toFixed(2)}, ${day.toISOString().slice(0, 10)}::date)
      `;
      created++;

      if (inv.maturesAt <= date) {
        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          await tx.investment.update({
            where: { id: inv.id },
            data: { status: "COMPLETED", completedAt: date }
          });
          await tx.auditLog.create({
            data: {
              actorId: null,
              action: "INVESTMENT_MATURED",
              entity: "Investment",
              entityId: inv.id,
              metadata: {
                principalUsd: inv.principalUsd.toString(),
                expectedReturnUsd: inv.expectedReturnUsd.toString(),
                planName: inv.plan.name
              }
            }
          });
          await tx.notification.create({
            data: {
              userId: inv.userId,
              title: "Investment completed",
              body: `Your ${inv.plan.name} investment has reached its scheduled end date. Principal and estimated returns have been credited to your available balance.`
            }
          });
        });
        completed++;
      }
    } catch (err) {
      errors.push(`Investment ${inv.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return { processed: investments.length, created, completed, errors };
}

export default runDailyAccruals;
