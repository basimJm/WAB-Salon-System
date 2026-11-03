# WAB-Admin-Dashboard — Task Backlog (build the whole admin panel)

> **Purpose:** every task needed to build the admin panel, small and ordered, each with a status. One task = one branch = one PR.
> **Order of work (requested):** **Phase 1 project setup → Phase 2 project structure and architecture → Phase 3 design → Phase 4 business logic and API implementation → Phase 5 integration and release.**
> **Written by:** product owner + technical writer. Rules for how code is written live in [`../CLAUDE.md`](../CLAUDE.md) and win over this file on conventions.
> **Sources read:** root `CLAUDE.md` and `.claude/*`, `BUSINESS_DOMAIN.md`, `INTEGRATION.md`, `docs/WAB_Admin_PRD.md` (A00–A29), `docs/WAB_Admin_BRD.md` (ABR-xx), `docs/WAB_Admin_Design_Script.md`, `design/WAB Admin 0x *.dc.html`, `WAB-Server/docs/WAB_Server_Tasks.md` and **`WAB-Server/docs/api/openapi.admin.json` (the real admin API: 116 operations)**.
> **Totals:** 83 numbered tasks. Status counts: `python3 scripts/tasks.py board`; next task: `python3 scripts/tasks.py next admin`; never read this file whole.
> **Refreshed 2026-10-18:** Phase 4C rows are `BLOCKED` on the new server tasks SRV-117…SRV-127 (one per gap), owner-input rows are `PENDING`, ADM-080 recorded as an owner decision.
> **Version 2 (after the server merged to `main`):** the first version of this backlog proposed an API contract; the server now provides one. Appendix A is generated from the real OpenAPI, every operation is consumed by a task, and the features the server does not offer are listed as gaps (Appendix D). See Appendix F for what changed.

---

## 1. Status legend
`TODO` ready to start · `IN PROGRESS` branch open · `IN REVIEW` PR open · `DONE` merged to `admin` · `PENDING` waits for **information or an action from the owner** (the *Notes* column names it) · `BLOCKED` waits for the server task named in the *Server (SRV)* column (managed by `scripts/tasks.py`). A task is never `PENDING` only because it is large.

## 2. Working rules
1. **Strict order, one at a time.** `python3 scripts/tasks.py next admin` gives the first `TODO` task whose *Needs* and *Server* dependencies are `DONE`. Do not start the next task until the previous task's PR is merged into `admin`. `PENDING` and `BLOCKED` tasks are skipped.
2. **One task = one branch = one PR**, branch `feat/adm-NNN-<key>` from the freshly fetched `origin/admin` (the admin master branch); the PR targets `admin`. Never commit or push to `main` or `admin` directly; never force-push; never `--no-verify`.
3. **Done means:** `npm run verify` green (typecheck, lint with zero warnings, format, unit tests, hardcoded-value and 300-line scan), all four build variants build, bundle budget holds, e2e green for new screens, one verification loop (`Loops: 1/1`) and the four-role review in `WAB-Admin-Dashboard/.claude/session.md`, **local gate green before merge** (there is no admin CI).
4. **No hardcoding.** URLs, routes, limits, colors, sizes, texts, storage keys and timings come from `src/constants/`, `src/design/tokens/`, env config or `src/locales/` (Arabic **and** English, same keys).
5. **Layers.** A feature task touches `domain`, `data` and `presentation` in that order (Section 3). Pages are composed from base components only.
6. **Reasons and audit.** Every impactful admin action has a mandatory reason (`ReasonDialog`); the server writes the audit log and notifies affected parties (PRD §3, §9).
7. **Responsive and bilingual by default:** phone / tablet / desktop, portrait and landscape, RTL and LTR, light and dark.
8. **The server OpenAPI is the contract.** DTOs are generated from the snapshot (`ADM-004`); never hand-write a response type. When the server changes, run `api:sync`, fix the compile errors, update this backlog if a feature appears or disappears.
9. **Gaps are reported, not guessed.** If a screen needs data the server does not offer, it stays `PENDING` with the gap id of Appendix D.

## 3. How a feature task is built (layer recipe and Definition of Done)
```
src/
  data/contract/            generated types + zod DTOs from openapi.admin.json (api:sync)
  domain/<feature>/         entities and enums, <Feature>Repository interface, use-case functions (pure)
  data/<feature>/           mapper (DTO -> entity), Remote<Feature>Repository (paths from constants/endpoints)
  data/mock/fixtures/       <feature>.ts  — success, empty, validation, 401/403/404/409/422, 500, timeout, AR+EN content
  presentation/<feature>/   use<Feature>Controller.ts (TanStack Query, query-key factory), <Feature>Page.tsx, components/
  app/routes.tsx            lazy route + nav entry in constants/nav.ts
  locales/{ar,en}.json      every new string, same keys
tests/<feature>/            domain unit tests · mapper/repository tests against fixtures · controller + page tests · e2e smoke
```
Every feature task has three slices, written in its block: **Domain** (entities, enums, repository interface, pure rules), **Data** (generated DTOs, mappers, remote repository, fixtures), **Presentation** (controller hook and pages with loading, empty, error-with-retry, forbidden and realtime states). Definition of Done: acceptance criteria in the `session.md` block · unit tests per layer · e2e smoke for new screens · AR+EN keys · `docs:api` up to date (after ADM-029) · `memory.md` updated.

## 4. Phases
| Phase | Stage | Content | Tasks |
|---|---|---|---|
| Phase 1 | ADM-01 | Project setup | ADM-001 … ADM-006 |
| Phase 2 | ADM-01 | Project structure and architecture | ADM-007 … ADM-010 |
| Phase 3 | ADM-01 | Design (design system, base components, shell) | ADM-011 … ADM-023 |
| Phase 4A | ADM-01 | Business logic and API: foundation | ADM-024 … ADM-029 |
| Phase 4B | ADM-02…05 | Business logic and API: modules | ADM-030 … ADM-067 |
| Phase 4C | ADM-02…05 | Features blocked by missing server APIs | ADM-068 … ADM-077 |
| Phase 5 | INT-05, REL-01…03 | Integration, quality and release | ADM-078 … ADM-083 |

Order inside Phase 4: foundation (4A) first, then modules in the order listed (reference data and content before operations, operations before money, money before analytics). Phase 4C waits for the server. Real-server integration happens in Phase 5.

---

## Phase 1 — Project setup
Environments, build variants, CI, quality gates and the API contract tooling. The project already builds in four variants (`dev-debug`, `dev-release`, `prod-debug`, `prod-release`; T-024); these tasks finish the setup so every later task starts on solid ground.

| ID | Task | Branch | Needs | Server (SRV) | Status | Notes |
|---|---|---|---|---|---|---|
| ADM-001 | Env contract: `.env.dev` / `.env.prod` keys documented in `.env.example`, a `check:env` script + test that keeps `.env.example`, the zod schema and `constants/env.ts` in sync; app version, build id (git sha) and environment injected at build; visible DEV ribbon (never in prod); `/about` build-info page | `feat/adm-001-env-contract` | — | — | DONE | Acceptance: prod build has no ribbon; a missing key fails the build naming keys only. |
| ADM-002 | CI per environment: non-secret URLs from GitHub `vars` (dev / prod) instead of placeholders, artifact names carry variant + sha, release-notes artifact from merged PR titles; admin CI also runs when `WAB-Server/docs/api/openapi.admin.json` changes | `feat/adm-002-ci-envs` | ADM-001 | — | PENDING | Workflow guarded by `tests/ci.test.ts`; no secrets (only `GITHUB_TOKEN`). Note: Actions runners failed in seconds on earlier PRs (infrastructure) — check CI is healthy first. **Admin GitHub CI was removed by the user (Actions billing); the task only returns if CI is re-enabled.** |
| ADM-003 | Quality gates: coverage threshold, `jest-axe` accessibility tests in CI, complexity and max-params lint rules, dependency-cruiser layer graph as a CI artifact | `feat/adm-003-quality-gates` | ADM-001 | — | DONE | Zero-warning policy stays; gates fail the build, never warn. Delivered locally (no CI): coverage floor 85/80/80/85 (`npm run test:coverage`, part of `verify`), axe-core tests (`tests/a11y.test.tsx`; `vitest-axe`/`jest-axe` are unmaintained so axe-core is called directly), lint rules complexity 15 / max-params 4 / max-depth 4 / `no-deprecated`, dependency-cruiser layer + no-cycle rules (`npm run check:layers`, graph via `npm run graph:layers` -> `reports/layers.mmd`). |
| ADM-004 | API contract tooling: `npm run api:sync` snapshots `WAB-Server/docs/api/openapi.admin.json` into `src/data/contract/`, generates TypeScript types and zod DTOs from it, and a test fails when the snapshot is older than the server file; hand-written DTO schemas are replaced by generated ones | `feat/adm-004-contract-tooling` | ADM-001 | — | DONE | `contracts/` (INT-01) still does not exist, so the server's generated OpenAPI is the contract (91 admin operations today). Replaces the old "contract drift" task. Delivered: `npm run api:sync` copies the server spec to `contract/openapi.admin.json` and generates lazy zod DTO factories + inferred types (`src/data/contract/generated/dto.ts`) and operation metadata (`operations.ts`, 116 operations, ids like `postAuthLogin`); `npm run api:check` / `tests/contract.test.ts` fail when stale. Types come from `z.infer` (no `openapi-typescript`: its peer range excludes TypeScript 6). Generated dir is exempt from the 300-line, hardcoded and format checks. The hand-written auth DTOs in `data/auth` are replaced in ADM-030 (the real auth flow differs). |
| ADM-005 | Deploy pipeline: dev deploys on merge to `main`; prod deploys on release tag `vX.Y.Z` with manual approval; smoke test after deploy | `feat/adm-005-deploy` | ADM-002 | — | PENDING | Hosting product and platform domain are open decisions (root `CLAUDE.md` §7) — **user input**. |
| ADM-006 | Hosting security-headers spec (CSP with API + socket origins, `nosniff`, `frame-ancestors none`, HSTS) as a versioned file + test of the header list | `feat/adm-006-headers` | ADM-001 | — | DONE | Hosting/CDN choice and domain — **user input**. |

---

## Phase 2 — Project structure and architecture
The project is split into `domain / data / infrastructure / design / presentation / app`. These tasks make that split scale to ~30 modules and keep it clean automatically (clean architecture + MVC).

| ID | Task | Branch | Needs | Server (SRV) | Status | Notes |
|---|---|---|---|---|---|---|
| ADM-007 | Feature-sliced layers: `domain/<feature>`, `data/<feature>`, `presentation/<feature>` (+ `data/mock/fixtures/<feature>.ts`), import rules in ESLint and `tests/architecture.test.ts` (a feature never imports another feature's presentation), module scaffold checklist, "how to add a module" guide | `feat/adm-007-feature-slices` | ADM-003 | — | DONE | Moves nothing that works; adds the structure and rules every later task follows (Section 3 recipe). Delivered as dependency-cruiser rules `feature-isolation-domain|data|presentation` (relative imports covered, not only `@/`), tests in `tests/layers.test.ts`, guide `docs/HOW_TO_ADD_A_MODULE.md`. |
| ADM-008 | Shared kernel in `domain/shared`: `Page<T>`, `PageQuery`, `Result`, branded ids, `Money` (JOD decimal string, 3 decimals, never float), `AppTime` (UTC in, Asia/Amman 12-hour out, numerals follow language) and formatters | `feat/adm-008-kernel` | ADM-007 | — | DONE | Mirrors server `utils/money` and `utils/time`; unit tests incl. ties and Amman day boundaries. Delivered in `src/domain/shared` (`brand`, `page`, `result`, `money`, `time`, `format`) + `constants/kernel.ts`; money is parsed/summed as integer fils (BigInt, no floats), time zone is a parameter defaulting to Asia/Amman, Arabic UI uses Arabic-Indic digits. |
| ADM-009 | Error catalog: every server error code (BUSINESS_DOMAIN §11) mapped to an `ErrorKind` and an AR+EN message; `details[]` to form-field errors; a test keeps the list equal to the domain document | `feat/adm-009-error-catalog` | ADM-008 | — | DONE | Extends the existing `AppError` / `normalizeError`; messages only in `locales/`. Delivered: `constants/errorCatalog.ts` (41 codes -> kind), messages `errors.codes.<CODE>` in both locales, `AppError.messageKey` prefers the code message, `fieldErrorsFrom()` for form `details[]`; `tests/errorCatalog.test.ts` compares with BUSINESS_DOMAIN §11 and the OpenAPI enum. Locale files are ~233 lines each: split per feature before they pass 300. |
| ADM-010 | Technical docs: `docs/ADMIN_ARCHITECTURE.md` (layers, data flow, MVC mapping, error model, env/variants, contract tooling) and `docs/adr/` with the decisions of Appendix C as they are made | `feat/adm-010-arch-guide` | ADM-007 | — | DONE | Documentation task; reviewed by the Solution Architect role. Delivered: `docs/ADMIN_ARCHITECTURE.md`, ADRs 0001-0003 (contract source, local gate, money and time); `tests/docs.test.ts` fails when a doc names a file that does not exist. ADR for each remaining Appendix C decision is written by the task that needs it. |

---

## Phase 3 — Design (design system, base components, shell)
Item 3: button, card, text, inputs and the rest of the kit the 30 pages need. Tokens, theme, RTL/LTR and light/dark exist (T-024, T-031); every component ships with gallery states (default, hover, focus, disabled, loading, error, empty), AR+EN, RTL/LTR, light/dark, keyboard and an accessibility test.

| ID | Task | Branch | Needs | Server (SRV) | Status | Notes |
|---|---|---|---|---|---|---|
| ADM-011 | Design audit: map every frame group of `design/WAB Admin 0x *.dc.html` and the Design Script components to existing components, list what is missing, record token deltas in `docs/DESIGN_AUDIT.md` | `feat/adm-011-design-audit` | ADM-010 | — | DONE | Technical-writer task; output is the checklist the next tasks tick off. Delivered: `docs/DESIGN_AUDIT.md` (frames to pages, kit helpers and blocks to components and tasks, token comparison: no deltas, ordered gap list). |
| ADM-012 | Typography and primitives: `Text`, `Heading`, `Link`, `Divider`, `Avatar`, `Chip`, `Tooltip`, `KeyValue` list | `feat/adm-012-primitives` | ADM-011 | — | DONE | Replaces ad-hoc `<p>` / `<h1>` classes; tokens only. |
| ADM-013 | Form kit: `Form` controller (react-hook-form + zod resolver), `Field` wrapper, `NumberField` / JOD input, `SearchField`, `MultiSelect` / `Combobox`, `DateField`, `FormActions` (save bar, "last updated by/at") | `feat/adm-013-form-kit` | ADM-012, ADM-008 | — | DONE | Validation identical to the mobile apps (PRD §3, §10). Library choice recorded as an ADR. |
| ADM-014 | Status badge registry from BUSINESS_DOMAIN §2 enums (booking, payment, refund, salon, subscription, review, alert, campaign, payout) to tone + i18n key; one source, no per-page switch statements | `feat/adm-014-status-badges` | ADM-012, ADM-008 | — | DONE | Test fails if an enum value of the generated types has no tone or no AR+EN label. |
| ADM-015 | DataTable v2: column visibility, bulk select, row actions, sticky header, server pagination (reuses `Pagination`), density, empty/error rows, export hook | `feat/adm-015-table-v2` | ADM-012, ADM-014 | — | DONE | Extends the existing `DataTable`; keyboard row activation kept. |
| ADM-016 | FilterBar with active-filter chips, `DateRangePicker` (Today, Yesterday, Last 7/30 days, This/Last month, This year, Custom + compare toggle), `ExportMenu` (Excel / PDF / CSV, async-progress toast) | `feat/adm-016-filters` | ADM-013, ADM-015 | — | DONE | Presets per PRD §3; Asia/Amman day boundaries via `AppTime`. |
| ADM-017 | Overlay kit: `Drawer`, `ConfirmDialog`, `Menu` / `Popover`, toast queue, destructive and neutral reason-dialog variants (mandatory reason already exists) | `feat/adm-017-overlays` | ADM-012 | — | DONE | Focus trap, Esc and focus return reused from `Modal`. |
| ADM-018 | Page templates: `ListPage` (header, filter bar, table, pagination), `DetailPage` (header, status, actions, tabs, side info panel), `Timeline` (status history), `JsonViewer` | `feat/adm-018-page-templates` | ADM-015, ADM-016, ADM-017 | — | DONE | Every module page is composed from these; no page builds its own layout. |
| ADM-019 | Charts kit: line, bar, stacked bar, donut, funnel, cohort heatmap, sparkline; every chart has "View data" (table) and export; palette from tokens in light/dark | `feat/adm-019-charts` | ADM-012, ADM-008, ADM-017 | — | DONE | **Decision in Appendix C** recorded as an ADR first; the bundle budget in `scripts/budget.json` must hold. |
| ADM-020 | Media kit: `ImageUploader` (ar/en variants, presigned upload then confirm), `DocumentViewer` (zoom, rotate, download; private signed URLs only), `PhonePreview` frame | `feat/adm-020-media-kit` | ADM-013, ADM-017 | — | DONE | UI only here; the upload calls (`POST /uploads/presign`, `/uploads/confirm`) are wired in the banners task. |
| ADM-021 | `RichTextEditor` (Arabic / English tabs, sanitized HTML output, RTL aware) and `SchedulePicker` (start–end, end after start) | `feat/adm-021-rich-text` | ADM-013 | — | DONE | Library choice recorded as an ADR (Appendix C). |
| ADM-022 | Shell design completion: sidebar sub-menus with counter slots, breadcrumbs, topbar global-search UI (grouped results layout), admin menu, 403 / 404 / 500 pages | `feat/adm-022-shell-design` | ADM-017, ADM-013 | — | DONE | Data for counters/search is attached in Phase 4 (shell-live, global-search). |
| ADM-023 | Design-system gallery covers every kit and state; visual and accessibility regression checks (screenshots as CI artifacts) | `feat/adm-023-gallery` | ADM-012, ADM-013, ADM-014, ADM-015, ADM-016, ADM-017, ADM-018, ADM-019, ADM-020, ADM-021, ADM-022 | — | DONE | Dev-only route `/design-system` (compiled out of prod). |

---

## Phase 4A — Business logic and API: foundation
Item 5 starts here. One typed way to call, mock, refresh and stream data, so every module task only adds its own domain, DTO usage and pages. The real server APIs exist now (`openapi.admin.json`), so the client is generated from them; the mock transport remains for tests, e2e and offline work.

| ID | Task | Branch | Needs | Server (SRV) | Status | Notes |
|---|---|---|---|---|---|---|
| ADM-024 | Typed API client: endpoint registry built on the generated types, pagination `meta` helper, `details[]` to form-field errors, trace id surfaced to the UI, request abort on unmount, `Idempotency-Key` for money/state commands, query-key factory | `feat/adm-024-endpoint-client` | ADM-004, ADM-009, ADM-008 | — | DONE | Builds on `HttpClient` (timeout, retry, envelope, 401). Endpoint paths live only in `constants/endpoints`. |
| ADM-025 | Session lifecycle: access-token expiry from `accessTokenExpiresAt`, single-flight `POST /auth/refresh` on 401 / before expiry, 30-minute idle timeout with warning modal, permission-denied / session-expired to login, logout revokes the refresh token | `feat/adm-025-session` | ADM-024 | SRV-025, SRV-026, SRV-030, SRV-031 | DONE | PRD §4. Tokens stay in memory. The server has no `me` endpoint: the admin identity comes with verify-otp and refresh. |
| ADM-026 | Transport-level mock: fixtures typed by the generated types, served through the real `HttpClient`; scenario switcher (success / empty / validation / 401 / 403 / 404 / 409 / 422 / 500 / timeout / slow, AR+EN); compiled out of prod builds; replaces per-repository mocks | `feat/adm-026-mock-transport` | ADM-024 | — | DONE | Used by unit tests, e2e and offline development; a fixture-vs-types test keeps it honest. |
| ADM-027 | Realtime client: `RealtimeClient` interface (domain), Socket.IO implementation on the `/admin` namespace (token in `auth.token`; `UNAUTHORIZED` / `FORBIDDEN` connect errors handled), fake emitter for mock mode, `useRealtime` hook, query-invalidation bus, reconnect with backoff, the "مباشر" live indicator | `feat/adm-027-realtime` | ADM-024, ADM-026 | SRV-080, SRV-081 | DONE | Admin room events emitted today: `booking.updated` and `alert.created`; others in BUSINESS_DOMAIN §7 (`application.created`, `review.created`, `refund.updated`, `overview.tick`) are not emitted yet (Appendix D G10). |
| ADM-028 | List state in the URL: filters, sort, page and page size (10 / 25 / 50 / 100) encoded in the query string; `useListController`; 500 ms search debounce constant; back/forward safe | `feat/adm-028-list-state` | ADM-008, ADM-024 | — | DONE | PRD §3 "saved filter in URL (shareable/bookmarkable)". |
| ADM-029 | API-consumption doc generator: `npm run docs:api` writes `docs/API_CONSUMED.md` (operation, consuming task, screen) from the endpoint registry and CI fails when it is stale or an operation of `openapi.admin.json` has no consumer or exemption | `feat/adm-029-api-doc` | ADM-024 | — | DONE | Technical-writer task; same "docs after every task" idea as the server. |

---

## Phase 4B — Business logic and API: modules
Every task is a vertical slice through the three layers (Section 3). Operation lists use the real paths of `openapi.admin.json` (prefix `/admin/v1` omitted). Features the server does not offer yet are `PENDING` with the gap id of Appendix D.

| ID | Task | Branch | Needs | Server (SRV) | Status | Notes |
|---|---|---|---|---|---|---|
| ADM-030 | Auth module (A00): `POST /auth/login` (password, returns `otpRequired`, `expiresAt`, `resendAfterSeconds`), `POST /auth/verify-otp` (email + code, returns tokens + `admin`), resend by repeating login after the wait, lockout and wrong-code states; migrates the existing login (T-031) from the old assumed contract (`challengeId`, `resend-otp`) | `feat/adm-030-auth` | ADM-025, ADM-026, ADM-013 | SRV-030, SRV-031 | DONE | Existing UI stays; only the data/domain contract changes. |
| ADM-031 | Settings (A28): editor shell and the discovery, booking-rules and OTP sections (`GET /settings`, `PUT /settings/{key}` with reason) | `feat/adm-031-settings-core` | ADM-013, ADM-018, ADM-026 | SRV-017, SRV-103 | DONE |  |
| ADM-032 | Settings (A28): alert recipients and thresholds, account-deletion grace, payout notes and every remaining key group | `feat/adm-032-settings-other` | ADM-031 | SRV-017, SRV-106 | DONE |  |
| ADM-033 | Settings (A28): locations — countries (name, flag, dial code, phone regex, active), cities and areas (ar/en, active); no delete (switch off with `active=false`) | `feat/adm-033-locations` | ADM-015, ADM-013, ADM-017, ADM-026 | SRV-038 | DONE |  |
| ADM-034 | Settings (A28): app versions per app and platform (latest, minimum supported <= latest, optional update, store URLs) and maintenance mode per app with ar/en message | `feat/adm-034-app-config` | ADM-013, ADM-018, ADM-026 | SRV-038 | DONE |  |
| ADM-035 | Content (A24): legal pages — Privacy, Terms, About; rich text ar/en, per app | `feat/adm-035-content-pages` | ADM-021, ADM-018, ADM-026 | SRV-038 | DONE |  |
| ADM-036 | Content (A24): FAQ per app (ordering) and contact info (phone, WhatsApp, email) per app | `feat/adm-036-content-faq-contact` | ADM-013, ADM-018, ADM-026 | SRV-038 | DONE |  |
| ADM-037 | Banners (A24): ar/en images, action (none / salon / external URL), gender target, schedule (end after start), order, active; phone preview; image upload through presign + confirm | `feat/adm-037-banners` | ADM-018, ADM-026, ADM-014, ADM-013, ADM-020, ADM-021 | SRV-039, SRV-046 | DONE |  |
| ADM-038 | Catalog services (A23): men / women tabs, create / edit (ar+en name and description, image key, active, order); deactivate with a warning | `feat/adm-038-catalog-services` | ADM-018, ADM-026, ADM-014, ADM-013, ADM-020 | SRV-040 | DONE |  |
| ADM-039 | Catalog requests (A23): pending queue, approve (creates the catalog service, tells the salon) / reject with a note | `feat/adm-039-catalog-requests` | ADM-038 | SRV-050, SRV-103 | DONE | Approve always creates the service (the PRD "map to an existing service" option is not offered by the server). |
| ADM-040 | Salons list (A13): name, gender, city, state, rating, subscription status, created; filters state / gender / city / name | `feat/adm-040-salons-list` | ADM-018, ADM-026, ADM-014, ADM-016 | SRV-102, SRV-055 | DONE | Columns "recommended" and "bookings (30d)" and the subscription filter are missing on the server (Appendix D G4). |
| ADM-041 | Salon details (A13): overview (state, completeness checklist, owner, subscription summary), members tab (all members, role, permissions), and shortcut tabs that reuse other modules filtered by salon (bookings, reviews, transactions, payouts, subscription) | `feat/adm-041-salon-overview` | ADM-040 | SRV-102, SRV-051 | DONE | Profile / gallery / hours / services / staff / policies editing is blocked on the server (task salon-edit). |
| ADM-042 | Salon actions (A13): set Offline / Online (reason; owner notified), change gender (admin only, reason; services switched off), bank / payout details view and replace (every read is audited, never cached) | `feat/adm-042-salon-actions` | ADM-041, ADM-017 | SRV-043, SRV-055, SRV-090 | DONE |  |
| ADM-043 | Applications queue and review (A14): oldest first, resubmission count; review page with all submitted data, license documents through short-lived signed URLs, approve (starts the trial) / reject (reason shown to the owner) | `feat/adm-043-applications` | ADM-041, ADM-020, ADM-017 | SRV-042 | DONE |  |
| ADM-044 | Customers list (A12): name, phone, gender, city, registered, last active, bookings, status; search by name or phone; filters status / gender / city | `feat/adm-044-customers-list` | ADM-018, ADM-026, ADM-014, ADM-016 | SRV-101 | DONE |  |
| ADM-045 | Customer details (A12): profile (read), devices, block/deletion info, `journeyUserId`; tabs for bookings, payments and refunds reuse the bookings / transactions lists filtered by `customerId` | `feat/adm-045-customer-details` | ADM-044 | SRV-101 | DONE | Profile editing, reviews-by-author and notifications-sent are missing on the server (task customer-extras). |
| ADM-046 | Customer actions (A12): block (reason; all sessions end), unblock, start deletion grace, restore from the grace period | `feat/adm-046-customer-actions` | ADM-045, ADM-017 | SRV-032, SRV-101 | DONE | The PRD "force delete" is the grace-period `delete` endpoint (immediate purge is not offered). |
| ADM-047 | Bookings list (A15): reference, customer, salon, appointment, persons, bride, status, payment, total; filters (tab, status, dates, salon, customer, payment, bride) and search; realtime refresh on `booking.updated` | `feat/adm-047-bookings-list` | ADM-018, ADM-026, ADM-014, ADM-016, ADM-027 | SRV-077 | DONE | Bookings export is not offered by `POST /exports` (Appendix D G9). |
| ADM-048 | Booking details (A15): everything the admin endpoint returns, status history, related transactions and refunds (lists filtered by booking) | `feat/adm-048-booking-details` | ADM-047, ADM-014 | SRV-077 | DONE |  |
| ADM-049 | Booking admin status change (A15): move to any allowed status with a mandatory reason (approve, reject, cancel by customer / salon, complete, no-show, revert); the response flags irregular transitions | `feat/adm-049-booking-status` | ADM-048, ADM-017 | SRV-078 | DONE | Reassign staff, arbitrary-amount refund and the three cancel modes are not separate server operations (task booking-extras). |
| ADM-050 | Reviews moderation (A22): pending queue (oldest first) with target, rating, comment; approve, reject (reason optional), bulk approve / reject up to 100 with per-item results | `feat/adm-050-reviews-queue` | ADM-018, ADM-026, ADM-014, ADM-016, ADM-017 | SRV-064, SRV-103 | DONE |  |
| ADM-051 | Reviews (A22): published list (filters target / salon / staff / rating) and remove with reason (rating recomputed) | `feat/adm-051-reviews-published` | ADM-050 | SRV-064 | DONE |  |
| ADM-052 | Transactions (A16, A08 table): payment attempts with gateway codes and filters; details with the raw gateway answer and all attempts of the checkout | `feat/adm-052-transactions` | ADM-018, ADM-026, ADM-014, ADM-016, ADM-017, ADM-008 | SRV-104, SRV-083 | DONE | Export through `POST /exports` kind `TRANSACTIONS`. |
| ADM-053 | Refunds (A17): list by status and booking, attempts and next attempt, overdue highlight; retry a failed refund, mark as refunded manually (reference required) | `feat/adm-053-refunds` | ADM-018, ADM-026, ADM-014, ADM-016, ADM-027 | SRV-086, SRV-104 | DONE |  |
| ADM-054 | Reconciliation (A21): payment problems list — stuck pending, paid without booking, missing ledger charge | `feat/adm-054-reconciliation` | ADM-052, ADM-019 | SRV-104 | DONE | The server returns problems, not period totals; the totals cards come from payouts balances and the monthly report. |
| ADM-055 | Payouts (A18): per-salon balances (collected, gateway fees, refunds, payouts, due now), preview up to a moment, payout history and detail | `feat/adm-055-payouts` | ADM-018, ADM-026, ADM-014, ADM-016, ADM-008 | SRV-088 | DONE |  |
| ADM-056 | Payouts (A18): create a PENDING payout from the ledger up to a moment, record the bank transfer (status TRANSFERRED, ledger entry) | `feat/adm-056-payout-create` | ADM-055, ADM-013, ADM-042 | SRV-088, SRV-090 | DONE |  |
| ADM-057 | Subscriptions (A19): list by salon (status, ending within N days), detail with payments, record a payment made outside the app (activates and extends the period) | `feat/adm-057-subscriptions` | ADM-018, ADM-026, ADM-014, ADM-016, ADM-013 | SRV-089, SRV-104 | DONE | Offline / Online from here reuses the salon-actions endpoints. |
| ADM-058 | Recommended salons (A20): per-gender lists with period, order, amount paid, status (scheduled / active / ended); add, edit, end now, drag to reorder | `feat/adm-058-recommended` | ADM-018, ADM-026, ADM-014, ADM-013, ADM-021 | SRV-066 | DONE | Drag-and-drop library is an ADR (Appendix C). |
| ADM-059 | Push campaigns (A25): compose title and body ar/en, app, audience (all, guests, registered, gender, city, salon members, specific users), link, send now or schedule; audience-size estimate; phone preview | `feat/adm-059-campaigns-compose` | ADM-018, ADM-026, ADM-014, ADM-013, ADM-020 | SRV-099, SRV-093 | DONE | "Saved analytics segment" audiences are not offered by the server. |
| ADM-060 | Push campaigns (A25): history with audience size, sent, delivered, opened, failures; details with live stats; cancel a campaign that has not started | `feat/adm-060-campaigns-history` | ADM-059, ADM-016 | SRV-099 | DONE |  |
| ADM-061 | Alerts (A27): list (severity, kind, entity link, time, status New / Acknowledged), acknowledge, NEW count for the bell | `feat/adm-061-alerts` | ADM-018, ADM-026, ADM-014, ADM-027 | SRV-106, SRV-107 | DONE |  |
| ADM-062 | Shell data: alerts bell count, sidebar counters (pending applications, pending reviews, NEW alerts) from list `meta.total` and the alerts count, refreshed by realtime | `feat/adm-062-shell-live` | ADM-022, ADM-061, ADM-027, ADM-043, ADM-050 | SRV-107 | DONE |  |
| ADM-063 | Live Overview (A01): KPI cards from `GET /analytics/overview` (payments, refunds, bookings, errors counts for a range), per-day trend from `GET /analytics/events`, realtime refresh | `feat/adm-063-live-overview` | ADM-019, ADM-027, ADM-018, ADM-026 | SRV-105 | DONE | "Active users now", installs, live activity feed and pending-request wait are not offered (Appendix D G7). |
| ADM-064 | Analytics from server events (A07, A08, A09 partial): booking, payment, refund and error counts by name or day with the shared analytics filters (range, comparison) | `feat/adm-064-analytics-server-events` | ADM-019, ADM-016, ADM-063 | SRV-105 | DONE | Event producers for `payment.*`, `booking.*`, `refund.*`, `api.error` were not emitting at the time of writing (SRV-105 note): verify before relying on the numbers. |
| ADM-065 | Reports (A26): daily / weekly / monthly views with charts and period selector | `feat/adm-065-reports` | ADM-019, ADM-016 | SRV-108 | DONE | Installs, active users, funnels and retention are not in the server reports (need SRV-110). |
| ADM-066 | Audit log (A29): immutable table (time, action, entity link, reason, IP, device) with filters (admin, action, entity, dates) and a before / after diff drawer | `feat/adm-066-audit-log` | ADM-018, ADM-026, ADM-014, ADM-016, ADM-017 | SRV-020, SRV-103 | DONE |  |
| ADM-067 | Exports (all exportable tables): request Excel / CSV / PDF for reports, transactions and the audit log; export history; poll status and download through the 5-minute signed link; progress toast | `feat/adm-067-exports` | ADM-016, ADM-065, ADM-052, ADM-066 | SRV-109 | DONE | Only REPORT_*, TRANSACTIONS and AUDIT_LOGS kinds exist (Appendix D G9). |

**Slices (domain / data / presentation) and API operations**

- **ADM-030** — *Domain:* `AdminIdentity {id,email}`, `Session`, `LoginStep`; `AuthRepository.login/verifyOtp/refresh/logout`; use-cases `signIn`, `completeTwoFactor`. *Data:* generated DTOs; `RemoteAuthRepository`; fixtures for locked / wrong code / expired code / rate limited. *Presentation:* `useLoginController` keeps its steps but the code step keeps the email, not a challenge id; resend countdown from `resendAfterSeconds`; session-expired modal. *Operations:* `POST /auth/login`, `POST /auth/verify-otp`.
- **ADM-031** — *Domain:* `SettingKey` registry from the effective list (`key,value,default,isDefault`); per-key validation (PRD §10, BUSINESS_DOMAIN §10); OTP length must match Firebase (warning). *Data:* settings DTOs; one `PUT` per changed key; 400/422 field errors fixtures. *Presentation:* sectioned page, save bar, per-key reset-to-default, reason dialog; unsaved-changes guard. *Operations:* `GET /settings`, `PUT /settings/{key}`.
- **ADM-032** — *Domain:* threshold rules (defaults from the PRD alerts table). *Data:* reuses the settings endpoints. *Presentation:* section components. *Operations:* `GET /settings`, `PUT /settings/{key}`.
- **ADM-033** — *Domain:* `Country`, `City`, `Area`; phone-regex validity check. *Data:* CRUD on the three resources. *Presentation:* nested tables with inline edit and a regex tester. *Operations:* `GET /locations/countries`, `POST /locations/countries`, `GET /locations/countries/{id}`, `PATCH /locations/countries/{id}`, `GET /locations/cities`, `POST /locations/cities`, `GET /locations/cities/{id}`, `PATCH /locations/cities/{id}`, `GET /locations/areas`, `POST /locations/areas`, `GET /locations/areas/{id}`, `PATCH /locations/areas/{id}`.
- **ADM-034** — *Domain:* `AppVersionPolicy`, `MaintenanceSwitch`; semver compare; app/platform immutable after create. *Data:* CRUD on both resources. *Presentation:* sections with force-update warning and maintenance confirm. *Operations:* `GET /app-config/versions`, `POST /app-config/versions`, `GET /app-config/versions/{id}`, `PATCH /app-config/versions/{id}`, `GET /app-config/maintenance`, `POST /app-config/maintenance`, `GET /app-config/maintenance/{id}`, `PATCH /app-config/maintenance/{id}`.
- **ADM-035** — *Domain:* `ContentPage` (kind, app, both languages). *Data:* list / create / get / patch. *Presentation:* editor with tabs per app and language; sanitized preview. *Operations:* `GET /content/pages`, `POST /content/pages`, `GET /content/pages/{id}`, `PATCH /content/pages/{id}`.
- **ADM-036** — *Domain:* `FaqEntry`, `ContactInfo`; email / phone validators; reorder use-case. *Data:* CRUD on both. *Presentation:* sortable FAQ list; contact form per app. *Operations:* `GET /content/faqs`, `POST /content/faqs`, `GET /content/faqs/{id}`, `PATCH /content/faqs/{id}`, `GET /content/contact-info`, `POST /content/contact-info`, `GET /content/contact-info/{id}`, `PATCH /content/contact-info/{id}`.
- **ADM-037** — *Domain:* `Banner`, `BannerAction`; action/value consistency and schedule rules. *Data:* CRUD + presigned upload flow (`BANNER_IMAGE`). *Presentation:* grid + editor with `PhonePreview` and `SchedulePicker`. *Operations:* `GET /banners`, `POST /banners`, `GET /banners/{id}`, `PATCH /banners/{id}`, `POST /uploads/presign`, `POST /uploads/confirm`.
- **ADM-038** — *Domain:* `CatalogService` (bilingual), sort order. *Data:* CRUD; image via the media kit. *Presentation:* table + edit drawer. *Operations:* `GET /catalog/services`, `POST /catalog/services`, `GET /catalog/services/{id}`, `PATCH /catalog/services/{id}`.
- **ADM-039** — *Domain:* `CatalogRequest`, `CatalogRequestStatus`. *Data:* queue + approve + reject. *Presentation:* queue page with decision dialogs. *Operations:* `GET /catalog/requests`, `POST /catalog/requests/{id}/approve`, `POST /catalog/requests/{id}/reject`.
- **ADM-040** — *Domain:* `SalonSummary`, `SalonState`. *Data:* paginated list with filters. *Presentation:* `SalonsPage` with state badges. *Operations:* `GET /salons`.
- **ADM-041** — *Domain:* `SalonOverview`, `SalonMember`, `Permission` (15 keys). *Data:* `GET /salons/{id}`, `GET /salons/{id}/members`. *Presentation:* `DetailPage` with lazy tabs; related tabs link to the list pages with the salon filter in the URL. *Operations:* `GET /salons/{id}`, `GET /salons/{id}/members`.
- **ADM-042** — *Domain:* `setSalonOffline` / `setSalonOnline` preconditions; gender-change consequences as warning text. *Data:* command endpoints; payout-details with masked display and explicit reveal. *Presentation:* action bar + dialogs; Offline warning "hides the salon and blocks new bookings". *Operations:* `POST /salons/{id}/offline`, `POST /salons/{id}/online`, `PATCH /salons/{id}/gender`, `GET /salons/{id}/payout-details`, `PUT /salons/{id}/payout-details`.
- **ADM-043** — *Domain:* `SalonApplication`; `approveApplication` / `rejectApplication`. *Data:* queue, detail, approve, reject. *Presentation:* `ApplicationsPage`, `ApplicationReviewPage` with `DocumentViewer`. *Operations:* `GET /salons/applications`, `GET /salons/applications/{id}`, `POST /salons/applications/{id}/approve`, `POST /salons/applications/{id}/reject`.
- **ADM-044** — *Domain:* `CustomerSummary`, `CustomerStatus`. *Data:* paginated list. *Presentation:* `CustomersPage`. *Operations:* `GET /customers`.
- **ADM-045** — *Domain:* `CustomerProfile`, `Device`. *Data:* `GET /customers/{id}`. *Presentation:* `DetailPage`; tabs are list views with the customer filter. *Operations:* `GET /customers/{id}`.
- **ADM-046** — *Domain:* `blockCustomer`, `deleteCustomer`, `restoreCustomer` preconditions by `CustomerStatus`. *Data:* four command endpoints; 409/422 fixtures. *Presentation:* action menu + `ReasonDialog`; status badge refresh; "customer sees blocked on next login" hint. *Operations:* `POST /customers/{id}/block`, `POST /customers/{id}/unblock`, `POST /customers/{id}/delete`, `POST /customers/{id}/restore`.
- **ADM-047** — *Domain:* `BookingSummary`; `BookingStatus`, `PaymentStatus`. *Data:* paginated list with all filters. *Presentation:* `BookingsPage`; `useRealtime` invalidates the list and highlights new rows. *Operations:* `GET /bookings`.
- **ADM-048** — *Domain:* `BookingDetails`, `StatusHistoryEntry`, `ActorType`. *Data:* `GET /bookings/{id}`. *Presentation:* `DetailPage` with `Timeline` and side panel. *Operations:* `GET /bookings/{id}`.
- **ADM-049** — *Domain:* `BookingStatus` picker rules for UI enablement only (the server stays the authority); `irregular` warning. *Data:* `POST /bookings/{id}/status`; 422 `INVALID_TRANSITION`, `TOO_EARLY_TO_COMPLETE`, `ALREADY_HANDLED` fixtures. *Presentation:* one `BookingStatusDialog`; irregular-transition confirmation; refunds follow automatically on the server. *Operations:* `POST /bookings/{id}/status`.
- **ADM-050** — *Domain:* `Review`, `ReviewTarget`, `ReviewStatus`. *Data:* list + approve + reject + bulk. *Presentation:* `ReviewsPage` queue tab with bulk bar. *Operations:* `GET /reviews`, `POST /reviews/{id}/approve`, `POST /reviews/{id}/reject`, `POST /reviews/bulk`.
- **ADM-051** — *Domain:* remove use-case (reason required). *Data:* same list endpoint with status filter + remove. *Presentation:* published tab + `ReasonDialog`. *Operations:* `POST /reviews/{id}/remove`.
- **ADM-052** — *Domain:* `Transaction`, `TransactionType`, `TransactionStatus`. *Data:* list + get. *Presentation:* `TransactionsPage` + `TransactionDrawer` with `JsonViewer`. *Operations:* `GET /transactions`, `GET /transactions/{id}`.
- **ADM-053** — *Domain:* `Refund`, `RefundSource`; overdue rule (threshold from settings). *Data:* list, get, retry, manual. *Presentation:* `RefundsPage`; refresh on `refund.*` when the server emits it. *Operations:* `GET /refunds`, `GET /refunds/{id}`, `POST /refunds/{id}/retry`, `POST /refunds/{id}/manual`.
- **ADM-054** — *Domain:* `ReconciliationProblem`. *Data:* `GET /finance/reconciliation`. *Presentation:* problem cards + table linking to transactions / bookings. *Operations:* `GET /finance/reconciliation`.
- **ADM-055** — *Domain:* `SalonBalance`, `PayoutPreview`, `Payout`, `PayoutStatus`. *Data:* balances, preview, list, get. *Presentation:* `PayoutsPage` balances and history tabs. *Operations:* `GET /payouts/balances`, `GET /payouts/preview`, `GET /payouts`, `GET /payouts/{id}`.
- **ADM-056** — *Domain:* amount and period rules (PRD §10: > 0, <= net due). *Data:* create + transfer with idempotency key. *Presentation:* stepper: pick salons and moment, preview, create, record transfer; bank details panel. *Operations:* `POST /payouts`, `POST /payouts/{id}/transfer`.
- **ADM-057** — *Domain:* `Subscription`, `SubscriptionStatus`; period validation. *Data:* list, get, record payment. *Presentation:* `SubscriptionsPage` with saved views (ending <= 7d, expired) and record dialog. *Operations:* `GET /subscriptions`, `GET /subscriptions/{salonId}`, `POST /subscriptions/{salonId}/payments`.
- **ADM-058** — *Domain:* `Placement`; overlap and period rules (409 on overlap, 422 on ended). *Data:* list, create, patch, end, reorder. *Presentation:* per-gender tabs, sortable list, add/edit modal. *Operations:* `GET /recommended`, `POST /recommended`, `PATCH /recommended/{id}`, `POST /recommended/{id}/end`, `PUT /recommended/reorder`.
- **ADM-059** — *Domain:* `Campaign`, `Audience` (discriminated union on `kind`); audience-validity rules. *Data:* audience-size + create. *Presentation:* composer with `PhonePreview`, `SchedulePicker` and confirm dialog. *Operations:* `POST /campaigns/audience-size`, `POST /campaigns`.
- **ADM-060** — *Domain:* `CampaignStats`, `CampaignStatus`. *Data:* list, get, cancel (422 once sending). *Presentation:* table + details drawer + cancel dialog. *Operations:* `GET /campaigns`, `GET /campaigns/{id}`, `POST /campaigns/{id}/cancel`.
- **ADM-061** — *Domain:* `Alert`, `AlertKind`, `AlertSeverity`. *Data:* list, count, acknowledge (idempotent). *Presentation:* `AlertsPage`; `alert.created` refreshes list and count. *Operations:* `GET /alerts`, `GET /alerts/count`, `POST /alerts/{id}/acknowledge`.
- **ADM-062** — *Domain:* `PendingCounters`. *Data:* reuses list and count endpoints with `pageSize=1`. *Presentation:* counter badges and bell wired into the shell. *Operations:* —.
- **ADM-063** — *Domain:* `OverviewSnapshot`, `EventCounts`. *Data:* overview + events (range max 92 days, cached 1 min). *Presentation:* `LiveOverviewPage`; error card state per card; quiet-day zeros; dark + English frames. *Operations:* `GET /analytics/overview`, `GET /analytics/events`.
- **ADM-064** — *Domain:* `AnalyticsFilters` value object. *Data:* same two endpoints. *Presentation:* chart pages for bookings / payments / errors built on event counts. *Operations:* `GET /analytics/events`.
- **ADM-065** — *Domain:* `DailyReport`, `WeeklyReport`, `MonthlyReport`. *Data:* three GET endpoints (Asia/Amman day ranges). *Presentation:* report view per kind with growth vs previous month. *Operations:* `GET /reports/daily`, `GET /reports/weekly`, `GET /reports/monthly`.
- **ADM-066** — *Domain:* `AuditEntry`; pure diff function. *Data:* list + get. *Presentation:* `AuditLogPage` + `DiffDrawer`; entity links resolved by a route resolver. *Operations:* `GET /audit-logs`, `GET /audit-logs/{id}`.
- **ADM-067** — *Domain:* `ExportJob`, `ExportKind`, `ExportFormat`. *Data:* create, list, get. *Presentation:* `ExportMenu` wiring + exports page; PDF is Latin-only (server limit) shown as a hint. *Operations:* `POST /exports`, `GET /exports`, `GET /exports/{id}`.

---

## Phase 4C — Features blocked by missing server APIs
The admin PRD asks for these, the server does not offer them yet (Appendix D). Since 2026-10-18 every gap has a server task (SRV-117…SRV-127, Stage N of the server backlog); these rows are `BLOCKED` and flip to `TODO` automatically when `tasks.py set SRV-1xx DONE` runs.

| ID | Task | Branch | Needs | Server (SRV) | Status | Notes |
|---|---|---|---|---|---|---|
| ADM-068 | Admin profile (PRD §4): change password, change email with verification, alert-email recipients | `feat/adm-068-admin-profile` | ADM-030, ADM-013 | SRV-117 | DONE | Server gap G1: no profile endpoints (alert recipients are a setting key). unblocked by SRV-117 on 2026-10-19 |
| ADM-069 | Global search (PRD §3): customers, salons, bookings, members grouped; wire the topbar search UI | `feat/adm-069-global-search` | ADM-022, ADM-028 | SRV-118 | DONE | Server gap G2: no search endpoint. unblocked by SRV-118 on 2026-10-19 |
| ADM-070 | Salon editing by admin (A13): profile and location, gallery, working hours and closures, services, staff, policies | `feat/adm-070-salon-edit` | ADM-041, ADM-020 | SRV-119, SRV-120 | DONE | Server gap G3: those endpoints are merchant-scoped; admin variants (with reason + audit) are missing. unblocked by SRV-120 on 2026-10-19 |
| ADM-071 | Booking extras (A15): reassign staff with eligible list, issue a refund of a chosen amount, explicit cancel modes, related notifications and events, bookings export | `feat/adm-071-booking-extras` | ADM-049 | SRV-123 | DONE | Server gap G6. unblocked by SRV-123 on 2026-10-19 |
| ADM-072 | Customer extras (A12): edit profile, reviews written by the customer, notifications sent, immediate force delete, push to one customer from the profile | `feat/adm-072-customer-extras` | ADM-046, ADM-059 | SRV-122 | DONE | Server gap G5 (push to one customer works through a campaign with `SPECIFIC_USERS`). unblocked by SRV-122 on 2026-10-19 |
| ADM-073 | Salon list columns and insights (A13): subscription filter, recommended flag, bookings (30d), per-salon KPIs, analytics and activity tabs, deletion-request decision | `feat/adm-073-salon-insights` | ADM-041, ADM-058 | SRV-121 | DONE | Server gaps G4: not returned or not offered today. unblocked by SRV-121 on 2026-10-19 |
| ADM-074 | Analytics — Traffic & Users (A02) and Screens & Events explorer (A03) with raw events | `feat/adm-074-analytics-traffic` | ADM-064 | SRV-110, SRV-127 | PENDING | Needs BigQuery-backed analytics (SRV-110, **user input**); UI can be prototyped on fixtures. dropped by owner 2026-10-19: analytics excluded; admin hides or skips this screen |
| ADM-075 | Analytics — Funnels (A04) with drop-off users and custom builder; Retention (A06) | `feat/adm-075-analytics-funnels` | ADM-064 | SRV-110 | PENDING | SRV-110. unblocked by SRV-110 on 2026-10-18 Waits on SRV-110 (BigQuery analytics dropped by owner 2026-10-19). dropped by owner 2026-10-19: analytics excluded; admin hides or skips this screen |
| ADM-076 | Analytics — Search & Discovery (A05) and Merchants analytics (A10) | `feat/adm-076-analytics-search-merchants` | ADM-064 | SRV-110 | PENDING | SRV-110 (merchant counts partly derivable from salons and subscriptions lists). unblocked by SRV-110 on 2026-10-18 Waits on SRV-110 (BigQuery analytics dropped by owner 2026-10-19). dropped by owner 2026-10-19: analytics excluded; admin hides or skips this screen |
| ADM-077 | User Journey (A11): search by phone, name, ids or booking reference; identity header; timeline with Guest marker, highlighted errors and payments; export | `feat/adm-077-journey` | ADM-018, ADM-045 | SRV-110, SRV-122 | PENDING | SRV-110; the customer detail already returns `journeyUserId`. dropped by owner 2026-10-19: analytics excluded; admin hides or skips this screen |

---

## Phase 5 — Integration, quality and release
Integration and release tasks for the admin panel (`INTEGRATION.md` §6).

| ID | Task | Branch | Needs | Server (SRV) | Status | Notes |
|---|---|---|---|---|---|---|
| ADM-078 | Fixture tests: every fixture of the mock transport is validated against the generated types in CI; adding an operation without a fixture fails the build | `feat/adm-078-fixture-tests` | ADM-026, ADM-004 | — | DONE | Works against the committed contract snapshot. |
| ADM-079 | Switch to `remote` on dev (INT-05): per-module gap list and fixes, socket events verified against the real server | `feat/adm-079-remote-dev` | ADM-078, ADM-061, ADM-063, ADM-047, ADM-030 | SRV-011a | DONE | Dev API = SRV-011a (Render, `VITE_API_BASE_URL` in `.env.dev`, ADM-087). |
| ADM-080 | PRD §3 / Design Script §3 flows as Playwright e2e on the mock transport (login to overview, application approval, booking status change, refund retry, payout creation, subscription expiry to Offline, bulk review approval, campaign scheduling, monthly report export; flows needing blocked features join later) | `feat/adm-080-flows-e2e` | ADM-043, ADM-049, ADM-053, ADM-056, ADM-057, ADM-050, ADM-059, ADM-065, ADM-067 | — | PENDING | Chromium locally, Chromium + WebKit in CI. Owner decision 2026-10-14: no e2e runs for now; revisit before release (ADM-083). |
| ADM-081 | RTL, accessibility and performance pass over all pages: keyboard paths, contrast in both themes, bundle budget per route chunk, 2-second load on a 30-day range with mock latency | `feat/adm-081-qa-pass` | ADM-080 | — | DONE | REL-01; budgets recorded in `scripts/budget.json`. |
| ADM-082 | Error tracking and source-map upload for release builds | `feat/adm-082-error-tracking` | ADM-005 | SRV-115 | BLOCKED | Tool selection (open item #4) and DSN — **user input**. |
| ADM-083 | Prod go-live checklist for the admin panel (env values, domain, CSP, rollback, smoke tests) | `feat/adm-083-go-live` | ADM-081, ADM-005, ADM-006, ADM-079 | — | PENDING | Hosting, domain and the pending tasks above (REL-03). |
| ADM-084 | Real data by default: only dev-debug uses the mock; dev-release, prod-debug and prod-release call the API through placeholder base URLs (`.env.dev`, `.env.prod`) the owner replaces | `feat/adm-084-remote-default` | ADM-081 | — | DONE | Owner request 2026-10-19. |
| ADM-085 | Real-server QA: every screen against a real WAB-Server (MongoDB, Redis, MinIO) with real data, and the defects it found | `feat/adm-085-real-server-fixes` | ADM-084 | — | DONE | Owner request 2026-10-19. |
| ADM-086 | A new deploy no longer breaks open tabs: a page whose code file is gone reloads once, and a route error shows the panel's error state instead of the router's crash screen | `feat/adm-086-chunk-reload` | ADM-085 | — | DONE | Found by the real-server QA (stale tab after a rebuild). |
| ADM-087 | Dev and prod base URLs point at the Render server and a one-command free deploy is documented | `feat/adm-087-onrender-urls` | ADM-086 | — | DONE | Owner request 2026-10-20. |

---

## Phase 6 — Salon branches
Added 2026-10-25 (Owner decisions 2026-10-25, `BUSINESS_DOMAIN.md` §3.3a, §5.2, §5.16–§5.18, §6, §12.7). Admin has full CRUD on every branch; every write carries a reason and lands in the audit log.

| ID | Task | Branch | Needs | Server (SRV) | Status | Notes |
|---|---|---|---|---|---|---|
| ADM-088 | Re-sync the contract (`npm run api:sync`) with branches: types, branch error codes in AR/EN messages, setting `salon.maxBranches` on the Settings page | `feat/adm-088-branches-contract` | ADM-087 | SRV-136, SRV-148 | DONE | Waits for the server contract. unblocked by SRV-148 on 2026-10-25 |
| ADM-089 | Salon detail → Branches tab: list (main, status, completeness, area, staff count), create / edit (location on map, contacts, name AR/EN), set main, offline / online, close (shows the blocking bookings), all with reason | `feat/adm-089-salon-branches` | ADM-088 | SRV-147 | DONE | Full CRUD. |
| ADM-090 | Branch-aware salon editing: hours, closures, services/prices and staff per branch; move staff between branches | `feat/adm-090-branch-editing` | ADM-089 | SRV-141, SRV-147 | DONE |  |
| ADM-091 | Branch filter and column across bookings, reviews, members/staff, transactions, refunds, ledger and exports; booking and review detail show the branch | `feat/adm-091-branch-filters` | ADM-088 | SRV-145, SRV-146, SRV-147 | DONE |  |
| ADM-092 | Branches QA: every branch screen against the real server, AR/EN, light/dark, desktop/phone | `feat/adm-092-branches-qa` | ADM-089, ADM-090, ADM-091 | SRV-148 | DONE |  |
| ADM-093 | Catalog request approval can map to an existing catalog service (SRV-125) instead of always creating a new one | `feat/adm-093-catalog-map-existing` | ADM-079 | SRV-125 | DONE | Gap G13 from ADM-079 (`docs/REMOTE_DEV_GAPS.md`). |
| ADM-094 | Export menu on the customers and salons lists (export kinds `CUSTOMERS`, `SALONS`, SRV-126) | `feat/adm-094-list-exports` | ADM-079 | SRV-126 | DONE | Gap G14 from ADM-079. |
| ADM-095 | Booking list/detail show the request time `requestedAt` (12-hour, Asia/Amman) | `feat/adm-095-booking-requested-at` | ADM-079 |  | DONE | Gap G15 from ADM-079. |
| ADM-096 | Re-sync the admin contract 1.5.0 after SRV-151 (`npm run api:sync`): correct id patterns (drop `data/api/objectId.ts` re-checks), branch status messages, gate + browser check of affected screens | `feat/adm-096-contract-sync` | ADM-095 | SRV-151 | DONE |  |
| ADM-097 | Session lasts 2 days: client idle sign-out 2 days (= server `admin.sessionIdleSec` 172800), proactive token refresh, session survives a reload (tab sessionStorage), settings bound raised | `feat/adm-097-session-two-days` | ADM-096 |  | DONE | Owner 2026-10-26 "make session time out after 2 days"; server default changes in parallel. |
| ADM-098 | Design fidelity: make every panel screen match `design/` (login, overview, customers, salons, bookings, finance, content, system, shell) | `feat/adm-098-design-fidelity` | ADM-097 |  | DONE | Owner 2026-10-26 "implement design as is from its design folder". Design items without server data are listed, not faked. |
| ADM-099 | Design gaps after ADM-098: banners as the design card grid, top-bar bell dropdown (latest NEW alerts, mark read, view all), list-card search + export in the card header, settings cards with the design header bar, analytics A07–A10 + journey per `03 Analytics` (server data only, "no data yet" elsewhere), Playfair Display bundled, tablet icon rail; server gap rows SRV-162…168 | `feat/adm-099-design-gaps` | ADM-098 |  | DONE | Owner 2026-10-26 "implement the design as is"; nothing faked. |
| ADM-100 | Live overview KPI row + sparklines from the live snapshot (design 02): bookings today by status, bride bookings, pending requests + oldest wait, registrations today, payment success + top decline + collected JOD, refunds pending/overdue, error rate last hour, offline salons, trials ending | `feat/adm-100-live-kpis` | ADM-099 | SRV-162 | BLOCKED |  |
| ADM-101 | Transactions KPI row (design 07 A16): count, success rate, collected, gateway fees, refunded for the active filters | `feat/adm-101-transactions-kpis` | ADM-099 | SRV-163 | BLOCKED |  |
| ADM-102 | Customer and salon codes in lists, details and the global search; customers registration-date filter; salon owner line in the salons list (designs 04/05) | `feat/adm-102-record-codes` | ADM-099 | SRV-164 | BLOCKED |  |
| ADM-103 | Banner cards with title, artwork preview and salon name; title field in the banner editor (design 08 A24) | `feat/adm-103-banner-preview` | ADM-099 | SRV-165 | BLOCKED |  |
| ADM-104 | Alerts "email preview" tab (design 09 A27) | `feat/adm-104-alert-email-preview` | ADM-099 | SRV-166 | BLOCKED |  |
| ADM-105 | Audit device column shows browser / OS / device type (design 09 A29) | `feat/adm-105-audit-device` | ADM-099 | SRV-167 | BLOCKED |  |
| ADM-106 | Analytics A07–A10: fill the "no data yet" KPIs and cards from the breakdown endpoints (design 03) | `feat/adm-106-analytics-breakdowns` | ADM-099 | SRV-168 | BLOCKED |  |
| ADM-107 | Adopt admin contract 1.7.0 (SRV-170): `api:sync`; staff per person `{id, name, firstName, photoUrl}` on booking rows/details, `rejection {reasonCode, reasonText, at}` on list rows, `money.remaining` = still owed (0 once final) + `money.paidAtSalon` (COMPLETED) shown in the bookings list and details (PRD A12/A13) | `feat/adm-107-contract-1-7` | ADM-047 | SRV-170 | DONE |  |
| ADM-108 | Deploy the panel on Cloudflare Pages: `--target cloudflare` for the header generator, `.node-version`, and a step-by-step guide | `feat/adm-108-cloudflare` | ADM-087 | — | DONE | Owner request 2026-10-27 (instead of Netlify). |
| ADM-109 | Business types, contract re-sync + filters (owner 2026-10-29, BUSINESS_DOMAIN §5.19): `api:sync`; `gender` → `businessType` + `audience` everywhere; business-type filter (All/Salons/Clinics) on salons, applications, bookings, reviews, placements, catalog requests, reports, exports; type + audience badges on rows/details; applications show the medical license | `feat/adm-109-business-types` | ADM-107 | SRV-174, SRV-178 | DONE | unblocked by SRV-178 on 2026-10-29 |
| ADM-110 | Catalog per business type + audience management: catalog categories managed per type (SALON with audience MALE/FEMALE/BOTH, CLINIC = BOTH), placements per type, salon audience change dialog (widen/narrow with reason, conflict list per §5.12) | `feat/adm-110-catalog-types` | ADM-109 | SRV-178 | DONE |  |
| ADM-111 | Tattoo studios in the panel (BUSINESS_DOMAIN §5.23): `api:sync`; TATTOO in every business-type filter, catalog per type, placements, applications (trade license only), booking details with design images (signed URLs); AR/EN labels | `feat/adm-111-tattoo` | ADM-110 | SRV-183 | DONE |  |
| ADM-112 | Business-made bookings + overdue closing (BUSINESS_DOMAIN §5.20, §5.21): source filter/column + "created by" in booking lists, details and exports; `BOOKINGS_CREATE` in the permission labels; close-overdue alerts in the alerts list; settings `booking.closeReminderIntervalMinutes` / `closeOverdueAlertHours` | `feat/adm-112-merchant-bookings` | ADM-111 | SRV-185, SRV-186 | DONE |  |

---
## 5. Traceability matrix (nothing in the PRD or BRD is left without a task)

### 5.1 PRD pages
| PRD page | Name | Tasks |
|---|---|---|
| A00 | Login & 2FA | ADM-030 |
| A01 | Live Overview | ADM-063 |
| A02 | Traffic & Users | ADM-074 |
| A03 | Screens & Events | ADM-074 |
| A04 | Funnels | ADM-075 |
| A05 | Search & Discovery | ADM-076 |
| A06 | Retention | ADM-075 |
| A07 | Bookings analytics | ADM-064 |
| A08 | Payments analytics | ADM-052, ADM-064 |
| A09 | Errors & Issues | ADM-064 |
| A10 | Merchants analytics | ADM-076 |
| A11 | User Journey | ADM-077 |
| A12 | Customers | ADM-044, ADM-045, ADM-046, ADM-072 |
| A13 | Salons | ADM-040, ADM-041, ADM-042, ADM-070, ADM-073 |
| A14 | Applications queue | ADM-043 |
| A15 | Bookings | ADM-047, ADM-048, ADM-049, ADM-071 |
| A16 | Transactions | ADM-052 |
| A17 | Refunds | ADM-053 |
| A18 | Payouts | ADM-055, ADM-056 |
| A19 | Subscriptions | ADM-057 |
| A20 | Recommended salons | ADM-058 |
| A21 | Reconciliation | ADM-054 |
| A22 | Reviews moderation | ADM-050, ADM-051 |
| A23 | Catalog | ADM-038, ADM-039 |
| A24 | Content | ADM-035, ADM-036, ADM-037 |
| A25 | Push notifications | ADM-059, ADM-060 |
| A26 | Reports | ADM-065 |
| A27 | Alerts | ADM-061 |
| A28 | Settings | ADM-031, ADM-032, ADM-033, ADM-034 |
| A29 | Audit log | ADM-066 |

### 5.2 PRD global rules and other sections
| Section | Rule | Tasks |
|---|---|---|
| PRD §2 | Env, build, stack | ADM-001, ADM-002, ADM-005, ADM-006, ADM-007, ADM-004 |
| PRD §3 | Languages RTL/LTR, Asia/Amman 12-hour, shell, tables, URL filters, date range, charts, states, reasons, deep links, realtime | ADM-008, ADM-028, ADM-015, ADM-016, ADM-017, ADM-019, ADM-022, ADM-062, ADM-027, ADM-018 |
| PRD §4 | Login, 2FA, session timeout, lockout, profile | ADM-030, ADM-025, ADM-068 |
| PRD §5 | Analytics data foundation (events, identity merge) | ADM-064, ADM-074, ADM-077 |
| PRD §6 | Navigation (15 modules) | ADM-022, ADM-062 |
| PRD §9 | Admin action → notification matrix (shown in dialogs) | ADM-046, ADM-042, ADM-049, ADM-043, ADM-039 |
| PRD §10 | Validation (banner / placement periods, payout amount, subscription dates) | ADM-013, ADM-037, ADM-058, ADM-056, ADM-057 |
| PRD §11 | Performance (pre-aggregated data, 2 s loads) | ADM-081, ADM-015 |
| Design Script §1 | Components | ADM-011, ADM-012, ADM-013, ADM-014, ADM-015, ADM-016, ADM-017, ADM-018, ADM-019, ADM-020, ADM-021 |
| Design Script §3 | Flows to prototype | ADM-080 |
| Design Script §4 | Completion checklist (states, reasons, export, realtime, RTL/dark) | ADM-023, ADM-081 |

### 5.3 BRD requirements
| ID | Requirement | Tasks |
|---|---|---|
| ABR-01 | Single admin, all permissions | ADM-030, ADM-068 |
| ABR-02 | Secured login + second factor | ADM-025, ADM-030 |
| ABR-03 | Audit log + reason on every action | ADM-017, ADM-042, ADM-046, ADM-049, ADM-066 |
| ABR-10 | Live overview | ADM-063 |
| ABR-11 | All events stored and queryable | ADM-074 |
| ABR-12 | Any user's journey | ADM-077 |
| ABR-13 | Guest history linked | ADM-077 |
| ABR-14 | Funnels | ADM-075 |
| ABR-15 | Every payment attempt | ADM-052, ADM-064 |
| ABR-16 | Problems (crashes, errors, OTP…) | ADM-064 |
| ABR-17 | Search analytics | ADM-076 |
| ABR-18 | Booking analytics | ADM-064 |
| ABR-19 | Merchant analytics | ADM-076 |
| ABR-20 | Retention | ADM-075 |
| ABR-21 | Filters on all analytics | ADM-016, ADM-064 |
| ABR-30 | Customers: view / search / edit | ADM-044, ADM-045, ADM-072 |
| ABR-31 | Block / unblock | ADM-046 |
| ABR-32 | Account deletions | ADM-046 |
| ABR-40 | Applications | ADM-043 |
| ABR-41 | Edit any salon data | ADM-040, ADM-041, ADM-070 |
| ABR-42 | Online / Offline | ADM-042 |
| ABR-43 | Recommended placements | ADM-058 |
| ABR-44 | Salon deletion requests | ADM-073 |
| ABR-50 | View every booking | ADM-047, ADM-048 |
| ABR-51 | Intervene on any booking | ADM-049, ADM-071 |
| ABR-60 | Transactions | ADM-052 |
| ABR-61 | Refunds | ADM-053, ADM-071 |
| ABR-62 | Payouts | ADM-055, ADM-056 |
| ABR-63 | Subscriptions | ADM-057 |
| ABR-64 | Reconciliation | ADM-054 |
| ABR-70 | Review moderation | ADM-050, ADM-051 |
| ABR-71 | Services catalog | ADM-038, ADM-039 |
| ABR-72 | Content | ADM-035, ADM-036, ADM-037 |
| ABR-73 | Push campaigns | ADM-059, ADM-060 |
| ABR-80 | Settings | ADM-031, ADM-032, ADM-033, ADM-034 |
| ABR-90 | Email alerts + alerts page | ADM-032, ADM-061 |
| ABR-91 | Daily/weekly/monthly reports | ADM-065, ADM-067 |
| ABR-92 | Export any table | ADM-015, ADM-016, ADM-067 |

---

## Appendix A — Real admin API (from `WAB-Server/docs/api/openapi.admin.json`, 164 operations)

> **Status: the contract of record** until `contracts/` (INT-01) exists. Generated by this document's tooling from the server's committed OpenAPI; regenerate after `npm run api:sync`. Every operation has at least one consuming task (checked).

**Conventions (from the OpenAPI and `WAB-Server/CLAUDE.md` §6):** base path `/admin/v1`; bearer token of the *admin* scope only (`bearerAuth` JWT); JSON camelCase; ISO-8601 UTC timestamps (display in Asia/Amman, 12-hour); money as decimal string JOD, 3 decimals; ids are strings; `Accept-Language: ar|en` (admin responses carry **both** languages for stored `{ar, en}` content); lists take `page` and `pageSize` (default 25) and return `meta { page, pageSize, total }`; every write takes a mandatory `reason` (audited); envelope `{ success, message, data, meta? }` / `{ success:false, message, error:{ code, details?, traceId } }` with the codes of `BUSINESS_DOMAIN.md` §11.

| Operation | Summary (server) | Consumed by |
|---|---|---|
| `GET /alerts` | Alerts, newest first (filter by status or kind) | ADM-061 |
| `GET /alerts/count` | How many alerts are still NEW (the bell badge) | ADM-061 |
| `POST /alerts/{id}/acknowledge` | Acknowledge an alert (repeating it is harmless) | ADM-061 |
| `GET /analytics/events` | Event counts grouped by name or by Amman day (cached 1 minute) | ADM-063, ADM-064 |
| `GET /analytics/overview` | Payment, refund, booking and error event counts for a range (cached 1 minute) | ADM-063 |
| `GET /app-config/maintenance` | List maintenance switch records (both languages) | ADM-034 |
| `POST /app-config/maintenance` | Create a maintenance switch (reason required, audited) | ADM-034 |
| `GET /app-config/maintenance/{id}` | Get one maintenance switch | ADM-034 |
| `PATCH /app-config/maintenance/{id}` | Change a maintenance switch (reason required, audited) | ADM-034 |
| `GET /app-config/versions` | List app version policy records (both languages) | ADM-034 |
| `POST /app-config/versions` | Create a app version policy (reason required, audited) | ADM-034 |
| `GET /app-config/versions/{id}` | Get one app version policy | ADM-034 |
| `PATCH /app-config/versions/{id}` | Change a app version policy (reason required, audited) | ADM-034 |
| `GET /audit-logs` | Audit log, newest first; filter by admin, action, entity and dates | ADM-066 |
| `GET /audit-logs/{id}` | One audit entry with before and after | ADM-066 |
| `POST /auth/login` | Step 1: password | ADM-030 |
| `POST /auth/logout` | Log out | ADM-025 |
| `POST /auth/refresh` | Rotate the refresh token | ADM-025 |
| `POST /auth/verify-otp` | Step 2: emailed code | ADM-030 |
| `GET /banners` | List banner records (both languages) | ADM-037 |
| `POST /banners` | Create a banner (reason required, audited) | ADM-037 |
| `GET /banners/{id}` | Get one banner | ADM-037 |
| `PATCH /banners/{id}` | Change a banner (reason required, audited) | ADM-037 |
| `GET /bookings` | All bookings with filters (status, dates, salon, customer, payment, bride) and search | ADM-047 |
| `GET /bookings/{id}` | Booking details for the admin | ADM-048 |
| `POST /bookings/{id}/status` | Move a booking to any other status with a mandatory reason (audited) | ADM-049 |
| `GET /campaigns` | Campaign history with audience size, sent, delivered, opened and failures | ADM-060 |
| `POST /campaigns` | Compose a campaign; sent now or at `scheduledAt` (customers also get it in their list) | ADM-059 |
| `POST /campaigns/audience-size` | How many accounts and devices an audience reaches | ADM-059 |
| `GET /campaigns/{id}` | One campaign with live statistics | ADM-060 |
| `POST /campaigns/{id}/cancel` | Cancel a campaign that has not started sending (422 otherwise) | ADM-060 |
| `GET /catalog/requests` | Catalog requests, oldest first (pending by default) | ADM-039 |
| `POST /catalog/requests/{id}/approve` | Approve: creates the catalog service (salon’s gender) and tells the salon (reason required, audited) | ADM-039 |
| `POST /catalog/requests/{id}/reject` | Reject with a note the salon sees (reason required, audited) | ADM-039 |
| `GET /catalog/services` | List catalog service records (both languages) | ADM-038 |
| `POST /catalog/services` | Create a catalog service (reason required, audited) | ADM-038 |
| `GET /catalog/services/{id}` | Get one catalog service | ADM-038 |
| `PATCH /catalog/services/{id}` | Change a catalog service (reason required, audited) | ADM-038 |
| `GET /content/contact-info` | List contact info records (both languages) | ADM-036 |
| `POST /content/contact-info` | Create a contact info (reason required, audited) | ADM-036 |
| `GET /content/contact-info/{id}` | Get one contact info | ADM-036 |
| `PATCH /content/contact-info/{id}` | Change a contact info (reason required, audited) | ADM-036 |
| `GET /content/faqs` | List FAQ entry records (both languages) | ADM-036 |
| `POST /content/faqs` | Create a FAQ entry (reason required, audited) | ADM-036 |
| `GET /content/faqs/{id}` | Get one FAQ entry | ADM-036 |
| `PATCH /content/faqs/{id}` | Change a FAQ entry (reason required, audited) | ADM-036 |
| `GET /content/pages` | List content page (privacy, terms, about) records (both languages) | ADM-035 |
| `POST /content/pages` | Create a content page (privacy, terms, about) (reason required, audited) | ADM-035 |
| `GET /content/pages/{id}` | Get one content page (privacy, terms, about) | ADM-035 |
| `PATCH /content/pages/{id}` | Change a content page (privacy, terms, about) (reason required, audited) | ADM-035 |
| `GET /customers` | Customers: search by name or phone, filter by status, gender and city | ADM-044 |
| `GET /customers/{id}` | Customer detail with devices and the id for the journey view | ADM-045 |
| `POST /customers/{id}/block` | Block an account (reason, audit); all sessions end | ADM-046 |
| `POST /customers/{id}/delete` | Start the deletion grace period of an active account | ADM-046 |
| `POST /customers/{id}/restore` | Restore an account that waits for deletion | ADM-046 |
| `POST /customers/{id}/unblock` | Unblock an account | ADM-046 |
| `GET /exports` | Exports, newest first | ADM-067 |
| `POST /exports` | Request an Excel / CSV / PDF export of a report, the transactions or the audit log | ADM-067 |
| `GET /exports/{id}` | One export with its status and, when DONE, a fresh download link | ADM-067 |
| `GET /finance/reconciliation` | Payment problems: stuck pending, paid without booking, missing ledger charge | ADM-054 |
| `GET /locations/areas` | List area records (both languages) | ADM-033 |
| `POST /locations/areas` | Create a area (reason required, audited) | ADM-033 |
| `GET /locations/areas/{id}` | Get one area | ADM-033 |
| `PATCH /locations/areas/{id}` | Change a area (reason required, audited) | ADM-033 |
| `GET /locations/cities` | List city records (both languages) | ADM-033 |
| `POST /locations/cities` | Create a city (reason required, audited) | ADM-033 |
| `GET /locations/cities/{id}` | Get one city | ADM-033 |
| `PATCH /locations/cities/{id}` | Change a city (reason required, audited) | ADM-033 |
| `GET /locations/countries` | List country records (both languages) | ADM-033 |
| `POST /locations/countries` | Create a country (reason required, audited) | ADM-033 |
| `GET /locations/countries/{id}` | Get one country | ADM-033 |
| `PATCH /locations/countries/{id}` | Change a country (reason required, audited) | ADM-033 |
| `GET /payouts` | Payout history (filter by salon or status) | ADM-055 |
| `POST /payouts` | Create a PENDING payout from the ledger up to a moment (audited) | ADM-056 |
| `GET /payouts/balances` | Balance per salon: collected, gateway fees, refunds, payouts and what is due now | ADM-055 |
| `GET /payouts/preview` | What a payout up to a moment would contain (nothing is stored) | ADM-055 |
| `GET /payouts/{id}` | One payout | ADM-055 |
| `POST /payouts/{id}/transfer` | Record the bank transfer: status TRANSFERRED and the ledger entry PAYOUT −net (audited) | ADM-056 |
| `GET /recommended` | Placements per audience in display order, with scheduled / active / ended status | ADM-058 |
| `POST /recommended` | Add a placement. The audience is the salon’s gender; a salon cannot have overlapping placements (409). | ADM-058 |
| `PUT /recommended/reorder` | Set the display order of one audience’s placements (drag to reorder) | ADM-058 |
| `PATCH /recommended/{id}` | Edit a scheduled or running placement (an ended one is 422) | ADM-058 |
| `POST /recommended/{id}/end` | Stop a placement now (remove from the customer app) | ADM-058 |
| `GET /refunds` | Refunds, newest first (filter by status or booking) | ADM-053 |
| `GET /refunds/{id}` | One refund with its attempts | ADM-053 |
| `POST /refunds/{id}/manual` | Mark a pending or failed refund as refunded outside the gateway (reference and reason required, audited) | ADM-053 |
| `POST /refunds/{id}/retry` | Give a failed refund a fresh set of attempts (reason required, audited) | ADM-053 |
| `GET /reports/daily` | One business day (Asia/Amman): bookings, payments, refunds, registrations, reviews | ADM-065 |
| `GET /reports/monthly` | One month: weekly content, payouts transferred, subscriptions, growth vs previous month | ADM-065 |
| `GET /reports/weekly` | Seven days from `from`: the daily numbers added up plus top salons | ADM-065 |
| `GET /reviews` | Reviews by status (pending by default, oldest first; other statuses newest first), filter by target, salon, staff, rating | ADM-050 |
| `POST /reviews/bulk` | Approve or reject up to 100 pending reviews; each one is reported separately | ADM-050 |
| `POST /reviews/{id}/approve` | Publish a pending review; the salon or staff rating is recomputed | ADM-050 |
| `POST /reviews/{id}/reject` | Reject a pending review (reason optional) | ADM-050 |
| `POST /reviews/{id}/remove` | Take a published review down (reason required); rating recomputed | ADM-051 |
| `GET /salons` | Salons: filter by state, gender, city and name; newest first | ADM-040 |
| `GET /salons/applications` | Applications queue, oldest first (pending by default) | ADM-043 |
| `GET /salons/applications/{id}` | One application with signed license-document URLs | ADM-043 |
| `POST /salons/applications/{id}/approve` | Approve an application (reason required, audited): starts the trial subscription | ADM-043 |
| `POST /salons/applications/{id}/reject` | Reject an application (reason required, audited): the owner sees the reason | ADM-043 |
| `GET /salons/{id}` | Salon overview: state, completeness checklist, owner, subscription summary | ADM-041 |
| `PATCH /salons/{id}/gender` | Change the salon’s gender (admin only, reason required, audited, owner notified). Its services are switched off (they belong to the old catalog) and bride flags are cleared for a men’s salon. | ADM-042 |
| `GET /salons/{id}/members` | All members of a salon (active or not), owner first, with role and permissions | ADM-041 |
| `POST /salons/{id}/offline` | Take a salon offline (reason required, audited) | ADM-042 |
| `POST /salons/{id}/online` | Bring an offline salon back: LIVE if complete, else APPROVED_INCOMPLETE (reason required, audited) | ADM-042 |
| `GET /salons/{id}/payout-details` | A salon’s full bank details to make a transfer (every call is audited) | ADM-042 |
| `PUT /salons/{id}/payout-details` | Replace a salon’s bank details with a reason (audited; the audit log never holds the IBAN) | ADM-042 |
| `GET /settings` | Every platform setting with its effective value and its default | ADM-031, ADM-032 |
| `PUT /settings/{key}` | Change one setting (validated, applied at once everywhere, audited with reason) | ADM-031, ADM-032 |
| `GET /subscriptions` | Subscriptions by salon (filter by status, or ending within N days) | ADM-057 |
| `GET /subscriptions/{salonId}` | One salon’s subscription with its payments | ADM-057 |
| `POST /subscriptions/{salonId}/payments` | Record a payment made outside the app (audited): the salon becomes ACTIVE and its paid period is extended | ADM-057 |
| `GET /transactions` | Payment attempts with gateway codes (filter by status, type, salon, customer, booking, dates) | ADM-052 |
| `GET /transactions/{id}` | One attempt with the raw gateway answer and all attempts of the same checkout | ADM-052 |
| `POST /uploads/confirm` | Confirm an uploaded file (real type and size are checked); rejected files are deleted | ADM-037 |
| `POST /uploads/presign` | Get a presigned upload URL for a purpose (type, size and expiry are restricted) | ADM-037 |

**Socket.IO** (`/admin` namespace; token in `auth.token`; wrong or missing token → `connect_error` `UNAUTHORIZED` / `FORBIDDEN`; the admin joins room `admin`): `booking.updated` and `alert.created` are emitted today; consumed by ADM-027.

---

## Appendix B — Environments and build variants
| Setting | local developer | dev | prod |
|---|---|---|---|
| Purpose | build offline against the mock transport | integration and QA | operators |
| Variant to build | `dev-debug` (`npm run dev`) | `dev-release` (`dev-debug` for diagnosis) | `prod-release` (`prod-debug` for diagnosis) |
| `VITE_DATA_SOURCE` | `mock` | `remote` (mock allowed through the dev scenario switcher) | `remote` only; mock code compiled out |
| `VITE_API_BASE_URL` / `VITE_SOCKET_URL` | optional | dev API / socket (GitHub `vars`) | prod API / socket, **https only** |
| `POST /bookings/{id}/cancel` | Cancel a PENDING or APPROVED booking by mode | ADM-071 |
| `GET /bookings/{id}/eligible-staff` | Staff who could take over one person of an APPROVED booking | ADM-071 |
| `POST /bookings/{id}/reassign` | Reassign one person of an APPROVED booking to another staff member | ADM-071 |
| `POST /bookings/{id}/refund` | Refund a chosen amount of the online payment | ADM-071 |
| `PATCH /customers/{id}` | Correct a customer’s profile (name, email, gender, city/area, language) | ADM-072 |
| `POST /customers/{id}/force-delete` | Delete a customer at once, without the 30-day grace period | ADM-072 |
| `GET /customers/{id}/notifications` | Notifications the platform sent to the customer, newest first | ADM-072 |
| `POST /customers/{id}/push` | Send a push to this one customer, now | ADM-072 |
| `GET /customers/{id}/reviews` | Reviews the customer wrote, every moderation status, newest first | ADM-072 |
| `GET /profile` | The signed-in admin’s profile | ADM-068 |
| `PATCH /profile` | Replace the alert recipients | ADM-068 |
| `POST /profile/email/request` | Step 1 of an email change: code to the new address | ADM-068 |
| `POST /profile/email/verify` | Step 2 of an email change: confirm the code | ADM-068 |
| `POST /profile/password` | Change the password | ADM-068 |
| `GET /salons/{id}/activity` | What admins did to the salon (approval, offline/online, edits, deletion decision), newest first | ADM-073 |
| `GET /salons/{id}/analytics` | Bookings created per day (Asia/Amman) for a date range | ADM-073 |
| `POST /salons/{id}/closures` | Add a closure | ADM-070 |
| `PATCH /salons/{id}/closures/{closureId}` | Change a closure that has not started | ADM-070 |
| `POST /salons/{id}/closures/{closureId}/remove` | Remove a closure that has not started | ADM-070 |
| `POST /salons/{id}/closures/preview` | Preview: bookings a closure would break (nothing is changed) | ADM-070 |
| `POST /salons/{id}/deletion-request/decision` | Decide the owner’s deletion request | ADM-073 |
| `GET /salons/{id}/gallery` | A salon’s gallery | ADM-070 |
| `POST /salons/{id}/gallery` | Add an uploaded image or video to a salon’s gallery (appended last) | ADM-070 |
| `POST /salons/{id}/gallery/{itemId}/remove` | Remove a gallery item and its files | ADM-070 |
| `PUT /salons/{id}/gallery/order` | Reorder a salon’s gallery: every item id exactly once | ADM-070 |
| `GET /salons/{id}/hours` | Weekly hours, upcoming closures and today’s state | ADM-070 |
| `PUT /salons/{id}/hours` | Replace the weekly working hours | ADM-070 |
| `POST /salons/{id}/hours/preview` | Preview: bookings a new weekly schedule would break (nothing is changed) | ADM-070 |
| `GET /salons/{id}/kpis` | Salon KPIs: rating, bookings by status (all time and last 30 days), active services and staff | ADM-073 |
| `GET /salons/{id}/members/{memberId}/staff` | A member’s staff profile | ADM-070 |
| `PUT /salons/{id}/members/{memberId}/staff` | Replace a member’s staff profile (services, bride qualification, working days) | ADM-070 |
| `GET /salons/{id}/policy` | A salon’s booking policy (null until one is set) | ADM-070 |
| `PUT /salons/{id}/policy` | Replace a salon’s booking policy | ADM-070 |
| `GET /salons/{id}/profile` | A salon’s editable profile | ADM-070 |
| `PATCH /salons/{id}/profile` | Edit a salon’s profile, location and contacts | ADM-070 |
| `GET /salons/{id}/services` | A salon’s services, paginated | ADM-070 |
| `POST /salons/{id}/services` | Add a catalog service to the salon | ADM-070 |
| `PATCH /salons/{id}/services/{serviceId}` | Change a salon service (price, duration, bride-only, media, active) | ADM-070 |
| `POST /salons/{id}/members/{memberId}/branch` | Move a member to another open branch of the salon (skills are cleared) | ADM-090 |
| `GET /salons/{id}/branches` | Branches of the salon, main first | ADM-089 |
| `POST /salons/{id}/branches` | Add a branch (BRANCH_LIMIT_REACHED at salon.maxBranches) | ADM-089 |
| `GET /salons/{id}/branches/{branchId}` | One branch | ADM-089 |
| `PATCH /salons/{id}/branches/{branchId}` | Edit name, location, address, city/area or contacts | ADM-089 |
| `POST /salons/{id}/branches/{branchId}/main` | Make this branch the main one | ADM-089 |
| `POST /salons/{id}/branches/{branchId}/offline` | Hide the branch from customers | ADM-089 |
| `POST /salons/{id}/branches/{branchId}/online` | Bring an offline branch back | ADM-089 |
| `POST /salons/{id}/branches/{branchId}/close` | Close for good (409 BRANCH_HAS_UPCOMING_BOOKINGS, 422 LAST_BRANCH) | ADM-089 |
| `GET /search` | Global search: customers, salons, bookings and team members | ADM-069 |
| Ribbon / `/about` / dev gallery | shown | shown | hidden / shown without internals / compiled out |
| Source maps | yes (debug) | yes in debug, no in release | no in release |
| Secrets | none: every `VITE_*` value is public | none | none |

CI builds all four variants, then checks the size budget and artifact safety (no source maps in release, no mock code in prod). Deployment is ADM-005 (PENDING on hosting).

## Appendix C — Decisions (record each as an ADR in `docs/adr/` before the task that needs it)
| # | Decision | Needed by | Recommendation / status |
|---|---|---|---|
| 1 | API contract source | ADM-004 | **Decided:** the server's committed OpenAPI (`openapi.admin.json`) until `contracts/` exists |
| 2 | Chart implementation: hand-rolled SVG vs a library | ADM-019 | Hand-rolled SVG components for the six chart types (small bundle, RTL/theme control) |
| 3 | Form library | ADM-013 | `react-hook-form` + zod resolver |
| 4 | Rich-text editor | ADM-021 | Headless editor (e.g. Tiptap) + strict sanitizer; the server sanitizes again |
| 5 | Drag-and-drop for ordering (recommended, FAQ, banners, services) | ADM-058 | `@dnd-kit` with a keyboard-accessible fallback (move up / down) |
| 6 | Date-range picker | ADM-016 | Own component on `Intl`, Amman day boundaries via `AppTime` |
| 7 | OpenAPI type generation tool | ADM-004 | `openapi-typescript` for types + a thin zod layer for runtime parsing |
| 8 | Socket.IO client | ADM-027 | Match the server `socket.io` 4.x major; WebSocket first, polling fallback |
| 9 | Hosting, platform domain, CDN, CSP | ADM-005 | **Owner input** (root `CLAUDE.md` §7) |
| 10 | Error-tracking tool and DSN | ADM-082 | **Owner input** (open item #4) |

## Appendix D — Gaps between the Admin PRD and the real server API
Each gap is a candidate row for `WAB_Server_Tasks.md`. Admin tasks that depend on a gap are `PENDING` (Phase 4C) or carry a note.

| Gap | What the PRD needs and the server does not offer | Admin task |
|---|---|---|
| G1 | Admin profile: change password, change email with verification, alert recipients UI (recipients exist as a setting key) | ADM-068 |
| G2 | Global search (customers, salons, bookings, members) | ADM-069 |
| G3 | Admin editing of salon profile / location / contacts, gallery, working hours and closures, services, staff and policies (merchant endpoints are owner-scoped) | ADM-070 |
| G4 | Salon list: subscription filter, recommended flag, bookings (30d); per-salon KPIs, analytics, activity; deletion-request decision | ADM-073 |
| G5 | Customers: edit profile, reviews written by the customer, notifications sent to the customer, immediate force delete (only the grace-period `delete` exists) | ADM-072 |
| G6 | Bookings: reassign staff and eligible-staff list, refund of a chosen amount, separate cancel modes, related notifications and events, bookings export | ADM-071 |
| G7 | Analytics beyond counts: active users now, live activity feed, traffic, screens, funnels, search, retention, merchant analytics, per-user journeys (BigQuery, SRV-110 PENDING) | ADM-074, ADM-075, ADM-076, ADM-077 |
| G8 | Auth: no `me` and no `resend-otp` endpoint (the identity comes with verify-otp / refresh; resend = repeat login after `resendAfterSeconds`) — informational, handled in the auth task | ADM-030 |
| G9 | Export kinds are limited to reports, transactions and the audit log; PDF is Latin-only | ADM-067 |
| G10 | Admin socket events: only `booking.updated` and `alert.created` are emitted; `application.created`, `review.created`, `refund.updated`, `overview.tick` of BUSINESS_DOMAIN §7 are not | ADM-027 |
| G11 | Catalog request approval cannot map to an existing service (always creates one); push audiences from saved analytics segments are not offered | ADM-039, ADM-059 |

## Appendix E — Glossary
**Mock transport:** fixtures served through the real HTTP client, so DTO parsing and repositories run without a server · **Slice:** the domain / data / presentation part of one feature · **Reason:** mandatory justification of an admin action, stored in the audit log · **Variant:** `<dev|prod>-<debug|release>` build · **Contract snapshot:** the copy of the server OpenAPI that the generated types come from · **INT-01 / INT-05:** contracts v1 / switching the admin panel to the real dev server (`ROADMAP.md`).

## Appendix F — What changed from version 1 (written before the server APIs existed)
- **Order** changed to the requested one: setup → structure and architecture → design → business logic and API → integration. The API foundation moved after the design phase.
- **Appendix A** is no longer a proposal: it is the real OpenAPI (116 operations, all consumed). The 109 proposed endpoints were replaced; many differ (settings are `PUT /settings/{key}`; booking change is one `POST /bookings/{id}/status`; no `me`, no `resend-otp`; campaigns have `audience-size`; recommended has `reorder` and `end`).
- **New tasks:** contract tooling (generated types), error catalog, design audit, shell data, analytics from server events, exports page, six server-gap tasks (Phase 4C).
- **Merged or removed:** per-endpoint mock-only tasks, "contract drift vs `contracts/`" (replaced by snapshot staleness test), separate settings sections (now two tasks), bookings reassign / refund (moved to Phase 4C).
- **Admin login** (T-031) must be migrated: it assumed `challengeId` and `POST /auth/resend-otp`, which the server does not have (ADM-030).

