const fs = require('fs');
const path = require('path');
const { AbiCoder, parseUnits } = require('ethers');

const artifactPath = path.join(
  process.cwd(),
  'config',
  'deploy-artifacts',
  'QIP55TestToken.json'
);

function sanitizeText(value, fallback, maxLength) {
  const text = String(value || fallback).trim();
  return text.slice(0, maxLength) || fallback;
}

function handler(request, response) {
  if (!fs.existsSync(artifactPath)) {
    response.status(500).json({
      ok: false,
      error: 'QIP55TestToken deploy artifact not found.'
    });
    return;
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  const bytecode = artifact.bytecode && artifact.bytecode.object;

  if (!bytecode || bytecode === '0x') {
    response.status(500).json({
      ok: false,
      error: 'QIP55TestToken bytecode is empty.'
    });
    return;
  }

  const name = sanitizeText(request.query.name, 'QRLatina Test Token', 64);
  const symbol = sanitizeText(request.query.symbol, 'QRLATX', 16).toUpperCase();
  const supply = sanitizeText(request.query.supply, '1000000', 32);
  const initialSupply = parseUnits(supply, 18);
  const constructorArgs = AbiCoder.defaultAbiCoder().encode(
    ['string', 'string', 'uint256'],
    [name, symbol, initialSupply]
  );

  response.status(200).json({
    ok: true,
    contract: 'QIP55TestToken',
    name,
    symbol,
    decimals: 18,
    supply,
    initialSupply: initialSupply.toString(),
    data: `${bytecode}${constructorArgs.slice(2)}`
  });
}

module.exports = handler;
