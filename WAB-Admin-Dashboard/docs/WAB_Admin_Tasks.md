# WAB-Admin-Dashboard — Task Backlog (build the whole admin panel)

> **Purpose:** every task needed to build the admin panel, small and ordered, each with a status. One task = one branch = one PR.
> **Written by:** product owner + technical writer, from the sources below. Rules for how code is written live in [`../CLAUDE.md`](../CLAUDE.md) and win over this file on conventions.
> **Sources read:** root `CLAUDE.md` and `.claude/*`, `BUSINESS_DOMAIN.md`, `ROADMAP.md`, `INTEGRATION_WORKFLOW.md`, `docs/WAB_Admin_PRD.md` (pages A00–A29), `docs/WAB_Admin_BRD.md` (ABR-xx), `docs/WAB_Admin_Design_Script.md`, `design/WAB Admin 0x *.dc.html`, `WAB-Server/docs/WAB_Server_Tasks.md`, `WAB-Server/docs/api/openapi.admin.json`.
> **Totals:** 86 numbered tasks (+ ADM-000 this backlog). 6 are `PENDING`; everything else is `TODO` and buildable today against the mock transport.
> **Important finding:** `WAB-Server/docs/api/openapi.admin.json` has **no paths yet** and `contracts/` (INT-01) does not exist. The admin endpoints are only *planned* (server Stage L, `SRV-101…109`, plus admin actions in other stages). So this backlog carries a **proposed admin API contract** (Appendix A) and every task is built against it with a mock transport; the switch to the real server is ADM-082.

---

## 1. Status legend
`TODO` ready to start · `IN PROGRESS` branch open · `IN REVIEW` PR open · `DONE` merged to `main` · `PENDING` blocked by **information from the owner** or by **another SDK/service that does not exist yet** (the *Notes* column says exactly what). A task is never `PENDING` only because it is large or because the server is not ready: build against the mock transport instead (`ROADMAP.md` §2).

## 2. Working rules
1. **Strict order, one at a time.** Take the first `TODO` task in ID order whose *Needs* are `DONE`. Do not start the next task until the previous task's PR is merged to `main`. `PENDING` tasks are skipped, not blocking.
2. **One task = one branch = one PR**, branch `feat/adm-NNN-<key>` from an updated `main`. Never commit or push to `main`; never force-push; never `--no-verify`. The cloud session branch is the documented exception.
3. **Done means:** `npm run verify` green (typecheck, lint with zero warnings, format, unit tests, hardcoded-value and 300-line scan), all four build variants build, bundle budget holds, e2e green for new screens, three verification loops and the four-role review recorded in `.claude/session.md`, **CI green before merge**.
4. **No hardcoding.** URLs, routes, limits, colors, sizes, texts, storage keys and timings come from `src/constants/`, `src/design/tokens/`, env config or `src/locales/` (Arabic **and** English, same keys).
5. **Layers.** A task touches `domain`, `data` and `presentation` in that order (Section 3). Pages are composed from base components only.
6. **Reasons and audit.** Every impactful admin action has a mandatory reason (`ReasonDialog`); the server writes the audit log and notifies affected parties (PRD §3, §9).
7. **Responsive and bilingual by default:** phone / tablet / desktop, portrait and landscape, RTL and LTR, light and dark.
8. **Server gaps are reported, not guessed.** If a screen needs data the server backlog does not cover, add it to Appendix D and keep building on the mock.

## 3. How a feature task is built (layer recipe and Definition of Done)
```
src/
  domain/<feature>/         entities, enums (mirrored from BUSINESS_DOMAIN §2), <Feature>Repository interface, use-case functions (pure)
  data/<feature>/           <feature>.dto.ts (zod), mapper, Remote<Feature>Repository (endpoints from constants/endpoints)
  data/mock/fixtures/       <feature>.ts  — success, empty, validation, 401/403/404/409/422, 500, timeout, AR+EN content
  presentation/<feature>/   use<Feature>Controller.ts (TanStack Query, query-key factory), <Feature>Page.tsx, components/
  app/routes.tsx            lazy route + nav entry in constants/nav.ts
  locales/{ar,en}.json      every new string, same keys
tests/<feature>/            domain unit tests · DTO/mapper/repository tests against fixtures · controller + page tests · e2e smoke
```
Every feature task has three slices, written in its block below:
- **Domain** — entities and enums as in `BUSINESS_DOMAIN.md`, the repository interface, and any rule that is more than a mapping, as a pure function.
- **Data** — zod DTOs and mappers, the `Remote…Repository` on the endpoints of Appendix A, and the fixtures that make it work in dev without a server.
- **Presentation** — the controller hook and the page(s), with loading, empty, error-with-retry, forbidden and realtime states.

Definition of Done for any task: acceptance criteria written in the `session.md` block · unit tests per layer · e2e smoke for new screens · AR+EN keys · `docs:api` up to date (after ADM-014) · `memory.md` updated with durable facts.

## 4. Stages and the roadmap
| Stage | ROADMAP stage | Content | Tasks |
|---|---|---|---|
| Stage 1A | ADM-01 | Environments and build variants | ADM-001 … ADM-004 |
| Stage 1B | ADM-01 | Layers, shared kernel and clean-code gates | ADM-005 … ADM-008 |
| Stage 1C | ADM-01 | API layer foundation | ADM-009 … ADM-014 |
| Stage 1D | ADM-01 | Base components | ADM-015 … ADM-026 |
| Stage 2 | ADM-02 | Core domain | ADM-027 … ADM-049 |
| Stage 3 | ADM-03 | Booking engine | ADM-050 … ADM-056 |
| Stage 4 | ADM-04 | Money and messaging | ADM-057 … ADM-065 |
| Stage 5 | ADM-05 | Operations and insights | ADM-066 … ADM-079 |
| Stage 6 | INT-05, REL-01…03 | Integration, quality and release | ADM-080 … ADM-086 |

Dependencies between stages: 1A–1D first (they unblock everything); Stage 2 modules after their base components; Stages 3–5 may run in parallel sessions once Stage 1 is merged; Stage 6 last. Integration with the real server happens only in Stage 6.

---

## Stage 1A — Environments and build variants
Item 1 of the request: dev and prod handled in config, CI and deployment. The four build variants (`dev-debug`, `dev-release`, `prod-debug`, `prod-release`) already exist (T-024); these tasks finish the environment story.

| ID | Task | Branch | Needs | Server (SRV) | Status | Notes |
|---|---|---|---|---|---|---|
| ADM-001 | Env contract: `.env.dev` / `.env.prod` keys documented in `.env.example`, a `check:env` script + test that keeps `.env.example`, the zod schema and `constants/env.ts` in sync; app version, build id and environment injected at build; visible DEV ribbon (never in prod); `/about` build-info page | `feat/adm-001-env-contract` | — | — | TODO | Acceptance: prod build has no ribbon; a missing key fails the build naming keys only; build id = git sha. |
| ADM-002 | CI per environment: non-secret URLs from GitHub `vars` (dev/prod) instead of placeholders, artifact names carry variant + sha, release-notes artifact from merged PR titles | `feat/adm-002-ci-envs` | ADM-001 | — | TODO | Workflow guarded by `tests/ci.test.ts`; no secrets (only `GITHUB_TOKEN`). |
| ADM-003 | Deploy pipeline: dev deploys on merge to `main`; prod deploys on release tag `vX.Y.Z` with manual approval; smoke test after deploy | `feat/adm-003-deploy` | ADM-002 | — | PENDING | Hosting product and platform domain are open decisions (root `CLAUDE.md` §7) — **user input**. |
| ADM-004 | Hosting security-headers spec (CSP with API + socket origins, `nosniff`, `frame-ancestors none`, HSTS) as a versioned file + test of the header list | `feat/adm-004-headers` | ADM-001 | — | PENDING | Hosting/CDN choice and domain — **user input**. README note exists (REL-02). |

---

## Stage 1B — Layers, shared kernel and clean-code gates
Items 2 and 4: the project is already split into `domain / data / infrastructure / design / presentation / app`. These tasks make the split scale to 30 modules and keep it clean automatically.

| ID | Task | Branch | Needs | Server (SRV) | Status | Notes |
|---|---|---|---|---|---|---|
| ADM-005 | Feature-sliced layers: `domain/<feature>`, `data/<feature>`, `presentation/<feature>` (+ `data/mock/fixtures/<feature>.ts`), import rules in ESLint and `tests/architecture.test.ts` (a feature never imports another feature's presentation), module scaffold checklist, "how to add a module" guide | `feat/adm-005-feature-slices` | — | — | TODO | Moves nothing that works; adds the structure and rules every later task follows (Section 3 recipe). |
| ADM-006 | Shared kernel in `domain/shared`: `Page<T>`, `PageQuery`, `Result`, branded ids, `Money` (JOD decimal string, 3 decimals, never float), `AppTime` (UTC in, Asia/Amman 12-hour out, numerals follow language) and formatters | `feat/adm-006-kernel` | ADM-005 | — | TODO | Mirrors server `utils/money` and `utils/time`; unit tests with ties/DST-free Amman cases. |
| ADM-007 | Quality gates: coverage threshold, `jest-axe` accessibility tests in CI, complexity and max-params lint rules, dependency-cruiser layer graph published as a CI artifact | `feat/adm-007-quality-gates` | ADM-005 | — | TODO | Zero-warning policy stays; gates fail the build, never warn. |
| ADM-008 | Technical docs: `docs/ADMIN_ARCHITECTURE.md` (layers, data flow, MVC mapping, error model, env/variants) and `docs/adr/` with the decisions of Appendix C as they are made | `feat/adm-008-arch-guide` | ADM-005 | — | TODO | Documentation task; reviewed by the Solution Architect role. |

---

## Stage 1C — API layer foundation (data / domain plumbing)
Item 5 starts here: one typed way to call, mock, refresh and stream data so that every module task only adds its own domain, DTOs and pages.

| ID | Task | Branch | Needs | Server (SRV) | Status | Notes |
|---|---|---|---|---|---|---|
| ADM-009 | Endpoint registry and typed requests: `defineEndpoint` (method, path, zod request/response), pagination `meta` helper, `details[]` to form-field errors, trace id surfaced to the UI, request abort on unmount, idempotency-key support for money actions | `feat/adm-009-endpoint-registry` | ADM-006 | — | TODO | Builds on `HttpClient` (timeout, retry, envelope, 401). Endpoints live only in `constants/endpoints`. |
| ADM-010 | Session lifecycle: refresh-token flow (single-flight on 401), 30-minute idle timeout with warning modal, permission-denied/session-expired to login, new-device notice | `feat/adm-010-session` | ADM-009 | SRV-025, SRV-030 | TODO | PRD §4. Tokens stay in memory. |
| ADM-011 | Transport-level mock: fixtures served through the real `HttpClient` so Remote repositories and DTO parsing run in dev; scenario switcher (success / empty / validation / 401 / 403 / 404 / 409 / 500 / timeout / slow, AR+EN); compiled out of prod builds; replaces per-repository mocks | `feat/adm-011-mock-transport` | ADM-009 | — | TODO | `INTEGRATION_WORKFLOW.md` §3 (MSW-style, no new dependency). The existing `MockAuthRepository` is migrated by ADM-027. |
| ADM-012 | Realtime client: `RealtimeClient` interface (domain), Socket.IO implementation (data), fake emitter for mock mode, `useRealtime` hook, query-invalidation bus, reconnect with backoff, the "مباشر" live indicator | `feat/adm-012-realtime` | ADM-009, ADM-011 | SRV-080, SRV-081 | TODO | Admin room events: `booking.updated`, `application.created`, `review.created`, `refund.updated`, `alert.created`, `overview.tick` (BUSINESS_DOMAIN §7). |
| ADM-013 | List state in the URL: filters, sort, page and page size (10 / 25 / 50 / 100) encoded in the query string; `useListController`; 500 ms search debounce constant; back/forward safe | `feat/adm-013-list-state` | ADM-006, ADM-009 | — | TODO | PRD §3 "saved filter in URL (shareable/bookmarkable)". |
| ADM-014 | API-consumption doc generator: `npm run docs:api` writes `docs/API_CONSUMED.md` from the endpoint registry (method, path, DTO, consuming task) and CI fails when it is stale; diffed against Appendix A | `feat/adm-014-api-doc` | ADM-009 | — | TODO | Technical-writer task; same "docs after every task" idea as the server (`WAB-Server/CLAUDE.md` §11). |

---

## Stage 1D — Base components (item 3)
Button, card, input and the other primitives exist (T-024). These tasks complete the kit the 30 pages need. Every component ships with gallery states (default, hover, focus, disabled, loading, error, empty), AR+EN, RTL/LTR, light/dark, keyboard and an accessibility test.

| ID | Task | Branch | Needs | Server (SRV) | Status | Notes |
|---|---|---|---|---|---|---|
| ADM-015 | Typography and primitives: `Text`, `Heading`, `Link`, `Divider`, `Avatar`, `Chip`, `Tooltip`, `KeyValue` list | `feat/adm-015-primitives` | ADM-005 | — | TODO | Replaces ad-hoc `<p>`/`<h1>` classes; tokens only. |
| ADM-016 | Form kit: `Form` controller (react-hook-form + zod resolver), `Field` wrapper, `NumberField` / JOD input, `SearchField`, `MultiSelect` / `Combobox`, `DateField`, `FormActions` (save bar, "last updated by/at") | `feat/adm-016-form-kit` | ADM-015, ADM-006 | — | TODO | Validation identical to the mobile apps (PRD §3, §10). Library choice recorded as an ADR. |
| ADM-017 | Status badge registry from BUSINESS_DOMAIN §2 enums (booking, payment, refund, salon, subscription, review, alert, application, payout) to tone + i18n key; one source, no per-page switch statements | `feat/adm-017-status-badges` | ADM-015, ADM-006 | — | TODO | Test fails if an enum value has no tone or no AR+EN label. |
| ADM-018 | DataTable v2: column visibility, bulk select, row actions, sticky header, server pagination (reuses `Pagination`), density, empty/error rows, export hook | `feat/adm-018-table-v2` | ADM-013, ADM-015, ADM-017 | — | TODO | Extends the existing `DataTable`; keyboard row activation kept. |
| ADM-019 | FilterBar with active-filter chips, `DateRangePicker` (Today, Yesterday, Last 7/30 days, This/Last month, This year, Custom + compare toggle), `ExportMenu` (Excel / PDF / CSV, async-progress toast) | `feat/adm-019-filters` | ADM-016, ADM-018 | SRV-109 | TODO | Presets and compare per PRD §3; Asia/Amman day boundaries via `AppTime`. |
| ADM-020 | Overlay kit: `Drawer`, `ConfirmDialog`, `Menu` / `Popover`, toast queue, destructive and neutral reason-dialog variants (mandatory reason already exists) | `feat/adm-020-overlays` | ADM-015 | — | TODO | Focus trap, Esc, focus return reused from `Modal`. |
| ADM-021 | Page templates: `ListPage` (header, filter bar, table, pagination), `DetailPage` (header, status, actions, tabs, side info panel), `Timeline` (status history and user journey: session groups, highlighted errors/payments, expandable JSON), `JsonViewer` | `feat/adm-021-page-templates` | ADM-018, ADM-019, ADM-020 | — | TODO | Every module page is composed from these; no page builds its own layout. |
| ADM-022 | Charts kit: line, bar, stacked bar, donut, funnel, cohort heatmap, sparkline; every chart has "View data" (table) and export; palette from tokens in light/dark | `feat/adm-022-charts` | ADM-015, ADM-006, ADM-020 | — | TODO | **Decision in Appendix C** (hand-rolled SVG vs library) recorded as an ADR first; bundle budget in `scripts/budget.json` must hold. |
| ADM-023 | Media kit: `ImageUploader` (ar/en variants, presigned upload then confirm), `DocumentViewer` (zoom, rotate, download, page thumbnails; private signed URLs only), `PhonePreview` frame | `feat/adm-023-media-kit` | ADM-016, ADM-020, ADM-009 | SRV-046 | TODO | Uploads follow CLAUDE.md §4.6; client compresses images before upload. |
| ADM-024 | `RichTextEditor` (Arabic / English tabs, sanitized HTML output, RTL aware) and `SchedulePicker` (start–end, end after start) | `feat/adm-024-rich-text` | ADM-016 | — | TODO | Library choice recorded as an ADR (Appendix C); output sanitized on the client and again on the server. |
| ADM-025 | Shell completion: sidebar sub-menus with pending counters, topbar global search with grouped results (customers, salons, bookings, members), alerts bell with realtime unread count, admin menu, breadcrumbs, 403 / 404 / 500 pages | `feat/adm-025-shell-complete` | ADM-012, ADM-020, ADM-016 | SRV-103 | TODO | Global search endpoint is a gap in the server backlog (Appendix D). |
| ADM-026 | Design-system gallery covers every kit and state; visual and accessibility regression checks (screenshots in CI artifacts) | `feat/adm-026-gallery` | ADM-015, ADM-016, ADM-017, ADM-018, ADM-019, ADM-020, ADM-021, ADM-022, ADM-023, ADM-024, ADM-025 | — | TODO | Dev-only route `/design-system` (compiled out of prod). |

---

## Stage 2 — Core domain (ROADMAP ADM-02: A00, A12–A14, A23–A24, A28–A29, profile)
Every task below is a vertical slice through the three layers (Section 3). Endpoint ids (`E-…`) refer to Appendix A.

| ID | Task | Branch | Needs | Server (SRV) | Status | Notes |
|---|---|---|---|---|---|---|
| ADM-027 | Auth module (A00): login, email OTP, resend, refresh, logout, `me`; lockout after 5 failures / 15 min; wrong-code and new-device states; migrates the existing mock to the transport-level mock | `feat/adm-027-auth` | ADM-010, ADM-011, ADM-016 | SRV-024, SRV-025, SRV-030, SRV-031 | TODO | Builds on the login page (T-031). |
| ADM-028 | Admin profile (PRD §4): change password, change email with verification, alert-email recipients | `feat/adm-028-profile` | ADM-027, ADM-016 | SRV-030, SRV-103 | TODO | Not a numbered PRD page; found in PRD §4 (Appendix D gap: endpoints missing on the server backlog). |
| ADM-029 | Customers list (A12): name, phone, gender, city, registered, last active, bookings, status; filters, search, export | `feat/adm-029-customers-list` | ADM-021, ADM-011, ADM-017, ADM-019 | SRV-101, SRV-109 | TODO |  |
| ADM-030 | Customer details (A12) with tabs: profile (edit all fields), bookings, payments & refunds, reviews, devices & installations, notifications sent | `feat/adm-030-customer-details` | ADM-029, ADM-016, ADM-017 | SRV-101, SRV-033 | TODO | Devices/notifications lists are a server gap (Appendix D). |
| ADM-031 | Customer actions (A12): block / unblock (reason), restore account in grace period, force delete (reason), send push to one user | `feat/adm-031-customer-actions` | ADM-030, ADM-020 | SRV-032, SRV-101, SRV-099 | TODO | Notification matrix PRD §9: customer sees "blocked" on next login. |
| ADM-032 | Salons list (A13): name, gender, city/area, state, subscription, rating, bookings (30d), recommended, created; filters by state / gender / city / subscription; export | `feat/adm-032-salons-list` | ADM-021, ADM-011, ADM-017, ADM-019 | SRV-102 | TODO |  |
| ADM-033 | Salon details (A13): overview (state, completeness checklist, subscription summary, KPIs) and profile edit (names, images, description, location, contacts, gender type) | `feat/adm-033-salon-overview` | ADM-032, ADM-016, ADM-023 | SRV-102, SRV-045, SRV-055 | TODO | Admin edit of merchant-owned data needs admin variants of SRV-045 (Appendix D). |
| ADM-034 | Salon details tabs: documents (license preview/download), gallery (view/delete/upload), working hours and closures (edit) | `feat/adm-034-salon-content` | ADM-033, ADM-023 | SRV-046, SRV-047, SRV-048, SRV-049 | TODO | License files are private: never cached by the client. |
| ADM-035 | Salon details tabs: services (price/duration/flags, deactivate), members & staff (edit, deactivate, roles, permissions), policies | `feat/adm-035-salon-team` | ADM-033 | SRV-050, SRV-051, SRV-052, SRV-053, SRV-054 | TODO |  |
| ADM-036 | Salon actions (A13): set Online / Offline (reason), mark / unmark Recommended, handle deletion request, send push to owner/members; salon bookings, reviews, finance and activity tabs link to their modules | `feat/adm-036-salon-actions` | ADM-033, ADM-020 | SRV-055, SRV-066, SRV-099 | TODO |  |
| ADM-037 | Applications queue and review (A14): oldest first, resubmission count; review page with all submitted data, `DocumentViewer`, approve / reject with reason | `feat/adm-037-applications` | ADM-034, ADM-020 | SRV-042, SRV-102, SRV-046 | TODO | Approval starts the 3-month trial on the server (SRV-042). |
| ADM-038 | Catalog services (A23): men / women tabs, create / edit (ar+en name and description, image, active, order); deactivation warns about salons using it | `feat/adm-038-catalog-services` | ADM-021, ADM-011, ADM-017, ADM-016, ADM-023 | SRV-040 | TODO | Admin responses return both languages (server rule). |
| ADM-039 | Catalog requests (A23): salon requests queue; approve (create or map to a catalog service, notify salon) / reject with note | `feat/adm-039-catalog-requests` | ADM-038 | SRV-050, SRV-103 | TODO |  |
| ADM-040 | Banners (A24): ar/en images, action (none / salon / external URL), gender target, schedule, order, active; phone preview | `feat/adm-040-banners` | ADM-021, ADM-011, ADM-017, ADM-016, ADM-023, ADM-024 | SRV-039 | TODO |  |
| ADM-041 | Legal pages (A24): Privacy, Terms, About — rich text ar/en, separately for customer and merchant apps | `feat/adm-041-legal-pages` | ADM-024, ADM-021, ADM-011 | SRV-038 | TODO |  |
| ADM-042 | FAQ (A24): questions and answers ar/en, per app, ordering | `feat/adm-042-faq` | ADM-016, ADM-021, ADM-011 | SRV-038 | TODO |  |
| ADM-043 | Contact info (A24): phone, WhatsApp, email per app | `feat/adm-043-contact-info` | ADM-016, ADM-021, ADM-011 | SRV-038 | TODO |  |
| ADM-044 | Settings (A28): discovery radius and booking rules (max days ahead, slot interval, companions, auto-cancel delay, pending alert, reminders) | `feat/adm-044-settings-booking` | ADM-016, ADM-021, ADM-011 | SRV-017, SRV-103 | TODO | The settings editor shell is built once here; later sections only add a section. |
| ADM-045 | Settings (A28): OTP section (code length, resend wait, request limit, wrong attempts, block duration) | `feat/adm-045-settings-otp` | ADM-044 | SRV-017 | TODO |  |
| ADM-046 | Settings (A28): locations — countries (name, flag, dial code, phone regex, active), cities and areas (ar/en, active) | `feat/adm-046-settings-locations` | ADM-044, ADM-018 | SRV-038 | TODO |  |
| ADM-047 | Settings (A28): app versions per app and platform (latest, minimum, optional update, store URLs) and maintenance mode per app with ar/en message | `feat/adm-047-settings-versions` | ADM-044 | SRV-038 | TODO |  |
| ADM-048 | Settings (A28): alerts recipients and thresholds, payout frequency note, account-deletion grace period | `feat/adm-048-settings-alerts` | ADM-044 | SRV-017, SRV-106 | TODO |  |
| ADM-049 | Audit log (A29): immutable table (time, action, entity link, reason, IP, device) with filters, export and a before/after diff drawer | `feat/adm-049-audit-log` | ADM-021, ADM-011, ADM-017, ADM-019, ADM-020 | SRV-020, SRV-103 | TODO |  |

**Slices (domain / data / presentation) and endpoints**

- **ADM-027** — *Domain:* `AdminProfile`, `Session`, `LoginChallenge`; `AuthRepository` (+ `resendOtp`); use-cases `signIn`, `completeTwoFactor`. *Data:* `auth.dto` (zod), mapper, `RemoteAuthRepository` on E-AUTH-*, fixtures for locked / wrong code / expired / new device. *Presentation:* `useLoginController` (exists) extended with lockout countdown and new-device screen; session-expired modal. *Endpoints:* E-AUTH-1, E-AUTH-2, E-AUTH-3, E-AUTH-4, E-AUTH-5, E-AUTH-6.
- **ADM-028** — *Domain:* `ChangePassword`, `ChangeEmail` commands; password-strength rule as a pure function. *Data:* DTOs + `RemoteProfileRepository` on E-PROF-*. *Presentation:* Profile page from the admin menu; reason-free but re-auth confirm; success toast. *Endpoints:* E-PROF-1, E-PROF-2, E-PROF-3.
- **ADM-029** — *Domain:* `CustomerSummary`, `CustomerStatus` enum, `CustomerFilters`. *Data:* `customers.dto`, mapper, `RemoteCustomersRepository.list`, fixtures (empty, 25-row, search miss). *Presentation:* `CustomersPage` via `ListPage`; URL filters; row click opens details; export menu. *Endpoints:* E-CUS-1.
- **ADM-030** — *Domain:* `CustomerProfile`, `Installation`, `UpdateCustomer` command. *Data:* DTOs, `get` / `update` / sub-list endpoints, fixtures per tab. *Presentation:* `CustomerDetailsPage` (`DetailPage` + lazy tabs); Journey tab embeds A11 (ADM-077). *Endpoints:* E-CUS-2, E-CUS-3, E-CUS-4, E-CUS-5, E-CUS-6, E-CUS-7.
- **ADM-031** — *Domain:* Use-cases `blockCustomer`, `restoreCustomer`, `forceDeleteCustomer` (reason required, pure validation). *Data:* Command endpoints with `Idempotency-Key`; 409 / 422 fixtures. *Presentation:* Action menu + `ReasonDialog`; optimistic status badge; toast; audit hint. *Endpoints:* E-CUS-8, E-CUS-9, E-CUS-10, E-CUS-11.
- **ADM-032** — *Domain:* `SalonSummary`, `SalonState` enum, `SalonFilters`. *Data:* DTOs, `RemoteSalonsRepository.list`, fixtures. *Presentation:* `SalonsPage`, state badges from the registry. *Endpoints:* E-SAL-1.
- **ADM-033** — *Domain:* `SalonDetails`, `Completeness`, `UpdateSalonProfile`; gender-change guard as a use-case. *Data:* `get` / `update`, image upload through `ImageUploader`. *Presentation:* `SalonDetailsPage` shell + Overview and Profile tabs; "last updated by/at". *Endpoints:* E-SAL-2, E-SAL-3.
- **ADM-034** — *Domain:* `LicenseDocument`, `GalleryItem`, `WorkingHours`, `Closure`; hours validation (open before close, same day). *Data:* Signed-URL fetch (short-lived), gallery + hours endpoints. *Presentation:* `DocumentViewer` tab, gallery grid with delete confirm, hours editor with conflict warning (`SCHEDULE_CONFLICT`). *Endpoints:* E-SAL-4, E-SAL-5, E-SAL-6, E-SAL-7.
- **ADM-035** — *Domain:* `SalonService`, `Member`, `Permission` enum (15 keys), `Policy`; permission-set rules. *Data:* Endpoints for services, members, staff, policies; 409 `LAST_OWNER` / `OWNER_REQUIRED` fixtures. *Presentation:* Tabs with editable tables; permission matrix editor; deactivation confirm with reason. *Endpoints:* E-SAL-8, E-SAL-9, E-SAL-10, E-SAL-11.
- **ADM-036** — *Domain:* `setSalonOffline` / `setSalonOnline` use-cases (reason, state precondition). *Data:* Command endpoints, fixtures for each state transition. *Presentation:* Action bar + dialogs; Offline warning "hides the salon and blocks new bookings"; owner notified (PRD §9). *Endpoints:* E-SAL-12, E-SAL-13, E-SAL-14.
- **ADM-037** — *Domain:* `SalonApplication`; `approveApplication` / `rejectApplication` use-cases. *Data:* Queue + decision endpoints; fixtures (empty queue, resubmitted). *Presentation:* `ApplicationsPage`, `ApplicationReviewPage`; realtime new row; counter in the sidebar. *Endpoints:* E-APP-1, E-APP-2, E-APP-3.
- **ADM-038** — *Domain:* `CatalogService` (bilingual), reorder use-case. *Data:* CRUD endpoints, image upload, usage-count lookup. *Presentation:* Table + edit modal/drawer; drag handle or order field. *Endpoints:* E-CAT-1, E-CAT-2, E-CAT-3.
- **ADM-039** — *Domain:* `CatalogRequest`, `CatalogRequestStatus`. *Data:* Queue + decision endpoints. *Presentation:* Queue page, map-or-create dialog. *Endpoints:* E-CAT-4, E-CAT-5.
- **ADM-040** — *Domain:* `Banner`, `BannerAction`; schedule validation (end after start). *Data:* CRUD + reorder; image upload. *Presentation:* Grid + editor with `PhonePreview` and `SchedulePicker`. *Endpoints:* E-CON-1, E-CON-2.
- **ADM-041** — *Domain:* `LegalPage` (per app, per language). *Data:* get / update endpoints. *Presentation:* Editor with tabs per app and language; sanitized preview. *Endpoints:* E-CON-3.
- **ADM-042** — *Domain:* `FaqItem`; reorder use-case. *Data:* CRUD + reorder. *Presentation:* Sortable list with inline edit. *Endpoints:* E-CON-4.
- **ADM-043** — *Domain:* `ContactInfo`; phone/email validation functions. *Data:* get / update. *Presentation:* Simple form per app. *Endpoints:* E-CON-5.
- **ADM-044** — *Domain:* `SettingKey` registry mirrored from BUSINESS_DOMAIN §10; per-key validation (PRD §10). *Data:* `settings` get / patch (audited, reason). *Presentation:* Sectioned settings page; save bar; unsaved-changes guard. *Endpoints:* E-SET-1, E-SET-2.
- **ADM-045** — *Domain:* OTP setting rules (length must match Firebase: warning). *Data:* Reuses settings endpoints. *Presentation:* Section component + validation messages. *Endpoints:* E-SET-1, E-SET-2.
- **ADM-046** — *Domain:* `Country`, `City`, `Area`; regex-validity check. *Data:* CRUD for the three collections. *Presentation:* Nested tables with inline edit and regex tester. *Endpoints:* E-LOC-1, E-LOC-2, E-LOC-3.
- **ADM-047** — *Domain:* `AppVersionPolicy`, `MaintenanceMode`; semver compare function. *Data:* get / update per app+platform. *Presentation:* Section with force-update warning and maintenance confirm. *Endpoints:* E-VER-1, E-VER-2.
- **ADM-048** — *Domain:* Alert threshold rules (defaults from PRD A27). *Data:* Reuses settings endpoints. *Presentation:* Section with per-alert threshold inputs. *Endpoints:* E-SET-1, E-SET-2.
- **ADM-049** — *Domain:* `AuditEntry`; diff function (pure) for before/after. *Data:* `list` endpoint with filters. *Presentation:* `AuditLogPage` + `DiffDrawer`; entity links via a route resolver. *Endpoints:* E-AUD-1.

---

## Stage 3 — Booking engine (ROADMAP ADM-03: A15, A22)
Admin actions on bookings always require a reason and notify customer and salon (PRD §9).

| ID | Task | Branch | Needs | Server (SRV) | Status | Notes |
|---|---|---|---|---|---|---|
| ADM-050 | Bookings list (A15): reference, customer, salon, appointment, persons, bride, status, payment, refund, total, created; filters (status, payment, refund, created / appointment dates, salon, gender, city, bride, method); export; realtime new row | `feat/adm-050-bookings-list` | ADM-021, ADM-011, ADM-017, ADM-019, ADM-012 | SRV-077, SRV-109 | TODO |  |
| ADM-051 | Booking details (A15): everything from the mobile details plus full status history (actor, reason), related transactions and refunds, notifications sent, related events | `feat/adm-051-booking-details` | ADM-050, ADM-017 | SRV-077 | TODO |  |
| ADM-052 | Booking actions (A15): approve, reject, cancel (as salon / by customer policy / admin cancel with full refund), mark completed or paid, mark no-show; reason mandatory | `feat/adm-052-booking-actions` | ADM-051, ADM-020 | SRV-078 | TODO |  |
| ADM-053 | Booking actions (A15): revert status (irregular-transition warning) and reassign staff (eligible list) | `feat/adm-053-booking-revert-reassign` | ADM-052 | SRV-078, SRV-076 | TODO |  |
| ADM-054 | Booking action (A15): issue refund, full or partial (amount in JOD string, <= refundable, reason) | `feat/adm-054-booking-refund` | ADM-052, ADM-006 | SRV-086, SRV-078 | TODO |  |
| ADM-055 | Reviews moderation (A22): pending queue (salon or staff), author, target, rating, comment, author history; approve / reject (optional reason); bulk actions | `feat/adm-055-reviews-queue` | ADM-021, ADM-011, ADM-017, ADM-019, ADM-020 | SRV-064, SRV-103 | TODO |  |
| ADM-056 | Reviews (A22): published list with filters (salon / staff / rating) and remove with reason | `feat/adm-056-reviews-published` | ADM-055 | SRV-064 | TODO |  |

**Slices (domain / data / presentation) and endpoints**

- **ADM-050** — *Domain:* `BookingSummary`; `BookingStatus`, `PaymentStatus`, `RefundStatus` enums. *Data:* list endpoint with all filters; fixtures for each status. *Presentation:* `BookingsPage`; `useRealtime` prepends a highlighted row. *Endpoints:* E-BKG-1.
- **ADM-051** — *Domain:* `BookingDetails`, `StatusHistoryEntry`, `ActorType`. *Data:* get endpoint (+ sub-resources). *Presentation:* `BookingDetailsPage` with `Timeline` of status history and side panel. *Endpoints:* E-BKG-2.
- **ADM-052** — *Domain:* State-machine guard mirrored from BUSINESS_DOMAIN §5.7 (`allowedAdminTransitions`) for UI enablement only; the server stays the authority. *Data:* Command endpoints; 422 `INVALID_TRANSITION`, `TOO_EARLY_TO_COMPLETE`, `ALREADY_HANDLED` fixtures. *Presentation:* One `BookingActionDialog` family; disabled reasons shown, not hidden. *Endpoints:* E-BKG-3.
- **ADM-053** — *Domain:* `eligibleStaff` query; irregular-transition flag. *Data:* eligible-staff endpoint + reassign command; 409 `SLOT_TAKEN` / `STAFF_NOT_ELIGIBLE`. *Presentation:* Warning dialog; staff picker with availability. *Endpoints:* E-BKG-4, E-BKG-5.
- **ADM-054** — *Domain:* `RefundRequest`; amount validation with `Money`. *Data:* refund command with idempotency key. *Presentation:* Refund dialog with remaining-amount hint; result badge. *Endpoints:* E-BKG-6.
- **ADM-055** — *Domain:* `Review`, `ReviewTarget`, `ReviewStatus`. *Data:* queue + decision + bulk endpoints. *Presentation:* `ReviewsPage` queue tab; bulk bar; realtime `review.created`. *Endpoints:* E-REV-1, E-REV-2, E-REV-3.
- **ADM-056** — *Domain:* Remove use-case (reason). *Data:* published list + remove endpoint. *Presentation:* Published tab + `ReasonDialog`. *Endpoints:* E-REV-4, E-REV-5.

---

## Stage 4 — Money and messaging (ROADMAP ADM-04: A16–A21, A25)
All amounts are JOD decimal strings with 3 decimals, formatted only through `Money` (ADM kernel task).

| ID | Task | Branch | Needs | Server (SRV) | Status | Notes |
|---|---|---|---|---|---|---|
| ADM-057 | Transactions (A16 / A08 table): every payment attempt and capture with filters and export; details drawer with gateway request / response log, booking link, fees, status timeline | `feat/adm-057-transactions` | ADM-021, ADM-011, ADM-017, ADM-019, ADM-020, ADM-006 | SRV-104, SRV-071 | TODO |  |
| ADM-058 | Refunds (A17): list by source and status, ages, overdue highlight; retry a failed refund, mark as refunded manually (reference required) | `feat/adm-058-refunds` | ADM-021, ADM-011, ADM-017, ADM-019, ADM-012 | SRV-086, SRV-104 | TODO | Issuing a refund from a booking is ADM booking-refund. |
| ADM-059 | Payouts (A18): per-salon balances (collected online, gateway fees, refunds, previous payouts, net due), payout history, filters, export | `feat/adm-059-payouts` | ADM-021, ADM-011, ADM-017, ADM-019, ADM-006 | SRV-088, SRV-104 | TODO |  |
| ADM-060 | Payouts (A18): create-payout flow (select salons and period, computed breakdown, record transfer date / amount / bank reference / note, mark transferred) and read-only bank details (editable with reason) | `feat/adm-060-payout-create` | ADM-059, ADM-016 | SRV-088, SRV-090 | TODO | Bank details are encrypted server-side (SRV-090): show masked, reveal on explicit action. |
| ADM-061 | Subscriptions (A19): list (status, trial end, period end, days remaining, last payment); record payment (amount, date, period from–to, method, reference, note); ending <= 7 days and expired views; set Offline / Online | `feat/adm-061-subscriptions` | ADM-021, ADM-011, ADM-017, ADM-019, ADM-016 | SRV-089, SRV-104 | TODO |  |
| ADM-062 | Recommended salons (A20): per-gender lists with period, order (drag to reorder), amount paid, status (scheduled / active / ended); add / edit / remove | `feat/adm-062-recommended` | ADM-021, ADM-011, ADM-017, ADM-016, ADM-024 | SRV-066, SRV-104 | TODO | Drag-and-drop library is an ADR (Appendix C). |
| ADM-063 | Reconciliation (A21): period summary (collected, gateway fees, refunds, payouts transferred, balance owed) and mismatch table | `feat/adm-063-reconciliation` | ADM-059, ADM-022 | SRV-104 | TODO |  |
| ADM-064 | Push composer (A25): title and body ar/en, app, audience builder (all, guests, registered, gender, city, salon members, specific users, saved segment) with estimated size, link target, send now or schedule, phone preview | `feat/adm-064-push-composer` | ADM-021, ADM-011, ADM-017, ADM-016, ADM-023 | SRV-099, SRV-093 | TODO |  |
| ADM-065 | Push history (A25): campaigns table with audience size, sent, delivered, opened, failures | `feat/adm-065-push-history` | ADM-064, ADM-019 | SRV-099 | TODO |  |

**Slices (domain / data / presentation) and endpoints**

- **ADM-057** — *Domain:* `Transaction`, `TransactionType`, `TransactionStatus`. *Data:* list + get endpoints. *Presentation:* `TransactionsPage` + `TransactionDrawer` with `JsonViewer`. *Endpoints:* E-FIN-1, E-FIN-2.
- **ADM-058** — *Domain:* `Refund`, `RefundSource`; overdue rule (threshold from settings). *Data:* list + retry + manual-complete endpoints. *Presentation:* `RefundsPage`; realtime `refund.updated`. *Endpoints:* E-FIN-3, E-FIN-4, E-FIN-5.
- **ADM-059** — *Domain:* `SalonBalance`, `Payout`, `PayoutStatus`. *Data:* balances + history endpoints. *Presentation:* `PayoutsPage` balances and history tabs. *Endpoints:* E-FIN-6, E-FIN-7.
- **ADM-060** — *Domain:* Amount rule: > 0 and <= net due, warn when different (PRD §10). *Data:* compute + create + transfer endpoints; bank-details read / update. *Presentation:* Stepper flow; bank details panel masked by default. *Endpoints:* E-FIN-8, E-FIN-9, E-FIN-10.
- **ADM-061** — *Domain:* `Subscription`, `SubscriptionStatus`; period-extension validation. *Data:* list + record-payment endpoints. *Presentation:* `SubscriptionsPage` with saved views and record dialog. *Endpoints:* E-FIN-11, E-FIN-12.
- **ADM-062** — *Domain:* `Placement`; period validation. *Data:* CRUD + reorder endpoints. *Presentation:* Per-gender tabs, sortable list, add/edit modal. *Endpoints:* E-FIN-13, E-FIN-14.
- **ADM-063** — *Domain:* `ReconciliationSummary`, `Mismatch`. *Data:* summary endpoint. *Presentation:* Summary cards + mismatch table. *Endpoints:* E-FIN-15.
- **ADM-064** — *Domain:* `Campaign`, `Audience` (discriminated union); audience-validity rules. *Data:* estimate + create endpoints. *Presentation:* Composer with `PhonePreview`; `SchedulePicker`; confirm dialog. *Endpoints:* E-PSH-1, E-PSH-2, E-PSH-3.
- **ADM-065** — *Domain:* `CampaignStats`. *Data:* history endpoint. *Presentation:* Table + details drawer. *Endpoints:* E-PSH-4.

---

## Stage 5 — Operations and insights (ROADMAP ADM-05: A01–A11, A26–A27)
Analytics data comes from MongoDB server events now and from BigQuery later (SRV-105 / SRV-110). Funnels, cohorts and per-user journeys cannot be real until SRV-110, so their screens are built and tested on fixtures.

| ID | Task | Branch | Needs | Server (SRV) | Status | Notes |
|---|---|---|---|---|---|---|
| ADM-066 | Live Overview (A01): KPI cards (active users, installs, registrations, bookings by status, pending requests with oldest wait, bride bookings, payments, refunds, errors, salons), live activity feed, bookings per hour today vs last week; auto-refresh + realtime | `feat/adm-066-live-overview` | ADM-022, ADM-012, ADM-021, ADM-011 | SRV-105, SRV-081 | TODO |  |
| ADM-067 | Analytics filters (shared): date range with comparison, app, platform, app version, user type, gender scope, city, salon — one controller reused by every analytics page | `feat/adm-067-analytics-filters` | ADM-019, ADM-013 | SRV-105 | TODO |  |
| ADM-068 | Analytics — Traffic & Users (A02): installs, DAU / WAU / MAU, sessions, average duration, guest to registered conversion; breakdowns; table export | `feat/adm-068-traffic` | ADM-067, ADM-022 | SRV-105 | TODO |  |
| ADM-069 | Analytics — Screens & Events (A03): screens ranking; event explorer (counts over time, unique users, breakdown by param, raw paginated events with JSON drawer, user link to Journey) | `feat/adm-069-screens-events` | ADM-067, ADM-022, ADM-020 | SRV-105, SRV-110 | TODO | Raw event store depth depends on SRV-110. |
| ADM-070 | Analytics — Funnels (A04): five predefined funnels with conversion, drop-off and median time; segment filters; drop-off drill-down to users; custom funnel builder (should) | `feat/adm-070-funnels` | ADM-067, ADM-022, ADM-020 | SRV-110 | TODO | Real data: SRV-110 (PENDING). Built on fixtures. |
| ADM-071 | Analytics — Search & Discovery (A05): top queries, zero-result queries, filter usage, banner CTR, recommended clicks, location-permission rates, salon views / calls / WhatsApp / maps, shares, favorites | `feat/adm-071-search-discovery` | ADM-067, ADM-022 | SRV-105, SRV-110 | TODO |  |
| ADM-072 | Analytics — Retention (A06): cohort heatmap (customers / merchants), repeat booking rate, bookings-per-customer histogram | `feat/adm-072-retention` | ADM-067, ADM-022 | SRV-110 | TODO | Real data: SRV-110 (PENDING). |
| ADM-073 | Analytics — Bookings (A07): status over time, by gender / city / salon, bride bookings, persons, response time, approval and rejection reasons, cancellations vs window, auto-cancels, no-shows, payment-method mix, lead time | `feat/adm-073-bookings-analytics` | ADM-067, ADM-022 | SRV-105 | TODO |  |
| ADM-074 | Analytics — Payments (A08): KPIs (success rate, failures by reason / platform / version, collected, fees), attempts table linking to Transactions, refund KPIs | `feat/adm-074-payments-analytics` | ADM-067, ADM-022, ADM-057 | SRV-105 | TODO |  |
| ADM-075 | Analytics — Errors & Issues (A09): API errors by endpoint / status / p95 latency with failed-request drawer; client errors; crashes (link-out to Firebase); OTP; payment and refund failures; push failures | `feat/adm-075-errors-analytics` | ADM-067, ADM-022, ADM-020 | SRV-105, SRV-115 | TODO | Crash data and latency metrics depend on SRV-110 / SRV-115 (PENDING). |
| ADM-076 | Analytics — Merchants (A10): salons by state, approval time, completeness distribution, per-salon performance, member activity, subscriptions summary | `feat/adm-076-merchants-analytics` | ADM-067, ADM-022 | SRV-105 | TODO |  |
| ADM-077 | User Journey (A11): search by phone, name, user / member / installation id or booking reference; identity header; timeline grouped by session with Guest marker, highlighted errors and payments, JSON drawer, filters, export | `feat/adm-077-journey` | ADM-021, ADM-067, ADM-022 | SRV-110, SRV-101 | TODO | Real data: SRV-110 (PENDING); guest history link comes from SRV-033. |
| ADM-078 | Reports (A26): daily / weekly / monthly cards, on-screen view with charts, period selector, Excel / PDF export at any time with async progress; scheduled email (could) | `feat/adm-078-reports` | ADM-022, ADM-019 | SRV-108, SRV-109 | TODO |  |
| ADM-079 | Alerts (A27): list (severity, type, entity link, time, status New / Acknowledged), acknowledge, realtime; bell count | `feat/adm-079-alerts` | ADM-021, ADM-011, ADM-017, ADM-012 | SRV-106, SRV-107 | TODO | Email preview frame from the Design Script is documentation only. |

**Slices (domain / data / presentation) and endpoints**

- **ADM-066** — *Domain:* `OverviewSnapshot`, `ActivityItem`. *Data:* overview + feed endpoints; `overview.tick` merges into the cache. *Presentation:* `LiveOverviewPage`; error card state per card; quiet-day zeros; dark + English frames. *Endpoints:* E-ANA-1, E-ANA-2.
- **ADM-067** — *Domain:* `AnalyticsFilters` value object. *Data:* shared query serialization. *Presentation:* `AnalyticsFilterBar`; filters live in the URL. *Endpoints:* —.
- **ADM-068** — *Domain:* `TrafficStats`. *Data:* traffic endpoint. *Presentation:* Page with KPI cards, charts and breakdown tables. *Endpoints:* E-ANA-3.
- **ADM-069** — *Domain:* `ScreenStat`, `EventRecord`. *Data:* screens + events endpoints. *Presentation:* Ranking table, explorer, JSON drawer. *Endpoints:* E-ANA-4, E-ANA-5.
- **ADM-070** — *Domain:* `Funnel`, `FunnelStep`. *Data:* funnel + drop-off users endpoints. *Presentation:* Funnel chart, step table, drawer, builder form. *Endpoints:* E-ANA-6, E-ANA-7.
- **ADM-071** — *Domain:* `SearchStats`. *Data:* search endpoint. *Presentation:* Several tables and charts on one page. *Endpoints:* E-ANA-8.
- **ADM-072** — *Domain:* `Cohort`. *Data:* retention endpoint. *Presentation:* Heatmap + histogram. *Endpoints:* E-ANA-9.
- **ADM-073** — *Domain:* `BookingStats`. *Data:* bookings-analytics endpoint. *Presentation:* Chart grid. *Endpoints:* E-ANA-10.
- **ADM-074** — *Domain:* `PaymentStats`. *Data:* payments-analytics endpoint. *Presentation:* KPI + chart + attempts table. *Endpoints:* E-ANA-11.
- **ADM-075** — *Domain:* `ErrorStats`. *Data:* errors endpoint. *Presentation:* Pages with drawers and link-outs. *Endpoints:* E-ANA-12.
- **ADM-076** — *Domain:* `MerchantStats`. *Data:* merchants endpoint. *Presentation:* Tables and charts. *Endpoints:* E-ANA-13.
- **ADM-077** — *Domain:* `Journey`, `JourneyEvent`, identity merge display rules. *Data:* search + journey endpoints. *Presentation:* `JourneyPage` using `Timeline`; embedded tab in customer details. *Endpoints:* E-ANA-14, E-ANA-15.
- **ADM-078** — *Domain:* `ReportKind`, `ExportJob`. *Data:* report + export-job endpoints (poll or socket). *Presentation:* Report view + export progress toast. *Endpoints:* E-RPT-1, E-RPT-2.
- **ADM-079** — *Domain:* `Alert`, alert kinds from the PRD table. *Data:* list + acknowledge endpoints. *Presentation:* `AlertsPage`; bell badge shares the cache. *Endpoints:* E-ALR-1, E-ALR-2.

---

## Stage 6 — Integration, quality and release
ROADMAP INT-05, REL-01 … REL-03 for the admin panel.

| ID | Task | Branch | Needs | Server (SRV) | Status | Notes |
|---|---|---|---|---|---|---|
| ADM-080 | Fixture contract tests: every fixture of the mock transport is parsed by the real DTO schemas in CI; adding an endpoint without a fixture fails the build | `feat/adm-080-fixture-tests` | ADM-009, ADM-011 | — | TODO | Works before `contracts/` exists. |
| ADM-081 | Contract drift check: DTO schemas compared with `contracts/openapi/admin.v1.yaml` in CI | `feat/adm-081-contract-drift` | ADM-080 | SRV-111 | PENDING | `contracts/` (INT-01) does not exist yet — separate track. |
| ADM-082 | Switch to `remote` on dev (INT-05): per-module gap list, fixes, socket events verified against the real server | `feat/adm-082-remote-dev` | ADM-080, ADM-079, ADM-066, ADM-050 | SRV-101, SRV-102, SRV-103, SRV-104, SRV-105 | PENDING | Needs the dev API with the admin endpoints deployed (server Stage L merged + SRV-011 hosting). |
| ADM-083 | PRD §3 / Design Script §3 flows as Playwright e2e on the mock transport (11 flows: login to overview, alert to journey, application approval, pending bride booking cancel with refund, funnel to journey, refund retry, payout creation, subscription expiry to Offline, bulk review approval, push scheduling, monthly report export) | `feat/adm-083-flows-e2e` | ADM-037, ADM-054, ADM-058, ADM-060, ADM-061, ADM-055, ADM-064, ADM-078, ADM-079, ADM-077, ADM-070 | — | TODO | Chromium locally, Chromium + WebKit in CI. |
| ADM-084 | RTL, accessibility and performance pass over all pages: keyboard paths, contrast in both themes, bundle budget per route chunk, 2-second load on a 30-day range with mock latency | `feat/adm-084-qa-pass` | ADM-083 | — | TODO | REL-01; budgets recorded in `scripts/budget.json`. |
| ADM-085 | Error tracking and source-map upload for release builds | `feat/adm-085-error-tracking` | ADM-003 | SRV-115 | PENDING | Tool selection (open item #4) and DSN — **user input**. |
| ADM-086 | Prod go-live checklist for the admin panel (env values, domain, CSP, backups of config, rollback, smoke tests) | `feat/adm-086-go-live` | ADM-084, ADM-003, ADM-004, ADM-082 | — | PENDING | Depends on hosting, domain and the pending tasks above (REL-03). |

---

## 5. Traceability matrix (nothing in the PRD or BRD is left without a task)

### 5.1 PRD pages
| PRD page | Name | Tasks |
|---|---|---|
| A00 | Login & 2FA | ADM-027 |
| A01 | Live Overview | ADM-066 |
| A02 | Traffic & Users | ADM-068 |
| A03 | Screens & Events | ADM-069 |
| A04 | Funnels | ADM-070 |
| A05 | Search & Discovery | ADM-071 |
| A06 | Retention | ADM-072 |
| A07 | Bookings analytics | ADM-073 |
| A08 | Payments analytics | ADM-057, ADM-074 |
| A09 | Errors & Issues | ADM-075 |
| A10 | Merchants analytics | ADM-076 |
| A11 | User Journey | ADM-077 |
| A12 | Customers | ADM-029, ADM-030, ADM-031 |
| A13 | Salons | ADM-032, ADM-033, ADM-034, ADM-035, ADM-036 |
| A14 | Applications queue | ADM-037 |
| A15 | Bookings | ADM-050, ADM-051, ADM-052, ADM-053, ADM-054 |
| A16 | Transactions | ADM-057 |
| A17 | Refunds | ADM-058 |
| A18 | Payouts | ADM-059, ADM-060 |
| A19 | Subscriptions | ADM-061 |
| A20 | Recommended salons | ADM-062 |
| A21 | Reconciliation | ADM-063 |
| A22 | Reviews moderation | ADM-055, ADM-056 |
| A23 | Catalog | ADM-038, ADM-039 |
| A24 | Content | ADM-040, ADM-041, ADM-042, ADM-043 |
| A25 | Push notifications | ADM-064, ADM-065 |
| A26 | Reports | ADM-078 |
| A27 | Alerts | ADM-079 |
| A28 | Settings | ADM-044, ADM-045, ADM-046, ADM-047, ADM-048 |
| A29 | Audit log | ADM-049 |

### 5.2 PRD global rules and other sections
| Section | Rule | Tasks |
|---|---|---|
| PRD §2 | Env, build, stack | ADM-001, ADM-002, ADM-003, ADM-004, ADM-005 |
| PRD §3 | Languages RTL/LTR, Asia/Amman 12-hour, shell, tables, URL filters, date range, charts, states, reasons, deep links, realtime | ADM-006, ADM-013, ADM-018, ADM-019, ADM-020, ADM-022, ADM-025, ADM-012, ADM-021 |
| PRD §4 | Login, 2FA, session timeout, lockout, profile | ADM-027, ADM-010, ADM-028 |
| PRD §5 | Analytics data foundation (fields, identity merge) | ADM-069, ADM-077, ADM-067 |
| PRD §6 | Navigation (15 modules) | ADM-025 |
| PRD §9 | Admin action → notification matrix (shown in dialogs) | ADM-031, ADM-036, ADM-052, ADM-037, ADM-039 |
| PRD §10 | Validation rules (banner / placement periods, payout amount, subscription dates) | ADM-016, ADM-040, ADM-062, ADM-060, ADM-061 |
| PRD §11 | Performance (pre-aggregated data, 2 s loads) | ADM-084, ADM-018 |
| Design Script §1 | Components (tables, filters, KPI, charts, badges, timeline, viewer, editors) | ADM-015, ADM-016, ADM-017, ADM-018, ADM-019, ADM-020, ADM-021, ADM-022, ADM-023, ADM-024 |
| Design Script §3 | 11 flows to prototype | ADM-083 |
| Design Script §4 | Completion checklist (states, reasons, export, realtime, RTL/dark) | ADM-026, ADM-084 |

### 5.3 BRD requirements
| ID | Requirement | Tasks |
|---|---|---|
| ABR-01 | Single admin, all permissions | ADM-027, ADM-028 |
| ABR-02 | Secured login + second factor | ADM-010, ADM-027 |
| ABR-03 | Audit log + reason on every action | ADM-020, ADM-031, ADM-036, ADM-049, ADM-052 |
| ABR-10 | Live overview | ADM-066 |
| ABR-11 | All events stored and queryable | ADM-069 |
| ABR-12 | Any user's journey | ADM-077 |
| ABR-13 | Guest history linked | ADM-077 |
| ABR-14 | Funnels | ADM-070 |
| ABR-15 | Every payment attempt | ADM-057, ADM-074 |
| ABR-16 | Problems (crashes, errors, OTP…) | ADM-075 |
| ABR-17 | Search analytics | ADM-071 |
| ABR-18 | Booking analytics | ADM-073 |
| ABR-19 | Merchant analytics | ADM-076 |
| ABR-20 | Retention | ADM-072 |
| ABR-21 | Filters on all analytics | ADM-019, ADM-067 |
| ABR-30 | Customers: view / search / edit | ADM-029, ADM-030 |
| ABR-31 | Block / unblock | ADM-031 |
| ABR-32 | Account deletions | ADM-031 |
| ABR-40 | Applications | ADM-037 |
| ABR-41 | Edit any salon data | ADM-032, ADM-033, ADM-034, ADM-035 |
| ABR-42 | Online / Offline | ADM-036 |
| ABR-43 | Recommended placements | ADM-036, ADM-062 |
| ABR-44 | Salon deletion requests | ADM-036 |
| ABR-50 | View every booking | ADM-050, ADM-051 |
| ABR-51 | Intervene on any booking | ADM-052, ADM-053, ADM-054 |
| ABR-60 | Transactions | ADM-057 |
| ABR-61 | Refunds | ADM-054, ADM-058 |
| ABR-62 | Payouts | ADM-059, ADM-060 |
| ABR-63 | Subscriptions | ADM-061 |
| ABR-64 | Reconciliation | ADM-063 |
| ABR-70 | Review moderation | ADM-055, ADM-056 |
| ABR-71 | Services catalog | ADM-038, ADM-039 |
| ABR-72 | Content | ADM-040, ADM-041, ADM-042, ADM-043 |
| ABR-73 | Push campaigns | ADM-064, ADM-065 |
| ABR-80 | Settings | ADM-044, ADM-045, ADM-046, ADM-047, ADM-048 |
| ABR-90 | Email alerts + alerts page | ADM-048, ADM-079 |
| ABR-91 | Daily/weekly/monthly reports | ADM-078 |
| ABR-92 | Export any table | ADM-018, ADM-019 |

---

## Appendix A — Proposed admin API contract (input for the server team and for `contracts/` INT-01)

> **Status: proposal.** Derived from the PRD actions, `BUSINESS_DOMAIN.md` and the server Stage L. It must be reconciled with `SRV-101…109` and then moved into `contracts/openapi/admin.v1.yaml`; a change here is a small PR touching this file only. Admin tasks build on it today through the mock transport.

**Conventions (from `INTEGRATION_WORKFLOW.md` §2 and `WAB-Server/CLAUDE.md` §6):** base path `/admin/v1`, bearer token of the *admin* scope only; JSON camelCase; ISO-8601 UTC timestamps (display in Asia/Amman, 12-hour); money as decimal string JOD with 3 decimals; ids as strings; `Accept-Language: ar|en` (admin responses carry **both** languages for stored `{ar, en}` content); lists take `page`, `pageSize` (default 25; 10/25/50/100) and return `meta { page, pageSize, total }`; every write takes a mandatory `reason` (min length from `constants/ui`) and money/state commands take an `Idempotency-Key` header; errors use the envelope `{ success:false, message, error:{ code, details?, traceId } }` with the codes of `BUSINESS_DOMAIN.md` §11 (e.g. `INVALID_TRANSITION`, `ALREADY_HANDLED`, `SLOT_TAKEN`, `LAST_OWNER`, `FORBIDDEN`).

| Endpoint id | Method and path | Purpose | Server task | Consumed by |
|---|---|---|---|---|
| E-AUTH-1 | `POST /auth/login` | Email + password; returns `challengeId` (2FA pending) | SRV-030 | ADM-027 |
| E-AUTH-2 | `POST /auth/verify-otp` | Email OTP; returns access + refresh token and `admin` | SRV-031 | ADM-027 |
| E-AUTH-3 | `POST /auth/resend-otp` | Resend the code (cooldown from settings) | SRV-031 | ADM-027 |
| E-AUTH-4 | `POST /auth/refresh` | Rotate refresh token | SRV-026 | ADM-027 |
| E-AUTH-5 | `POST /auth/logout` | Revoke refresh token | SRV-026 | ADM-027 |
| E-AUTH-6 | `GET /auth/me` | Current admin profile | SRV-030 | ADM-027 |
| E-PROF-1 | `PUT /profile/password` | Change password (current + new) | gap (Appendix D) | ADM-028 |
| E-PROF-2 | `POST /profile/email/request` | Start email change; sends verification | gap (Appendix D) | ADM-028 |
| E-PROF-3 | `POST /profile/email/confirm` | Confirm email change with code | gap (Appendix D) | ADM-028 |
| E-SRCH-1 | `GET /search?q=` | Global search grouped by customers, salons, bookings, members | gap (Appendix D) | ADM-025 |
| E-UPL-1 | `POST /uploads/presign` | Presigned upload for an `UploadPurpose` | SRV-046 | ADM-023 |
| E-UPL-2 | `POST /uploads/confirm` | Confirm upload (type/size checked) and get CDN URL | SRV-046 | ADM-023 |
| E-EXP-1 | `POST /exports` | Request an async Excel / PDF / CSV export of a table or report | SRV-109 | ADM-019 |
| E-EXP-2 | `GET /exports/{id}` | Status and short-lived signed download URL | SRV-109 | ADM-019 |
| E-CUS-1 | `GET /customers` | Paginated list; filters: q, status, gender, city, registered range; sort | SRV-101 | ADM-029 |
| E-CUS-2 | `GET /customers/{id}` | Profile + status + counters | SRV-101 | ADM-030 |
| E-CUS-3 | `PATCH /customers/{id}` | Edit any profile field (reason, audited) | SRV-101 | ADM-030 |
| E-CUS-4 | `GET /customers/{id}/bookings` | Paginated bookings of the customer | SRV-077 | ADM-030 |
| E-CUS-5 | `GET /customers/{id}/payments` | Transactions and refunds of the customer | SRV-104 | ADM-030 |
| E-CUS-6 | `GET /customers/{id}/reviews` | Reviews written by the customer | SRV-064 | ADM-030 |
| E-CUS-7 | `GET /customers/{id}/installations and /notifications` | Devices and notifications sent | gap (Appendix D) | ADM-030 |
| E-CUS-8 | `POST /customers/{id}/block` | Block with reason | SRV-032 | ADM-031 |
| E-CUS-9 | `POST /customers/{id}/unblock` | Unblock with reason | SRV-032 | ADM-031 |
| E-CUS-10 | `POST /customers/{id}/restore` | Restore an account in the grace period | SRV-032 | ADM-031 |
| E-CUS-11 | `DELETE /customers/{id}` | Force delete with reason | SRV-032 | ADM-031 |
| E-SAL-1 | `GET /salons` | Paginated list; filters: q, state, gender, city, subscription | SRV-102 | ADM-032 |
| E-SAL-2 | `GET /salons/{id}` | Details, completeness `missing[]`, subscription summary | SRV-102 | ADM-033 |
| E-SAL-3 | `PATCH /salons/{id}` | Edit profile, location, contacts, gender type (reason) | gap (admin variant of SRV-045) | ADM-033 |
| E-SAL-4 | `GET /salons/{id}/documents` | License documents with short-lived signed URLs | SRV-102, SRV-046 | ADM-034 |
| E-SAL-5 | `GET /salons/{id}/gallery  POST/DELETE` | Gallery list, add, delete, order | gap (admin variant of SRV-048) | ADM-034 |
| E-SAL-6 | `GET/PUT /salons/{id}/hours` | Weekly schedule | gap (admin variant of SRV-049) | ADM-034 |
| E-SAL-7 | `GET/POST/DELETE /salons/{id}/closures` | Exceptional closures | gap (admin variant of SRV-049) | ADM-034 |
| E-SAL-8 | `GET/PATCH /salons/{id}/services` | Salon services: price, duration, flags, deactivate | gap (admin variant of SRV-050) | ADM-035 |
| E-SAL-9 | `GET/PATCH /salons/{id}/members` | Members, roles, permissions, deactivate | gap (admin variant of SRV-051) | ADM-035 |
| E-SAL-10 | `GET/PATCH /salons/{id}/staff` | Staff profile, skills, bride qualification, hours | gap (admin variant of SRV-052) | ADM-035 |
| E-SAL-11 | `GET/PUT /salons/{id}/policies` | Cancellation window, payment options, refund rules | gap (admin variant of SRV-054) | ADM-035 |
| E-SAL-12 | `POST /salons/{id}/state` | Set `LIVE` or `OFFLINE` with reason | SRV-055 | ADM-036 |
| E-SAL-13 | `POST /salons/{id}/deletion-request/decision` | Approve or reject a deletion request (reason) | gap (Appendix D) | ADM-036 |
| E-SAL-14 | `GET /salons/{id}/kpis` | Overview KPIs and activity summary | SRV-102 | ADM-036 |
| E-APP-1 | `GET /applications` | Pending queue, oldest first | SRV-102 | ADM-037 |
| E-APP-2 | `GET /applications/{id}` | Submitted data + documents | SRV-102 | ADM-037 |
| E-APP-3 | `POST /applications/{id}/decision` | Approve or reject (reason for reject) | SRV-042 | ADM-037 |
| E-CAT-1 | `GET /catalog/services` | List by gender (both languages) | SRV-040 | ADM-038 |
| E-CAT-2 | `POST/PUT/DELETE /catalog/services(/{id})` | Create, edit, deactivate | SRV-040 | ADM-038 |
| E-CAT-3 | `PUT /catalog/services/order` | Reorder | SRV-040 | ADM-038 |
| E-CAT-4 | `GET /catalog/requests` | Salon requests queue | SRV-103 | ADM-039 |
| E-CAT-5 | `POST /catalog/requests/{id}/decision` | Approve (create or map) / reject (note) | SRV-050, SRV-103 | ADM-039 |
| E-CON-1 | `GET/POST/PUT/DELETE /banners` | Banners CRUD | SRV-039 | ADM-040 |
| E-CON-2 | `PUT /banners/order` | Reorder banners | SRV-039 | ADM-040 |
| E-CON-3 | `GET/PUT /content/pages/{kind}?app=` | Privacy, Terms, About per app (ar + en) | SRV-038 | ADM-041 |
| E-CON-4 | `GET/POST/PUT/DELETE /faq  PUT /faq/order` | FAQ per app | SRV-038 | ADM-042 |
| E-CON-5 | `GET/PUT /content/contact?app=` | Phone, WhatsApp, email per app | SRV-038 | ADM-043 |
| E-SET-1 | `GET /settings` | All settings with defaults (BUSINESS_DOMAIN §10) | SRV-103 | ADM-044, ADM-045, ADM-048 |
| E-SET-2 | `PATCH /settings` | Change one setting (validated, reason, audited) | SRV-103 | ADM-044, ADM-045, ADM-048 |
| E-LOC-1 | `GET/POST/PUT /locations/countries` | Countries | SRV-038 | ADM-046 |
| E-LOC-2 | `GET/POST/PUT /locations/cities` | Cities | SRV-038 | ADM-046 |
| E-LOC-3 | `GET/POST/PUT /locations/areas` | Areas | SRV-038 | ADM-046 |
| E-VER-1 | `GET/PUT /app-versions` | Version policy per app and platform | SRV-038 | ADM-047 |
| E-VER-2 | `GET/PUT /maintenance` | Maintenance mode per app (ar + en message) | SRV-038 | ADM-047 |
| E-AUD-1 | `GET /audit-logs` | Filter by action, entity, date; before/after | SRV-103 | ADM-049 |
| E-BKG-1 | `GET /bookings` | Paginated list with all filters of A15 | SRV-077 | ADM-050 |
| E-BKG-2 | `GET /bookings/{id}` | Details, status history, related items | SRV-077 | ADM-051 |
| E-BKG-3 | `POST /bookings/{id}/transition` | `action` + `reason` (+ cancel `mode`); returns `irregular` flag | SRV-078 | ADM-052 |
| E-BKG-4 | `GET /bookings/{id}/eligible-staff` | Staff eligible for reassignment | SRV-076 | ADM-053 |
| E-BKG-5 | `POST /bookings/{id}/reassign` | Reassign staff (reason) | SRV-076, SRV-078 | ADM-053 |
| E-BKG-6 | `POST /bookings/{id}/refund` | Full or partial refund (amount string, reason, idempotency key) | SRV-086 | ADM-054 |
| E-REV-1 | `GET /reviews?status=PENDING` | Moderation queue | SRV-064 | ADM-055 |
| E-REV-2 | `POST /reviews/{id}/decision` | Approve / reject | SRV-064 | ADM-055 |
| E-REV-3 | `POST /reviews/bulk-decision` | Bulk approve / reject | SRV-064 | ADM-055 |
| E-REV-4 | `GET /reviews?status=APPROVED` | Published reviews with filters | SRV-064 | ADM-056 |
| E-REV-5 | `POST /reviews/{id}/remove` | Remove a published review (reason) | SRV-064 | ADM-056 |
| E-FIN-1 | `GET /transactions` | Every attempt and capture; filters | SRV-104 | ADM-057 |
| E-FIN-2 | `GET /transactions/{id}` | Gateway request/response log, timeline | SRV-104 | ADM-057 |
| E-FIN-3 | `GET /refunds` | Refunds by source, status, age | SRV-104 | ADM-058 |
| E-FIN-4 | `POST /refunds/{id}/retry` | Retry a failed refund | SRV-086 | ADM-058 |
| E-FIN-5 | `POST /refunds/{id}/mark-refunded` | Manual completion (reference required) | SRV-086 | ADM-058 |
| E-FIN-6 | `GET /payouts/balances` | Per-salon balances | SRV-088 | ADM-059 |
| E-FIN-7 | `GET /payouts` | Payout history | SRV-088 | ADM-059 |
| E-FIN-8 | `POST /payouts/compute` | Compute amounts for salons and period | SRV-088 | ADM-060 |
| E-FIN-9 | `POST /payouts` | Record a transfer (date, amount, reference, note) | SRV-088 | ADM-060 |
| E-FIN-10 | `GET/PUT /salons/{id}/bank-details` | Masked by default; change needs reason | SRV-090 | ADM-060 |
| E-FIN-11 | `GET /subscriptions` | List + saved views (ending <= 7d, expired) | SRV-104 | ADM-061 |
| E-FIN-12 | `POST /subscriptions/{salonId}/payments` | Record a payment, extends the period | SRV-089 | ADM-061 |
| E-FIN-13 | `GET /placements` | Recommended placements per gender | SRV-066 | ADM-062 |
| E-FIN-14 | `POST/PUT/DELETE /placements  PUT /placements/order` | Add, edit, remove, reorder | SRV-066 | ADM-062 |
| E-FIN-15 | `GET /reconciliation?from&to` | Period summary and mismatches | SRV-104 | ADM-063 |
| E-PSH-1 | `POST /campaigns/estimate` | Audience size estimate | SRV-099 | ADM-064 |
| E-PSH-2 | `POST /campaigns` | Create (send now or schedule) | SRV-099 | ADM-064 |
| E-PSH-3 | `GET /campaigns/{id}` | Campaign details and stats | SRV-099 | ADM-064 |
| E-PSH-4 | `GET /campaigns` | History | SRV-099 | ADM-065 |
| E-ANA-1 | `GET /analytics/overview` | Live Overview snapshot | SRV-105 | ADM-066 |
| E-ANA-2 | `GET /analytics/activity-feed` | Latest important events | SRV-105 | ADM-066 |
| E-ANA-3 | `GET /analytics/traffic` | Installs, DAU/WAU/MAU, sessions, conversion | SRV-105 | ADM-068 |
| E-ANA-4 | `GET /analytics/screens` | Screens ranking | SRV-105 | ADM-069 |
| E-ANA-5 | `GET /analytics/events` | Event explorer + raw events (paginated) | SRV-105, SRV-110 | ADM-069 |
| E-ANA-6 | `GET /analytics/funnels/{id}` | Funnel steps, conversion, drop-off, median time | SRV-110 | ADM-070 |
| E-ANA-7 | `GET /analytics/funnels/{id}/dropoff-users` | Users who dropped at a step | SRV-110 | ADM-070 |
| E-ANA-8 | `GET /analytics/search` | Queries, zero-result, filter usage, CTR, permissions, salon actions | SRV-105, SRV-110 | ADM-071 |
| E-ANA-9 | `GET /analytics/retention` | Cohorts, repeat rate, histogram | SRV-110 | ADM-072 |
| E-ANA-10 | `GET /analytics/bookings` | Booking analytics (A07) | SRV-105 | ADM-073 |
| E-ANA-11 | `GET /analytics/payments` | Payment analytics (A08) | SRV-105 | ADM-074 |
| E-ANA-12 | `GET /analytics/errors` | API, client, crash, OTP, push errors (A09) | SRV-105, SRV-115 | ADM-075 |
| E-ANA-13 | `GET /analytics/merchants` | Merchant analytics (A10) | SRV-105 | ADM-076 |
| E-ANA-14 | `GET /journeys/search?q=` | Find a subject by phone, name or id | SRV-110, SRV-101 | ADM-077 |
| E-ANA-15 | `GET /journeys/{subject}` | Identity header + paginated event timeline | SRV-110 | ADM-077 |
| E-RPT-1 | `GET /reports/{kind}?period` | Report data | SRV-108 | ADM-078 |
| E-RPT-2 | `POST /exports (kind=report)` | See E-EXP-1 | SRV-109 | ADM-078 |
| E-ALR-1 | `GET /alerts` | List; filter by status/severity | SRV-107 | ADM-079 |
| E-ALR-2 | `POST /alerts/{id}/acknowledge` | Acknowledge | SRV-107 | ADM-079 |

**Socket.IO (room `admin`, BUSINESS_DOMAIN §7):** `booking.updated`, `application.created`, `review.created`, `refund.updated`, `alert.created`, `overview.tick` — consumed by the realtime client (ADM-012) and the pages listed in their tasks.

---

## Appendix B — Environments and build variants (item 1)
| Setting | local developer | dev | prod |
|---|---|---|---|
| Purpose | build offline against the mock transport | integration and QA | operators |
| Variant to build | `dev-debug` (`npm run dev`) | `dev-release` (`dev-debug` for diagnosis) | `prod-release` (`prod-debug` for diagnosis) |
| `VITE_DATA_SOURCE` | `mock` | `remote` (mock allowed through the dev scenario switcher) | `remote` only; mock code compiled out |
| `VITE_API_BASE_URL` / `VITE_SOCKET_URL` | optional | dev API / socket (from GitHub `vars`) | prod API / socket, **https only** |
| `VITE_DEFAULT_LANGUAGE` | `ar` | `ar` | `ar` |
| Ribbon / `/about` / dev gallery | shown | shown | hidden / shown without internals / compiled out |
| Source maps | yes (debug) | yes in debug, no in release | no in release |
| Secrets | none: every `VITE_*` value is public | none | none |

Build matrix in CI: `dev-debug`, `dev-release`, `prod-debug`, `prod-release`, each followed by the size budget and artifact-safety check (no source maps in release, no mock code in prod). Deployment is ADM-003 (PENDING on hosting).

## Appendix C — Open decisions (record each as an ADR in `docs/adr/` before the task that needs it)
| # | Decision | Needed by | Recommendation |
|---|---|---|---|
| 1 | Chart implementation: hand-rolled SVG vs a library | ADM-022 | Hand-rolled SVG components for the six chart types (small bundle, full RTL/theme control); revisit only if a type proves too costly |
| 2 | Form library | ADM-016 | `react-hook-form` + zod resolver |
| 3 | Rich-text editor | ADM-024 | A headless editor (e.g. Tiptap) with a strict sanitizer; output sanitized again on the server |
| 4 | Drag-and-drop for ordering (placements, FAQ, banners, services) | ADM-062 | `@dnd-kit` with a keyboard-accessible fallback (move up/down buttons) |
| 5 | Date-range picker | ADM-019 | Own component on `Intl`, Amman day boundaries via `AppTime` |
| 6 | Socket.IO client version/transport | ADM-012 | Match the server's `socket.io` major; WebSocket first, polling fallback |
| 7 | Hosting, platform domain, CDN, CSP | ADM-003 | **Owner input** (root `CLAUDE.md` §7) |
| 8 | Error-tracking tool and DSN | ADM-085 | **Owner input** (open item #4) |

## Appendix D — Gaps between the Admin PRD and the server backlog (to add to `WAB_Server_Tasks.md`)
| # | Needed by the admin panel | Used by | Proposed server work |
|---|---|---|---|
| 1 | Global search (customers, salons, bookings, members) | ADM-025 | New row in Stage L: `GET /admin/v1/search` |
| 2 | Admin profile: change password, change email with verification | ADM-028 | Extend SRV-030/031 |
| 3 | Customer devices/installations and notifications-sent lists | ADM-030 | Extend SRV-101 (data exists: SRV-033, SRV-093) |
| 4 | Admin variants of salon profile, gallery, hours, services, members, staff, policies (SRV-045…054 are owner/permission scoped) | ADM-033, ADM-034, ADM-035 | Extend SRV-102 with admin-scoped edit endpoints that reuse the same domain services and write the audit log |
| 5 | Salon deletion-request decision | ADM-036 | Extend SRV-055 |
| 6 | Salon KPIs and activity summary for the overview tab | ADM-033 | Extend SRV-102 |
| 7 | Event explorer, funnels, cohorts, per-user journeys | ADM-069, ADM-070, ADM-072, ADM-077 | SRV-105 (Mongo) now; full depth only with SRV-110 (**PENDING**) |
| 8 | Reports scheduled by email (could) | ADM-078 | Optional extension of SRV-108 |

## Appendix E — Glossary
**Mock transport:** fixtures served through the real HTTP client, so DTO parsing and repositories run without a server · **Slice:** the domain / data / presentation part of one feature · **Reason:** mandatory free-text justification of an admin action, stored in the audit log · **Variant:** `<dev|prod>-<debug|release>` build · **INT-01 / INT-05:** contracts v1 / switching the admin panel to the real dev server (`ROADMAP.md`).

