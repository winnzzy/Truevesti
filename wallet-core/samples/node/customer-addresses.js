const fs = require("fs");
const walletCore = require("@trustwallet/wallet-core");

async function main() {
  const core = await walletCore.initWasm();
  const { HDWallet, CoinType, AnyAddress } = core;

  // TEST ONLY. Replace this with your 12-word test mnemonic.
  const masterMnemonic = "urge fossil toy swift sea cool leisure lumber smart coffee wagon approve";

  const wallet = HDWallet.createWithMnemonic(masterMnemonic, "");

  function generateAddress(coin, path) {
    const privateKey = wallet.getKey(coin, path);
    const publicKey = privateKey.getPublicKeySecp256k1(false);
    const address = AnyAddress.createWithPublicKey(publicKey, coin);
    return address.description();
  }

  const customers = [
    { customerId: "USER001", index: 1 },
    { customerId: "USER002", index: 2 },
    { customerId: "USER003", index: 3 },
  ];

  const results = [];

  for (const customer of customers) {
    const path = `m/44'/60'/0'/0/${customer.index}`;

    const ethAddress = generateAddress(CoinType.ethereum, path);
    const bscAddress = generateAddress(CoinType.smartChain, path);

    results.push({
      customerId: customer.customerId,
      derivationIndex: customer.index,
      ethereumDepositAddress: ethAddress,
      bnbSmartChainDepositAddress: bscAddress,
    });
  }

  fs.writeFileSync("deposit-addresses.json", JSON.stringify(results, null, 2));

  console.log("Done. Deposit addresses saved to deposit-addresses.json");
  console.log(results);
}

main();