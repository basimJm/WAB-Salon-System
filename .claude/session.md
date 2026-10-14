# WAB — Session Log

> Every task gets a block (template in `.claude/hooks.md` §3). Keep only the current and last few sessions here; move durable knowledge to `memory.md` and delete stale blocks.

## Current Session

- Started: 2026-10-12
- Goal: Set up repo-wide rules, roles, hooks, session and memory for Claude Code.

### Open / In Progress

- (none)

### Completed

### T-001 — Repo-wide Claude rules, roles, hooks, session & memory

- Project: repo root (`.claude/`, `CLAUDE.md`)
- Branch: `chore/claude-rules-hooks`
- Status: DONE
- Acceptance criteria:
  - [x] `.claude/rules.md` with token-efficiency, requirements and delivery rules (tests, branching, no-hardcode, 3 loops)
  - [x] `.claude/roles.md` with the four senior roles
  - [x] `.claude/hooks.md` + `.claude/settings.json` hooks enforcing branch, hardcode, tests and review rules
  - [x] `.claude/session.md` and `.claude/memory.md`
  - [x] `CLAUDE.md` imports all of them so every session reads them
- Tests: `python3 .claude/hooks/test_hooks.py` — 19 pass (QA findings fixed: guard false positives on flags inside commit messages and on other commands chained with git push; now strips quotes/heredocs and checks each shell segment, covered by tests)
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — config/docs only; hooks covered by unit tests.
- Notes: Per-project rules to be added next (user will provide).

### T-002 — Delivery roadmap & shared integration workflow

- Project: repo root (`ROADMAP.md`, `INTEGRATION_WORKFLOW.md`, `CLAUDE.md`)
- Branch: `docs/roadmap-integration`
- Status: DONE
- Acceptance criteria:
  - [x] Phases P0–P6 with tasks split by track: SERVICE, SERVER, CUSTOMER, MERCHANT, ADMIN (+ INT/REL)
  - [x] Tracks can run in parallel; API integration is last (P5)
  - [x] Rule for unready dependencies: build against contract fixtures behind interfaces with config-switched mocks
  - [x] Shared integration workflow: contracts, mocks, dev/prod environments per project, CI/CD and promotion
  - [x] Linked from `CLAUDE.md`
- Tests: docs only (no source code); links and task IDs cross-checked against PRD screen IDs
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — consistent with CLAUDE.md §4–5 and PRDs.

### T-004 — Consolidated business domain spec

- Project: repo root (`BUSINESS_DOMAIN.md`, `CLAUDE.md`, `ROADMAP.md`)
- Branch: `docs/business-domain-spec`
- Status: DONE
- Acceptance criteria:
  - [x] One file describing the whole business for server schemas and logic
  - [x] All collections with fields, types, enums, indexes and relations
  - [x] Algorithms: completeness/state, open-closed, availability, pricing/deposit, booking creation, refunds, no-show, ratings, conflicts, subscriptions, payouts, deletion
  - [x] Booking state machine with actors, preconditions and side effects
  - [x] Permissions matrix, socket events, notification matrix, jobs, settings defaults, error codes, open assumptions
  - [x] Linked from `CLAUDE.md` and `ROADMAP.md`
- Tests: docs only; cross-checked against Customer/Merchant/Admin PRDs and Backend BRD
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — consistent with PRDs; assumptions listed in §12.

### T-005 — WAB-Server project rules

- Project: `WAB-Server/` (`WAB-Server/CLAUDE.md`; links in `CLAUDE.md`, `INTEGRATION_WORKFLOW.md`)
- Branch: `docs/server-rules`
- Status: DONE
- Acceptance criteria:
  - [x] Mandatory reading: root rules + all `.claude/*.md`, `BUSINESS_DOMAIN.md`, Backend BRD, PRDs
  - [x] Business domain applied and double-checked (before coding and before push)
  - [x] Layered TS architecture route → middleware → controller → service → repository → schema
  - [x] Customer / merchant / admin modules separated; shared logic in `domain/`, helpers in `utils/`
  - [x] No hardcoding; static data in constants; tunables in settings
  - [x] Base success/error responses; AR+EN for every response
  - [x] Every error type handled, including unexpected and process-level errors
  - [x] Clean, reusable, readable, scalable; no duplication
  - [x] Response envelope aligned in `INTEGRATION_WORKFLOW.md`
- Tests: docs only (no source code)
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — envelope change applied before contracts exist, so no client breakage.

### T-006 — WAB-Server task backlog

- Project: `WAB-Server/docs/WAB_Server_Tasks.md`, root docs
- Branch: `claude/busy-johnson-2rch94`
- Status: DONE (PR #5 merged)
- Acceptance criteria:
  - [x] One md file in WAB-Server listing every task to build the whole backend, each with status (TODO/PENDING/DONE...)
  - [x] PENDING only when blocked by owner info or another SDK/package; reason stated
  - [x] Tasks small, strict order, next task not started before previous merged to main, one branch per task
  - [x] Every BE/NFR/BER requirement and BUSINESS_DOMAIN section mapped to tasks
  - [x] Legacy WAB-Server/BRD.md flagged as superseded
  - [x] Linked from CLAUDE.md and ROADMAP.md; memory.md updated
  - [x] Aligned with `WAB-Server/CLAUDE.md` (layout, base envelope, typed errors, AR+EN, contracts rule); split rows SRV-004a, SRV-005a
- Tests: docs only (no source); coverage matrix script-checked (no missing BE/NFR/BER); `python3 .claude/hooks/test_hooks.py`
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — docs only; consistent with Backend BRD, BUSINESS_DOMAIN and ROADMAP.
- Notes: Branch is the cloud-session pinned branch (exception to `<type>/<name>`); all later tasks use `feat/srv-NNN-*`. Next: SRV-001 after merge.

### T-007 — SRV-001 TypeScript strict project + lint/format/test + folder layout

- Project: `WAB-Server/`
- Branch: `claude/busy-johnson-2rch94` (cloud-pinned branch, restarted from `main` after PR #5 merged)
- Status: DONE (PR #6 merged)
- Acceptance criteria (BE/NFR: NFR-09, NFR-10, BG-8; BUSINESS_DOMAIN: none — tooling only; server rules §2, §4, §9, §10):
  - [x] `tsconfig` strict (+ noUncheckedIndexedAccess, noUnused*) and separate build config excluding tests
  - [x] ESLint blocks `any` and `console`; Prettier; Jest (ts-jest); scripts build/typecheck/lint/format/test
  - [x] Folder layout of `WAB-Server/CLAUDE.md` §4 exists, listed once in `src/constants/layout.ts`
  - [x] Tests prove layout, strict config and lint rules; typecheck/lint/format/build/test green
  - [x] No secrets; `.env.example` present (keys filled by SRV-002)
- Tests: `cd WAB-Server && npm test` — 19 pass; `npm run typecheck|lint|format:check|build` green
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — tooling only; `npm audit --omit=dev` = 0 vulns (dev-only transitive moderate advisories via jest/istanbul, tracked for SRV-010 CI audit scope).
- Notes: Next after merge: SRV-002.

### T-008 — SRV-002 Config/env loader + `.env.example`

- Project: `WAB-Server/` (`src/config`, `src/constants/env.ts`, `.env.example`)
- Branch: `claude/busy-johnson-2rch94` (restarted from `main` after PR #6 merged)
- Status: DONE (PR #7 merged)
- Acceptance criteria (BE/NFR: NFR-01 secrets only in env, NFR-09; BUSINESS_DOMAIN: none; server rules §5):
  - [x] Env validated with a schema at startup; invalid/missing → `ConfigError` naming keys only (never values)
  - [x] No defaults for connection secrets (MONGODB_URI, REDIS_URL); non-secret defaults live in `constants/`
  - [x] `.env.<NODE_ENV>` merged under real env (real env wins); unknown NODE_ENV falls back to development
  - [x] Immutable typed `AppConfig`; `.env.example` lists every key, no values (test-enforced)
  - [x] No `.env*` files committed
- Tests: `cd WAB-Server && npm test` — 34 pass; typecheck/lint/format:check/build green
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — `ConfigError` is a plain Error for now; SRV-004 may re-base it on `BaseError`. Later tasks add their keys to schema + `.env.example` (e.g. JWT, Firebase, S3, SMTP, gateway).
- Notes: Next after merge: SRV-003.

### T-009 — SRV-003 Logger with redaction + request id

- Project: `WAB-Server/` (`src/utils/logger`, `src/middlewares/requestId.ts`, `src/constants/logging.ts`)
- Branch: `claude/busy-johnson-2rch94` (restarted from `main` after PR #7 merged)
- Status: DONE (PR #8 merged)
- Acceptance criteria (BE/NFR: NFR-08 structured logs + traceId, NFR-01 no sensitive data in logs; server rules §8 logs, §5 constants):
  - [x] Structured JSON logger (pino) at the configured level; every log object redacted before output
  - [x] Tokens, passwords, OTP, IBAN, card data removed; phone numbers masked (last 3 digits); key matching case/separator-insensitive; nested, circular and deep objects safe; input never mutated
  - [x] `requestId` middleware: reuses a well-formed `X-Request-Id`, else UUID; sets response header, `req.id`, child `req.log` (`traceId`); rejects oversize/odd/injection values
  - [x] All names/limits/placeholders in `constants/logging.ts`
- Tests: `cd WAB-Server && npm test` — 52 pass; typecheck/lint/format:check/build green; `npm audit --omit=dev` 0
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — added `pino` and `express` 5 (+ `@types/express`) deps; `traceId` = `req.id` is reused by SRV-004a error responses. Message strings are not scanned (only object fields) — callers must not interpolate secrets.
- Notes: Next after merge: SRV-004.

### T-010 — SRV-004 Error model, error codes, AR/EN locales, Accept-Language

- Project: `WAB-Server/` (`src/utils/errors`, `src/utils/i18n`, `src/middlewares/language.ts`, `src/locales/*.json`, `src/constants/{errorCodes,http,i18n}.ts`)
- Branch: `claude/busy-johnson-2rch94` (restarted from `main` after PR #8 merged)
- Status: DONE (PR #9 merged)
- Acceptance criteria (BE/NFR: NFR-11 localization, NFR-09; BUSINESS_DOMAIN §11 error codes, §2 Language; server rules §7, §8):
  - [x] `BaseError` + ValidationError 400, Unauthorized 401, Forbidden 403, NotFound 404, Conflict 409, BusinessRule 422, RateLimit 429, Payment 402, ExternalService 502/503, Internal 500 (not operational); each carries code, httpStatus, messageKey, details, isOperational
  - [x] `ERROR_CODES` = exactly the 41 codes of BUSINESS_DOMAIN §11 (test-enforced); every code has `errors.<CODE>` in `ar.json` and `en.json`
  - [x] Locale completeness test: same keys, no empty values, same placeholders, Arabic script in ar
  - [x] `Accept-Language` parsing (q-weights, regions, `*`, invalid) with default `ar`; `req.language` + `req.t()`
  - [x] No hardcoded values: statuses/codes/languages in `constants/`, messages only in `locales/`
- Tests: `cd WAB-Server && npm test` — 93 pass; typecheck/lint/format:check/build green; `npm audit --omit=dev` 0
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — DECISIONS TO CONFIRM: (1) domain has no code for provider failures, so `ExternalServiceError` uses code `INTERNAL` with status 502/503 (add `EXTERNAL_SERVICE_ERROR` to BUSINESS_DOMAIN §11 if you want a distinct code); (2) `PaymentError` uses HTTP 402; (3) code `INTERNAL` (domain) is used, not `INTERNAL_ERROR` from server-rules examples.
- Notes: Next after merge: SRV-004a (global error handler, process handlers).

### T-011 — SRV-004a Global error handler, notFound, async wrapper, process handlers

- Project: `WAB-Server/` (`src/middlewares/{errorHandler,notFound}.ts`, `src/utils/{errors/normalize,response/errorResponse,async,process/lifecycle}`, `src/constants/errorMapping.ts`)
- Branch: `claude/busy-johnson-2rch94` (restarted from `main` after PR #9 merged)
- Status: DONE (PR #10 merged)
- Acceptance criteria (BE/NFR: NFR-08, NFR-09, NFR-01 no leaks; BUSINESS_DOMAIN §11; server rules §6 envelope, §8 errors):
  - [x] One `errorHandler` returns the base error envelope `{success:false,message,error:{code,details,traceId}}`, localized (ar default), traceId = request id
  - [x] Maps Mongoose CastError/ValidationError (400), duplicate key 11000 (409), JWT errors (401), zod (400 + field details), malformed JSON (400), payload too large (413), network/timeout (503) — by name/shape, no library imports
  - [x] Unknown/non-Error throws → `INTERNAL` 500, generic message; stack/queries/provider text logged (error level), never returned
  - [x] `notFound` → localized 404; `asyncHandler` forwards rejections; headersSent delegates to Express; works even if requestId/language never ran
  - [x] Process handlers: unhandledRejection/uncaughtException → fatal log, ordered graceful close (timeout, failure-tolerant, idempotent), exit 1; SIGTERM/SIGINT → exit 0
- Tests: `cd WAB-Server && npm test` — 130 pass (supertest integration + unit); typecheck/lint/format:check/build green; `npm audit --omit=dev` 0
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — QA found and fixed a real bug: a failing shutdown during a crash re-rejected and skipped exit. `buildErrorBody` lives here; SRV-005a adds only success/pagination helpers. `server.ts` wiring of the lifecycle helpers comes with SRV-005/006.
- Notes: Next after merge: SRV-005. Added dev dep `supertest`.

### T-012 — SRV-005 Express app factory, namespaces, validate middleware, server entry

- Project: `WAB-Server/` (`src/app.ts`, `src/server.ts`, `src/routes/index.ts`, `src/modules/{customer,merchant,admin}/index.ts`, `src/middlewares/validate.ts`, `src/constants/server.ts`)
- Branch: `claude/busy-johnson-2rch94` (restarted from `main` after PR #10 merged)
- Status: DONE (PR #11 merged)
- Acceptance criteria (BE/NFR: BE-03 separate namespaces, NFR-09; BUSINESS_DOMAIN §11 VALIDATION_ERROR; server rules §3 modules, §4 layout, §9 validate every input):
  - [x] `createApp` order: requestId → language → JSON parser (limit from constants) → routes → notFound → errorHandler; `X-Powered-By` off
  - [x] `/customer/v1`, `/merchant/v1`, `/admin/v1` mounted from `routes/index.ts`; each namespace has its own module router; routes never reachable under another prefix
  - [x] `validate({body,params,query,headers})`: coerced/defaulted values, unknown keys stripped, all failing parts reported together as `body.x`/`query.x`/`params.x`/`headers.x` details; typed `validated<typeof schemas>(req)`; handler not called on failure
  - [x] `startServer` listens, graceful HTTP shutdown, crash/signal handlers registered for the real process only; port-in-use rejects; invalid config exits 1
  - [x] Constants only (prefixes, body limit, validation parts)
- Tests: `cd WAB-Server && npm test` — 150 pass; typecheck/lint/format:check/build green; `npm audit --omit=dev` 0; built server smoke-tested (404 envelope, SIGTERM clean, bad config exit 1)
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — QA found Express 5 `app.listen` hands listen errors to its callback as success, so `server.ts` uses `http.createServer`. Security headers/CORS/rate limits are SRV-007; health endpoints SRV-006; response helpers SRV-005a.
- Notes: Next: SRV-005a. User asked me to merge my own PRs from SRV-005 on.

### T-013 — SRV-005a Success response and pagination helpers

- Project: `WAB-Server/` (`src/utils/response/successResponse.ts`, `src/utils/pagination`, `src/constants/{pagination,messages}.ts`, locales)
- Branch: `claude/busy-johnson-2rch94` (restarted from `main` after PR #11 merged)
- Status: DONE (PR #12 merged)
- Acceptance criteria (BE/NFR: NFR-11, NFR-09; BUSINESS_DOMAIN §10 pagination.appPageSize=10 / adminPageSize=25; server rules §6 envelope, §9 paginate every list):
  - [x] `sendSuccess`/`sendCreated`/`sendPaginated` build `{success:true,message,data,meta?}` localized (ar default); `data:null` when empty; `meta` only on paginated lists; 201 for created
  - [x] `paginationQuery(defaultPageSize)` coerces `page`/`pageSize`, defaults from constants, rejects page<1, non-integers, pageSize<1 or >100 with 400 `VALIDATION_ERROR`
  - [x] `toSkipLimit`, `buildPaginationMeta` helpers; app (10) and admin (25) page sizes in constants
  - [x] `messages.OK`/`messages.CREATED` in both locales (parity test passes)
- Tests: `cd WAB-Server && npm test` — 166 pass; typecheck/lint/format:check/build green; `npm audit --omit=dev` 0
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — page sizes are constants for now; settings-driven values (`pagination.*`) are passed in by services once SRV-017 exists.
- Notes: Next: SRV-006.

### T-014 — SRV-006 Health and readiness endpoints

- Project: `WAB-Server/` (`src/routes/health.ts`, `src/utils/health`, `src/utils/async/timeout.ts`, `src/constants/health.ts`)
- Branch: `claude/busy-johnson-2rch94` (restarted from `main` after PR #12 merged)
- Status: DONE (PR #13 merged)
- Acceptance criteria (BE/NFR: NFR-08 health checks; server rules §6 envelope, §8 errors; BUSINESS_DOMAIN: none):
  - [x] `GET /health`: public liveness, 200 success envelope, never touches dependencies
  - [x] `GET /ready`: runs pluggable `ReadinessCheck`s in parallel with a timeout; all up → 200 with per-check status; any down/hanging/throwing → 503 error envelope naming the failing checks (`DEPENDENCY_DOWN`), no error text leaked, failure logged as warning
  - [x] Mounted at root (outside `/customer|merchant|admin/v1`); `createApp({readinessChecks})` is how MongoDB/Redis checks get added later (SRV-012/013)
  - [x] `withTimeout` shared helper (also used by shutdown); message `health.DEPENDENCY_DOWN` in ar+en
- Tests: `cd WAB-Server && npm test` — 177 pass; typecheck/lint/format:check/build green; `npm audit --omit=dev` 0
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — extracted `withTimeout` instead of duplicating it; `/ready` 503 uses the operational `ExternalServiceError` (code INTERNAL, per SRV-004 decision).
- Notes: User said "complete": I merge my own PRs and continue the backlog. Next: SRV-007.

### T-015 — SRV-007 Security middleware

- Project: `WAB-Server/` (`src/middlewares/{security,rateLimit,sanitize}.ts`, `src/utils/sanitize`, `src/constants/security.ts`, config `TRUST_PROXY_HOPS`)
- Branch: `claude/busy-johnson-2rch94` (restarted from `main` after PR #13 merged)
- Status: DONE (PR #14 merged)
- Acceptance criteria (BE/NFR: NFR-01 Helmet, CORS limited to admin domain, rate limiting, input size limits, NoSQL-injection + XSS sanitization; server rules §5, §8):
  - [x] Helmet headers on every response; `X-Powered-By` off
  - [x] CORS only for `CORS_ALLOWED_ORIGINS` (admin domain), no credentials, exposes `X-Request-Id`, preflight cached; no Origin (native apps) allowed; none configured = no browser origin
  - [x] Global per-IP rate limit (constants) → 429 `RATE_LIMITED` envelope localized; `/health` and `/ready` exempt; reusable `createRateLimiter` for OTP/login/payments (Redis store later, SRV-014); real client IP via `TRUST_PROXY_HOPS` (default 0, X-Forwarded-For ignored unless trusted)
  - [x] Body sanitizer: drops `$…`, dotted and prototype keys at any depth; strips HTML/script from text (repeat-until-stable); secret-like fields (password, token…) never rewritten; depth limit → 400; query sanitized (Express 5 getter overridden); input not mutated
  - [x] JSON body limit already enforced (100kb → 413)
- Tests: `cd WAB-Server && npm test` — 206 pass; typecheck/lint/format:check/build green; `npm audit --omit=dev` 0
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — NOT done here: "HTTPS only" is terminated at the hosting platform/load balancer (DigitalOcean product + domain still undecided, SRV-011/116); Helmet's HSTS covers browsers. Per-route stricter limits come with their tasks. Added deps: helmet, cors, express-rate-limit.
- Notes: Next: SRV-008.

### T-016 — SRV-008 Swagger + Postman generation and the "docs after every task" rule

- Project: `WAB-Server/` (`CLAUDE.md` §11, `src/docs/*`, `src/routes/{mount,health.openapi}.ts`, `docs/api/**`, `tests/docs.test.ts`)
- Branch: `claude/busy-johnson-2rch94` (restarted from `main` after PR #14 merged)
- Status: DONE (PR #15 merged)
- Acceptance criteria (user request: rule that Swagger + Postman are updated after each task, created if missing; BE/NFR: NFR-09 Swagger + Postman always in sync; CLAUDE.md §4.1):
  - [x] New rule `WAB-Server/CLAUDE.md` §11 (and §10 link): update `*.openapi.ts` + run `npm run docs` + commit `docs/api/**` in every task PR; "API docs: no change" when no API change; create the files if missing
  - [x] OpenAPI 3.1 generated from zod schemas: `docs/api/openapi.{common,customer,merchant,admin}.json` (common = `/health`, `/ready`; client docs have bearer auth, empty until endpoints exist)
  - [x] Postman v2.1 collection per document + `WAB.postman_environment.json` (`{{baseUrl}}`, `{{language}}`, per-namespace token variables, no real values), request bodies from schemas
  - [x] Swagger UI at `/docs` and `/docs/<name>.json` outside production only (verified in headless Chromium under Helmet: renders, no console errors)
  - [x] `tests/docs.test.ts` fails when files are stale, a route has no OpenAPI entry, a documented path has no route, or a router is attached without `mount()`
- Tests: `cd WAB-Server && npm test` — 233 pass; typecheck/lint/format:check/build green; `npm audit --omit=dev` 0
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — QA found `/docs/<unknown>.json` served the Swagger HTML instead of 404 (fixed). Deps: @asteasolutions/zod-to-openapi, swagger-ui-express. Contracts: `contracts/` (INT-01) still does not exist; these generated files are the interim API reference. API docs: updated (health/ready).
- Notes: User later said they will merge manually: I no longer merge PRs. Next: SRV-009 (Docker).

### T-017 — SRV-009 Dockerfile + docker-compose for local development

- Project: `WAB-Server/` (`Dockerfile`, `.dockerignore`, `docker-compose.yml`, `docker/compose.env.example`, `README.md`, `tests/docker.test.ts`)
- Branch: `claude/busy-johnson-2rch94` (restarted from `main` after PR #15 merged)
- Status: DONE (PR #16 merged by the user)
- Acceptance criteria (INTEGRATION_WORKFLOW §4 local environment: Docker Mongo/Redis/MinIO/SMTP sink; NFR-01 secrets only in env, NFR-06 stateless instances; BUSINESS_DOMAIN §5.6 Mongo transaction needs a replica set):
  - [x] `docker compose up -d` gives MongoDB (single-node replica set, auto-initiated), Redis, MinIO and Mailpit, all published on 127.0.0.1 only, data in named volumes, healthchecks
  - [x] No credentials in the file: MinIO root user/password are required variables from git-ignored `.env`; all variables documented (keys only) in `docker/compose.env.example`
  - [x] `api` service behind the `app` profile, waits for healthy Mongo/Redis, uses service names, optional `.env.development`
  - [x] Multi-stage Node 22 image: `npm ci`, production deps only, non-root `node` user, `/health` healthcheck, no env files in the image; `.dockerignore` excludes `.env*`, `node_modules`, `.git`
  - [x] `README.md` with scripts and local setup
- Tests: `cd WAB-Server && npm test` — 248 pass; typecheck/lint/format:check/build green; `npm audit --omit=dev` 0; `docker compose config` valid (also with `--profile app`); runtime stage simulated (prod-only `npm ci` + `node dist/server.js` → `/health` 200, `/docs` 404 in production)
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — NOT verified here: the cloud runner has no Docker daemon, so `docker build` and the container healthchecks (Mongo replica-set init, MinIO `mc ready`) were not executed; first real `docker compose up` should confirm them. API docs: no change.
- Notes: GitGuardian flagged 1 "Generic Password" on PR #16 (`docker-compose.yml` line 50: the `${MINIO_ROOT_PASSWORD:?…}` reference, no real secret). Shortened the required-variable message to `:?required`; the original text stays in an earlier commit of the PR, so the check may need to be marked a false positive in the GitGuardian dashboard. Next: SRV-010 (GitHub Actions CI) only after the user merges #16.

### T-018 — SRV-010 GitHub Actions CI for the server

- Project: repo root `.github/workflows/server-ci.yml`, `WAB-Server/tests/ci.test.ts`
- Branch: `claude/busy-johnson-2rch94` (restarted from `main` after PR #16 merged)
- Status: DONE (PR #17 merged, all checks green)
- Acceptance criteria (BE/NFR: NFR-01 dependency scanning in CI, NFR-10 tests run in CI; INTEGRATION_WORKFLOW §5 path-filtered CI with lint, typecheck, tests, build, secret scan):
  - [x] Workflow runs on PRs and pushes to `main`, only when `WAB-Server/**` or the workflow changes; read-only token; concurrent runs cancelled; every job has a timeout
  - [x] `verify` job: `npm ci`, typecheck, lint, format check, tests (includes stale Swagger/Postman check), build, `npm audit --omit=dev --audit-level=high` on Node 22
  - [x] `secret-scan` job: gitleaks over full history; only the built-in `GITHUB_TOKEN` is referenced
  - [x] `tests/ci.test.ts` guards the workflow's triggers, commands, Node version, permissions and secrets
- Tests: `cd WAB-Server && npm test` — 256 pass; all CI steps replayed in a clean copy with a fresh `npm ci` (exit 0)
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — NOT verified: the workflow itself has not run on GitHub yet (first run happens on this PR). gitleaks is a second secret scanner next to GitGuardian; if the repo moves to an organization, `GITLEAKS_LICENSE` is required. Dev-only advisories (jest/istanbul) are intentionally outside the audit gate. API docs: no change.
- Notes: First real run: `Secret scan` failed with 403 on `GET /pulls/17/commits` (gitleaks needs `pull-requests: read`); fixed with job-level permissions + test. Contract tests job joins when `contracts/` exists (SRV-111); deploy job is SRV-011 (PENDING on hosting). Next: SRV-012 (Mongo layer) — SRV-011 is PENDING.

### T-019 — SRV-012 MongoDB connection and base repository

- Project: `WAB-Server/` (`src/utils/database/{connection,plain}.ts`, `src/repositories/base.repository.ts`, `src/constants/database.ts`, `src/server.ts`)
- Branch: `claude/busy-johnson-2rch94` (restarted from `main` after PR #17 merged)
- Status: DONE (PR #18 merged)
- Acceptance criteria (BE/NFR: NFR-02 atomic ops need replica set, NFR-06 stateless, NFR-08 health, NFR-09; BUSINESS_DOMAIN §3 conventions: ObjectId `_id`, UTC timestamps, soft-delete via status fields; server rules §2 repository is the only DB code, §5 constants):
  - [x] `connectMongo`: timeouts/pool from constants, `autoIndex` off in production, failure logged without the URI and thrown as a typed 503 `ExternalServiceError`; connect/disconnect events logged
  - [x] `/ready` includes a `mongodb` probe (open connection + ping); server connects before listening, closes MongoDB after HTTP on shutdown, and exits 1 if the database is unreachable
  - [x] `BaseRepository`: create, findById/findOne/findMany/findPage (skip/limit, total, stable `_id` tie-break), count, exists, updateById (`$set`, validators, undefined ignored); returns plain entities (string ids, no `_id`/`__v`, nested ObjectIds as strings); malformed ids return null without querying; `null` = not found
  - [x] Soft deletion is per-collection via the status field: `baseFilter()` hook hides archived records from every read and write (no generic delete)
  - [x] Test strategy: no `mongod` and MongoDB downloads are blocked on the runner, so repository logic runs against an in-memory fake model; connection failure path runs against a real unreachable address
- Tests: `cd WAB-Server && npm test` — 280 pass; typecheck/lint/format/build green; `npm audit --omit=dev` 0; built server exits 1 with no secret in output when MongoDB is unreachable. QA found a real bug: `mongoose.ConnectionStates` was `undefined` with a named import (TypeScript's interop does not copy prototype statics), which would have made `/ready` always report MongoDB down — fixed.
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — NOT verified against a real MongoDB (the connect success path and real queries): first `docker compose up` run should confirm. Deps: mongoose 9. API docs: no change (the `/ready` payload shape is unchanged; it just gains a `mongodb` check entry).
- Notes: Next: SRV-013 (Redis client + lock helper). User rule: merge my own PRs only after ALL CI checks completed and green.

### T-020 — SRV-013 Redis client and distributed lock helper

- Project: `WAB-Server/` (`src/utils/redis/{client,keys,lock}.ts`, `src/constants/redis.ts`, `src/server.ts`, CI workflow)
- Branch: `claude/busy-johnson-2rch94` (restarted from `main` after PR #18 merged)
- Status: DONE (PR #19 merged; CI green incl. the Redis service container: 22 suites / 303 tests)
- Acceptance criteria (BE/NFR: BE-33 no double booking via locks, NFR-06 stateless instances with Redis, NFR-08 health; BUSINESS_DOMAIN §5.6 per-staff Redis lock, §9 jobs; server rules §5 constants):
  - [x] `connectRedis`: lazy connect with bounded connect/command timeouts, capped exponential retry that never gives up after startup, events logged, failure thrown as a typed 503 without leaking the URL; `disconnectRedis` graceful with hard fallback; `redis.duplicate()` documented for subscribers (Socket.IO/BullMQ)
  - [x] `/ready` includes a `redis` PING probe; server connects Redis after MongoDB, closes Redis then MongoDB after HTTP, cleans up on startup failure
  - [x] `lockKey(...)` namespaced keys (`lock:<parts>`), rejects empty parts and separators inside parts
  - [x] `acquireLock` (`SET NX PX`, retry with jitter, `null` when busy), `release`/`extend` via compare-and-act Lua so a holder never touches someone else's lock, TTL frees crashed holders, `withLock` always releases and throws a caller-chosen error (default 409 `ConflictError`)
  - [x] Tests run against a real Redis: spawned `redis-server` locally, `REDIS_TEST_URL` service container in CI (workflow updated + guarded by `tests/ci.test.ts`)
- Tests: `cd WAB-Server && npm test` — 302 pass (3 consecutive runs, incl. a 15-way concurrent read-modify-write that proves mutual exclusion); typecheck/lint/format/build green; `npm audit --omit=dev` 0; external-Redis path verified locally. QA found a flawed test (lazy "dead" client pointed at the live server), not a code bug.
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — Rate-limit counters (SRV-014) and BullMQ/Socket.IO adapters reuse this client later. API docs: no change.
- Notes: Next: SRV-014 (Redis rate-limit helpers). Merge only after ALL CI checks green.

### T-021 — SRV-014 Redis counter/flag helpers, limiter and rate-limit store

- Project: `WAB-Server/` (`src/utils/redis/{counter,limiter,rateLimitStore,keys}.ts`, `src/middlewares/{rateLimit,security}.ts`, `src/utils/errors/normalize.ts`, `src/constants/{redis,time,errorMapping}.ts`, `src/server.ts`, `src/app.ts`)
- Branch: `claude/busy-johnson-2rch94` (restarted from `main` after PR #19 merged)
- Status: DONE (PR #20 merged; CI green: Server CI verify with the shared Redis container, Secret scan, GitGuardian)
- Acceptance criteria (BE/NFR: BE-07 OTP request/wrong-code limits (generic part), NFR-01 brute-force protection, NFR-06 stateless instances; BUSINESS_DOMAIN §3.1 OTP Redis keys `otp:req|wrong|block|resend` (counter + flag + TTL), §10 settings supply the numbers later (SRV-017/027); server rules §5 constants, §8 provider errors → `ExternalServiceError`):
  - [x] `hitWindow`: atomic INCR + PEXPIRE in one Lua script (no immortal counter; a counter that lost its TTL heals); `readCounter`, `setFlag`, `flagTtlMs`, `hasFlag`, `deleteKeys`
  - [x] `startCooldown`: only the first caller per period starts it (OTP resend), others learn the remaining time; one winner under concurrency
  - [x] `createLimiter({counterPrefix, blockPrefix?, limit, windowMs, blockMs?})`: atomic `hit/status/reset`; the hit that reaches the limit is allowed and starts the block; later hits are denied without being counted; the block ends by TTL and starts a fresh window; limiters sharing a `blockPrefix` share the block (OTP requests + wrong codes); default block key `<counterPrefix>:block`, equal prefixes rejected; positive-integer config validated; subjects with separators/empty rejected
  - [x] `RedisRateLimitStore` for `express-rate-limit` (shared across instances, IPv6-safe keys); the global limiter is wired to it in `main()` and **fails open** (Redis blip must not take the API down) while limiters created with the default **fail closed** (OTP, login, payments) and answer 503
  - [x] Redis outage errors (max retries, closed connection, command timeout, offline queue disabled) → typed 503 `ExternalServiceError` (verified against real ioredis errors); look-alikes stay 500
  - [x] No hardcoded values: prefixes/segments/time units in `constants/`; test Redis uses one logical DB per Jest worker so suites can share the CI Redis container (`flushdb`, not `flushall`)
- Tests: `cd WAB-Server && npm test` — 345 pass locally and 3× against one shared Redis with 4 parallel workers; limiter suite repeated 10× incl. under load; typecheck/lint/format/build green; `npm audit --omit=dev` 0. QA found real defects before push: (1) default block key equalled the counter key, so every plain-window hit after the first was denied (fixed + regression tests); (2) both Redis suites used `flushall` on a shared CI Redis (fixed per-worker DB); (3) a magic `1_000` and two unused constants (replaced / removed).
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — DECISION NOTES: (1) "5 requests / 5 min → 15 min block" is implemented as: the 5th request is allowed and starts the block, the 6th is denied (`OTP_BLOCKED`) — SRV-027 passes limit=5, window=300 s, block=900 s from settings; (2) with fail-open, a Redis outage logs one error per request — acceptable until real traffic exists. API docs: no change (no endpoint added/changed).
- Notes: Next: SRV-015 (money utils). Merge only after ALL CI checks green.

### T-022 — SRV-015 Money utils (integer fils, JOD strings, half-up rounding)

- Project: `WAB-Server/` (`src/utils/money/*`, `src/constants/money.ts`)
- Branch: `claude/busy-johnson-2rch94` (restarted from `main` after PR #20 merged)
- Status: DONE (PR #21 merged; CI green: Server CI verify, Secret scan, GitGuardian)
- Acceptance criteria (BE/NFR: NFR-02 correct money handling, BE-32 pricing/deposit (consumer SRV-067); BUSINESS_DOMAIN header conventions (integer fils, API decimal string with 3 decimals), §5.5 (`deposit = round_half_up(total × depositPercentage / 100)` to 1 fils; `remaining = total − paidOnline`), §12.1 assumption, ledger amounts are signed; server rules §9 "money only through `utils/money`", §5 constants):
  - [x] Money is an integer number of fils (1 JOD = 1000 fils): `isFils` / `assertFils` reject floats, NaN, Infinity, unsafe integers, non-numbers; negatives allowed (signed ledger)
  - [x] `formatJod(fils)` → decimal string with exactly 3 decimals (`12.500`, `0.001`, `-0.500`), integer arithmetic only (no float division)
  - [x] `parseJod(text)` / `isJodString(value)`: ASCII decimal string with 0–3 decimals, no leading zeros (except `0`), no sign unless `allowNegative`, no spaces/separators/exponent/non-ASCII digits/trailing dot, bounded length, result within the safe-integer range; invalid → 400 `ValidationError`; `parseJod(formatJod(x)) === x`
  - [x] `mulDivRound(amount, numerator, denominator)`: exact (BigInt) half-up rounding to 1 fils (ties away from zero for negatives), result must be a safe integer; `percentOf(amount, percent)` for an integer percent 0–100 (`depositPercentage` is 1–100)
  - [x] `sumFils(values)`: validates every element and the running total (no NaN/float/overflow leaking into money)
  - [x] Property-style tests (seeded PRNG, no new dependency) against an independent exact oracle: nearest/ties-up, monotonic, 0%/100% identities, round-trip, sums
  - [x] No hardcoded values: unit sizes, decimals, percent bounds and the string pattern live in `constants/money.ts`
- Tests: `cd WAB-Server && npm test` — 507 pass (24 suites; also against one shared Redis with 4 parallel workers); typecheck/lint/format/build green; `npm audit --omit=dev` 0. `tests/money.test.ts` = 162 tests: example tables (incl. the merchant-PRD deposit example, ties, negatives, hostile strings, the 2^53 boundary) + seeded property tests against independent exact oracles. Mutation check: 9 deliberate breakages of the implementation (ties round down, float arithmetic, leading zeros accepted, safe-range check too wide, percent bound, skipped element check, sign check off, floor→round, negative zero) were all caught by the tests.
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — pure utilities, no I/O; client-input errors are 400 `ValidationError`, programmer errors are `TypeError`/`RangeError` (become 500 via the handler); string parsing is linear-time with a bounded length (no ReDoS/BigInt blow-up). Removed an unused `CURRENCY_CODE` constant found in review (SRV-017/transactions add it when they need it).
- Notes: Usage for later tasks: money fields are `number` fils; convert only at the API edge (`formatJod` out, `isJodString` + `parseJod` in); `deposit = percentOf(total, depositPercentage)`, the rest by subtraction (`total - deposit`), never a second percentage. Decisions to confirm: (1) `depositPercentage` is treated as a whole percent (PRD says 1–100); a fractional percent would need `mulDivRound` with a bigger denominator; (2) no zod schema / OpenAPI `JodAmount` yet — the first endpoint with money adds it using `isJodString`/`parseJod`. API docs: no change.
- Next: SRV-016 (time utils). Merge only after ALL CI checks green.

### T-023 — SRV-016 Time utils (UTC instants, Asia/Amman days, `HH:mm`, DST-safe ranges)

- Project: `WAB-Server/` (`src/utils/time/*`, `src/constants/time.ts`)
- Branch: `claude/busy-johnson-2rch94` (restarted from `main` after PR #21 merged)
- Status: DONE (PR #22 merged by the user at 12:37:45Z while the verify job was still running; that job then finished green at 12:38:07Z and the push run on `main` was fully green too)
- Acceptance criteria (BE/NFR: NFR-12 "UTC storage; Asia/Amman for schedules, open/closed status, reminders and reports"; consumers BER-02 (90 days, 15-min slots), BER-04/BE-34 (pending bookings hold their slot → half-open ranges); BUSINESS_DOMAIN §5.1 (instants UTC, business dates/hours in `settings.timezone`, `HH:mm` is local time), §5.3 (open/closed by local date), §5.4 (slots), `DayOfWeek` enum; server rules §9 "time only through `utils/time`", §5 constants):
  - [x] `isHHmm` / `parseHHmm` / `formatHHmm`: strict 24-hour `HH:mm` ↔ minutes since local midnight (0–1439); invalid input → 400 `ValidationError` (same pattern as `parseJod`)
  - [x] Civil dates `YYYY-MM-DD` independent of any zone: strict real calendar dates (leap years, no `2026-02-30`), `addDays`, `diffDays`, `dayOfWeek` (SUN…SAT = the domain enum values)
  - [x] The time zone is always a parameter (settings/config); `DEFAULT_TIMEZONE = 'Asia/Amman'` lives in constants; invalid zone names rejected (`isValidTimeZone`); no hardcoded UTC offset
  - [x] `localDateOf(instant, tz)` / `localMinutesOf(instant, tz)`: Amman rolls to the next day at exactly 21:00:00.000Z; 20:59:59.999Z is still the previous day
  - [x] `zonedTimeToUtc(date, minutes, tz)`: exact inverse of the local view; DST gap → moved forward, overlap → first occurrence (documented + tested)
  - [x] `localDayRange(date, tz)` = half-open `[start, end)`; consecutive days tile the timeline with no gap or overlap; day length 23/24/25 h (23.5/24.5 h in Lord Howe)
  - [x] `rangesOverlap` half-open (back-to-back bookings do not conflict), `addMinutes`; invalid `Date`s rejected
  - [x] No new dependency (built on `Intl`); every literal in `constants/time.ts`; tests cover midnight/day change, DST gap/overlap (America/New_York, Australia/Lord_Howe), seeded property tests
- Tests: `cd WAB-Server && npm test` — 664 pass (25 suites; also against one shared Redis with 4 parallel workers); typecheck/lint/format/build green; `npm audit --omit=dev` 0. `tests/time.test.ts` = 157 tests: example tables (Amman day change at 21:00:00.000Z, year/leap-day change, the 90-day window moving exactly at local midnight, a booking running past midnight, DST gap/overlap in New York and Lord Howe, a missing midnight in Havana, half-hour/45-minute zones) + seeded property tests that use no zone rules written in the test: an independent UTC+3 oracle for Amman, a brute-force search at every DST change of 13 zones (≥ 30 transitions, ≥ 10 gaps, ≥ 10 overlaps), day ranges that tile the timeline, Sakamoto weekday oracle, addDays/diffDays inverse, brute-force range overlap. Mutation check: 14 deliberate breakages of the implementation (closed overlap, later instant in an overlap, wrong gap rule, hardcoded +03:00, fixed 24 h day, accepting 2026-02-30, weekday off by one, 24:xx accepted, midnight printed as 24, one formatter for all zones, inclusive range end, wrong diffDays sign, minutes without the hour factor, no gap shift) were all caught.
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — pure functions, no I/O or state beyond a per-zone `Intl.DateTimeFormat` cache (zones come from settings/config, not clients). Client-input errors are 400 `ValidationError` (`parseHHmm`, `parseLocalDate`); programmer errors are `TypeError`/`RangeError`. Non-blocking notes: (1) `isValidTimeZone` accepts whatever `Intl` accepts, including `UTC` and fixed offsets such as `+03:00`; the settings task should also require an IANA name if it wants DST-aware zones only; (2) each `zonedTimeToUtc` costs ~4 `formatToParts` calls — fine for requests, but the availability task should compute a day's start once and add minutes for the 15-minute grid; (3) review found two literals (`12/31`, padding widths) and a duplicated pad helper — fixed. The seeded-PRNG helper moved to `tests/helpers/random.ts` and is shared with the money tests.
- Notes: Not in this task: 12-hour AM/PM text (ar: ص / م from `locales/`) and "numerals follow the active language" (both PRDs) → message-formatting/notification task; `settings.timezone` wiring → SRV-017. Assumption to confirm: salon hours never pass midnight (`close` later than `open` on the same day) — no document says otherwise; the schedule task enforces it. API docs: no change.
- Next: SRV-017 (settings). Merge only after ALL CI checks green.

### T-024 — WAB-Mobile-Customer project rules

- Project: `WAB-Mobile-Customer/` (`CLAUDE.md`; link in root `CLAUDE.md`)
- Branch: `claude/amazing-cerf-vc5ja3`
- Status: DONE
- Acceptance criteria (user request: rules at WAB-Mobile-Customer level, after reading all md/.claude/root files):
  - [x] Clean Architecture + MVI by delegate (`BaseViewModel : MVI by mvi(initialState)`; Contract/ViewModel/Screen layering) documented from the real code
  - [x] No hardcoded values (strings, colors, dp/sp, URLs, numbers) with the allowed-literal list and CI enforcement
  - [x] Arabic + English for every resource (same keys/placeholders, Arabic first)
  - [x] Performance-first checklist (stability, lazy keys, draw-phase reads, lifecycle collection, R8, size budget)
  - [x] All build variants: Android dev/prod x debug/release, iOS Debug/Release-Dev/Prod + schemes
  - [x] Always run CI; no runtime/compile errors, no warnings; no file over 300 lines
  - [x] Portrait + landscape, phones to tablets, font scale, RTL/LTR, light/dark
  - [x] New branch per task; never push to `main` (cloud-pinned branch exception stated)
  - [x] Mandatory-reading list covers root `CLAUDE.md`, every `.claude/*.md`, `AGENTS.md`, `TECHSTACK.md`, PRD/BRD/Design Script; real module map replaces the generated one in `AGENTS.md`
  - [x] Linked from root `CLAUDE.md` (§6)
- Tests: docs only (no source code); every module path, file and class named in the rules was checked against the repo
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — docs only. The rules also name artifacts that T-025, T-029, T-030 deliver (`scripts/ci/*`, `customer-ci.yml`, `config/budgets.json`, `LocalSizes`/`LocalElevation`/`LocalAdaptive`, `AppWindowSize`, `AppAdaptiveGrid`, the iOS `iosApp-Dev|Prod` schemes); T-027 records the final reconciliation of those names.
- Notes: Branch is the cloud-pinned branch (restarted from `main` after PR #22 merged; exception to `<type>/<name>`). `AGENTS.md` is generated and points at a missing `PROJECT_STRUCTURE.md`; left untouched, CLAUDE.md §2 is the module map. Open: separate Firebase apps for dev (`applicationIdSuffix`) need the owner's Firebase dev project.

### T-025 — Customer app build variants + CI (Android, iOS, security, lint, hardcode, performance)

- Project: `WAB-Mobile-Customer/` (`build-logic`, `androidApp`, `iosApp`, `core/common`, `core/network`, `composeApp`, `scripts/ci`, `config`) + `.github/workflows/customer-ci.yml`
- Branch: `claude/amazing-cerf-vc5ja3`
- Status: DONE (PR #23 merged)
- Acceptance criteria (user request: CI that builds, checks security, lint, hardcoded values and performance for Android and iOS; all build variants dev[debug, release] and prod[debug, release] + iOS schemes; no warnings; files <= 300 lines):
  - [x] Android flavors `dev`/`prod` x build types `debug`/`release` (AGP DSL checked against the 9.1 API reference); per-flavor `BuildConfig.API_BASE_URL`/`ENVIRONMENT` from `gradle.properties`/`local.properties`; dev app name override (AR+EN); release minified + shrunk (R8) with keep rules; Lint with `warningsAsErrors`
  - [x] iOS configurations `Debug-Dev`, `Release-Dev`, `Debug-Prod`, `Release-Prod` (Xcode project parsed OK), shared schemes `iosApp-Dev`/`iosApp-Prod`, `Dev.xcconfig`/`Prod.xcconfig` -> Info.plist (`APP_ENV`, `API_BASE_URL`), `KOTLIN_FRAMEWORK_BUILD_TYPE`, Swift/Clang warnings as errors, AR+EN `InfoPlist.strings`
  - [x] No hardcoded environment values: `AppEnvironment` (core/common) provided by Android `BuildConfig` / iOS Info.plist through Koin; removed `ApiConstants`, the hardcoded iOS URL, the stub `AppInfoProvider` (version "1.0.0") and a dead `ApiConfig`
  - [x] Kotlin `allWarningsAsErrors` (opt-out only with `-PwarningsAsErrors=false`), `kotlin-test` + JVM host tests (`testAndroidHostTest`) for every KMP module
  - [x] `scripts/ci/policy_checks.py`: file length (300), hardcoded colors/dimensions/texts/URLs/secrets/magic numbers, crash-prone and slow constructs (`!!`, `runBlocking`, lazy `items` without key, `collectAsState`...), AR/EN resource parity, variant wiring, config security (manifest, ATS, repositories, tracked secret files), release APK budget; ratchet baselines for legacy debt (may only shrink)
  - [x] detekt 1.23.8 + Compose rules 0.4.22 (SHA-256 pinned downloads), SwiftLint, gitleaks
  - [x] `customer-ci.yml`: policy, lint, secret-scan, Android matrix (assemble + lint + tests + R8/APK budget), iOS matrix (xcodebuild + Kotlin/Native tests + SwiftLint), one required `Customer CI passed` check
  - [x] Security hardening: `allowBackup=false`, `usesCleartextTraffic=false`
- Tests: `python3 -m unittest discover -s scripts/ci/tests` — 67 pass (policy lexer, hardcoded, quality, baseline, localization, file length, variants, security, budget, CLI, and the repository itself); `scripts/ci/run_detekt.sh` exit 0; `policy_checks.py all` ok; Kotlin `AppEnvironmentTest` (runs in CI)
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — NOT VERIFIED HERE: the sandbox cannot reach Google Maven/the Android SDK (`dl.google.com` is blocked by the egress policy), so Gradle (Android/iOS), Android Lint, R8 and `xcodebuild` have not run locally; the first CI run is the real compile. DECISIONS TO CONFIRM: (1) dev keeps the production application id/bundle id (a suffix needs a matching Firebase app; `DEV_APPLICATION_ID_SUFFIX`/`BUNDLE_ID_SUFFIX` are ready); (2) API hosts are PLACEHOLDERS until the platform domain is decided; (3) `allowBackup=false` and `usesCleartextTraffic=false` are new; (4) no dependency vulnerability scan yet (Gradle has no lockfile): recommend Dependabot alerts or Gradle dependency locking + OSV.
- Notes: Legacy debt is in `config/policy-baseline.json` and `config/detekt/baseline.xml`; T-029/T-030 remove the design-system entries. Local runs: `scripts/ci/run_local_checks.sh`.

### T-029 — Customer design system: tokens, fonts, theme, adaptive layout

- Project: `WAB-Mobile-Customer/core/design-system` (`theme/*`), `composeApp` (App, SplashScreen)
- Branch: `claude/amazing-cerf-vc5ja3`
- Status: IN REVIEW
- Acceptance criteria (user request: implement design system and theme, handle landscape/portrait, everything related to the design; design source = `design/*.dc.html` + Design Script):
  - [x] WAB violet light/dark color roles from the design export (ink/muted/faint, soft, line, gradient #6D28D9 to #A855F7, hero backdrop, shimmer) replace the template's emerald palette; status text colors meet 4.5:1 on their tinted containers (unit-tested)
  - [x] Typography: Playfair Display + Poppins (English), IBM Plex Sans Arabic (Arabic, by layout direction); OFL font files bundled in composeResources/font
  - [x] Spacing, shape, size, elevation, alpha and motion tokens; no literals outside `theme/`
  - [x] Adaptive layout: `AppWindowSize` (width/height class, orientation), `AdaptiveTokens` (navigation bottom bar vs rail, margins, max content width, grid columns) re-evaluated on rotation
  - [x] Material scheme/typography mapped from WAB roles; `AppTheme.colors|spacing|...` accessors
- Tests: `AdaptiveTokensTest`, `ColorTokensTest` (commonTest, run by CI: testAndroidHostTest and iosSimulatorArm64Test)
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — NOT compiled locally: Google Maven is blocked in the sandbox and the desktop harness could not resolve androidx artifacts, so CI is the first compile. Fonts come from the Google Fonts releases via npm (@expo-google-fonts, OFL).
- Notes: Template emerald theme, `AppIcons.kt` (1905 lines of hand-drawn vectors) and 40 template components removed.

### T-030 — Customer base components

- Project: `WAB-Mobile-Customer/core/design-system` (`components/*`, `icons`, `preview`), `feature/sample`, `composeApp`
- Branch: `claude/amazing-cerf-vc5ja3`
- Status: IN REVIEW
- Acceptance criteria (Design Script §1.2, PRD §3, §12):
  - [x] Text, buttons (primary/secondary/outlined/text/destructive with enabled/disabled/loading), icon button, card, divider, status badge (5 tones) and count badge (1-99, 99+), filter chip (selectable/removable), time-slot chip, rating display + input (decimals), section header
  - [x] Text field (default/focused/filled/error/disabled), search bar (editable + static), dropdown, OTP input (backend length, digits LTR, sanitised), segmented tabs, switch/checkbox/radio/sliders
  - [x] Dialog (confirm/info), bottom sheet, full-screen sheet, toast, empty/error/offline states, shimmer placeholders, avatar with availability dot, step indicator
  - [x] Navigation: top bar (back mirrors in RTL), bottom bar, rail, `AppNavScaffold` choosing by window; `AppScreen` (insets, max width), pull to refresh, adaptive grid, sticky action bar
  - [x] AR + EN strings for every component text; no hardcoded values (policy checks: design-system and app UI have no baseline entries)
  - [x] Sample feature screen and Splash rebuilt on the components (portrait + landscape via adaptive grid)
  - [x] Previews: phone portrait/landscape, tablet landscape, light/dark, RTL/LTR
- Tests: `ComponentLogicTest` (badge label, star fill, step state, OTP sanitising, initials) + policy tests; detekt (Compose rules) exit 0
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — NOT compiled locally (see T-029). Not built: calendar, country-code picker, salon/service cards, media viewer (feature-level, need data models). Legacy hardcode debt outside the design system stays in `config/policy-baseline.json` (ratchet).
- Notes: UnstableCollections detekt rule disabled (strong skipping). First CI run found a real compile error (a KDoc containing a slash-star opened a nested comment, so the whole design system failed to compile); fixed, and policy rule Q008 + test now catch it. Loops/review re-run after the fix: policy tests 68 pass, detekt exit 0.

### T-026 — SRV-017 Settings: model, repository, typed registry, service with Redis cache

- Project: `WAB-Server/` (`src/models/setting.model.ts`, `src/repositories/settings.repository.ts`, `src/domain/settings/*`, `src/constants/settings.ts`)
- Branch: `claude/busy-johnson-2rch94` (restarted from `main` after PR #22 merged)
- Status: DONE (PR #24 merged by the user seconds after it was marked ready; CI result verified afterwards, see T-027 notes)
- Acceptance criteria (BE/NFR: BE-65 "all platform settings configurable by admin", NFR-06 stateless instances sharing Redis, NFR-02 no stale-cache poisoning; BUSINESS_DOMAIN §3.7 `settings` (key/value, cached in Redis), §10 keys and defaults, §5.1 timezone; server rules §5 "business-tunable values come from the settings collection, defaults kept in constants", §2 repository is the only DB code):
  - [x] A typed registry of every §10 key (38) in `domain/settings`: default (in `constants/settings.ts`) + zod schema (structural validation only: integers, positive, percent 0–100, arrays/objects, IANA time zone, currency `JOD`); every default satisfies its own schema; a test holds an independent copy of the §10 table
  - [x] `settings` model: `key` (unique, required), `value` (Mixed, required; `0`/`false`/`[]` allowed), timestamps; `SettingsRepository` (`findAllEntries`, `upsert` that creates on first use and retries once on a duplicate-key race)
  - [x] `createSettingsService({store, redis, logger})`: `snapshot()`, typed `get(key)`, `set(key, value)`; `set` validates (unknown key / invalid value → 400 `ValidationError` with details prefixed by the key), persists the normalized value and returns it; values stored in the database that are unknown or invalid never crash a request: the default is used and a warning names the key
  - [x] Redis cache of the stored overrides, shared by all instances: a hit does not touch Mongo; after `set`, every instance sees the change at once (version bump + delete in one `MULTI`); a read that started before a `set` can never write stale data back (compare-and-set on the version); TTL is only a safety net; Redis down → reads fall back to Mongo and `set` still persists (error logged); a corrupt cache payload is treated as a miss
  - [x] Returned values are read-only (frozen), so a caller cannot corrupt the in-process memo
  - [x] No hardcoded values: key names, defaults, bounds, cache key parts and TTL in `constants/`; the service is not wired into `server.ts` yet (first consumer: SRV-027)
- Tests: `cd WAB-Server && npm test` — 820 pass (27 suites; also on one shared Redis with 4 workers); typecheck/lint/format/build green; `npm audit --omit=dev` 0. New: `tests/settings.test.ts` (135: registry vs an independent copy of §10, every key tested by its kind, service on a real Redis incl. the stale-write race, corrupt cache, Redis outage with cool-down) and `tests/settingsRepository.test.ts` (21: model, upsert, duplicate-key retry). Mutation check: 24 deliberate breakages of the settings code all caught (QA found one real test gap — only one of the two page-size keys was bound-tested — now every key is tested per kind, and a test fails if a key has no kind). Hygiene fixed in older tests: ioredis' 2-second force-close timer made the limiter suite (SRV-014) and the Redis helper keep Jest alive after short runs.
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — settings are read through one service (Redis cache shared by instances, version-guarded against stale writes, database fallback with a 5 s Redis cool-down so an outage does not slow every request); stored garbage never crashes a request. `isDuplicateKeyError` now shared with the error normalizer (no duplicate). Not wired into `server.ts` yet (first consumer SRV-027).
- Notes: Assumptions to confirm: (1) validation is structural only — the Admin PRD (A28) lists defaults but no min/max, so ranges such as `otp.length` 4–10 are sanity guards, not business rules; (2) §10 shows `alerts.api5xxRatePct = 2 (window 10 min)` — the window is not a key, so it stays a constant for the alerts task (SRV-106); (3) the Admin PRD's "payout frequency note" is not a §10 key and is left to the admin-settings task; (4) locations, app versions and maintenance have their own collections (§3.2, §3.6), not `settings`. New backlog row **SRV-017a**: create indexes at startup (production runs with `autoIndex: false`, so the unique `settings.key` index would not exist). API docs: no change.
- Next: SRV-017a (indexes at startup). Merge only after ALL CI checks green.

### T-027 — SRV-017a Create indexes at startup

- Project: `WAB-Server/` (`src/models/index.ts`, `src/utils/database/indexes.ts`, `src/server.ts`)
- Branch: `claude/busy-johnson-2rch94` (restarted from `main` after PR #24 merged)
- Status: DONE (PR #25 merged by the user; PR run and `main` run green — #24 verified green too)
- Acceptance criteria (BE/NFR: NFR-02 correctness (unique keys), NFR-06 stateless instances; BUSINESS_DOMAIN §3 indexes per collection; server rules §9 every query backed by a schema-declared index; `connectMongo` runs with `autoIndex: false` in production):
  - [x] `models/index.ts` lists every model (`ALL_MODELS`); a test fails when a `*.model.ts` file exists that is not listed
  - [x] `ensureIndexes(models, logger)` creates the missing indexes with `createIndexes()` (create-only: it never drops or changes an index), one model at a time, logging each model; a failure stops start-up with the model named
  - [x] Called by `main()` right after MongoDB connects, inside the cleanup `try` so a failure closes the connections
  - [x] No hardcoded values; safe to run on every start and from several instances at once (idempotent)
- Tests: `cd WAB-Server && npm test` — 826 pass (28 suites; also on a shared Redis with 4 workers); typecheck/lint/format/build green; audit 0. `tests/indexes.test.ts` (6). Mutation check: swallowing a failure, skipping the first model and not awaiting `createIndexes` were all caught.
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — create-only (never drops), idempotent, runs inside the start-up cleanup `try`. NOT verified against a real MongoDB (none on the runner): the first `docker compose up` run confirms. Needs the Mongo user to hold createIndex rights (included in readWrite).
- Notes: API docs: no change. Each later schema task adds its model to `ALL_MODELS`.
- Next: SRV-018 (reference-data seeds). Merge only after ALL CI checks green.

### T-028 — SRV-018 Reference-data seed: countries, cities, areas (Jordan)

- Project: `WAB-Server/` (`src/models/{country,city,area}.model.ts`, `src/repositories/locations.repository.ts`, `src/seeds/*`, `src/constants/referenceData.ts`, `package.json` script `seed`)
- Branch: `claude/busy-johnson-2rch94` (restarted from `main` after PR #25 merged)
- Status: DONE (PR #26 merged; all 3 checks green on the head, merged by me)
- Acceptance criteria (BE/NFR: BE-65 locations configurable by admin (data side), NFR-09; BUSINESS_DOMAIN §3.2 `countries {code, name{ar,en}, dialCode, flagKey, phoneRegex, active, sortOrder}` unique `code`, `cities {name{ar,en}, countryCode, active, sortOrder}`, `areas {cityId, name{ar,en}, active, sortOrder}` index `cityId`; Customer PRD "countries list (flag, name, dial code, phone regex)"):
  - [x] Models for countries, cities, areas exactly as §3.2 with their indexes (country `code` unique; city `{countryCode, active, sortOrder}`; area `{cityId, active, sortOrder}`), registered in `ALL_MODELS`; codes/dial codes/regex validated
  - [x] `insertIfMissing(naturalKey, data)` on the base repository: creates only when absent and never overwrites (so re-seeding keeps admin edits); reports whether it created
  - [x] Seed data in `constants/referenceData.ts`: Jordan (`JO`, `+962`, mobile regex on the national number), the 12 governorate cities, a documented starter set of Amman areas (the five named in the Design Script + common ones), every name in ar + en
  - [x] `seedReferenceData` is idempotent (second run creates nothing), keeps manual changes, and links areas to the right city; `npm run seed` connects, creates indexes, seeds, disconnects
  - [x] Settings are NOT seeded: a missing key already means "default", and writing the defaults would pin them against later default changes
- Tests: `cd WAB-Server && npm test` — 843 pass (29 suites; also on a shared Redis with 4 workers); typecheck/lint/format/build green; audit 0. `tests/referenceData.test.ts` (17): seed-data integrity (both languages, Arabic script, regex accepts/rejects numbers, unique names/sort orders), models and indexes, `insertIfMissing`, seed idempotency, admin edits kept, same-named areas in two cities. Mutation check: 6 breakages; one survived (area key without `cityId`) → seed data made injectable and a test added → caught. Built `npm run seed` exits 1 cleanly without a database.
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — insert-only seeds (never overwrite), models registered in `ALL_MODELS`. NOT verified against a real MongoDB (none on the runner): first `docker compose up` + `npm run seed` confirms. Public endpoints for these lists are SRV-036.
- Notes: Assumptions to confirm: (1) `phoneRegex` applies to the national number without the leading 0 (`^7[789][0-9]{7}$`: Zain 77, Orange 77/78, Umniah 78/79); (2) `flagKey` is a storage key `flags/jo.svg` (the asset itself comes with the storage task); (3) only Amman gets starter areas — other cities' areas are added in the admin Locations editor. API docs: no change.
- Next: SRV-019 (demo catalog seed). Merge only after ALL CI checks green.

### T-029 — SRV-019 Demo catalog seed (dev only)

- Project: `WAB-Server/` (`src/models/catalogService.model.ts`, `src/constants/{enums,demoCatalog}.ts`, `src/seeds/{demoCatalog,runDemo}.ts`, script `seed:demo`)
- Branch: `claude/busy-johnson-2rch94` (restarted from `main` after PR #26 merged)
- Status: DONE (PR #28 merged by the user)
- Acceptance criteria (BE/NFR: BE-65/Admin PRD A23 catalog (data side); BUSINESS_DOMAIN §3.2 `catalogServices {name{ar,en}, description{ar,en}, imageKey, gender: Gender, active, sortOrder}`, index `{gender, active, sortOrder}` + text on names, `Gender = MALE | FEMALE`; backlog: dev-only, flagged as demo data):
  - [x] `catalogServices` model as in §3.2 with both indexes, registered in `ALL_MODELS`; `Gender` enum constant
  - [x] Demo data in `constants/demoCatalog.ts`: women's and men's services, every name and description in ar + en, image keys under `demo/catalog/` (the demo flag, since the domain has no field for it)
  - [x] `seedDemoCatalog` is insert-only and idempotent (same name may exist for both genders)
  - [x] `npm run seed:demo` refuses to run in production (exit 1, nothing written); otherwise connects, creates indexes, seeds, disconnects
- Tests: `cd WAB-Server && npm test` — 854 pass (30 suites; also on a shared Redis with 4 workers); typecheck/lint/format/build green; audit 0. `tests/demoCatalog.test.ts` (11): data in both languages, no duplicates per audience, model + indexes, idempotent seed keeping admin edits, production refusal. Mutation check: 7 breakages (wrong key, wrong numbering, inverted production guard, unknown gender allowed, missing demo prefix…) all caught. Built `seed:demo` exits 1 in production.
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — demo flag = guarded script + `demo/` image keys (no field invented). Arabic names need a native check. NOT run against a real MongoDB.
- Notes: Assumption: `imageKey` is required in the domain, so demo rows use placeholder keys whose files do not exist (clients show a placeholder). The text index uses `default_language: none` because Arabic has no built-in Mongo stemmer; real Arabic search is the Atlas Search task (SRV-059). API docs: no change.
- Next: SRV-020 (audit log + server events writer). Merge only after ALL CI checks green.

### T-031 — SRV-020 Audit-log writer and server-events writer (append-only)

- Project: `WAB-Server/` (`src/models/{appendOnly,auditLog.model,serverEvent.model}.ts`, `src/repositories/{appendOnly,auditLogs,serverEvents}.repository.ts`, `src/domain/{audit,events}/*`, `src/constants/{audit,enums}.ts`)
- Branch: `claude/busy-johnson-2rch94` (restarted from `main` after PR #28 merged)
- Status: DONE (PR #30 merged into `server`)
- Acceptance criteria (BE/NFR: BE-65/Admin PRD audit trail, NFR-08 observability, CLAUDE.md §5.12 admin actions always with reason + audit log; BUSINESS_DOMAIN §3.7 `auditLogs {adminId, action, entityType, entityId, before?, after?, reason, ip, userAgent}` append-only, `serverEvents {ts, name, actorType, actorId?, salonId?, bookingId?, params, platform?, appVersion?}`; backlog: "No update/delete API on `auditLogs`; tests prove immutability"):
  - [x] `auditLogs` and `serverEvents` models as in §3.7 with indexes (admin / entity / action, newest first; ts, name, actor, booking), registered in `ALL_MODELS`; `ActorType` and `Platform` enums in `constants/enums.ts`
  - [x] Immutability: every update/replace/delete query, document delete/update, bulk write and re-save of a stored document throws `AppendOnlyViolationError` (500); append-only repositories expose only `append`, `findById`, `findPage`
  - [x] `createAuditWriter(store).record(entry)`: validates (admin id, UPPER_SNAKE action, non-blank trimmed reason, entity, ip, user agent), omits absent before/after, a bad entry is a 400 and nothing is stored, a storage failure reaches the caller (an admin write must not succeed without its audit record)
  - [x] `createServerEvents({store, logger}).track(event)`: validates the event (dotted lower-case name, actor type, ids, platform), redacts secrets in `params`, stamps `ts` from the clock, and NEVER throws (invalid or failed events are logged, result `false`)
  - [x] No hardcoded values: patterns, limits and operation lists in `constants/audit.ts`
- Tests: `cd WAB-Server && npm test` — 897 pass (31 suites); lint/format/typecheck/build green; audit 0. `tests/audit.test.ts` (43). Mutation check: 12 compile-safe breakages (dropping any mutating operation from the list, bulk-write guard, save guard, blank reason, action/admin id pattern, no redaction, throwing tracker, wrong `ts`, model not registered) all caught; 1 equivalent mutant (document-level `updateOne` hook is also covered by the query-level hook).
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — DECISIONS TO CONFIRM: (1) `serverEvents` is a normal indexed collection, not a Mongo time-series collection: Mongoose creates time-series collections only through `createCollection`, `createIndexes` would silently create a normal one, and a real MongoDB is not available here to verify; converting is a one-off migration for the ops/analytics task (SRV-110); (2) no retention (TTL) is defined by the domain, none invented; (3) database-level protection (a role without update/delete) is an ops task, the guarantee here is in code. Not wired into `server.ts` (consumers: admin tasks, SRV-027, jobs). NOT run against a real MongoDB.
- Notes: Usage: admin services call `audit.record({adminId, action: 'SALON_SET_OFFLINE', entityType, entityId, before, after, reason, ip, userAgent})` in the same request as the change; pass snapshots without secrets. Anything non-critical uses `events.track(...)`. API docs: no change.
- Next: SRV-021 (booking reference number). Merge only after ALL CI checks green.

### T-024 — ADM-01 Admin foundation: rules, design system, theme, base components, infrastructure, CI

- Project: `WAB-Admin-Dashboard/` (+ `.github/workflows/admin-ci.yml`, root docs)
- Branch: `claude/keen-noether-jgokyc`
- Status: IN REVIEW
- Acceptance criteria (PRD §2–3 global UI rules, §4 auth shell; ROADMAP ADM-01; user rules):
  - [x] `WAB-Admin-Dashboard/CLAUDE.md` with the user's rules (clean arch + MVC, no hardcode, AR+EN, performance, 4 build variants, CI, zero warnings, 300-line limit, responsive, branch per task, never push main)
  - [x] CI: typecheck, lint (0 warnings), format, unit tests, hardcoded + 300-line scan, 4-variant build matrix, bundle/perf budget + artifact safety, dependency audit, secret scan, e2e on Chromium (Android-class) and WebKit (iOS-class) in portrait + landscape
  - [x] Design system + theme: tokens cloned from the customer design (light/dark, rem scale, RTL/LTR, fonts), CSS variables, ThemeProvider (light/dark/system), language provider (ar default)
  - [x] Base components: Button, IconButton, Badge, Card, KpiCard, TextField/TextArea/Select/Toggle, Tabs, DataTable (sticky header, sort, skeleton/empty/error), Pagination, Modal, ReasonDialog (mandatory reason), Toast, Skeleton, Spinner, EmptyState, ErrorState, ErrorBoundary, AsyncView, PageHeader; dev-only `/design-system` gallery
  - [x] All screen sizes: compact/medium/expanded from tokens, docked collapsible sidebar vs inert drawer, portrait/landscape, no horizontal scroll (e2e)
  - [x] Layers: config (zod, per-variant rules), HttpClient (timeout, retry, envelope, 401), typed AppError + normalization, logger with redaction, safe storage, global error handlers, mock/real data source switch, session store, composition root, login (2-step) + guarded routes
- Tests: `cd WAB-Admin-Dashboard && npm run verify` — 133 unit tests pass (14 files); 4 variants build; `check:size` OK for release; e2e 12/12 on Chromium (desktop, Pixel portrait/landscape, tablet); WebKit/iOS projects run in CI only (no WebKit on this runner)
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile ✔ (responsive/RTL/a11y for web), Architect ✔, QA ✔) — QA found and fixed: Modal stole focus on every parent render; grid items widened the page on phones (horizontal scroll); closed drawer stayed focusable (now `inert`); drawer shadow leaked while closed.
- Notes: Branch is the cloud-pinned branch (restarted from `main`). ASSUMPTIONS to confirm: (1) stack React 19 + Vite + TS (PRD §2.2 says stack TBD); (2) "android/ios" interpreted as Android-class Chromium and iOS-class WebKit browsers/viewports because the admin is a web app; (3) "debug/release" = unminified+source maps vs minified; mock data source excluded from all prod builds; (4) admin auth endpoints (`/admin/v1/auth/login|verify-otp|logout`) are assumed until `contracts/` (INT-01) exists. Not done here: global search, alerts bell data, real pages (ADM-02…05), Socket.IO client, Excel/PDF export. CI workflow itself has not run on GitHub yet.

### T-032 — SRV-021 Booking reference number and id utils

- Project: `WAB-Server/` (`src/utils/reference/*`, `src/utils/database/{ids,errors}.ts`, `src/constants/reference.ts`)
- Branch: `claude/busy-johnson-2rch94` (restarted from `origin/server` after PR #30 merged; PR targets `server`)
- Status: DONE (PR #32 merged into `server`)
- Acceptance criteria (BE/NFR: BE-32 "a unique reference number", NFR-02; BUSINESS_DOMAIN §3.4 `referenceNumber` unique ("WAB-" + 6–8 base32 chars), §12.6 format `WAB-XXXXXX` base32 without ambiguous characters; backlog: collision-safe via unique index + retry):
  - [x] `generateReferenceNumber()`: `WAB-` + 6 symbols of the Crockford base32 alphabet (no `I L O U`), from `crypto.randomBytes` masked to 5 bits (no modulo bias); source injectable for tests
  - [x] `isReferenceNumber` (canonical form only) and `normalizeReferenceNumber` (case, spaces, missing dash, look-alikes `O`→`0`, `I`/`L`→`1`; invalid → `null`) for customer/salon lookups
  - [x] `withUniqueReference(create)`: retries with a new number only on a duplicate-key error of the reference field (or an unspecified key), rethrows other failures and duplicates of other unique indexes unchanged, gives up after 5 attempts as a 500 `InternalError` keeping the cause
  - [x] Id utils: `isObjectIdString`, `newId`, `toObjectId` (malformed → 400); `isValidId` of the base repository reuses them; `duplicateKeyFields(error)` helper
  - [x] No hardcoded values: prefix, length, alphabet, look-alikes, attempts in `constants/reference.ts`
- Tests: `cd WAB-Server && npm test` — 956 pass (32 suites); lint/format/typecheck/build green; audit 0. `tests/reference.test.ts` (59): alphabet, byte→symbol mapping, 20 000-sample uniformity, canonical/normalize tables, retry rules (first try, collision, other index, compound index, other error, exhaustion, custom limit), id utils. Mutation check: 18 breakages (alphabet, length, mask, look-alike map, attempts, retry conditions, error type, separator handling, id check…) all caught; 2 equivalent mutants (`x % 32` ≡ `x & 31`; double case conversion).
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — pure helpers, no I/O. The booking model with its unique `referenceNumber` index comes with SRV-070/071, which call `withUniqueReference`. Decision to confirm: 6 symbols (32^6 ≈ 1.07 billion numbers) as in §12.6; the domain allows 6–8, change `REFERENCE_CODE_LENGTH` if volume ever needs more. API docs: no change.
- Next: SRV-022 (provider interfaces). PRs target `server`; merge only after ALL CI checks green.

### T-033 — SRV-022 Provider interfaces and fakes: OTP and storage

- Project: `WAB-Server/` (`src/providers/{index.ts,otp/*,storage/*}`, `src/constants/providers.ts`, `src/config/*`, `.env.example`, `CLAUDE.md` §4, `README.md`)
- Branch: `claude/busy-johnson-2rch94` (restarted from `origin/server` after PR #32 merged; PR targets `server`)
- Status: DONE (PR #33 merged into `server` by the user)
- Acceptance criteria (BE/NFR: BE-01 / BE-07 phone + Firebase OTP via `wab-otp`, BE-70 presigned uploads via `wab-storage`, NFR-09; wab-otp BRD OTP-02/03/09, wab-storage BRD STO-01..05; backlog: typed interfaces/errors, fake implementation selected by config `*_PROVIDER=fake|real`; server rules §2 externals only through interfaces injected into services):
  - [x] `OtpProvider.verify({proof, expectedPhone, purpose})` → `VERIFIED(phone) | INVALID_PROOF | PHONE_MISMATCH | EXPIRED`; provider outage throws `ExternalServiceError` (never an outcome); E.164 phones
  - [x] `FakeOtpProvider` + `fakeOtpProof(phone, kind)` (valid / expired / invalid / provider-error); garbage proofs are `INVALID_PROOF`; a non-E.164 expected phone is a caller bug (`RangeError`)
  - [x] `StorageProvider`: `createUploadUrl` (PUT target pinned to the content type, expiry), `confirmUpload` (existence, real type, size; rejected objects are deleted), `getPublicUrl` (CDN), `getSignedUrl` (private), `delete` (unknown keys ignored)
  - [x] `FakeStorageProvider` (in memory, injectable clock) with `simulateUpload`/`has` test helpers; server-generated keys validated (no empty/`.`/`..` segments, 1024 chars), content type, positive whole `maxBytes`, TTL 1..604 800 s; invalid arguments reject (async API) or throw (`getPublicUrl`) as `RangeError`
  - [x] Config: `OTP_PROVIDER`, `STORAGE_PROVIDER` = `fake|real`, default `fake` outside production; production must set every provider to `real` (fails fast naming the key); `createProviders` builds the fakes, refuses fakes in production, and fails loudly (`ProviderUnavailableError`) for `real` until the integrations exist
  - [x] `.env.example`, `CLAUDE.md` §4 folder layout, `SOURCE_LAYOUT` and README updated; no hardcoded values (fake hosts use the reserved `.invalid` TLD, in `constants/providers.ts`)
- Tests: `cd WAB-Server && npm test` — 1022 pass (33 suites); lint/format/typecheck/build green; audit 0; `npm run docs` no diff. `tests/providers.test.ts` (62) + new config tests. Mutation check: 26 compile-safe breakages (phone mismatch, expired, provider error, proof format, size/expiry boundaries, type check, visibility, private URL guard, bulk-delete atomicity, TTL and key-length limits, production guards, default mode) all caught; one redundant `..` check was found dead (the key pattern already forbids it) and removed.
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — DECISIONS TO CONFIRM: (1) `OtpProvider` carries only `verify`: the wab-otp BRD also lists `precheck/reportFailure/getConfig`, but limits, blocks and `otpLength`/resend come from the backend limiter and settings (SRV-014/017/027), so they stay out of the provider; (2) `purpose` is accepted for future server-verified providers (Firebase cannot bind it); (3) `createProviders` is NOT wired into `main()` yet: production config now requires `real`, which does not exist, so wiring it before a consumer exists would only stop the server from starting; the first consumer (SRV-027 / SRV-046) wires it. Not run against real Firebase or S3. CI note: a clean-clone replay found one real red (README not Prettier-formatted; fixed in `32f2e21`); since 13:44Z GitHub Actions jobs for this repo also fail in ~3 s with no runner (infrastructure, not code).
- Notes: Usage: `const {otp, storage} = createProviders(config.providers, config.isProduction)` once at start-up, inject into services; tests inject `FakeOtpProvider`/`FakeStorageProvider` directly. API docs: no change.
- Next: SRV-023 (Notifier, PaymentProvider, AnalyticsProvider). PRs target `server`; merge only after ALL CI checks green.

### T-033 — Customer language and theme handling

- Project: `WAB-Mobile-Customer/core/domain` (`AppLanguage`, `AppearanceSettings`), `core/storage`, `core/di`, `core/ui` (Android locale), `composeApp` (`MainViewModel`, `App`)
- Branch: `claude/amazing-cerf-vc5ja3`
- Status: IN REVIEW
- Acceptance criteria (Customer PRD §3.1 "Default language Arabic ... change applies immediately and is persisted locally", §3.2 theme default SYSTEM, data model `language` default AR / `theme` default SYSTEM):
  - [x] Arabic is the default everywhere (storage default was English; initial UI state used the device locale)
  - [x] `AppLanguage` (ARABIC/ENGLISH) owns the code and `isRtl`; accepts stored codes and platform tags (`ar_JO`, `en-US`); unknown/blank falls back to Arabic; `other` for the single switch icon
  - [x] `AppearanceSettings`: language and theme flows, `setLanguage`, `setThemeMode`, `toggleLanguage` (returns the language now in effect); registered in Koin
  - [x] Layout direction comes from `AppLanguage.isRtl` instead of comparing a string to the literal "ar"; the Android locale provider no longer uses `!!`
  - [x] Theme System/Light/Dark already resolved in `App`; unknown stored theme name means System
- Tests: `AppLanguageTest` (5), `AppearanceSettingsTest` (7) with a fake settings store; policy tests 68 pass; policy baseline only shrank
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — NOT compiled locally (Gradle blocked) and CI runners were unavailable at the time (jobs failed in seconds with no runner). The language/theme switch screens (Login, Register, Profile, Settings) are feature work: they inject `AppearanceSettings` and call `toggleLanguage()` / `setThemeMode()`.
- Notes: Existing installs whose stored value is a platform tag (`en_US`) still resolve. Numerals-follow-language is a formatter concern (`NumberFormatter` baseline debt), not in this task.

### T-032 — Admin backlog (ADM-001…086) written as product owner + technical writer
- Project: `WAB-Admin-Dashboard/docs/WAB_Admin_Tasks.md` (+ links in root `CLAUDE.md`, `ROADMAP.md`, `WAB-Admin-Dashboard/CLAUDE.md`)
- Branch: `claude/keen-noether-jgokyc`
- Status: IN REVIEW
- Acceptance criteria (user request: backlog tasks for WAB-Admin-Dashboard covering dev/prod envs, clean architecture + clean code, base components, layer separation, and API implementation in the data / domain / presentation layers; read the server admin API docs):
  - [x] One md backlog in the style of `WAB_Server_Tasks.md`: legend, working rules, layer recipe + Definition of Done, stage overview mapped to ROADMAP ADM-01…05 + integration, ordered task tables (ID, branch, needs, server SRV ids, status, notes)
  - [x] Env/build tasks (Stage 1A) and Appendix B env matrix; layers, shared kernel and clean-code gates (1B); API foundation: endpoint registry, session, transport-level mock, realtime, URL list state, API doc generator (1C); base components: primitives, forms, badges, tables, filters, overlays, templates, charts, media, rich text, shell, gallery (1D)
  - [x] Every feature task written as domain / data / presentation slices with endpoint ids; 86 tasks, 6 PENDING (hosting, deploy, CSP, contract drift, dev remote switch, error tracking, go-live need owner input or missing server work)
  - [x] Traceability matrix: all PRD pages A00–A29, PRD global sections, every ABR id → tasks (script-checked)
  - [x] Appendix A proposed admin API contract (109 endpoints, conventions, server task per endpoint); Appendix C decisions; Appendix D server gaps
- Tests: docs only; script checks — every `SRV-` id exists in `WAB_Server_Tasks.md`, task ids unique and every *Needs* id precedes its task, every PRD page and ABR id has a task, every endpoint is consumed by a task
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — docs only. FINDINGS to act on: `openapi.admin.json` has no paths and `contracts/` does not exist, so Appendix A is a PROPOSAL for the server/contract owners; 8 server gaps (global search, admin profile, customer devices/notifications, admin variants of salon edit endpoints, deletion-request decision, salon KPIs, journey data = SRV-110 PENDING, scheduled report emails) are listed in Appendix D.
- Notes: Pending on owner: hosting/domain, error-tracking tool. Recommendations for the open library decisions are in Appendix C.

### T-036 — Admin backlog v2 after the server merged (ADM-001…083)
- Project: `WAB-Admin-Dashboard/docs/WAB_Admin_Tasks.md` (+ `ROADMAP.md` count, `.claude/memory.md`)
- Branch: `claude/keen-noether-jgokyc`
- Status: IN REVIEW
- Acceptance criteria (user request: branch from `main` after the server PR merged, update the backlog after reading the real server APIs; order: project setup, project structure and architecture, design, then business logic and API implementation):
  - [x] Backlog reordered into Phase 1 setup, Phase 2 structure and architecture, Phase 3 design, Phase 4 business logic and API (4A foundation, 4B modules, 4C blocked by server gaps), Phase 5 integration and release
  - [x] Appendix A generated from `openapi.admin.json` (116 operations); every operation is consumed by a task (build check); the old proposed contract and its 109 endpoints are removed
  - [x] Tasks rewritten to the real API: contract tooling (generated types), real auth flow, settings via `PUT /settings/{key}`, single booking status endpoint, campaigns, recommended reorder/end, exports, alerts, reports, audit log
  - [x] Server gaps G1–G11 listed (Appendix D) with PENDING tasks in Phase 4C; Appendix F lists what changed from v1
  - [x] Traceability matrix (PRD pages A00–A29, global sections, every ABR id) still complete
- Tests: docs only; script checks — every `SRV-` id exists, task ids unique, every *Needs* precedes its task, every PRD page and ABR id traced, every OpenAPI operation consumed
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — docs only. FINDINGS: the existing admin login (T-031) uses a contract the server does not have (`challengeId`, `resend-otp`); fixed by the auth task. 15 of 83 tasks are PENDING (hosting, error tracking, dev URL, and the server gaps).
- Notes: Server `contracts/` (INT-01) still does not exist; the server OpenAPI is the contract of record.

### Pending (next)

- T-003 — Per-project rules for the remaining folders (customer, merchant, admin, packages) — awaiting user input.
- SRV-026 — next server task after T-036 is merged (see `WAB-Server/docs/WAB_Server_Tasks.md`).
- INT-01 — Contracts v1 (`contracts/`) — first task of the roadmap.
