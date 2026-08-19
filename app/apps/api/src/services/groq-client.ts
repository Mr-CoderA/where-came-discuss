import { DEFAULT_INFERENCE_MODEL, type ChatMessageInput } from "@asad-architect/types";
import {
  GROQ_CHAT_COMPLETIONS_PATH,
  GROQ_OPENAI_COMPAT_BASE_URL,
  readGroqApiKey,
} from "./groq-config.js";
import { iterateGroqSse } from "./groq-sse.js";
import type { StreamTokenEvent } from "@asad-architect/types";

export interface GroqChatCompletionBody {
  readonly model: string;
  readonly messages: readonly ChatMessageInput[];
  readonly stream: boolean;
}

export interface GroqClientOptions {
  readonly apiKey: string;
  readonly fetchImpl?: typeof fetch;
  readonly baseUrl?: string;
}

/**
 * Thin GROQ HTTP wrapper. Construction does not open a network connection.
 * The API key lives only on this instance for the process lifetime.
 */
export class GroqClient {
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;
  private readonly baseUrl: string;

  constructor(options: GroqClientOptions) {
    if (options.apiKey.trim().length === 0) {
      throw new Error("GROQ API key must be a non-empty string");
    }
    this.apiKey = options.apiKey;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.baseUrl = stripTrailingSlash(
      options.baseUrl === undefined ? GROQ_OPENAI_COMPAT_BASE_URL : options.baseUrl,
    );
  }

  static fromEnv(
    env: NodeJS.Dict<string> = process.env,
    fetchImpl?: typeof fetch,
  ): GroqClient {
    const apiKey = readGroqApiKey(env);
    if (fetchImpl !== undefined) {
      return new GroqClient({ apiKey, fetchImpl });
    }
    return new GroqClient({ apiKey });
  }

  chatCompletionsUrl(): string {
    return `${this.baseUrl}${GROQ_CHAT_COMPLETIONS_PATH}`;
  }

  async createChatCompletion(
    messages: readonly ChatMessageInput[],
    options: { model?: string; stream?: boolean; signal?: AbortSignal } = {},
  ): Promise<Response> {
    const body: GroqChatCompletionBody = {
      model: options.model ?? DEFAULT_INFERENCE_MODEL,
      messages,
      stream: options.stream ?? false,
    };

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      Accept: body.stream ? "text/event-stream" : "application/json",
    };

    const init: RequestInit = {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    };
    if (options.signal !== undefined) {
      init.signal = options.signal;
    }

    return this.fetchImpl(this.chatCompletionsUrl(), init);
  }

  async *streamChatTokens(
    messages: readonly ChatMessageInput[],
    options: { model?: string; signal?: AbortSignal } = {},
  ): AsyncGenerator<StreamTokenEvent, void, unknown> {
    const response = await this.createChatCompletion(messages, {
      ...options,
      stream: true,
    });

    if (!response.ok) {
      const detail = await safeErrorDetail(response);
      throw new Error(`GROQ chat completions failed (${response.status}): ${detail}`);
    }

    if (!response.body) {
      throw new Error("GROQ response did not include a readable body");
    }

    yield* iterateGroqSse(iterateWebStream(response.body));
  }
}

async function* iterateWebStream(body: ReadableStream<Uint8Array>): AsyncGenerator<Uint8Array> {
  const reader = body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        return;
      }
      if (value) {
        yield value;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

async function safeErrorDetail(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text.slice(0, 500);
  } catch {
    return response.statusText;
  }
}

function stripTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}
