import { API_ROUTES } from "@asad-architect/types";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { GroqClient } from "../services/groq-client.js";
import type { ChatJobStore } from "../services/chat-jobs.js";
import { problem, requestMethod, requestPath, sendProblem } from "../utils/http.js";
import { handleChatPost, handleStreamGet } from "./chat.js";
import { sendHealth } from "./health.js";
import { sendReady, type ReadySnapshot } from "./ready.js";

export const routeCatalog = {
  health: API_ROUTES.health,
  ready: API_ROUTES.ready,
  chat: API_ROUTES.chat,
  stream: API_ROUTES.stream,
} as const;

export interface RouteContext {
  readonly jobs: ChatJobStore;
  readonly groq: GroqClient;
  readonly ready: ReadySnapshot;
}

export async function dispatchRoute(
  req: IncomingMessage,
  res: ServerResponse,
  context: RouteContext,
): Promise<void> {
  const method = requestMethod(req);
  const path = requestPath(req);

  if (path === routeCatalog.health) {
    if (method !== "GET") {
      sendProblem(res, methodNotAllowed("GET"));
      return;
    }
    sendHealth(res);
    return;
  }

  if (path === routeCatalog.ready) {
    if (method !== "GET") {
      sendProblem(res, methodNotAllowed("GET"));
      return;
    }
    sendReady(res, context.ready);
    return;
  }

  if (path === routeCatalog.chat) {
    if (method !== "POST") {
      sendProblem(res, methodNotAllowed("POST"));
      return;
    }
    await handleChatPost(req, res, context.jobs);
    return;
  }

  if (path === routeCatalog.stream) {
    if (method !== "GET") {
      sendProblem(res, methodNotAllowed("GET"));
      return;
    }
    await handleStreamGet(req, res, context.jobs, context.groq);
    return;
  }

  sendProblem(res, problem(404, "Not Found", `No route matches ${method} ${path}`));
}

function methodNotAllowed(allow: string) {
  return problem(405, "Method Not Allowed", `Allowed: ${allow}`);
}
