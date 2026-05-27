import { Router } from "express";
import { manualDepositRequestSchema, supportedManualDepositOptions } from "../../lib/manual-deposits.js";
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

paymentRouter.get("/deposit-options", requireAuth, requireEmailVerified, async (_req: AuthRequest, res) => {
  const wallets = await prisma.companyWalletAddress.findMany({
    where: { isActive: true },
    orderBy: [{ assetSymbol: "asc" }, { network: "asc" }]
  });
  const configured = new Map(wallets.map((wallet) => [`${wallet.assetSymbol}:${wallet.network}`, wallet]));

  const options = supportedManualDepositOptions.map((option) => {
    const wallet = configured.get(`${option.assetSymbol}:${option.network}`);
    return {
      ...option,
      wallet: wallet ? {
        id: wallet.id,
        address: wallet.address,
        instructions: wallet.instructions
      } : null
    };
  });

  res.json({ options });
});

paymentRouter.post("/deposits/manual", requireAuth, requireEmailVerified, async (req: AuthRequest, res) => {
  const input = manualDepositRequestSchema.parse(req.body);
  const wallet = await prisma.companyWalletAddress.findFirst({
    where: {
      assetSymbol: input.assetSymbol,
      network: input.network,
      isActive: true
    }
  });
  if (!wallet) {
    return res.status(400).json({ error: "Deposit address is not configured for this coin and network" });
  }

  const deposit = await prisma.$transaction(async (tx) => {
    const created = await tx.deposit.create({
      data: {
        userId: req.user!.id,
        companyWalletId: wallet.id,
        assetSymbol: input.assetSymbol,
        network: input.network,
        provider: "manual-admin",
        providerAddressId: wallet.id,
        depositAddress: wallet.address,
        txHash: input.txHash,
        amountUsd: input.amountUsd,
        proofUrl: input.proofUrl,
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
