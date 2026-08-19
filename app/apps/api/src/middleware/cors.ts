import type { IncomingMessage, ServerResponse } from "node:http";
import { requestMethod } from "../utils/http.js";

const ALLOW_METHODS = "GET, POST, OPTIONS";
const ALLOW_HEADERS = "Content-Type, Authorization";
const MAX_AGE_SECONDS = "600";

export interface CorsDecision {
  readonly allowedOrigin: string | undefined;
  readonly handled: boolean;
}

/**
 * Credentialed CORS: exact-origin allowlist only.
 * Never emits Access-Control-Allow-Origin: * together with credentials.
 */
export function applyCors(
  req: IncomingMessage,
  res: ServerResponse,
  allowlist: readonly string[],
): CorsDecision {
  const originHeader = req.headers.origin;
  const origin = typeof originHeader === "string" ? originHeader : undefined;
  const allowedOrigin = origin !== undefined && allowlist.includes(origin) ? origin : undefined;

  if (allowedOrigin !== undefined) {
    res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", ALLOW_METHODS);
    res.setHeader("Access-Control-Allow-Headers", ALLOW_HEADERS);
    res.setHeader("Access-Control-Max-Age", MAX_AGE_SECONDS);
    res.setHeader("Vary", "Origin");
  }

  if (requestMethod(req) === "OPTIONS") {
    if (origin !== undefined && allowedOrigin === undefined) {
      res.statusCode = 403;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("Origin is not allowed");
      return { allowedOrigin, handled: true };
    }
    res.statusCode = 204;
    res.end();
    return { allowedOrigin, handled: true };
  }

  return { allowedOrigin, handled: false };
}
