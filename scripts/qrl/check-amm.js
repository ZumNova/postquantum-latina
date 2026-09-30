const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
require('./nodeCrypto');

const { Web3 } = require('@theqrl/web3');
const config = require('../../config/qrl-testnet.json');

const FACTORY_ABI = [
  {
    constant: true,
    inputs: [
      { name: '', type: 'address' },
      { name: '', type: 'address' }
    ],
    name: 'getPair',
    outputs: [{ name: '', type: 'address' }],
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'allPairsLength',
    outputs: [{ name: '', type: 'uint256' }],
    type: 'function'
  }
];

async function main() {
  const provider = process.env.QRL_PROVIDER || process.env.QRL_RPC_URL || config.provider;
  const web3 = new Web3(provider);
  const amm = config.contracts.qrLatinaAmm;

  if (!amm || !amm.factory) {
    throw new Error('Missing config.contracts.qrLatinaAmm.factory');
  }

  const factory = new web3.qrl.Contract(FACTORY_ABI, amm.factory);
  const pairs = amm.pairs || {};
  const length = await factory.methods.allPairsLength().call();

  console.log(`Provider: ${provider}`);
  console.log(`Factory: ${amm.factory}`);
  console.log(`Factory mode: ${amm.factoryMode}`);
  console.log(`Pairs length: ${length}`);

  for (const [label, configuredPair] of Object.entries(pairs)) {
    const [symbolA, symbolB] = label.split('/');
    const tokenA = symbolA === 'WQRL' ? amm.wqrl : config.tokens[symbolA].address;
    const tokenB = symbolB === 'WQRL' ? amm.wqrl : config.tokens[symbolB].address;
    const pair = await factory.methods.getPair(tokenA, tokenB).call();
    console.log(`${label}: ${pair} ${pair === configuredPair ? 'ok' : `expected ${configuredPair}`}`);
  }
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
