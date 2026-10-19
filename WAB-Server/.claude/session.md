# WAB-Server — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next server`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)

- Serves `/customer/v1` (51 ops), `/merchant/v1` (71), `/admin/v1` (151) + Socket.IO; contract = `docs/api/openapi.*.json` regenerated with `npm run docs` every task.
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

### SRV-121 — Admin salon list extras, KPIs, analytics, activity and the deletion decision (G4)

- Branch: `feat/srv-121-admin-salon-insights`
- Status: IN REVIEW
- Acceptance criteria (Admin PRD A13; BUSINESS_DOMAIN §3.3 salons, §5.15; client impact: ADM-073):
  - [x] `GET /admin/v1/salons` rows carry `recommended` (active placement now), `bookings30d` (created in the last 30 days) and `deletionRequestedAt`; new filters `subscription`, `recommended`, `deletionRequested`; the detail adds `deletionApprovedAt`
  - [x] `GET /salons/:id/kpis` (rating, bookings by status all time and 30 days, active services, active staff), `GET /salons/:id/analytics?from&to` (bookings created per Amman day, zero days filled, range at most 92 days, bad/reversed range 400), `GET /salons/:id/activity` (audit entries of that salon, newest first, paginated)
  - [x] `POST /salons/:id/deletion-request/decision {decision: APPROVE|REJECT, reason}`: needs an open request (else 422 INVALID_TRANSITION); APPROVE refused while PENDING/APPROVED bookings exist (409 with ids), then the salon goes OFFLINE and `deletionApprovedAt` is stamped; REJECT clears the request and tells the owner (`salon.deletion_rejected`, AR+EN); both audited with the reason
  - [x] Admin token only; contract regenerated; no hardcoded values
- Tests: `tests/adminSalonInsights.test.ts` (18: list extras and filters incl. combinations, detail, KPIs, analytics zero-fill + Amman bounds + range limits, activity scoping/paging, deletion approve/offline/409/reject/422/validation, dailyCounts pipeline) + existing admin salon suites unchanged; full gate green (2538 tests, lint, typecheck, build, docs, audit 0). A real defect (diffDays argument order → no range limit) was caught by these tests and fixed. API docs: 4 operations added (`GET /salons/{id}/kpis|analytics|activity`, `POST /salons/{id}/deletion-request/decision`), list/detail rows and filters extended; client impact: ADM-073.
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔)
- Notes: Decisions to confirm (owner): APPROVE of a deletion request takes the salon OFFLINE and stamps `deletionApprovedAt` (new field, BUSINESS_DOMAIN §3.3); the purge job is NOT built. No endpoint creates `deletionRequestedAt` for salons yet (the owner-side request is Stage O: SRV-129/133). Bookings counted by creation date. Activity = admin audit trail of the salon. NOT verified: the Mongo aggregates (`dailyCounts`, `countBy`) on a real database; fake models cannot run them (pipeline shape is tested).

### SRV-122 — Admin customer extras: edit, reviews, notifications, push to one, force delete (G5)

- Branch: `feat/srv-122-admin-customer-extras`
- Status: IN REVIEW
- Acceptance criteria (Admin PRD A12, BUSINESS_DOMAIN §5.15, §8; client impact: ADM-072, ADM-077):
  - [x] `PATCH /admin/v1/customers/:id` corrects name, email, gender, city/area (checked), language with a reason, audited before/after of the changed fields; works for BLOCKED and DELETION_PENDING, 409 for an anonymized account; the phone is not editable
  - [x] `GET /customers/:id/reviews` (every review the customer wrote, any status, newest first, paginated; admin reviews list gains an `authorId` filter) and `GET /customers/:id/notifications` (what the platform sent, newest first, paginated, with push result and read state)
  - [x] `POST /customers/:id/push {title, body, link?, reason}` sends now to this one customer through a SPECIFIC_USERS campaign (audited there); only an ACTIVE account (422 INVALID_TRANSITION otherwise)
  - [x] `POST /customers/:id/force-delete {reason}` anonymizes at once from ACTIVE/BLOCKED/DELETION_PENDING (no grace period), revokes sessions, hangs up sockets, audits; DELETED → 409
  - [x] Admin token only; contract regenerated; no hardcoded values
- Tests: `tests/adminCustomerExtras.test.ts` (12: auth on all routes, audited edit + status rules + validation, reviews delegation, notifications scoping/paging, push via SPECIFIC_USERS + ACTIVE-only + bad input, force delete from 3 statuses + 409/404/validation) + `tests/adminReviews.test.ts` (+1: author filter) ; full gate green (2551 tests, lint, typecheck, build, docs, audit 0). API docs: 5 operations added under `/admin/v1/customers/{id}/…`; admin reviews service gains an `authorId` filter; client impact: ADM-072, ADM-077 (journey: SRV-110 still dropped).
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔)
- Notes: Force delete does not check open bookings (same as the existing grace-period deletion); anonymized accounts keep their bookings/transactions for accounting (BUSINESS_DOMAIN §5.15). Push uses the existing campaign engine (campaign history shows it). ADM-077 also waits on SRV-110 (BigQuery journey, dropped by the owner), so it stays blocked. NOT verified: real Mongo / FCM delivery.
