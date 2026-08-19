# Features

**Asad Architect** is a household/team chat client: long conversations live in the browser; inference is a separate Node API. There is no application database and no server-side accounts. Everyone sharing a device has the same local read/write/delete of history.

## Now

- **Monorepo** under `app/`: `@asad-architect/types`, `@asad-architect/ui`, `@asad-architect/api`, `@asad-architect/ai-chat`. Root `npm install` / `npm run build` (Turbo `^build`).
- **Compile-time contracts** in `@asad-architect/types` (and `packages/types/openapi.yaml`): `Conversation` / `Message` / `AppConfig`; routes `/health`, `/ready`, `POST /api/chat`, `GET /api/stream`; RFC 7807 problem details; default model `qwen-2.5-72b`.
- **Browser storage model** namespaced `asad-architect-v1` (`STORAGE_KEYS` for snapshot, conversations, config). Persistence is specified; the UI does not write history yet.
- **Design host** (`ai-chat`): Vite + React, CSS tokens (6px scale, 12-step gray, one accent), `Canvas` / `HairlineRule`. Intended routes `/` and `/chat/:id`. `VITE_API_ORIGIN` is inlined at build time with no localhost or same-origin fallback.
- **API package**: env name catalog, `PORT` (default `3000`), bind address `0.0.0.0`, CORS allowlist parse (`CORS_ORIGIN`, alias `ALLOWED_ORIGINS`), public URL join from `REPOFIXER_SELF_URL` or `PUBLIC_URL`. Production start target is `node dist/server.js`. The process does not listen or serve routes yet; GROQ is named (`GROQ_API_KEY`) and not called.

## Architecture

```
browser (static Vite)  --VITE_API_ORIGIN-->  API (Node, planned HTTP)
         |                                         |
    localStorage                              GROQ (env key only)
    asad-architect-v1
```

Shared types are the browser/server boundary. The API is not a static file server. Cross-origin access is an exact-origin allowlist with credentials (no `*`). Path-specific public URLs are composed in code from the platform origin, not from operator-supplied callback URLs on this service.
