import {
  API_MEDIA,
  API_ROUTES,
  type ChatCompletionAccepted,
  type ChatCompletionRequest,
  type ChatMessageInput,
  type ChatRole,
  type StreamTokenEvent,
} from "@asad-architect/types";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { GroqClient } from "../services/groq-client.js";
import type { ChatJobStore } from "../services/chat-jobs.js";
import { problem, requestQuery, sendJson, sendProblem } from "../utils/http.js";
import { isProblemDetails, readJsonBody } from "../utils/read-json-body.js";

const ROLES: ReadonlySet<string> = new Set(["user", "assistant", "system"]);

export async function handleChatPost(
  req: IncomingMessage,
  res: ServerResponse,
  jobs: ChatJobStore,
): Promise<void> {
  try {
    const payload = await readJsonBody(req);
    const request = parseChatRequest(payload);
    const job = jobs.create(request);
    const body: ChatCompletionAccepted = {
      id: job.id,
      status: "processing",
    };
    sendJson(res, 200, body);
  } catch (error) {
    if (isProblemDetails(error)) {
      sendProblem(res, error);
      return;
    }
    sendProblem(res, problem(400, "Bad Request", "Unable to accept chat request"));
  }
}

export async function handleStreamGet(
  req: IncomingMessage,
  res: ServerResponse,
  jobs: ChatJobStore,
  groq: GroqClient,
): Promise<void> {
  const query = requestQuery(req);
  const conversationId = query.get("conversationId") ?? "";
  const token = query.get("token") ?? "";

  if (conversationId.length === 0 || token.length === 0) {
    sendProblem(
      res,
      problem(400, "Bad Request", "conversationId and token query parameters are required"),
    );
    return;
  }

  const job = jobs.getAuthorized(conversationId, token);
  if (!job) {
    sendProblem(res, problem(403, "Forbidden", "Stream accessor is invalid or expired"));
    return;
  }

  res.statusCode = 200;
  res.setHeader("Content-Type", API_MEDIA.sse);
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  const abort = new AbortController();
  req.on("close", () => abort.abort());

  const writeEvent = (event: StreamTokenEvent): void => {
    if (res.writableEnded) {
      return;
    }
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  try {
    for await (const event of groq.streamChatTokens(job.messages, streamOptionsFor(job.model, abort.signal))) {
      if (event.token.length > 0 || event.done) {
        writeEvent(event);
      }
      if (event.done) {
        break;
      }
    }
  } catch {
    writeEvent({ token: "", done: true });
  } finally {
    if (!res.writableEnded) {
      res.end();
    }
  }
}

function parseChatRequest(body: unknown): ChatCompletionRequest {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw problem(400, "Bad Request", "Chat request must be a JSON object");
  }

  const record = body as Record<string, unknown>;
  const messages = record.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    throw problem(400, "Bad Request", "messages must be a non-empty array");
  }

  const parsedMessages: ChatMessageInput[] = messages.map((item, index) => {
    if (typeof item !== "object" || item === null) {
      throw problem(400, "Bad Request", `messages[${index}] must be an object`);
    }
    const message = item as Record<string, unknown>;
    const role = message.role;
    const content = message.content;
    if (typeof role !== "string" || !ROLES.has(role)) {
      throw problem(400, "Bad Request", `messages[${index}].role is invalid`);
    }
    if (typeof content !== "string") {
      throw problem(400, "Bad Request", `messages[${index}].content must be a string`);
    }
    return { role: role as ChatRole, content };
  });

  const request: ChatCompletionRequest = { messages: parsedMessages };

  if (typeof record.conversationId === "string" && record.conversationId.length > 0) {
    return {
      ...request,
      conversationId: record.conversationId,
      ...(typeof record.model === "string" && record.model.length > 0
        ? { model: record.model }
        : {}),
    };
  }

  if (typeof record.model === "string" && record.model.length > 0) {
    return { ...request, model: record.model };
  }

  return request;
}

function streamOptionsFor(
  model: string | undefined,
  signal: AbortSignal,
): { model?: string; signal: AbortSignal } {
  if (model === undefined) {
    return { signal };
  }
  return { model, signal };
}
