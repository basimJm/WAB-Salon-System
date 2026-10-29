# WAB-Server — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next server`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)

- Serves `/customer/v1` (51 ops), `/merchant/v1` (71), `/admin/v1` (155) + Socket.IO; contract = `docs/api/openapi.*.json` regenerated with `npm run docs` every task.
- Providers: notifier **real** (`wab-notifications`); otp **arqam** (`wab-otp` 0.3.0, SRV-158: `ARQAM_API_KEY`, `ARQAM_TEMPLATE_AR/EN` (+ optional `ARQAM_SENDER_ID`, `ARQAM_SEND_IP`, `ARQAM_BASE_URL`) + `OTP_CODE_SECRET`/`OTP_PROOF_SECRET`; `fake` + `OTP_FIXED_CODE` for local QA; `whatsapp`/`real` refused); analytics = the server's own MongoDB events (no analytics provider; BigQuery/`@wab/analytics` dropped, owner 2026-10-19); payments **paused** (`PAYMENT_PROVIDER=disabled` in production, `fake` in dev/test; HyperPay/`@wab/payments` not used by the server); storage on the in-repo S3 code until SRV-112.
- Open work: SRV-111 contract guard, Stage N (SRV-117…128, admin gaps), Stage O (SRV-129…134, merchant gaps). Deployment SRV-011/116 and SRV-059/115: owner (PENDING).

## Current task

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

## Last blocks

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

### SRV-174 — Business types model + migration + seed + error codes + contracts (owner 2026-10-29)

- Branch: `feat/srv-174-business-types`
- Branched: from `origin/server`
- Status: IN PROGRESS (committed, not pushed; no PR — the lead ships it)
- Acceptance criteria (BUSINESS_DOMAIN §2 enums, §3.2 catalog, §3.3 salons, §3.5 bookings, §3.7 placements, §5.19 migration, §11 codes; INTEGRATION §5a):
  - [x] Enums `BUSINESS_TYPES` SALON/CLINIC + `AUDIENCES` MALE/FEMALE/BOTH; `salons.businessType` + `audience` replace `gender`; `catalogServices.businessType` + `audience`; bookings `businessType` + `salonAudience` (replace `salonGender`); placements `businessType` + `audience` copied from the salon; indexes per §3.2/§3.3, old gender indexes retired (`RETIRED_INDEXES`)
  - [x] One rule module `domain/businessTypes/rules.ts` (visibility = audience ∈ {gender, BOTH}, clinic always BOTH, catalog fit, bride allowed, person fits, widening)
  - [x] Idempotent migration (`domain/businessTypes/migration.ts` + driver-level Mongo store): rows without `businessType` get SALON + old gender as audience, old field removed; runs (applied) at every server start after `ensureIndexes`, before the demo seed, and as `npm run migrate:business-types [-- --apply]` (dry run by default)
  - [x] Demo seed: catalog gets `businessType`/`audience` + 6 clinic services (botox, filler, laser hair removal, HydraFacial, chemical peel, PRP); 2 clinics (2 branches each) + 1 BOTH salon (1 branch), owner/managers/staff with photos, services only from fitting catalog entries, TRIAL subscriptions, a running Recommended placement per type; insert-only by deterministic ids (`writeDemoDataset`), so it also reaches databases seeded before clinics; `seed:dev` summary `businessRows`
  - [x] Error codes `BUSINESS_TYPE_MISMATCH`, `AUDIENCE_CHANGE_NOT_ALLOWED`, `BRIDE_NOT_ALLOWED` (AR + EN)
  - [x] Every compile-forced caller moved to the new fields with the §5.19 rule (see Notes): search visibility, catalog list (`businessType` + optional `gender`), salon profile/details/applications/admin rows (`businessType` + `audience`), application `salon.businessType` + `audience` (required for SALON, CLINIC forced BOTH), catalog fit on salon services + catalog-request approval (`BUSINESS_TYPE_MISMATCH`), bride rules (`BRIDE_NOT_ALLOWED` on availability/drafts/services; staff `brideQualified` refused for MALE salons and clinics), admin audience change `PATCH /admin/v1/salons/{id}/audience` (replaces `/gender`), admin salon/catalog/placement filters, SALONS export columns, admin socket `application.created`
  - [x] OpenAPI regenerated; contracts common 1.2.0, customer 1.7.0 (CUS-098), merchant 1.7.0 (MER-080), admin 1.9.0 (ADM-109) — BREAKING (minor bump, BREAKING in the note)
- Tests: `tests/businessTypes.test.ts` (new: rules, schemas, migration incl. idempotent + dry run, demo businesses shape/validity/second run writes nothing, locale keys), `tests/search.test.ts` (BOTH + clinic visible to both genders), `tests/catalog.test.ts` (type filter, admin create/list per type, CLINIC must be BOTH), `tests/salonServices.test.ts` (clinic entry / other audience refused, BOTH entry fits, BRIDE_NOT_ALLOWED), `tests/adminSalons.test.ts` (audience change: narrowing with conflicts, widening, clinic refused), `tests/salonApplication.test.ts` (SALON needs audience, BOTH salon, CLINIC forced BOTH, old `gender` refused), `tests/availabilityApi.test.ts` + `tests/bookingDrafts.test.ts` (BRIDE_NOT_ALLOWED at men's salon/clinic), fixtures in ~35 suites moved to `businessType`/`audience`; full jest before the fixes 155/168 suites, affected 21 suites green after
- API docs: all four regenerated + bumped
- Loops: 0/1
- Review: PENDING
- Notes: DEVIATION — the model rename breaks every reader at compile time, so this branch already carries the parts of SRV-177 (application type/audience, catalog fit, bride flags) and SRV-178 (admin audience change, admin filters, placements per type) that the compiler forced; SRV-175…178 add the rest. Booking persons have no gender field today: the mixed-gender rule lands in SRV-176. Tools run from a symlinked `node_modules` (not committed), `ensure-sdks` skipped.
