const config = require('../config/qrl-testnet.json');
const { readAssets } = require('../scripts/qrl/readAssets');

let cachedAssets = null;

function publicConfig() {
  return {
    provider: process.env.QRL_PROVIDER || process.env.QRL_RPC_URL || config.provider,
    chainId: config.chainId,
    wallet: process.env.CHECK_WALLET_ADDRESS || config.wallets.myQrlWallet,
    wallets: config.wallets,
    tokens: config.tokens,
    protocols: config.protocols,
    contracts: config.contracts
  };
}

function sendJson(response, statusCode, payload) {
  response.status(statusCode).json(payload);
}

async function readAssetsWithFallback() {
  try {
    cachedAssets = await readAssets();
    return cachedAssets;
  } catch (error) {
    if (cachedAssets) {
      return {
        ...cachedAssets,
        stale: true,
        warning: error.message
      };
    }

    return {
      ok: false,
      error: error.message,
      fallback: publicConfig()
    };
  }
}

module.exports = {
  publicConfig,
  readAssetsWithFallback,
  sendJson
};
