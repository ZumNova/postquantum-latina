const fs = require('fs');
const http = require('http');
const path = require('path');
const { readAssets } = require('./readAssets');

const repoRoot = path.join(__dirname, '..', '..');
const frontendRoot = path.join(repoRoot, 'frontend');
const nodeModulesRoot = path.join(repoRoot, 'node_modules');
const config = require('../../config/qrl-testnet.json');
const port = Number(process.env.FRONTEND_PORT || 5173);
let cachedAssets = null;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8'
};

const browserModuleAliases = {
  '/node_modules/engine.io-client/build/esm/globals.node.js':
    '/node_modules/engine.io-client/build/esm/globals.js',
  '/node_modules/engine.io-client/build/esm/transports/polling-xhr.node.js':
    '/node_modules/engine.io-client/build/esm/transports/polling-xhr.js',
  '/node_modules/engine.io-client/build/esm/transports/websocket.node.js':
    '/node_modules/engine.io-client/build/esm/transports/websocket.js'
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  });
  response.end(JSON.stringify(payload, null, 2));
}

function sendFile(response, filePath) {
  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }

    response.writeHead(200, {
      'content-type': mimeTypes[path.extname(filePath)] || 'application/octet-stream',
      'cache-control': 'no-store'
    });
    response.end(content);
  });
}

function publicConfig() {
  return {
    provider: process.env.QRL_PROVIDER || process.env.QRL_RPC_URL || config.provider,
    chainId: config.chainId,
    wallet: config.wallets.myQrlWallet,
    tokens: config.tokens,
    protocols: config.protocols,
    contracts: config.contracts
  };
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);

  if (url.pathname === '/api/health') {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (url.pathname === '/api/config') {
    sendJson(response, 200, publicConfig());
    return;
  }

  if (url.pathname === '/api/amm') {
    const publicData = publicConfig();
    sendJson(response, 200, publicData.contracts.qrLatinaAmm || null);
    return;
  }

  if (url.pathname === '/api/assets') {
    try {
      cachedAssets = await readAssets();
      sendJson(response, 200, cachedAssets);
    } catch (error) {
      if (cachedAssets) {
        sendJson(response, 200, {
          ...cachedAssets,
          stale: true,
          warning: error.message
        });
        return;
      }

      sendJson(response, 200, {
        ok: false,
        error: error.message,
        fallback: publicConfig()
      });
    }
    return;
  }

  const browserPath = browserModuleAliases[url.pathname] || url.pathname;

  if (browserPath.startsWith('/node_modules/')) {
    const packagePath = browserPath.replace('/node_modules/', '');
    const normalizedPackagePath = path.normalize(decodeURIComponent(packagePath)).replace(/^(\.\.[/\\])+/, '');
    const modulePath = path.join(nodeModulesRoot, normalizedPackagePath);

    if (!modulePath.startsWith(nodeModulesRoot)) {
      response.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Forbidden');
      return;
    }

    sendFile(response, modulePath);
    return;
  }

  const requestedPath = url.pathname === '/' ? '/index.html' : url.pathname;
  const normalized = path.normalize(decodeURIComponent(requestedPath)).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(frontendRoot, normalized);

  if (!filePath.startsWith(frontendRoot)) {
    response.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Forbidden');
    return;
  }

  sendFile(response, filePath);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`QRLatina frontend: http://127.0.0.1:${port}`);
  console.log(`Assets API: http://127.0.0.1:${port}/api/assets`);
});
