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
- Status: IN REVIEW
- Acceptance criteria (BE/NFR: NFR-01 dependency scanning in CI, NFR-10 tests run in CI; INTEGRATION_WORKFLOW §5 path-filtered CI with lint, typecheck, tests, build, secret scan):
  - [x] Workflow runs on PRs and pushes to `main`, only when `WAB-Server/**` or the workflow changes; read-only token; concurrent runs cancelled; every job has a timeout
  - [x] `verify` job: `npm ci`, typecheck, lint, format check, tests (includes stale Swagger/Postman check), build, `npm audit --omit=dev --audit-level=high` on Node 22
  - [x] `secret-scan` job: gitleaks over full history; only the built-in `GITHUB_TOKEN` is referenced
  - [x] `tests/ci.test.ts` guards the workflow's triggers, commands, Node version, permissions and secrets
- Tests: `cd WAB-Server && npm test` — 256 pass; all CI steps replayed in a clean copy with a fresh `npm ci` (exit 0)
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — NOT verified: the workflow itself has not run on GitHub yet (first run happens on this PR). gitleaks is a second secret scanner next to GitGuardian; if the repo moves to an organization, `GITLEAKS_LICENSE` is required. Dev-only advisories (jest/istanbul) are intentionally outside the audit gate. API docs: no change.
- Notes: Contract tests job joins when `contracts/` exists (SRV-111); deploy job is SRV-011 (PENDING on hosting). Next: SRV-012 (Mongo layer) — SRV-011 is PENDING.

### Pending (next)
- T-003 — Per-project rules for the remaining folders (customer, merchant, admin, packages) — awaiting user input.
- SRV-012 — next server task (SRV-011 deploy is PENDING), start only after T-018 is merged (see `WAB-Server/docs/WAB_Server_Tasks.md`).
- INT-01 — Contracts v1 (`contracts/`) — first task of the roadmap.
