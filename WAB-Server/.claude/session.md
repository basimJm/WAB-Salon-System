# WAB-Server — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next server`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)

- Serves `/customer/v1` (51 ops), `/merchant/v1` (71), `/admin/v1` (155) + Socket.IO; contract = `docs/api/openapi.*.json` regenerated with `npm run docs` every task.
- Providers: notifier **real** (`wab-notifications`); otp **arqam** (`wab-otp` 0.3.0, SRV-158: `ARQAM_API_KEY`, `ARQAM_TEMPLATE_AR/EN` (+ optional `ARQAM_SENDER_ID`, `ARQAM_SEND_IP`, `ARQAM_BASE_URL`) + `OTP_CODE_SECRET`/`OTP_PROOF_SECRET`; `fake` + `OTP_FIXED_CODE` for local QA; `whatsapp`/`real` refused); analytics = the server's own MongoDB events (no analytics provider; BigQuery/`@wab/analytics` dropped, owner 2026-10-19); payments **paused** (`PAYMENT_PROVIDER=disabled` in production, `fake` in dev/test; HyperPay/`@wab/payments` not used by the server); storage on the in-repo S3 code until SRV-112.
- Open work: SRV-111 contract guard, Stage N (SRV-117…128, admin gaps), Stage O (SRV-129…134, merchant gaps). Deployment SRV-011/116 and SRV-059/115: owner (PENDING).

## Current task

### SRV-188 — Fix: create-booking response wrapped twice (local smoke run 2026-11-03)

- Branch: `fix/srv-188-created-envelope` (from `origin/server`)
- Status: IN REVIEW
- Acceptance criteria (BUSINESS_DOMAIN §5.20; operation `POST /merchant/v1/bookings`):
  - [x] 201 body `data` = the booking summary + `customerRegistered` (as in the OpenAPI), not `{ data: … }`
  - [x] Route test covers the envelope and the `BOOKINGS_CREATE` gate on create + lookup
- Tests: `tests/merchantBookingRoutes.test.ts` (new, 2); with merchantBooking + docs suites 39 green
- API docs: no change (the documented shape was right)
- Loops: 1/1 — reproduced on the local stack (smoke script: create answered `data.data`), fixed, route test
- Review: PASSED (SE ✔, Mobile ✔ (MER-085 already reads the documented shape), Architect ✔, QA ✔ (regression test))

## Last blocks

### SRV-187 — Close pushes with actions (owner 2026-11-03; found by MER-086)

- Branch: `feat/srv-187-close-push-actions` (from `origin/server`)
- Status: IN REVIEW
- Acceptance criteria (BUSINESS_DOMAIN §5.21; events `booking.close_reminder` / `booking.close_overdue`):
  - [x] Event flag `closeActions`: merchant devices get Android DATA_ONLY (title/body + data, `actions=COMPLETED,NO_SHOW`, collapse per booking, no full-screen) and iOS VISIBLE time-sensitive with category `BOOKING_CLOSE` (`CLOSE_PUSH`); customers and other events unchanged
  - [x] Each close round stays one delivery per device group (key per round)
- Tests: `tests/notifications.test.ts` (+1: Android data + iOS category + one per round); 4 suites (82 tests) green
- API docs: no change (push payload only)
- Loops: 1/1 — checked the shape against the merchant app's MER-086 parser (category `BOOKING_CLOSE`, actions `COMPLETED,NO_SHOW`, `bookingId`)
- Review: PASSED (SE ✔ (one helper beside the request branch), Mobile ✔ (matches MER-086), Architect ✔ (no contract change), QA ✔)
