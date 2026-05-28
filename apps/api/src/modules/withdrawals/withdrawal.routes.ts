import { Router } from "express";
import { z } from "zod";
import { getUserBalance } from "../../lib/balances.js";
import { getWalletProvider } from "../../lib/crypto-provider.js";
import { prisma } from "../../lib/prisma.js";
import { requireAuth, requireEmailVerified, type AuthRequest } from "../../middleware/auth.js";

export const withdrawalRouter = Router();

withdrawalRouter.get("/", requireAuth, requireEmailVerified, async (req: AuthRequest, res) => {
  const withdrawals = await prisma.withdrawal.findMany({
    where: { userId: req.user!.id },
    include: { investment: { include: { plan: true } } },
    orderBy: { createdAt: "desc" },
    take: 50
  });
  res.json({ withdrawals });
});

withdrawalRouter.post("/", requireAuth, requireEmailVerified, async (req: AuthRequest, res) => {
  const input = z.object({
    assetSymbol: z.enum(["BTC", "ETH", "USDT", "USDC", "BNB", "SOL"]),
    network: z.string().min(2).transform((s: string) => s.toUpperCase()),
    destination: z.string().min(8).max(240),
    amountUsd: z.number().positive().max(100_000)
  }).parse(req.body);

  // Validate destination address with the crypto provider
  const provider = getWalletProvider();
  const isValidAddress = await provider.validateAddress(input.destination, input.assetSymbol, input.network);
  if (!isValidAddress) {
    return res.status(400).json({ error: "Invalid destination address for the selected asset and network" });
  }

  // Check user has sufficient available balance
  const balance = await getUserBalance(req.user!.id);
  if (input.amountUsd > Number(balance.availableUsd)) {
    return res.status(400).json({ error: "Withdrawal amount exceeds available balance" });
  }

  const withdrawal = await prisma.$transaction(async (tx: any) => {
    const created = await tx.withdrawal.create({
      data: {
        userId: req.user!.id,
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
        metadata: {
          assetSymbol: input.assetSymbol,
          network: input.network,
          amountUsd: input.amountUsd,
          provider: provider.name
        },
        ipAddress: req.ip
      }
    });
    await tx.notification.create({
      data: {
        userId: req.user!.id,
        title: "Withdrawal request received",
        body: "Your withdrawal request is pending operations review."
      }
    });
    return created;
  });

  res.status(201).json({ withdrawal });
});
