import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAuth, requireEmailVerified, type AuthRequest } from "../../middleware/auth.js";

export const investmentRouter = Router();

function computeInvestmentAccrual(investment: { principalUsd: string; startedAt: Date; maturesAt: Date; plan: { durationDays: number; estimatedYieldMin: string; estimatedYieldMax: string } }) {
  const principal = Number(investment.principalUsd);
  const durationDays = investment.plan.durationDays;
  const yieldMin = Number(investment.plan.estimatedYieldMin) || 0;
  const yieldMax = Number(investment.plan.estimatedYieldMax) || 0;
  const avgYield = (yieldMin + yieldMax) / 2;
  const totalInterest = principal * avgYield;
  const dailyAccrual = durationDays > 0 ? totalInterest / durationDays : 0;

  const elapsedMillis = Math.max(0, Math.min(Date.now() - investment.startedAt.getTime(), durationDays * 24 * 60 * 60 * 1000));
  const elapsedDays = durationDays > 0 ? Math.floor(elapsedMillis / (24 * 60 * 60 * 1000)) : 0;
  const accruedInterest = Math.min(totalInterest, dailyAccrual * elapsedDays);
  const daysElapsed = elapsedDays;

  return {
    projectedPayoutUsd: (principal + totalInterest).toFixed(2),
    dailyAccrualUsd: dailyAccrual.toFixed(2),
    accruedInterestUsd: accruedInterest.toFixed(2),
    yieldPercent: Math.round(avgYield * 100),
    daysElapsed,
    daysRemaining: Math.max(0, durationDays - elapsedDays),
    progressPercent: durationDays > 0 ? Math.min(100, Math.round((elapsedDays / durationDays) * 100)) : 0
  };
}

function enrichInvestment(investment: any) {
  return {
    ...investment,
    ...computeInvestmentAccrual(investment)
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
  res.json({ investments: investments.map(enrichInvestment) });
});

investmentRouter.post("/", requireAuth, requireEmailVerified, async (req: AuthRequest, res) => {
  const input = z.object({
    planId: z.string(),
    principalUsd: z.number().positive(),
    assetSymbol: z.string().min(2),
    disclosureHash: z.string().min(16)
  }).parse(req.body);

  const plan = await prisma.investmentPlan.findFirstOrThrow({ where: { id: input.planId, isActive: true } });
  const principalUsd = Number(input.principalUsd);
  if (principalUsd < Number(plan.minDepositUsd) || principalUsd > Number(plan.maxDepositUsd)) {
    return res.status(400).json({ error: "Investment amount is outside the plan limits" });
  }
  if (!plan.supportedAssets.includes(input.assetSymbol)) {
    return res.status(400).json({ error: "Asset is not supported by this plan" });
  }

  const maturesAt = new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000);
  await prisma.$transaction(async (tx: any) => {
  const investment = await tx.investment.create({
      data: {
        userId: req.user!.id,
        planId: plan.id,
        principalUsd,
        assetSymbol: input.assetSymbol,
        maturesAt,
        disclosureHash: input.disclosureHash
      },
      include: { plan: true }
    });
    await tx.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: "INVESTMENT_CREATED",
        entity: "Investment",
        entityId: investment.id,
        ipAddress: req.ip
      }
    });
    await tx.notification.create({
      data: {
        userId: req.user!.id,
        title: "Investment started",
        body: `${plan.name} investment is active and scheduled to mature on ${maturesAt.toISOString().slice(0, 10)}.`
      }
    });
    return investment;
  });
  res.status(201).json({ message: "Investment created successfully" });
});