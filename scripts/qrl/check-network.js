const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
require('./nodeCrypto');

const { Web3 } = require('@theqrl/web3');
const config = require('../../config/qrl-testnet.json');

async function main() {
  const provider = process.env.QRL_PROVIDER || config.provider;
  const web3 = new Web3(provider);

  console.log(`Provider: ${provider}`);

  const chainId = await web3.qrl.getChainId();
  const blockNumber = await web3.qrl.getBlockNumber();

  console.log(`Chain ID: ${chainId}`);
  console.log(`Block number: ${blockNumber}`);
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
