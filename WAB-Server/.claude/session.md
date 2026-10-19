# WAB-Server — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next server`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)

- Serves `/customer/v1` (51 ops), `/merchant/v1` (71), `/admin/v1` (116) + Socket.IO; contract = `docs/api/openapi.*.json` regenerated with `npm run docs` every task.
- Providers: notifier **real** (`wab-notifications`); otp **real** (`wab-otp`, SRV-034, needs `FIREBASE_PROJECT_ID`); analytics = the server's own MongoDB events (no analytics provider; BigQuery/`@wab/analytics` dropped, owner 2026-10-19); payments **paused** (`PAYMENT_PROVIDER=disabled` in production, `fake` in dev/test; HyperPay/`@wab/payments` not used by the server); storage on the in-repo S3 code until SRV-112.
- Open work: SRV-111 contract guard, Stage N (SRV-117…128, admin gaps), Stage O (SRV-129…134, merchant gaps). Deployment SRV-011/116 and SRV-059/115: owner (PENDING).

## Current task

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

### SRV-034 — Real Firebase ID-token verification via `wab-otp`

- Branch: `feat/otp-010-publish` (shared PR with OTP-010)
- Status: DONE
- Acceptance criteria: `@wab/otp` `file:` dependency + `ensure-sdks` + Docker; env `FIREBASE_PROJECT_ID` (required for `OTP_PROVIDER=real`), `FIREBASE_AUTH_EMULATOR_HOST` (dev only, refused in production); `providers/otp/real.ts` maps SDK outcomes (anything unexpected is an invalid proof, never success) and errors (outage -> `ExternalServiceError`, caller bug -> `RangeError`); closed on shutdown
- Tests: `tests/otpReal.test.ts` (9, includes the real SDK on emulator-shaped tokens) + config tests; full gate green
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — NOT verified: real Firebase ID tokens from the dev/prod projects, Docker build (no daemon). API docs: no change.

### T-123 — Wire `wab-notifications` into WAB-Server (`NOTIFIER_PROVIDER=real`)

- Branch: `claude/busy-johnson-2rch94` (PR #129, merged to `server`)
- Status: DONE
- Acceptance criteria: `file:../wab-notifications` dependency + `ensure-sdks`; env keys FCM__/SMTP__/EMAIL_FROM_*; adapter maps SDK errors → `ExternalServiceError`; closed on shutdown; Docker image builds from the repo root
- Tests: `npm test` 2420; lint/format/typecheck/build green; `tests/notifierReal.test.ts` (16)
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — NOT verified: real SMTP send (App Password pending), Docker build (no daemon). API docs: no change.
