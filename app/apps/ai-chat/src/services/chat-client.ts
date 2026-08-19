import {
  API_MEDIA,
  API_ROUTES,
  DEFAULT_INFERENCE_MODEL,
  type ChatCompletionAccepted,
  type ChatCompletionRequest,
  type ChatMessageInput,
  type ProblemDetails,
} from "@asad-architect/types";
import { readCompiledApiOrigin } from "./api-origin.js";
import { isStreamTokenEvent, readSseData } from "./sse.js";

const PERSONA_PREAMBLE =
  "You are Asad Architect — a precise, structurally minded collaborator. State assumptions. Prefer buildable next steps over flourish.";

export class ApiOriginMissingError extends Error {
  override readonly name = "ApiOriginMissingError";
  constructor() {
    super("VITE_API_ORIGIN was empty at build time. Rebuild the static client with the public API origin.");
  }
}

export function requireApiOrigin(): string {
  const origin = readCompiledApiOrigin();
  if (origin === undefined) {
    throw new ApiOriginMissingError();
  }
  return origin;
}

export function buildChatRequest(
  conversationId: string,
  history: readonly ChatMessageInput[],
  model = DEFAULT_INFERENCE_MODEL,
): ChatCompletionRequest {
  const messages: ChatMessageInput[] = [{ role: "system", content: PERSONA_PREAMBLE }, ...history];
  return { conversationId, messages, model };
}

async function parseProblem(response: Response): Promise<string> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("json")) {
    try {
      const body = (await response.json()) as Partial<ProblemDetails>;
      if (typeof body.detail === "string" && body.detail.length > 0) {
        return body.detail;
      }
      if (typeof body.title === "string" && body.title.length > 0) {
        return body.title;
      }
    } catch {
      // fall through
    }
  }
  return `API request failed (${response.status})`;
}

export async function acceptChatJob(
  origin: string,
  request: ChatCompletionRequest,
  signal: AbortSignal,
): Promise<ChatCompletionAccepted> {
  const response = await fetch(`${origin}${API_ROUTES.chat}`, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: API_MEDIA.json,
      "Content-Type": API_MEDIA.json,
    },
    body: JSON.stringify(request),
    signal,
  });
  if (!response.ok) {
    throw new Error(await parseProblem(response));
  }
  const body = (await response.json()) as ChatCompletionAccepted;
  if (typeof body.id !== "string" || typeof body.token !== "string" || body.status !== "processing") {
    throw new Error("Chat accept payload did not match the compile-time contract");
  }
  return body;
}

export async function consumeTokenStream(
  origin: string,
  conversationId: string,
  token: string,
  signal: AbortSignal,
  onToken: (chunk: string) => void,
): Promise<void> {
  const url = new URL(`${origin}${API_ROUTES.stream}`);
  url.searchParams.set("conversationId", conversationId);
  url.searchParams.set("token", token);

  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: { Accept: API_MEDIA.sse },
    signal,
  });
  if (!response.ok) {
    throw new Error(await parseProblem(response));
  }
  if (response.body === null) {
    throw new Error("SSE response had no body");
  }

  for await (const event of readSseData<unknown>(response.body, signal)) {
    if (!isStreamTokenEvent(event)) {
      continue;
    }
    if (event.token.length > 0) {
      onToken(event.token);
    }
    if (event.done) {
      return;
    }
  }
}
