# WAB-Server — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next server`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)

- Serves `/customer/v1` (51 ops), `/merchant/v1` (71), `/admin/v1` (155) + Socket.IO; contract = `docs/api/openapi.*.json` regenerated with `npm run docs` every task.
- Providers: notifier **real** (`wab-notifications`); otp **arqam** (`wab-otp` 0.3.0, SRV-158: `ARQAM_API_KEY`, `ARQAM_TEMPLATE_AR/EN` (+ optional `ARQAM_SENDER_ID`, `ARQAM_SEND_IP`, `ARQAM_BASE_URL`) + `OTP_CODE_SECRET`/`OTP_PROOF_SECRET`; `fake` + `OTP_FIXED_CODE` for local QA; `whatsapp`/`real` refused); analytics = the server's own MongoDB events (no analytics provider; BigQuery/`@wab/analytics` dropped, owner 2026-10-19); payments **paused** (`PAYMENT_PROVIDER=disabled` in production, `fake` in dev/test; HyperPay/`@wab/payments` not used by the server); storage on the in-repo S3 code until SRV-112.
- Open work: SRV-111 contract guard, Stage N (SRV-117…128, admin gaps), Stage O (SRV-129…134, merchant gaps). Deployment SRV-011/116 and SRV-059/115: owner (PENDING).

## Current task

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

## Last blocks

### SRV-186 — Closing finished bookings (owner 2026-11-03)

- Branch: `feat/srv-186-close-reminders` (from `feat/srv-185-merchant-bookings`; batch SRV-183…186 ships from here)
- Status: IN REVIEW (committed; PR into `server` after the batch gate)
- Acceptance criteria (BUSINESS_DOMAIN §5.21, §5.7 rows COMPLETED/NO_SHOW, §8 close events, §9 jobs, §10 settings; operations `POST /merchant/v1/bookings/{id}/complete|no-show`, `GET /merchant/v1/bookings?tab=TO_CLOSE`, `GET /admin/v1/bookings?tab=TO_CLOSE`, admin alerts):
  - [x] Settings `booking.closeReminderIntervalMinutes` (60) + `booking.closeOverdueAlertHours` (24), admin-editable (44 keys)
  - [x] Job `booking.close-reminder.<id>.<round>` from the end + round × interval (a missed round runs at once); each round notifies once (`booking.close_reminder`, key per round) to the booking's staff + branch `BOOKINGS_OPERATE` members + owner, push data `actions=COMPLETED,NO_SHOW`; records `closeReminders.count/lastAt` and queues the next round; no cap; stale/early rounds do nothing
  - [x] Job `booking.close-overdue.<id>` at end + hours, once (`markCloseOverdue` guard): `booking.close_overdue` to the same members + admin alert `BOOKING_CLOSE_OVERDUE` (entity BOOKING; panel + email through the alert inbox); reminders go on
  - [x] Closed / cancelled → jobs removed by `sync`; reconcile includes approved bookings past their start
  - [x] The booking's own staff may COMPLETE / NO_SHOW after the start without `BOOKINGS_OPERATE` (state machine `assignedMay`; route accepts `BOOKINGS_VIEW_OWN`; detail actions show it); never cancel/answer
  - [x] Tab `TO_CLOSE` (approved, end passed, oldest first) on merchant + admin lists (BUSINESS_DOMAIN §5.21 updated from `toClose=true`)
  - [x] AR + EN texts (notifications, alert title); contracts merchant 1.13.0, admin 1.16.0 (MER-086, ADM-112)
- Tests: `tests/bookingJobs.test.ts` (+3 + 2 updated: rounds + next round + stale round, stops when completed / not before the end, overdue once + admin alert + plan without overdue; approved plan + reconcile), `tests/stateMachine.test.ts` (+2: own staff closes, refusals), `tests/bookingQueries.test.ts` (+1 TO_CLOSE + own-staff actions), `tests/settings.test.ts`, `tests/identitySchemas.test.ts`, `tests/alertI18n.test.ts`
- API docs: merchant/admin regenerated + bumped
- Batch gate SRV-183…186 (Terminal panel, this branch): prettier, eslint, tsc, docs, full jest 178 suites / 3089 tests — 2 failures (permission list, alert subject list: extended by this batch), fixed; those 3 suites (231 tests) green after
- Loops: 1/1 — re-read §5.21 against jobs, producers, alerts, state machine, routes and lists; owner answers 8 (until answered) and 9 (merchant + admin alert) applied
- Review: PASSED (SE ✔ (deterministic job ids per round, guarded updates by status, no new cron), Mobile ✔ (MER-086: push actions + TO_CLOSE), Architect ✔ (merchant/admin bumped; jobs reconcile after Redis loss), PM ✔, UX ✔ (one-tap answers), Marketing N/A, QA ✔ (rounds, stop, overdue once, permission edges))
- Notes: DEVIATIONS — reminders also run at night (owner: until answered; no quiet hours); the full suite was not re-run after the last 2 test fixes (the 3 affected suites were).

### SRV-185 — Bookings created by the business (owner 2026-11-03)

- Branch: `feat/srv-185-merchant-bookings` (from `feat/srv-184-discovery-merged`, batch SRV-183…186)
- Status: IN REVIEW (committed, not pushed)
- Acceptance criteria (BUSINESS_DOMAIN §5.20, §5.7 new row, §6 `BOOKINGS_CREATE`, §8 `booking.created_by_merchant`, §3.5 `source`/`createdBy`/`customerContact`; operations `GET /merchant/v1/customers/lookup`, `POST /merchant/v1/bookings`, `GET /admin/v1/bookings?source=`, BOOKINGS export, customer register + change phone):
  - [x] Permission `BOOKINGS_CREATE` (16 keys; in the MANAGER template; owner always); `BOOKING_REFERENCE` uploads for members with it
  - [x] Lookup: registered + first name + gender only for an active account; strict per-IP limiter in its own counter
  - [x] Create (every business type): registered number → `customerId`, account name/gender (blocked → 403 `ACCOUNT_BLOCKED`); unknown → name + gender required, `customerContact` stored, no message; persons/audience/bride/services/staff/slots through the same planner; overlap re-check under the staff locks (409 `SLOT_TAKEN`); APPROVED, PAY_ON_ARRIVAL, history actor MEMBER, `createdBy`, `closeReminders`; branch member books their own branch (`BRANCH_SCOPE_DENIED`); tattoo design images checked as this salon's member uploads, moved into slots
  - [x] Side effects: socket update (never a request), `booking.created_by_merchant` to a registered customer ("Booked by {salon}", AR + EN), reminder jobs
  - [x] `customerId` optional on bookings: notifications, sockets, rows, admin search work without it (rows show the contact, `customer.id` null)
  - [x] Claim: register and phone change link the number's account-less MERCHANT bookings (never fails the account)
  - [x] Rows: `source`, `createdBy` (null for customers); admin filter `source` + export columns; rating prompt / reviews only with an account (notifications skip a booking without `customerId`)
  - [x] Shared `toBookingPersons` (drafts + business bookings); indexes `{status, appointmentEnd}` + partial `customerContact.phone.e164`
  - [x] Contracts customer 1.13.0, merchant 1.12.0, admin 1.15.0 (CUS-104, MER-085, ADM-112)
- Tests: `tests/merchantBooking.test.ts` (new, 11: lookup, name/gender needed, APPROVED with contact/creator/history + main gender, registered link, blocked, branch scope, SLOT_TAKEN, design images, claim scope, claim never fails), `tests/bookingQueries.test.ts` (+2 source filter/contact row, app row), `tests/permissions.test.ts`, `tests/team.test.ts`, `tests/exports.test.ts`, `tests/tattoo.test.ts` (template/columns/scope updates); affected suites green
- API docs: customer/merchant/admin regenerated + bumped
- Loops: 1/1 — re-read §5.20 bullet by bullet + §6/§8 rows against service, routes, producers, claims, rows; owner answers 5 (no message to unregistered), 6 (registered + unregistered, all types, every status notified), 7 (reviews only registered) applied
- Review: PASSED (SE ✔ (one service, shared persons builder, typed optional customer everywhere), Mobile ✔ (MER-085 / CUS-104 named; additive except nullable `customer.id` in merchant/admin rows), Architect ✔ (three contracts bumped; same locks as the app; no payment path), PM ✔, UX ✔ (lookup first, then name/gender only when needed), Marketing ✔ (customers without the app join their history on sign-up), QA ✔ (each criterion tested))
- Notes: DEVIATIONS — "Booked by" is in the `booking.created_by_merchant` message only; later status messages name the place as before and the apps show the label from `source`; the customer app's own list filter by source is not added (not asked). The lookup reveals whether a number is registered (needed by the owner's rule; limited + permission-gated).
