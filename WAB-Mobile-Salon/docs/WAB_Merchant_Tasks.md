# WAB-Mobile-Salon — Task Backlog (build the whole merchant app)

> **Purpose:** every task needed to build the merchant (salon) app (Android + iOS, KMP + Compose Multiplatform, same template and core modules as the customer app), small and ordered, each with a status. One task = one branch = one PR into `merchant` (the merchant master branch, created from `main`).
> **Next task:** `python3 scripts/tasks.py next merchant` — never read this file whole. Status counts: `python3 scripts/tasks.py board`.
> **Sources:** `docs/WAB_Merchant_App_PRD.md` (M01–M26, §3 global rules, §4 lifecycle + launch flow, §6 permissions, §10 booking rules, §11 notifications, §12 validation — PRD wins on behaviour), `docs/WAB_Merchant_BRD.md` (MBR-xx), `docs/WAB_Merchant_Design_Script.md`, `design/WAB Merchant 0x *.dc.html`, **`WAB-Server/docs/api/openapi.merchant.json` (the real `/merchant/v1` contract, 71 operations)**, `BUSINESS_DOMAIN.md`, `INTEGRATION.md`.
> **Rules:** the customer app rules apply unchanged (`WAB-Mobile-Customer/CLAUDE.md`, copied into this project by MER-003), root `.claude/rules.md`.
> **Written:** 2026-10-18. No code exists yet; the project is scaffolded from the customer template (MER-001).
> **Server gaps found while writing (Merchant PRD §15 vs the contract):** no member profile / change phone / push toggle, no dashboard aggregate, no reviews read, no statistics, no deletion request / self-removal, conflict preview on schedule and staff changes to verify. They are server tasks SRV-129…SRV-134 (Stage O); the merchant rows that need them are `BLOCKED`.

## 1. Status legend
`TODO` ready to start · `IN PROGRESS` branch open · `IN REVIEW` PR open · `DONE` merged to `merchant` · `PENDING` waits for **information or an action from the owner** · `BLOCKED` waits for a task of another project named in *Needs* (managed by `scripts/tasks.py`).

## 2. Working rules
1. **Strict order, one at a time.** Take the task `tasks.py next merchant` gives; do not start the next until the previous PR is merged into `merchant`.
2. **One task = one branch = one PR**: `feat/mer-NNN-<key>` from the freshly fetched `origin/merchant`; PR targets `merchant`; the user merges `merchant` into `main`.
3. **Feature recipe:** identical to the customer backlog §2.3 (domain → data with generated DTOs → MVI presentation with previews → Koin), plus: **every screen, tab, menu item, button and notification is permission-gated with hidden-not-disabled** (PRD §3), and every booking action handles the "already handled by {member}" conflict.
4. **Contract = the server OpenAPI** (`openapi.merchant.json`). A screen that needs data the contract lacks stays `BLOCKED` on an `SRV-` row.
5. **Done means:** acceptance criteria in `WAB-Mobile-Salon/.claude/session.md`, unit tests green, local checks green, all variants build, AR + EN strings, no hardcoded values, `Loops: 1/1`, four-role review, `tasks.py set MER-NNN DONE`, durable facts in `WAB-Mobile-Salon/.claude/memory.md`.

## 3. Phases
| Phase | Content | Tasks |
|---|---|---|
| 1 | Project setup | MER-001 … MER-004 |
| 2 | Structure, contract tooling, permissions, platform facades | MER-005 … MER-012 |
| 3 | Design system and merchant components | MER-013 … MER-018 |
| 4 | Features (PRD screens) | MER-019 … MER-053 |
| 5 | Integration, quality and release | MER-054 … MER-060 |

## Phase 1 — Project setup
| ID | Task | Branch | Needs | Status | Notes |
|---|---|---|---|---|---|
| MER-001 | Scaffold the KMP app from the customer template: same Gradle versions (`libs.versions.toml`), `core/*` modules, `composeApp`, `androidApp` (flavors dev/prod, package `com.wab.merchant`), `iosApp` (schemes Dev/Prod), `feature/sample` removed; ADR on sharing `core/*` with the customer app (copy now, shared Gradle included build later) | `feat/mer-001-scaffold` | — | DONE | Skill `create-kmp-app`; `WAB-Mobile-Customer/TECHSTACK.md`; owner decides the sharing model later |
| MER-002 | Build variants + CI: Android dev/prod × debug/release, iOS Debug/Release-Dev/Prod, GitHub Actions (build, lint, policy checks, secret scan), release size budget | `feat/mer-002-variants-ci` | MER-001 | IN REVIEW | Mirror `customer-ci.yml` |
| MER-003 | Project rules and quality gates: `WAB-Mobile-Salon/CLAUDE.md` (copy of the customer rules + merchant specifics: permission gating, overlay permission, request sound), policy checks + detekt baselines (empty), 300-line rule | `feat/mer-003-rules-gates` | MER-001 | IN REVIEW | Root rules §3 |
| MER-004 | Firebase registrations for the merchant app (Android + iOS, dev + prod projects), `google-services.json` / plist per flavor, facade reused from the customer app | `feat/mer-004-firebase` | MER-002 | PENDING | Owner registers the 2 merchant apps in `wab-dev-397ab` / `wab-prod-9c58f` and provides the config files — **owner input** |

## Phase 2 — Structure, contract tooling, permissions, platform facades
| ID | Task | Branch | Needs | Status | Notes |
|---|---|---|---|---|---|
| MER-005 | Network kernel reused: Ktor per environment, `Accept-Language`, base envelope, error-code catalog AR/EN, refresh-token interceptor (`POST /merchant/v1/auth/refresh`) | `feat/mer-005-network-kernel` | MER-003 | IN REVIEW | Same as CUS-006/007; merchant token scope only |
| MER-006 | Contract tooling: generate DTOs from `openapi.merchant.json` (`./gradlew apiSync`), stale-check test, operation registry | `feat/mer-006-api-sync` | MER-005 | IN REVIEW | Same generator as CUS-009 |
| MER-007 | Mock data source with fixtures per operation, `DATA_SOURCE=mock|remote`, scenario switcher in dev; fixtures cover every salon state and permission set | `feat/mer-007-mock-source` | MER-006 | IN REVIEW | `INTEGRATION.md` §4 |
| MER-008 | Secure local storage of PRD §5 keys (tokens encrypted, member id, salon id, salon state, permissions cache, language, theme, push, overlay-permission-asked) via one `SessionStore` | `feat/mer-008-session-store` | MER-005 | IN REVIEW | PRD §5 |
| MER-009 | Permissions model: the 15 grantable keys + owner-only keys (PRD §6.2), `hasPermission`/`anyOf` helpers, `PermissionGated` composable (hidden-not-disabled), re-fetch on app start, Home pull-to-refresh and `PERMISSIONS_UPDATED` data push; default templates | `feat/mer-009-permissions` | MER-008 | IN REVIEW | PRD §3, §6; BUSINESS_DOMAIN permissions |
| MER-010 | Analytics tracker + Crashlytics facade (member id as Firebase user id, salon id, role, `app=MERCHANT` fields), app-instance id for the backend | `feat/mer-010-analytics` | MER-004 | IN REVIEW | PRD §14 |
| MER-011 | Realtime client (Socket.IO, salon room filtered by permission) + fake; reconnect on foreground; events from constants | `feat/mer-011-realtime-client` | MER-005 | IN REVIEW | PRD §3 real-time; server SRV-080/081 |
| MER-012 | Push facade for merchants: FCM token registration (`PUT /installations`), high-priority data messages, Android notification channels with alert sound, "display over other apps" permission flow + full-screen intent, iOS time-sensitive category with Accept/Reject actions (notification service + content extensions) | `feat/mer-012-push-facade` | MER-004, MER-008 | TODO | PRD M10 outside-the-app; root `CLAUDE.md` §4.4 |

## Phase 3 — Design system and merchant components
| ID | Task | Branch | Needs | Status | Notes |
|---|---|---|---|---|---|
| MER-013 | Theme and tokens reused from the customer design system; merchant brand accents; universal states, pagination list, pull-to-refresh, form kit (phone + country, OTP boxes, dropdowns, validation) brought over | `feat/mer-013-design-base` | MER-003 | IN REVIEW | Design Script §1.1; customer CUS-018/020 |
| MER-014 | Merchant components (Design Script §1.2): booking card (reference, customer, time, persons, staff, status + payment badges, bride badge, pending age + auto-cancel countdown), status strip, pending-requests card, KPI tile, status-history timeline, permission-gated bottom nav (5 tabs, first visible is default) | `feat/mer-014-merchant-components` | MER-013, MER-009 | IN REVIEW | PRD M07–M09 |
| MER-015 | Request sheet component (M10 content: title + BRIDE badge, summary, Accept / Reject / View details, "1 of 3" queue, "Handled by {member}" state) with sound + vibration hooks | `feat/mer-015-request-sheet` | MER-014 | IN REVIEW | PRD M10 in-app |
| MER-016 | Uploaders: document uploader (1–5 files, image/PDF, ≤ 10 MB, thumbnails, remove, progress, retry), image uploader with crop 16:9 / 1:1, media (image/video ≤ 60 s / 50 MB) multi-select grid with reorder and select-to-delete; presign → upload → confirm flow | `feat/mer-016-uploaders` | MER-013 | IN REVIEW | PRD M04, M13, M14, §12 |
| MER-017 | Map picker (draggable pin, use my location, reverse geocoding text) behind a `MapProvider` interface with a fake; maps key from config | `feat/mer-017-map-picker` | MER-013 | IN REVIEW | PRD M13; maps key is env/CI only |
| MER-018 | Calendar grid component: day view (columns per staff, 15-min grid), week view, shaded non-working / closures / leaves, status colours, bride icon, swipe + date picker + Today | `feat/mer-018-calendar-grid` | MER-014 | IN REVIEW | PRD M11 |

## Phase 4 — Features
| ID | Task | Branch | Needs | Status | Notes |
|---|---|---|---|---|---|
| MER-019 | Splash + config + system screens M01/M26: `GET /merchant/v1/config`, force update, optional update, maintenance | `feat/mer-019-config-system` | MER-007, MER-013 | IN REVIEW | PRD M01, M26 |
| MER-020 | Welcome & login M02: phone + country (`GET /locations/countries`), `POST /auth/check-phone`, "not linked" dialog → register, deactivated / blocked messages, language + theme, legal links | `feat/mer-020-login` | MER-019 | IN REVIEW | PRD M02, §4.4; server SRV-029 |
| MER-021 | OTP M03 (modes LOGIN / REGISTER / CHANGE_PHONE / BANK_DETAILS): `POST /auth/otp/request`, Firebase phone verification facade, `POST /auth/login` with ID token, `/auth/otp/wrong-attempt`, countdown, limits | `feat/mer-021-otp` | MER-020, MER-010 | IN REVIEW | PRD M03; same rules as customer S13 |
| MER-022 | Salon registration M04: fields (name, type MEN/WOMEN with warning, owner names, city → area, email), license documents via `POST /uploads/license/presign|confirm`, terms checkbox, `POST /salon/applications` → M05 | `feat/mer-022-registration` | MER-021, MER-016 | IN REVIEW | PRD M04; server SRV-041 |
| MER-023 | Application status M05: `GET /salon/application` (pending with documents, rejected with reason), `POST /salon/application/resubmit` prefilled, push on decision | `feat/mer-023-application-status` | MER-022 | IN REVIEW | PRD M05 |
| MER-024 | Launch router (PRD §4.3) + Offline banner: token → deactivated / application states / incomplete → checklist / live-offline → Home; persistent offline banner with Contact action on every screen | `feat/mer-024-launch-router` | MER-023, MER-009 | IN REVIEW | PRD §4.2–4.3, §3 offline banner; `GET /salon` state |
| MER-025 | Setup checklist M06: progress from `GET /salon` completeness (`missing[]`), items → M13/M15/M16/M17/M19 (+ optional gallery, team), "Your salon is now live!" state | `feat/mer-025-setup-checklist` | MER-024 | IN REVIEW | PRD M06, §4.2 completeness; server SRV-043 |
| MER-026 | Bookings list M08: `GET /bookings` tabs Pending / Upcoming / Today / Past, sticky search (name, phone, reference), filter sheet (date range, staff, status, bride, payment), own-scope for `BOOKINGS_VIEW_OWN`, realtime refresh | `feat/mer-026-bookings-list` | MER-024, MER-014 | IN REVIEW | PRD M08; server SRV-077 |
| MER-027 | Booking details & actions M09: `GET /bookings/{id}`, action bar by status + permission, approve (re-validation conflict), reject with reason picker, cancel approved (full-refund dialog), complete & paid ("collected X JOD"), no-show (policy outcome), reassign (`POST /bookings/{id}/reassign` with eligible list), "already handled by" refresh, Call / WhatsApp | `feat/mer-027-booking-details` | MER-026 | IN REVIEW | PRD M09, §10; server SRV-073/075/076 |
| MER-028 | Real-time request M10 in-app: socket event + FCM data message de-duplicated by booking id, queued sheets, accept/reject from the sheet, handled-by dismissal | `feat/mer-028-request-in-app` | MER-027, MER-015, MER-011 | IN REVIEW | PRD M10 |
| MER-029 | Real-time request outside the app — Android: overlay card with alert sound when permitted, otherwise heads-up notification with Accept / Reject actions; full-screen intent when locked; accept from notification calls the API and reports failure | `feat/mer-029-request-android` | MER-028, MER-012 | TODO | PRD M10 Android |
| MER-030 | Real-time request outside the app — iOS: time-sensitive notification with custom sound, Accept executes in background, Reject opens the reason picker; unanswered requests shown on open | `feat/mer-030-request-ios` | MER-028, MER-012 | TODO | PRD M10 iOS |
| MER-031 | Calendar M11: `GET /bookings/calendar?from=&to=&staff=` into the calendar grid, staff filter, own column for `BOOKINGS_VIEW_OWN`, tap → M09, read-only | `feat/mer-031-calendar` | MER-026, MER-018 | IN REVIEW | PRD M11 |
| MER-032 | Salon hub M12: entries per permission with completeness warnings | `feat/mer-032-salon-hub` | MER-025 | IN REVIEW | PRD M12 |
| MER-033 | Salon profile edit M13: `GET /salon`, `PATCH /salon/profile` (cover/profile images via uploads, name, description ≤ 1000, map location + text, city/area, phone, WhatsApp), type read-only, unsaved-changes guard, "Preview as customer" rendering the customer details layout from local data | `feat/mer-033-salon-profile` | MER-032, MER-016, MER-017 | IN REVIEW | PRD M13; server SRV-045 |
| MER-034 | Gallery M14: `GET/POST /salon/gallery`, `PUT /salon/gallery/order`, `DELETE /salon/gallery/{id}`; multi-select upload with progress, reorder, delete | `feat/mer-034-gallery` | MER-032, MER-016 | IN REVIEW | PRD M14; server SRV-048 |
| MER-035 | Working hours & closures M15: `GET /salon/hours`, `PUT /salon/hours/weekly` (7 rows, 15-min steps, copy to all), closures `POST/PATCH/DELETE`; affected-bookings dialog → `POST /bookings/cancel-affected` or go back | `feat/mer-035-working-hours` | MER-032 | IN REVIEW | PRD M15; server SRV-049/074; conflict preview verified by SRV-134 |
| MER-036 | Services M16: `GET /salon/services` (search, active toggle, bride-only badge), add from `GET /catalog/services?gender=` (added marked), `POST/PATCH /salon/services` form (price JOD > 0 two decimals, duration multiple of 5, bride-only on women's salons, description, media, active), deactivate warning with upcoming bookings, no-qualified-staff warning | `feat/mer-036-services` | MER-032, MER-016 | IN REVIEW | PRD M16; server SRV-050 |
| MER-037 | Catalog requests M16: `GET/POST /catalog/requests` form + status list with admin note | `feat/mer-037-catalog-requests` | MER-036 | IN REVIEW | PRD M16; server SRV-050 |
| MER-038 | Team list + member form M17 (owner / `TEAM_MANAGE`): `GET/POST /team/members`, `GET/PATCH /team/members/{id}`, deactivate / reactivate with affected-bookings dialog, phone unique, role, photo, provides-services toggle; owner cannot be deactivated | `feat/mer-038-team` | MER-032, MER-009 | IN REVIEW | PRD M17; server SRV-051 |
| MER-039 | Staff profile + leaves M17 (`STAFF_MANAGE`): `GET/PUT /team/members/{id}/staff` (bio, experience, services, bride-qualified, working days, custom hours), leaves `GET/POST/PATCH/DELETE`, read-only rating / served count, affected-bookings dialog | `feat/mer-039-staff-profile` | MER-038 | IN REVIEW | PRD M17; server SRV-052/053 |
| MER-040 | Permissions editor M18 (owner only): grouped toggles with descriptions, apply role template, save through `PATCH /team/members/{id}` permissions; member's app refreshes on `PERMISSIONS_UPDATED` | `feat/mer-040-permissions-editor` | MER-038 | IN REVIEW | PRD M18, §6 |
| MER-041 | Policies M19: `GET/PUT /salon/policy` (cancellation window, payment options ≥ 1, deposit % with live example, refund and no-show outcomes, notes), customer preview of the rules block | `feat/mer-041-policies` | MER-032 | IN PROGRESS | PRD M19; server SRV-054 |
| MER-042 | Reviews M20 (`REVIEWS_VIEW`): salon / staff tabs, average + distribution, published list, Report → Contact WAB prefilled | `feat/mer-042-reviews` | MER-032, SRV-131 | BLOCKED | PRD M20; contract has no merchant reviews read → SRV-131 |
| MER-043 | Statistics M21 (`STATISTICS_VIEW`): period selector, KPIs, bookings and revenue per day charts, top services / staff | `feat/mer-043-statistics` | MER-032, SRV-132 | BLOCKED | PRD M21; no statistics endpoint → SRV-132 |
| MER-044 | Finance M22 (`FINANCE_VIEW`): `GET /finance/balance`, tabs transactions / refunds / payouts (`GET /finance/*`), date filters, pagination, info text | `feat/mer-044-finance` | MER-032 | IN PROGRESS | PRD M22; server SRV-088/089/090 |
| MER-045 | Bank details (owner, `PAYOUT_DETAILS_MANAGE`): `GET/PUT /salon/payout-details` with IBAN validation and OTP mode BANK_DETAILS | `feat/mer-045-bank-details` | MER-044, MER-021 | TODO | PRD M22 bank details; server SRV-089 |
| MER-046 | Subscription & status M23: `GET /subscription` (trial / active / expired, days left), salon state, Contact WAB, "Get featured" → contact | `feat/mer-046-subscription` | MER-032 | TODO | PRD M23; server SRV-091 |
| MER-047 | Notifications M24: `GET /notifications`, unread count, read-on-visible, filter sheet, tap routing (booking → M09, review → M20, application → M05, catalog → M16, payout → M22) | `feat/mer-047-notifications` | MER-024, MER-014 | TODO | PRD M24; server SRV-095 |
| MER-048 | More M25 part 1: settings (language, theme, push toggle, Android overlay status + enable, sound test), support (contact, FAQ from `GET /content/*`), legal, log out, app version | `feat/mer-048-more` | MER-024 | TODO | PRD M25 |
| MER-049 | More M25 part 2 — My account: photo, name, phone (change phone → OTP), role; delete my account (member self-removal) / owner salon deletion request | `feat/mer-049-my-account` | MER-048, SRV-129, SRV-133 | BLOCKED | PRD M25; contract lacks member profile, change-phone, push toggle and deletion request → SRV-129, SRV-133 |
| MER-050 | Home M07 (`DASHBOARD_VIEW`): header + bell badge, status strip (state, subscription ≤ 7 days), pending requests card, today at a glance, today's timeline (own scope), quick stats (`STATISTICS_VIEW`), pull-to-refresh also refreshes permissions | `feat/mer-050-home-dashboard` | MER-026, MER-046, SRV-130 | BLOCKED | PRD M07; no dashboard aggregate → SRV-130 (lists could be composed client-side but PRD asks for one shimmer/one request) |
| MER-051 | Analytics events of PRD §14 on every screen and action (request channel, response time, reasons), test that every route and UiAction maps to an event | `feat/mer-051-analytics-events` | MER-010, MER-048 | TODO | PRD §14 |
| MER-052 | Error-code coverage: every BUSINESS_DOMAIN §11 code and every code in `openapi.merchant.json` has AR + EN text and a handling path; permission errors (`FORBIDDEN`) hide the feature and refresh permissions | `feat/mer-052-error-coverage` | MER-005, MER-006 | TODO | — |
| MER-053 | Deep link `/register` (entry from the customer app) + App Links / Universal Links setup checklist | `feat/mer-053-deep-link-register` | MER-022 | TODO | PRD §4.5; domain **owner input** later (config only) |

## Phase 5 — Integration, quality and release
| ID | Task | Branch | Needs | Status | Notes |
|---|---|---|---|---|---|
| MER-054 | Switch dev builds to `DATA_SOURCE=remote` against the dev API: per-feature gap list, socket events and permission filtering verified | `feat/mer-054-remote-dev` | MER-052, SRV-011 | BLOCKED | Needs the dev API URL (deployment, owner) |
| MER-055 | Real OTP on devices (Firebase Phone Auth test numbers, `wab-otp` in the server) | `feat/mer-055-real-otp` | MER-054, SRV-034 | BLOCKED | Firebase registrations (MER-004) |
| MER-056 | Booking request end to end on devices: customer books (dev API) → merchant receives socket + FCM, overlay / heads-up / time-sensitive paths, accept from notification | `feat/mer-056-request-e2e` | MER-029, MER-030, MER-054 | BLOCKED | Needs the dev API; SRV-100 is done |
| MER-057 | Accessibility and RTL QA pass (TalkBack / VoiceOver, 48 dp, font 200 %, RTL, dark, landscape, alert sound + vibration + visual cue) | `feat/mer-057-a11y-rtl-qa` | MER-052 | TODO | PRD §13 |
| MER-058 | Performance pass (cold start, R8, size budget, calendar rendering, image sizing) with measurements | `feat/mer-058-performance` | MER-057 | TODO | Customer `CLAUDE.md` §6 |
| MER-059 | Store readiness (icons, splash, privacy manifest, Data safety, screenshots AR/EN, listing texts, overlay-permission justification for Play) | `feat/mer-059-store-readiness` | MER-058 | PENDING | Store accounts and texts — **owner input** |
| MER-060 | Release pipeline (signing, Play internal + TestFlight from a tag, changelog) | `feat/mer-060-release-pipeline` | MER-059 | PENDING | Signing material — **owner input** |

## 4. Traceability (PRD screen → task)
M01 MER-019 · M02 MER-020 · M03 MER-021 · M04 MER-022 · M05 MER-023 · M06 MER-025 · M07 MER-050 · M08 MER-026 · M09 MER-027 · M10 MER-028/029/030 · M11 MER-031 · M12 MER-032 · M13 MER-033 · M14 MER-034 · M15 MER-035 · M16 MER-036/037 · M17 MER-038/039 · M18 MER-040 · M19 MER-041 · M20 MER-042 · M21 MER-043 · M22 MER-044/045 · M23 MER-046 · M24 MER-047 · M25 MER-048/049 · M26 MER-019 · §4 MER-024 · §6 MER-009/040 · §11 MER-012/047 · §14 MER-010/051.

## 5. Contract coverage (`openapi.merchant.json`, 71 operations)
Auth (6) MER-020/021 · Installations (1) MER-012 · Config (1) MER-019 · Locations (3) MER-020/022 · Content (2) MER-048 · Catalog (1) MER-036 · Application (3) MER-022/023 · Salon profile (2) MER-024/033 · Uploads (4) MER-016/022 · Gallery (4) MER-034 · Hours (5) MER-035 · Services (3) MER-036 · Catalog requests (2) MER-037 · Team (6) MER-038 · Staff (2) MER-039 · Leaves (4) MER-039 · Policy (2) MER-041 · Bookings (10) MER-026/027/031/035 · Payout details (2) MER-045 · Finance (5) MER-044/046 · Notifications (3) MER-047. Missing on the server: SRV-129 (member profile, change phone, push toggle), SRV-130 (dashboard), SRV-131 (reviews), SRV-132 (statistics), SRV-133 (deletion request / self-removal), SRV-134 (conflict preview).
