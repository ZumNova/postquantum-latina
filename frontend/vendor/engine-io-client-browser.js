import { Socket, SocketWithoutUpgrade, SocketWithUpgrade } from "/vendor_modules/engine.io-client/build/esm/socket.js";
import { Transport, TransportError } from "/vendor_modules/engine.io-client/build/esm/transport.js";
import { transports } from "/vendor_modules/engine.io-client/build/esm/transports/index.js";
import { installTimerFunctions } from "/vendor_modules/engine.io-client/build/esm/util.js";
import { parse } from "/vendor_modules/engine.io-client/build/esm/contrib/parseuri.js";
import { nextTick } from "/vendor_modules/engine.io-client/build/esm/globals.js";
import { Fetch } from "/vendor_modules/engine.io-client/build/esm/transports/polling-fetch.js";
import { XHR } from "/vendor_modules/engine.io-client/build/esm/transports/polling-xhr.js";
import { WS as WebSocket } from "/vendor_modules/engine.io-client/build/esm/transports/websocket.js";
import { WT as WebTransport } from "/vendor_modules/engine.io-client/build/esm/transports/webtransport.js";

const protocol = Socket.protocol;
const NodeXHR = XHR;
const NodeWebSocket = WebSocket;

export {
  Fetch,
  NodeWebSocket,
  NodeXHR,
  Socket,
  SocketWithUpgrade,
  SocketWithoutUpgrade,
  Transport,
  TransportError,
  WebSocket,
  WebTransport,
  XHR,
  installTimerFunctions,
  nextTick,
  parse,
  protocol,
  transports
};
