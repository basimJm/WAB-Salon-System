# WAB-Server — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next server`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)

- Serves `/customer/v1` (51 ops), `/merchant/v1` (71), `/admin/v1` (155) + Socket.IO; contract = `docs/api/openapi.*.json` regenerated with `npm run docs` every task.
- Providers: notifier **real** (`wab-notifications`); otp **arqam** (`wab-otp` 0.3.0, SRV-158: `ARQAM_API_KEY`, `ARQAM_TEMPLATE_AR/EN` (+ optional `ARQAM_SENDER_ID`, `ARQAM_SEND_IP`, `ARQAM_BASE_URL`) + `OTP_CODE_SECRET`/`OTP_PROOF_SECRET`; `fake` + `OTP_FIXED_CODE` for local QA; `whatsapp`/`real` refused); analytics = the server's own MongoDB events (no analytics provider; BigQuery/`@wab/analytics` dropped, owner 2026-10-19); payments **paused** (`PAYMENT_PROVIDER=disabled` in production, `fake` in dev/test; HyperPay/`@wab/payments` not used by the server); storage on the in-repo S3 code until SRV-112.
- Open work: SRV-111 contract guard, Stage N (SRV-117…128, admin gaps), Stage O (SRV-129…134, merchant gaps). Deployment SRV-011/116 and SRV-059/115: owner (PENDING).

## Current task

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

## Last blocks

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

### SRV-173 — One-command dev seed: data, branches, images, reports (owner 2026-10-27)

- Branch: `feat/srv-173-dev-seed`
- Branched: from `origin/server`
- Status: IN REVIEW (committed, not pushed; no PR — the lead ships it)
- Acceptance criteria (owner request "seeds, demo images and real data just for development, so when we run the seed it fills the dev db"; BUSINESS_DOMAIN §3.3a/§5.16–§5.18 demo branches (unchanged), storage port; no operation changed):
  - [x] `npm run seed:dev [-- <photo folder>]` (`seeds/runDev.ts` → `seeds/devSeed.ts` `runDevSeed`): indexes + reference → admin from `ADMIN_EMAIL`/`ADMIN_PASSWORD` only when no admin exists (else `existing`; neither → `skipped` + warning, demo parts skipped) → demo catalog + base data + main-branch migration + extra branches (Lamar 4, Rose 3, Al-Ostaz 3, Gentlemen's 3) + branch staff photos → demo images (placeholders / owner photos) + thumbnails + flags through the storage port → daily reports; one counts line per part (no keys, ids or secrets)
  - [x] Idempotent: data insert-only (base once, branches once); a placeholder only where `storage.read` finds nothing, a flag only when the stored bytes differ; owner photos always win; a second run writes nothing new (unit + real run)
  - [x] Branch staff carry `photoKey` + a confirmed `MEMBER_PHOTO` upload record; branches an earlier seed wrote get them backfilled (`$set` only where `photoKey` is missing; upload records insert-only)
  - [x] `SEED_DEMO_ON_START=true` runs the same `seedDev` in the background with real storage when configured (images included), logs a counts summary, never throws
  - [x] Guard: `assertDemoAllowed` for `seed:dev` and on-start (production rules need `SEED_DEMO_DATABASE` = connected database); no real storage → images + flags skipped with a warning, data still seeded
  - [x] Scripts consistent: `seed` = `seedIndexesAndReference` + flags, `seed:demo` = reference + `seedDemoData` + `storeDailyReports`, `seed:demo-images` = `seedDemoImages`; `seed:dev` composes those functions (no copied logic)
  - [x] Docs: `docs/DEPLOYMENT.md` + `docs/DEMO_ACCOUNTS.md` "fill the dev database" (local one command; Render env or Render Shell), `.env.example` + `docker/env.dev.example` comments (no key changed)
  - [x] Found by the real run and fixed: an admin-made catalog service became the base data set's last upload (its record already existed), so the "base written" marker was never stored and every run re-inserted ~105 time-dependent server events; only demo catalog pictures get demo upload records now
- Tests: `tests/devSeed.test.ts` (new, 13: order reference→admin→demo→images→reports, no-admin and no-storage paths with warnings, steps without storage, summary lines, every demo key incl. branch staff + thumbnails + flags through the real `@wab/storage` memory adapter with a second run writing nothing, branch staff photo backfill, on-start summary/failure/production guard, catalog marker regression), `tests/demoImageUpload.test.ts` (+1), `tests/flagImages.test.ts` + `tests/demoBranchActivity.test.ts` updated; shared fixtures in `tests/helpers/demoFixtures.ts`
- Gate (Terminal panel): prettier --check ., eslint ., `tsc --noEmit`, `tsc -p tsconfig.build.json` + `node dist/docs/generate.js` (no diff in `docs/api`), full jest 168 suites / 2957 tests green
- API docs: no change
- Real run (local QA stack :4000 / Mongo 27018 / MinIO 9000, left running): `seed:dev` twice after the fix → both: reference 0 created / 27 there, admin existing, catalog 0/18, base "already seeded", extra branches 0 written / 9 there, images 0 placeholders / 135 already stored, flags 0 written / 1 unchanged, reports 14; 24/24 branch staff have `photoKey`; `GET /customer/v1/salons?gender=FEMALE` → Lamar `branchCount` 4, Rose 3; MinIO 200 for `demo/salons/lamar/profile.jpg`, its `_thumb.webp`, `demo/members/lamar-khalda-staff0.jpg`, `flags/jo.svg`
- Loops: 1/1 — re-checked each criterion against the code, the tests and the real run; found and fixed: the base marker defect above, flags rewritten on every run (now compared)
- Review: PASSED (SE ✔ (composition over the existing seed functions; storage port only; constants/env keys named), Mobile N/A (no contract change), Architect ✔ (no API change; dev-only guard reused; on-start never blocks the API), QA ✔ (every criterion has a test; real run idempotent))
- Notes: DEVIATIONS: (1) the QA database keeps the duplicate demo server events the pre-fix runs (2 here, plus earlier `qa/stack.sh` starts) inserted — not deleted (insert-only seed; QA analytics noise only); (2) the first real run's counts scrolled out of the terminal (the second pre-fix run and both post-fix runs were read); (3) the reports step recomputes the 14 stored days each run (same values); (4) an `ADMIN_PASSWORD` under 12 characters fails the run loudly (same rule as `seed:admin`); (5) admin-made catalog services still feed demo salon services on an edited DB (pre-existing, unchanged); (6) tools run from a symlinked `node_modules` (not committed), `ensure-sdks` skipped.
