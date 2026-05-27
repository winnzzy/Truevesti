import assert from "node:assert/strict";
import test from "node:test";
import {
  depositDecisionSchema,
  manualDepositKey,
  manualDepositRequestSchema,
  supportedManualDepositOptions,
  walletAddressSchema
} from "./manual-deposits.js";

test("manual deposit options are limited to configured supported networks", () => {
  assert.deepEqual(
    supportedManualDepositOptions.map((option) => manualDepositKey(option.assetSymbol, option.network)),
    ["USDT:TRC20", "USDT:ERC20", "BTC:BITCOIN", "ETH:ETHEREUM"]
  );

  assert.equal(manualDepositRequestSchema.safeParse({
    assetSymbol: "USDT",
    network: "BEP20",
    amountUsd: 100,
    txHash: "0x123456789"
  }).success, false);
});

test("manual deposit request requires amount and transaction hash", () => {
  const parsed = manualDepositRequestSchema.parse({
    assetSymbol: "USDT",
    network: "TRC20",
    amountUsd: 250,
    txHash: "abc123456789"
  });

  assert.equal(parsed.assetSymbol, "USDT");
  assert.equal(parsed.network, "TRC20");
  assert.equal(parsed.amountUsd, 250);
});

test("wallet address configuration rejects unsupported coin and network pairs", () => {
  assert.equal(walletAddressSchema.safeParse({
    assetSymbol: "BTC",
    network: "ERC20",
    label: "Wrapped BTC",
    address: "0xabc123456789",
    instructions: "Send funds to this address only."
  }).success, false);
});

test("deposit rejection requires a saved reason", () => {
  assert.equal(depositDecisionSchema.safeParse({ status: "CONFIRMED" }).success, true);
  assert.equal(depositDecisionSchema.safeParse({ status: "REJECTED" }).success, false);
  assert.equal(depositDecisionSchema.safeParse({ status: "REJECTED", reason: "Transaction hash could not be verified" }).success, true);
});
