# Repository guidance

## Layout

Work in `app/` (`packages/*`, `apps/*`). Git-root `package.json` is the npm workspace hub (`packageManager`: npm 10.8.2, Node `>=20.11.0`). pnpm can use `app/pnpm-workspace.yaml`. TypeScript project references: `app/tsconfig.json` + `app/tsconfig.base.json`.

| Package | Role |
| --- | --- |
| `@asad-architect/types` | Domain + HTTP types |
| `@asad-architect/ui` | Tokens and primitives |
| `@asad-architect/api` | Node API (`node dist/server.js`) |
| `@asad-architect/ai-chat` | Static Vite client |

Setup and env names: `app/docs/SETUP.md`, `app/.env.example`.

## Validation

From the git root, credential-free:

```bash
npm install
npm run build
```

Also: `npm run typecheck`, `npm run build -w <package>`. Build must not call GROQ, open a database, or require `GROQ_API_KEY` / `VITE_API_ORIGIN`. Do not add shims, fake binaries, or script overrides to pass CI. Do not add Docker/compose for Postgres, Redis, or similar; there is no in-repo datastore.

## Security

- Never commit `.env`, secrets, or invented local service URLs. Keep values out of `.env.example`.
- `GROQ_API_KEY` is server-only. Do not put it in the Vite bundle or client source.
- Browser API origin: `import.meta.env.VITE_API_ORIGIN` only (Vite `VITE_` prefix). No `process.env` in static output; no localhost/same-origin production fallbacks.
- CORS: comma-separated exact origins from `CORS_ORIGIN` (or `ALLOWED_ORIGINS`). Credentials + wildcard is forbidden. Do not insert `*` or localhost in the parser.
- Public URLs: `REPOFIXER_SELF_URL` or `PUBLIC_URL` plus a path constant. Do not ask operators for callback URLs hosted on this API.
- Bind planned HTTP to `0.0.0.0` and `PORT` (default 3000). Health/ready must not depend on GROQ or a database when those routes exist.
- No server authentication in this product; do not add a fake login.

## Privacy

History is client-side (`asad-architect-v1`). Treat conversation text as user data: do not log prompts, storage snapshots, or API bodies. Shared-device model: no per-user ACL. Inference, when implemented, leaves this process via GROQ using the host-supplied key.
