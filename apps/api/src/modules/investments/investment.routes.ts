import { Router } from "express";
import { z } from "zod";
import { getUserBalance } from "../../lib/balances.js";
import { computeAccrualSnapshot, expectedReturnForPlan } from "../../lib/investment-math.js";
import { prisma } from "../../lib/prisma.js";
import { requireAuth, requireEmailVerified, type AuthRequest } from "../../middleware/auth.js";

export const investmentRouter = Router();

function enrichInvestment(investment: any) {
  return {
    ...investment,
    ...computeAccrualSnapshot(investment)
  };
}

investmentRouter.get("/plans", async (_req, res) => {
  const plans = await prisma.investmentPlan.findMany({ where: { isActive: true }, orderBy: { minDepositUsd: "asc" } });
  res.json({ plans });
});

investmentRouter.get("/", requireAuth, requireEmailVerified, async (req: AuthRequest, res) => {
  const investments = await prisma.investment.findMany({
    where: { userId: req.user!.id },
    include: { plan: true },
    orderBy: { startedAt: "desc" },
    take: 50
  });
  const balance = await getUserBalance(req.user!.id);
  res.json({ investments: investments.map(enrichInvestment), balance });
});

investmentRouter.get("/:id", requireAuth, requireEmailVerified, async (req: AuthRequest, res) => {
  const investment = await prisma.investment.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
    include: { plan: true, accruals: { orderBy: { date: "desc" }, take: 90 } }
  });
  if (!investment) {
    return res.status(404).json({ error: "Investment not found" });
  }
  const enriched = enrichInvestment(investment);
  res.json({ investment: { ...enriched, accruals: investment.accruals } });
});

investmentRouter.post("/", requireAuth, requireEmailVerified, async (req: AuthRequest, res) => {
  const input = z.object({
    planId: z.string().min(1),
    principalUsd: z.number().positive(),
    assetSymbol: z.string().min(2),
    disclosureHash: z.string().min(16).optional()
  }).parse(req.body);

  const plan = await prisma.investmentPlan.findFirstOrThrow({ where: { id: input.planId, isActive: true } });
  const principalUsd = input.principalUsd;

  if (principalUsd < Number(plan.minDepositUsd) || principalUsd > Number(plan.maxDepositUsd)) {
    return res.status(400).json({ error: "Investment amount is outside the plan limits" });
  }
  if (!plan.supportedAssets.includes(input.assetSymbol)) {
    return res.status(400).json({ error: "Asset is not supported by this plan" });
  }

  const investment = await prisma.$transaction(async (tx: any) => {
    const balance = await getUserBalance(req.user!.id, tx);
    if (principalUsd > Number(balance.availableUsd)) {
      throw Object.assign(new Error("Investment amount exceeds available approved balance"), { status: 400 });
    }

    const now = new Date();
    const maturesAt = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
    const created = await tx.investment.create({
      data: {
        userId: req.user!.id,
        planId: plan.id,
        principalUsd,
        expectedReturnUsd: expectedReturnForPlan(principalUsd, plan),
        assetSymbol: input.assetSymbol,
        maturesAt,
        disclosureHash: input.disclosureHash || "not-provided"
      },
      include: { plan: true }
    });

    await tx.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: "INVESTMENT_CREATED",
        entity: "Investment",
        entityId: created.id,
        ipAddress: req.ip,
        metadata: {
          principalUsd,
          planId: plan.id,
          assetSymbol: input.assetSymbol,
          maturesAt: maturesAt.toISOString()
        }
      }
    });

    await tx.notification.create({
      data: {
        userId: req.user!.id,
        title: "Investment started",
        body: `${plan.name} investment is active and scheduled to mature on ${maturesAt.toISOString().slice(0, 10)}. This is an estimated schedule; actual returns depend on market conditions.`
      }
    });

    return created;
  });

  res.status(201).json({ investment: enrichInvestment(investment), message: "Investment created successfully" });
});
