# WAB-Server — Task Backlog (build the whole backend)

> **Purpose:** every task needed to build the backend, small and ordered, with a status. One task = one branch = one PR.
> **Sources read:** root `CLAUDE.md` and `.claude/*`, **`WAB-Server/CLAUDE.md` (server rules — wins on server conventions)**, `BUSINESS_DOMAIN.md`, `ROADMAP.md`, `INTEGRATION_WORKFLOW.md`, `WAB-Server/docs/WAB_Backend_BRD.md`, the legacy `WAB-Server/BRD.md`, the five `wab-*` package BRDs, and the backend sections of the Customer / Merchant / Admin PRDs and BRDs.
> **Totals:** 116 numbered tasks + 2 split rows (SRV-004a, SRV-005a) (+ SRV-000 this backlog). 10 are `PENDING`; everything else is `TODO` and buildable today against the in-repo stubs.

---

## 1. Rules for working this backlog

1. **Strict order, one at a time.** Take the first `TODO` task in ID order. **Do not start the next task until the previous task's PR is merged to `main`.** `PENDING` tasks are skipped (they do not block the line) and are picked up when their blocker is resolved.
2. **One task = one branch = one PR.** Branch name is in the table (`feat/srv-NNN-<key>`), created from an up-to-date `main` (`git checkout main && git pull --ff-only`). Never commit/push to `main`; never force-push; never `--no-verify`. *(Exception: SRV-000 — this backlog — was produced on the cloud-session branch `claude/busy-johnson-2rch94`.)*
3. **Status legend:** `TODO` ready to start · `IN PROGRESS` branch open · `IN REVIEW` PR open · `DONE` merged to `main` · `PENDING` blocked by **information from the owner** or by **another SDK/package/provider that does not exist yet** (the *Pending on* column must say exactly what). A task is **never** `PENDING` just because it is large or because a dependency can be stubbed — stub it behind an interface instead (`ROADMAP.md` §2).
4. **Small:** a task should fit in about one working day and touch one module/concern. If it grows, split it into a new row (append `a`, `b`) before coding.
5. **Definition of done (every task, plus `WAB-Server/CLAUDE.md` §10):** unit tests for every acceptance criterion + edge cases, all green · lint/typecheck/build green · no hardcoded values (settings, config, constants, localized messages) · no secrets · Swagger + Postman regenerated (`npm run docs`, `WAB-Server/CLAUDE.md` §11) and committed, or `API docs: no change` noted · **3 verification loops** and **4-role review** recorded in `.claude/session.md` · `memory.md` updated with durable facts · PR opened · status here changed (`IN REVIEW` on PR, `DONE` after merge).
6. **Requirements order of precedence:** PRD > `WAB_Backend_BRD.md` > `BUSINESS_DOMAIN.md` (data/rules) > Design Script. Conflicts → stop and ask the owner; do not guess.
7. **Legacy document:** `WAB-Server/BRD.md` (4-digit OTP, Cloudinary, `/v1/customer/...`, role field, express-validator) is **superseded** by the Backend BRD + `BUSINESS_DOMAIN.md` (6-digit Firebase OTP, S3 via `wab-storage`, `/customer/v1`, own JWT with scopes). Do not implement it; it is kept for history only.
8. **Server must stay mock-friendly:** every external dependency (Firebase OTP, S3, FCM/SMTP, payment gateway, BigQuery) is behind an interface with a config-selected fake (Stage C). Real providers are the `PENDING` tasks.
9. **Money** is integer fils (only via `utils/money`); **time** is UTC stored / Asia/Amman computed (only via `utils/time`); **errors** use the codes of `BUSINESS_DOMAIN.md` §11 (if `WAB-Server/CLAUDE.md` examples differ, e.g. `BOOKING_SLOT_TAKEN` vs `SLOT_TAKEN`, the domain list wins); **every response** uses the base envelope of `WAB-Server/CLAUDE.md` §6 and is localized by `Accept-Language` (default `ar`); stored `{ar,en}` content is returned in the requested language to customer/merchant and in both to admin; notifications are localized to the **recipient's saved language**.
9a. **Server rules apply to every task** (`WAB-Server/CLAUDE.md`): read its §0 list first; list the `BUSINESS_DOMAIN.md` sections and BE/NFR ids touched in the task's acceptance criteria; re-read them before pushing (verification loop 1); layered flow route → middleware → controller → service → repository → schema; separate `customer`/`merchant`/`admin` modules with shared logic in `domain/`; no `any`; no hardcoded values (`config/`, `constants/`, `settings`, `locales/`); no duplicated helpers.
10. **Contracts:** every endpoint change must update `contracts/` OpenAPI + Swagger + Postman in the same PR (`WAB-Server/CLAUDE.md` §10). `contracts/` (INT-01) does not exist yet: until it does, derive wire shapes from the PRDs and `BUSINESS_DOMAIN.md`, keep Swagger + Postman current, note each endpoint delta in the task block, and apply them to `contracts/` when INT-01 lands (`SRV-111` stays PENDING until then).

## 2. What the owner must provide (drives every `PENDING` task)

| Task | Task title | Pending on |
|---|---|---|
| SRV-011 | Deploy to dev environment (DigitalOcean) from `main` | DigitalOcean product (Droplet vs App Platform), managed Redis, platform domain, secrets store — **user input**. |
| SRV-034 | Real Firebase ID-token verification (`wab-otp` / firebase-admin) replacing the stub | Firebase project service account (dev/prod) and/or `wab-otp` package published — **user input / other SDK**. |
| SRV-059 | Atlas Search (Arabic + English analyzers) behind a `SalonSearch` interface, swapped by config | MongoDB Atlas cluster tier/connection (Atlas Search needs Atlas) — **user input**. |
| SRV-092 | Real payment gateway provider (HyperPay candidate) + sandbox config; `wab-payments` swap | Gateway selection + sandbox/live credentials, or `wab-payments` published — **user input / other SDK**. |
| SRV-100 | Real FCM + Gmail SMTP providers (`wab-notifications`) replacing stubs | Firebase project/service account, Gmail App Password, or `wab-notifications` published — **user input / other SDK**. |
| SRV-110 | BigQuery-backed analytics (Firebase events/Crashlytics: funnels, cohorts, per-user journeys incl. guest history) | BigQuery export dataset + credentials, or `wab-analytics` published — **user input / other SDK**. |
| SRV-111 | Contract tests: server responses validated against `contracts/` OpenAPI in CI | `contracts/` (INT-01) not created yet — separate track. |
| SRV-112 | Replace in-repo stubs with published `wab-*` packages (INT-02) | Packages published to the registry (registry choice open) — **other repos / user input**. |
| SRV-115 | Error-tracking integration (Sentry or chosen tool) + API error/latency metrics for admin Errors page | Tool selection (open item #4) and DSN — **user input**. |
| SRV-116 | Backups, restore and deployment runbook (dev/prod) | DigitalOcean product, Atlas tier, domain — **user input**. |

Also needed from the owner when the related task starts (will be asked then, not blocking now): Jordan cities/areas list for seeding (SRV-018; a documented starter set is used otherwise), exact merchant/customer SMS+email wording if it differs from PRDs.

## 3. Status of the line

| ID | Task | Branch | Status |
|---|---|---|---|
| SRV-000 | This backlog (`WAB-Server/docs/WAB_Server_Tasks.md`) + housekeeping docs | `claude/busy-johnson-2rch94` | DONE |
| SRV-001 | TypeScript strict project + lint/format/test + folder layout | `claude/busy-johnson-2rch94` (cloud-pinned) | DONE |
| SRV-002 | Config/env loader + `.env.example` | `claude/busy-johnson-2rch94` (cloud-pinned) | DONE |
| SRV-003 | Logger with redaction + request id | `claude/busy-johnson-2rch94` (cloud-pinned) | DONE |
| SRV-004 | Error model, codes, AR/EN locales, Accept-Language | `claude/busy-johnson-2rch94` (cloud-pinned) | DONE |
| SRV-004a | Global error handler, notFound, async wrapper, process handlers | `claude/busy-johnson-2rch94` (cloud-pinned) | DONE |
| SRV-005 | Express app factory, namespaces, validate middleware, server entry | `claude/busy-johnson-2rch94` (cloud-pinned) | DONE |
| SRV-005a | Success response and pagination helpers | `claude/busy-johnson-2rch94` (cloud-pinned) | DONE |
| SRV-006 | Health and readiness endpoints | `claude/busy-johnson-2rch94` (cloud-pinned) | DONE |
| SRV-007 | Security middleware (Helmet, CORS, rate limit, sanitize) | `claude/busy-johnson-2rch94` (cloud-pinned) | DONE |
| SRV-008 | Swagger + Postman generation, `/docs`, docs-after-every-task rule | `claude/busy-johnson-2rch94` (cloud-pinned) | DONE |
| SRV-009 | Dockerfile + docker-compose for local development | `claude/busy-johnson-2rch94` (cloud-pinned) | DONE |
| SRV-010 | GitHub Actions CI (verify + secret scan) | `claude/busy-johnson-2rch94` (cloud-pinned) | DONE |
| SRV-012 | MongoDB connection and base repository | `claude/busy-johnson-2rch94` (cloud-pinned) | DONE |
| SRV-013 | Redis client and distributed lock helper | `claude/busy-johnson-2rch94` (cloud-pinned) | DONE |
| SRV-014 | Redis counter/flag helpers, limiter and rate-limit store | `claude/busy-johnson-2rch94` (cloud-pinned) | DONE |
| SRV-015 | Money utils (integer fils, JOD strings, half-up rounding) | `claude/busy-johnson-2rch94` (cloud-pinned) | DONE |
| SRV-016 | Time utils (UTC instants, Asia/Amman days, `HH:mm`, DST-safe ranges) | `claude/busy-johnson-2rch94` (cloud-pinned) | DONE |
| SRV-017 | Settings model, repository, typed registry, service with Redis cache | `claude/busy-johnson-2rch94` (cloud-pinned) | DONE |
| SRV-017a | Create indexes at startup | `claude/busy-johnson-2rch94` (cloud-pinned) | DONE |
| SRV-018 | Reference-data seed (countries, cities, areas) | `claude/busy-johnson-2rch94` (cloud-pinned) | DONE |
| SRV-019 | Demo catalog seed (dev only) | `claude/busy-johnson-2rch94` (cloud-pinned) | DONE |
| SRV-020 | Audit-log writer + server-events writer (append-only) | `claude/busy-johnson-2rch94` (cloud-pinned) | DONE |
| SRV-021 | Booking reference number + id utils | `claude/busy-johnson-2rch94` (cloud-pinned) | DONE |
| SRV-022 | Interfaces + stubs: OtpProvider, StorageProvider | `claude/busy-johnson-2rch94` (cloud-pinned) | DONE |
| SRV-023 | Interfaces + stubs: Notifier, PaymentProvider, AnalyticsProvider | `claude/busy-johnson-2rch94` (cloud-pinned) | DONE |
| SRV-024 | Schemas/repositories: customers, members, installations, refreshTokens, admins | `claude/busy-johnson-2rch94` (cloud-pinned) | DONE |
| SRV-025 | JWT access tokens + per-scope auth middleware | `claude/busy-johnson-2rch94` (cloud-pinned) | IN REVIEW |

Next task to start after SRV-025 is merged: **SRV-026** (SRV-011 is PENDING).

---

# 4. Tasks

## Stage A — Foundation
Project skeleton, cross-cutting plumbing, CI. Roadmap SRV-01.

| ID | Task | Branch | Needs (besides previous merged) | Status | Pending on / notes |
|---|---|---|---|---|---|
| SRV-001 | TypeScript strict project + ESLint (no `any`)/Prettier/Jest + folder layout of `WAB-Server/CLAUDE.md` §4 | `feat/srv-001-ts` | — | DONE | `package.json`, `tsconfig` strict, lint/format/test scripts; `src/{routes,config,constants,locales,middlewares,models,repositories,domain,modules/{customer,merchant,admin},jobs,sockets,utils}`; layering route → middleware → controller → service → repository → schema; sample test passes. |
| SRV-002 | Config/env loader (schema-validated, dev/prod) + `.env.example` (keys only) | `feat/srv-002-config` | — | DONE | Fails fast on missing/invalid env; no secrets committed; `.env.example` lists every key. |
| SRV-003 | Structured logger (`utils/logger`) with sensitive-field redaction + request id middleware | `feat/srv-003-logger` | — | DONE | `traceId` in every log and error response; tokens/OTP/passwords/card data/full phone/IBAN redacted; tested. |
| SRV-004 | Error model (`utils/errors`): `BaseError` + typed subclasses (Validation 400, Unauthorized 401, Forbidden 403, NotFound 404, Conflict 409, BusinessRule 422, RateLimit 429, Payment, ExternalService 502/503, Internal 500), error codes in `constants/` (BUSINESS_DOMAIN §11), `locales/ar.json` + `en.json`, `Accept-Language` middleware (default `ar`) | `feat/srv-004-errors` | — | DONE | Each error has `code`, `httpStatus`, `messageKey`, `details?`, `isOperational`; unit test fails if any locale key is missing in either language or empty. |
| SRV-004a | Global `errorHandler` + `notFound` + async wrapper (`utils/async`); maps Mongoose (`CastError`, `ValidationError`, `11000`→409), JWT, schema-validator, malformed JSON (400), payload too large (413), timeouts/provider failures (502/503); unknown errors → `INTERNAL_ERROR` 500 without leaking stack; process-level `unhandledRejection`/`uncaughtException` handlers and graceful `SIGTERM` shutdown (close HTTP, DB, Redis) | `feat/srv-004a-error-handler` | SRV-004 | DONE | One handler produces the base error envelope; every mapping unit-tested; stack/queries/provider payloads logged, never returned. |
| SRV-005 | Express app factory (`app.ts`, `server.ts`, `routes/index.ts`) mounting `/customer/v1` `/merchant/v1` `/admin/v1` + `validate` middleware (body/params/query/headers) | `feat/srv-005-app` | — | DONE | Schema validation on every input with field-level `details { field, code, message }`; modules never import across namespaces; supertest smoke tests. |
| SRV-005a | Base response helpers (`utils/response`): success `{ success, message, data, meta? }` (pagination `meta { page, pageSize, total }`) and error `{ success:false, message, error { code, details?, traceId } }`; pagination helper (`utils/pagination`, page sizes from constants/settings) | `feat/srv-005a-responses` | SRV-005 | DONE | Controllers never hand-write `res.json`; messages localized by request language; tests for success shape and paginated meta (the error body builder `buildErrorBody` already exists from SRV-004a). |
| SRV-006 | Health + readiness endpoints (Mongo/Redis checks pluggable) | `feat/srv-006-health` | — | DONE | `/health` liveness, `/ready` dependency checks; no auth. |
| SRV-007 | Security middleware: Helmet, CORS (admin domain from config), global rate limit, body-size limits, NoSQL-injection + XSS sanitizing | `feat/srv-007-security` | — | DONE | Each control has a unit/integration test; limits come from config. |
| SRV-008 | Swagger/OpenAPI generated from code + Postman collection export script (kept in repo) | `feat/srv-008-swagger` | — | DONE | `npm run docs` regenerates both; CI fails if stale. |
| SRV-009 | Dockerfile + docker-compose for local dev (Mongo, Redis, MinIO, SMTP sink) | `feat/srv-009-docker` | — | DONE | `docker compose up` gives a working local environment; no secrets in files. |
| SRV-010 | GitHub Actions CI: lint, typecheck, unit tests, `npm audit --omit=dev` (dev-only transitive advisories via jest/istanbul exist), secret scan (path-filtered to `WAB-Server/`) | `feat/srv-010-ci` | — | DONE | REMOVED by the owner on 2026-10-13: the server has no GitHub Actions workflow now; the local gate (format, lint, typecheck, build, test, audit, docs) is the only check. The contract-test job (SRV-111) needs a workflow again when `contracts/` exists. |
| SRV-011 | Deploy to dev environment (DigitalOcean) from `main` | `feat/srv-011-deploy-dev` | — | PENDING | DigitalOcean product (Droplet vs App Platform), managed Redis, platform domain, secrets store — **user input**. GitHub Actions deploy job + env/secret wiring. |

## Stage B — Data layer & shared utilities
Mongo/Redis plumbing, money/time, settings, seeds. Roadmap SRV-02.

| ID | Task | Branch | Needs (besides previous merged) | Status | Pending on / notes |
|---|---|---|---|---|---|
| SRV-012 | Mongo connection + base repository (typed CRUD, pagination, soft-delete) + test strategy | `feat/srv-012-mongo` | — | DONE | Tests must run offline: in-memory repository fakes for unit tests; `mongodb-memory-server` for integration tests only if it can be downloaded (no `mongod` binary on the cloud runner). |
| SRV-013 | Redis client + distributed lock helper (acquire/renew/release, TTL) | `feat/srv-013-redis` | — | DONE | Used for staff/slot locks; tested with ioredis-mock or local `redis-server`. |
| SRV-014 | Redis counter/flag helpers for rate limits and blocks (TTL counters) | `feat/srv-014-ratelimit` | — | DONE | Generic `hit/limit/block` used by OTP, login and payments. `createLimiter` (atomic fixed window + optional block, shared block between limiters), `startCooldown`, flags, `RedisRateLimitStore` for the global HTTP limit (fail-open); Redis outages map to 503. |
| SRV-015 | Money utils: integer fils, JOD 3-decimal string (de)serialization, half-up rounding | `feat/srv-015-money` | — | DONE | Never floats; property-style tests for rounding. `isFils/assertFils/sumFils/mulDivRound/percentOf` + `formatJod/parseJod/isJodString` in `utils/money`; constants in `constants/money.ts`. |
| SRV-016 | Time utils: UTC storage, Asia/Amman day boundaries, `HH:mm` parsing, DST-safe ranges | `feat/srv-016-time` | — | DONE | Config-driven timezone; tests around midnight/day change. `utils/time`: `HH:mm`, calendar dates, `localDateOf/localMinutesOf/zonedTimeToUtc/localDayRange(…, timeZone)`, half-open `rangesOverlap/containsInstant`; constants in `constants/time.ts`. 12-hour AM/PM text + numerals-follow-language belong to the message-formatting task. |
| SRV-017 | Settings model + service + Redis cache + defaults (BUSINESS §10), typed accessors | `feat/srv-017-settings` | SRV-012, SRV-013 | DONE | Every limit in code reads from settings; admin edit endpoint comes later (`admin-settings`). |
| SRV-017a | Create indexes at startup: model registry (`models/index.ts`) + create-only `ensureIndexes` (never drops) wired in `main()` | `feat/srv-017a-indexes` | SRV-017 | DONE | Production runs with `autoIndex: false`, so schema-declared unique indexes (`settings.key`, later `customers.phone`, `refreshTokens.tokenHash`…) must be created explicitly. |
| SRV-018 | Seed script: settings, countries, cities/areas (Jordan) | `feat/srv-018-seed-ref` | SRV-017 | DONE | Idempotent; real city/area names supplied or default to a documented starter set. |
| SRV-019 | Seed script: demo catalog services (men/women, ar/en) for dev | `feat/srv-019-seed-catalog` | SRV-018 | DONE | Dev-only; flagged as demo data. |
| SRV-020 | Audit-log writer (append-only, before/after, reason, IP) + server-events writer | `feat/srv-020-audit` | SRV-012 | DONE | No update/delete API on `auditLogs`; tests prove immutability. |
| SRV-021 | Booking reference number (`WAB-XXXXXX` base32, no ambiguous chars) + id utils | `feat/srv-021-refnum` | — | DONE | Collision-safe via unique index + retry. |

## Stage C — Provider interfaces & in-repo stubs
Abstractions the server depends on, with fakes, so no task waits for an SDK (ROADMAP §2). Real providers are separate PENDING tasks.

| ID | Task | Branch | Needs (besides previous merged) | Status | Pending on / notes |
|---|---|---|---|---|---|
| SRV-022 | Interfaces + stubs: `OtpProvider` (verify Firebase ID token + phone match), `StorageProvider` (presign/confirm/sign/delete/CDN URL) | `feat/srv-022-if-otp-storage` | — | DONE | Typed interfaces/errors; fake impl selected by config (`*_PROVIDER=fake|real`). |
| SRV-023 | Interfaces + stubs: `Notifier` (push/email), `PaymentProvider` (session/verify/refund/webhook), `AnalyticsProvider` (record/query) | `feat/srv-023-if-notify-pay-analytics` | — | DONE | Fake payment provider supports success/fail/cancel/pending/refund-fail scenarios. |

## Stage D — Identity & access
Three token scopes. Roadmap SRV-03.

| ID | Task | Branch | Needs (besides previous merged) | Status | Pending on / notes |
|---|---|---|---|---|---|
| SRV-024 | Schemas/repositories: customers, members, installations, refreshTokens, admins (indexes per BUSINESS §3.1) | `feat/srv-024-schemas-auth` | SRV-012 | DONE |  |
| SRV-025 | JWT access tokens (short TTL from settings) + per-scope auth middleware (customer/merchant/admin never interchangeable) | `feat/srv-025-jwt` | SRV-024 | IN REVIEW | Customer token on merchant/admin route → `FORBIDDEN`; tests for all 3×3 combos. |
| SRV-026 | Refresh tokens: hashed storage, rotation, family revocation on reuse, logout, logout-all | `feat/srv-026-refresh` | SRV-025 | DONE |  |
| SRV-027 | OTP pre-check endpoint + platform limits (5 req/5 min → 15 min block; 5 wrong → 15 min block) + `otpLength` + resend timing; report-wrong-attempt endpoint | `feat/srv-027-otp-precheck` | SRV-014, SRV-022 | DONE | Values from settings; `OTP_BLOCKED`, `RATE_LIMITED` codes. |
| SRV-028 | Customer register/login/phone-change/booking-confirmation via Firebase ID token (stub verifier) → platform JWT + refresh | `feat/srv-028-customer-auth` | SRV-027, SRV-026 | DONE | Phone match enforced; blocked/deleted accounts handled (`ACCOUNT_BLOCKED`). Booking-confirmation OTP is deferred to the booking-draft task (needs the draft); the gate and provider are ready. |
| SRV-029 | Merchant member login (phone lookup, `PHONE_NOT_REGISTERED`) via Firebase ID token; token carries `salonId` + permissions | `feat/srv-029-merchant-auth` | SRV-028 | DONE | JWT carries member + scope only; role/salon/permissions are returned in the profile and loaded from the database per request (SRV-025 decision). Member change-phone comes with the profile task. |
| SRV-030 | Admin login: bcrypt password, lockout after N failures, session idle timeout | `feat/srv-030-admin-auth` | SRV-025 | DONE | Service + refresh/logout routes only: the password-only login route would open a session without the second factor, so `POST /admin/v1/auth/login` + `verify-otp` ship together in SRV-031. Alert email on a new-device login needs the Notifier and joins SRV-031. |
| SRV-030a | Admin bootstrap: `npm run seed:admin` creates the single admin from `ADMIN_EMAIL` + a password read from a prompt or env (never stored in the repo), bcrypt via `hashPassword`; refuses if an admin exists | `feat/srv-030a-admin-bootstrap` | SRV-030 | DONE | Run `ADMIN_EMAIL=… ADMIN_PASSWORD=… npm run seed:admin` (password ≥ 12 chars, from the environment only). |
| SRV-031 | Admin email OTP (2FA) via `Notifier` stub | `feat/srv-031-admin-2fa` | SRV-030, SRV-023 | DONE |  |
| SRV-032 | Account blocking (admin), customer deletion request → 30-day grace → restore on login; purge/anonymize function; member deactivation revokes tokens | `feat/srv-032-account-lifecycle` | SRV-026 | DONE | Domain service only (`createAccountLifecycleService`): the admin block endpoint comes with the admin customers task (it passes an `AdminActor` for the audit entry), the customer delete-account endpoint with SRV-065, the daily `accounts:purge` trigger with the jobs task. Notifying the affected parties joins the notification tasks. |
| SRV-033 | Installation register/update (Firebase app-instance id, FCM token, push toggle) + guest→account identity link | `feat/srv-033-installations` | SRV-024 | DONE | `PUT /customer/v1/installations` (guests allowed, a valid token also links the account and the analytics identity), `PUT /merchant/v1/installations` (member token), `PATCH /customer/v1/installations/push-enabled` (account switch). A push token belongs to one device. |
| SRV-034 | Real Firebase ID-token verification (`wab-otp` / firebase-admin) replacing the stub | `feat/srv-034-firebase-real` | — | PENDING | Firebase project service account (dev/prod) and/or `wab-otp` package published — **user input / other SDK**. |

## Stage E — Reference data & app config
Roadmap SRV-04.

| ID | Task | Branch | Needs (besides previous merged) | Status | Pending on / notes |
|---|---|---|---|---|---|
| SRV-035 | App config endpoint: version policy (min/latest/optional), maintenance, nearby radius, contact info | `feat/srv-035-app-config` | SRV-017 | DONE | `GET /customer/v1/config` and `/merchant/v1/config` (public; `platform`, `version`): update status OK/UPDATE_AVAILABLE/UPDATE_REQUIRED + store URL, maintenance (localized), nearby radius, OTP length/resend, contact info. Enforcing maintenance/forced update on other routes is NOT included. |
| SRV-036 | Public endpoints: countries, cities, areas (localized) | `feat/srv-036-ref-public` | SRV-018 | DONE | `GET /{customer|merchant}/v1/locations/countries`, `/cities?countryCode`, `/areas?cityId` (public, active only, admin order, localized; flag URL from storage). Lists are not paginated: small bounded admin-curated reference data. |
| SRV-037 | Public content: privacy/terms/about, FAQ, contact info per app | `feat/srv-037-content-public` | SRV-005 | DONE | `GET /{customer|merchant}/v1/content/pages/{privacy|terms|about}` (404 until the admin writes it) and `/content/faqs` (admin order), localized. Contact info is already served by `GET /config` (SRV-035). |
| SRV-038 | Admin CRUD: countries/cities/areas, content pages, FAQ, contact info, app versions, maintenance (with audit + reason) | `feat/srv-038-ref-admin` | SRV-020, SRV-030 | DONE | Part 1 DONE: `/admin/v1/locations/{countries,cities,areas}` list/get/create/patch (reason + audit, no delete, `active=false` switches off) on the generic `createAdminCrud` + `createAdminCrudRouter`. Parts 2-3: `/admin/v1/content/{pages,faqs,contact-info}` and `/admin/v1/app-config/{versions,maintenance}` on the same CRUD (minSupported <= latest enforced; app/kind/platform immutable). |
| SRV-039 | Banners: admin CRUD + active-by-gender query | `feat/srv-039-banners` | SRV-038 | DONE | `GET /customer/v1/banners?gender=` (public, live window start<=now<end, audience + BOTH, order, image of the request language) and admin CRUD `/admin/v1/banners` (action/value consistency, end after start). |

## Stage F — Salon domain
Catalog, application, lifecycle, profile, team, staff, policies. Roadmap SRV-05.

| ID | Task | Branch | Needs (besides previous merged) | Status | Pending on / notes |
|---|---|---|---|---|---|
| SRV-040 | Catalog services: admin CRUD + list by gender (paginated, localized) | `feat/srv-040-catalog` | SRV-020 | DONE | `GET /{customer|merchant}/v1/catalog/services?gender=` (paginated, localized, active only) and admin CRUD `/admin/v1/catalog/services` (gender fixed after creation). |
| SRV-041 | Salon schema + owner registration/application create & resubmit (license docs keys, member OWNER created) | `feat/srv-041-salon-apply` | SRV-029 | DONE | `POST /merchant/v1/salon/applications` (public, phone proof; creates PENDING salon + OWNER + session), `GET /merchant/v1/salon/application` (owner: state + rejection reason), `POST .../application/resubmit` (rejected only). Document keys are validated by format only until uploads (SRV-046). |
| SRV-042 | Admin approve/reject application with reason; subscription TRIAL created on approval; notifications via stub | `feat/srv-042-salon-review` | SRV-041, SRV-020 | DONE | `/admin/v1/salons/applications` list (oldest first, state filter), `/:id` (signed license URLs), `POST /:id/approve|reject` (reason required, audited, atomic from PENDING). Approval: `APPROVED_INCOMPLETE` + TRIAL subscription (`subscription.trialDays`). Owner notification is a logging placeholder until SRV-093. |
| SRV-043 | Completeness engine (`missing[]`, isComplete) + salon state machine (APPROVED_INCOMPLETE ↔ LIVE, OFFLINE) + `SALON_NOT_BOOKABLE` rule | `feat/srv-043-completeness` | SRV-042 | DONE | `computeMissing` (pure), `createSalonStateService` (`recompute` after profile writes, admin `setOffline/setOnline`), `assertSalonBookable`/`isCustomerVisible`, admin `POST /admin/v1/salons/:id/offline|online`; approval now lands on LIVE when already complete. Service-count fact is 0 until salon services exist (SRV-050); owner messages are a logging placeholder until SRV-093. |
| SRV-044 | Permission model + enforcement middleware (15 keys, owner-only never grantable, default templates) | `feat/srv-044-permissions` | SRV-029 | DONE | `loadMember(members)` (member re-read per request, sets `req.member`) + `requirePermission(keys, 'all'|'any')` + `requireOwner`; `normalizeGrant` (owner-only keys never grantable), `ROLE_TEMPLATES` (MANAGER, EMPLOYEE), `defaultPermissionsFor`. No endpoint uses them yet: every merchant route from SRV-045 on does. |
| SRV-045 | Salon profile/location/contacts endpoints (permission + ownership checks) | `feat/srv-045-salon-profile` | SRV-044, SRV-043 | DONE | `GET /merchant/v1/salon` (any active member) and `PATCH /merchant/v1/salon/profile` (`SALON_PROFILE_MANAGE`): name, description, cover/profile keys, location (GeoJSON [lng,lat]), location text, city/area, phone, WhatsApp; `null` clears optional fields; completeness recomputed after every save (may go LIVE). Image upload itself is SRV-046; keys are format-checked only. |
| SRV-046 | Uploads module: presign (type/size/purpose/expiry), confirm, private license docs signed URL (admin) | `feat/srv-046-uploads` | SRV-022 | DONE | `POST /{customer,merchant,admin}/v1/uploads/presign|confirm` + public `POST /merchant/v1/uploads/license/presign|confirm` (private license documents before the salon applies). Per-purpose policy (`UPLOAD_POLICIES`): content types, max size from `uploads.*MaxMb`, scope/permission, server-generated keys, 5-min URL, `uploads` collection (PENDING auto-expires). `UploadVerifier.assertConfirmed` now guards license keys on apply/resubmit and cover/profile keys on the profile edit. Admin license URLs were already in SRV-042. |
| SRV-047 | Image size variants (thumbnails) generated after upload confirmation (sharp, async), keys stored beside original | `feat/srv-047-image-variants` | SRV-046 | DONE | Runs behind `StorageProvider` hook; works with local MinIO/fake; private docs excluded. Done: `StorageProvider.read/write`, `createImageVariants` (sharp: WebP `_thumb` 320 px and `_medium` 960 px beside the original, EXIF rotation applied, metadata dropped, never enlarged), `variantKey(key, name)`; started in the background after a public image upload is confirmed. |
| SRV-048 | Gallery images/videos CRUD + ordering | `feat/srv-048-gallery` | SRV-047, SRV-045 | DONE | `/merchant/v1/salon/gallery` (GALLERY_MANAGE): list, add (confirmed GALLERY_IMAGE/VIDEO upload of this salon; video <= `uploads.videoMaxSec`, optional poster), `PUT /order` (every id once), `DELETE /:id` (record + files + variants). Max 100 items (assumption). Customer-facing gallery data comes with the salon details endpoint. |
| SRV-049 | Weekly schedule + exceptional closures + open/closed & today's-hours calculation (Amman) | `feat/srv-049-hours` | SRV-016, SRV-045 | DONE | `/merchant/v1/salon/hours` (WORKING_HOURS_MANAGE): GET (schedule, upcoming closures, today), `PUT /weekly` (7 days, slot-aligned, close > open), closures POST/PATCH/DELETE (future only). Pure `todaysHours`/`closureOn` for open-now and today's hours (Asia/Amman, from settings). `SCHEDULE_CONFLICT` hook (`ScheduleConflicts`) finds nothing until bookings exist. Closures use civil dates `YYYY-MM-DD`. |
| SRV-050 | Salon services CRUD (price fils, duration multiple of 5, bride-only only for women's salons) + catalog requests (+ admin decision) | `feat/srv-050-salon-services` | SRV-040, SRV-045 | DONE | `/merchant/v1/salon/services` (SERVICES_MANAGE): list (paginated), add (catalog service of the salon's gender, price JOD string -> fils > 0, duration multiple of 5, bride-only women's salons only, media = confirmed SERVICE_MEDIA), patch (incl. `active=false`; no delete). Salon completeness now counts active services (SERVICE fact is real). Catalog requests: merchant `POST/GET /merchant/v1/catalog/requests`; admin `GET /admin/v1/catalog/requests`, `POST /:id/approve|reject` (reason, audit; approve creates the catalog service). |
| SRV-051 | Members CRUD, roles, permission editor, deactivate (revoke tokens), LAST_OWNER rule | `feat/srv-051-members` | SRV-044, SRV-026 | DONE | `/merchant/v1/team/members`: list/get (STAFF_MANAGE), create/patch/deactivate/reactivate (OWNER only). Role template or explicit grant (`normalizeGrant`), phone unique across salons, MEMBER_PHOTO verified, deactivation ends sessions + detaches devices, OWNER's role/permissions/activation locked (LAST_OWNER). Staff profile fields are SRV-052; changing a member's phone (needs OTP on the new number) is not included. |
| SRV-052 | Staff profile: providesServices, skills (service ids), bride qualification, working days/custom hours within salon hours | `feat/srv-052-staff` | SRV-051, SRV-049, SRV-050 | DONE | `GET|PUT /merchant/v1/team/members/:id/staff` (STAFF_MANAGE): providesServices, bio, years, skills (salon service ids), bride qualification (women's salons), working days = open salon days with optional custom hours inside the salon hours (slot grid); completeness recomputed; rating/customersCount kept when switched off. `StaffConflicts` hook (no bookings yet). |
| SRV-053 | Staff leaves CRUD | `feat/srv-053-leaves` | SRV-052 | DONE | `GET|POST /merchant/v1/team/members/:id/leaves`, `PATCH|DELETE .../leaves/:leaveId` (STAFF_MANAGE): civil dates, `to` inclusive, not in the past, change/remove only before the start; `LeaveConflicts` hook (no bookings yet). |
| SRV-054 | Salon policies (cancellation window, payment options, deposit %, refund/no-show rules) with validation | `feat/srv-054-policies` | SRV-045 | DONE | `GET|PUT /merchant/v1/salon/policy` (POLICIES_MANAGE): cancellation window 0-720 h, payment options (>=1, unique), deposit % 1-100 required with DEPOSIT, refund/no-show rules, notes; whole-policy replace; completeness recomputed; applies to new bookings (snapshot). |
| SRV-055 | Admin salon actions: set Offline/Live with reason, edit gender, notify owner, audit | `feat/srv-055-salon-admin-actions` | SRV-043, SRV-020 | DONE | Offline/Online were done in SRV-043. Added: `GET /admin/v1/salons` (filters state/gender/city/name, subscription status), `GET /admin/v1/salons/:id` (overview: completeness, owner, subscription, offline reason), `PATCH /admin/v1/salons/:id/gender` (reason, audit `SALON_CHANGE_GENDER`, owner notified, services switched off, bride flags cleared for a men's salon). Recommended flag is SRV-066; deletion requests and push to owner come later. |
| SRV-056 | Conflict detection API (§5.12): list upcoming PENDING/APPROVED bookings violated by hours/closure/leave/skill/member change — pure function + `SCHEDULE_CONFLICT` 409 | `feat/srv-056-conflict-preview` | SRV-049, SRV-052, SRV-053 | DONE | Returns affected bookings only; bulk resolution is `conflict-resolve` (after booking engine). Uses booking repository interface (empty until booking tasks). Done: pure checks (`weeklyConflicts`, `closureConflicts`, `leaveConflicts`, `staffConflicts`, `deactivationConflicts`) over a `BookingLookup`; `createConflictFinder` is wired into hours, closures, staff profile, leaves, member deactivation and the admin gender change, each answering 409 `SCHEDULE_CONFLICT` with the booking ids. `BookingLookup` is `noBookings` until the booking module (SRV-071) supplies the real one. |

## Stage G — Discovery
Roadmap SRV-06.

| ID | Task | Branch | Needs (besides previous merged) | Status | Pending on / notes |
|---|---|---|---|---|---|
| SRV-057 | Salon search: filters (all selected services offered, sum of selected prices in range, min rating, recommended) + pagination, using Mongo text/regex fallback | `feat/srv-057-search-basic` | SRV-050, SRV-043 | DONE | Only LIVE + complete salons; gender scoped. Done: `GET /customer/v1/salons` (name regex on `searchText`, all selected services, SUM price range, min rating, RECOMMENDED via `RecommendedLookup`, `isFavorite` via `FavoriteLookup`, optional auth) and `/salons/filters` price bounds; own limiter (300/min/IP). Lookups are no-op until SRV-066/062. |
| SRV-058 | Nearest sorting within admin radius (2dsphere), distance in results | `feat/srv-058-search-nearest` | SRV-057, SRV-017 | DONE | `lat`/`lng` (+ `sort=NEAREST|RATING`) on the search: `$geoWithin $centerSphere` inside `discovery.nearbyRadiusKm`, ordered by haversine distance, `distanceKm` on every card. |
| SRV-059 | Atlas Search (Arabic + English analyzers) behind a `SalonSearch` interface, swapped by config | `feat/srv-059-search-atlas` | — | PENDING | MongoDB Atlas cluster tier/connection (Atlas Search needs Atlas) — **user input**. Interface + fallback already exist from `search-basic`. |
| SRV-060 | Salon details (hours, staff list, services & prices, gallery, rating, open/closed) + staff detail | `feat/srv-060-salon-details` | SRV-048, SRV-052, SRV-054 | DONE | `GET /customer/v1/salons/:salonId` (profile, today's status, weekly hours, upcoming closures, staff with ON_DUTY/ON_LEAVE/DAY_OFF, active services with prices, gallery, `isFavorite`) and `/salons/:salonId/staff/:memberId`. Only LIVE + complete salons (else 404 `SALON_NOT_FOUND`). Reviews preview arrives with SRV-063. |
| SRV-061 | Home aggregate per gender (banners, services, recommended, nearest, unread count) | `feat/srv-061-home` | SRV-039, SRV-058, SRV-040 | DONE | `GET /customer/v1/home?gender=&lat=&lng=` (optional auth): first name, unread count (guest null; 0 until SRV-093), live banners, services, recommended and nearest salon sections (10 each + `hasMore`; `nearest` null without a position). |
| SRV-062 | Favorites add/remove/list | `feat/srv-062-favorites` | SRV-060 | DONE | `GET/PUT/DELETE /customer/v1/favorites[/:salonId]` (customer token): idempotent add (only LIVE + complete salons), idempotent remove, paginated cards newest first. `favorites` collection with a unique `{customerId, salonId}` pair; the real `FavoriteLookup` now feeds `isFavorite` in search, details and home. |
| SRV-063 | Reviews: submit (salon + staff independent), list published, rate-limit per target | `feat/srv-063-reviews` | SRV-060 | DONE | `reviews` collection (PENDING until admin approval, no booking needed). `POST /customer/v1/salons/:salonId/reviews` and `/staff/:memberId/reviews` (customer token, rating 1-5 integer, comment <= 1000; ACTIVE customers only; 429 beyond `reviews.maxPendingPerTargetPerCustomer` pending per target; staff must be an active service provider of the salon); public paginated `GET` of approved reviews with the rating summary; salon and staff sheets carry the latest 3. Moderation and rating recompute: SRV-064. |
| SRV-064 | Admin review moderation (approve/reject/remove) + rating recompute for salon & staff | `feat/srv-064-reviews-moderation` | SRV-063, SRV-020 | DONE | `/admin/v1/reviews`: queue (pending oldest first; other statuses newest first; filters target/salon/staff/rating, author's other reviews count), `POST /:id/approve|reject` (reason optional), `POST /:id/remove` (reason required, APPROVED -> REMOVED), `POST /bulk` (<= 100, per-review result). Atomic status moves (`ALREADY_HANDLED` 422), audit entry per decision, salon/staff rating recomputed (avg of APPROVED, 1 decimal, count) when a review enters or leaves APPROVED. |
| SRV-065 | Customer profile get/update, avatar upload/delete, cities/areas selection, delete-account endpoint | `feat/srv-065-customer-profile` | SRV-028, SRV-046, SRV-032 | DONE | `/customer/v1/profile` (customer token): `GET`, `PATCH` (name, email, gender, city+area validated together, language; phone only via `/auth/change-phone`), `PUT/DELETE /avatar` (confirmed CUSTOMER_AVATAR upload owned by the customer; old file removed), `DELETE /` = delete account (30-day grace via the lifecycle service, sessions ended). Cities/areas lists already exist (SRV-036). |
| SRV-066 | Recommended placements model + admin CRUD + 'recommended' filter source | `feat/srv-066-placements` | SRV-055 | DONE | `recommendedPlacements` model + `/admin/v1/recommended`: list (gender/status/salon filters, derived SCHEDULED/ACTIVE/ENDED), add (audience = the salon's gender, end after start, no overlap per salon, amount as JOD string), edit, `POST /:id/end`, `PUT /reorder`; audited. The same service is the `RecommendedLookup` of the search/home: active now (start inclusive, end exclusive), in the admin's order. Expired ones disappear by date, so the `placements:expire` job (SRV-0xx jobs) has nothing to do for correctness. |

## Stage H — Booking engine
Roadmap SRV-07. Pure functions first, then orchestration.

| ID | Task | Branch | Needs (besides previous merged) | Status | Pending on / notes |
|---|---|---|---|---|---|
| SRV-067 | Pricing & deposit calculator (subtotals, totals, deposit half-up, dueOnline, remaining) | `feat/srv-067-pricing` | SRV-015 | DONE | Pure `calculateAmounts({persons, paymentOption, depositPercentage?})` in `domain/pricing`: per-person subtotal and duration, total, deposit (half-up, rounded once on the total), `dueOnline` (deposit / total / 0), `remaining = total - dueOnline`. No endpoint. |
| SRV-068 | Availability core (pure): slots every 15 min, 90 days, staff eligibility, busy intervals, any-staff pick, bride rules | `feat/srv-068-availability-core` | SRV-049, SRV-052, SRV-053 | DONE | Heavily unit-tested incl. Amman midnight, leaves, bride, multi-person. Done: pure `computeAvailability` (one person, one day: PAST / TOO_FAR / CLOSED, grid from opening while the duration fits, lead time, eligible staff = active + provides services + works that weekday + no leave + ALL services + bride rules + chosen staff, custom hours narrow the salon hours, half-open busy times) and `pickAnyStaff`. Multi-person: the caller asks person by person and passes earlier picks as busy times. |
| SRV-069 | Availability endpoint: slots + eligible staff per person (reads PENDING/APPROVED + Redis holds) | `feat/srv-069-availability-api` | SRV-068, SRV-013 | DONE | `POST /customer/v1/salons/:salonId/availability` (customer token; a read, POST for the body): one person (`serviceIds` = SALON service ids, `isBride`, optional `staffId`) + `others` (picks of the other persons of the draft) + optional `draftId` -> slots with `available` and `eligibleStaffIds`, `reason` PAST/TOO_FAR/CLOSED. Busy = existing bookings (`BookingBusyLookup`, empty until SRV-071) + live Redis payment holds (`createHoldsStore`: sorted set `hold:<staffId>:<date>`, score = expiry; place/release/busy) + the other persons' picks. Also fixed a bug of SRV-060: `staff.serviceIds` are SALON service ids, so the staff sheet now looks services up by `_id` (and returns the salon service `id`). |
| SRV-070 | Booking draft: validate gender/companions/services/bride, price + policy snapshot, Redis holds, TTL expiry | `feat/srv-070-booking-draft` | SRV-067, SRV-069 | DONE | `POST/GET/DELETE /customer/v1/bookings/drafts[/:id]` (customer token). Create validates + prices + holds in one step: `AvailabilityService.plan` checks persons in order (each pick blocks the next; "any staff" -> least busy), domain errors SALON_NOT_BOOKABLE / TOO_MANY_COMPANIONS / GENDER_MISMATCH / SERVICE_UNAVAILABLE / BRIDE_ONLY_SERVICE / STAFF_NOT_ELIGIBLE / SALON_CLOSED / DATE_OUT_OF_RANGE / SLOT_UNAVAILABLE / PAYMENT_OPTION_NOT_ALLOWED; prices and the salon policy are snapshotted into `bookingDrafts` (TTL index on `expiresAt`); Redis holds for `booking.paymentHoldMinutes`; per-salon-date Redis locks make concurrent drafts safe; one draft per customer (a new one replaces and frees the old). Expired -> `DRAFT_EXPIRED`. |
| SRV-071 | Atomic booking creation (Mongo transaction + per-staff Redis lock + re-validation) for PAY_ON_ARRIVAL; reference number; status history[0]; OTP gate (BOOKING_CONFIRMATION) | `feat/srv-071-booking-create` | SRV-070, SRV-021, SRV-028 | DONE | Concurrency test: two parallel creates for the same staff/slot → exactly one succeeds (`SLOT_TAKEN`). Done: `POST /customer/v1/bookings/drafts/:id/verify-otp` (Firebase proof for the customer's own phone, purpose BOOKING_CONFIRMATION -> `otpVerifiedAt`) and `POST /customer/v1/bookings {draftId}` (PAY_ON_ARRIVAL drafts only until SRV-085; OTP required, expired -> `DRAFT_EXPIRED`): re-validates everything with `availability.plan` under `lock:staff:<id>:<date>` locks (a lost slot -> 409 `SLOT_TAKEN`) plus an overlap check, then inserts the PENDING booking (`WAB-XXXXXX` reference, `statusHistory[0]`, money, `respondBy` = start + `booking.autoCancelAfterStartMinutes`, policy snapshot), frees the holds and deletes the draft. `BookingsRepository` is now the real `BookingBusyLookup` for availability and the real `BookingLookup` for the schedule-conflict checks (409 `SCHEDULE_CONFLICT` now sees real bookings). No Mongo transaction yet (single-document insert; the ledger/transaction writes of SRV-085 need one). Notifications, sockets and jobs hook in through `BookingCreatedHook` (SRV-081/093/096). |
| SRV-072 | Booking state machine core (transition table §5.7, actor/permission/precondition checks, history, `INVALID_TRANSITION`, `ALREADY_HANDLED`) | `feat/srv-072-state-machine` | SRV-071 | IN REVIEW | Pure `applyTransition({facts, to, actor, reason, now})` in `domain/bookings/stateMachine.ts`: the §5.7 table with actor type, member permission (RESPOND/OPERATE), mandatory reasons, clock checks (customer cancel window, salon cancel before start, complete/no-show from start, auto-cancel from `respondBy`); errors INVALID_TRANSITION / ALREADY_HANDLED / CANCELLATION_WINDOW_PASSED / PERMISSION_DENIED; ADMIN any move with a reason. Returns the history entry; persistence and side effects come with SRV-073+. |
| SRV-073 | Merchant actions: approve (re-check staff free), reject (reasonCode), complete, no-show (not before start), salon cancel (reason) with permission checks | `feat/srv-073-merchant-actions` | SRV-072, SRV-044 | TODO |  |
| SRV-074 | Customer cancel: PENDING anytime; APPROVED within window (`CANCELLATION_WINDOW_PASSED`); refund amount calculator §5.8 (refund execution wired in money stage) | `feat/srv-074-customer-cancel` | SRV-072 | TODO |  |
| SRV-075 | No-show refund calculator §5.9 | `feat/srv-075-noshow-refund` | SRV-072 | TODO |  |
| SRV-076 | Reassign staff for APPROVED booking (eligibility re-check, notify old/new) | `feat/srv-076-reassign` | SRV-073, SRV-068 | TODO |  |
| SRV-077 | Booking list/detail/search/filter/status-history per actor (customer; merchant scoped VIEW_ALL / VIEW_OWN; admin) + merchant calendar data | `feat/srv-077-booking-queries` | SRV-072, SRV-044 | TODO |  |
| SRV-078 | Admin booking actions: any transition with mandatory reason, audit, irregular-transition warning flag | `feat/srv-078-admin-booking` | SRV-072, SRV-020 | TODO |  |
| SRV-079 | Conflict resolution: bulk cancel (reasons, full refunds) or per-booking reassign after schedule/leave/staff change | `feat/srv-079-conflict-resolve` | SRV-056, SRV-076, SRV-073 | TODO |  |

## Stage I — Real-time
Roadmap SRV-08.

| ID | Task | Branch | Needs (besides previous merged) | Status | Pending on / notes |
|---|---|---|---|---|---|
| SRV-080 | Socket.IO server + Redis adapter + handshake auth per scope (reject cross-scope) | `feat/srv-080-socket-core` | SRV-025, SRV-013 | TODO |  |
| SRV-081 | Rooms (`customer:`, `salon:{id}:respond|all`, `member:`, `admin`) + permission-filtered `booking.requested/updated/assigned` emitted from the state machine | `feat/srv-081-socket-booking` | SRV-080, SRV-072 | TODO | Test: member without BOOKINGS_RESPOND never receives `booking.requested`. |
| SRV-082 | `notifications.unread`, `permissions.updated`, `access.revoked` events; room membership refresh on permission change | `feat/srv-082-socket-misc` | SRV-081, SRV-051 | TODO |  |

## Stage J — Payments, refunds, ledger, payouts, subscriptions
Roadmap SRV-09. Built on `PaymentProvider` fake; real gateway is PENDING.

| ID | Task | Branch | Needs (besides previous merged) | Status | Pending on / notes |
|---|---|---|---|---|---|
| SRV-083 | Transactions model + payment session create (idempotency key) + server-side verify (status query) + attempt log with gateway codes | `feat/srv-083-transactions` | SRV-023, SRV-070 | TODO |  |
| SRV-084 | Payment webhook endpoint: signature verification, idempotent processing, polling fallback job hook | `feat/srv-084-webhook` | SRV-083 | TODO |  |
| SRV-085 | Paid booking flow: draft → pay → verify → atomic create; failed payment never creates booking; `SLOT_TAKEN` after payment → immediate full refund | `feat/srv-085-paid-booking-flow` | SRV-084, SRV-071 | TODO |  |
| SRV-086 | Refund service: REFUND_PENDING → REFUNDED/FAILED, idempotent, retry with backoff, manual completion by admin; wired to rejects/cancels/auto-cancel/no-show | `feat/srv-086-refunds` | SRV-085, SRV-074, SRV-075, SRV-073 | TODO |  |
| SRV-087 | Ledger (append-only) + salon balance + gateway fees deducted | `feat/srv-087-ledger` | SRV-086 | TODO |  |
| SRV-088 | Manual payouts: create period, compute gross/fees/refunds/net, record transfer, notify | `feat/srv-088-payouts` | SRV-087 | TODO |  |
| SRV-089 | Subscriptions (manual): trial, record payment, expiry transitions function, admin Offline decision stays manual | `feat/srv-089-subscriptions` | SRV-042, SRV-020 | TODO |  |
| SRV-090 | Salon payout bank details: AES-GCM encryption, owner-only, OTP-protected change | `feat/srv-090-bank-details` | SRV-044, SRV-027 | TODO |  |
| SRV-091 | Merchant finance endpoints (transactions, refunds, payouts, balance) + subscription status | `feat/srv-091-merchant-finance` | SRV-088, SRV-089 | TODO |  |
| SRV-092 | Real payment gateway provider (HyperPay candidate) + sandbox config; `wab-payments` swap | `feat/srv-092-gateway-real` | — | PENDING | Gateway selection + sandbox/live credentials, or `wab-payments` published — **user input / other SDK**. |

## Stage K — Notifications & scheduled jobs
Roadmap SRV-10.

| ID | Task | Branch | Needs (besides previous merged) | Status | Pending on / notes |
|---|---|---|---|---|---|
| SRV-093 | Notification service: templates ar/en per event (BUSINESS §8), recipient resolution by permission, in-app store always, push respects `pushEnabled` | `feat/srv-093-notif-core` | SRV-023, SRV-044, SRV-033 | TODO |  |
| SRV-094 | Notification endpoints (customer + merchant): list with filters/pagination, mark read, unread count | `feat/srv-094-notif-api` | SRV-093 | TODO |  |
| SRV-095 | BullMQ setup, deterministic job ids, retry/backoff, dead-letter visibility | `feat/srv-095-bullmq` | SRV-013 | TODO |  |
| SRV-096 | Per-booking jobs: reminders 60/15 min, pending alert 30 min, auto-cancel at respondBy (full refund); add/remove on every status change | `feat/srv-096-booking-jobs` | SRV-095, SRV-072, SRV-086, SRV-093 | TODO |  |
| SRV-097 | Periodic jobs: subscriptions check, placements expiry, accounts purge, draft expiry, refund retry/delay alert | `feat/srv-097-periodic-jobs` | SRV-095, SRV-089, SRV-066, SRV-032 | TODO |  |
| SRV-098 | High-priority merchant booking-request data message (Android overlay / iOS time-sensitive + Accept/Reject action payload), dedupe by booking id | `feat/srv-098-merchant-push` | SRV-093, SRV-081 | TODO |  |
| SRV-099 | Promotional push campaigns: audience targeting, scheduling, stats | `feat/srv-099-campaigns` | SRV-093, SRV-095 | TODO |  |
| SRV-100 | Real FCM + Gmail SMTP providers (`wab-notifications`) replacing stubs | `feat/srv-100-notify-real` | — | PENDING | Firebase project/service account, Gmail App Password, or `wab-notifications` published — **user input / other SDK**. |

## Stage L — Admin APIs, analytics, alerts, reports
Roadmap SRV-11. Namespace `/admin/v1`.

| ID | Task | Branch | Needs (besides previous merged) | Status | Pending on / notes |
|---|---|---|---|---|---|
| SRV-101 | Admin customers: list/search/detail, block/unblock with reason, delete, journey link | `feat/srv-101-admin-customers` | SRV-032, SRV-020 | TODO |  |
| SRV-102 | Admin salons & applications queue: list/filter/detail, license signed URL, approve/reject, members view | `feat/srv-102-admin-salons` | SRV-042, SRV-055, SRV-046 | TODO |  |
| SRV-103 | Admin catalog requests, reviews queue, content, settings editor (validated, audited), audit-log viewer | `feat/srv-103-admin-content` | SRV-064, SRV-017, SRV-038 | TODO |  |
| SRV-104 | Admin finance: transactions (with attempts), refunds (retry/manual), payouts, subscriptions, recommended, reconciliation view | `feat/srv-104-admin-finance` | SRV-088, SRV-089, SRV-066 | TODO |  |
| SRV-105 | Analytics query endpoints from MongoDB server events (overview, payments, errors, bookings, merchants) behind `AnalyticsProvider`, cached | `feat/srv-105-analytics-mongo` | SRV-020, SRV-023 | TODO |  |
| SRV-106 | Alerts engine (every 5 min): payment failure spike, refund failed/delayed, 5xx spike, subscription T-7/expired, new application/review/catalog request; thresholds from settings | `feat/srv-106-alerts` | SRV-095, SRV-017, SRV-085 | TODO |  |
| SRV-107 | Alert email delivery via `Notifier` (digest for frequent alerts) + admin alerts list/acknowledge | `feat/srv-107-alert-email` | SRV-106, SRV-031 | TODO |  |
| SRV-108 | Daily/weekly/monthly report aggregation jobs + report query endpoints | `feat/srv-108-reports` | SRV-097, SRV-104 | TODO |  |
| SRV-109 | Async Excel/PDF export of any table/report (exports collection, private signed URL) | `feat/srv-109-exports` | SRV-108, SRV-046 | TODO |  |
| SRV-110 | BigQuery-backed analytics (Firebase events/Crashlytics: funnels, cohorts, per-user journeys incl. guest history) | `feat/srv-110-bigquery-real` | — | PENDING | BigQuery export dataset + credentials, or `wab-analytics` published — **user input / other SDK**. |

## Stage M — Hardening & integration (server side)
Roadmap SRV tail / P5–P6 server parts.

| ID | Task | Branch | Needs (besides previous merged) | Status | Pending on / notes |
|---|---|---|---|---|---|
| SRV-111 | Contract tests: server responses validated against `contracts/` OpenAPI in CI | `feat/srv-111-contract-tests` | — | PENDING | `contracts/` (INT-01) not created yet — separate track. |
| SRV-112 | Replace in-repo stubs with published `wab-*` packages (INT-02) | `feat/srv-112-swap-packages` | — | PENDING | Packages published to the registry (registry choice open) — **other repos / user input**. |
| SRV-113 | Load test availability + booking creation; verify p95 targets and zero double booking | `feat/srv-113-load-test` | SRV-085 | TODO |  |
| SRV-114 | Security checklist verification against NFR-01 (each control mapped to a test or config) + dependency scan clean | `feat/srv-114-security-review` | SRV-113 | TODO |  |
| SRV-115 | Error-tracking integration (Sentry or chosen tool) + API error/latency metrics for admin Errors page | `feat/srv-115-error-tracking` | — | PENDING | Tool selection (open item #4) and DSN — **user input**. |
| SRV-116 | Backups, restore and deployment runbook (dev/prod) | `feat/srv-116-ops-docs` | — | PENDING | DigitalOcean product, Atlas tier, domain — **user input**. |

---

# 5. Coverage matrix (requirement → tasks)

Every Backend BRD requirement, non-functional requirement, business rule and `BUSINESS_DOMAIN.md` section maps to at least one task. (Generated and cross-checked; re-check when tasks are split.)

### Backend BRD capabilities (BE-xx)
| Requirement | Tasks |
|---|---|
| BE-01 | SRV-024, SRV-026, SRV-028, SRV-029, SRV-034 |
| BE-02 | SRV-024, SRV-030, SRV-031 |
| BE-03 | SRV-005, SRV-025, SRV-080 |
| BE-04 | SRV-029, SRV-044, SRV-051 |
| BE-05 | SRV-045 |
| BE-06 | SRV-032, SRV-051, SRV-065, SRV-101 |
| BE-07 | SRV-014, SRV-027, SRV-028 |
| BE-10 | SRV-019, SRV-040, SRV-050 |
| BE-11 | SRV-041, SRV-042, SRV-043 |
| BE-12 | SRV-045, SRV-048, SRV-049, SRV-050, SRV-054 |
| BE-13 | SRV-051, SRV-052, SRV-053 |
| BE-14 | SRV-056, SRV-079 |
| BE-15 | SRV-043, SRV-057 |
| BE-20 | SRV-039, SRV-061 |
| BE-21 | SRV-057, SRV-058, SRV-059 |
| BE-22 | SRV-049, SRV-060 |
| BE-23 | SRV-060, SRV-062, SRV-063, SRV-064 |
| BE-30 | SRV-068, SRV-069 |
| BE-31 | SRV-068, SRV-069, SRV-076 |
| BE-32 | SRV-021, SRV-067, SRV-070, SRV-071 |
| BE-33 | SRV-013, SRV-071, SRV-076 |
| BE-34 | SRV-069, SRV-070 |
| BE-35 | SRV-072, SRV-073 |
| BE-36 | SRV-073, SRV-074, SRV-075, SRV-086 |
| BE-37 | SRV-078 |
| BE-40 | SRV-083, SRV-085, SRV-092 |
| BE-41 | SRV-083, SRV-084 |
| BE-42 | SRV-083 |
| BE-43 | SRV-086 |
| BE-44 | SRV-087, SRV-088, SRV-091, SRV-104 |
| BE-45 | SRV-042, SRV-055, SRV-066, SRV-089, SRV-091, SRV-104 |
| BE-46 | SRV-090 |
| BE-50 | SRV-077, SRV-080, SRV-081, SRV-082 |
| BE-51 | SRV-033, SRV-093, SRV-094, SRV-100 |
| BE-52 | SRV-098, SRV-100 |
| BE-53 | SRV-095, SRV-096 |
| BE-54 | SRV-097 |
| BE-55 | SRV-099 |
| BE-60 | SRV-037, SRV-038, SRV-039, SRV-055, SRV-077, SRV-101, SRV-102, SRV-103, SRV-104 |
| BE-61 | SRV-020, SRV-033, SRV-105, SRV-110 |
| BE-62 | SRV-106, SRV-107 |
| BE-63 | SRV-108, SRV-109 |
| BE-64 | SRV-020, SRV-038, SRV-055, SRV-078, SRV-103 |
| BE-65 | SRV-017, SRV-035, SRV-103 |
| BE-70 | SRV-046 |
| BE-71 | SRV-046, SRV-102, SRV-109 |
| BE-72 | SRV-047 |

### Non-functional requirements (NFR-xx)
| Requirement | Tasks |
|---|---|
| NFR-01 | SRV-002, SRV-003, SRV-007, SRV-010, SRV-014, SRV-025, SRV-026, SRV-030, SRV-084, SRV-090, SRV-114, SRV-116 |
| NFR-02 | SRV-015, SRV-083, SRV-113 |
| NFR-03 | SRV-105, SRV-113 |
| NFR-04 | SRV-081 |
| NFR-05 | SRV-095, SRV-097 |
| NFR-06 | SRV-013, SRV-080 |
| NFR-07 | SRV-032, SRV-097 |
| NFR-08 | SRV-003, SRV-006, SRV-115 |
| NFR-09 | SRV-001, SRV-004, SRV-005, SRV-008, SRV-012 |
| NFR-10 | SRV-010, SRV-012 |
| NFR-11 | SRV-004 |
| NFR-12 | SRV-016 |

### Business rules enforced by the backend (BER-xx)
| Rule | Tasks |
|---|---|
| BER-01 | SRV-070 |
| BER-02 | SRV-068 |
| BER-03 | SRV-068 |
| BER-04 | SRV-071, SRV-096 |
| BER-05 | SRV-054, SRV-073, SRV-074 |
| BER-06 | SRV-072, SRV-073 |
| BER-07 | SRV-070 |
| BER-08 | SRV-063, SRV-064 |
| BER-09 | SRV-043 |
| BER-10 | SRV-044, SRV-082, SRV-093 |
| BER-11 | SRV-087 |

### `BUSINESS_DOMAIN.md` sections
| Section | Tasks |
|---|---|
| §3.1 Identity & sessions, OTP state | SRV-024, SRV-025, SRV-026, SRV-027, SRV-030, SRV-033 |
| §3.2 Reference data | SRV-018, SRV-036, SRV-038, SRV-040 |
| §3.3 Salons (completeness, closures, gallery, services) | SRV-041, SRV-043, SRV-049, SRV-048, SRV-050 |
| §3.4 Team & staff | SRV-051, SRV-052, SRV-053 |
| §3.5 Bookings, transactions, refunds, ledger, payouts, subscriptions, placements | SRV-070, SRV-071, SRV-083, SRV-086, SRV-087, SRV-088, SRV-089, SRV-066 |
| §3.6 Social & content (reviews, favorites, notifications, campaigns, banners, content) | SRV-063, SRV-062, SRV-093, SRV-099, SRV-039, SRV-037 |
| §3.7 Operations (settings, audit, server events, alerts, exports, uploads) | SRV-017, SRV-020, SRV-106, SRV-109, SRV-046 |
| §5.1 Time | SRV-016 |
| §5.2 Completeness → state | SRV-043 |
| §5.3 Open/closed | SRV-049 |
| §5.4 Availability | SRV-068, SRV-069 |
| §5.5 Pricing & amounts | SRV-015, SRV-067 |
| §5.6 Booking creation | SRV-070, SRV-071, SRV-085 |
| §5.7 Booking state machine | SRV-072, SRV-073, SRV-076, SRV-078 |
| §5.8 Customer cancellation refund | SRV-074 |
| §5.9 No-show refund | SRV-075 |
| §5.10 Refund processing | SRV-086 |
| §5.11 Ratings | SRV-063, SRV-064 |
| §5.12 Conflicts | SRV-056, SRV-079 |
| §5.13 Subscriptions & placements | SRV-042, SRV-089, SRV-066, SRV-097 |
| §5.14 Payouts | SRV-087, SRV-088 |
| §5.15 Account deletion | SRV-032, SRV-097 |
| §6 Permissions matrix | SRV-044, SRV-051 |
| §7 Real-time events | SRV-080, SRV-081, SRV-082 |
| §8 Notifications matrix | SRV-093, SRV-094, SRV-098 |
| §9 Scheduled jobs | SRV-095, SRV-096, SRV-097 |
| §10 Settings | SRV-017, SRV-103 |
| §11 Error codes | SRV-004 |

---

# 6. Notes and open assumptions carried from the docs
- Assumptions in `BUSINESS_DOMAIN.md` §12 (fils rounding, LIVE-but-incomplete salon blocks new bookings, one pending review per target, least-loaded "any staff", 10-minute payment hold, `WAB-XXXXXX` reference) are implemented as stated and kept configurable.
- Customer PRD open item 7 (multiple reviews per user per target) conflicts with `BUSINESS_DOMAIN.md` §5.11 (limit 1 pending): follow `reviews.maxPendingPerTargetPerCustomer` setting; confirm with owner at SRV-063.
- Booking step order is Summary → OTP → online payment → PENDING booking (Customer PRD open item 5); implemented in SRV-070/071/085.
- Tracked Firebase config files exist in `WAB-Mobile-Customer` (see `.claude/memory.md`); the server never reads them — its Firebase credentials come from environment/secret store only.
