const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
require('./nodeCrypto');

const { Web3 } = require('@theqrl/web3');
const { loadDeployer } = require('./loadDeployer');
const config = require('../../config/qrl-testnet.json');

async function main() {
  const provider = process.env.QRL_PROVIDER || config.provider;
  const web3 = new Web3(provider);
  const account = loadDeployer(web3, process.env.TESTNET_SEED);
  const balance = await web3.qrl.getBalance(account.address);

  console.log(`Provider: ${provider}`);
  console.log(`Address: ${account.address}`);
  console.log(`Balance raw: ${balance.toString()}`);
  console.log(`Balance QRL: ${web3.utils.fromPlanck(balance, 'quanta')}`);
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
