/**
 * HTTP middleware graph is assembled in a later milestone (CORS, OPTIONS, credentials).
 * This module exists so project references and the package layout stay stable.
 */
export const middlewareCatalog = ["cors", "options-preflight"] as const;
export type MiddlewareId = (typeof middlewareCatalog)[number];
