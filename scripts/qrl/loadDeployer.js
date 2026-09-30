const { MLDSA87 } = require('@theqrl/wallet.js');

const MNEMONIC_WORDS = 34;

function normalizeHexSeed(hexseed) {
  if (!hexseed) {
    return '';
  }

  return hexseed.trim().replace(/^["']|["']$/g, '');
}

function seedFromMnemonic(mnemonic) {
  if (!mnemonic || mnemonic.trim().split(/\s+/).length !== MNEMONIC_WORDS) {
    return '';
  }

  const wallet = MLDSA87.newWalletFromMnemonic(mnemonic);
  return wallet.getHexExtendedSeed();
}

function loadDeployer(web3, seedInput) {
  const seedHex = normalizeHexSeed(process.env.TESTNET_HEXSEED) || seedFromMnemonic(seedInput);

  if (!seedHex) {
    throw new Error(
      `Set TESTNET_HEXSEED or TESTNET_SEED. TESTNET_SEED must be a ${MNEMONIC_WORDS}-word QRL wallet mnemonic.`
    );
  }

  const account = web3.qrl.accounts.seedToAccount(seedHex);

  web3.qrl.accounts.wallet.add(account);

  if (web3.qrl.wallet && typeof web3.qrl.wallet.add === 'function') {
    web3.qrl.wallet.add(seedHex);
  }

  return account;
}

module.exports = { loadDeployer };
