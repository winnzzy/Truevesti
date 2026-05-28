import { Router } from "express";
import { getUserBalance } from "../../lib/balances.js";
import { getWalletProvider } from "../../lib/crypto-provider.js";
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

paymentRouter.get("/balance", requireAuth, requireEmailVerified, async (req: AuthRequest, res) => {
  const balance = await getUserBalance(req.user!.id);
  res.json({ balance });
});

paymentRouter.get("/deposit-options", requireAuth, requireEmailVerified, async (_req: AuthRequest, res) => {
  const wallets = await prisma.companyWalletAddress.findMany({
    where: { isActive: true },
    orderBy: [{ assetSymbol: "asc" }, { network: "asc" }]
  });
  const configured = new Map(wallets.map((wallet) => [`${wallet.assetSymbol}:${wallet.network}`, wallet]));

  const provider = getWalletProvider();
  const options = await Promise.all(supportedManualDepositOptions.map(async (option) => {
    const wallet = configured.get(`${option.assetSymbol}:${option.network}`);
    if (wallet) {
      return {
        ...option,
        wallet: {
          id: wallet.id,
          address: wallet.address,
          instructions: wallet.instructions
        }
      };
    }

    // Fall back to crypto-provider (mnemonic/static) for address generation
    try {
      const generated = await provider.getAddress(option.assetSymbol, option.network);
      if (generated) {
        return {
          ...option,
          wallet: {
            id: `provider:${option.assetSymbol}:${option.network}`,
            address: generated.address,
            instructions: `Send only ${option.assetSymbol} on the ${option.network} network to this address. Sending other assets may result in permanent loss.${generated.derivationPath ? ` (Derived: ${generated.derivationPath})` : ""}`
          }
        };
      }
    } catch (err) {
      console.error(`[payments] Failed to get address for ${option.assetSymbol}:${option.network}:`, err);
    }

    return { ...option, wallet: null };
  }));

  res.json({ options });
});

paymentRouter.post("/deposits/manual", requireAuth, requireEmailVerified, async (req: AuthRequest, res) => {
  const input = manualDepositRequestSchema.parse(req.body);

  // Look up admin-configured wallet first, then fall back to crypto-provider
  let wallet = await prisma.companyWalletAddress.findFirst({
    where: {
      assetSymbol: input.assetSymbol,
      network: input.network,
      isActive: true
    }
  });

  let depositAddress: string;
  let walletId: string;
  let provider = "manual-admin";

  if (wallet) {
    depositAddress = wallet.address;
    walletId = wallet.id;
  } else {
    // Try crypto-provider (mnemonic/static) for address generation
    const cryptoProvider = getWalletProvider();
    const generated = await cryptoProvider.getAddress(input.assetSymbol, input.network);
    if (!generated) {
      return res.status(400).json({ error: "Deposit address is not configured for this coin and network" });
    }
    depositAddress = generated.address;
    walletId = `provider:${input.assetSymbol}:${input.network}`;
    provider = cryptoProvider.name;
  }

  const deposit = await prisma.$transaction(async (tx) => {
    const created = await tx.deposit.create({
      data: {
        userId: req.user!.id,
        companyWalletId: walletId,
        assetSymbol: input.assetSymbol,
        network: input.network,
        provider,
        providerAddressId: walletId,
        depositAddress,
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
