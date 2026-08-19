import { API_ENV } from "../utils/env-names.js";

export const GROQ_ENV_KEY = API_ENV.GROQ_API_KEY;

/** Official OpenAI-compatible Groq HTTP API. Not a local or invented service URL. */
export const GROQ_OPENAI_COMPAT_BASE_URL = "https://api.groq.com/openai/v1";

export const GROQ_CHAT_COMPLETIONS_PATH = "/chat/completions";

export function readGroqApiKey(env: NodeJS.Dict<string> = process.env): string {
  const raw = env[GROQ_ENV_KEY];
  if (typeof raw !== "string" || raw.trim().length === 0) {
    throw new Error(`${GROQ_ENV_KEY} must be a non-empty string`);
  }
  return raw.trim();
}

export function assertGroqApiKeyPresent(env: NodeJS.Dict<string> = process.env): string {
  return readGroqApiKey(env);
}
