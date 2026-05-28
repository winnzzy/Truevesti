/**
 * Crypto wallet provider abstraction.
 *
 * Supports three modes controlled by the CRYPTO_PROVIDER env var:
 *   - "mock"              → development stub, never returns real addresses
 *   - "static-wallet"     → addresses are stored in MASTER_WALLET_ADDRESSES JSON
 *   - "mnemonic-wallet"   → HD-wallet derivation from MASTER_WALLET_MNEMONIC
 *
 * Each mode implements the same WalletProvider interface so the rest of the
 * backend can stay provider-agnostic.
 */

import { env } from "./env.js";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export interface WalletAddress {
  address: string;
  /** Optional derivation path for HD wallets */
  derivationPath?: string;
}

export interface WalletProvider {
  /** Human-readable provider name for logging / audit. */
  readonly name: string;

  /**
   * Return the deposit address for a given asset symbol and network.
   * Static wallets return the admin-configured address.
   * HD wallets derive a unique address per user (future use).
   */
  getAddress(assetSymbol: string, network: string): Promise<WalletAddress | null>;

  /**
   * Validate that a destination address is valid for the given asset.
   * Providers that cannot validate return true.
   */
  validateAddress(address: string, assetSymbol: string, network: string): Promise<boolean>;
}

/* -------------------------------------------------------------------------- */
/*  Static wallet provider                                                     */
/* -------------------------------------------------------------------------- */

/**
 * MASTER_WALLET_ADDRESSES format (JSON in env):
 * {
 *   "USDC": "0x...",
 *   "USDT": "0x...",
 *   "BTC":  "bc1...",
 *   "ETH":  "0x...",
 *   "SOL":  "...",
 *   "BNB":  "0x..."
 * }
 *
 * If network-specific keys are needed, use "ASSET:NETWORK" as the key, e.g.
 * { "USDC:ERC20": "0x...", "USDC:BEP20": "0x..." }
 */
function parseStaticAddresses(): Record<string, string> {
  const raw = process.env.MASTER_WALLET_ADDRESSES?.trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    console.error("[crypto-provider] MASTER_WALLET_ADDRESSES is not valid JSON — ignoring");
    return {};
  }
}

class StaticWalletProvider implements WalletProvider {
  readonly name = "static-wallet";
  private addresses: Record<string, string>;

  constructor() {
    this.addresses = parseStaticAddresses();
  }

  async getAddress(assetSymbol: string, network: string): Promise<WalletAddress | null> {
    // Try network-specific key first, then asset-only key
    const key = `${assetSymbol}:${network}`;
    const address = this.addresses[key] ?? this.addresses[assetSymbol];
    if (!address) return null;
    return { address };
  }

  async validateAddress(address: string, assetSymbol: string, _network: string): Promise<boolean> {
    const expected = this.addresses[`${assetSymbol}:${_network}`] ?? this.addresses[assetSymbol];
    if (!expected) return true; // can't validate what we don't know
    return address.trim().length > 0;
  }
}

/* -------------------------------------------------------------------------- */
/*  Mnemonic (HD wallet) provider                                             */
/* -------------------------------------------------------------------------- */

class MnemonicWalletProvider implements WalletProvider {
  readonly name = "mnemonic-wallet";

  async getAddress(assetSymbol: string, network: string): Promise<WalletAddress | null> {
    // Dynamic import to avoid loading ethers HD code when not needed
    const { HDNodeWallet, Mnemonic } = await import("ethers");

    const mnemonicPhrase = process.env.MASTER_WALLET_MNEMONIC?.trim();
    if (!mnemonicPhrase) {
      console.error("[crypto-provider] MASTER_WALLET_MNEMONIC is not set");
      return null;
    }

    // Map asset symbols to BIP-44 derivation paths
    // Ethereum-style path for EVM-compatible chains
    const derivationIndex = 0;
    const derivationPath = getDerivationPath(assetSymbol, network, derivationIndex);

    try {
      const mnemonic = Mnemonic.fromPhrase(mnemonicPhrase);
      const wallet = HDNodeWallet.fromMnemonic(mnemonic, derivationPath);
      return { address: wallet.address, derivationPath };
    } catch (err) {
      console.error("[crypto-provider] Failed to derive address:", err);
      return null;
    }
  }

  async validateAddress(address: string, assetSymbol: string, network: string): Promise<boolean> {
    if (!address || address.trim().length === 0) return false;

    // Basic EVM address validation
    if (isEvmChain(assetSymbol, network)) {
      return /^0x[0-9a-fA-F]{40}$/.test(address);
    }

    // For non-EVM, accept non-empty addresses (full validation requires chain-specific logic)
    return address.trim().length >= 8;
  }
}

/* -------------------------------------------------------------------------- */
/*  Mock provider (development)                                               */
/* -------------------------------------------------------------------------- */

class MockWalletProvider implements WalletProvider {
  readonly name = "mock";

  async getAddress(assetSymbol: string, network: string): Promise<WalletAddress | null> {
    console.warn(`[crypto-provider:mock] Returning mock address for ${assetSymbol}:${network}`);
    return { address: `mock-${assetSymbol.toLowerCase()}-address-not-real` };
  }

  async validateAddress(): Promise<boolean> {
    return true;
  }
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function isEvmChain(assetSymbol: string, network: string): boolean {
  const evmSymbols = new Set(["ETH", "USDC", "USDT", "BNB", "DAI", "LINK", "UNI", "AAVE", "MATIC", "AVAX"]);
  const evmNetworks = new Set(["ERC20", "BEP20", "POLYGON", "AVALANCHE", "OPTIMISM", "ARBITRUM", "BASE", "ETHEREUM"]);
  return evmSymbols.has(assetSymbol.toUpperCase()) || evmNetworks.has(network.toUpperCase());
}

function getDerivationPath(assetSymbol: string, network: string, index: number): string {
  // BIP-44 paths: m / purpose' / coin_type' / account' / change / address_index
  // coin_type 60 = Ethereum, 0 = Bitcoin, 501 = Solana
  if (assetSymbol.toUpperCase() === "BTC") {
    return `m/84'/0'/0'/0/${index}`; // BIP-84 native segwit
  }
  if (assetSymbol.toUpperCase() === "SOL") {
    return `m/44'/501'/${index}'/0'`; // Solana path
  }
  // Default: EVM-compatible (ETH, USDC, USDT, BNB, etc.)
  return `m/44'/60'/0'/0/${index}`;
}

/* -------------------------------------------------------------------------- */
/*  Singleton factory                                                         */
/* -------------------------------------------------------------------------- */

let _provider: WalletProvider | null = null;

export function getWalletProvider(): WalletProvider {
  if (_provider) return _provider;

  const providerName = env.CRYPTO_PROVIDER ?? "mock";

  switch (providerName) {
    case "static-wallet":
      _provider = new StaticWalletProvider();
      break;
    case "mnemonic-wallet":
      _provider = new MnemonicWalletProvider();
      break;
    case "mock":
      _provider = new MockWalletProvider();
      break;
    default:
      console.warn(`[crypto-provider] Unknown CRYPTO_PROVIDER "${providerName}", falling back to mock`);
      _provider = new MockWalletProvider();
  }

  console.info(`[crypto-provider] Initialized wallet provider: ${_provider.name}`);
  return _provider;
}