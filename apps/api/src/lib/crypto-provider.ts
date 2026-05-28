import crypto from "node:crypto";
import { env } from "./env.js";
import { TrustWalletCoreProvider } from "./trust-wallet-core-provider.js";

// ── types ──────────────────────────────────────────────────────────
export interface GeneratedDeposit {
  address: string;
  memo?: string;
  provider: string;
  derivationPath?: string;
}

export interface CryptoProvider {
  generateAddress(network: string, asset: string): Promise<GeneratedDeposit>;
}

// ── Startup validation ─────────────────────────────────────────────
function validateStartup(): void {
  // ── Block non-production-safe providers in production ─────────────
  const devOnlyProviders = ["mock", "mnemonic-wallet"];
  if (devOnlyProviders.includes(env.CRYPTO_PROVIDER) && env.NODE_ENV === "production") {
    throw new Error(
      `FATAL: CRYPTO_PROVIDER=${env.CRYPTO_PROVIDER} is not allowed in production. ` +
        "Set CRYPTO_PROVIDER=trust-wallet-core (or static-wallet with real addresses).",
    );
  }

  // ── Require mnemonic when using trust-wallet-core ────────────────
  if (env.CRYPTO_PROVIDER === "trust-wallet-core") {
    if (
      !env.MASTER_WALLET_MNEMONIC ||
      env.MASTER_WALLET_MNEMONIC.trim().length === 0
    ) {
      throw new Error(
        "FATAL: MASTER_WALLET_MNEMONIC is required when CRYPTO_PROVIDER=trust-wallet-core. " +
          "Set it in your .env file.",
      );
    }
  }

  // ── Log provider resolution (no secrets) ─────────────────────────
  console.log(`[crypto-provider] Startup validation passed. Provider=${env.CRYPTO_PROVIDER}, NODE_ENV=${env.NODE_ENV}`);
}

// Validate at module load time
validateStartup();

// ── Static wallet provider ─────────────────────────────────────────
class StaticWalletProvider implements CryptoProvider {
  async generateAddress(
    network: string,
    asset: string,
  ): Promise<GeneratedDeposit> {
    const map = JSON.parse(
      env.MASTER_WALLET_ADDRESSES ?? "{}",
    ) as Record<string, string>;
    const key = `${network}:${asset}`;
    const addr = map[key] ?? map[network];
    if (!addr) throw new Error(`No static wallet for ${key}`);
    return { address: addr, provider: "static-wallet" };
  }
}

// ── Mnemonic-wallet provider (dynamic BIP44 from mnemonic) ────────
class MnemonicWalletProvider implements CryptoProvider {
  async generateAddress(
    network: string,
    asset: string,
  ): Promise<GeneratedDeposit> {
    const mnemonic = env.MASTER_WALLET_MNEMONIC;
    if (!mnemonic) throw new Error("MASTER_WALLET_MNEMONIC is not set");

    const purpose = "44";
    const coin = this.toCoinType(network, asset);
    const account = "0";
    const change = "0";
    const index = "0";
    const path = `m/${purpose}'/${coin}'/${account}'/${change}/${index}`;

    return {
      address: `mnemonic-derived-${network.toLowerCase()}-${asset.toLowerCase()}-${crypto.randomUUID().slice(0, 8)}`,
      provider: "mnemonic-wallet",
      derivationPath: path,
    };
  }

  private toCoinType(network: string, asset: string): string {
    if (asset === "BTC") return "0";
    if (network === "ETH" || asset === "ETH" || asset === "USDT_ERC20")
      return "60";
    if (network === "TRX" || asset === "USDT_TRC20") return "195";
    return "0";
  }
}

// ── Mock provider (development only) ───────────────────────────────
class MockProvider implements CryptoProvider {
  async generateAddress(
    network: string,
    asset: string,
  ): Promise<GeneratedDeposit> {
    return {
      address: `mock-${asset.toLowerCase()}-address-not-real-${crypto.randomUUID().slice(0, 8)}`,
      provider: "mock",
    };
  }
}

// ── Provider factory ───────────────────────────────────────────────
const providers: Record<string, CryptoProvider> = {
  mock: new MockProvider(),
  "static-wallet": new StaticWalletProvider(),
  "mnemonic-wallet": new MnemonicWalletProvider(),
  "trust-wallet-core": new TrustWalletCoreProvider(),
};

const resolved = providers[env.CRYPTO_PROVIDER];
if (!resolved) {
  throw new Error(`FATAL: Unknown CRYPTO_PROVIDER "${env.CRYPTO_PROVIDER}"`);
}

console.log(`[crypto-provider] Using provider: ${env.CRYPTO_PROVIDER}`);

export const cryptoProvider: CryptoProvider = resolved;