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

### T-035 — SRV-024 Identity schemas: customers, members, installations, refreshTokens, admins
- Project: `WAB-Server/` (`src/models/{customer,member,installation,refreshToken,admin}.model.ts`, `src/repositories/identity.repository.ts`, `src/constants/{enums,identity}.ts`)
- Branch: `claude/busy-johnson-2rch94` (restarted from `origin/server` after PR #39 merged; PR targets `server`)
- Status: DONE (PR #41 merged into `server`)
- Acceptance criteria (BE/NFR: BE-01, BE-04 accounts, NFR-01 no raw tokens stored; BUSINESS_DOMAIN §3.1 customers/installations/refreshTokens/admins, §3.4 members, §2 enums):
  - [x] Models with the documented fields, defaults, enums and indexes (customers: unique `phone.e164`, status, createdAt, text search; members: unique phone, `{salonId, active}`, `{salonId, providesServices, staff.serviceIds}`, one OWNER per salon via partial unique index; installations: unique `{app, installationId}` + customer/member/fcmToken; refreshTokens: unique `tokenHash` (SHA-256 hex only), subject index, TTL on `expiresAt`; admins: unique email); collection names as in the domain; all registered in `ALL_MODELS`
  - [x] Rules in the schema: `e164 = dialCode + number`; lowercase emails; names 1–50; 15 permissions only (owner-only capabilities rejected); staff profile required when `providesServices`; working hours as a pair with start < end, `HH:mm`; rating 0–5, whole counts
  - [x] Repositories: `findByPhone` (customers, members), `findByInstallation(app, id)`, `findByTokenHash`, `findByEmail` (case-insensitive)
  - [x] Enums `Language`, `AppKind`, `CustomerStatus`, `MemberRole`, `Permission`, `SubjectType`; no hardcoded values
- Tests: `cd WAB-Server && npm test` — 1177 pass (37 suites); full format:check, lint, typecheck, build green; audit 0; `npm run docs` no diff. `tests/identitySchemas.test.ts` (71). Mutation check skipped at the user's request ("fast"). INCIDENT: the interrupted mutation run left one deliberate breakage (`min: 0` removed from `admins.failedLoginCount`) in the merged code; its test caught it and T-036 restores it.
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — Schemas only (no API change). Refresh rotation/revocation logic is SRV-026; JWT SRV-025. Customers are not soft-hidden by status in the repository: services decide on BLOCKED/DELETED. `members.salonId` is a plain ObjectId until the salons model exists. API docs: no change.
- Next: SRV-025 (JWT + scope middleware).

### T-036 — SRV-025 JWT access tokens and per-scope auth middleware
- Project: `WAB-Server/` (`src/utils/auth/accessToken.ts`, `src/middlewares/auth.ts`, `src/constants/auth.ts`, `src/config/*`, `src/types/express.d.ts`)
- Branch: `claude/busy-johnson-2rch94` (restarted from `origin/server` after PR #41 merged; PR targets `server`)
- Status: DONE (PR #42 merged into `server`)
- Acceptance criteria (BE/NFR: BE-01 platform access token (short-lived), BE-03 separate namespaces/scopes, NFR-01; CLAUDE.md §4.2; BUSINESS_DOMAIN §10 `auth.accessTokenTtlSec` = 900; backlog: customer token on merchant/admin route → FORBIDDEN, tests for all 3×3 combos):
  - [x] `signAccessToken({secret, subjectType, subjectId, ttlSec, now})`: HS256, issuer `wab-server`, audience = the subject's namespace scope (CUSTOMER→customer, MEMBER→merchant, ADMIN→admin), subject = ObjectId string, expiry = `ttlSec` (caller passes the setting); invalid ttl or id are caller bugs (`RangeError`)
  - [x] `verifyAccessToken(secret, token, now)`: only HS256 (unsigned and HS512 refused), issuer, signature, expiry (valid until the expiry second), known audience, ObjectId subject, expiry present; anything wrong → 401
  - [x] `requireAuth(scope, secret)`: `Authorization: Bearer <jwt>` exactly; missing/malformed/expired/foreign-secret → 401 `UNAUTHORIZED`; valid token of another scope → 403 `FORBIDDEN`; sets `req.auth`; routes without it stay public (login, OTP pre-check)
  - [x] `JWT_ACCESS_SECRET` required, no default, ≥ 32 characters (fails fast, naming the key); in `.env.example`; `AppConfig.auth.accessSecret`
  - [x] Fix: restored `min: 0` on `admins.failedLoginCount` (left out of SRV-024 by an interrupted mutation run)
- Tests: `cd WAB-Server && npm test` — 1207 pass (38 suites); full format:check, lint, typecheck, build green; audit 0; `npm run docs` no diff. `tests/auth.test.ts` (53: round trip for all 3 subjects, expiry boundary, tampering, alg none/HS512, issuer/audience/subject/exp checks, 3×3 scope matrix over HTTP, header variants). Mutation check not run (user asked for speed).
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — Dep added: `jsonwebtoken` 9. Decisions to confirm: (1) one signing secret with the scope in `aud` (separate secrets per namespace would need three env keys); (2) token carries only subject + scope: merchant role/permissions are loaded from the database per request (SRV-0xx) so a permission change applies at once; (3) no token revocation list: access tokens are short (15 min), revocation is by refresh-token family (SRV-026). Middleware is not mounted on any route yet (no protected endpoint exists). API docs: no change.
- Next: SRV-026 (refresh tokens: hashed storage, rotation, family revocation).

### T-037 — SRV-026 Refresh tokens: hashed storage, rotation, family revocation
- Project: `WAB-Server/` (`src/domain/auth/refreshTokens.service.ts`, `src/repositories/identity.repository.ts`, `src/constants/auth.ts`, `tests/refreshTokens.test.ts`, `tests/helpers/fakeModel.ts`)
- Branch: `claude/busy-johnson-2rch94` (restarted from `origin/server` after PR #42 merged; PR targets `server`)
- Status: DONE (PR #43 merged into `server`; GitHub Actions had no runner, verified locally)
- Acceptance criteria (BE/NFR: BE-01 rotating revocable refresh token, NFR-01 no raw tokens stored; CLAUDE.md §4.2; BUSINESS_DOMAIN §3.1 `refreshTokens`, §10 `auth.refreshTokenTtlDays`):
  - [x] Token = 32 random bytes base64url (43 chars); only its SHA-256 is stored; new family per login; expiry from `ttlDays`
  - [x] `rotate`: malformed/unknown/expired -> 401; atomic claim of the old token (one winner under concurrency); new token in the same family; old marked ROTATED + `replacedBy`
  - [x] Reuse of a revoked token or a lost race revokes the whole family (`REUSE_DETECTED`), logged without the token, 401
  - [x] `revoke` (logout) idempotent and silent for unknown tokens; `revokeAll(subject)` revokes only that account's active tokens
- Tests: `cd WAB-Server && npm test` - 1229 pass (39 suites); format:check/lint/typecheck/build green; audit 0; `npm run docs` no diff. `tests/refreshTokens.test.ts` (22). Mutation check skipped (user asked for speed).
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) - service not wired to any endpoint yet (login/refresh endpoints: SRV-028/030). Caller signs the access token from the returned subject. API docs: no change.
- Next: SRV-027 (OTP pre-check endpoint).

### T-038 — SRV-027 OTP pre-check endpoint, platform limits, wrong-attempt report
- Project: `WAB-Server/` (`src/domain/otp/otpGate.service.ts`, `src/modules/shared/otp/*`, `src/modules/services.ts`, `src/constants/otp.ts`, `src/app.ts`, `src/server.ts`, docs)
- Branch: `claude/busy-johnson-2rch94` (restarted from `origin/server` after PR #43 merged; PR targets `server`)
- Status: DONE (PR #44 merged into `server`)
- Acceptance criteria (BE/NFR: BE-07, NFR-01 stricter limits on OTP; BUSINESS_DOMAIN §3.1 OTP Redis keys, §10 `otp.*` settings, §11 `OTP_BLOCKED`; Customer PRD S13, Merchant PRD M03/§4.4):
  - [x] `POST /customer/v1/auth/otp/request` and `/merchant/v1/auth/otp/request` (public): `{phone E.164, purpose}` -> `{allowed, otpLength, resendAfterSeconds, blockedUntil?}`; purposes customer LOGIN/REGISTER/CHANGE_PHONE/BOOKING_CONFIRMATION, merchant LOGIN/REGISTER/CHANGE_PHONE/BANK_DETAILS
  - [x] Limits from settings, read per call: resend countdown (not counted), 5 requests / 5 min -> 15 min block (5th allowed starts the block), 5 wrong -> 15 min block; requests and wrong codes share one block; phones independent; concurrent requests -> exactly one allowed
  - [x] `POST .../auth/otp/wrong-attempt` -> `{blocked, attemptsRemaining, blockedUntil?}`
  - [x] `OtpGate.assertNotBlocked` (429 `OTP_BLOCKED`) and `reset` for the verification endpoints (SRV-028/033)
  - [x] Per-IP route limit (fails closed, Redis store in `main()`); invalid input 400 with field details; no gate configured -> 503
  - [x] Swagger + Postman regenerated
- Tests: `cd WAB-Server && npm test` - 1254 pass (40 suites, real Redis); format:check/lint/typecheck/build green; audit 0; `npm run docs` regenerated. `tests/otp.test.ts` (25). Mutation check skipped (user asked for speed).
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile ✔ (contract matches PRD S13), Architect ✔, QA ✔) - DECISIONS TO CONFIRM: (1) a blocked phone or a running resend countdown answers 200 with `allowed:false` (PRD shape) rather than 429; `OTP_BLOCKED` is thrown by `assertNotBlocked` on verification; (2) the endpoint does not check whether the phone is registered (login/register decide that in SRV-028/033, not leaking account existence here); (3) merchant purposes taken from Merchant PRD M03; (4) per-IP limit of 20/min on OTP routes is a constant. `main()` now builds the settings service and the OTP gate (first wiring).
- Next: SRV-028 (customer auth).

### T-039 — SRV-028 Customer register/login/refresh/logout/change-phone via Firebase ID token
- Project: `WAB-Server/` (`src/domain/auth/customerAuth.service.ts`, `src/modules/customer/auth/*`, `src/constants/customerAuth.ts`, `src/repositories/identity.repository.ts`, `src/server.ts`, docs)
- Branch: `claude/busy-johnson-2rch94` (restarted from `origin/server` after PR #44 merged; PR targets `server`)
- Status: DONE (PR #45 merged into `server`)
- Acceptance criteria (BE/NFR: BE-01, BE-04, NFR-01; BUSINESS_DOMAIN §3.1 customers/installations/refreshTokens, §4.2, §11 `PHONE_NOT_REGISTERED`/`PHONE_ALREADY_REGISTERED`/`ACCOUNT_BLOCKED`/`OTP_*`; Customer PRD S11, S12, S13, S22):
  - [x] `POST /customer/v1/auth/check-phone` (LOGIN: 404 not registered / 403 blocked; REGISTER: 409 taken)
  - [x] `register` (201) and `login` (200): number resolved from country code + national number (active country, country regex), Firebase ID token verified for that exact number via `OtpProvider`, invalid/expired/other-number -> 401 `OTP_INVALID`/`OTP_EXPIRED`, blocked number -> 429 `OTP_BLOCKED` before the provider is asked; platform JWT (ttl from `auth.accessTokenTtlSec`) + rotating refresh token (`auth.refreshTokenTtlDays`); gate reset on success
  - [x] register validates city/area (area belongs to the city), unique phone incl. unique-index race (409); login: BLOCKED 403, DELETED 404, DELETION_PENDING restored (grace period)
  - [x] `refresh` rotates (reuse ends the family); a blocked/removed customer's sessions are all revoked; `logout` revokes the token and unlinks the device (idempotent)
  - [x] `change-phone` (customer token required): proof for the NEW number, number owned by another account -> 409
  - [x] device record (`installations`) created/updated and linked to the customer on login/register (analytics + push)
  - [x] Swagger + Postman regenerated
- Tests: `cd WAB-Server && npm test` - 1292 pass (41 suites); format:check/lint/typecheck/build green; audit 0; `npm run docs` regenerated. `tests/customerAuth.test.ts` (38).
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile ✔ (matches PRD S11-S13, S22), Architect ✔, QA ✔) - DECISIONS TO CONFIRM: (1) booking-confirmation OTP is NOT in this PR: it belongs to the booking draft flow (no draft exists yet), the gate and provider are ready for it; (2) a DELETED customer keeps the phone unique index, so that number cannot register again until the deletion job anonymises it (SRV account deletion task); (3) `check-phone` reveals whether a number is registered, as the PRD flow requires, behind the per-IP route limit; (4) the phone is sent as `{countryCode, number}`, the server builds E.164 from the country's dial code. `RefreshTokenService.revoke` now returns the ended session.
- Next: SRV-029 (merchant member login).

### T-040 — SRV-029 Merchant member login via Firebase ID token
- Project: `WAB-Server/` (`src/domain/auth/{merchantAuth.service,phoneVerifier,sessionTokens}.ts`, `src/modules/merchant/auth/*`, `src/modules/shared/auth/auth.schemas.ts`, `src/constants/merchantAuth.ts`, `src/repositories/identity.repository.ts`, `src/server.ts`, docs)
- Branch: `claude/busy-johnson-2rch94` (restarted from `origin/server` after PR #45 merged; PR targets `server`)
- Status: DONE (PR #46 merged into `server`)
- Acceptance criteria (BE/NFR: BE-01, BE-03, BE-04, NFR-01; BUSINESS_DOMAIN §3.1/§3.4 members, §4.2, §11 `PHONE_NOT_REGISTERED`/`MEMBER_INACTIVE`/`OTP_*`; Merchant PRD §4.3, §4.4, M02, M03):
  - [x] `POST /merchant/v1/auth/check-phone`: active member passes; unknown number 404 `PHONE_NOT_REGISTERED` (app offers "Register a new salon"); deactivated member 403 `MEMBER_INACTIVE`
  - [x] `login`: Firebase ID token verified for that exact number (`OTP_INVALID`/`OTP_EXPIRED` 401, blocked number 429 `OTP_BLOCKED` before the provider is asked), merchant-scope access token (subject MEMBER) + rotating refresh token, device linked as app MERCHANT with `memberId`, gate reset
  - [x] Profile returned for the app cache: id, salonId, names, phone, role, permissions (OWNER = all 15, others as granted), providesServices, photoKey?
  - [x] `refresh` rotates and returns the current profile (permission changes apply at once); a deactivated member gets 403 `MEMBER_INACTIVE` and loses every session; a removed member 401; `logout` revokes and unlinks the device (idempotent)
  - [x] Shared code, no duplication: `createPhoneVerifier` (country regex, OTP gate + provider) and `createSessionTokens` (access + refresh pair from settings) now serve customer AND merchant auth; shared request schemas; installations `linkMember`/`unlinkMember`
  - [x] Swagger + Postman regenerated
- Tests: `cd WAB-Server && npm test` - 1312 pass (42 suites); format:check/lint/typecheck/build green; audit 0; `npm run docs` regenerated. `tests/merchantAuth.test.ts` (20); the customer auth suite (38) still passes after the refactor.
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile ✔ (matches Merchant PRD §4.3-4.4, M02, M03), Architect ✔, QA ✔) - DECISIONS TO CONFIRM: (1) the backlog row says the token carries `salonId` + permissions; kept the SRV-025 decision instead (JWT = member + scope only; role/salon/permissions are returned in the profile and re-read from the database per request, so owner changes apply at once); (2) salon state (M05/M06 routing) is not in the profile yet: the salon model arrives with SRV-041; (3) no self-registration: an owner adds members, a new salon applies via SRV-041; (4) member change-phone (OTP to the new number) comes with the member profile task.
- Next: SRV-030 (admin login).

### T-041 — SRV-030 Admin password check with lockout, idle-timeout sessions, refresh/logout
- Project: `WAB-Server/` (`src/domain/auth/adminAuth.service.ts`, `src/utils/auth/password.ts`, `src/modules/admin/auth/*`, `src/constants/adminAuth.ts`, `src/repositories/identity.repository.ts`, refresh/session token lifetime in seconds, docs)
- Branch: `claude/busy-johnson-2rch94` (restarted from `origin/server` after PR #46 merged; PR targets `server`)
- Status: DONE (PR #47 merged into `server`)
- Acceptance criteria (BE/NFR: BE-02 admin email + password + 2FA, lockout and session timeout, NFR-01 bcrypt + lockout; BUSINESS_DOMAIN §3.1 `admins`, §10 `admin.maxFailedLogins`=5 / `admin.lockSec`=900 / `admin.sessionIdleSec`=1800; Admin PRD §4):
  - [x] `hashPassword`/`verifyPassword` (bcryptjs, cost 12; empty, over 72 bytes and malformed hashes are refused/false, never truncated or thrown)
  - [x] `verifyCredentials`: right password -> identity; wrong password and unknown email give the same 401 (an unknown email still pays one bcrypt comparison); failures counted atomically; the 5th wrong password locks for 15 minutes and restarts the count; while locked even the right password gets 429 and the password is not looked at; the lock ends exactly at `lockedUntil`; limits come from settings
  - [x] The failure count is cleared only when the whole sign-in completes (`openSession`), so a stolen password cannot brute-force the second factor for free
  - [x] `openSession`: admin-scope access token, records `lastLoginAt`/`lastLoginIp`, clears failures and any lock; refresh token lifetime = `admin.sessionIdleSec` and every rotation restarts it (idle timeout); `refresh` (reuse ends the session, deleted admin loses all sessions), `logout`
  - [x] `POST /admin/v1/auth/refresh` and `/logout` (per-IP limit, 503 when unconfigured); refresh-token lifetime can be given in seconds (`RefreshLifetime`), customers/members keep days
  - [x] Swagger + Postman regenerated
- Tests: `cd WAB-Server && npm test` - 1343 pass (44 suites); format:check/lint/typecheck/build green; `npm audit --omit=dev` 0 (new dependency `bcryptjs` 3, pure JS); `npm run docs` regenerated. `tests/adminAuth.test.ts` (20), `tests/password.test.ts` (5), 3 more in `tests/refreshTokens.test.ts`.
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) - DECISIONS TO CONFIRM: (1) the password-only login ROUTE is deliberately not added: it would open a session without the second factor (Admin PRD §4); `login` + `verify-otp` ship together in SRV-031, which calls `verifyCredentials` then `openSession`; (2) a locked account answers 429 `RATE_LIMITED` (no dedicated code in BUSINESS_DOMAIN §11); (3) "alert email on new-device login" needs the Notifier and joins SRV-031; (4) new backlog row SRV-030a: an admin bootstrap script, because nothing creates the single admin yet.
- Next: SRV-031 (admin email OTP 2FA + login routes).

### T-042 — SRV-031 Admin email OTP (2FA) and the two-step login routes
- Project: `WAB-Server/` (`src/domain/auth/adminLogin.service.ts`, `src/domain/auth/adminAuth.service.ts`, `src/modules/admin/auth/*`, `src/constants/adminAuth.ts`, `src/locales/*`, `src/server.ts`, docs)
- Branch: `claude/busy-johnson-2rch94` (restarted from `origin/server` after PR #47 merged; PR targets `server`)
- Status: DONE (PR #49 merged into `server`)
- Acceptance criteria (BE/NFR: BE-02, NFR-01 2FA + lockout; BUSINESS_DOMAIN §3.1 `admin:otp:{adminId}` hashed code TTL 300; Admin PRD §4 + decision "Email OTP"):
  - [x] `POST /admin/v1/auth/login` {email, password}: right password emails a numeric code (`otp.length`) and returns `{otpRequired, expiresAt, resendAfterSeconds}` WITHOUT tokens; wrong password / unknown email / locked account send nothing
  - [x] Code stored only as an HMAC-SHA256 (keyed with the server secret) for 300 s; a second `login` inside the resend countdown (`otp.resendAfterSec`) mails nothing new and the first code still works; later a new code replaces the old; a failed email removes the code and the cooldown so the admin can retry
  - [x] `POST /admin/v1/auth/verify-otp` {email, code}: right code opens the session and works once (atomic delete; two simultaneous requests -> one session); missing/expired -> 401 `OTP_EXPIRED`; wrong -> 401 `OTP_INVALID` and counts toward the SAME lockout as a wrong password (5 -> 15 min, 429 afterwards, also on `login`); failure count cleared on success
  - [x] Email in the request language (ar/en, `emails.*` keys with matching placeholders); alert email to `alertEmails` (or the admin email) when the sign-in address differs from the last one; best effort, never blocks the sign-in
  - [x] `main()` wires the Notifier provider (fake outside production) into the login service; Swagger + Postman regenerated
- Tests: `cd WAB-Server && npm test` - 1368 pass (45 suites, real Redis); format:check/lint/typecheck/build green; audit 0; `npm run docs` regenerated. `tests/adminLogin.test.ts` (25).
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) - DECISIONS TO CONFIRM: (1) a wrong code is counted by the password lockout (not a separate OTP counter) so one limit covers both factors; (2) "new device" is approximated by "new IP address" because the admin record only keeps `lastLoginIp`; (3) the email is plain text for now (no HTML template). NOT sent through real SMTP: `NOTIFIER_PROVIDER=real` still throws until `wab-notifications` exists.
- Next: SRV-032 (account lifecycle).

### T-043 — SRV-032 Account lifecycle: blocking, deletion grace period, purge, member deactivation
- Project: `WAB-Server/` (`src/domain/auth/accountLifecycle.service.ts`, `src/constants/accountLifecycle.ts`, `src/repositories/identity.repository.ts`, `.github/workflows/server-ci.yml` + `tests/ci.test.ts` (build-only CI, requested by the user; the commit missed PR #49 because it was merged first))
- Branch: `claude/busy-johnson-2rch94` (restarted from `origin/server` after PR #49 merged; PR targets `server`)
- Status: DONE (PR #50 merged into `server`; the CI removal followed in PR #51)
- Acceptance criteria (BE/NFR: BE-04, NFR-01, CLAUDE.md §5.12 admin actions with reason + audit; BUSINESS_DOMAIN §3.1 `refreshTokens` "Revoke all on logout-all, block, member deactivation, account deletion", §5.15 account deletion, §10 `account.deletionGraceDays`=30, §9 job `accounts:purge`):
  - [x] `blockCustomer` (admin): reason + audit entry (`CUSTOMER_BLOCK`, before/after, ip, user agent), status BLOCKED with reason/time, every session revoked; blocking twice is a no-op (no second audit entry); a deleted account is refused; works on a customer waiting for deletion; `unblockCustomer` returns ACTIVE and drops the block/deletion fields (audited, 409 if not blocked)
  - [x] `requestCustomerDeletion`: only an ACTIVE customer; DELETION_PENDING with `deletionScheduledAt` = now + `account.deletionGraceDays`; all sessions revoked, devices detached (push stops); atomic status transition (a race has one winner); login within the grace period restores the account (SRV-028)
  - [x] `purgeDueCustomers`: anonymizes every DELETION_PENDING customer whose date has passed (exact boundary), in batches of 100, idempotent: name, email, phone become non-identifying (the phone value `deleted:<id>` can never match a real number and frees the number), avatar removed from storage (failure only logged), devices and sessions ended; bookings/transactions keep the (now anonymous) customer; blocked accounts are never purged
  - [x] `deactivateMember` / `reactivateMember`: scoped to the salon (another salon's member = 404), the OWNER can never be deactivated (422 `LAST_OWNER`), sessions revoked and devices detached on deactivation, repeat is harmless
  - [x] CI: audit and secret scan removed on request, then the whole server workflow (`server-ci.yml`) and its guard test `tests/ci.test.ts` were deleted on request: no server check runs on GitHub any more
- Tests: `cd WAB-Server && npm test` - 1387 pass (46 suites); format:check/lint/typecheck/build green; `npm audit --omit=dev` 0 (run locally since CI no longer does); `npm run docs` no diff. `tests/accountLifecycle.test.ts` (20).
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) - DECISIONS TO CONFIRM: (1) the audit entry is written AFTER the change (no transaction support in the test setup); if the audit write fails the call errors although the account is already blocked, and a repeat call is a no-op that writes no entry: a Mongo transaction (SRV-070 introduces them) should wrap block/unblock then; (2) a blocked customer who had asked for deletion is never purged until unblocked (unblocking cancels the deletion request); (3) the daily 03:00 Amman `accounts:purge` trigger, the admin block endpoint and the customer delete-account endpoint are separate tasks; reviews, favorites and notifications of a purged customer are handled when those collections exist. API docs: no change.
- Next: SRV-033 (installations register/update).

### T-044 — SRV-033 Installations: register/update device, FCM token, push switch, identity link
- Project: `WAB-Server/` (`src/domain/installations/installations.service.ts`, `src/modules/shared/installations/*`, `src/constants/installations.ts`, `src/middlewares/auth.ts` (`optionalAuth`), `src/repositories/identity.repository.ts`, `src/server.ts`, docs)
- Branch: `claude/busy-johnson-2rch94` (restarted from `origin/server` after PR #51 merged; PR targets `server`)
- Status: IN REVIEW
- Acceptance criteria (BE/NFR: BE-04, BE-21 push registration, NFR-08; BUSINESS_DOMAIN §3.1 `installations`, CLAUDE.md §4.4 FCM and §4.7 "apps send the Firebase app-instance ID so guest history links to the account"; Customer PRD §3 + "FCM token registered with the backend, updated on login/logout/token refresh"):
  - [x] `PUT /customer/v1/installations`: guests register without a token; a valid customer token also links the device to the account (`customerId`) and calls `AnalyticsProvider.linkIdentity` (best effort); an invalid token is 401, a member token 403; blocked/deleted/unknown customer 401; a guest call never unlinks a signed-in device
  - [x] `PUT /merchant/v1/installations`: member token required; links `memberId`; deactivated member 403 `MEMBER_INACTIVE`, unknown 401; customer and merchant installations with the same id are separate records
  - [x] Update keeps absent optional fields; language from the body, else `Accept-Language`; one record per `{app, installationId}`; a second account on the same device takes the link over
  - [x] A push token belongs to exactly one installation: registering it removes it from every other (`releaseFcmToken`), other tokens untouched
  - [x] `PATCH /customer/v1/installations/push-enabled` {pushEnabled}: customer token, boolean validated, sets `customers.pushEnabled` (the account-wide switch; push respects it in SRV-093)
  - [x] New `optionalAuth(scope, secret)`: no header = guest, a present header must be valid; per-IP route limit; 503 when unconfigured; Swagger + Postman regenerated
- Tests: `cd WAB-Server && npm test` - 1404 pass (46 suites); format:check/lint/typecheck/build green; `npm audit --omit=dev` 0; `npm run docs` regenerated. `tests/installations.test.ts` (26). No server CI exists any more: the local gate is the only check.
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile ✔ (contract matches PRD), Architect ✔, QA ✔) - DECISIONS TO CONFIRM: (1) a guest request can overwrite the push token of an installation id it knows; ids are random Firebase instance ids (unguessable), so this is accepted, but a signed per-install secret would close it; (2) there is no separate "unregister token" route: logout already unlinks the account (SRV-028/029) and a refreshed token is a new PUT; (3) the push switch lives under `/installations` because the profile endpoints come with SRV-065.
- Next: SRV-034 is PENDING (Firebase credentials); next runnable task in order: SRV-035.

### T-045 — SRV-035 App config endpoint (version policy, maintenance, contact info)
- Project: `WAB-Server/` (`src/domain/appConfig`, `src/modules/shared/appConfig`, `src/models/{appVersion,maintenance,contactInfo}.model.ts`, `src/repositories/appConfig.repository.ts`, `src/utils/version.ts`, `src/constants/appConfig.ts`)
- Branch: `claude/busy-johnson-2rch94` (restarted from `origin/server` after PR #52 merged; PR targets `server`)
- Status: DONE (PR #53 merged into `server`)
- Acceptance criteria (BE/NFR: BE-65; BUSINESS_DOMAIN §3.6 appVersions/maintenance/contactInfo, §10 `discovery.nearbyRadiusKm`, `otp.*`):
  - [x] Models `appVersions` (unique app+platform, minSupported <= latest), `maintenance` (unique app, message ar/en), `contactInfo` (E.164 phone/whatsapp, email), registered in `ALL_MODELS`
  - [x] `GET /customer/v1/config` and `/merchant/v1/config` (public, per-IP limited): `platform` ANDROID|IOS + `version` (dotted numbers) validated; update status UPDATE_REQUIRED (< minSupported), UPDATE_AVAILABLE (< latest and optionalUpdate), else OK; no policy row = OK
  - [x] Maintenance message in the request language, only while enabled; nearby radius, OTP length/resend from settings; contact null when absent; 503 when unconfigured
  - [x] Swagger + Postman regenerated
- Tests: `cd WAB-Server && npm test` - 1426 pass (47 suites); format:check/lint/typecheck/build green; audit 0. `tests/appConfig.test.ts` (24).
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) - DECISIONS TO CONFIRM: enforcement middleware (MAINTENANCE / forced-update error codes on other routes) is not part of this task; version comparison is numeric part-wise (`1.10` > `1.9`).
- Notes: Next: SRV-036 (public reference data).

### T-046 — SRV-036 Public countries, cities, areas
- Project: `WAB-Server/` (`src/domain/locations`, `src/modules/shared/locations`, `src/constants/locations.ts`)
- Branch: `claude/busy-johnson-2rch94` (restarted from `origin/server` after PR #53 merged; PR targets `server`)
- Status: DONE (PR #54 merged into `server`)
- Acceptance criteria (BE/NFR: BE-65 data side; BUSINESS_DOMAIN §3.2; Customer PRD countries list):
  - [x] `GET /customer/v1/locations/countries|cities|areas` and the same under `/merchant/v1`: public, active entries only, `sortOrder` order, names in the request language, country has dial code, flag URL (storage `getPublicUrl`), phone regex
  - [x] `cities?countryCode` (2 upper-case letters) and `areas?cityId` (ObjectId) validated, 400 with field details; unknown parent = empty list; 503 when unconfigured
  - [x] Swagger + Postman regenerated
- Tests: `cd WAB-Server && npm test` - 1444 pass (48 suites); format:check/lint/typecheck/build green; audit 0. `tests/locations.test.ts` (18).
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) - lists are not paginated (small admin-curated data); the country list has no `name` in both languages (admin CRUD SRV-038 returns both).
- Notes: Next: SRV-037 (public content).

### T-047 — SRV-037 Public content: privacy/terms/about, FAQ
- Project: `WAB-Server/` (`src/domain/content`, `src/modules/shared/content`, `src/models/{contentPage,faq}.model.ts`, `src/constants/content.ts`)
- Branch: `claude/busy-johnson-2rch94` (restarted from `origin/server` after PR #54 merged; PR targets `server`)
- Status: DONE (PR #55 merged into `server`)
- Acceptance criteria (BE/NFR: BE-65 data side; BUSINESS_DOMAIN §3.6 contentPages/faqs/contactInfo):
  - [x] Models `contentPages` (unique app+kind) and `faqs` (index app+order) in `ALL_MODELS`
  - [x] `GET /{customer|merchant}/v1/content/pages/{privacy|terms|about}`: own app's text in the request language, 404 if not written, 400 for an unknown slug
  - [x] `GET .../content/faqs`: own app only, admin order, localized; 503 when unconfigured
  - [x] Swagger + Postman regenerated
- Tests: `cd WAB-Server && npm test` - 1449 pass (49 suites); format:check/lint/typecheck/build green; audit 0. `tests/content.test.ts` (5).
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) - contact info is not duplicated here: `GET /config` already returns it (SRV-035). FAQ list not paginated (small, admin-curated).
- Notes: Next: SRV-038 (admin CRUD for reference data, content, versions, maintenance).

### T-048 — SRV-030a Admin bootstrap script
- Project: `WAB-Server/` (`src/seeds/{admin,runAdmin}.ts`, `src/constants/adminSeed.ts`, script `seed:admin`)
- Branch: `claude/busy-johnson-2rch94` (restarted from `origin/server` after PR #55 merged; PR targets `server`)
- Status: DONE (PR #56 merged into `server`)
- Acceptance criteria (BE-02; Admin PRD §4 single admin; backlog row SRV-030a):
  - [x] `seedAdmin` creates the admin (email trimmed + lower-cased, bcrypt via `hashPassword`); refuses an invalid email, a password under 12 characters, or when any admin exists (never overwrites)
  - [x] `npm run seed:admin` reads `ADMIN_EMAIL`/`ADMIN_PASSWORD` from the environment only, never logs the password
- Tests: `cd WAB-Server && npm test` - 1456 pass; format/lint/typecheck/build green; audit 0. `tests/adminSeed.test.ts` (7). API docs: no change.
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) - not run against a real MongoDB. The keys are intentionally not in `AppConfig`/`.env.example` (one-off script input).
- Notes: Next: SRV-038 in parts (reference data admin, then content, then versions/maintenance).

### T-049 — SRV-038 part 1: admin CRUD for countries, cities, areas
- Project: `WAB-Server/` (`src/domain/adminCrud/*`, `src/modules/admin/{crud,locations}/*`, `src/constants/adminCrud.ts`, `src/modules/{index,services}.ts`, `src/server.ts`)
- Branch: `claude/busy-johnson-2rch94` (restarted from `origin/server` after PR #56 merged; PR targets `server`)
- Status: DONE (PR #57 merged into `server`)
- Acceptance criteria (BE-65; Admin PRD locations; CLAUDE.md §5.12 admin writes with reason + audit + admin scope):
  - [x] `GET/POST /admin/v1/locations/countries|cities|areas`, `GET/PATCH .../:id`: admin token only (401/403 otherwise), lists paginated (25) with both languages and inactive records
  - [x] Every write needs a non-blank reason and writes one audit entry (`COUNTRY_CREATE`/`_UPDATE`, ...) with before/after, ip, user agent; invalid input or a missing reason writes nothing
  - [x] No delete: `active=false`; country code immutable; empty patch rejected; city needs an existing country, area an existing city (400 with field)
  - [x] Generic `createAdminCrud` + `createAdminCrudRouter` reused by parts 2-3; Swagger + Postman regenerated; 503 when unconfigured
- Tests: `cd WAB-Server && npm test` - 1465 pass; format/lint/typecheck/build green; audit 0. `tests/adminLocations.test.ts` (9).
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) - audit is written after the change (same decision as T-043). Deactivating a country/city does not cascade to children. Not run against a real MongoDB.
- Notes: Next: SRV-038 part 2 (content pages, FAQ, contact info).

### T-050 — SRV-038 parts 2-3: admin CRUD for content pages, FAQ, contact info, app versions, maintenance
- Project: `WAB-Server/` (`src/domain/adminCrud/content.ts`, `src/modules/admin/{crud,content}/*`, `src/constants/adminContent.ts`)
- Branch: `claude/busy-johnson-2rch94` (restarted from `origin/server` after PR #57 merged; PR targets `server`)
- Status: DONE (PR #58 merged into `server`)
- Acceptance criteria (BE-65, Admin PRD content/config; CLAUDE.md §5.12):
  - [x] `/admin/v1/content/{pages,faqs,contact-info}` and `/admin/v1/app-config/{versions,maintenance}`: list/get/create/patch on the generic CRUD, admin token only, reason required, audit (`CONTENT_PAGE_*`, `FAQ_*`, `CONTACT_INFO_*`, `APP_VERSION_*`, `MAINTENANCE_*`)
  - [x] Validation: https store URL, version pattern, E.164 phones, lower-cased email, localized text with limits; app/kind/platform cannot be changed
  - [x] Version policy rule: `minSupported <= latest` on the merged values (create and update, 400 `minSupported`)
  - [x] Shared `registerCrudDocs` used by locations and content; Swagger + Postman regenerated; 503 when unconfigured
- Tests: `cd WAB-Server && npm test` - 1480 pass; format/lint/typecheck/build green; audit 0. `tests/adminContent.test.ts` (15).
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) - creating a duplicate key (app+kind) answers 409 via the unique index. Maintenance and version changes apply at once to `GET /config`. Not run against a real MongoDB.
- Notes: LESSON: chain gate commands with `&&`/`set -e`; in PR #57 a `;`-chained gate let a lint failure through to a commit (fixed in the same PR before merge). Next: SRV-039 (banners).

### T-051 — SRV-039 Banners: admin CRUD + live-by-gender query
- Project: `WAB-Server/` (`src/models/banner.model.ts`, `src/domain/{banners,adminCrud/banners.ts}`, `src/modules/{admin,customer}/banners/*`, `src/constants/banners.ts`)
- Branch: `claude/busy-johnson-2rch94` (restarted from `origin/server` after PR #58 merged; PR targets `server`)
- Status: DONE (PR #59 merged into `server`)
- Acceptance criteria (Customer PRD S05 banner carousel; BUSINESS_DOMAIN §3.6 banners, BannerAction):
  - [x] `banners` model + index, in `ALL_MODELS`
  - [x] `GET /customer/v1/banners?gender=MALE|FEMALE` (public, rate limited): active banners of that audience or BOTH, `startAt <= now < endAt`, display order, image of the request language (CDN URL), `{id, imageUrl, actionType, actionValue}`
  - [x] `/admin/v1/banners` CRUD (admin token, reason + audit `BANNER_*`): SALON needs a salon id and EXTERNAL_URL an https link, NONE no value; `endAt` after `startAt`; rules checked on merged values for patches (null clears the value); switch off with `active=false`
- Tests: `cd WAB-Server && npm test` - 1492 pass; format/lint/typecheck/build green; audit 0. `tests/banners.test.ts` (12).
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) - salon existence is not checked for SALON banners (salon model arrives with SRV-041); the app shows nothing for an unknown salon. Not run against a real MongoDB.
- Notes: Next: SRV-040 (catalog services).

### T-052 — SRV-040 Catalog services: admin CRUD + list by gender
- Project: `WAB-Server/` (`src/domain/catalog`, `src/modules/{shared,admin}/catalog/*`, `src/constants/catalog.ts`, `src/server.ts`)
- Branch: `claude/busy-johnson-2rch94` (restarted from `origin/server` after PR #59 merged; PR targets `server`)
- Status: IN REVIEW
- Acceptance criteria (BE-65, Admin PRD A23, Merchant PRD service picking; BUSINESS_DOMAIN §3.2 catalogServices):
  - [x] `GET /customer/v1/catalog/services` and `/merchant/v1/catalog/services`: `gender` required, active only, `sortOrder` order, paginated (10), name/description in the request language, CDN image URL
  - [x] `/admin/v1/catalog/services` CRUD (admin token, reason + audit `CATALOG_SERVICE_*`): both languages, inactive included, filter by gender; gender cannot change; switch off with `active=false`
- Tests: `cd WAB-Server && npm test` - 1508 pass; format/lint/typecheck/build green; audit 0. `tests/catalog.test.ts` (16).
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) - no text search yet (Atlas search is SRV-059). Not run against a real MongoDB.
- Notes: Next: SRV-041 (salon schema + owner application).

### Pending (next)
- T-003 — Per-project rules for the remaining folders (customer, merchant, admin, packages) — awaiting user input.
- SRV-026 — next server task after T-036 is merged (see `WAB-Server/docs/WAB_Server_Tasks.md`).
- INT-01 — Contracts v1 (`contracts/`) — first task of the roadmap.
