const { readAssets } = require('./readAssets');

async function main() {
  const assets = await readAssets();

  console.log(`Provider: ${assets.provider}`);
  console.log(`Chain ID: ${assets.chainId}`);
  console.log(`Block number: ${assets.blockNumber}`);
  console.log(`Wallet: ${assets.wallet}`);
  console.log(`QRL native raw: ${assets.native.balanceRaw}`);
  console.log(`QRL native: ${assets.native.balance}`);
  console.log('');
  console.log('Configured tokens');

  for (const token of assets.tokens) {
    if (token.error) {
      console.log(`${token.configuredSymbol}: ${token.error} (${token.address})`);
      continue;
    }
    console.log(
      `${token.configuredSymbol}: ${token.balance} ${token.symbol} raw=${token.balanceRaw} decimals=${token.decimals} address=${token.address}`
    );
  }

  const quantaSwap = assets.protocols && assets.protocols.quantaSwap;
  if (quantaSwap) {
    console.log('');
    console.log('QuantaSwap HTLC');
    console.log(`QRL HTLC: ${quantaSwap.qrlHtlc}`);
    console.log(`Sepolia HTLC: ${quantaSwap.ethSepoliaHtlc}`);
  }
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
