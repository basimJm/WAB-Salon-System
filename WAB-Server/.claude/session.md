# WAB-Server — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next server`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)

- Serves `/customer/v1` (51 ops), `/merchant/v1` (71), `/admin/v1` (155) + Socket.IO; contract = `docs/api/openapi.*.json` regenerated with `npm run docs` every task.
- Providers: notifier **real** (`wab-notifications`); otp **arqam** (`wab-otp` 0.3.0, SRV-158: `ARQAM_API_KEY`, `ARQAM_TEMPLATE_AR/EN` (+ optional `ARQAM_SENDER_ID`, `ARQAM_SEND_IP`, `ARQAM_BASE_URL`) + `OTP_CODE_SECRET`/`OTP_PROOF_SECRET`; `fake` + `OTP_FIXED_CODE` for local QA; `whatsapp`/`real` refused); analytics = the server's own MongoDB events (no analytics provider; BigQuery/`@wab/analytics` dropped, owner 2026-10-19); payments **paused** (`PAYMENT_PROVIDER=disabled` in production, `fake` in dev/test; HyperPay/`@wab/payments` not used by the server); storage on the in-repo S3 code until SRV-112.
- Open work: SRV-111 contract guard, Stage N (SRV-117…128, admin gaps), Stage O (SRV-129…134, merchant gaps). Deployment SRV-011/116 and SRV-059/115: owner (PENDING).

## Current task

### SRV-182 — Every module on the file lifecycle (owner 2026-11-01)

- Branch: `feat/srv-180-r2-storage` (batch SRV-180…182 on one branch)
- Status: IN PROGRESS (committed, not pushed)
- Acceptance criteria (BUSINESS_DOMAIN §3.7 file slots + storageCleanups; operations PUT/DELETE `/customer/v1/profile/avatar`, PATCH `/merchant/v1/salon/profile`, `/merchant/v1/team/members[/{id}]`, PATCH `/merchant/v1/me`, `/merchant/v1/salon/services/{id}`, DELETE `/merchant/v1/salon/gallery/{id}`, `/merchant/v1/salon/application/resubmit`, admin catalog / banners / catalog requests / salon edit):
  - [x] Slots (same key + version, replaced in place): customer avatar, salon cover + logo (`profileKey`, merchant and admin edit), member photo (team create/update + own profile), catalog image (admin create/update + approved catalog request), banner image per language
  - [x] Lists queue what they drop: service media, gallery item files (now through the outbox instead of a best-effort delete), license + medical-license documents replaced on resubmit, catalog-request images (rejected, mapped to an existing entry, or replaced by the admin's)
  - [x] Customer purge removes the avatar slot (record + objects queued) instead of a direct delete
  - [x] Request schemas of every slot field accept the returned reference `key?v=n` (an app may send back what it read): merchant 1.10.0, admin 1.13.0 (additive, no client change; customer avatar body had no pattern)
  - [x] No module deletes stored objects directly any more (grep: only the outbox and the provider); every write goes through `StorageProvider`
- Tests: `tests/fileSlots.test.ts` (12: create, read URL with version, replace keeps file id + key, no duplicate, old content replaced, legacy key queued, delete DB-first + idempotent, live slot kept, demo never queued, vanished temp / copy failure keep the old file, failed deletion retried with backoff, cross-tenant refused, concurrent replacements serialised), `tests/adminImageSlots.test.ts` (5), updated `customerProfile`, `team`, `memberSelf`, `salonProfile`, `adminSalonEdit`, `gallery`, `salonServices`, `accountLifecycle` suites (`tests/helpers/fileSlots.ts` kit: real slots + outbox over fake models)
- API docs: merchant 1.10.0, admin 1.13.0 regenerated (patterns only)
- Gate (Terminal panel): prettier, eslint, tsc, build, `npm run docs` (no drift), full jest 175 suites / 3044 tests green; wab-storage `npm run verify` (216) + loop green
- Loops: 1/1 — re-checked the owner's spec point by point (R2, central service, CRUD lifecycle, per-module prefixes, metadata, entity integration, consistency, security, tests); found and fixed during the loop: slot fields refused the returned `?v=` reference (contract break for apps that echo values), the first FILE_REF pattern refused dotted single-segment keys (banners), the admin image wrapper ran rules after copying (now before)
- Review: PASSED (SE ✔ (one FileSlots + one outbox, DB written before objects are queued, locks per slot, idempotent deletes), Mobile ✔ (no app change: same request/response shapes, URLs gain `?v=`), Architect ✔ (additive contracts, R2/S3 by env, demo assets protected, Phase 2 untouched), QA ✔ (spec tests 1–12; migration test not applicable))
- Notes: DEVIATIONS / LIMITS — (1) temporary upload keys keep the existing prefixes (`customers/`, `salons/cover/`, `gallery/`, `services/`, `licenses/`…); only slot keys follow the new per-entity layout, multi-file items keep one key per file (no `documents/{ownerType}/{ownerId}/` move); (2) `originalName` is not stored (the presign request has no file name; adding it is an API change); (3) there are no booking attachments in the product, so nothing to integrate; (4) salon deletion only takes a salon offline (history kept), so it deletes no files; exports are never deleted (retention not decided); (5) if the entity write fails after the copy, the slot already holds the new content while the entity keeps the previous version number (same key: the image is right, only a cache may be stale); (6) slot rows of salon-owned images record `ownerType: MEMBER`, `ownerId = salonId` (+ `salonId`), admin images `ADMIN`; (7) no S3→R2 migration tool (owner) and no run against real R2 (no credentials).

### SRV-181 — File slots: same-key replacement + reliable cleanup (owner 2026-11-01)

- Branch: `feat/srv-180-r2-storage` (batch)
- Status: IN PROGRESS (committed, not pushed)
- Acceptance criteria (BUSINESS_DOMAIN §3.7, updated in this batch):
  - [x] `uploads` rows: `slot`, `version`, `size`, status `CONSUMED`; one row per slot key, kept across replacements (file id stable)
  - [x] `FileSlots.replace`: ownership via `assertConfirmed`, server-side copy temp → slot key under a per-slot Redis lock, `stat` for size/type, version $inc, variants regenerated, entity commit, temp `CONSUMED` + queued, older plain key queued; `remove`: entity first, then record + objects queued
  - [x] References `key?v=n`: the provider builds versioned public URLs, strips the version for reads/deletes/signing, `variantKey` keeps it
  - [x] `storageCleanups` outbox + `periodic.storage-cleanup` (every 5 min) + drain after enqueue: batch delete, backoff retries (no give-up), live slots skipped, `demo/` keys never queued, malformed keys refused
- Tests: see SRV-182 (`tests/fileSlots.test.ts`)
- Loops: 1/1 — covered by the SRV-182 batch loop
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — see SRV-182
- Notes: lock = 30 s TTL, waits up to ~5 s, then 409.

### SRV-180 (+ STO-011) — Cloudflare R2 storage provider (owner 2026-11-01)

- Branch: `feat/srv-180-r2-storage`
- Branched: from `origin/server` (SRV-179 is on its own unmerged branch)
- Status: IN PROGRESS (batch SRV-180…182, rules §3.13)
- Owner decisions 2026-11-01: two R2 buckets (public + private), same-key replacement with a version in the URL (SRV-181), no S3→R2 migration tool
- Acceptance criteria (BUSINESS_DOMAIN §3.7 uploads, §2 visibility; BRD storage NFRs; no API change):
  - [x] Inspected first: storage already central (server `StorageProvider` → `@wab/storage` SDK S3 adapter; `uploads` collection = file metadata; presign → confirm → `assertConfirmed`); gaps recorded for SRV-181/182 (replacement leaves old objects for salon cover/profile, member photo, service media, catalog, banners, licenses)
  - [x] SDK 0.2.0: provider `r2` on the S3 adapter (account endpoint, region `auto`, checksums only when required, public ≠ private bucket, prod https); `copy` (same bucket, atomic replace, `STORAGE_OBJECT_NOT_FOUND`) + `stat` on S3/R2, memory, local-fs; `configureBucketCors`
  - [x] Server: `STORAGE_PROVIDER=fake|real|cloudflare-r2`; `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_BUCKET_NAME`, `R2_PRIVATE_BUCKET_NAME`, `R2_ENDPOINT` (optional), `R2_PUBLIC_URL`; required together; buckets must differ; production = `real` or `cloudflare-r2`, https only; `real` (AWS S3) kept as fallback
  - [x] `StorageProvider.copy` (`COPIED` | `SOURCE_MISSING`) + `stat` on the SDK-backed and the fake provider
  - [x] `npm run storage:cors` (both buckets, exact admin origins from `CORS_ALLOWED_ORIGINS`; prints counts / error codes only)
  - [x] `.env.example`, `docker/env.{dev,prod}.example` (R2 active, S3 commented), `docs/DEPLOYMENT.md` R2 runbook (buckets, public domain only on the public bucket, scoped token, CORS, re-seed)
- Tests: wab-storage `tests/r2.test.ts` (20: config, endpoint/region, prod rules, presign without checksum params, copy/stat per adapter, CORS) — `npm run verify` 216 tests + coverage + loop green; server `tests/storageR2.test.ts` (9), `tests/storageCors.test.ts` (3), `tests/config.test.ts` (+4 R2), `tests/checkEnv.test.ts` (templates with R2)
- API docs: no change
- Loops: 1/1 — batch gate after SRV-182 (see SRV-182): full server gate + wab-storage verify/loop green; re-checked the R2 rules (region auto, two buckets, https in prod, checksums when required, credentials never printed)
- Review: PASSED (SE ✔ (one adapter for S3 and R2, no duplicate storage code), Mobile N/A (no app change), Architect ✔ (provider switch by env, `real` kept as fallback, SDK 0.2.0 additive), QA ✔ (config/prod rules/presign/copy/stat/CORS tests))
- Notes: no R2 credentials here: real R2 calls are not verified (presigned URLs are built locally by the real AWS SDK and checked for host, region `auto`, no checksum parameters). No S3→R2 copy (owner).

### SRV-179 — Fix: clinic and BOTH-salon details answered 500 (owner 2026-10-30)

- Branch: `fix/srv-179-demo-photo-keys`
- Status: DONE (PR #602)
- Acceptance criteria (BUSINESS_DOMAIN §5.19 demo businesses; operations `GET /customer/v1/salons/{salonId}` and every page that lists the business staff):
  - [x] Root cause: the demo business seed (SRV-174) built staff photo keys from labels like `abdoun:staff0`; ':' is not a valid object key, so `storage.getPublicUrl` threw `RangeError invalid object key` and the details of both clinics (and Unity Salon) answered 500 INTERNAL (reproduced on the hosted dev API and on a local stack)
  - [x] Seed key uses '-' (same rule as `salons.ts`); every stored file key of the demo businesses passes `assertObjectKey`
  - [x] `docs/DEMO_ACCOUNTS.md` lists the clinic and BOTH-salon accounts (owners, managers, staff; `+962 78902 0xxx`)
  - [x] Databases seeded before the fix: `repairDemoBusinessPhotoKeys` sets the valid key only where the stored key fails `OBJECT_KEY_PATTERN` (a merchant-changed valid photo is never touched); runs in `seedDemoData` (so also on start with `SEED_DEMO_ON_START`)
- Tests: `tests/businessTypes.test.ts` (+2: valid keys, repair rows + filter), `tests/devSeed.test.ts` (report field); local stack: both clinic details 500 → 200 after re-seeding the same database
- API docs: no change
- Gate (Terminal panel): prettier --check ., eslint ., `tsc --noEmit`, build, `npm run docs` (no diff), full jest 171 suites / 3012 tests green
- Loops: 1/1 — reproduced the 500 locally, fixed, re-seeded the already-broken database and re-requested both clinics (200); grepped every `demoFileKey` caller for ':' labels (only this one)
- Review: PASSED (SE ✔ (repair filter only touches invalid keys; insert-only seed unchanged), Mobile N/A, Architect ✔ (no contract change; hosted dev heals on its next seed-on-start deploy), QA ✔ (key validity + repair tests; full suite green))
- Notes: the hosted dev API keeps answering 500 until this is merged and deployed (its seed-on-start then repairs the rows). Old upload records with the bad key stay (unused).

### SRV-178 — Admin business types (owner 2026-10-29)

- Branch: `feat/srv-178-admin-types`
- Branched: from `feat/srv-177-merchant-types` (batched flow, rules §3.13)
- Status: IN REVIEW (committed, not pushed; no PR — the lead ships it)
- Acceptance criteria (BUSINESS_DOMAIN §5.19 admin, §5.12 conflicts, §5.13 placements per type, §3.2 catalog; operations `GET /admin/v1/salons`, `/salons/applications[/{id}]`, `/bookings`, `/reviews`, `/recommended`, `/catalog/services`, `/catalog/requests`, `POST /exports`, `PATCH /salons/{id}/audience`):
  - [x] `businessType` filter on salons (+ `audience`), applications, bookings (+ BOOKINGS export), reviews, placements (+ `audience`), catalog (+ `audience`), catalog requests, SALONS export (+ `audience`); reviews and catalog requests filter through one helper `domain/businessTypes/salonFilter.ts` (type → its salon ids; an explicit salon of another type matches nothing)
  - [x] Catalog create per `businessType` + `audience` (CLINIC entries BOTH; type/audience fixed after create), placements copy type/audience and reorder per type (SRV-174)
  - [x] Audience narrowing/widening by admin with reason: `PATCH /admin/v1/salons/{id}/audience` (SRV-174: narrowing refused with the §5.12 booking list, unfitting services off, bride flags cleared for men's salons, clinic refused `AUDIENCE_CHANGE_NOT_ALLOWED`, audit `SALON_CHANGE_AUDIENCE`, owner notice `salon.audience_changed`)
  - [x] Applications expose `businessType`, `audience` (SRV-174) and the clinic's `medicalLicenseUrls` (signed, short-lived, like `documentUrls`)
  - [ ] Banners/campaigns audience and reports by business type — NOT done (see Notes)
  - [x] Contract admin 1.12.0 (ADM-109, ADM-110)
- Tests: `tests/salonFilter.test.ts` (new, 4), `tests/salonReview.test.ts` (+1: type filter, clinic medical license URLs, empty for a salon), `tests/bookingQueries.test.ts` (+1 admin type filter, 400), `tests/adminReviews.test.ts` (type filter incl. with a salon), `tests/salonServices.test.ts` (catalog requests per type)
- API docs: admin regenerated + bumped
- Gate (after the fifth task, Terminal panel, `feat/srv-178-admin-types`): prettier --check ., eslint ., `tsc --noEmit`, `tsc -p tsconfig.build.json` + `node dist/docs/generate.js` (no diff after commit), full jest 171 suites / 3010 tests green
- Loops: 1/1 — re-read §5.19 admin list against every admin list/export; banners/campaigns/reports gaps recorded as deviations (owner questions)
- Review: PASSED (SE ✔ (one salon-filter helper; repository queries), Mobile N/A (admin only), Architect ✔ (admin 1.12.0; ADM-109/110 named), QA ✔ (filter tests per list; full suite green)) — with the deviations in Notes
- Notes: DEVIATIONS — (1) banners and push campaigns target customers by gender (customer audience), not businesses; a business-type filter for them has no field to read and §5.19 does not say what it would select, so nothing was built (owner question); (2) daily reports are stored per day without a type split, so a type filter on reports needs a report schema change + re-aggregation (owner question; BOOKINGS/SALONS exports do filter by type); (3) the type filter on reviews/catalog requests loads the ids of every business of that type (fine at admin scale; a `businessType` copy on those rows would be the indexed alternative).

## Last blocks

> Business-types batch (SRV-174…178): all five blocks kept here (stacked branches; ship from `feat/srv-178-admin-types`) — deviation from current + 2.

### SRV-177 — Merchant business types (owner 2026-10-29)

- Branch: `feat/srv-177-merchant-types`
- Branched: from `feat/srv-176-booking-types` (batched flow, rules §3.13)
- Status: IN REVIEW (committed, not pushed; no PR — the lead ships it)
- Acceptance criteria (BUSINESS_DOMAIN §5.19 application + audience change, §3.3 application (`medicalLicenseKeys` added), §2 `UploadPurpose MEDICAL_LICENSE`, §6 owner-only, §8 `salon.audience_widened`; operations `POST /merchant/v1/salon/applications`, `POST /merchant/v1/salon/application/resubmit`, `POST /merchant/v1/uploads/license/presign`, `PATCH /merchant/v1/salon/audience`, merchant services/catalog):
  - [x] Application takes `salon.businessType` + `audience` (SALON: MALE/FEMALE/BOTH required; CLINIC forced BOTH — SRV-174) and, for a CLINIC, `medicalLicenseKeys` (1–5 confirmed guest `MEDICAL_LICENSE` uploads; missing → 400 `body.medicalLicenseKeys`); stored as `application.medicalLicenseKeys`; resubmit may replace them (old keys allowed, new ones of this salon); a SALON ignores them
  - [x] New upload purpose `MEDICAL_LICENSE` (private, guest + merchant, owner only); the public license presign takes `purpose` (LICENSE_DOCUMENT default | MEDICAL_LICENSE)
  - [x] `PATCH /merchant/v1/salon/audience` owner only: MALE/FEMALE → BOTH instantly (alert `SALON_AUDIENCE_WIDENED` = admin record + email through the alert inbox; owner notice `salon.audience_widened` AR + EN); narrowing, MALE ↔ FEMALE, same audience and clinics → 422 `AUDIENCE_CHANGE_NOT_ALLOWED`; a failed notice keeps the change
  - [x] Services and catalog of the salon's type + fitting audience only (`BUSINESS_TYPE_MISMATCH`), `brideOnly` (`BRIDE_NOT_ALLOWED`) and `brideQualified` refused for clinics and men's salons — rules from SRV-174, clinic staff case tested here
  - [x] Contracts merchant 1.9.0 (MER-080, MER-081), admin 1.11.0 (alert kind, additive), customer 1.10.0 (shared upload purpose enum, no client change)
- Tests: `tests/salonAudience.test.ts` (new: widen from MALE and FEMALE with alert + notice, 4 refusals, owner only, bad audience, notice failure, 503), `tests/salonApplication.test.ts` (+1: clinic needs a confirmed MEDICAL_LICENSE, stored, salon ignores it), `tests/uploads.test.ts` (+1 guest MEDICAL_LICENSE presign, private policy), `tests/staff.test.ts` (+1 bride qualification in a clinic); full jest 169/170 before the policy-test fix, affected 4 suites green after
- API docs: merchant/admin/customer regenerated + bumped
- Gate (after the fifth task, Terminal panel, `feat/srv-178-admin-types`): prettier --check ., eslint ., `tsc --noEmit`, `tsc -p tsconfig.build.json` + `node dist/docs/generate.js` (no diff after commit), full jest 171 suites / 3010 tests green
- Loops: 1/1 — re-read §5.19 application/audience change, §6 owner-only, §8 against the application, uploads policy, widen route; found and fixed: the upload policy test assumed one private purpose
- Review: PASSED (SE ✔ (owner-only route → service → repository; alert + notice failures logged, change kept), Mobile ✔ (MER-080/081 named; AR + EN notice), Architect ✔ (merchant 1.9.0, admin/customer additive bumps), QA ✔ (widen/refusals/owner-only/medical license tests; full suite green))
- Notes: DEVIATION — "audit" of the owner's widening is the admin alert record (kind, member id, from/to) because the audit log is admin-actor only (`AuditWriter` needs an admin id). Catalog requests carry no type field: the request is always for the salon's own type, applied at approval (SRV-174).

### SRV-176 — Booking rules by business type (owner 2026-10-29)

- Branch: `feat/srv-176-booking-types`
- Branched: from `feat/srv-175-discovery-types` (batched flow, rules §3.13)
- Status: IN REVIEW (committed, not pushed; no PR — the lead ships it)
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
- Gate (after the fifth task, Terminal panel, `feat/srv-178-admin-types`): prettier --check ., eslint ., `tsc --noEmit`, `tsc -p tsconfig.build.json` + `node dist/docs/generate.js` (no diff after commit), full jest 171 suites / 3010 tests green
- Loops: 1/1 — re-read §5.19 persons/bride and §5.4/§5.6 against plan/slots/drafts/creation/reassign (gender carried through draft → booking → reassign re-plan); found and fixed: customers without a gender in booking fixtures (the hidden-business check needs it; the schema requires it)
- Review: PASSED (SE ✔ (rule in the shared planner, so drafts, creation and reassign agree), Mobile ✔ (person gender optional; CUS-099), Architect ✔ (contracts bumped; locks/holds untouched), QA ✔ (mixed/single-gender/bride/hidden tests; race suites green))
- Notes: booking persons had no gender before; for single-gender salons it is implied, so older apps keep working. Bookings made before this change have no person gender (`null` in views).

### SRV-175 — Customer discovery by business type (owner 2026-10-29)

- Branch: `feat/srv-175-discovery-types`
- Branched: from `feat/srv-174-business-types` (batched flow, rules §3.13)
- Status: IN REVIEW (committed, not pushed; no PR — the lead ships it)
- Acceptance criteria (BUSINESS_DOMAIN §5.19 visibility + home, §5.17 discovery, §5.13 Recommended per type, §2; operations `GET /customer/v1/salons`, `/salons/filters`, `/salons/{salonId}`, `/home`, `/favorites`, `/catalog/services`):
  - [x] Visibility (audience ∈ {gender, BOTH}; clinics always BOTH, so every clinic) on search, lists, nearest, Recommended, favorites (add refused 404, list drops hidden) and salon details (signed-in customer's gender, else guest `?gender=`; hidden → 404 `SALON_NOT_FOUND`; no gender → unchanged)
  - [x] `businessType` filter on search, price bounds and nearest; every card carries `businessType` + `audience`
  - [x] Recommended per type: `general=RECOMMENDED&businessType=…` = active placements of that type the gender may see, admin order; without a type salons first, then clinics
  - [x] Home: `salonServices`, `clinicServices`, `recommendedSalons`, `recommendedClinics`, `nearestSalons`, `nearestClinics` (nearest null without a position); old `services`/`recommended`/`nearest` kept as salon aliases (deprecated, app versions before CUS-098)
  - [x] Catalog list per type (`businessType` query, SRV-174) used by the home services sections
  - [x] Contract customer 1.8.0 (CUS-098)
- Tests: `tests/search.test.ts` (+1: type filter, recommended per type and order, cards carry type), `tests/home.test.ts` (+1: six sections per type, aliases, guest without position; existing call expectations per type), `tests/favorites.test.ts` (+1: men's salon refused/dropped for a woman, BOTH + clinic kept), `tests/salonDetails.test.ts` (+1: guest gender 404/200, clinic visible to men, bad gender 400); affected suites green (Terminal panel)
- API docs: customer regenerated, `contract:bump customer` 1.7.0 → 1.8.0
- Gate (after the fifth task, Terminal panel, `feat/srv-178-admin-types`): prettier --check ., eslint ., `tsc --noEmit`, `tsc -p tsconfig.build.json` + `node dist/docs/generate.js` (no diff after commit), full jest 171 suites / 3010 tests green
- Loops: 1/1 — re-read §5.19 visibility/home and §5.17/§5.13 against search, nearest, Recommended, favorites, details and home; checked every `search.cards` and `nearestBranches` caller; checked: Recommended without a type lists salons first, then clinics
- Review: PASSED (SE ✔ (visibility = one Mongo condition, no per-row queries), Mobile ✔ (home keys additive, old keys kept; CUS-098), Architect ✔ (customer 1.8.0), QA ✔ (search/home/favorites/details tests; full suite green))
- Notes: `nearest` list "See more" = the search endpoint with `sort=NEAREST&businessType=CLINIC` (no separate nearest endpoint exists). Guest salon details only filter when the app sends `?gender=` (deep links from a guest without onboarding stay unfiltered).

### SRV-174 — Business types model + migration + seed + error codes + contracts (owner 2026-10-29)

- Branch: `feat/srv-174-business-types`
- Branched: from `origin/server`
- Status: IN REVIEW (committed, not pushed; no PR — the lead ships it)
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
- Gate (after the fifth task, Terminal panel, `feat/srv-178-admin-types`): prettier --check ., eslint ., `tsc --noEmit`, `tsc -p tsconfig.build.json` + `node dist/docs/generate.js` (no diff after commit), full jest 171 suites / 3010 tests green
- Loops: 1/1 — re-read §2/§3.2/§3.3/§3.5/§3.7/§5.19 migration/§11 against the models, the migration (idempotent, driver-level, at start + CLI) and the regenerated contracts; grepped every remaining `gender` in src (only customer/person gender, banners/campaigns by customer gender, demo spec gender); fixed on the way: stale gender wording in the catalog-request and merchant-services OpenAPI descriptions
- Review: PASSED (SE ✔ (one rule module, driver-level migration store, constants/locales, no new hardcoded values), Mobile ✔ (BREAKING contracts named: CUS-098, MER-080, ADM-109), Architect ✔ (four contracts bumped; migration idempotent at start; Phase 2 payments untouched), QA ✔ (rules, migration incl. idempotency/dry run, seed idempotency, schema tests; full suite green))
- Notes: DEVIATION — the model rename breaks every reader at compile time, so this branch already carries the parts of SRV-177 (application type/audience, catalog fit, bride flags) and SRV-178 (admin audience change, admin filters, placements per type) that the compiler forced; SRV-175…178 add the rest. Booking persons have no gender field today: the mixed-gender rule lands in SRV-176. Tools run from a symlinked `node_modules` (not committed), `ensure-sdks` skipped.
