import { API_MEDIA, type ProblemDetails } from "@asad-architect/types";
import type { IncomingMessage, ServerResponse } from "node:http";

export const JSON_CONTENT_TYPE = `${API_MEDIA.json}; charset=utf-8`;
export const PROBLEM_CONTENT_TYPE = `${API_MEDIA.problem}; charset=utf-8`;

export function sendJson(
  res: ServerResponse,
  status: number,
  body: unknown,
  extraHeaders?: Readonly<Record<string, string>>,
): void {
  if (res.headersSent) {
    return;
  }
  const payload = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader("Content-Type", JSON_CONTENT_TYPE);
  res.setHeader("Cache-Control", "no-store");
  if (extraHeaders) {
    for (const [name, value] of Object.entries(extraHeaders)) {
      res.setHeader(name, value);
    }
  }
  res.end(payload);
}

export function sendProblem(res: ServerResponse, problem: ProblemDetails): void {
  if (res.headersSent) {
    return;
  }
  res.statusCode = problem.status;
  res.setHeader("Content-Type", PROBLEM_CONTENT_TYPE);
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(problem));
}

export function problem(
  status: number,
  title: string,
  detail?: string,
  type = `urn:asad-architect:problem:${slug(title)}`,
): ProblemDetails {
  const document: ProblemDetails = {
    type,
    title,
    status,
  };
  if (detail !== undefined) {
    return { ...document, detail };
  }
  return document;
}

export function requestPath(req: IncomingMessage): string {
  const raw = req.url ?? "/";
  const url = new URL(raw, "http://127.0.0.1");
  return url.pathname;
}

export function requestQuery(req: IncomingMessage): URLSearchParams {
  const raw = req.url ?? "/";
  const url = new URL(raw, "http://127.0.0.1");
  return url.searchParams;
}

export function requestMethod(req: IncomingMessage): string {
  return (req.method ?? "GET").toUpperCase();
}

function slug(title: string): string {
  const normalized = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return normalized.length > 0 ? normalized : "error";
}
