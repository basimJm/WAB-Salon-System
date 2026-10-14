# WAB-Admin-Dashboard — Rules (mandatory for every task)

> These rules add to the root `CLAUDE.md`, the root `.claude/*.md` and `WAB-Admin-Dashboard/CLAUDE.md`. They never relax them; if two rules conflict, the stricter one wins. **This `.claude/` folder is where admin-level rules live: add or change admin rules here, not in scattered notes.**

## 1. Performance first

- Every route is lazy-loaded; the entry chunk stays small and vendors are split (`scripts/budget.json` is enforced by `npm run check:size`).
- Every list is paginated on the server; never fetch "all" and filter in the browser. Debounce search (constant from `constants/`), abort requests on unmount, cache with TanStack Query (stale time from constants).
- Render only what changed: stable keys, no inline object/function props on hot paths, `useMemo` / `useCallback` / `memo` only where a measurement or a stable-identity need justifies them, no state in effects that can be derived.
- No layout thrash, no blocking work on the main thread, images sized and lazy, fonts self-hosted subsets, no unused dependencies. Check the bundle report before adding a package.
- A change that makes a page measurably slower or breaks the budget is not done.

## 2. Tests: every function and every piece of logic

- **Every function and every piece of code that can fail ships with a unit test** in the same task: pure functions and use-cases, mappers and DTO parsing, repositories (against fixtures), hooks and controllers, components (render, states, interaction, accessibility), utilities and scripts.
- Cover the normal path, edge cases, error paths and the regression a fix addresses. A bug fix starts with a failing test.
- Tests live in `tests/` mirroring `src/`, use Vitest + Testing Library, are deterministic (fake timers/clocks, no network, no sleeps) and print nothing.
- New screens also get an e2e smoke test (Playwright). A task with untested logic is not done.

## 3. No hardcoded values

- No URLs, hosts, keys, colors, sizes, durations, limits, routes, storage keys, endpoint paths or user-visible text in components or logic. They live in `src/constants/`, `src/design/tokens/`, env config, or `src/locales/` (Arabic and English, same keys).
- Allowed literals: `0`, `1`, `-1` for arithmetic/indexing and strings inside tests. `npm run check:hardcoded` fails the build otherwise.

## 4. Dev and prod environments, always

- Everything works in all four variants: `dev-debug`, `dev-release`, `prod-debug`, `prod-release`.
- Environment differences come only from validated config (`.env.dev` / `.env.prod` or real env vars; keys listed in `.env.example`), never from `if (hostname === …)` or edited code. Public values only: nothing secret ships to the browser.
- Prod: https URLs, remote data source, no mock code, no dev ribbon or gallery, no source maps in release. Dev: mock transport allowed behind the switcher.
- A new setting means: key in `.env.example`, schema in `infrastructure/config`, default in `constants/`, a config test for dev and prod.

## 5. Clean code and clean architecture

- Layers (inward only): `domain` ← `data` / `infrastructure` ← `presentation` / `design` ← `app`. Pages never call `fetch`; controllers never touch the DOM; components never fetch. ESLint and `tests/architecture.test.ts` enforce it.
- Small single-purpose functions, intention-revealing names, early returns, no duplication (search before writing a helper), no dead code, comments explain _why_.
- Strict TypeScript: no `any`, no `@ts-ignore`; narrow `unknown`; discriminated unions for states; validate every external input (API responses, storage, URL params) with zod.
- No file over 300 lines (code, CSS, JSON, tests): split by responsibility.
- Every error is handled and surfaced (`AppError`, `ErrorState`, `InlineAlert`, logger); nothing fails silently. Arabic + English strings for everything the user sees; RTL/LTR, light/dark, phone → desktop, portrait and landscape.

## 6. Build before every commit, no build or runtime errors

- **Before every commit** run, and see pass: `npm run verify` (typecheck, lint with zero warnings, format check, unit tests, hardcoded/300-line scan) **and the build** of every variant the change can affect. Before every push build all four:
  ```bash
  VITE_API_BASE_URL=<https url> VITE_SOCKET_URL=<https url> \
  npm run build:dev-debug && npm run build:dev-release && npm run build:prod-debug && npm run build:prod-release
  npm run check:size -- dev-debug dev-release prod-debug prod-release
  ```
  (use placeholder URLs from the workflow, never real ones in code). New or changed screens also pass `npm run e2e`.
- Zero compile errors, zero lint/React/Vite/console warnings, zero runtime errors in the browser console. A red or skipped check is a blocker; never use `--no-verify`, never disable or skip a test to get green.

## 7. Never use deprecated APIs or outdated versions

- Use the current stable major of React, TypeScript, Vite, React Router, TanStack Query, zod, i18next and every other package; do not pin an old version to avoid a migration, and do not copy examples written for old versions.
- No deprecated API of any library or of the platform (examples to avoid: `ReactDOM.render`, `defaultProps` on function components, `findDOMNode`, legacy context, string refs, `String.prototype.substr`, `document.execCommand`, `new Buffer`, `moment`-style unmaintained packages). Read the library's changelog/migration guide when you touch it.
- Before adding or upgrading a dependency: check it is maintained and not marked deprecated on npm, run `npm outdated` and `npm audit --omit=dev`, prefer the version that matches the other tools' peer ranges, commit the lockfile. If an install prints a deprecation warning, fix it (replace the package) instead of ignoring it.
- Lint enforces what it can (`@typescript-eslint/no-deprecated` is part of the quality-gates task); the rest is on you in review.

## 8. Workflow (unchanged from the root rules)

One branch per task from an updated `main`, never push to `main`, three verification loops, four-role review, PR, CI green before merge, `.claude/session.md` and `.claude/memory.md` (root) kept current.
