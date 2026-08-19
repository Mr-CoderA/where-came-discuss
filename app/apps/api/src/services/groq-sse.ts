import type { StreamTokenEvent } from "@asad-architect/types";

/**
 * Incremental SSE frame splitter. Does not perform I/O.
 */
export function appendSseChunk(carry: string, chunk: string): { frames: string[]; rest: string } {
  const combined = carry + chunk;
  const frames = combined.split("\n\n");
  const rest = frames.pop() ?? "";
  return { frames: frames.filter((frame) => frame.trim().length > 0), rest };
}

export function sseFrameDataPayloads(frame: string): string[] {
  const payloads: string[] = [];
  for (const rawLine of frame.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (line.startsWith("data:")) {
      payloads.push(line.slice("data:".length).trimStart());
    }
  }
  return payloads;
}

export function tokenEventFromGroqData(payload: string): StreamTokenEvent | undefined {
  if (payload === "[DONE]") {
    return { token: "", done: true };
  }
  try {
    const parsed = JSON.parse(payload) as unknown;
    if (typeof parsed !== "object" || parsed === null) {
      return undefined;
    }
    const record = parsed as {
      error?: { message?: unknown };
      choices?: Array<{ delta?: { content?: unknown }; finish_reason?: unknown }>;
    };
    if (record.error) {
      const message =
        typeof record.error.message === "string" ? record.error.message : "GROQ stream error";
      throw new Error(message);
    }
    const choice = record.choices?.[0];
    const content = choice?.delta?.content;
    const token = typeof content === "string" ? content : "";
    const finished = choice?.finish_reason != null && choice.finish_reason !== "";
    return { token, done: finished };
  } catch (error) {
    if (error instanceof Error && error.message !== "Unexpected end of JSON input") {
      throw error;
    }
    return undefined;
  }
}

export async function* iterateGroqSse(
  stream: AsyncIterable<string | Uint8Array>,
): AsyncGenerator<StreamTokenEvent, void, unknown> {
  const decoder = new TextDecoder();
  let carry = "";

  for await (const chunk of stream) {
    const text = typeof chunk === "string" ? chunk : decoder.decode(chunk, { stream: true });
    const { frames, rest } = appendSseChunk(carry, text);
    carry = rest;
    for (const frame of frames) {
      for (const payload of sseFrameDataPayloads(frame)) {
        const event = tokenEventFromGroqData(payload);
        if (!event) {
          continue;
        }
        yield event;
        if (event.done) {
          return;
        }
      }
    }
  }

  const tail = decoder.decode();
  if (tail.length > 0 || carry.length > 0) {
    const { frames } = appendSseChunk(carry, tail);
    for (const frame of frames) {
      for (const payload of sseFrameDataPayloads(frame)) {
        const event = tokenEventFromGroqData(payload);
        if (event) {
          yield event;
          if (event.done) {
            return;
          }
        }
      }
    }
  }

  yield { token: "", done: true };
}
