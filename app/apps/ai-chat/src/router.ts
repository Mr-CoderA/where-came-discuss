export const ROUTES = {
  history: "/",
  chat: "/chat/:id",
} as const;

export function chatPath(id: string): string {
  return `/chat/${encodeURIComponent(id)}`;
}
