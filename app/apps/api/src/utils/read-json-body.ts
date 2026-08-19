import type { ProblemDetails } from "@asad-architect/types";
import type { IncomingMessage } from "node:http";
import { problem } from "./http.js";

const DEFAULT_MAX_BYTES = 1_048_576;

export async function readJsonBody(
  req: IncomingMessage,
  maxBytes = DEFAULT_MAX_BYTES,
): Promise<unknown> {
  const chunks: Buffer[] = [];
  let received = 0;

  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    received += buf.length;
    if (received > maxBytes) {
      throw problem(413, "Payload Too Large", `Request body exceeds ${maxBytes} bytes`);
    }
    chunks.push(buf);
  }

  if (received === 0) {
    throw problem(400, "Bad Request", "JSON body is required");
  }

  const text = Buffer.concat(chunks).toString("utf8");
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw problem(400, "Bad Request", "Request body is not valid JSON");
  }
}

export function isProblemDetails(value: unknown): value is ProblemDetails {
  return (
    typeof value === "object" &&
    value !== null &&
    "status" in value &&
    "title" in value &&
    "type" in value &&
    typeof (value as { status: unknown }).status === "number" &&
    typeof (value as { title: unknown }).title === "string" &&
    typeof (value as { type: unknown }).type === "string"
  );
}
