import type { ReadyResponse } from "@asad-architect/types";
import type { ServerResponse } from "node:http";
import { sendJson } from "../utils/http.js";

export const READY_CHECKS = ["middleware", "routes", "cors"] as const;

export interface ReadySnapshot {
  readonly middleware: boolean;
  readonly routes: boolean;
  readonly cors: boolean;
}

export function sendReady(res: ServerResponse, snapshot: ReadySnapshot): void {
  if (!snapshot.middleware || !snapshot.routes || !snapshot.cors) {
    sendJson(res, 503, {
      status: "error",
      checks: [...READY_CHECKS],
    });
    return;
  }

  const body: ReadyResponse = {
    status: "ready",
    checks: READY_CHECKS,
  };
  sendJson(res, 200, body);
}
