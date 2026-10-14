# WAB-Admin-Dashboard — Rules for AI Agents

> These rules add to the root `CLAUDE.md` and `.claude/*.md`. They never relax them. If two rules conflict, the stricter one wins. If documents conflict, stop and ask.
>
> **Admin-level rules and role live in this project's own `.claude/` folder — mandatory, read and apply both:**
>
> - Rules: @.claude/rules.md
> - Role (senior web developer: React, JS, TS): @.claude/roles.md

## 0. Read Before Every Task (mandatory)

1. Root `CLAUDE.md` and **every** `.md` file in the root `.claude/` folder (`rules.md`, `roles.md`, `hooks.md`, `session.md`, `memory.md`), plus the root files `BUSINESS_DOMAIN.md`, `ROADMAP.md`, `INTEGRATION_WORKFLOW.md`.
2. `docs/WAB_Admin_PRD.md` (behavior, source of truth), `docs/WAB_Admin_BRD.md`, `docs/WAB_Admin_Design_Script.md`, and the matching file in `design/` (visual reference).
3. `.claude/rules.md` and `.claude/roles.md` of this project (performance, tests for every function, no hardcoding, dev/prod, clean architecture, build before every commit, no deprecated APIs).
4. `docs/WAB_Admin_Tasks.md` — the ordered task backlog (strict order, one task per branch, layer recipe in its §3, real admin API operations in its Appendix A). Pick the first `TODO` task whose _Needs_ are `DONE`.

## 1. The Rules (non-negotiable)

1. **Clean Architecture + MVC** (§2). Dependencies point inward only; ESLint and `tests/architecture.test.ts` enforce it.
2. **Never hardcode.** No URLs, hosts, keys, colors, sizes, durations, limits, routes, storage keys or user-visible text in components. They live in `src/constants/`, `src/design/tokens/`, env config, or `src/locales/`. `npm run check:hardcoded` fails the build on violations (add `hardcoded-ok: <reason>` only for a justified exception).
3. **Arabic and English for every string.** Add each key to both `src/locales/ar.json` and `en.json`; `tests/i18n.test.ts` fails on a missing key, empty value, or placeholder mismatch. Arabic (RTL) is the default.
4. **Performance first.** Lazy-load every route, keep the entry small, split vendors, paginate every list server-side, memoize only where measured, no layout thrash. `scripts/budget.json` sets gzip budgets; `npm run check:size` enforces them on release builds.
5. **All four build variants must build:** `dev-debug`, `dev-release`, `prod-debug`, `prod-release` (§4).
6. **Run the full local gate before every push** (there is no GitHub CI for the admin panel): `npm run verify`, all four variant builds, `check:size`, and e2e for screens. The user also runs the branch on their own device before it reaches `main`.
7. **Zero runtime errors, compile errors and warnings.** `tsc` strict, `eslint --max-warnings 0`, no console output in tests/builds, no React/Vite warnings.
8. **No file longer than 300 lines** (code, CSS, JSON, tests). Split instead. ESLint `max-lines` and the hardcoded scan enforce it.
9. **Responsive everywhere:** phone, tablet, desktop; portrait and landscape; every size scales (rem tokens, fluid root font size, `minmax(0, …)` grids, no horizontal page scroll). New UI ships with an e2e check in `e2e/`.
10. **One branch per task**, branched from an updated `origin/admin` (the admin master branch, root rules §3.9). **Never push to `main`.** The PR targets `admin`; merge it only after the local gate (rule 6) is green.

## 2. Architecture — Clean Architecture with MVC

```
src/
  constants/        ALL static values (routes, nav, icons, limits, storage keys, endpoints, error kinds)
  design/           tokens/ (colors, layout), theme/ (CSS variables, theme provider), styles/ (token-only CSS)
  domain/           M — entities + repository INTERFACES. Imports nothing from the app.
  data/             M — repository implementations (remote over HttpClient, mock for dev builds)
  infrastructure/   config, http client, errors, logger, i18n, storage, observability. No UI.
  presentation/
    components/     V — dumb, reusable base components (core, form, data, feedback, overlay)
    pages/          V — screens, composed from components, no business logic
    layout/         V — app shell, sidebar, topbar
    controllers/    C — hooks that orchestrate repositories, validation and navigation for a page
    hooks/          shared UI hooks
  app/              composition root: container (wiring), providers, routes
  locales/          ar.json, en.json
```

- **Model** = `domain` + `data`. **View** = `presentation/components|pages|layout`. **Controller** = `presentation/controllers` (and the `app` composition root).
- Allowed imports: `domain` → nothing; `infrastructure` → constants; `data` → domain, infrastructure; `design` → constants, infrastructure/storage; `presentation` → everything except `data` (it reaches repositories only through `useContainer()`); `app` wires everything.
- Pages never call `fetch`; they use a controller. Controllers never touch the DOM or JSX. Components never fetch.
- Every cross-project dependency (API, socket) sits behind a domain interface with a real and a mock implementation, selected only by `VITE_DATA_SOURCE` (`INTEGRATION_WORKFLOW.md` §3). The mock is compiled out of prod builds.

## 3. Design System

- Tokens are cloned from the WAB customer design system (`design/wab-admin-kit.js`): add or change a color, size or font only in `src/design/tokens/`. `buildCssVars()` turns tokens into CSS custom properties; stylesheets use `var(--…)` only (a test fails if a stylesheet uses an undefined variable).
- Use logical CSS (`inline-start/end`, `margin-inline`) so RTL/LTR and light/dark work without overrides. Mirror direction-bearing icons with `directional`.
- Every base component handles: loading (skeleton), empty, error with retry, disabled, focus-visible, keyboard, and an accessible name. Reuse `src/presentation/components/` before writing a new one; extend the dev-only gallery (`/design-system`) with each new component state.
- Layout classes come from `useViewport()` (`compact` < 640, `medium` < 1024, `expanded`), exposed as `data-bp` / `data-orientation` on `<html>`.

## 4. Build Variants and Environments

| Variant        | Env  | Type    | Minified | Source maps | Mock data source |
| -------------- | ---- | ------- | -------- | ----------- | ---------------- |
| `dev-debug`    | dev  | debug   | no       | yes         | allowed          |
| `dev-release`  | dev  | release | yes      | no          | allowed          |
| `prod-debug`   | prod | debug   | no       | yes         | **excluded**     |
| `prod-release` | prod | release | yes      | no          | **excluded**     |

- Pick one with `npm run build:<variant>` (Vite `--mode <variant>`); `npm run dev` uses `dev-debug`.
- Public, non-secret values come from `.env.dev` / `.env.prod` (git-ignored; keys in `.env.example`) or real env vars. Missing/invalid values fail the build and the app start with a `ConfigError` that names keys only. Prod requires `https` URLs and the `remote` data source.
- **"Android and iOS" for this web panel** means the browsers and viewports those platforms use: Chrome on Android (Chromium, Pixel/Galaxy Tab) and Safari on iOS (WebKit, iPhone/iPad), each in portrait and landscape. e2e runs locally (`npm run e2e`; WebKit projects need a machine with WebKit, e.g. the user's device).

## 5. Errors

- All failures become `AppError` (`infrastructure/errors`) with a `kind`; every kind has an `errors.<kind>` message in both locales. Servers' localized `message` is shown when present; branch on `code`/`kind`, never on text.
- `HttpClient` is the only network code: timeout, retry of idempotent calls on transient failures, envelope validation (zod), 401 → sign-out. Never swallow errors: log through `Logger` (redacts tokens/passwords/OTP) or show `ErrorState`.
- Render crashes are caught by `ErrorBoundary`; `window.error` and unhandled rejections are logged by `registerGlobalErrorHandlers`.
- Tokens stay in memory (never `localStorage`); `safeStorage` is only for UI preferences.

## 6. Tests and Delivery

- Every task ships unit tests (Vitest + Testing Library) for its acceptance criteria and edge cases, and e2e (Playwright) for new screens. Run `npm run verify`; locally e2e: `E2E_CHROMIUM_ONLY=true PW_CHROMIUM_PATH=<chromium> npm run e2e` (WebKit projects need a machine with WebKit, e.g. the user's device).
- Follow the root workflow: branch → implement → 3 verification loops → 4-role review → full local gate → PR into `admin`. Record the task in `.claude/session.md` and durable facts in `.claude/memory.md`.
- Admin APIs: behavior from the PRD, wire format from `contracts/` once INT-01 exists. Until then the assumed admin-auth endpoints live in `src/constants/endpoints.ts` (marked ASSUMPTION) behind `AuthRepository`.
