const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..', '..');
const frontendRoot = path.join(repoRoot, 'frontend');
const vendorRoot = path.join(frontendRoot, 'vendor_modules');

function copyPackage(from, to) {
  const source = path.join(repoRoot, from);
  const target = path.join(vendorRoot, to);
  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(source, target, { recursive: true });
}

function copyFile(from, to) {
  const source = path.join(repoRoot, from);
  const target = path.join(vendorRoot, to);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

fs.rmSync(vendorRoot, { recursive: true, force: true });
fs.mkdirSync(vendorRoot, { recursive: true });

copyFile('node_modules/@qrlwallet/connect/dist/index.mjs', '@qrlwallet/connect/dist/index.mjs');
copyPackage('node_modules/@qrlwallet/connect/node_modules/@noble/hashes', '@noble/hashes');
copyPackage('node_modules/@qrlwallet/connect/node_modules/@theqrl/mldsa87/dist/mjs', '@theqrl/mldsa87/dist/mjs');
copyPackage('node_modules/@noble/post-quantum', '@noble/post-quantum');
copyPackage('node_modules/socket.io-client/build/esm', 'socket.io-client/build/esm');
copyPackage('node_modules/engine.io-client/build/esm', 'engine.io-client/build/esm');
copyPackage('node_modules/engine.io-parser/build/esm', 'engine.io-parser/build/esm');
copyPackage('node_modules/socket.io-parser/build/esm', 'socket.io-parser/build/esm');
copyPackage('node_modules/@socket.io/component-emitter/lib/esm', '@socket.io/component-emitter/lib/esm');

copyFile(
  'node_modules/engine.io-client/build/esm/globals.js',
  'engine.io-client/build/esm/globals.node.js'
);
copyFile(
  'node_modules/engine.io-client/build/esm/transports/polling-xhr.js',
  'engine.io-client/build/esm/transports/polling-xhr.node.js'
);
copyFile(
  'node_modules/engine.io-client/build/esm/transports/websocket.js',
  'engine.io-client/build/esm/transports/websocket.node.js'
);

console.log(`Prepared frontend vendor modules in ${path.relative(repoRoot, vendorRoot)}`);
