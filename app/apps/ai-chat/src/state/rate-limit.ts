import { STORAGE_NAMESPACE } from "@asad-architect/types";

const KEY = `${STORAGE_NAMESPACE}:rate-window`;
const WINDOW_MS = 60_000;
const MAX_HITS = 24;

function readStamps(): number[] {
  if (typeof localStorage === "undefined") {
    return [];
  }
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item): item is number => typeof item === "number");
  } catch {
    return [];
  }
}

function writeStamps(stamps: readonly number[]): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.setItem(KEY, JSON.stringify(stamps));
}

/** Client-side sliding window so GROQ quota is not burned by a shared-device burst. */
export function tryConsumeRate(now = Date.now()): boolean {
  const fresh = readStamps().filter((stamp) => now - stamp < WINDOW_MS);
  if (fresh.length >= MAX_HITS) {
    writeStamps(fresh);
    return false;
  }
  writeStamps([...fresh, now]);
  return true;
}

export function rateWindowMs(): number {
  return WINDOW_MS;
}
