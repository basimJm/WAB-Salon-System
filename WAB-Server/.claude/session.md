# WAB-Server — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next server`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)

- Serves `/customer/v1` (51 ops), `/merchant/v1` (71), `/admin/v1` (146) + Socket.IO; contract = `docs/api/openapi.*.json` regenerated with `npm run docs` every task.
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

### SRV-120 — Admin salon editing part 2: hours, closures, services, staff, policy (G3)

- Branch: `feat/srv-120-admin-salon-edit-2`
- Status: IN REVIEW
- Acceptance criteria (Admin PRD A13; BUSINESS_DOMAIN §3.2, §5.12 schedule conflicts; client impact: ADM-070):
  - [x] Admin endpoints under `/admin/v1/salons/:id`: `GET|PUT /hours`, `POST /hours/preview`, `POST /closures`, `POST /closures/preview`, `PATCH /closures/:closureId`, `POST /closures/:closureId/remove`, `GET|POST /services`, `PATCH /services/:serviceId`, `GET|PUT /members/:memberId/staff`, `GET|PUT /policy`
  - [x] Previews list the PENDING/APPROVED bookings a new weekly schedule or closure would break and change nothing; a real change that would break bookings is refused with 409 `SCHEDULE_CONFLICT` and the booking ids (existing §5.12 rule)
  - [x] Every write needs `reason`, is audited (before/after) and tells the owner (`salon.edited_by_admin` with the area); the closure's own text is `closureReason`, separate from the audit `reason`
  - [x] Same rules as the merchant app (audience, duplicates, price above zero, staff skills/days, deposit percentage); service media must be admin uploads of purpose SERVICE_MEDIA
  - [x] Merchant endpoints unchanged (zod schemas moved to `modules/shared/salonEdit`); admin token only; contract regenerated
- Tests: `tests/adminSalonEditPart2.test.ts` (13: hours get/preview/set with audit+notice, 409 SCHEDULE_CONFLICT with booking ids, closure add/update/remove + bad input, policy null/set/validation, services add/list/rules/media, staff get/set/refusals) + part 1 (11) + merchant suites unchanged; full gate green (2520 tests, lint, typecheck, build, docs, audit 0). API docs: 14 operations added under `/admin/v1/salons/{id}/…`; client impact: ADM-070.
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔)
- Notes: Same services as the merchant app, so one rule set; closure text is `closureReason`, audit reason is `reason`. Previews call the booking conflict finder and change nothing. Staff-edit conflicts use the staff service own conflict hook (wired in server.ts). Criteria written before coding this time. NOT verified: real Mongo; a real booking conflict end to end (conflict finder is covered by its own tests, here it is a stub).

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
