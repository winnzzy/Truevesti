import { Router, type Response } from "express";
import { z } from "zod";
import { getUserBalance } from "../../lib/balances.js";
import { cryptoProvider } from "../../lib/crypto-provider.js";
import { prisma } from "../../lib/prisma.js";
import { requireAuth, requireEmailVerified, type AuthRequest } from "../../middleware/auth.js";

export const withdrawalRouter = Router();

/**
 * Basic address format validation based on asset type.
 * For production, consider integrating a dedicated address validation library.
 */
function validateAddressFormat(destination: string, assetSymbol: string, network: string): boolean {
  const addr = destination.trim();

  // BTC addresses: 1xxx, 3xxx, bc1xxx
  if (assetSymbol === "BTC" || network === "BTC" || network === "BITCOIN") {
    return /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(addr) || /^bc1[a-zA-HJ-NP-Z0-9]{25,90}$/.test(addr);
  }

  // ETH / ERC20 addresses: 0x + 40 hex chars
  if (assetSymbol === "ETH" || network === "ETH" || network === "ETHEREUM" || network === "ERC20") {
    return /^0x[a-fA-F0-9]{40}$/.test(addr);
  }

  // TRX / TRC20 addresses: T + 33 base58 chars
  if (network === "TRX" || network === "TRC20") {
    return /^T[a-zA-Z0-9]{33}$/.test(addr);
  }

  // SOL addresses: base58, 32-44 chars
  if (assetSymbol === "SOL" || network === "SOLANA") {
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr);
  }

  // BNB: 0x address or bech32
  if (assetSymbol === "BNB" || network === "BSC" || network === "BINANCE") {
    return /^0x[a-fA-F0-9]{40}$/.test(addr) || /^bnb1[a-zA-Z0-9]{38}$/.test(addr);
  }

  // USDC on ETH-compatible chains: same as ETH
  if (assetSymbol === "USDC") {
    return /^0x[a-fA-F0-9]{40}$/.test(addr);
  }

  // Fallback: minimum length check
  return addr.length >= 8 && addr.length <= 240;
}

withdrawalRouter.get("/", requireAuth, requireEmailVerified, async (req: AuthRequest, res: Response) => {
  const withdrawals = await prisma.withdrawal.findMany({
    where: { userId: req.user!.id },
    include: { investment: { include: { plan: true } } },
    orderBy: { createdAt: "desc" },
    take: 50
  });
  res.json({ withdrawals });
});

withdrawalRouter.post("/", requireAuth, requireEmailVerified, async (req: AuthRequest, res: Response) => {
  const input = z.object({
    assetSymbol: z.enum(["BTC", "ETH", "USDT", "USDC", "BNB", "SOL"]),
    network: z.string().min(2).transform((s: string) => s.toUpperCase()),
    destination: z.string().min(8).max(240),
    amountUsd: z.number().positive().max(100_000)
  }).parse(req.body);

  // Validate destination address format
  const isValidAddress = validateAddressFormat(input.destination, input.assetSymbol, input.network);
  if (!isValidAddress) {
    return res.status(400).json({ error: "Invalid destination address for the selected asset and network" });
  }

  // Check user has sufficient available balance
  const balance = await getUserBalance(req.user!.id);
  if (input.amountUsd > Number(balance.availableUsd)) {
    return res.status(400).json({ error: "Withdrawal amount exceeds available balance" });
  }

  const withdrawal = await prisma.$transaction(async (tx) => {
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
          provider: cryptoProvider.constructor.name
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