/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public API origin, compile-time only. Empty in .env.example. */
  readonly VITE_API_ORIGIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
