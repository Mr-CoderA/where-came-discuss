export {
  API_MEDIA,
  API_ROUTES,
  type ApiRoute,
  type ChatCompletionAccepted,
  type ChatCompletionRequest,
  type ChatJobStatus,
  type ChatMessageInput,
  type ChatRole,
  type HealthResponse,
  type Iso8601,
  type ProblemDetails,
  type ReadyResponse,
  type StreamQuery,
  type StreamTokenEvent,
} from "./api.js";

export {
  STORAGE_KEYS,
  STORAGE_NAMESPACE,
  type AppConfig,
  type Conversation,
  type Message,
  type Persona,
  type StorageSnapshot,
  type ThemePreference,
  type Ulid,
} from "./storage.js";

export const DEFAULT_INFERENCE_MODEL = "qwen/qwen3.6-27b" as const;
export const DEFAULT_HTTP_PORT = 3000 as const;
export const DEFAULT_BIND_ADDRESS = "0.0.0.0" as const;
