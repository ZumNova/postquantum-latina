const tokenMeta = {
  QRLAT: { priceHint: 1, seedLiquidityUsd: 1000 },
  QETH: { priceHint: 1, seedLiquidityUsd: 1000 },
  QZD: { priceHint: 0.25, seedLiquidityUsd: 1000 },
  WQRL: { priceHint: 0.77, seedLiquidityUsd: 770 },
  QRL: { priceHint: 0.77, seedLiquidityUsd: 770 }
};

const tokenOrder = ["QRLAT", "QETH", "QZD", "WQRL", "QRL"];
const pools = buildPools(tokenOrder);

const amountIn = document.querySelector("#amount-in");
const amountOut = document.querySelector("#amount-out");
const tokenIn = document.querySelector("#token-in");
const tokenOut = document.querySelector("#token-out");
const spotPrice = document.querySelector("#spot-price");
const priceImpact = document.querySelector("#price-impact");
const feePaid = document.querySelector("#fee-paid");
const lockedValue = document.querySelector("#locked-value");
const qethRatio = document.querySelector("#qeth-ratio");
const wqrlRatio = document.querySelector("#wqrl-ratio");
const walletLabel = document.querySelector("#wallet-label");
const networkState = document.querySelector("#network-state");
const blockLabel = document.querySelector("#block-label");
const marketsCount = document.querySelector("#markets-count");
const marketsLabel = document.querySelector("#markets-label");
const balanceQrl = document.querySelector("#balance-qrl");
const balanceQrlat = document.querySelector("#balance-qrlat");
const balanceQeth = document.querySelector("#balance-qeth");
const balanceWqrl = document.querySelector("#balance-wqrl");
const balanceQzd = document.querySelector("#balance-qzd");
const pairStatus = document.querySelector("#pair-status");
const marketStrip = document.querySelector("#market-strip");
const contractList = document.querySelector("#contract-list");
const pairList = document.querySelector("#pair-list");
const pairCountLabel = document.querySelector("#pair-count-label");
const ammMode = document.querySelector("#amm-mode");
const factoryModeLabel = document.querySelector("#factory-mode-label");
const qrlConnectStatus = document.querySelector("#qrl-connect-status");
const qrlConnectButton = document.querySelector("#qrl-connect-button");
const qrlRequestAccounts = document.querySelector("#qrl-request-accounts");
const qrlConnectCode = document.querySelector("#qrl-connect-code");
const copyQrlCode = document.querySelector("#copy-qrl-code");
const openQrlWallet = document.querySelector("#open-qrl-wallet");
const qrlConnectedAccount = document.querySelector("#qrl-connected-account");
const approveTokenSelect = document.querySelector("#approve-token-select");
const approveTestButton = document.querySelector("#approve-test-button");
const qrlConnectResult = document.querySelector("#qrl-connect-result");

let qrlProvider = null;
let connectedQrlAccount = "";
let publicConfigCache = null;
let qrlConnectModulePromise = null;

walletLabel.textContent = "QRL testnet";
networkState.textContent = "Testnet";
blockLabel.textContent = "Leyendo saldos";

function formatAmount(value, digits = 4) {
  const safeValue = Number.isFinite(Number(value)) ? Number(value) : 0;
  const maxDigits = Math.max(0, Math.min(20, Number.isFinite(Number(digits)) ? Number(digits) : 4));
  const minDigits = Math.min(maxDigits, safeValue > 0 && safeValue < 1 ? 4 : 2);

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: maxDigits,
    minimumFractionDigits: minDigits
  }).format(safeValue);
}

function compactAddress(address) {
  if (!address || address.length < 12) return address || "Sin wallet";
  return `${address.slice(0, 5)}...${address.slice(-4)}`;
}

function copyText(value) {
  if (navigator.clipboard && value) return navigator.clipboard.writeText(value);
  return Promise.resolve();
}

function compactBalance(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return value || "0";
  return formatAmount(number, number >= 1000 ? 2 : 6);
}

function buildPools(symbols) {
  const result = {};

  symbols.forEach((base, baseIndex) => {
    symbols.slice(baseIndex + 1).forEach(quoteToken => {
      const baseMeta = tokenMeta[base];
      const quoteMeta = tokenMeta[quoteToken];
      const lockedUsd = Math.min(baseMeta.seedLiquidityUsd, quoteMeta.seedLiquidityUsd);

      result[pairKey(base, quoteToken)] = {
        tokenA: base,
        tokenB: quoteToken,
        reserveA: lockedUsd / baseMeta.priceHint,
        reserveB: lockedUsd / quoteMeta.priceHint,
        lockedUsd,
        status: "simulado"
      };
    });
  });

  return result;
}

function pairKey(tokenA, tokenB) {
  return [tokenA, tokenB].sort().join("-");
}

function getPool(inputSymbol, outputSymbol) {
  const pool = pools[pairKey(inputSymbol, outputSymbol)];
  if (!pool) return null;

  if (pool.tokenA === inputSymbol) {
    return {
      in: inputSymbol,
      out: outputSymbol,
      reserveIn: pool.reserveA,
      reserveOut: pool.reserveB,
      lockedUsd: pool.lockedUsd,
      status: pool.status
    };
  }

  return {
    in: inputSymbol,
    out: outputSymbol,
    reserveIn: pool.reserveB,
    reserveOut: pool.reserveA,
    lockedUsd: pool.lockedUsd,
    status: pool.status
  };
}

function quote(amount, reserveIn, reserveOut) {
  if (!amount || amount <= 0) return 0;
  const amountWithFee = amount * 997;
  return (amountWithFee * reserveOut) / (reserveIn * 1000 + amountWithFee);
}

function updateQuote() {
  if (tokenIn.value === tokenOut.value) {
    tokenOut.value = tokenOrder.find(symbol => symbol !== tokenIn.value) || "QETH";
  }

  const pool = getPool(tokenIn.value, tokenOut.value);
  if (!pool || pool.in === pool.out) {
    amountOut.value = "0";
    spotPrice.textContent = "Par no disponible";
    priceImpact.textContent = "0%";
    feePaid.textContent = `0 ${tokenIn.value}`;
    pairStatus.textContent = "No disponible";
    return;
  }

  if (pool.status === "on-chain sin liquidez") {
    amountOut.value = "0";
    spotPrice.textContent = "Par on-chain sin liquidez";
    priceImpact.textContent = "0%";
    feePaid.textContent = `0 ${tokenIn.value}`;
    pairStatus.textContent = "Sin liquidez";
    lockedValue.textContent = `$${formatAmount(totalLockedUsd(), 2)}`;
    qethRatio.textContent = formatAmount(getSpot("QRLAT", "QETH"), 4);
    wqrlRatio.textContent = formatAmount(getSpot("QRLAT", "WQRL"), 4);
    return;
  }

  const value = Number(amountIn.value);
  const output = quote(value, pool.reserveIn, pool.reserveOut);
  const spot = pool.reserveOut / pool.reserveIn;
  const execution = output > 0 && value > 0 ? output / value : 0;
  const impact = spot > 0 ? Math.max(0, (1 - execution / spot) * 100) : 0;

  amountOut.value = formatAmount(output, 6);
  spotPrice.textContent = `1 ${tokenIn.value} = ${formatAmount(spot, 6)} ${tokenOut.value}`;
  priceImpact.textContent = `${formatAmount(impact, 2)}%`;
  feePaid.textContent = `${formatAmount(value * 0.003, 6)} ${tokenIn.value}`;
  pairStatus.textContent = pool.status === "live" ? "On-chain" : "Simulado";
  lockedValue.textContent = `$${formatAmount(totalLockedUsd(), 2)}`;
  qethRatio.textContent = formatAmount(getSpot("QRLAT", "QETH"), 4);
  wqrlRatio.textContent = formatAmount(getSpot("QRLAT", "WQRL"), 4);
}

function getSpot(inputSymbol, outputSymbol) {
  const pool = getPool(inputSymbol, outputSymbol);
  if (!pool || !pool.reserveIn || !pool.reserveOut) return 0;
  return pool.reserveOut / pool.reserveIn;
}

function totalLockedUsd() {
  return Object.values(pools).reduce((total, pool) => total + pool.lockedUsd, 0);
}

function renderMarkets() {
  marketStrip.innerHTML = "";

  Object.values(pools).forEach(pool => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `${pool.tokenA}/${pool.tokenB}`;
    button.addEventListener("click", () => {
      tokenIn.value = pool.tokenA;
      tokenOut.value = pool.tokenB;
      updateQuote();
    });
    marketStrip.appendChild(button);
  });
}

function renderContracts(amm) {
  if (!amm) return;

  const contracts = [
    ["WQRL", amm.wqrl],
    ["Factory", amm.factory],
    ["Router", amm.router],
    ["Lens", amm.lens]
  ];

  ammMode.textContent = amm.factoryMode || "on-chain";
  factoryModeLabel.textContent =
    amm.factoryMode === "static-constructor-loaded" ? "Factory estatica con 6 pares reales" : "Factory desplegada";

  contractList.innerHTML = "";
  contracts.forEach(([label, address]) => {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "copy-row";
    row.title = `Copiar ${label}`;
    row.innerHTML = `<span>${label}</span><strong>${compactAddress(address)}</strong>`;
    row.addEventListener("click", () => copyText(address));
    contractList.appendChild(row);
  });

  const entries = Object.entries(amm.pairs || {});
  pairCountLabel.textContent = String(entries.length);
  pairList.innerHTML = "";

  entries.forEach(([label, address]) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "pair-row";
    item.title = `Copiar ${label}`;
    item.innerHTML = `<span>${label}</span><strong>${compactAddress(address)}</strong><em>sin liquidez</em>`;
    item.addEventListener("click", () => copyText(address));
    pairList.appendChild(item);

    const [tokenA, tokenB] = label.split("/");
    const pool = pools[pairKey(tokenA, tokenB)];
    if (pool) {
      pool.status = "on-chain sin liquidez";
      pool.address = address;
      pool.reserveA = 0;
      pool.reserveB = 0;
      pool.lockedUsd = 0;
    }
  });

  marketsCount.textContent = String(entries.length);
  marketsLabel.textContent = "Pares on-chain";
  updateQuote();
}

function qAddressToHexAddress(address) {
  if (!/^Q[0-9a-fA-F]{40}$/.test(address || "")) {
    throw new Error(`Direccion Q invalida: ${address || "vacia"}`);
  }

  return `0x${address.slice(1)}`;
}

function padAbiWord(hexValue) {
  return hexValue.replace(/^0x/, "").padStart(64, "0");
}

function encodeApproveCalldata(spender, amountWei) {
  const selector = "095ea7b3";
  const spenderWord = padAbiWord(qAddressToHexAddress(spender));
  const amountWord = BigInt(amountWei).toString(16).padStart(64, "0");
  return `0x${selector}${spenderWord}${amountWord}`;
}

function setConnectStatus(status) {
  qrlConnectStatus.textContent = status;
}

function setConnectResult(message) {
  qrlConnectResult.textContent = message;
}

function formatError(error) {
  if (!error) return "Error desconocido";
  const name = error.name || "Error";
  const message = error.message || String(error);
  return `${name}: ${message}`;
}

function withTimeout(promise, milliseconds, timeoutMessage) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(timeoutMessage)), milliseconds);
  });

  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timeoutId));
}

async function loadPublicConfig() {
  if (publicConfigCache) return publicConfigCache;
  const response = await fetch("/api/config", { cache: "no-store" });
  if (!response.ok) throw new Error("No pude leer /api/config");
  publicConfigCache = await response.json();
  return publicConfigCache;
}

async function loadQrlConnectSdk() {
  if (!qrlConnectModulePromise) {
    qrlConnectModulePromise = import("@qrlwallet/connect");
  }

  const module = await qrlConnectModulePromise;
  return module.QRLConnect;
}

async function buildQrlProvider() {
  if (qrlProvider) return qrlProvider;

  const QRLConnect = await loadQrlConnectSdk();

  qrlProvider = new QRLConnect({
    dappMetadata: {
      name: "QRLatina",
      url: window.location.origin,
      icon: `${window.location.origin}/favicon.svg`,
      redirectUrl: window.location.href
    },
    relayUrl: "https://qrlwallet.com",
    chainId: "0x539",
    autoReconnect: true,
    debug: false
  });

  qrlProvider.on("statusChanged", status => {
    setConnectStatus(status);
  });

  qrlProvider.on("connect", ({ chainId }) => {
    setConnectStatus(`Conectado ${chainId}`);
    qrlRequestAccounts.disabled = false;
  });

  qrlProvider.on("disconnect", () => {
    connectedQrlAccount = "";
    qrlConnectedAccount.textContent = "Sin cuenta";
    approveTestButton.disabled = true;
    qrlRequestAccounts.disabled = true;
    setConnectStatus("Desconectado");
  });

  qrlProvider.on("accountsChanged", accounts => {
    connectedQrlAccount = accounts[0] || "";
    qrlConnectedAccount.textContent = connectedQrlAccount || "Sin cuenta";
    approveTestButton.disabled = !connectedQrlAccount;
  });

  qrlProvider.on("late_response", payload => {
    if (payload.error) {
      setConnectResult(`Respuesta tardia con error: ${payload.error.message}`);
      return;
    }
    setConnectResult(`Respuesta tardia ${payload.method}: ${JSON.stringify(payload.result)}`);
  });

  return qrlProvider;
}

async function generateQrlConnectCode() {
  try {
    const provider = await buildQrlProvider();
    setConnectStatus("Generando");
    setConnectResult("Generando codigo de pairing.");
    const uri = await provider.getConnectionURI();
    qrlConnectCode.value = uri;
    copyQrlCode.disabled = false;
    qrlRequestAccounts.disabled = false;
    openQrlWallet.href = `https://qrlwallet.com/dapp-sessions#qrlconnect=${encodeURIComponent(uri)}`;
    setConnectStatus(provider.getStatus());
    setConnectResult("Pega este codigo en MyQRLWallet o usa Abrir web wallet.");
  } catch (error) {
    console.error("QRL Connect pairing failed", error);
    setConnectStatus("Error");
    setConnectResult(formatError(error));
  }
}

async function requestQrlAccounts() {
  try {
    const provider = await buildQrlProvider();
    const status = provider.getStatus();
    const localAccounts = provider.getAccounts();

    if (localAccounts.length) {
      connectedQrlAccount = localAccounts[0];
      qrlConnectedAccount.textContent = connectedQrlAccount;
      approveTestButton.disabled = false;
      setConnectStatus(status);
      setConnectResult("Cuenta ya autorizada en la sesion.");
      return;
    }

    if (status !== "connected") {
      setConnectStatus(status);
      setConnectResult(`La wallet esta en estado ${status}. Termina el pairing en MyQRLWallet y luego volve a tocar Leer cuenta.`);
      return;
    }

    qrlRequestAccounts.disabled = true;
    setConnectResult("Solicitud enviada. Volve a MyQRLWallet y aproba compartir la cuenta.");
    const accounts = await withTimeout(
      provider.request({ method: "qrl_requestAccounts" }),
      60000,
      "MyQRLWallet no respondio en 60s. Abrila y revisa si quedo una solicitud pendiente."
    );
    connectedQrlAccount = Array.isArray(accounts) ? accounts[0] || "" : "";
    qrlConnectedAccount.textContent = connectedQrlAccount || "Sin cuenta";
    approveTestButton.disabled = !connectedQrlAccount;
    setConnectResult(connectedQrlAccount ? "Cuenta conectada. Ya podemos probar approve." : "La wallet no devolvio cuenta.");
  } catch (error) {
    console.error("QRL account request failed", error);
    setConnectResult(formatError(error));
  } finally {
    qrlRequestAccounts.disabled = false;
  }
}

async function sendApproveTest() {
  try {
    const provider = await buildQrlProvider();
    const config = await loadPublicConfig();
    const amm = config.contracts.qrLatinaAmm;
    const tokenSymbol = approveTokenSelect.value;
    const token = config.tokens[tokenSymbol];

    if (!connectedQrlAccount) throw new Error("Primero conecta y autoriza la cuenta.");
    if (!amm || !amm.router) throw new Error("Router AMM no configurado.");
    if (!token || !token.address) throw new Error(`Token ${tokenSymbol} no configurado.`);

    const amount = "1000000000000000";
    const tx = {
      from: connectedQrlAccount,
      to: token.address,
      value: "0x0",
      data: encodeApproveCalldata(amm.router, amount)
    };

    approveTestButton.disabled = true;
    setConnectResult(`Enviando approve minimo de ${tokenSymbol}. Confirma en MyQRLWallet.`);
    const txHash = await provider.request({
      method: "qrl_sendTransaction",
      params: [tx]
    });

    setConnectResult(`Approve enviado: ${txHash}`);
  } catch (error) {
    console.error("QRL approve test failed", error);
    setConnectResult(formatError(error));
  } finally {
    approveTestButton.disabled = !connectedQrlAccount;
  }
}

document.querySelectorAll("[data-view]").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-view]").forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    const panel = document.querySelector(`[data-panel="${button.dataset.view}"]`);
    if (panel) {
      panel.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
      });
    }
  });
});

document.querySelector("#flip-pair").addEventListener("click", () => {
  const previousInput = tokenIn.value;
  tokenIn.value = tokenOut.value;
  tokenOut.value = previousInput;
  updateQuote();
});

document.querySelector("#copy-sequence").addEventListener("click", async () => {
  const sequence = "WQRL -> Factory -> Router -> QRLAT/QETH -> QRLAT/WQRL";
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(sequence);
  }
});

qrlConnectButton.addEventListener("click", generateQrlConnectCode);
qrlRequestAccounts.addEventListener("click", requestQrlAccounts);
copyQrlCode.addEventListener("click", async () => {
  await copyText(qrlConnectCode.value);
  setConnectResult("Codigo copiado.");
});
approveTestButton.addEventListener("click", sendApproveTest);

amountIn.addEventListener("input", updateQuote);
tokenIn.addEventListener("change", updateQuote);
tokenOut.addEventListener("change", updateQuote);
renderMarkets();
updateQuote();

async function loadLiveAssets() {
  try {
    const response = await fetch("/api/assets", { cache: "no-store" });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "QRL API unavailable");
    }

    const tokenBySymbol = {};
    payload.tokens.forEach(token => {
      tokenBySymbol[token.configuredSymbol] = token;
    });

    walletLabel.textContent = compactAddress(payload.wallet);
    networkState.textContent = payload.chainId === 1337 ? "Testnet" : `Chain ${payload.chainId}`;
    blockLabel.textContent = `Bloque ${payload.blockNumber}`;
    marketsCount.textContent = String(Object.keys(pools).length);
    marketsLabel.textContent = "Rutas cargadas";
    balanceQrl.textContent = compactBalance(payload.native.balance);
    balanceQrlat.textContent = compactBalance(tokenBySymbol.QRLAT && tokenBySymbol.QRLAT.balance);
    balanceQeth.textContent = compactBalance(tokenBySymbol.QETH && tokenBySymbol.QETH.balance);
    balanceWqrl.textContent = compactBalance(tokenBySymbol.WQRL && tokenBySymbol.WQRL.balance);
    balanceQzd.textContent = compactBalance(tokenBySymbol.QZD && tokenBySymbol.QZD.balance);
  } catch (error) {
    walletLabel.textContent = "API offline";
    networkState.textContent = "Demo";
    blockLabel.textContent = "Usando simulacion local";
    marketsLabel.textContent = "Simulados";
  }
}

async function loadAmmConfig() {
  try {
    const response = await fetch("/api/amm", { cache: "no-store" });
    if (!response.ok) return;
    renderContracts(await response.json());
  } catch (error) {
    ammMode.textContent = "offline";
  }
}

loadLiveAssets();
loadAmmConfig();
setInterval(loadLiveAssets, 30000);

const canvas = document.querySelector("#network-canvas");
const ctx = canvas.getContext("2d");
const nodes = Array.from({ length: 46 }, (_, index) => ({
  x: Math.random(),
  y: Math.random(),
  r: index % 5 === 0 ? 2.2 : 1.4,
  vx: (Math.random() - 0.5) * 0.00045,
  vy: (Math.random() - 0.5) * 0.00045
}));

function resizeCanvas() {
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * scale);
  canvas.height = Math.floor(window.innerHeight * scale);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
}

function drawNetwork() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  ctx.clearRect(0, 0, width, height);

  nodes.forEach(node => {
    node.x += node.vx;
    node.y += node.vy;
    if (node.x < 0.04 || node.x > 0.96) node.vx *= -1;
    if (node.y < 0.04 || node.y > 0.96) node.vy *= -1;
  });

  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const a = nodes[i];
      const b = nodes[j];
      const ax = a.x * width;
      const ay = a.y * height;
      const bx = b.x * width;
      const by = b.y * height;
      const distance = Math.hypot(ax - bx, ay - by);

      if (distance < 150) {
        ctx.strokeStyle = `rgba(223, 245, 233, ${1 - distance / 150})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
      }
    }
  }

  nodes.forEach(node => {
    ctx.fillStyle = node.r > 2 ? "#13a86b" : "#f7f8f6";
    ctx.beginPath();
    ctx.arc(node.x * width, node.y * height, node.r, 0, Math.PI * 2);
    ctx.fill();
  });

  requestAnimationFrame(drawNetwork);
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();
drawNetwork();
