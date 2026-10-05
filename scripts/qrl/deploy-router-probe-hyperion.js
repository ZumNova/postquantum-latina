const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
require('./nodeCrypto');

const { Web3 } = require('@theqrl/web3');
const { loadDeployer } = require('./loadDeployer');
const config = require('../../config/qrl-testnet.json');
const artifact = require('../../artifacts/hyperion/QRLatinaRouterProbe.json');

async function main() {
  if (process.env.DEPLOY_CONFIRM !== 'YES') {
    throw new Error('Set DEPLOY_CONFIRM=YES to deploy QRLatinaRouterProbe Hyperion on QRL testnet.');
  }

  const provider = process.env.QRL_PROVIDER || process.env.QRL_RPC_URL || config.provider;
  const web3 = new Web3(new Web3.providers.HttpProvider(provider));

  console.log(`Provider: ${provider}`);
  const chainId = BigInt(await web3.qrl.getChainId());
  console.log(`Chain ID: ${chainId}`);

  const expectedChainId = BigInt(process.env.QRL_EXPECTED_CHAIN_ID || config.chainId);
  if (chainId !== expectedChainId) {
    throw new Error(`Unexpected chain: ${chainId}; expected ${expectedChainId}`);
  }

  const account = loadDeployer(web3, process.env.TESTNET_SEED);
  const fromAddress = process.env.QRL_DEPLOY_FROM || config.wallets.myQrlWalletQip55 || account.address;
  const qip55Account = { ...account, address: fromAddress };
  web3.qrl.accounts.wallet.add(qip55Account);
  if (web3.qrl.wallet && typeof web3.qrl.wallet.add === 'function') {
    web3.qrl.wallet.add(qip55Account);
  }

  console.log(`Deployer legacy address: ${account.address}`);
  console.log(`Deploy from address: ${fromAddress}`);

  const deploy = new web3.qrl.Contract(artifact.abi).deploy({
    data: artifact.bytecode,
    arguments: []
  });

  const estimated = BigInt(await deploy.estimateGas({ from: fromAddress }));
  const gasPrice = await web3.qrl.getGasPrice();

  console.log(`Estimated gas: ${estimated}`);
  console.log(`Gas price: ${gasPrice}`);
  console.log('Note: @theqrl/web3 0.4.0 still rejects QIP-55 senders in sendTransaction.');

  const receipt = await web3.qrl.sendTransaction({
    from: fromAddress,
    data: deploy.encodeABI(),
    gas: (estimated * 12n) / 10n,
    gasPrice
  });

  console.log('Deploy transaction sent');
  console.log(`Transaction hash: ${receipt.transactionHash || receipt.hash || 'unknown'}`);
  console.log(`Contract address: ${receipt.contractAddress || 'missing'}`);
}

main().catch(error => {
  console.error(error.message || error);
  process.exit(1);
});
