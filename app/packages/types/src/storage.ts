/**
 * Client-persisted entities under localStorage namespace `asad-architect-v1`.
 * Validation is structural (TypeScript); run-time guards belong in the frontend app.
 */

import type { ChatRole, Iso8601 } from "./api.js";

export const STORAGE_NAMESPACE = "asad-architect-v1" as const;

export type Ulid = string;

export interface Message {
  readonly id: Ulid;
  readonly role: ChatRole;
  readonly content: string;
  readonly timestamp: Iso8601;
  readonly model: string;
}

export interface Conversation {
  readonly id: Ulid;
  readonly title: string;
  readonly createdAt: Iso8601;
  readonly updatedAt: Iso8601;
  readonly messages: readonly Message[];
}

export type ThemePreference = "light" | "dark";

export type Persona = "asad-architect";

export interface AppConfig {
  readonly theme: ThemePreference;
  readonly apiOrigin: string;
  readonly persona: Persona;
}

export interface StorageSnapshot {
  readonly version: 1;
  readonly conversations: readonly Conversation[];
  readonly config: AppConfig;
}

export const STORAGE_KEYS = {
  snapshot: `${STORAGE_NAMESPACE}:snapshot`,
  conversations: `${STORAGE_NAMESPACE}:conversations`,
  config: `${STORAGE_NAMESPACE}:config`,
} as const;
