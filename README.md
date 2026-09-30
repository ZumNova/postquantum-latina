# Dapp Post Cuantica

Base de pruebas para QRL/Zond testnet.

Objetivo inmediato:

- Crear un token ERC20 de prueba (`PQD`).
- Desplegarlo sobre un RPC QRL/Zond configurable.
- Preparar integracion con ZondSwap cuando tengamos router/factory oficiales.
- Mantener pruebas locales con Foundry para validar el contrato antes de tocar testnet.

## Configuracion

Copiar `.env.example` a `.env` y completar:

```shell
PRIVATE_KEY=
TESTNET_SEED=
TESTNET_HEXSEED=
RPC_URL=http://127.0.0.1:8545
QRL_PROVIDER=https://qrlwallet.com/api/qrl-rpc/testnet

ZONDSWAP_ROUTER=
ZONDSWAP_FACTORY=
WZND=
PQD_TOKEN=
```

`RPC_URL` queda para Foundry/anvil/nodo local. El RPC publico que vimos funcionando con metodos QRL nativos es:

```text
https://qrlwallet.com/api/qrl-rpc/testnet
```

Ese endpoint no acepta todos los metodos Ethereum clasicos (`eth_chainId` falla), por eso el flujo QRL nativo usa `QRL_PROVIDER` + `@theqrl/web3`.

## Flujo QRL Nativo

Instalar dependencias:

```shell
nvm use
npm install
```

El flujo QRL nativo requiere Node.js 18 o superior.

Verificar red:

```shell
npm run check:qrl
```

Verificar wallet derivada y saldo:

```shell
npm run check:wallet
```

Leer saldos de la wallet y tokens configurados:

```shell
npm run check:assets
```

Compilar Solidity con Foundry:

```shell
forge build
```

Desplegar `PQD` usando QRL wallet seed:

```shell
npm run deploy:pqd:qrl
```

Ese deploy usa `TESTNET_HEXSEED` si esta definido; si no, usa `TESTNET_SEED`, que debe ser el mnemonic QRL de 34 palabras. No subas ninguno a git.

## QuantaSwap

QuantaSwap no es un AMM ni un bridge custodial. Es un protocolo de atomic swaps con HTLCs desplegados en QRL v2 testnet y Ethereum Sepolia.

Direcciones actuales tomadas de `DigitalGuards/QuantaSwap`:

```text
QRL v2 testnet HTLC: Q238322ad2e8f935b4481fcc379779c31b84decb0
Sepolia HTLC:        0x910D5d4a7f2037c01F3B4C835167357e89909281
```

Variables compatibles:

```shell
QRL_RPC_URL=https://qrlwallet.com/api/qrl-rpc/testnet
QRL_HEXSEED=
ETH_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
ETH_PRIVATE_KEY=
```

No pegues `QRL_HEXSEED` ni `ETH_PRIVATE_KEY` en chat ni en archivos versionados.

## QRLatina Pool

`QRLatinaPool` es el primer pool propio del proyecto. Permite stakear un QRC20/ERC20 y distribuir rewards en otro QRC20/ERC20.

Configuracion sugerida para testnet:

```shell
POOL_STAKING_TOKEN=Qa365cc5d87447b56e1f637bf4252e5859f9b8f4d # QRLAT
POOL_REWARD_TOKEN=Q5ba50be0ea713b0c0d4a73fe42903a1ae2f6a8ac  # QETH
```

Deploy:

```shell
forge script script/DeployQRLatinaPool.s.sol:DeployQRLatinaPool \
  --rpc-url "$RPC_URL" \
  --broadcast
```

## QRLatina AMM

Si no hay router publico en QRL/Zond testnet, el flujo propio minimo es:

```text
desplegar WQRL
desplegar Factory
desplegar Router
crear pares iniciales
agregar liquidez
```

Contratos:

```text
src/amm/QRLatinaWQRL.sol
src/amm/QRLatinaFactory.sol
src/amm/QRLatinaPair.sol
src/amm/QRLatinaRouter.sol
src/amm/QRLatinaAmmLens.sol
```

Deploy:

```shell
forge script script/DeployQRLatinaAMM.s.sol:DeployQRLatinaAMM \
  --rpc-url "$RPC_URL" \
  --broadcast
```

Ese script usa `PRIVATE_KEY` y sirve para un RPC EVM-compatible. Para el endpoint publico de QRL testnet que venimos usando, primero hay que confirmar si acepta envio de transacciones EVM firmadas; si no, el deploy debe hacerse con un script Node usando `@theqrl/web3` y `TESTNET_HEXSEED`.

Deploy QRL nativo:

```shell
npm run build:solidity
DEPLOY_CONFIRM=YES npm run deploy:amm:qrl
CREATE_PAIRS_CONFIRM=YES npm run create:pairs:qrl
```

Los comandos de deploy tienen confirmacion explicita para evitar transacciones accidentales. Si estas cargando variables desde `.env`:

```shell
DEPLOY_CONFIRM=YES npm run deploy:amm:qrl
CREATE_PAIRS_CONFIRM=YES npm run create:pairs:qrl
```

Tambien se puede guardar temporalmente en `.env`:

```shell
DEPLOY_CONFIRM=YES
CREATE_PAIRS_CONFIRM=YES
```

Flujo completo:

```shell
npm run build:solidity
npm run deploy:amm:qrl
npm run create:pairs:qrl
```

`deploy:amm:qrl` despliega `WQRL`, `Factory`, `Router` y `Lens`. En QRL testnet usamos una factory manual: cada `Pair` se despliega como contrato normal y luego se registra, porque el RPC acepto deploys directos pero rechazo `Factory.createPair()` con deploy interno. `create:pairs:qrl` crea los pares iniciales:

```text
QRLAT/QETH
QRLAT/QZD
QRLAT/WQRL
QETH/QZD
QETH/WQRL
QZD/WQRL
```

`QRL` nativo entra al AMM mediante `WQRL`; no se crea un par directo con QRL nativo porque el `Pair` trabaja con tokens.

Crear los primeros mercados:

```shell
forge script script/SeedQRLatinaMarkets.s.sol:SeedQRLatinaMarkets \
  --rpc-url "$RPC_URL" \
  --broadcast
```

El precio inicial del AMM sale de la liquidez bloqueada. Por ejemplo, si se agregan `1000 QRLAT` y `1000 QETH`, el precio spot inicial es `1 QRLAT = 1 QETH` antes de fees y slippage. `QRLatinaAmmLens` permite leer reservas, precio spot y cotizaciones de swap sin mover fondos.

Para usar un precio externo de Quanta/QRL como oracle hay que identificar primero una fuente on-chain verificable o un contrato oracle oficial. Un precio tomado de un frontend, explorador o API publica sirve como referencia visual, pero no deberia decidir swaps ni liquidaciones dentro del contrato.

## Token De Prueba

Contrato:

```text
src/PostQuantumToken.sol
```

Deploy local/testnet:

```shell
set -a
source .env
set +a

forge script script/DeployPostQuantumToken.s.sol:DeployPostQuantumToken \
  --rpc-url "$RPC_URL" \
  --broadcast
```

## Verificar ZondSwap

Cuando tengas `ZONDSWAP_ROUTER` y `PQD_TOKEN`:

```shell
set -a
source .env
set +a

forge script script/CheckZondSwap.s.sol:CheckZondSwap \
  --rpc-url "$RPC_URL"
```

Ese script consulta:

- `router.factory()`
- `router.WETH()`
- `factory.getPair(PQD_TOKEN, WZND)`

Solo sirve si ZondSwap usa ABI compatible con Uniswap V2. Antes de enviar liquidez o swaps, hay que validar esas llamadas de lectura.

## Foundry

**Foundry is a blazing fast, portable and modular toolkit for Ethereum application development written in Rust.**

Foundry consists of:

- **Forge**: Ethereum testing framework (like Truffle, Hardhat and DappTools).
- **Cast**: Swiss army knife for interacting with EVM smart contracts, sending transactions and getting chain data.
- **Anvil**: Local Ethereum node, akin to Ganache, Hardhat Network.
- **Chisel**: Fast, utilitarian, and verbose solidity REPL.

## Documentation

https://book.getfoundry.sh/

## Usage

### Build

```shell
$ forge build
```

### Test

```shell
$ forge test
```

### Format

```shell
$ forge fmt
```

### Gas Snapshots

```shell
$ forge snapshot
```

### Anvil

```shell
$ anvil
```

### Deploy

```shell
$ forge script script/Counter.s.sol:CounterScript --rpc-url <your_rpc_url> --private-key <your_private_key>
```

### Cast

```shell
$ cast <subcommand>
```

### Help

```shell
$ forge --help
$ anvil --help
$ cast --help
```
