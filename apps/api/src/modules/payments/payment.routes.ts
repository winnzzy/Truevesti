import { Router } from "express";
import { z } from "zod";
import { createDepositAddress, verifyChainWebhook } from "../../lib/crypto-provider.js";
import { prisma } from "../../lib/prisma.js";
import { requireAuth, requireEmailVerified, type AuthRequest } from "../../middleware/auth.js";

export const paymentRouter = Router();

paymentRouter.get("/deposits", requireAuth, requireEmailVerified, async (req: AuthRequest, res) => {
  const deposits = await prisma.deposit.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: "desc" },
    take: 50
  });
  res.json({ deposits });
});

paymentRouter.post("/deposits/manual", requireAuth, requireEmailVerified, async (req: AuthRequest, res) => {
  const input = z.object({
    assetSymbol: z.enum(["BTC", "ETH", "USDT", "USDC", "SOL", "BNB"]),
    network: z.string().min(2),
    amountUsd: z.number().positive(),
    txHash: z.string().min(8).optional()
  }).parse(req.body);

  const deposit = await prisma.$transaction(async (tx) => {
    const created = await tx.deposit.create({
      data: {
        userId: req.user!.id,
        assetSymbol: input.assetSymbol,
        network: input.network,
        provider: "manual-admin",
        providerAddressId: null,
        depositAddress: "Manual admin review",
        txHash: input.txHash,
        amountUsd: input.amountUsd,
        status: "PENDING"
      }
    });
    await tx.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: "MANUAL_DEPOSIT_REQUESTED",
        entity: "Deposit",
        entityId: created.id,
        ipAddress: req.ip
      }
    });
    await tx.notification.create({
      data: {
        userId: req.user!.id,
        title: "Deposit request received",
        body: "Your deposit is pending admin review. Balance updates after approval."
      }
    });
    return created;
  });

  res.status(201).json({ deposit });
});

paymentRouter.post("/deposit-address", requireAuth, requireEmailVerified, async (req: AuthRequest, res) => {
  const input = z.object({
    assetSymbol: z.enum(["BTC", "ETH", "USDT", "USDC", "SOL", "BNB"]),
    network: z.string().min(2)
  }).parse(req.body);

  const address = await createDepositAddress({ userId: req.user!.id, ...input });
  const deposit = await prisma.deposit.create({
    data: {
      userId: req.user!.id,
      assetSymbol: input.assetSymbol,
      network: input.network,
      provider: address.provider,
      providerAddressId: address.providerAddressId,
      depositAddress: address.address
    }
  });

  res.status(201).json({ deposit });
});

paymentRouter.post("/webhooks/chain", async (req, res) => {
  if (!verifyChainWebhook(req.header("x-provider-signature"), req.body)) {
    return res.status(401).json({ error: "Invalid webhook signature" });
  }

  const input = z.object({
    txHash: z.string(),
    depositAddress: z.string(),
    confirmations: z.number().int(),
    amountCrypto: z.string(),
    amountUsd: z.string().optional()
  }).parse(req.body);

  await prisma.deposit.updateMany({
    where: { depositAddress: input.depositAddress },
    data: {
      txHash: input.txHash,
      confirmations: input.confirmations,
      amountCrypto: input.amountCrypto,
      amountUsd: input.amountUsd,
      status: input.confirmations >= 3 ? "CONFIRMED" : "CONFIRMING",
      confirmedAt: input.confirmations >= 3 ? new Date() : undefined
    }
  });
  res.json({ ok: true });
});
