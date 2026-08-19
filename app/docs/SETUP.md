# Asad Architect — local and deploy setup

This repository is a **single npm/pnpm workspace**. Install and build from the **git root**:

```bash
npm install
npm run build
```

From `app/` the same graph is available via pnpm:

```bash
pnpm install
pnpm build
```

Build order is enforced by package `dependsOn` (`^build`): `packages/types` → `packages/ui` → `apps/api` and `apps/ai-chat`.

## Packages

| Package | Role | Build | Production start (later milestone) |
| --- | --- | --- | --- |
| `@asad-architect/types` | Shared domain + HTTP contract types | `npm run build -w @asad-architect/types` | n/a (library) |
| `@asad-architect/ui` | Tokens, primitives, CSS cascade | `npm run build -w @asad-architect/ui` | n/a (library) |
| `@asad-architect/api` | HTTP API (Node) | `npm run build -w @asad-architect/api` | `node dist/server.js` |
| `@asad-architect/ai-chat` | Static frontend (Vite) | `npm run build -w @asad-architect/ai-chat` | static file hosting |

TypeScript **project references** are declared in `app/tsconfig.json`. Each package uses `composite` emit so `tsc -b` in `app/` type-checks the graph in dependency order.

## Environment variables

Copy `app/.env.example` to a private `.env` (or set variables on the host). **Do not put values in `.env.example`.**

### API (`apps/api`)

| Name | Required | Purpose |
| --- | --- | --- |
| `PORT` | No (platform usually sets it) | HTTP listen port. Bind `0.0.0.0`. |
| `CORS_ORIGIN` | Yes in production with a browser client | Comma-separated **exact** origins. Credentials enabled; never `*`. |
| `ALLOWED_ORIGINS` | No | Alias for `CORS_ORIGIN` if the primary name is unset. |
| `GROQ_API_KEY` | Yes for inference | GROQ API credential. Validated as a non-empty string at process boot (implementation in a later milestone). |
| `REPOFIXER_SELF_URL` / `PUBLIC_URL` | When the API must mint absolute URLs | Platform public origin. Path-specific URLs are composed in code; do not ask operators for callback URLs hosted on this service. |

### Frontend (`apps/ai-chat`)

| Name | Required | Purpose |
| --- | --- | --- |
| `VITE_API_ORIGIN` | Yes for a production static build | Public API origin, read **only at Vite build time** via `import.meta.env.VITE_API_ORIGIN`. No runtime `process.env`, no localhost, and no same-origin fallbacks. |

## CORS contract (implemented with the API server)

The API must treat `CORS_ORIGIN` as an exact-origin allowlist, answer `OPTIONS` globally for credentialed POST + `Content-Type`, echo the allowed requesting origin, set `Access-Control-Allow-Credentials: true`, and refuse wildcard + credentials.

## Storage (browser)

Conversation history is local only, namespaced `asad-architect-v1`. There is no application database and no Docker datastore in this project.

## Credential-free verification

Install, typecheck, and production **build** do not call GROQ, do not require `GROQ_API_KEY`, and do not need a live API origin. Live keys are supplied later through the host environment.
