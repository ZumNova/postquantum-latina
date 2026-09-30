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

function artifact(contractFile, contractName) {
  const artifactPath = path.join(repoRoot, 'out', contractFile, `${contractName}.json`);
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`${contractName} artifact not found. Run: forge build`);
  }
  return loadJson(artifactPath);
}

function sortAddresses(addressA, addressB) {
  const valueA = BigInt(`0x${addressA.slice(1)}`);
  const valueB = BigInt(`0x${addressB.slice(1)}`);
  return valueA < valueB ? [addressA, addressB] : [addressB, addressA];
}

async function deploy(web3, account, label, artifactJson, args = []) {
  const contract = new web3.qrl.Contract(artifactJson.abi);
  const tx = contract.deploy({
    data: artifactJson.bytecode.object,
    arguments: args
  });
  const gas = await tx.estimateGas({ from: account.address });
  console.log(`${label} estimated gas: ${gas}`);
  const deployed = await tx.send({
    from: account.address,
    gas: Math.floor(Number(gas) * 1.2)
  });
  console.log(`${label}: ${deployed.options.address}`);
  return deployed.options.address;
}

async function main() {
  if (process.env.DEPLOY_CONFIRM !== 'YES') {
    throw new Error('Set DEPLOY_CONFIRM=YES to deploy static AMM contracts on QRL testnet.');
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

  const wqrlArtifact = artifact('QRLatinaWQRL.sol', 'QRLatinaWQRL');
  const pairArtifact = artifact('QRLatinaPairBootstrapped.sol', 'QRLatinaPairBootstrapped');
  const factoryArtifact = artifact('QRLatinaStaticFactory.sol', 'QRLatinaStaticFactory');
  const routerArtifact = artifact('QRLatinaRouter.sol', 'QRLatinaRouter');
  const lensArtifact = artifact('QRLatinaAmmLens.sol', 'QRLatinaAmmLens');

  const wqrl = await deploy(web3, account, 'QRLatinaWQRL', wqrlArtifact);
  const tokens = {
    QRLAT: config.tokens.QRLAT.address,
    QETH: config.tokens.QETH.address,
    QZD: config.tokens.QZD.address,
    WQRL: wqrl
  };
  const specs = [
    ['QRLAT', 'QETH'],
    ['QRLAT', 'QZD'],
    ['QRLAT', 'WQRL'],
    ['QETH', 'QZD'],
    ['QETH', 'WQRL'],
    ['QZD', 'WQRL']
  ];

  const tokenAList = [];
  const tokenBList = [];
  const pairList = [];
  const pairs = {};

  for (const [symbolA, symbolB] of specs) {
    const [token0, token1] = sortAddresses(tokens[symbolA], tokens[symbolB]);
    const pair = await deploy(web3, account, `Pair ${symbolA}/${symbolB}`, pairArtifact, [token0, token1]);
    tokenAList.push(tokens[symbolA]);
    tokenBList.push(tokens[symbolB]);
    pairList.push(pair);
    pairs[`${symbolA}/${symbolB}`] = pair;
  }

  const factory = await deploy(web3, account, 'QRLatinaStaticFactory', factoryArtifact, [tokenAList, tokenBList, pairList]);
  const router = await deploy(web3, account, 'QRLatinaRouter', routerArtifact, [factory, wqrl]);
  const lens = await deploy(web3, account, 'QRLatinaAmmLens', lensArtifact);

  if (config.contracts.qrLatinaAmm && config.contracts.qrLatinaAmm.factory) {
    config.contracts.qrLatinaAmmPrevious = config.contracts.qrLatinaAmm;
  }

  config.contracts.qrLatinaAmm = {
    wqrl,
    factory,
    router,
    lens,
    factoryMode: 'static-constructor-loaded',
    pairs
  };
  config.tokens.WQRL_WRAPPED = {
    name: 'QRLatina Wrapped QRL',
    symbol: 'WQRL',
    address: wqrl
  };

  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
  console.log('Static AMM deployed');
  console.log(`Updated: ${configPath}`);
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
