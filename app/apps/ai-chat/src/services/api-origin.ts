/**
 * Browser → API origin. Vite inlines VITE_* at build time.
 * Intentionally no localhost or same-origin production fallback.
 */
export function readCompiledApiOrigin(): string | undefined {
  const raw = import.meta.env.VITE_API_ORIGIN;
  if (typeof raw !== "string") {
    return undefined;
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}
