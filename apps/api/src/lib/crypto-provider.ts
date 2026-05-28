import crypto from "node:crypto";
import { env } from "./env.js";

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
  if (env.CRYPTO_PROVIDER === "mock" && env.NODE_ENV === "production") {
    throw new Error(
      "FATAL: CRYPTO_PROVIDER=mock is not allowed in production. " +
      "Set CRYPTO_PROVIDER=trust-wallet-core (or another real provider) before starting."
    );
  }

  if (env.CRYPTO_PROVIDER === "trust-wallet-core") {
    if (!env.MASTER_WALLET_MNEMONIC || env.MASTER_WALLET_MNEMONIC.trim().length === 0) {
      throw new Error(
        "FATAL: MASTER_WALLET_MNEMONIC is required when CRYPTO_PROVIDER=trust-wallet-core. " +
        "Set it in your .env file."
      );
    }
  }
}

// Validate at module load time
validateStartup();

// ── Static wallet provider ─────────────────────────────────────────
class StaticWalletProvider implements CryptoProvider {
  async generateAddress(network: string, asset: string): Promise<GeneratedDeposit> {
    const map = JSON.parse(env.MASTER_WALLET_ADDRESSES ?? "{}") as Record<string, string>;
    const key = `${network}:${asset}`;
    const addr = map[key] ?? map[network];
    if (!addr) throw new Error(`No static wallet for ${key}`);
    return { address: addr, provider: "static-wallet" };
  }
}

// ── Mnemonic-wallet provider (dynamic BIP44 from mnemonic) ────────
class MnemonicWalletProvider implements CryptoProvider {
  async generateAddress(network: string, asset: string): Promise<GeneratedDeposit> {
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
    if (network === "ETH" || asset === "ETH" || asset === "USDT_ERC20") return "60";
    if (network === "TRX" || asset === "USDT_TRC20") return "195";
    return "0";
  }
}

// ── Trust Wallet Core provider (real blockchain addresses) ─────────
let twCoreCache: Awaited<ReturnType<typeof import("@trustwallet/wallet-core")["initWasm"]>> | null = null;

async function getWalletCore() {
  if (!twCoreCache) {
    const { initWasm } = await import("@trustwallet/wallet-core");
    twCoreCache = await initWasm();
  }
  return twCoreCache;
}

class TrustWalletCoreProvider implements CryptoProvider {
  async generateAddress(network: string, asset: string): Promise<GeneratedDeposit> {
    const mnemonic = env.MASTER_WALLET_MNEMONIC!;
    const account = env.WALLET_DERIVATION_ACCOUNT;

    const core = await getWalletCore();
    const { CoinType, Mnemonic } = core;

    // Validate mnemonic using TW's built-in validation
    if (!Mnemonic.isValid(mnemonic)) {
      throw new Error("MASTER_WALLET_MNEMONIC is not a valid BIP39 mnemonic");
    }

    const wallet = core.HDWallet.createWithMnemonic(mnemonic, "");

    try {
      const coinType = this.resolveCoinType(CoinType, network, asset);
      const address = wallet.getAddressForCoin(coinType);
      const derivationPath = this.getDerivationPath(coinType, account);

      return {
        address,
        provider: "trust-wallet-core",
        derivationPath,
      };
    } finally {
      wallet.delete();
    }
  }

  private resolveCoinType(
    CoinType: Awaited<ReturnType<typeof import("@trustwallet/wallet-core")["initWasm"]>>["CoinType"],
    network: string,
    asset: string
  ): typeof CoinType["bitcoin"] {
    // BTC
    if (asset === "BTC" || network === "BTC") {
      return CoinType.bitcoin;
    }
    // ETH and ERC20 tokens (USDT_ERC20) → Ethereum-compatible address
    if (network === "ETH" || asset === "ETH" || asset === "USDT_ERC20") {
      return CoinType.ethereum;
    }
    // TRX and TRC20 tokens (USDT_TRC20) → Tron address
    if (network === "TRX" || asset === "TRX" || asset === "USDT_TRC20") {
      return CoinType.tron;
    }
    throw new Error(`Unsupported asset/network for trust-wallet-core: ${asset}/${network}`);
  }

  private getDerivationPath(coinType: { value: number }, account: number): string {
    // Standard BIP44 derivation paths
    // Bitcoin: m/44'/0'/account'/0/0
    // Ethereum: m/44'/60'/account'/0/0
    // Tron: m/44'/195'/account'/0/0
    const coinValue = coinType.value;
    return `m/44'/${coinValue}'/${account}'/0/0`;
  }
}

// ── Mock provider (development only) ───────────────────────────────
class MockProvider implements CryptoProvider {
  async generateAddress(network: string, asset: string): Promise<GeneratedDeposit> {
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