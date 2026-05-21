import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAuth, type AuthRequest } from "../../middleware/auth.js";

export const withdrawalRouter = Router();

withdrawalRouter.get("/", requireAuth, async (req: AuthRequest, res) => {
  const withdrawals = await prisma.withdrawal.findMany({
    where: { userId: req.user!.id },
    include: { investment: { include: { plan: true } } },
    orderBy: { createdAt: "desc" },
    take: 50
  });
  res.json({ withdrawals });
});

withdrawalRouter.post("/", requireAuth, async (req: AuthRequest, res) => {
  const input = z.object({
    investmentId: z.string(),
    assetSymbol: z.enum(["BTC", "ETH", "USDT", "USDC", "SOL", "BNB"]),
    network: z.string().min(2),
    destination: z.string().min(16),
    amountUsd: z.number().positive()
  }).parse(req.body);

  const investment = await prisma.investment.findFirstOrThrow({
    where: { id: input.investmentId, userId: req.user!.id },
    include: { plan: true }
  });
  if (investment.maturesAt > new Date()) return res.status(400).json({ error: "Investment has not matured" });
  if (!["ACTIVE", "MATURED"].includes(investment.status)) return res.status(400).json({ error: "Investment is not eligible for withdrawal" });
  if (Number(input.amountUsd) > Number(investment.principalUsd)) return res.status(400).json({ error: "Withdrawal exceeds investment principal" });

  const withdrawal = await prisma.$transaction(async (tx) => {
    const created = await tx.withdrawal.create({
      data: {
        userId: req.user!.id,
        investmentId: investment.id,
        assetSymbol: input.assetSymbol,
        network: input.network,
        destination: input.destination,
        amountUsd: input.amountUsd
      }
    });
    await tx.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: "WITHDRAWAL_REQUESTED",
        entity: "Withdrawal",
        entityId: created.id,
        ipAddress: req.ip
      }
    });
    await tx.notification.create({
      data: {
        userId: req.user!.id,
        title: "Withdrawal request received",
        body: `${investment.plan.name} withdrawal is pending compliance review.`
      }
    });
    return created;
  });

  res.status(201).json({ withdrawal });
});
