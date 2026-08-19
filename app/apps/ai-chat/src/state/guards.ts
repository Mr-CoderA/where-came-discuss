import type {
  Conversation,
  Message,
  StorageSnapshot,
  ThemePreference,
} from "@asad-architect/types";

const ROLES = new Set(["user", "assistant", "system"]);

export function isTheme(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark";
}

export function isMessage(value: unknown): value is Message {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    record.id.length > 0 &&
    typeof record.role === "string" &&
    ROLES.has(record.role) &&
    typeof record.content === "string" &&
    typeof record.timestamp === "string" &&
    typeof record.model === "string"
  );
}

export function isConversation(value: unknown): value is Conversation {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    record.id.length > 0 &&
    typeof record.title === "string" &&
    typeof record.createdAt === "string" &&
    typeof record.updatedAt === "string" &&
    Array.isArray(record.messages) &&
    record.messages.every(isMessage)
  );
}

export function parseSnapshot(value: unknown, apiOrigin: string): StorageSnapshot | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  if (record.version !== 1 || !Array.isArray(record.conversations)) {
    return undefined;
  }
  const conversations = record.conversations.filter(isConversation);
  const theme = isTheme((record.config as { theme?: unknown } | undefined)?.theme)
    ? (record.config as { theme: ThemePreference }).theme
    : "light";
  return {
    version: 1,
    conversations,
    config: {
      theme,
      apiOrigin,
      persona: "asad-architect",
    },
  };
}

export function titleFromPrompt(text: string): string {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length === 0) {
    return "Untitled sheet";
  }
  if (compact.length <= 52) {
    return compact;
  }
  return `${compact.slice(0, 49).trimEnd()}…`;
}
