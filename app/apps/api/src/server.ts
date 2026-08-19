/**
 * Production entrypoint. `node dist/server.js` creates the HTTP server,
 * binds 0.0.0.0:${PORT:-3000}, and keeps the process alive.
 */
import { createApiRuntime, PROCESS_HEARTBEAT_MS } from "./runtime.js";
import { listenAddress, readListenPort } from "./utils/runtime-config.js";

const runtime = createApiRuntime();
const port = readListenPort();
const host = listenAddress();

const heartbeat = setInterval(() => {
  runtime.jobs.sweep();
}, PROCESS_HEARTBEAT_MS);

runtime.server.listen(port, host, () => {
  process.stdout.write(`asad-architect api listening on ${host}:${port}\n`);
});

function shutdown(signal: string): void {
  process.stdout.write(`asad-architect api received ${signal}, closing\n`);
  clearInterval(heartbeat);
  runtime.server.close(() => {
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
