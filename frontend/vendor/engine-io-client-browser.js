import { Socket, SocketWithoutUpgrade, SocketWithUpgrade } from "/node_modules/engine.io-client/build/esm/socket.js";
import { Transport, TransportError } from "/node_modules/engine.io-client/build/esm/transport.js";
import { transports } from "/node_modules/engine.io-client/build/esm/transports/index.js";
import { installTimerFunctions } from "/node_modules/engine.io-client/build/esm/util.js";
import { parse } from "/node_modules/engine.io-client/build/esm/contrib/parseuri.js";
import { nextTick } from "/node_modules/engine.io-client/build/esm/globals.js";
import { Fetch } from "/node_modules/engine.io-client/build/esm/transports/polling-fetch.js";
import { XHR } from "/node_modules/engine.io-client/build/esm/transports/polling-xhr.js";
import { WS as WebSocket } from "/node_modules/engine.io-client/build/esm/transports/websocket.js";
import { WT as WebTransport } from "/node_modules/engine.io-client/build/esm/transports/webtransport.js";

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
