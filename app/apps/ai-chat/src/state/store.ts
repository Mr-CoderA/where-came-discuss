import { useSyncExternalStore } from "react";
import type { Conversation, Message, StorageSnapshot, ThemePreference } from "@asad-architect/types";
import { readCompiledApiOrigin } from "../services/api-origin.js";
import { titleFromPrompt } from "./guards.js";
import { emptyState, reduce, toSnapshot, type ClientAction, type ClientState, type StreamCursor } from "./machine.js";
import { defaultConfig, preferredTheme, readPersistedSnapshot, writePersistedSnapshot } from "./persist.js";
import { createUlid, nowIso } from "./ulid.js";

const compiledOrigin = readCompiledApiOrigin() ?? "";

function hydrate(): ClientState {
  const persisted = readPersistedSnapshot(compiledOrigin);
  if (persisted) {
    return {
      ...emptyState({ ...persisted.config, apiOrigin: compiledOrigin }),
      conversations: persisted.conversations,
      config: { ...persisted.config, apiOrigin: compiledOrigin },
    };
  }
  return emptyState(defaultConfig(compiledOrigin, preferredTheme()));
}

let state: ClientState = hydrate();
const listeners = new Set<() => void>();
let persistHandle = 0;

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

function persistNow(): void {
  writePersistedSnapshot(toSnapshot(state));
}

function schedulePersist(): void {
  if (persistHandle !== 0) {
    return;
  }
  persistHandle = window.setTimeout(() => {
    persistHandle = 0;
    persistNow();
  }, 120);
}

function dispatch(action: ClientAction, persist: "sync" | "defer" | "none" = "sync"): void {
  const next = reduce(state, action);
  if (next === state) {
    return;
  }
  state = next;
  if (persist === "sync") {
    persistNow();
  } else if (persist === "defer") {
    schedulePersist();
  }
  emit();
}

export function subscribeStore(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getStoreSnapshot(): ClientState {
  return state;
}

export function useClientState(): ClientState {
  return useSyncExternalStore(subscribeStore, getStoreSnapshot, getStoreSnapshot);
}

export function useConversation(id: string | undefined): Conversation | undefined {
  const snapshot = useClientState();
  if (id === undefined) {
    return undefined;
  }
  return snapshot.conversations.find((item) => item.id === id);
}

export function createConversation(): Conversation {
  const timestamp = nowIso();
  const conversation: Conversation = {
    id: createUlid(),
    title: "Untitled sheet",
    createdAt: timestamp,
    updatedAt: timestamp,
    messages: [],
  };
  dispatch({ type: "upsert", conversation });
  return conversation;
}

export function deleteConversation(id: string): void {
  dispatch({ type: "remove", id });
}

export function setTheme(theme: ThemePreference): void {
  dispatch({ type: "theme", theme });
}

export function setNotice(notice: string | null): void {
  dispatch({ type: "notice", notice }, "none");
}

export function setStream(stream: StreamCursor | null): void {
  dispatch({ type: "stream", stream }, "none");
}

export function importArchive(snapshot: StorageSnapshot): void {
  dispatch({
    type: "replace",
    snapshot: {
      ...snapshot,
      config: { ...snapshot.config, apiOrigin: compiledOrigin },
    },
  });
}

export function exportArchive(): string {
  return JSON.stringify(toSnapshot(state), null, 2);
}

export function appendMessage(
  conversationId: string,
  input: Pick<Message, "role" | "content" | "model">,
): Message {
  const message: Message = {
    id: createUlid(),
    role: input.role,
    content: input.content,
    model: input.model,
    timestamp: nowIso(),
  };
  const existing = state.conversations.find((item) => item.id === conversationId);
  if (existing && existing.messages.length === 0 && input.role === "user") {
    dispatch({
      type: "upsert",
      conversation: {
        ...existing,
        title: titleFromPrompt(input.content),
        updatedAt: message.timestamp,
        messages: [message],
      },
    });
    return message;
  }
  dispatch({ type: "append-message", conversationId, message });
  return message;
}

export function patchMessageContent(
  conversationId: string,
  messageId: string,
  content: string,
  persist: "sync" | "defer" = "defer",
): void {
  dispatch(
    {
      type: "patch-message",
      conversationId,
      messageId,
      content,
      timestamp: nowIso(),
    },
    persist,
  );
}
