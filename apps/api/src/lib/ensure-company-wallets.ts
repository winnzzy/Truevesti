import { prisma } from "./prisma.js";

/**
 * Ensure CompanyWalletAddress records exist for all supported deposit combos.
 *
 * These are placeholder addresses — the admin must update them with real
 * company wallet addresses via the admin dashboard before going live.
 *
 * Without these records, the crypto-provider fallback generates addresses but
 * has no CompanyWalletAddress row to reference, causing P2003 foreign key
 * violations on deposit.create().
 */
const REQUIRED_WALLETS = [
  {
    assetSymbol: "BTC",
    network: "Bitcoin",
    label: "BTC Company Wallet",
    address: "PENDING_ADMIN_CONFIGURATION",
    instructions: "Send only BTC on the Bitcoin network. Sending other assets may result in permanent loss.",
  },
  {
    assetSymbol: "ETH",
    network: "Ethereum",
    label: "ETH Company Wallet",
    address: "PENDING_ADMIN_CONFIGURATION",
    instructions: "Send only ETH on the Ethereum network. Sending other assets may result in permanent loss.",
  },
  {
    assetSymbol: "USDT",
    network: "ERC20",
    label: "USDT (ERC-20) Company Wallet",
    address: "PENDING_ADMIN_CONFIGURATION",
    instructions: "Send only USDT on the Ethereum (ERC-20) network. Sending other assets may result in permanent loss.",
  },
  {
    assetSymbol: "USDT",
    network: "TRC20",
    label: "USDT (TRC-20) Company Wallet",
    address: "PENDING_ADMIN_CONFIGURATION",
    instructions: "Send only USDT on the Tron (TRC-20) network. Sending other assets may result in permanent loss.",
  },
];

export async function ensureCompanyWallets(): Promise<void> {
  let created = 0;

  for (const wallet of REQUIRED_WALLETS) {
    const existing = await prisma.companyWalletAddress.findUnique({
      where: {
        assetSymbol_network: {
          assetSymbol: wallet.assetSymbol,
          network: wallet.network,
        },
      },
    });

    if (!existing) {
      await prisma.companyWalletAddress.create({ data: wallet });
      created++;
      console.log(
        `[ensure-company-wallets] Created placeholder: ${wallet.assetSymbol}:${wallet.network}`,
      );
    }
  }

  if (created > 0) {
    console.log(
      `[ensure-company-wallets] Created ${created} placeholder wallet(s). ` +
        "Admin must update addresses via the admin dashboard before accepting real deposits.",
    );
  } else {
    console.log("[ensure-company-wallets] All required wallet records exist.");
  }
}