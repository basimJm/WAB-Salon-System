# WAB-Server — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next server`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)

- Serves `/customer/v1` (51 ops), `/merchant/v1` (71), `/admin/v1` (155) + Socket.IO; contract = `docs/api/openapi.*.json` regenerated with `npm run docs` every task.
- Providers: notifier **real** (`wab-notifications`); otp **real** (`wab-otp`, SRV-034, needs `FIREBASE_PROJECT_ID`); analytics = the server's own MongoDB events (no analytics provider; BigQuery/`@wab/analytics` dropped, owner 2026-10-19); payments **paused** (`PAYMENT_PROVIDER=disabled` in production, `fake` in dev/test; HyperPay/`@wab/payments` not used by the server); storage on the in-repo S3 code until SRV-112.
- Open work: SRV-111 contract guard, Stage N (SRV-117…128, admin gaps), Stage O (SRV-129…134, merchant gaps). Deployment SRV-011/116 and SRV-059/115: owner (PENDING).

## Current task

### T-130 — Commented env templates for hosted dev and prod (owner request 2026-10-20)

- Branch: `chore/srv-env-templates`
- Status: IN REVIEW
- Acceptance criteria (CLAUDE.md §5; API docs: no change):
  - [x] `docker/env.dev.example` and `docker/env.prod.example` (renamed from `env.production.example`) list every key the server needs on a hosted service, each with a comment saying what it is and where to get it; fixed values pre-filled (providers, Gmail SMTP host/port, `TRUST_PROXY_HOPS=1`, Firebase project per environment); `PORT` left out (the host sets it)
  - [x] `env:check` tests run both templates: untouched fails and names keys only, filled passes, fakes and enabled payments refused
- Tests: `tests/checkEnv.test.ts` (10); full gate green
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — templates + docs only. NOT verified: a real deploy on Render.

### T-128 — Run any environment on any Docker host (owner order 2026-10-19)

- Branch: `chore/srv-deploy-compose`
- Status: IN REVIEW
- Acceptance criteria (CLAUDE.md §5 no hardcoding; no BUSINESS_DOMAIN change; API docs: no change):
  - [x] `docker-compose.deploy.yml`: one API per environment from a required `ENV_FILE`, built from the repository root, container port pinned to 3000, host port `API_PORT` on `127.0.0.1` unless `API_BIND` opts in, optional password-protected Redis behind `--profile redis`; no credential in the file
  - [x] `.env.*` git-ignored except `.env.example`; `docs/DEPLOYMENT.md` gains run-per-environment, keys-per-environment (local, hosted dev, prod; Atlas per environment) and how Redis works / how to run it
- Tests: `tests/dockerDeploy.test.ts` (6); `docker compose config` accepted the file; full gate green
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — config + docs only. NOT verified: an actual `docker compose up` / image build (no Docker daemon in this runner), Atlas and managed Redis connections.
- Notes: hosting product stays open (owner chose "any server"); the file is host-agnostic.

### T-127 — Deployment readiness: env templates, `env:check`, DEPLOYMENT.md (owner order 2026-10-19)

- Branch: `chore/srv-deploy-envs`
- Status: IN REVIEW
- Acceptance criteria (CLAUDE.md §5 no hardcoding, NFR config; no BUSINESS_DOMAIN change; API docs: no change):
  - [x] `npm run env:check -- <file>` validates an env file with the server's own schema and production rules and prints key names only (never values); exit 0 pass, 1 invalid, 2 usage
  - [x] `docker/env.development.example` passes as is; `docker/env.prod.example` fails until every placeholder is filled, then passes; fake providers, enabled payments and bad values are refused in production
  - [x] `docs/DEPLOYMENT.md`: local build/run, the three environments (local, hosted dev, prod), where each value comes from, release checklist, what is still owner-side
- Tests: `tests/checkEnv.test.ts` (6); full gate green (130 suites, 2578 tests, lint, typecheck, build, format, docs unchanged, audit 0, tasks.py check OK)
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — tooling + docs only, no endpoint or schema change; templates hold placeholders, no secrets. DEVIATION: the CLI prints English ops text (like `loadtest`), not locale keys (not an API response).
- Notes: Not verified: Docker build (no daemon), a real boot against Mongo/Redis.

### T-125 — Remove the analytics and payment SDK providers from WAB-Server (owner order 2026-10-19)

- Branch: `chore/srv-remove-analytics-payments`
- Status: IN REVIEW (draft PR into `server`)
- Acceptance criteria (CLAUDE.md §3/§4, BUSINESS_DOMAIN payments rules 4.10):
  - [x] No `analytics` provider: `ANALYTICS_PROVIDER` + `ANALYTICS_BIGQUERY_*`, `AnalyticsSettings`, `providers/analytics/real.ts`, `@wab/analytics` dependency, Docker/ensure-sdks entries removed; ONE `createMongoAnalytics` in `server.ts` feeds installation links and admin analytics
  - [x] No HyperPay: `HYPERPAY_*`, `PAYMENT_GATEWAY`, `PaymentSettings`, `providers/payments/real.ts`, `@wab/payments` dependency, Docker/ensure-sdks entries removed
  - [x] `PAYMENT_PROVIDER` = `fake|disabled`; production accepts only `disabled`; `DisabledPaymentProvider` answers 503 (`ExternalServiceError`, unavailable) on createSession/verify/refund/getRefund and `UnauthorizedError` on webhooks
  - [x] A paused payment start creates no transaction and no draft link (failure happens before `transactions.create`); refunds cannot exist because no payment can succeed
  - [x] Backlog: SRV-092 and SRV-110 set to PENDING by the tool (dependents ADM-075/076 → BLOCKED so `tasks.py check` stays OK)
- Tests: `tests/paymentsDisabled.test.ts` (provider), `tests/paymentsPaused.test.ts` (HTTP 503, no transaction; webhook 401), `tests/providers.test.ts`, `tests/config.test.ts`, `tests/payoutDetails.test.ts` adapted; deleted `paymentsReal`/`analyticsReal` tests
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile ✔ (apps get 503 on payment start; CUS-047/062 blocked by the owner's pause), Architect ✔, QA ✔) — NOT verified: Docker build (no daemon), real Mongo. DEVIATIONS: the owner's "delete provider" was interpreted as removing the SDK adapters/config and pausing payments (ports, fakes and the Mongo analytics kept, `wab-analytics`/`wab-payments` folders kept); `tasks.py` touched two admin backlog rows (status only) to keep `check` green.

### SRV-123 — Admin booking extras: eligible staff, reassign, cancel modes, chosen-amount refund, bookings export (G6)

- Branch: `feat/srv-123-admin-booking-extras`
- Status: IN REVIEW
- Acceptance criteria (Admin PRD A15; BUSINESS_DOMAIN §5.4 eligibility, §5.7 transitions, §5.8 refunds; client impact: ADM-071):
  - [x] `GET /admin/v1/bookings/:id/eligible-staff?personIndex` lists who could take that person (current, inactive and non-providing staff left out; rules of §5.4 + a free slot); `POST /bookings/:id/reassign {personIndex, staffId, reason}` re-checks under the staff lock (409 SLOT_TAKEN, 422 ineligible/not APPROVED/past), audits, and notifies through the existing reassign hook (customer, staff, sockets)
  - [x] `POST /bookings/:id/cancel {mode: CUSTOMER|SALON|ADMIN, reason}` on PENDING/APPROVED only: CUSTOMER = status CANCELLED_BY_CUSTOMER with the snapshotted policy refund (all while PENDING), SALON/ADMIN = CANCELLED_BY_SALON with a full refund; audited; refund + notifications through the existing hook
  - [x] `POST /bookings/:id/refund {amount (JOD string), reason}`: more than what is still refundable, zero or malformed is refused (400 `body.amount`), nothing paid online is 422, audited; a gateway outage keeps the refund pending and retries (no error); payments disabled = nothing paid = 422
  - [x] Export kind `BOOKINGS` (statuses, payment status, salon, customer, appointment day range, text) over the booking list as the admin audience, paged, EXPORT_MAX_ROWS rule
  - [x] Admin token only; contract regenerated; no hardcoded values
- Tests: `tests/bookingAdminExtras.test.ts` (13: cancel modes incl. policy refund / PENDING / deposit / pay-on-arrival / status guard, chosen-amount refund wiring + validation, eligible staff filters, reassign audit + hook, refusals) + `tests/refundService.test.ts` (+5: partial, cumulative cap, over/zero/fraction refused, nothing paid 422, gateway down keeps refund pending) + `tests/exports.test.ts` (+3: BOOKINGS paging/filters/limit/request schema); full gate green (2572 tests, lint, typecheck, build, docs, audit 0). API docs: 4 operations added under `/admin/v1/bookings/{id}/…` + export kind BOOKINGS; client impact: ADM-071.
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔)
- Notes: Assumption to confirm: cancel mode ADMIN is recorded as CANCELLED_BY_SALON (no separate status exists; history/cancellation keep the admin as actor). Reassign core refactored into one shared function for merchant and admin (merchant suite unchanged and green). Payments paused: nothing is paid online, so refund answers 422 and cancel refunds are 0; a gateway outage keeps a refund pending and retried. NOT verified: real Mongo/gateway.

### SRV-127 — Live analytics: dropped (owner 2026-10-19, analytics excluded)

- Branch: `feat/srv-127-live-analytics`
- Status: PENDING (dropped, no server code)
- Acceptance criteria (backlog/doc work only):
  - [x] SRV-123 set DONE (PR #297 merged)
  - [x] SRV-127 and SRV-110 set PENDING with the note "dropped by owner 2026-10-19: analytics excluded"; no endpoint, socket presence or counters are built
  - [x] ADM-074, ADM-075, ADM-076, ADM-077 set PENDING with the same note: the admin hides or skips those screens; if analytics ever returns, ADM-074 should depend on SRV-127 only (SRV-110 stays dropped)
  - [x] `python3 scripts/tasks.py check` OK and the board in `INTEGRATION.md` regenerated
- Tests: `python3 scripts/tasks.py check` (408 tasks OK), `python3 .claude/hooks/test_hooks.py` (25 OK)
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — DEVIATION: docs/backlog only, no product code and no unit tests (nothing to test); the analytics work was stopped on the owner's order.
- Notes: none.
