# WAB-Server — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next server`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)

- Serves `/customer/v1` (51 ops), `/merchant/v1` (71), `/admin/v1` (155) + Socket.IO; contract = `docs/api/openapi.*.json` regenerated with `npm run docs` every task.
- Providers: notifier **real** (`wab-notifications`); otp **arqam** (`wab-otp` 0.3.0, SRV-158: `ARQAM_API_KEY`, `ARQAM_TEMPLATE_AR/EN` (+ optional `ARQAM_SENDER_ID`, `ARQAM_SEND_IP`, `ARQAM_BASE_URL`) + `OTP_CODE_SECRET`/`OTP_PROOF_SECRET`; `fake` + `OTP_FIXED_CODE` for local QA; `whatsapp`/`real` refused); analytics = the server's own MongoDB events (no analytics provider; BigQuery/`@wab/analytics` dropped, owner 2026-10-19); payments **paused** (`PAYMENT_PROVIDER=disabled` in production, `fake` in dev/test; HyperPay/`@wab/payments` not used by the server); storage on the in-repo S3 code until SRV-112.
- Open work: SRV-111 contract guard, Stage N (SRV-117…128, admin gaps), Stage O (SRV-129…134, merchant gaps). Deployment SRV-011/116 and SRV-059/115: owner (PENDING).

## Current task

### SRV-177 — Merchant business types (owner 2026-10-29)

- Branch: `feat/srv-177-merchant-types`
- Branched: from `feat/srv-176-booking-types` (batched flow, rules §3.13)
- Status: IN PROGRESS (committed, not pushed; no PR — the lead ships it)
- Acceptance criteria (BUSINESS_DOMAIN §5.19 application + audience change, §3.3 application (`medicalLicenseKeys` added), §2 `UploadPurpose MEDICAL_LICENSE`, §6 owner-only, §8 `salon.audience_widened`; operations `POST /merchant/v1/salon/applications`, `POST /merchant/v1/salon/application/resubmit`, `POST /merchant/v1/uploads/license/presign`, `PATCH /merchant/v1/salon/audience`, merchant services/catalog):
  - [x] Application takes `salon.businessType` + `audience` (SALON: MALE/FEMALE/BOTH required; CLINIC forced BOTH — SRV-174) and, for a CLINIC, `medicalLicenseKeys` (1–5 confirmed guest `MEDICAL_LICENSE` uploads; missing → 400 `body.medicalLicenseKeys`); stored as `application.medicalLicenseKeys`; resubmit may replace them (old keys allowed, new ones of this salon); a SALON ignores them
  - [x] New upload purpose `MEDICAL_LICENSE` (private, guest + merchant, owner only); the public license presign takes `purpose` (LICENSE_DOCUMENT default | MEDICAL_LICENSE)
  - [x] `PATCH /merchant/v1/salon/audience` owner only: MALE/FEMALE → BOTH instantly (alert `SALON_AUDIENCE_WIDENED` = admin record + email through the alert inbox; owner notice `salon.audience_widened` AR + EN); narrowing, MALE ↔ FEMALE, same audience and clinics → 422 `AUDIENCE_CHANGE_NOT_ALLOWED`; a failed notice keeps the change
  - [x] Services and catalog of the salon's type + fitting audience only (`BUSINESS_TYPE_MISMATCH`), `brideOnly` (`BRIDE_NOT_ALLOWED`) and `brideQualified` refused for clinics and men's salons — rules from SRV-174, clinic staff case tested here
  - [x] Contracts merchant 1.9.0 (MER-080, MER-081), admin 1.11.0 (alert kind, additive), customer 1.10.0 (shared upload purpose enum, no client change)
- Tests: `tests/salonAudience.test.ts` (new: widen from MALE and FEMALE with alert + notice, 4 refusals, owner only, bad audience, notice failure, 503), `tests/salonApplication.test.ts` (+1: clinic needs a confirmed MEDICAL_LICENSE, stored, salon ignores it), `tests/uploads.test.ts` (+1 guest MEDICAL_LICENSE presign, private policy), `tests/staff.test.ts` (+1 bride qualification in a clinic); full jest 169/170 before the policy-test fix, affected 4 suites green after
- API docs: merchant/admin/customer regenerated + bumped
- Loops: 0/1
- Review: PENDING
- Notes: DEVIATION — "audit" of the owner's widening is the admin alert record (kind, member id, from/to) because the audit log is admin-actor only (`AuditWriter` needs an admin id). Catalog requests carry no type field: the request is always for the salon's own type, applied at approval (SRV-174).

## Last blocks

### SRV-176 — Booking rules by business type (owner 2026-10-29)

- Branch: `feat/srv-176-booking-types`
- Branched: from `feat/srv-175-discovery-types` (batched flow, rules §3.13)
- Status: IN PROGRESS (committed, not pushed; no PR — the lead ships it)
- Acceptance criteria (BUSINESS_DOMAIN §5.19 booking persons + bride, §5.4 availability, §5.6 creation, §3.5 snapshots; operations `POST /customer/v1/salons/{salonId}/availability`, `POST /customer/v1/bookings/drafts`, `POST /customer/v1/bookings`, `GET /customer/v1/bookings[/{id}]`):
  - [x] Booking person `gender` (optional in the request, stored on draft + booking persons): a MALE/FEMALE salon takes only its own gender (`GENDER_MISMATCH`, field `persons.N.gender`; omitted = the salon's audience); a BOTH salon and every clinic take mixed persons (customer + up to `booking.maxCompanions`); a bride sent as MALE = `GENDER_MISMATCH`; availability person `gender` checked the same way
  - [x] Bride only at FEMALE/BOTH salons (`BRIDE_NOT_ALLOWED` at clinics and men's salons; SRV-174 rule, tested here for drafts)
  - [x] A customer cannot draft at a business they may not see (404 `SALON_NOT_FOUND`, §5.19 visibility)
  - [x] Snapshots `businessType` + `salonAudience` on every booking (SRV-174) now on list rows for every audience; detail persons carry `gender`
  - [x] Customer bookings list filter `businessType` (all / salons / clinics); the shared query also takes it (admin route wiring in SRV-178)
  - [x] Concurrency unchanged (locks/holds untouched); the existing race tests still pass
  - [x] Contracts customer 1.9.0 (CUS-099), merchant 1.8.0 and admin 1.10.0 additive (no client row)
- Tests: `tests/bookingDrafts.test.ts` (+5: BOTH salon mixed persons + stored genders, clinic mixed + bride refused, women's salon refuses a man with field, default gender, bride as MALE, hidden business 404), `tests/bookingQueries.test.ts` (+1: businessType filter, row type/audience, 400 on bad type); `tests/bookings.test.ts` race suites unchanged (fixture customers now have a gender); full jest 168/169 suites before the fixture fix, the 3 booking suites green after
- API docs: customer/merchant/admin regenerated + bumped
- Loops: 0/1
- Review: PENDING
- Notes: booking persons had no gender before; for single-gender salons it is implied, so older apps keep working. Bookings made before this change have no person gender (`null` in views).

### SRV-175 — Customer discovery by business type (owner 2026-10-29)

- Branch: `feat/srv-175-discovery-types`
- Branched: from `feat/srv-174-business-types` (batched flow, rules §3.13)
- Status: IN PROGRESS (committed, not pushed; no PR — the lead ships it)
- Acceptance criteria (BUSINESS_DOMAIN §5.19 visibility + home, §5.17 discovery, §5.13 Recommended per type, §2; operations `GET /customer/v1/salons`, `/salons/filters`, `/salons/{salonId}`, `/home`, `/favorites`, `/catalog/services`):
  - [x] Visibility (audience ∈ {gender, BOTH}; clinics always BOTH, so every clinic) on search, lists, nearest, Recommended, favorites (add refused 404, list drops hidden) and salon details (signed-in customer's gender, else guest `?gender=`; hidden → 404 `SALON_NOT_FOUND`; no gender → unchanged)
  - [x] `businessType` filter on search, price bounds and nearest; every card carries `businessType` + `audience`
  - [x] Recommended per type: `general=RECOMMENDED&businessType=…` = active placements of that type the gender may see, admin order; without a type salons first, then clinics
  - [x] Home: `salonServices`, `clinicServices`, `recommendedSalons`, `recommendedClinics`, `nearestSalons`, `nearestClinics` (nearest null without a position); old `services`/`recommended`/`nearest` kept as salon aliases (deprecated, app versions before CUS-098)
  - [x] Catalog list per type (`businessType` query, SRV-174) used by the home services sections
  - [x] Contract customer 1.8.0 (CUS-098)
- Tests: `tests/search.test.ts` (+1: type filter, recommended per type and order, cards carry type), `tests/home.test.ts` (+1: six sections per type, aliases, guest without position; existing call expectations per type), `tests/favorites.test.ts` (+1: men's salon refused/dropped for a woman, BOTH + clinic kept), `tests/salonDetails.test.ts` (+1: guest gender 404/200, clinic visible to men, bad gender 400); affected suites green (Terminal panel)
- API docs: customer regenerated, `contract:bump customer` 1.7.0 → 1.8.0
- Loops: 0/1
- Review: PENDING
- Notes: `nearest` list "See more" = the search endpoint with `sort=NEAREST&businessType=CLINIC` (no separate nearest endpoint exists). Guest salon details only filter when the app sends `?gender=` (deep links from a guest without onboarding stay unfiltered).
