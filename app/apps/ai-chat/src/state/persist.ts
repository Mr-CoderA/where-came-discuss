import { STORAGE_KEYS, type AppConfig, type StorageSnapshot } from "@asad-architect/types";
import { parseSnapshot } from "./guards.js";

export function readPersistedSnapshot(apiOrigin: string): StorageSnapshot | undefined {
  if (typeof localStorage === "undefined") {
    return undefined;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.snapshot);
    if (raw === null || raw.length === 0) {
      return undefined;
    }
    return parseSnapshot(JSON.parse(raw) as unknown, apiOrigin);
  } catch {
    return undefined;
  }
}

export function writePersistedSnapshot(snapshot: StorageSnapshot): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.setItem(STORAGE_KEYS.snapshot, JSON.stringify(snapshot));
}

export function defaultConfig(apiOrigin: string, theme: AppConfig["theme"] = "light"): AppConfig {
  return {
    theme,
    apiOrigin,
    persona: "asad-architect",
  };
}

export function preferredTheme(): AppConfig["theme"] {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
