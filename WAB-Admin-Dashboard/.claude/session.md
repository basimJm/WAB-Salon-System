# WAB-Admin-Dashboard — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next admin`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)

- Consumes all 116 `/admin/v1` operations through the generated contract (`npm run api:sync`); mock transport on fixtures in dev; realtime `/admin` namespace client done.
- Remote dev switch (ADM-079) checked against the real server (local stack + hosted dev wiring): gap list `docs/REMOTE_DEV_GAPS.md`; Phase 4C (ADM-068…077) BLOCKED on SRV-117…127 + SRV-110; ADM-002/005/006/082/083 PENDING owner hosting/CI; ADM-080 e2e waived by the owner.
- Gate: `sh scripts/gate.sh` + browser UI check before every commit; no GitHub CI.

## Current task

### ADM-109 — Business types: contract 1.12.0 re-sync + type filters + badges + medical license

- Branch: `feat/adm-109-business-types`
- Status: IN PROGRESS
- Acceptance criteria (BUSINESS_DOMAIN §2, §3.3, §5.13, §5.19, §12.10; INTEGRATION §5a; SRV-174…178; operations getSalons, getSalonsById, patchSalonsByIdAudience, getSalonsApplications(+ById), getBookings(+ById), getReviews, getRecommended, putRecommendedReorder, getCatalogServices, postCatalogServices, getCatalogRequests, postExports, getSearch, getAlerts):
  - [x] `npm run api:sync` → admin contract 1.12.0 (`gender` → `businessType` + `audience`, `/gender` → `/audience`, type filters, `medicalLicenseUrls`, alert kind `SALON_AUDIENCE_WIDENED`, 3 new error codes, branches list paged)
  - [x] Domain kernel `domain/shared/businessType.ts` (enums, `audiencesFor`, `audienceFor`, `isWidening`, `canChangeAudience`, `catalogFits` = server rule, `brideAllowed`, `PersonGender` for customers/campaigns); `gender` gone from salons, applications, catalog, placements, bookings (snapshots + person gender), search
  - [x] All / Salons / Clinics switch (`BusinessTypeFilter`, URL key `type`) on salons (+ audience filter, export), applications, bookings (+ export), reviews, catalog services, catalog requests; placements per type (Recommended salons / clinics, reorder per type); server-side params only
  - [x] Type + audience badges (`BusinessBadges`, status registry kinds `businessType`/`audience`) on salon rows/details, applications rows/review, booking rows/details, catalog rows, placements rows
  - [x] Application review: trade license + medical license documents (signed URLs); a clinic without one is flagged
  - [x] Error codes `BUSINESS_TYPE_MISMATCH`, `AUDIENCE_CHANGE_NOT_ALLOWED`, `BRIDE_NOT_ALLOWED` (AR + EN); alert kind label; salon-edit services/staff use `catalogFits`/`brideAllowed`
  - [x] Mocks follow the server (clinic salon, clinic application with medical license, clinic catalog service + placement, type filters, audience change refusals)
- Tests: new tests/business-types.test.tsx (13); updated applications, catalog, catalog-approve, placements, salons, salonInsights, salon-actions, list-exports, alerts, contract, contract-ids, status, search, salonEdit; `vitest run` 120 files / 1397 tests green; `sh scripts/gate.sh` GATE OK
- Loops: 0/1
- Review: PENDING
- Notes: DEVIATIONS: browser check deferred to after ADM-110 (lead instruction: one check for both); reports/banners/campaigns/transactions have no `businessType` parameter in contract 1.12.0, so no type filter there (server gap); `getSalonsByIdProfile` still declares `gender` while the server sends `businessType` + `audience`: read with `.omit({ gender })` (server gap, reported); the catalog page and the salon audience dialog get their full per-type behaviour in ADM-110; contract re-sync also fixed the 3 `contract.test` failures noted in ADM-108 (branches list now sends page/pageSize).

## Last blocks

### ADM-108 — Cloudflare Pages deploy

- Branch: `feat/adm-108-cloudflare`
- Status: DONE
- Acceptance criteria: `write-hosting.ts --target cloudflare` writes the same `_headers`/`_redirects` (Cloudflare Pages reads them); `.node-version` 22; `docs/DEPLOY.md` has the Git settings (root directory, build command, output directory, variables) and a wrangler CLI deploy
- Tests: tests/hosting.test.ts (+1, 16 total) green; full suite 1374 pass; builds dev-release + prod-release and the Cloudflare `_headers` generation checked. DEVIATION: 3 tests in tests/contract.test.ts fail on `origin/admin` itself (the committed contract is behind the server spec; a resync changes the branches query and breaks 77 test files): not touched here, needs its own contract re-sync task.
- Loops: 1/1 (user decision)
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — config and docs only. DEVIATION: no e2e; the deploy itself needs the owner's Cloudflare login.

### ADM-107 — Adopt admin contract 1.7.0 (SRV-170) + end-to-end pass on the local real stack

- Branch: `feat/adm-107-contract-1-7`
- Status: IN REVIEW
- Acceptance criteria (SRV-170 admin contract 1.7.0; PRD A15 list/details; BUSINESS_DOMAIN §5.5 money views; design 06 "Staff" fact; operations getBookings, getBookingsById; owner request 2026-10-26 "e2e every feature until it works, collect blocks"):
  - [x] `npm run api:sync` → contract 1.7.0 (dto: staff `{id, name, firstName, photoUrl}` on rows/persons, `rejection` on list rows, `money.paidAtSalon`)
  - [x] Domain `BookingStaff`/`BookingReason`; `rejection` on `BookingSummary`; `money.remaining` documented as still owed (0 once final) + `paidAtSalon`; `uniqueStaff()` rule
  - [x] Bookings list: rejected rows show the reason (code worded AR/EN, free text) under the status (design list has no staff column, so none added)
  - [x] Booking details: Staff fact (photo or initials, each member once), per-person staff with photo, rejection/cancellation reason + time, "Still to pay at the salon" + "Paid at the salon"
  - [x] Mock follows the server semantics (REJECTED row with reason, remaining 0 when final, paidAtSalon on COMPLETED)
  - [x] e2e on the local real stack (`docs/E2E_RESULTS.md`): sign-in + OTP, 2-day session, 276-visit sweep (42 routes + details × AR/EN × light/dark × 1440/768/375), actions per module; admin defects fixed (F1–F5), server defects S1–S6 listed, blocks listed
- Tests: new tests/booking-contract-1-7.test.tsx (12), tests/branches-repository.test.ts (3), tests/drawer-height.test.ts (2), primitives Avatar fallback; bookings/branchFilters counts (4 mock rows), design-gaps lazy strings; `vitest run` 119 files / 1376 tests green; `sh scripts/gate.sh` GATE OK (dev-release entry back under 80 KB after the lazy bookings area)
- Browser check: real Chrome (Playwright) against dev-release → 127.0.0.1:4000 on :4174: final sweep 276 visits, 0 bad (no overflow, no error state, no sign-out), only console item = seeded staff photo 404 (S4); bookings list/details AR light 1440 + 375 screenshots compared with design 06 (Staff fact, money lines); actions in EN 1440 (status change, cancel as salon, reassign, refund, salon offline/online, branches, customer block/unblock, review approve/reject, catalog create with upload, settings save/revert, bell mark read, exports, audit)
- Loops: 1/1 — re-checked every criterion against the diff, the unit tests and the real server; the loop found the entry budget overflow (bookings strings made lazy), the reason-label test using the global i18n, and the e2e defects F1–F5 (all fixed with tests)
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — contract-driven types, pure rules in domain, presentation helpers small; lazy locale bundles per area (no page pulls another area's strings); no server code changed. DEVIATIONS: list rows show no staff column (not in PRD A15 list / design 06 list); `RemoteBranchesRepository.list` ignores the contract's `meta` (server omits it, S3); salon application approve/reject, refund success, CSV export and reassign save could not be completed on this stack (no pending application / server S1, S2 / no eligible staff); staff/admins-and-roles has no PRD page or endpoint; WebKit not run; no Playwright e2e spec added (user decision 2026-10-14: no e2e runs); not pushed (lead instruction).
