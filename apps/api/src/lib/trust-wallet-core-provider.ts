/**
 * Trust Wallet Core address provider.
 *
 * Uses the @trustwallet/wallet-core WASM bindings to generate real
 * blockchain deposit addresses from a BIP39 mnemonic via BIP44 derivation.
 *
 * Supported coins:
 *   - Bitcoin (BTC)        → CoinType.bitcoin   (coin type 0)
 *   - Ethereum (ETH/ERC20) → CoinType.ethereum  (coin type 60)
 *   - Tron (TRX/TRC20)     → CoinType.tron      (coin type 195)
 *
 * SECURITY: Never log, expose, or return the mnemonic / seed / private keys.
 */

import type { CryptoProvider, GeneratedDeposit } from "./crypto-provider.js";

// ---------------------------------------------------------------------------
// Minimal type surface for the wallet-core WASM bindings so we don't
// need a hard compile-time dependency (the package ships its own .d.ts but
// the dynamic import makes inference tricky).
// ---------------------------------------------------------------------------
interface WalletCoreModule {
  initWasm: () => Promise<WalletCore>;
}

interface WalletCore {
  HDWallet: {
    createWithMnemonic(mnemonic: string, passphrase: string): HDWallet;
  };
  Mnemonic: {
    isValid(mnemonic: string): boolean;
  };
  CoinType: {
    bitcoin: CoinTypeObj;
    ethereum: CoinTypeObj;
    tron: CoinTypeObj;
  };
}

interface CoinTypeObj {
  value: number;
}

interface HDWallet {
  getAddressForCoin(coin: CoinTypeObj): string;
  delete(): void;
}

// ---------------------------------------------------------------------------
// Singleton WASM cache – initWasm() is expensive; call once.
// ---------------------------------------------------------------------------
let coreCache: WalletCore | null = null;

async function loadCore(): Promise<WalletCore> {
  if (!coreCache) {
    // Dynamic import – the package is CJS, Node handles the interop.
    const mod = (await import(
      "@trustwallet/wallet-core"
    )) as unknown as WalletCoreModule;
    coreCache = await mod.initWasm();
  }
  return coreCache;
}

// ---------------------------------------------------------------------------
// Provider implementation
// ---------------------------------------------------------------------------

/**
 * Clear error thrown when the native WASM bindings cannot be loaded.
 * This is the single place that surfaces the build/setup requirement.
 */
export class WalletCoreUnavailableError extends Error {
  constructor(cause?: unknown) {
    const hint = [
      "Trust Wallet Core WASM bindings could not be loaded.",
      "",
      "To fix this:",
      "  1. Ensure the npm dependency is installed:",
      '       npm install @trustwallet/wallet-core',
      "  2. If using the local wallet-core/wasm source, build it first:",
      "       cd wallet-core/wasm && npm install && npm run build",
      "  3. Verify that dist/lib/wallet-core.wasm exists in the package.",
      "",
      "If the native binding is unavailable in your environment, set",
      "CRYPTO_PROVIDER=static-wallet (or mock in development only).",
    ].join("\n");
    super(hint);
    this.name = "WalletCoreUnavailableError";
    if (cause) this.cause = cause;
  }
}

export class TrustWalletCoreProvider implements CryptoProvider {
  async generateAddress(
    network: string,
    asset: string,
  ): Promise<GeneratedDeposit> {
    // ── 1. Resolve mnemonic ────────────────────────────────────────────
    const mnemonic = process.env.MASTER_WALLET_MNEMONIC;
    if (!mnemonic || mnemonic.trim().length === 0) {
      throw new Error(
        "MASTER_WALLET_MNEMONIC is not set. " +
          "Add a valid BIP39 mnemonic to your .env file.",
      );
    }

    // ── 2. Load WASM core ──────────────────────────────────────────────
    let core: WalletCore;
    try {
      core = await loadCore();
    } catch (err) {
      throw new WalletCoreUnavailableError(err);
    }

    // ── 3. Validate mnemonic ───────────────────────────────────────────
    if (!core.Mnemonic.isValid(mnemonic)) {
      throw new Error(
        "MASTER_WALLET_MNEMONIC is not a valid BIP39 mnemonic. " +
          "Provide a 12- or 24-word BIP39 phrase.",
      );
    }

    // ── 4. Derive address ──────────────────────────────────────────────
    const coinType = this.resolveCoinType(core.CoinType, network, asset);
    const wallet = core.HDWallet.createWithMnemonic(mnemonic, "");

    try {
      const address = wallet.getAddressForCoin(coinType);
      const derivationPath = this.buildDerivationPath(coinType);

      return {
        address,
        provider: "trust-wallet-core",
        derivationPath,
      };
    } finally {
      // Always free the native WASM memory
      wallet.delete();
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  /**
   * Map (network, asset) to the correct Trust Wallet Core CoinType.
   */
  private resolveCoinType(
    coins: WalletCore["CoinType"],
    network: string,
    asset: string,
  ): CoinTypeObj {
    // Bitcoin
    if (asset === "BTC" || network === "BTC") {
      return coins.bitcoin;
    }
    // Ethereum & ERC-20 tokens (e.g. USDT_ERC20)
    if (
      network === "ETH" ||
      asset === "ETH" ||
      asset.endsWith("_ERC20")
    ) {
      return coins.ethereum;
    }
    // Tron & TRC-20 tokens (e.g. USDT_TRC20)
    if (
      network === "TRX" ||
      asset === "TRX" ||
      asset.endsWith("_TRC20")
    ) {
      return coins.tron;
    }

    throw new Error(
      `Unsupported asset/network for trust-wallet-core: ${asset}/${network}`,
    );
  }

  /**
   * Build a standard BIP44 derivation path:
   *   m / 44' / coin_type' / 0' / 0 / 0
   *
   * The account index comes from WALLET_DERIVATION_ACCOUNT (default 0).
   */
  private buildDerivationPath(coinType: CoinTypeObj): string {
    const account = parseInt(
      process.env.WALLET_DERIVATION_ACCOUNT ?? "0",
      10,
    );
    return `m/44'/${coinType.value}'/${account}'/0/0`;
  }
}