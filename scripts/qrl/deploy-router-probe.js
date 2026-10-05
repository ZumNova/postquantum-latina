const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
require('./nodeCrypto');

const { Web3 } = require('@theqrl/web3');
const { loadDeployer } = require('./loadDeployer');

const repoRoot = path.join(__dirname, '..', '..');
const configPath = path.join(repoRoot, 'config', 'qrl-testnet.json');
const artifactPath = path.join(repoRoot, 'out', 'QRLatinaRouterProbe.sol', 'QRLatinaRouterProbe.json');

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadArtifact() {
  if (!fs.existsSync(artifactPath)) {
    throw new Error('QRLatinaRouterProbe artifact not found. Run: forge build');
  }

  const artifact = loadJson(artifactPath);
  return {
    abi: artifact.abi,
    bytecode: artifact.bytecode.object
  };
}

async function main() {
  if (process.env.DEPLOY_CONFIRM !== 'YES') {
    throw new Error('Set DEPLOY_CONFIRM=YES to deploy QRLatinaRouterProbe on QRL testnet.');
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

  const artifact = loadArtifact();
  const contract = new web3.qrl.Contract(artifact.abi);
  const deployTx = contract.deploy({ data: artifact.bytecode, arguments: [] });

  const gas = await deployTx.estimateGas({ from: account.address });
  console.log(`QRLatinaRouterProbe estimated gas: ${gas}`);

  const deployed = await deployTx.send({
    from: account.address,
    gas: Math.floor(Number(gas) * 1.2)
  });

  const address = deployed.options.address;
  const code = await web3.qrl.getCode(address);

  if (!code || code === '0x') {
    throw new Error(`Deploy returned ${address}, but qrl_getCode returned empty bytecode.`);
  }

  config.contracts.qrLatinaAmm = {
    ...(config.contracts.qrLatinaAmm || {}),
    routerProbe: address
  };

  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);

  console.log('QRLatinaRouterProbe deployed');
  console.log(`Address: ${address}`);
  console.log(`Code bytes: ${(code.length - 2) / 2}`);
  console.log(`Updated: ${configPath}`);
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
