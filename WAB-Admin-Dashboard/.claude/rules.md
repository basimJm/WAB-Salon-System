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

### Run it and look at it before every commit (browser UI check)

Green unit tests are not enough for a UI project. **Before every commit** (not only before the push):

1. **Build and run the project:** build the variant the change affects, serve it (`npm run dev`, or `vite preview --mode <variant> --outDir dist/<variant>` for a built variant) and open it in a real browser (the preinstalled Chromium through Playwright; locally `PW_CHROMIUM_PATH=<chromium>`).
2. **Use it like an admin:** click through every screen, state and behaviour the change touches, in Arabic RTL and English LTR, light and dark, phone / tablet / desktop widths, portrait and landscape. Exercise loading, empty, error, validation and success states.
3. **Console and network clean:** zero errors and zero warnings in the browser console, no failed or unexpected requests.
4. **Match the requirements, not just the code:** compare what you see with the PRD page (A00–A29), the BRD ids, the task row in `docs/WAB_Admin_Tasks.md`, the Design Script and the matching file in `design/`, and with `BUSINESS_DOMAIN.md` (field names, enums, state machines, permissions, error codes, JOD and Asia/Amman rules). Behaviour follows the PRD (PRD wins over the design). Fix every mismatch or record it as an open item in `session.md`; never silently accept it.
5. **Make it repeatable:** turn what you verified by hand into Playwright e2e assertions (`e2e/`), and keep screenshots of the checked screens in the scratchpad.
6. **Say it:** the commit/PR body states what was opened and compared (screens, widths, languages, themes) and the result. A UI change committed without this check is not done.

## 7. Never use deprecated APIs or outdated versions

- Use the current stable major of React, TypeScript, Vite, React Router, TanStack Query, zod, i18next and every other package; do not pin an old version to avoid a migration, and do not copy examples written for old versions.
- No deprecated API of any library or of the platform (examples to avoid: `ReactDOM.render`, `defaultProps` on function components, `findDOMNode`, legacy context, string refs, `String.prototype.substr`, `document.execCommand`, `new Buffer`, `moment`-style unmaintained packages). Read the library's changelog/migration guide when you touch it.
- Before adding or upgrading a dependency: check it is maintained and not marked deprecated on npm, run `npm outdated` and `npm audit --omit=dev`, prefer the version that matches the other tools' peer ranges, commit the lockfile. If an install prints a deprecation warning, fix it (replace the package) instead of ignoring it.
- Lint enforces what it can (`@typescript-eslint/no-deprecated`, complexity, max-params and max-depth are errors); the rest is on you in review.

## 8. Workflow

- **Branching:** `admin` is the master branch for admin work (created from `main`). Every task branches from the latest `origin/admin` as `feat/adm-NNN-<key>` and its PR targets `admin`, never `main`. After each merge, branch the next task from the updated `origin/admin`. If `admin` is behind `main`, merge `main` into `admin` through a PR first. The user merges `admin` into `main`.
- **No GitHub CI (user decision):** the gate is local. Before every push run the local gate on the developer machine: `npm ci`, `npm run verify`, the four variant builds (`npm run build:dev-debug`, `build:dev-release`, `build:prod-debug`, `build:prod-release`) with `VITE_API_BASE_URL`/`VITE_SOCKET_URL` set to https placeholders, `npm run check:size -- dev-debug dev-release prod-debug prod-release`, and `npm run e2e` for screens, after the browser UI check of §6 (build, run, click through, match PRD/BRD/tasks/domain). Push only when everything is green and say what you ran. Merge a task PR into `admin` only after that gate; the user also runs the branch on their own device before merging `admin` into `main`.
- Also from the root rules: never push to `main`, three verification loops, four-role review, `.claude/session.md` and `.claude/memory.md` (root) kept current.
