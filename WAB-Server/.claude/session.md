# WAB-Server — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next server`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)

- Serves `/customer/v1` (51 ops), `/merchant/v1` (71), `/admin/v1` (122) + Socket.IO; contract = `docs/api/openapi.*.json` regenerated with `npm run docs` every task.
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

### SRV-117 — Admin profile (G1): profile, change password, change email, alert recipients

- Branch: `feat/srv-117-admin-profile`
- Status: IN REVIEW
- Acceptance criteria (Admin PRD §4 "Admin profile", BUSINESS_DOMAIN §3.1 admins, §10 `admin.*`; client impact: ADM-068):
  - [x] `GET /admin/v1/profile` → id, email, alertEmails, lastLoginAt; `PATCH /admin/v1/profile` replaces `alertEmails` (valid, unique, max N); audited with a reason
  - [x] `POST /admin/v1/profile/password` {currentPassword, newPassword}: wrong current password counts toward the sign-in lockout and answers 403 `CURRENT_PASSWORD_INVALID` (never 401, so the panel does not treat it as an expired session); locked → 429; new password ≥ min length, differs from the current one; all refresh tokens revoked; notice emailed; audited
  - [x] `POST /admin/v1/profile/email/request` {newEmail, password} (password checked like above) emails a code to the NEW address; `POST /admin/v1/profile/email/verify` {code}: right code (once, 5 min) changes the email, revokes sessions, notices the old address; taken address → 409 `EMAIL_ALREADY_USED`; wrong/expired code → 422 `OTP_INVALID`/`OTP_EXPIRED` (never 401; a wrong code counts toward the lockout)
  - [x] All routes need the admin token; AR+EN messages/emails; no hardcoded values; contract regenerated
- Tests: `tests/adminProfile.test.ts` (18: auth, read, alert list, password incl. lockout/403/422, email change incl. single use, resend window, address binding, send failure) + `tests/errors.test.ts` (codes mirrored). Full gate green: docs, format, lint, typecheck, build, 2487 tests, audit 0. API docs: 5 operations added to `/admin/v1` (`GET|PATCH /profile`, `POST /profile/password|email/request|email/verify`); client impact: ADM-068.
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔)
- Notes: BUSINESS_DOMAIN §11 gained `CURRENT_PASSWORD_INVALID`, `EMAIL_ALREADY_USED`. Wrong password is 403 (not 401) on purpose so the panel keeps the session. NOT verified: real Mongo (unique-email race relies on the unique index + duplicate-key mapping, covered by a fake), real email delivery.

### SRV-118 — Admin global search (G2)

- Branch: `feat/srv-118-admin-search`
- Status: IN REVIEW
- Acceptance criteria (Admin PRD §3 "global search"; client impact: ADM-069):
  - [x] `GET /admin/v1/search?q=&types=&page=&pageSize=` returns groups `customers`, `salons`, `bookings`, `members`, each `{items, total}`, paginated per group with the same `page`/`pageSize` (`types` limits the groups, default all)
  - [x] customers by name or phone, salons by name, members by name or phone, bookings by reference number (exact, normalised); every pattern is escaped (no regex injection); `q` is 2–100 characters (400 otherwise)
  - [x] Phone and reference lookups are anchored/exact so they use the existing indexes; name lookups are a documented scan on small admin-scale collections
  - [x] Admin token only; contract regenerated; no hardcoded values
- Tests: `tests/adminSearch.test.ts` (9: auth, grouping, phone forms, reference, group filter, pagination, literal text, bad input) + full gate green (2496 tests, lint, typecheck, build, docs, audit 0). API docs: `GET /admin/v1/search` added; client impact: ADM-069.
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔)
- Notes: Name lookups are an unanchored case-insensitive scan (fine at admin scale; no stemming, Arabic safe); phone/reference lookups are anchored or exact. New shared `escapeRegex` in `utils/format/regex.ts` (five older local copies not touched, out of scope). NOT verified: real Mongo.
