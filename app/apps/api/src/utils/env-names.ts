/**
 * Environment names for the API process.
 * Values are never defaulted to secrets or to invented local service URLs.
 */
export const API_ENV = {
  PORT: "PORT",
  CORS_ORIGIN: "CORS_ORIGIN",
  ALLOWED_ORIGINS: "ALLOWED_ORIGINS",
  GROQ_API_KEY: "GROQ_API_KEY",
  REPOFIXER_SELF_URL: "REPOFIXER_SELF_URL",
  PUBLIC_URL: "PUBLIC_URL",
} as const;

export type ApiEnvName = (typeof API_ENV)[keyof typeof API_ENV];
