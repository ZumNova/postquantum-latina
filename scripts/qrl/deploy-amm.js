const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
require('./nodeCrypto');

const { Web3 } = require('@theqrl/web3');
const { loadDeployer } = require('./loadDeployer');

const repoRoot = path.join(__dirname, '..', '..');
const configPath = path.join(repoRoot, 'config', 'qrl-testnet.json');

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadArtifact(contractFile, contractName) {
  const artifactPath = path.join(repoRoot, 'out', contractFile, `${contractName}.json`);

  if (!fs.existsSync(artifactPath)) {
    throw new Error(`${contractName} artifact not found. Run: forge build`);
  }

  const artifact = loadJson(artifactPath);
  return {
    abi: artifact.abi,
    bytecode: artifact.bytecode.object
  };
}

async function deployContract(web3, account, label, artifact, args = []) {
  const contract = new web3.qrl.Contract(artifact.abi);
  const deployTx = contract.deploy({
    data: artifact.bytecode,
    arguments: args
  });

  const gas = await deployTx.estimateGas({ from: account.address });
  console.log(`${label} estimated gas: ${gas}`);

  const deployed = await deployTx.send({
    from: account.address,
    gas: Math.floor(Number(gas) * 1.2)
  });

  console.log(`${label}: ${deployed.options.address}`);
  return deployed.options.address;
}

async function main() {
  if (process.env.DEPLOY_CONFIRM !== 'YES') {
    throw new Error('Set DEPLOY_CONFIRM=YES to deploy AMM contracts on QRL testnet.');
  }

  const config = loadJson(configPath);
  const provider = process.env.QRL_PROVIDER || process.env.QRL_RPC_URL || config.provider;
  const web3 = new Web3(provider);

  console.log(`Provider: ${provider}`);
  const chainId = await web3.qrl.getChainId();
  console.log(`Chain ID: ${chainId}`);

  if (Number(chainId) !== Number(config.chainId)) {
    throw new Error(`Unexpected chain ID ${chainId}; expected ${config.chainId}`);
  }

  const account = loadDeployer(web3, process.env.TESTNET_SEED);
  console.log(`Deployer: ${account.address}`);

  const balance = await web3.qrl.getBalance(account.address);
  console.log(`Balance: ${web3.utils.fromPlanck(balance, 'quanta')} QRL`);

  const wqrlArtifact = loadArtifact('QRLatinaWQRL.sol', 'QRLatinaWQRL');
  const factoryArtifact = loadArtifact('QRLatinaManualFactory.sol', 'QRLatinaManualFactory');
  const routerArtifact = loadArtifact('QRLatinaRouter.sol', 'QRLatinaRouter');
  const lensArtifact = loadArtifact('QRLatinaAmmLens.sol', 'QRLatinaAmmLens');

  const wqrl = await deployContract(web3, account, 'QRLatinaWQRL', wqrlArtifact);
  const factory = await deployContract(web3, account, 'QRLatinaManualFactory', factoryArtifact, [account.address]);
  const router = await deployContract(web3, account, 'QRLatinaRouter', routerArtifact, [factory, wqrl]);
  const lens = await deployContract(web3, account, 'QRLatinaAmmLens', lensArtifact);

  if (config.contracts.qrLatinaAmm && config.contracts.qrLatinaAmm.factory) {
    config.contracts.qrLatinaAmmPrevious = config.contracts.qrLatinaAmm;
  }

  config.contracts.qrLatinaAmm = {
    wqrl,
    factory,
    router,
    lens,
    factoryMode: 'manual-pair-registry',
    pairs: {}
  };

  config.tokens.WQRL_WRAPPED = {
    name: 'QRLatina Wrapped QRL',
    symbol: 'WQRL',
    address: wqrl
  };

  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);

  console.log('AMM deployed');
  console.log(`Updated: ${configPath}`);
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
