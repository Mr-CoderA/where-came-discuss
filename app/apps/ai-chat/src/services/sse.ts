import type { StreamTokenEvent } from "@asad-architect/types";

/**
 * Native SSE block parser. Yields one JSON payload per `data:` event.
 * Incomplete trailing chunks stay buffered until the next read or stream end.
 */
export async function* readSseData<T>(
  body: ReadableStream<Uint8Array>,
  signal: AbortSignal,
): AsyncGenerator<T> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const onAbort = (): void => {
    void reader.cancel();
  };
  signal.addEventListener("abort", onAbort, { once: true });

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split("\n\n");
      buffer = blocks.pop() ?? "";
      for (const block of blocks) {
        const payload = dataLine(block);
        if (payload !== undefined) {
          yield JSON.parse(payload) as T;
        }
      }
    }
    buffer += decoder.decode();
    if (buffer.trim().length > 0) {
      const payload = dataLine(buffer);
      if (payload !== undefined) {
        yield JSON.parse(payload) as T;
      }
    }
  } finally {
    signal.removeEventListener("abort", onAbort);
    reader.releaseLock();
  }
}

function dataLine(block: string): string | undefined {
  for (const rawLine of block.split("\n")) {
    const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;
    if (line.startsWith("data:")) {
      const value = line.slice(5).trimStart();
      if (value.length > 0 && value !== "[DONE]") {
        return value;
      }
    }
  }
  return undefined;
}

export function isStreamTokenEvent(value: unknown): value is StreamTokenEvent {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.token === "string" && typeof record.done === "boolean";
}
