import { DEFAULT_BIND_ADDRESS, DEFAULT_HTTP_PORT } from "@asad-architect/types";
import { API_ENV } from "./env-names.js";

export function readListenPort(env: NodeJS.Dict<string> = process.env): number {
  const raw = env[API_ENV.PORT];
  if (raw === undefined || raw.length === 0) {
    return DEFAULT_HTTP_PORT;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`${API_ENV.PORT} must be an integer in 1–65535 when provided`);
  }
  return parsed;
}

export function listenAddress(): typeof DEFAULT_BIND_ADDRESS {
  return DEFAULT_BIND_ADDRESS;
}

/**
 * Split a comma-separated exact-origin allowlist. Empty tokens are dropped.
 * Does not insert localhost or wildcard entries.
 */
export function parseOriginAllowlist(raw: string | undefined): readonly string[] {
  if (raw === undefined || raw.trim().length === 0) {
    return [];
  }
  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

export function readCorsOriginList(env: NodeJS.Dict<string> = process.env): readonly string[] {
  const primary = env[API_ENV.CORS_ORIGIN];
  const alias = env[API_ENV.ALLOWED_ORIGINS];
  if (primary !== undefined && primary.length > 0) {
    return parseOriginAllowlist(primary);
  }
  return parseOriginAllowlist(alias);
}

/**
 * Public origin of this deployment for composing path-specific URLs in application code.
 */
export function readSelfOrigin(env: NodeJS.Dict<string> = process.env): string | undefined {
  const preferred = env[API_ENV.REPOFIXER_SELF_URL]?.trim();
  if (preferred) {
    return stripTrailingSlash(preferred);
  }
  const fallback = env[API_ENV.PUBLIC_URL]?.trim();
  if (fallback) {
    return stripTrailingSlash(fallback);
  }
  return undefined;
}

export function joinSelfUrl(pathname: string, env: NodeJS.Dict<string> = process.env): string {
  const origin = readSelfOrigin(env);
  if (!origin) {
    throw new Error(
      `${API_ENV.REPOFIXER_SELF_URL} or ${API_ENV.PUBLIC_URL} must be set to compose public URLs`,
    );
  }
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${origin}${path}`;
}

function stripTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}
