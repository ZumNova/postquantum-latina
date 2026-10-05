const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..', '..');
const sourcePath = path.join(repoRoot, 'hyperion', 'QRLatinaRouterProbe.hyp');
const outputDir = path.join(repoRoot, 'artifacts', 'hyperion');
const outputPath = path.join(outputDir, 'QRLatinaRouterProbe.json');

function loadHypc() {
  try {
    return require('@theqrl/hypc');
  } catch (error) {
    throw new Error('Missing @theqrl/hypc. Install it with: npm install --save-dev @theqrl/hypc');
  }
}

function main() {
  const hypc = loadHypc();
  const source = fs.readFileSync(sourcePath, 'utf8');
  const input = {
    language: 'Hyperion',
    sources: {
      'QRLatinaRouterProbe.hyp': { content: source }
    },
    settings: {
      outputSelection: {
        '*': {
          '*': ['*']
        }
      }
    }
  };

  const output = JSON.parse(hypc.compile(JSON.stringify(input)));
  const errors = output.errors || [];
  const failures = errors.filter(item => item.severity === 'error');

  for (const item of errors) {
    const label = item.severity || 'info';
    console.error(`[${label}] ${item.formattedMessage || item.message}`);
  }

  if (failures.length) {
    process.exit(1);
  }

  const artifact = output.contracts['QRLatinaRouterProbe.hyp'].QRLatinaRouterProbe;
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(
    outputPath,
    `${JSON.stringify({
      contractName: 'QRLatinaRouterProbe',
      sourceName: 'QRLatinaRouterProbe.hyp',
      abi: artifact.abi,
      bytecode: artifact.zvm.bytecode.object,
      deployedBytecode: artifact.zvm.deployedBytecode && artifact.zvm.deployedBytecode.object
    }, null, 2)}\n`
  );

  console.log(`Wrote ${outputPath}`);
  console.log(`Bytecode bytes: ${artifact.zvm.bytecode.object.length / 2}`);
}

main();
