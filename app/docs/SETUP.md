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

| Package | Role | Build | Production start |
| --- | --- | --- | --- |
| `@asad-architect/types` | Shared domain + HTTP contract types | `npm run build -w @asad-architect/types` | n/a (library) |
| `@asad-architect/ui` | Tokens, primitives, CSS cascade | `npm run build -w @asad-architect/ui` | n/a (library) |
| `@asad-architect/api` | HTTP API (Node) | `npm run build -w @asad-architect/api` | `node dist/server.js` (from `app/apps/api`, or `npm start` at the repo root) |
| `@asad-architect/ai-chat` | Static frontend (Vite SPA) | `npm run build -w @asad-architect/ai-chat` | static file hosting (CDN / nginx). Not started by the API process. |

TypeScript **project references** are declared in `app/tsconfig.json`. Each package uses `composite` emit so `tsc -b` in `app/` type-checks the graph in dependency order.

## Environment variables

Copy `app/.env.example` to a private `.env` (or set variables on the host). **Do not put values in `.env.example`.**

### API (`apps/api`)

| Name | Required | Purpose |
| --- | --- | --- |
| `PORT` | No (platform usually sets it) | HTTP listen port. Bind `0.0.0.0`. |
| `CORS_ORIGIN` | Yes in production with a browser client | Comma-separated **exact** origins. Credentials enabled; never `*`. |
| `ALLOWED_ORIGINS` | No | Alias for `CORS_ORIGIN` if the primary name is unset. |
| `GROQ_API_KEY` | Yes at process boot | GROQ inference credential. The process fails fast if this is missing or blank. Health and readiness probes do not call GROQ. |
| `REPOFIXER_SELF_URL` / `PUBLIC_URL` | When the API must mint absolute URLs | Platform public origin. Path-specific URLs are composed in code; do not ask operators for callback URLs hosted on this service. |

### Frontend (`apps/ai-chat`)

| Name | Required | Purpose |
| --- | --- | --- |
| `VITE_API_ORIGIN` | Yes for a production static build | Public API origin, read **only at Vite build time** via `import.meta.env.VITE_API_ORIGIN`. No runtime `process.env`, no localhost, and no same-origin fallbacks. Documented without a value in `app/.env.example` and `app/apps/ai-chat/.env.example`. |

Static routes (React Router, history API): `/` drawing log, `/chat/:id` active sheet. Hosts must serve `index.html` for unknown paths.

The client stores conversations under `asad-architect-v1` in `localStorage` and enforces a sliding window (24 POSTs / 60s) before calling `POST /api/chat`. After accept (`{ id, status, token }`) it opens `GET /api/stream` and parses native SSE `data:` frames. Credentialed `fetch` is used; CORS must list the exact frontend origin.

## API process

After `npm run build`, start the API with a production entrypoint that **creates and listens on HTTP** (not a static file server):

```bash
npm start
# equivalent: npm run start -w @asad-architect/api
# equivalent: node dist/server.js   # cwd: app/apps/api
```

The listener binds `0.0.0.0:${PORT:-3000}` and stays alive with the HTTP server plus a 10s heartbeat (also used to expire in-memory stream jobs).

| Probe | Path | Behavior |
| --- | --- | --- |
| Liveness | `GET /health` | `{"status":"ok","timestamp":"<iso>"}` — no GROQ or datastore calls |
| Readiness | `GET /ready` | `{"status":"ready","checks":["middleware","routes","cors"]}` |

Path-specific public URLs are composed in code from `REPOFIXER_SELF_URL` or `PUBLIC_URL` plus a route constant. Do not configure callback URLs that point at this service.

## CORS contract

The API treats `CORS_ORIGIN` (or `ALLOWED_ORIGINS` if the primary name is unset) as a comma-separated **exact-origin** allowlist. Global `OPTIONS` handling covers credentialed `POST` plus `Content-Type` / `Authorization`. An allowed request origin is echoed in `Access-Control-Allow-Origin`, `Access-Control-Allow-Credentials` is `true`, and `*` is never used with credentials. Document `CORS_ORIGIN` with an empty value in `app/.env.example` and `app/apps/api/.env.example`.

## Storage (browser)

Conversation history is local only, namespaced `asad-architect-v1`. There is no application database and no Docker datastore in this project.

## Credential-free verification

Install and Turbo compilation do not call GROQ, do not require `GROQ_API_KEY`, and do not need a live API origin. Live keys are supplied later through the host environment.

The git-root contract `npm install && npm run build` finishes with `node app/scripts/verify-production-deploy.mjs`. That launch smoke:

1. Confirms `apps/api/dist/server.js` is an HTTP listener (not a directory server) and that the SPA `dist/` exists.
2. Compiles the frontend into a temporary directory with `VITE_API_ORIGIN` set to a non-secret test origin and asserts the origin is present in the static output.
3. Starts the API with `node dist/server.js`, `PORT` on an ephemeral port, `CORS_ORIGIN` set to an exact test origin, and a **placeholder** `GROQ_API_KEY` used only to satisfy boot-time non-empty validation (the key is never sent; `/health` and `/ready` do not call GROQ).
4. Probes `GET /health` and `GET /ready` over HTTP, re-probes after a keep-alive pause, and checks the process still reports bind `0.0.0.0`.
5. Sends credentialed `OPTIONS` preflight to `POST /api/chat` for the allowed origin (`204`, exact `Access-Control-Allow-Origin`, `Access-Control-Allow-Credentials: true`) and a disallowed origin (`403`, no wildcard).

Re-run the smoke alone after a build with `npm run verify:deploy` from the git root (or from `app/`).

Do not point `CORS_ORIGIN` or `VITE_API_ORIGIN` at invented localhost URLs in committed examples. Operators inject real origins at deploy time.
