import type { HealthResponse } from "@asad-architect/types";
import type { ServerResponse } from "node:http";
import { sendJson } from "../utils/http.js";

export function sendHealth(res: ServerResponse): void {
  const body: HealthResponse = {
    status: "ok",
    timestamp: new Date().toISOString(),
  };
  sendJson(res, 200, body);
}
