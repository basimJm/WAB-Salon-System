# WAB-Server — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next server`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)

- Serves `/customer/v1` (51 ops), `/merchant/v1` (71), `/admin/v1` (155) + Socket.IO; contract = `docs/api/openapi.*.json` regenerated with `npm run docs` every task.
- Providers: notifier **real** (`wab-notifications`); otp **arqam** (`wab-otp` 0.3.0, SRV-158: `ARQAM_API_KEY`, `ARQAM_TEMPLATE_AR/EN` (+ optional `ARQAM_SENDER_ID`, `ARQAM_SEND_IP`, `ARQAM_BASE_URL`) + `OTP_CODE_SECRET`/`OTP_PROOF_SECRET`; `fake` + `OTP_FIXED_CODE` for local QA; `whatsapp`/`real` refused); analytics = the server's own MongoDB events (no analytics provider; BigQuery/`@wab/analytics` dropped, owner 2026-10-19); payments **paused** (`PAYMENT_PROVIDER=disabled` in production, `fake` in dev/test; HyperPay/`@wab/payments` not used by the server); storage on the in-repo S3 code until SRV-112.
- Open work: SRV-111 contract guard, Stage N (SRV-117…128, admin gaps), Stage O (SRV-129…134, merchant gaps). Deployment SRV-011/116 and SRV-059/115: owner (PENDING).

## Current task

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

## Last blocks

### SRV-184 — Discovery across business types without a gender filter (owner 2026-11-03)

- Branch: `feat/srv-184-discovery-merged` (from `feat/srv-183-tattoo`, batch SRV-183…186)
- Status: IN REVIEW (committed, not pushed)
- Acceptance criteria (BUSINESS_DOMAIN §5.22, §5.19 visibility superseded, §5.13; operations `GET /customer/v1/home`, `/salons`, `/salons/filters`, `/salons/suggestions` (new), `/salons/{salonId}`, `/favorites`, `POST /bookings/drafts`):
  - [x] No gender visibility: search/home/nearest/Recommended/favorites (add + list)/details/drafts list every LIVE business; drafts keep the persons rule (`GENDER_MISMATCH` for a woman at a men's salon, men booked fine by anyone)
  - [x] `gender` on search/filters/suggestions = optional filter (MALE → MALE/BOTH, FEMALE → FEMALE/BOTH); `businessType` = lens of one or several types (`A,B` or repeated) on search, filters, suggestions, home; one helper pair `typeCondition` / `audienceCondition`
  - [x] Price range without services = at least one active service inside the range; filters bounds without services = every active service price of the matching businesses
  - [x] Suggestions: matching catalog services with places offering them (most first, only offered ones), then matching places (name/search text), limit 5 each
  - [x] Home: `explore` (lens types, most-booked first from a cached 90-day aggregate, admin order after), `nearYou` (one list), `recommendedAll` (one rail, each type in admin order, deduplicated), `bookAgain` (newest completed booking per business with its salon service ids; null for guests); per-type keys kept for apps before CUS-102 (no gender filter); `gender` selects banners only
  - [x] Contract customer 1.12.0 (CUS-102, CUS-103)
- Tests: `tests/home.test.ts` (rewritten, 10: guest sections + no gender, Explore order, lens on every section, Book again, per-type keys, See more, validation), `tests/homeSources.test.ts` (new, 3: popularity window + cache + failure, Book again per business), `tests/search.test.ts` (+5: every audience + lens, price without services, bounds without services, suggestions, validation), `tests/favorites.test.ts`, `tests/salonDetails.test.ts`, `tests/bookingDrafts.test.ts` (rule changes); 8 affected suites green (139 tests), lint + tsc clean
- API docs: customer regenerated + bumped
- Loops: 1/1 — re-read §5.22 bullet by bullet (no gender filter, lens chips, five home sections in order, search suggestions/chips/filter sheet, bookings) against routes and services; Bookings Upcoming/Past is an app concern (the customer list already filters by tab/status and type); found and fixed: Recommended ids duplicated when a lookup returns a salon for two types
- Review: PASSED (SE ✔ (one condition helper, bounded queries: book-again reads ≤ 50 bookings, Explore one cached aggregate), Mobile ✔ (additive keys; old keys kept for apps before CUS-102), Architect ✔ (customer 1.12.0; no merchant/admin change), PM ✔ (owner decision 10 applied), UX ✔ (sections in the §5.22 order), Marketing ✔ (Book again + Explore popularity), QA ✔ (each criterion tested))
- Notes: DEVIATIONS — full suite deferred to the batch gate (SRV-186); `explore` popularity counts bookings of every status created in the window (not only completed); the lens takes the types the customer picks, `All` = omit.

### SRV-183 — Tattoo studios (owner 2026-11-03)

- Branch: `feat/srv-183-tattoo` (batch SRV-183…186, rules §3.13: commit per task, next task branches from this one)
- Status: IN REVIEW (committed, not pushed)
- Acceptance criteria (BUSINESS_DOMAIN §5.23, §2 `BusinessType`/`UploadPurpose`, §3.5 `BookingPerson.referenceImageKey`, §5.19; operations `POST /customer/v1/bookings/drafts`, `GET /{customer,merchant,admin}/v1/bookings/{id}`, `POST /customer/v1/uploads/presign`, `POST /merchant/v1/salon/applications`, admin catalog):
  - [x] `BUSINESS_TYPES` + `TATTOO`; audience fixed BOTH (`FIXED_AUDIENCE`), so application, admin audience change and owner widening refuse anything else (`AUDIENCE_CHANGE_NOT_ALLOWED`), no bride (`brideAllowed` = SALON only), mixed persons; catalog/requests/placements/admin filters take the type through the existing per-type code
  - [x] Application: TATTOO with the trade license only (no medical license; owner confirmed)
  - [x] Upload purpose `BOOKING_REFERENCE` (private image, customer scope) + slot `bookings/{id}/persons/{i}/reference`
  - [x] Drafts: optional `persons[].referenceImageKey`; only TATTOO (`BUSINESS_TYPE_MISMATCH`, checked before any upload lookup), each a confirmed customer-own `BOOKING_REFERENCE` upload; echoed in the draft view; copied to the booking
  - [x] New booking: images moved into the person's file slot (`key?v=n`) after creation; a failed move is logged and keeps the booking with the confirmed upload key
  - [x] Booking details (customer, merchant, admin): `persons[].referenceImageUrl` = 5-minute signed URL or null
  - [x] Demo: 4 TATTOO catalog services (BOTH) + Black Needle Studio (1 branch, Recommended); `docs/DEMO_ACCOUNTS.md`
  - [x] Contracts customer 1.11.0, merchant 1.11.0, admin 1.14.0 (additive; CUS-104, MER-084, ADM-111)
- Tests: `tests/tattoo.test.ts` (new, 9: rules, catalog schema, upload policy + slot key, image rules, mover incl. failure + ownership, signed URL, demo catalog + studio), `tests/bookingDrafts.test.ts` (+3: tattoo mixed persons + image checked as own upload, bride/unconfirmed refused, image at salon/clinic refused), `tests/bookingQueries.test.ts` (+1 signed URL, null otherwise), `tests/businessTypes.test.ts`, `tests/search.test.ts` (fake lookup per type), `tests/uploads.test.ts` (private purposes)
- API docs: customer/merchant/admin regenerated + bumped
- Gate (Terminal panel): prettier, eslint, tsc, docs, full jest 176 suites / 3059 tests — 2 failures (search fixture returned salon ids for every non-clinic type; upload policy test listed the private purposes), fixed; the 8 affected suites (173 tests) + lint green after
- Loops: 1/1 — re-read §5.23 point by point (type, BOTH, no bride, no age check, catalog per type, one optional image per person, private + signed, trade license) against rules, schemas, draft, creation, details and the demo
- Review: PASSED (SE ✔ (one helper module for the image rule, mover and URL; repository update only), Mobile ✔ (additive fields; CUS-104 / MER-084 named), Architect ✔ (three contracts bumped; storage through FileSlots + outbox), PM ✔ (owner answers 1–4 applied), UX N/A, Marketing N/A, QA ✔ (rule, refusal, ownership, failure, demo tests))
- Notes: DEVIATION — the full suite was not re-run after the two fixture fixes (affected suites only; the next task's gate runs it). Design images are not deleted when an account is purged (bookings are kept for history; retention not decided). The merchant cannot upload a design image yet (SRV-185 adds the merchant scope with `BOOKINGS_CREATE`).
