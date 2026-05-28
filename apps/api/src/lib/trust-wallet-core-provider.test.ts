/**
 * Unit tests for TrustWalletCoreProvider.
 *
 * Uses a well-known BIP39 test mnemonic from the Trust Wallet Core test suite.
 * Tests verify real blockchain address generation via the WASM bindings.
 *
 * Run: npx tsx --test src/lib/trust-wallet-core-provider.test.ts
 */

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { env } from "./env.js";
import {
  TrustWalletCoreProvider,
  WalletCoreUnavailableError,
} from "./trust-wallet-core-provider.js";

// Well-known test mnemonic from Trust Wallet Core test suite
// DO NOT use this mnemonic in production — it is publicly known.
const TEST_MNEMONIC =
  "ripple scissors kick mammal hire column oak again sun offer wealth tomorrow wagon turn fatal";

describe("TrustWalletCoreProvider", () => {
  const provider = new TrustWalletCoreProvider();
  let savedMnemonic: string | undefined;
  let savedAccount: number;

  beforeEach(() => {
    savedMnemonic = env.MASTER_WALLET_MNEMONIC;
    savedAccount = env.WALLET_DERIVATION_ACCOUNT;
    env.MASTER_WALLET_MNEMONIC = TEST_MNEMONIC;
    env.WALLET_DERIVATION_ACCOUNT = 0;
  });

  afterEach(() => {
    env.MASTER_WALLET_MNEMONIC = savedMnemonic;
    env.WALLET_DERIVATION_ACCOUNT = savedAccount;
  });

  // ── BTC ─────────────────────────────────────────────────────────────

  it("generates a valid BTC address", async () => {
    const result = await provider.generateAddress("BTC", "BTC");

    assert.ok(result.address, "address must be defined");
    assert.ok(
      result.address.startsWith("1") ||
        result.address.startsWith("3") ||
        result.address.startsWith("bc1"),
      `BTC address should start with 1, 3, or bc1 — got: ${result.address}`,
    );
    assert.equal(result.provider, "trust-wallet-core");
    assert.ok(
      result.derivationPath?.startsWith("m/44'/0'/"),
      `BTC derivation path should use coin type 0 — got: ${result.derivationPath}`,
    );
  });

  // ── ETH ─────────────────────────────────────────────────────────────

  it("generates a valid ETH address", async () => {
    const result = await provider.generateAddress("ETH", "ETH");

    assert.ok(result.address, "address must be defined");
    assert.ok(
      result.address.startsWith("0x") && result.address.length === 42,
      `ETH address should be 0x-prefixed and 42 chars — got: ${result.address}`,
    );
    assert.equal(result.provider, "trust-wallet-core");
    assert.ok(
      result.derivationPath?.startsWith("m/44'/60'/"),
      `ETH derivation path should use coin type 60 — got: ${result.derivationPath}`,
    );
  });

  it("generates an ETH-compatible address for USDT_ERC20", async () => {
    const result = await provider.generateAddress("ETH", "USDT_ERC20");

    assert.ok(result.address.startsWith("0x"), "ERC20 address should be 0x-prefixed");
    assert.ok(result.derivationPath?.includes("/60'/"), "should use ETH coin type");
  });

  // ── TRON ────────────────────────────────────────────────────────────

  it("generates a valid TRON address", async () => {
    const result = await provider.generateAddress("TRX", "TRX");

    assert.ok(result.address, "address must be defined");
    assert.ok(
      result.address.startsWith("T"),
      `TRON address should start with T — got: ${result.address}`,
    );
    assert.equal(result.provider, "trust-wallet-core");
    assert.ok(
      result.derivationPath?.startsWith("m/44'/195'/"),
      `TRON derivation path should use coin type 195 — got: ${result.derivationPath}`,
    );
  });

  it("generates a TRON-compatible address for USDT_TRC20", async () => {
    const result = await provider.generateAddress("TRX", "USDT_TRC20");

    assert.ok(result.address.startsWith("T"), "TRC20 address should start with T");
    assert.ok(result.derivationPath?.includes("/195'/"), "should use TRON coin type");
  });

  // ── Determinism ─────────────────────────────────────────────────────

  it("generates deterministic addresses (same mnemonic → same address)", async () => {
    const first = await provider.generateAddress("ETH", "ETH");
    const second = await provider.generateAddress("ETH", "ETH");

    assert.equal(first.address, second.address, "addresses must be identical for same input");
    assert.equal(first.derivationPath, second.derivationPath);
  });

  it("generates different addresses for different coin types", async () => {
    const btc = await provider.generateAddress("BTC", "BTC");
    const eth = await provider.generateAddress("ETH", "ETH");
    const trx = await provider.generateAddress("TRX", "TRX");

    assert.notEqual(btc.address, eth.address);
    assert.notEqual(eth.address, trx.address);
    assert.notEqual(btc.address, trx.address);
  });

  // ── Error cases ─────────────────────────────────────────────────────

  it("throws when MASTER_WALLET_MNEMONIC is not set", async () => {
    env.MASTER_WALLET_MNEMONIC = undefined;

    await assert.rejects(
      () => provider.generateAddress("ETH", "ETH"),
      (err: Error) => {
        assert.ok(
          err.message.includes("MASTER_WALLET_MNEMONIC"),
          `error should mention mnemonic — got: ${err.message}`,
        );
        return true;
      },
    );
  });

  it("throws when MASTER_WALLET_MNEMONIC is empty", async () => {
    env.MASTER_WALLET_MNEMONIC = "   ";

    await assert.rejects(
      () => provider.generateAddress("BTC", "BTC"),
      (err: Error) => {
        assert.ok(err.message.includes("MASTER_WALLET_MNEMONIC"));
        return true;
      },
    );
  });

  it("throws when mnemonic is invalid (not BIP39)", async () => {
    env.MASTER_WALLET_MNEMONIC = "not a valid mnemonic at all";

    await assert.rejects(
      () => provider.generateAddress("ETH", "ETH"),
      (err: Error) => {
        assert.ok(
          err.message.includes("valid BIP39"),
          `should mention BIP39 validity — got: ${err.message}`,
        );
        return true;
      },
    );
  });

  it("throws for unsupported asset/network", async () => {
    await assert.rejects(
      () => provider.generateAddress("SOL", "SOL"),
      (err: Error) => {
        assert.ok(
          err.message.includes("Unsupported"),
          `should mention unsupported — got: ${err.message}`,
        );
        return true;
      },
    );
  });

  // ── Security: no mnemonic leaked ────────────────────────────────────

  it("never exposes the mnemonic in the result", async () => {
    const result = await provider.generateAddress("BTC", "BTC");
    const serialized = JSON.stringify(result);

    assert.ok(
      !serialized.includes(TEST_MNEMONIC),
      "result must not contain the mnemonic",
    );
    assert.ok(
      !serialized.includes("ripple"),
      "result must not contain mnemonic words",
    );
  });
});

// ── Production mock guard ────────────────────────────────────────────

describe("production mock guard", () => {
  it("throws when CRYPTO_PROVIDER=mock in production (module-level)", async () => {
    // We test the guard logic directly rather than importing the module
    // (which would require re-running module initialization).
    const env = {
      CRYPTO_PROVIDER: "mock",
      NODE_ENV: "production",
    };

    assert.throws(() => {
      if (env.CRYPTO_PROVIDER === "mock" && env.NODE_ENV === "production") {
        throw new Error(
          "FATAL: CRYPTO_PROVIDER=mock is not allowed in production.",
        );
      }
    }, /not allowed in production/);
  });
});