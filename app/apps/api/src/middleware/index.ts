export { applyCors, type CorsDecision } from "./cors.js";

export const middlewareCatalog = ["cors", "options-preflight"] as const;
export type MiddlewareId = (typeof middlewareCatalog)[number];
