const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
require('./nodeCrypto');

const { Web3 } = require('@theqrl/web3');
const { loadDeployer } = require('./loadDeployer');

const repoRoot = path.join(__dirname, '..', '..');
const configPath = path.join(repoRoot, 'config', 'qrl-testnet.json');
const factoryArtifactPath = path.join(repoRoot, 'out', 'QRLatinaManualFactory.sol', 'QRLatinaManualFactory.json');
const pairArtifactPath = path.join(repoRoot, 'out', 'QRLatinaPair.sol', 'QRLatinaPair.json');

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function pairLabel(tokenA, tokenB) {
  return `${tokenA}/${tokenB}`;
}

function sortAddresses(addressA, addressB) {
  const valueA = BigInt(`0x${addressA.slice(1)}`);
  const valueB = BigInt(`0x${addressB.slice(1)}`);
  return valueA < valueB ? [addressA, addressB] : [addressB, addressA];
}

async function deployPair(web3, account, pairArtifact, token0, token1) {
  const contract = new web3.qrl.Contract(pairArtifact.abi);
  const deployTx = contract.deploy({
    data: pairArtifact.bytecode.object,
    arguments: []
  });

  const deployGas = await deployTx.estimateGas({ from: account.address });
  console.log(`Pair deploy estimated gas: ${deployGas}`);

  const deployed = await deployTx.send({
    from: account.address,
    gas: Math.floor(Number(deployGas) * 1.2)
  });

  const pair = new web3.qrl.Contract(pairArtifact.abi, deployed.options.address);
  const initTx = pair.methods.initialize(token0, token1);
  const initGas = await initTx.estimateGas({ from: account.address });
  console.log(`Pair initialize estimated gas: ${initGas}`);

  await initTx.send({
    from: account.address,
    gas: Math.floor(Number(initGas) * 1.2)
  });

  return deployed.options.address;
}

async function getOrCreatePair(web3, factory, account, pairArtifact, tokenA, tokenB, addressA, addressB) {
  const existing = await factory.methods.getPair(addressA, addressB).call();

  if (existing && existing !== 'Q0000000000000000000000000000000000000000' && existing !== '0x0000000000000000000000000000000000000000') {
    return {
      label: pairLabel(tokenA, tokenB),
      pair: existing,
      created: false
    };
  }

  const [token0, token1] = sortAddresses(addressA, addressB);
  const pair = await deployPair(web3, account, pairArtifact, token0, token1);
  const tx = factory.methods.registerPair(addressA, addressB, pair);
  const gas = await tx.estimateGas({ from: account.address });
  console.log(`${pairLabel(tokenA, tokenB)} register estimated gas: ${gas}`);

  const receipt = await tx.send({
    from: account.address,
    gas: Math.floor(Number(gas) * 1.2)
  });

  const registered = await factory.methods.getPair(addressA, addressB).call();

  return {
    label: pairLabel(tokenA, tokenB),
    pair: registered,
    created: true,
    txHash: receipt.transactionHash
  };
}

async function main() {
  if (process.env.CREATE_PAIRS_CONFIRM !== 'YES') {
    throw new Error('Set CREATE_PAIRS_CONFIRM=YES to create AMM pairs on QRL testnet.');
  }

  const config = loadJson(configPath);
  const provider = process.env.QRL_PROVIDER || process.env.QRL_RPC_URL || config.provider;
  const web3 = new Web3(provider);

  const amm = config.contracts.qrLatinaAmm;
  if (!amm || !amm.factory || !amm.wqrl) {
    throw new Error('Missing config.contracts.qrLatinaAmm.factory/wqrl. Run deploy:amm:qrl first.');
  }

  if (!fs.existsSync(factoryArtifactPath)) {
    throw new Error('QRLatinaManualFactory artifact not found. Run: forge build');
  }

  if (!fs.existsSync(pairArtifactPath)) {
    throw new Error('QRLatinaPair artifact not found. Run: forge build');
  }

  console.log(`Provider: ${provider}`);
  const chainId = await web3.qrl.getChainId();
  console.log(`Chain ID: ${chainId}`);

  if (Number(chainId) !== Number(config.chainId)) {
    throw new Error(`Unexpected chain ID ${chainId}; expected ${config.chainId}`);
  }

  const account = loadDeployer(web3, process.env.TESTNET_SEED);
  console.log(`Deployer: ${account.address}`);

  const artifact = loadJson(factoryArtifactPath);
  const pairArtifact = loadJson(pairArtifactPath);
  const factory = new web3.qrl.Contract(artifact.abi, amm.factory);

  const tokens = {
    QRLAT: config.tokens.QRLAT.address,
    QETH: config.tokens.QETH.address,
    QZD: config.tokens.QZD.address,
    WQRL: amm.wqrl
  };

  const pairsToCreate = [
    ['QRLAT', 'QETH'],
    ['QRLAT', 'QZD'],
    ['QRLAT', 'WQRL'],
    ['QETH', 'QZD'],
    ['QETH', 'WQRL'],
    ['QZD', 'WQRL']
  ];

  amm.pairs = amm.pairs || {};

  for (const [tokenA, tokenB] of pairsToCreate) {
    const result = await getOrCreatePair(web3, factory, account, pairArtifact, tokenA, tokenB, tokens[tokenA], tokens[tokenB]);
    amm.pairs[result.label] = result.pair;
    console.log(`${result.created ? 'Created' : 'Exists'} ${result.label}: ${result.pair}`);
    if (result.txHash) {
      console.log(`Tx: ${result.txHash}`);
    }
  }

  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);

  console.log('Pairs ready');
  console.log(`Updated: ${configPath}`);
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
