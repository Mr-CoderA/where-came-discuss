import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { applyCors } from "./middleware/cors.js";
import { dispatchRoute, type RouteContext } from "./routes/index.js";
import { ChatJobStore } from "./services/chat-jobs.js";
import { GroqClient } from "./services/groq-client.js";
import { assertGroqApiKeyPresent } from "./services/groq-config.js";
import { isProblemDetails } from "./utils/read-json-body.js";
import { problem, sendProblem } from "./utils/http.js";
import { readCorsOriginList } from "./utils/runtime-config.js";

export const PROCESS_HEARTBEAT_MS = 10_000;

export interface ApiRuntime {
  readonly server: Server;
  readonly groq: GroqClient;
  readonly jobs: ChatJobStore;
  readonly corsAllowlist: readonly string[];
  readonly ready: RouteContext["ready"];
}

export interface CreateApiRuntimeOptions {
  readonly env?: NodeJS.Dict<string>;
  readonly groq?: GroqClient;
  readonly jobs?: ChatJobStore;
  readonly fetchImpl?: typeof fetch;
}

/**
 * Builds an HTTP server that listens only after `listen()` is called.
 * GROQ_API_KEY is required at construction; no outbound GROQ call is made.
 */
export function createApiRuntime(options: CreateApiRuntimeOptions = {}): ApiRuntime {
  const env = options.env ?? process.env;
  assertGroqApiKeyPresent(env);

  const groq =
    options.groq ??
    (options.fetchImpl !== undefined
      ? GroqClient.fromEnv(env, options.fetchImpl)
      : GroqClient.fromEnv(env));
  const jobs = options.jobs ?? new ChatJobStore();
  const corsAllowlist = readCorsOriginList(env);
  const ready = { middleware: true, routes: true, cors: true } as const;

  const context: RouteContext = { jobs, groq, ready };

  const server = createServer((req, res) => {
    void handleRequest(req, res, corsAllowlist, context);
  });

  return { server, groq, jobs, corsAllowlist, ready };
}

async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  corsAllowlist: readonly string[],
  context: RouteContext,
): Promise<void> {
  try {
    const cors = applyCors(req, res, corsAllowlist);
    if (cors.handled) {
      return;
    }
    await dispatchRoute(req, res, context);
  } catch (error) {
    if (res.headersSent) {
      res.destroy();
      return;
    }
    if (isProblemDetails(error)) {
      sendProblem(res, error);
      return;
    }
    sendProblem(res, problem(500, "Internal Server Error", "The request could not be completed"));
  }
}
