const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
require('./nodeCrypto');

const { Web3 } = require('@theqrl/web3');
const { loadDeployer } = require('./loadDeployer');

const repoRoot = path.join(__dirname, '..', '..');
const configPath = path.join(repoRoot, 'config', 'qrl-testnet.json');
const artifactPath = path.join(repoRoot, 'out', 'PostQuantumToken.sol', 'PostQuantumToken.json');

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadArtifact() {
  if (!fs.existsSync(artifactPath)) {
    throw new Error('PostQuantumToken artifact not found. Run: forge build');
  }

  const artifact = loadJson(artifactPath);
  return {
    abi: artifact.abi,
    bytecode: artifact.bytecode.object
  };
}

async function main() {
  const config = loadJson(configPath);
  const provider = process.env.QRL_PROVIDER || config.provider;
  const mnemonic = process.env.TESTNET_SEED;

  if (!mnemonic) {
    throw new Error('TESTNET_SEED is required in .env for QRL native deployment');
  }

  const web3 = new Web3(provider);

  console.log(`Provider: ${provider}`);
  const chainId = await web3.qrl.getChainId();
  console.log(`Chain ID: ${chainId}`);

  if (Number(chainId) !== Number(config.chainId)) {
    throw new Error(`Unexpected chain ID ${chainId}; expected ${config.chainId}`);
  }

  const account = loadDeployer(web3, mnemonic);
  console.log(`Deployer: ${account.address}`);

  const balance = await web3.qrl.getBalance(account.address);
  console.log(`Balance: ${web3.utils.fromPlanck(balance, 'quanta')} QRL`);

  const artifact = loadArtifact();
  const tokenName = process.env.TOKEN_NAME || 'Post Quantum Demo';
  const tokenSymbol = process.env.TOKEN_SYMBOL || 'PQD';
  const initialSupply = process.env.TOKEN_INITIAL_SUPPLY || '1000000000000000000000000';

  const contract = new web3.qrl.Contract(artifact.abi);
  const deployTx = contract.deploy({
    data: artifact.bytecode,
    arguments: [tokenName, tokenSymbol, initialSupply, account.address]
  });

  const gas = await deployTx.estimateGas({ from: account.address });
  console.log(`Estimated gas: ${gas}`);

  const deployed = await deployTx.send({
    from: account.address,
    gas: Math.floor(Number(gas) * 1.2)
  });

  config.contracts.pqdToken = deployed.options.address;
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  console.log('PQD deployed');
  console.log(`Address: ${deployed.options.address}`);
  console.log(`Updated: ${configPath}`);
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
