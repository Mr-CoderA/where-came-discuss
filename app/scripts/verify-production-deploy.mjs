#!/usr/bin/env node
/**
 * Credential-free production deployability verification.
 *
 * Assumes workspace packages have already been built (root `npm run build`
 * runs Turbo first). This script:
 *   1. Confirms API and static frontend artifacts exist
 *   2. Compiles the SPA with a known VITE_API_ORIGIN and asserts it is inlined
 *   3. Launches `node dist/server.js` with non-secret test configuration
 *   4. Probes GET /health and GET /ready over HTTP
 *   5. Confirms the process stays alive after probes
 *   6. Verifies credentialed OPTIONS preflight against CORS_ORIGIN
 *
 * Does not call GROQ, open a datastore, or use live credentials.
 */
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { mkdtemp, readdir, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(SCRIPT_DIR, "..");
const REPO_ROOT = path.resolve(APP_ROOT, "..");

const API_DIR = path.join(APP_ROOT, "apps", "api");
const CHAT_DIR = path.join(APP_ROOT, "apps", "ai-chat");
const API_ENTRY = path.join(API_DIR, "dist", "server.js");
const CHAT_DIST = path.join(CHAT_DIR, "dist");

/** Exact browser origin used only for this smoke run. Not a local service URL. */
const TEST_CORS_ORIGIN = "https://folio.verify.invalid";
const DISALLOWED_ORIGIN = "https://intruder.verify.invalid";
/** Compile-time API origin baked into a throwaway Vite output directory. */
const TEST_API_ORIGIN = "https://api.verify.invalid";
/** Satisfies boot-time key length checks; never sent on the network. */
const TEST_GROQ_PLACEHOLDER = "verify-placeholder-not-a-credential";

const HEALTH_PATH = "/health";
const READY_PATH = "/ready";
const CHAT_PATH = "/api/chat";

const PROBE_TIMEOUT_MS = 8_000;
const KEEP_ALIVE_PAUSE_MS = 1_500;
const LISTEN_WAIT_MS = 12_000;

class VerifyError extends Error {
  constructor(message) {
    super(message);
    this.name = "VerifyError";
  }
}

function log(step, detail) {
  process.stdout.write(`verify-deploy  ${step}${detail ? `  ${detail}` : ""}\n`);
}

async function pathExists(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

async function collectFiles(root, suffix) {
  const found = [];
  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.name.endsWith(suffix)) {
        found.push(full);
      }
    }
  }
  await walk(root);
  return found;
}

async function assertProductionArtifacts() {
  if (!(await pathExists(API_ENTRY))) {
    throw new VerifyError(
      `Missing API production entry ${path.relative(REPO_ROOT, API_ENTRY)}. Run the workspace build first.`,
    );
  }
  const serverSource = await readFile(API_ENTRY, "utf8");
  if (!serverSource.includes("listen(")) {
    throw new VerifyError("API entrypoint does not create an HTTP listener");
  }
  if (serverSource.includes("serve-static") || serverSource.includes("sirv")) {
    throw new VerifyError("API entrypoint must not be a static file server");
  }

  const chatIndex = path.join(CHAT_DIST, "index.html");
  if (!(await pathExists(chatIndex))) {
    throw new VerifyError(
      `Missing static frontend index at ${path.relative(REPO_ROOT, chatIndex)}`,
    );
  }
  const productionAssets = await collectFiles(CHAT_DIST, ".js");
  const productionBundle = (
    await Promise.all(productionAssets.map((file) => readFile(file, "utf8")))
  ).join("\n");
  if (/\bhttps?:\/\/localhost(?::\d+)?\b/.test(productionBundle)) {
    throw new VerifyError("Production SPA bundle must not embed a localhost API origin");
  }
  log("artifacts", "API dist/server.js and static SPA dist are present");
}

async function reservePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "0.0.0.0", () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        server.close();
        reject(new VerifyError("Could not allocate an ephemeral TCP port"));
        return;
      }
      const port = address.port;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(port);
      });
    });
  });
}

async function verifyCompiledApiOrigin() {
  const outDir = await mkdtemp(path.join(tmpdir(), "asad-ai-chat-origin-"));
  try {
    const viteCandidates = [
      path.join(CHAT_DIR, "node_modules", "vite", "bin", "vite.js"),
      path.join(APP_ROOT, "node_modules", "vite", "bin", "vite.js"),
      path.join(REPO_ROOT, "node_modules", "vite", "bin", "vite.js"),
    ];
    let viteBin = "";
    for (const candidate of viteCandidates) {
      if (await pathExists(candidate)) {
        viteBin = candidate;
        break;
      }
    }
    if (viteBin.length === 0) {
      throw new VerifyError("vite is not installed; cannot compile the SPA for origin inlining");
    }

    await runProcess(
      process.execPath,
      [viteBin, "build", "--outDir", outDir, "--emptyOutDir"],
      {
        cwd: CHAT_DIR,
        env: {
          ...process.env,
          VITE_API_ORIGIN: TEST_API_ORIGIN,
        },
      },
    );

    const assets = await collectFiles(outDir, ".js");
    const html = await readFile(path.join(outDir, "index.html"), "utf8");
    const bundle = html + "\n" + (await Promise.all(assets.map((file) => readFile(file, "utf8")))).join("\n");
    if (!bundle.includes(TEST_API_ORIGIN)) {
      throw new VerifyError(
        `Compiled frontend did not contain VITE_API_ORIGIN value ${TEST_API_ORIGIN}`,
      );
    }
    log("frontend-origin", `inlined ${TEST_API_ORIGIN} at build time`);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
}

function runProcess(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      ...options,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(
        new VerifyError(
          `${command} ${args.join(" ")} exited ${code}\n${stderr || stdout}`.trim(),
        ),
      );
    });
  });
}

function startApi(port) {
  const stdoutChunks = [];
  const child = spawn(process.execPath, [API_ENTRY], {
    cwd: API_DIR,
    env: {
      ...process.env,
      PORT: String(port),
      CORS_ORIGIN: TEST_CORS_ORIGIN,
      ALLOWED_ORIGINS: "",
      GROQ_API_KEY: TEST_GROQ_PLACEHOLDER,
      REPOFIXER_SELF_URL: TEST_API_ORIGIN,
      PUBLIC_URL: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", (chunk) => {
    stdoutChunks.push(chunk.toString());
  });
  child.stderr.on("data", (chunk) => {
    stdoutChunks.push(chunk.toString());
  });

  return {
    child,
    output: () => stdoutChunks.join(""),
  };
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitForListen(session, port) {
  const deadline = Date.now() + LISTEN_WAIT_MS;
  let lastError = "timeout";
  while (Date.now() < deadline) {
    if (session.child.exitCode !== null) {
      throw new VerifyError(
        `API process exited ${session.child.exitCode} before listen\n${session.output()}`,
      );
    }
    try {
      const response = await fetch(`http://127.0.0.1:${port}${HEALTH_PATH}`, {
        signal: AbortSignal.timeout(500),
      });
      if (response.ok) {
        return;
      }
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await sleep(50);
  }
  throw new VerifyError(`API did not become reachable on port ${port}: ${lastError}`);
}

async function readJson(url) {
  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
  });
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new VerifyError(`${url} returned non-JSON: ${text.slice(0, 200)}`);
  }
  return { response, body };
}

async function probeHealthAndReady(port) {
  const health = await readJson(`http://127.0.0.1:${port}${HEALTH_PATH}`);
  if (health.response.status !== 200 || health.body.status !== "ok") {
    throw new VerifyError(`GET ${HEALTH_PATH} failed: ${JSON.stringify(health.body)}`);
  }
  if (typeof health.body.timestamp !== "string" || health.body.timestamp.length === 0) {
    throw new VerifyError("GET /health missing timestamp");
  }

  const ready = await readJson(`http://127.0.0.1:${port}${READY_PATH}`);
  if (ready.response.status !== 200 || ready.body.status !== "ready") {
    throw new VerifyError(`GET ${READY_PATH} failed: ${JSON.stringify(ready.body)}`);
  }
  const checks = ready.body.checks;
  if (!Array.isArray(checks) || !["middleware", "routes", "cors"].every((name) => checks.includes(name))) {
    throw new VerifyError(`GET /ready missing expected checks: ${JSON.stringify(checks)}`);
  }
  log("http", `GET ${HEALTH_PATH} and GET ${READY_PATH} returned 200`);
}

async function probePreflight(port, origin, expectedStatus) {
  const response = await fetch(`http://127.0.0.1:${port}${CHAT_PATH}`, {
    method: "OPTIONS",
    headers: {
      Origin: origin,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type",
    },
    signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
  });

  if (response.status !== expectedStatus) {
    throw new VerifyError(
      `OPTIONS ${CHAT_PATH} Origin=${origin} expected ${expectedStatus}, got ${response.status}`,
    );
  }

  const allowOrigin = response.headers.get("access-control-allow-origin");
  const allowCredentials = response.headers.get("access-control-allow-credentials");
  const allowHeaders = response.headers.get("access-control-allow-headers") ?? "";

  if (expectedStatus === 204) {
    if (allowOrigin !== origin) {
      throw new VerifyError(`CORS allow-origin expected ${origin}, got ${allowOrigin}`);
    }
    if (allowOrigin === "*") {
      throw new VerifyError("CORS must not use a wildcard with credentials");
    }
    if (allowCredentials !== "true") {
      throw new VerifyError("CORS missing Access-Control-Allow-Credentials: true");
    }
    if (!/content-type/i.test(allowHeaders)) {
      throw new VerifyError("CORS missing Content-Type in Allow-Headers");
    }
  } else if (allowOrigin === "*") {
    throw new VerifyError("Disallowed origin must not receive wildcard CORS");
  }
}

async function confirmProcessAlive(session, port) {
  if (session.child.exitCode !== null) {
    throw new VerifyError(`API process exited ${session.child.exitCode} after probes`);
  }
  await sleep(KEEP_ALIVE_PAUSE_MS);
  if (session.child.exitCode !== null) {
    throw new VerifyError(`API process died during keep-alive window\n${session.output()}`);
  }
  await probeHealthAndReady(port);
  const output = session.output();
  if (!output.includes("0.0.0.0")) {
    throw new VerifyError(`API did not report bind on 0.0.0.0\n${output}`);
  }
  log("alive", `pid ${session.child.pid} still listening on 0.0.0.0 after second probe`);
}

function stopApi(session) {
  return new Promise((resolve) => {
    const { child } = session;
    if (child.exitCode !== null) {
      resolve();
      return;
    }
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
    }, 5_000);
    child.on("exit", () => {
      clearTimeout(timer);
      resolve();
    });
    child.kill("SIGTERM");
  });
}

async function main() {
  log("begin", path.relative(REPO_ROOT, APP_ROOT) || "app");
  await assertProductionArtifacts();
  await verifyCompiledApiOrigin();

  const port = await reservePort();
  const session = startApi(port);
  let failed = false;
  try {
    await waitForListen(session, port);
    log("listen", `0.0.0.0:${port} via node dist/server.js`);
    await probeHealthAndReady(port);
    await probePreflight(port, TEST_CORS_ORIGIN, 204);
    await probePreflight(port, DISALLOWED_ORIGIN, 403);
    log("cors", `OPTIONS ${CHAT_PATH} allowlist exact-origin, reject other origin`);
    await confirmProcessAlive(session, port);
    log("pass", "production launch smoke completed without third-party calls");
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    await stopApi(session);
    if (!failed) {
      log("stop", "API process terminated after verification");
    }
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`verify-deploy  FAIL  ${message}\n`);
  process.exitCode = 1;
});
