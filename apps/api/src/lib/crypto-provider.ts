import { createHash } from "node:crypto";
import { HDNodeWallet } from "ethers";

export type DepositAddressRequest = {
  userId: string;
  assetSymbol: string;
  network: string;
};

const evmAssets = new Set(["BNB", "ETH", "USDC", "USDT"]);

function addressIndex(request: DepositAddressRequest) {
  const hash = createHash("sha256").update(`${request.userId}:${request.assetSymbol}:${request.network}`).digest();
  return hash.readUInt32BE(0) % 100000;
}

function isEvmRequest(request: DepositAddressRequest) {
  return evmAssets.has(request.assetSymbol.toUpperCase()) || ["ETHEREUM", "BSC", "POLYGON", "ARBITRUM", "BASE"].includes(request.network.toUpperCase());
}

function readStaticWalletAddress(request: DepositAddressRequest) {
  const raw = process.env.MASTER_WALLET_ADDRESSES;
  if (!raw) {
    throw new Error("MASTER_WALLET_ADDRESSES is required when CRYPTO_PROVIDER is static-wallet.");
  }

  const addresses = JSON.parse(raw) as Record<string, string>;
  const exactKey = `${request.assetSymbol}:${request.network}`.toUpperCase();
  const assetKey = request.assetSymbol.toUpperCase();
  const address = addresses[exactKey] ?? addresses[assetKey];
  if (!address) {
    throw new Error(`No master wallet address configured for ${request.assetSymbol} on ${request.network}.`);
  }
  return address;
}

function deriveMnemonicAddress(request: DepositAddressRequest) {
  const mnemonic = process.env.MASTER_WALLET_MNEMONIC;
  if (!mnemonic) {
    throw new Error("MASTER_WALLET_MNEMONIC is required when CRYPTO_PROVIDER is mnemonic-wallet.");
  }
  if (!isEvmRequest(request)) {
    return readStaticWalletAddress(request);
  }

  const index = addressIndex(request);
  const wallet = HDNodeWallet.fromPhrase(mnemonic, undefined, `m/44'/60'/0'/0/${index}`);
  return wallet.address;
}

export async function createDepositAddress(request: DepositAddressRequest) {
  const provider = process.env.CRYPTO_PROVIDER || "mock";
  if (provider === "mock") {
    return {
      provider,
      providerAddressId: `mock_${request.userId}_${Date.now()}`,
      address: `mock-${request.network.toLowerCase()}-${request.assetSymbol.toLowerCase()}-${request.userId.slice(0, 8)}`
    };
  }
  if (provider === "static-wallet") {
    return {
      provider,
      providerAddressId: `master_${request.assetSymbol}_${request.network}`,
      address: readStaticWalletAddress(request)
    };
  }
  if (provider === "mnemonic-wallet") {
    return {
      provider,
      providerAddressId: `mnemonic_${request.assetSymbol}_${request.network}_${addressIndex(request)}`,
      address: deriveMnemonicAddress(request)
    };
  }

  if (!process.env.CRYPTO_PROVIDER_API_KEY) {
    throw new Error("Crypto provider API key is required for deposit address generation.");
  }

  return {
    provider,
    providerAddressId: `addr_${request.userId}_${Date.now()}`,
    address: "provider-generated-address"
  };
}

export function verifyChainWebhook(signature: string | undefined, _payload: unknown) {
  return Boolean(process.env.CHAIN_WEBHOOK_SECRET && signature);
}
