/**
 * OpenAPI-aligned HTTP contracts.
 * These types are the compile-time source of truth for the browser/server boundary.
 * Runtime servers and clients must not widen these shapes.
 */

export type Iso8601 = string;

export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessageInput {
  readonly role: ChatRole;
  readonly content: string;
}

export interface ChatCompletionRequest {
  readonly conversationId?: string;
  readonly messages: readonly ChatMessageInput[];
  readonly model?: string;
}

export type ChatJobStatus = "processing";

export interface ChatCompletionAccepted {
  /** Conversation / job id used as `conversationId` on the SSE route. */
  readonly id: string;
  readonly status: ChatJobStatus;
  /** One-time stream accessor; pass as `token` on `GET /api/stream`. */
  readonly token: string;
}

export interface StreamQuery {
  readonly conversationId: string;
  readonly token: string;
}

export interface StreamTokenEvent {
  readonly token: string;
  readonly done: boolean;
  /** Present only when the stream ended because inference failed. */
  readonly error?: string;
}

/** RFC 7807 Problem Details. */
export interface ProblemDetails {
  readonly type: string;
  readonly title: string;
  readonly status: number;
  readonly detail?: string;
  readonly instance?: string;
}

export interface HealthResponse {
  readonly status: "ok";
  readonly timestamp: Iso8601;
}

export interface ReadyResponse {
  readonly status: "ready";
  readonly checks: readonly ["middleware", "routes", "cors"] | readonly string[];
}

export const API_ROUTES = {
  health: "/health",
  ready: "/ready",
  chat: "/api/chat",
  stream: "/api/stream",
} as const;

export type ApiRoute = (typeof API_ROUTES)[keyof typeof API_ROUTES];

export const API_MEDIA = {
  json: "application/json",
  problem: "application/problem+json",
  sse: "text/event-stream",
} as const;
