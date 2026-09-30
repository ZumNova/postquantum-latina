const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
require('./nodeCrypto');

const { Web3 } = require('@theqrl/web3');
const config = require('../../config/qrl-testnet.json');

const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    type: 'function'
  }
];

function formatUnits(value, decimals) {
  const raw = BigInt(value.toString());
  const scale = 10n ** BigInt(decimals);
  const whole = raw / scale;
  const fraction = raw % scale;

  if (fraction === 0n) {
    return whole.toString();
  }

  const padded = fraction.toString().padStart(decimals, '0').replace(/0+$/, '');
  return `${whole}.${padded}`;
}

async function readOptional(fn, fallback) {
  try {
    return await fn();
  } catch (error) {
    return fallback;
  }
}

async function readToken(web3, wallet, configuredSymbol, token) {
  const contract = new web3.qrl.Contract(ERC20_ABI, token.address);
  const code = await readOptional(() => web3.qrl.getCode(token.address), '0x');
  const hasCode = Boolean(code && code !== '0x');

  if (!hasCode) {
    return {
      configuredSymbol,
      configuredName: token.name,
      configuredAddress: token.address,
      address: token.address,
      hasCode,
      error: 'no contract code at address'
    };
  }

  const values = await Promise.all([
    readOptional(() => contract.methods.name().call(), token.name),
    readOptional(() => contract.methods.symbol().call(), token.symbol),
    readOptional(() => contract.methods.decimals().call(), 18),
    contract.methods.balanceOf(wallet).call()
  ]);

  const decimals = Number(values[2]);

  return {
    configuredSymbol,
    configuredName: token.name,
    configuredAddress: token.address,
    address: token.address,
    hasCode,
    name: values[0],
    symbol: values[1],
    decimals,
    balanceRaw: values[3].toString(),
    balance: formatUnits(values[3], decimals)
  };
}

async function readAssets() {
  const provider = process.env.QRL_PROVIDER || process.env.QRL_RPC_URL || config.provider;
  const wallet = process.env.CHECK_WALLET_ADDRESS || config.wallets.myQrlWallet;
  const web3 = new Web3(provider);

  const chainId = await web3.qrl.getChainId();
  const blockNumber = await web3.qrl.getBlockNumber();
  const nativeRaw = await web3.qrl.getBalance(wallet);
  const tokens = [];

  for (const entry of Object.entries(config.tokens || {})) {
    const symbol = entry[0];
    const token = entry[1];
    try {
      tokens.push(await readToken(web3, wallet, symbol, token));
    } catch (error) {
      tokens.push({
        configuredSymbol: symbol,
        configuredName: token.name,
        configuredAddress: token.address,
        address: token.address,
        hasCode: false,
        error: error.message
      });
    }
  }

  return {
    provider,
    chainId: Number(chainId),
    blockNumber: Number(blockNumber),
    wallet,
    native: {
      symbol: 'QRL',
      decimals: 18,
      balanceRaw: nativeRaw.toString(),
      balance: formatUnits(nativeRaw, 18)
    },
    tokens,
    protocols: config.protocols
  };
}

module.exports = {
  ERC20_ABI,
  formatUnits,
  readAssets
};
