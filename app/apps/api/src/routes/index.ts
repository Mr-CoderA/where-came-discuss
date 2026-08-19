import { API_ROUTES } from "@asad-architect/types";

/**
 * Route table for the forthcoming HTTP server. Handlers are not bound in this milestone.
 */
export const routeCatalog = {
  health: API_ROUTES.health,
  ready: API_ROUTES.ready,
  chat: API_ROUTES.chat,
  stream: API_ROUTES.stream,
} as const;
