import { Router } from "express";
import { getUserBalance } from "../../lib/balances.js";
import { cryptoProvider } from "../../lib/crypto-provider.js";
import { manualDepositRequestSchema, supportedManualDepositOptions } from "../../lib/manual-deposits.js";
import { prisma } from "../../lib/prisma.js";
import { requireAuth, requireEmailVerified, type AuthRequest } from "../../middleware/auth.js";

export const paymentRouter = Router();

/**
 * Map manual-deposit option (assetSymbol + network) to crypto-provider params.
 * Returns [providerNetwork, providerAsset] used by cryptoProvider.generateAddress().
 */
const SUPPORTED_PROVIDER_COMBOS: Record<string, [string, string]> = {
  "BTC:Bitcoin": ["BTC", "BTC"],
  "ETH:Ethereum": ["ETH", "ETH"],
  "USDT:ERC20": ["ETH", "USDT_ERC20"],
  "USDT:TRC20": ["TRX", "USDT_TRC20"],
};

function mapToProviderParams(assetSymbol: string, network: string): [string, string] {
  const key = `${assetSymbol}:${network}`;
  const result = SUPPORTED_PROVIDER_COMBOS[key];
  if (!result) {
    console.warn(`[payments] Unsupported asset/network combo requested: ${key}`);
    throw new Error(`Unsupported asset/network combination: ${assetSymbol}/${network}`);
  }
  return result;
}

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

  const options = await Promise.all(supportedManualDepositOptions.map(async (option) => {
    const wallet = configured.get(`${option.assetSymbol}:${option.network}`);
    if (wallet) {
      return {
        ...option,
        wallet: {
          id: wallet.id,
          address: wallet.address,
          instructions: wallet.instructions,
          provider: "admin-configured"
        }
      };
    }

    // Fall back to crypto-provider for real address generation
    try {
      const [provNetwork, provAsset] = mapToProviderParams(option.assetSymbol, option.network);
      const generated = await cryptoProvider.generateAddress(provNetwork, provAsset);
      if (generated) {
        return {
          ...option,
          wallet: {
            id: `provider:${option.assetSymbol}:${option.network}`,
            address: generated.address,
            instructions: `Send only ${option.assetSymbol} on the ${option.network} network to this address. Sending other assets may result in permanent loss.`,
            provider: generated.provider,
            ...(generated.derivationPath ? { derivationPath: generated.derivationPath } : {})
          }
        };
      }
    } catch (err) {
      // Log the error type/message but never the mnemonic or keys
      const safeMsg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      console.error(`[payments] Failed to get address for ${option.assetSymbol}:${option.network}: ${safeMsg}`);
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
  let providerName = "manual-admin";
  let derivationPath: string | undefined;

  if (wallet) {
    depositAddress = wallet.address;
    walletId = wallet.id;
  } else {
    // Use crypto-provider for real address generation
    try {
      const [provNetwork, provAsset] = mapToProviderParams(input.assetSymbol, input.network);
      const generated = await cryptoProvider.generateAddress(provNetwork, provAsset);
      depositAddress = generated.address;
      walletId = `provider:${input.assetSymbol}:${input.network}`;
      providerName = generated.provider;
      derivationPath = generated.derivationPath;
    } catch (err) {
      const safeMsg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      console.error(`[payments] Failed to generate address for ${input.assetSymbol}:${input.network}: ${safeMsg}`);
      return res.status(400).json({ error: "Deposit address generation failed for this coin and network. Please try again or contact support." });
    }
  }

  const deposit = await prisma.$transaction(async (tx) => {
    const created = await tx.deposit.create({
      data: {
        userId: req.user!.id,
        companyWalletId: walletId,
        assetSymbol: input.assetSymbol,
        network: input.network,
        provider: providerName,
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
        ipAddress: req.ip,
        metadata: {
          provider: providerName,
          assetSymbol: input.assetSymbol,
          network: input.network,
          // NOTE: derivationPath logged for admin audit; never log private keys
          ...(derivationPath ? { derivationPath } : {})
        }
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