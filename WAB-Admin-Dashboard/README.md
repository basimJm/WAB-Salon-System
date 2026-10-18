# WAB-Admin-Dashboard

React 19 + TypeScript (strict) + Vite admin panel for WAB Wedding & Beauty. Behavior: `docs/WAB_Admin_PRD.md`. Rules for contributors and AI agents: [`CLAUDE.md`](./CLAUDE.md).

## Quick start

```bash
npm ci
npm run dev            # dev-debug build, mock data source (no server needed); mock login code is in src/constants/auth.ts
npm run verify         # typecheck + lint (0 warnings) + format + unit tests + hardcoded/300-line scan
```

## Build variants

`npm run build:<dev-debug|dev-release|prod-debug|prod-release>` → `dist/<variant>/`. Every key is documented in `.env.example`; `npm run check:env` keeps it equal to `ENV_KEYS` and the zod schema. The app version (package.json), build id (short git sha, or `BUILD_ID` when set) and environment are injected at build and shown on `/about`; dev builds also show a DEV ribbon (never in prod). Copy `.env.example` to `.env.dev` / `.env.prod` (git-ignored) or set real env vars. `prod-*` needs https `VITE_API_BASE_URL` and `VITE_SOCKET_URL` and never contains the mock data source. `npm run check:size -- <variant>` checks the performance budget (`scripts/budget.json`) and that release builds ship no source maps.

## Tests

- Unit/integration: `npm test` (Vitest, Testing Library).
- Responsive e2e (Android-class Chromium + iOS-class WebKit, portrait and landscape): `npm run e2e`. Offline/local Chromium only: `E2E_CHROMIUM_ONLY=true PW_CHROMIUM_PATH=/path/to/chrome npm run e2e`.

## Security notes for hosting (REL-02)

Serve over HTTPS with a strict CSP (`default-src 'self'`; `connect-src` = API + socket origins), `X-Content-Type-Options: nosniff` and `frame-ancestors 'none'`. The panel keeps its access token in memory only.
