/**
 * Production entrypoint module.
 * A later milestone creates the HTTP server, binds 0.0.0.0:${PORT:-3000},
 * and keeps the process alive. This file must remain the start target: `node dist/server.js`.
 */
export { listenAddress, readListenPort } from "./utils/runtime-config.js";
