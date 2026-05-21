const walletCore = require("@trustwallet/wallet-core");

async function main() {
  const core = await walletCore.initWasm();

  const { HDWallet, CoinType } = core;

  // Test mnemonic only. Do NOT use this in production.
  const wallet = HDWallet.create(128, "");

  console.log("Mnemonic:", wallet.mnemonic());

  const ethAddress = wallet.getAddressForCoin(CoinType.ethereum);
  const btcAddress = wallet.getAddressForCoin(CoinType.bitcoin);
  const bnbAddress = wallet.getAddressForCoin(CoinType.smartChain);

  console.log("ETH Address:", ethAddress);
  console.log("BTC Address:", btcAddress);
  console.log("BNB Smart Chain Address:", bnbAddress);
}

main();