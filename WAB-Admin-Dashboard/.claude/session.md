# WAB-Admin-Dashboard — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next admin`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)

- Consumes all 116 `/admin/v1` operations through the generated contract (`npm run api:sync`); mock transport on fixtures in dev; realtime `/admin` namespace client done.
- Remote dev switch (ADM-079) checked against the real server (local stack + hosted dev wiring): gap list `docs/REMOTE_DEV_GAPS.md`; Phase 4C (ADM-068…077) BLOCKED on SRV-117…127 + SRV-110; ADM-002/005/006/082/083 PENDING owner hosting/CI; ADM-080 e2e waived by the owner.
- Gate: `sh scripts/gate.sh` + browser UI check before every commit; no GitHub CI.

## Current task

### ADM-110 — Catalog per business type + salon audience dialog (widen/narrow, conflict list)

- Branch: `feat/adm-110-catalog-types`
- Status: IN REVIEW
- Acceptance criteria (BUSINESS_DOMAIN §5.19, §5.12, §5.13; INTEGRATION §5a; SRV-178; operations getCatalogServices, postCatalogServices, patchCatalogServicesById, postCatalogRequestsByIdApprove, getRecommended, putRecommendedReorder, patchSalonsByIdAudience):
  - [x] Catalog managed per type: Salons / Clinics switch (salons first), salon services filtered by audience (All / Women / Men / Men & women), clinic services have no audience filter; type + audience badges per row
  - [x] Create: type + audience fields (`BusinessKindFields`), CLINIC fixed to BOTH (disabled + hint), defaults from the current type/audience filter; edit: type and audience read-only (the server's patch takes neither)
  - [x] Approve a request by mapping: only active services that fit the salon (`catalogFits`, same rule as the server)
  - [x] Placements per type (Recommended salons / Recommended clinics), reorder per type, salon picker of the same type (built in ADM-109, kept)
  - [x] Salon audience drawer (`AudienceDrawer`) replaces the old gender change: SALON only (no button for a clinic), current audience shown, only other audiences offered, widening vs narrowing explained, mandatory reason; 409 SCHEDULE_CONFLICT → conflict list (booking links with reference + time, first 10, then a count); other errors inline; strings are a lazy locale area (`salonAudience`)
  - [x] Mock: narrowing with open bookings → 409 with booking ids, clinic → 422 AUDIENCE_CHANGE_NOT_ALLOWED, same audience → 422
- Tests: new tests/salon-audience.test.tsx (6), tests/catalog.test.tsx (catalogKindOf + per-type page + create defaults); `vitest run` 121 files / 1404 tests green; `sh scripts/gate.sh` GATE OK (dev-release entry back under 80 KB after the lazy `salonAudience` area)
- Browser check (both tasks, mock dev-debug build, vite preview :4197, real Chrome via Playwright): 14 screens (salons all/clinics, applications list + clinic review, catalog salons/clinics, catalog requests, bookings all/clinics + details, reviews, recommended, salon details Noor + Glow Clinic) × AR/EN × light/dark × 1440/768/375 = 168 visits: 0 horizontal overflow, 0 error states, 0 sign-outs; type badges counted per page (salons 4, clinics 1, applications 3, bookings 4, recommended 3); actions in EN light 1440 and AR dark 375: clinic has no audience button, narrowing Noor → 409 with 2 booking links (drawer no overflow), widening Royal → saved, new clinic service = CLINIC/BOTH with audience disabled, bookings All → Clinics 4 → 0 rows with `type=CLINIC` in the URL, clinic application shows the medical license heading; console: only the app logger's `http.failed` warning for the expected 409; screenshots AR light 1440 salons/catalog/clinic application, EN dark 375 catalog, conflict drawer (EN 1440, AR 375) checked by eye; the loop fixed unlocalised digits and unstyled links in the conflict list
- Loops: 1/1 — re-checked every criterion against the diff, the tests and the browser run; found and fixed: dev-release entry 80.2 KB > 80 (drawer strings moved to the lazy `salonAudience` area), conflict-list digits not localised and links unstyled (now `formatNumber` + `Link`), catalog subtitle still salon-only
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — rules shared with the server (`catalogFits`, widening, clinic = BOTH) live in the domain kernel; drawer, conflict list and catalog filters are small single-purpose components; server-side filters only; contract-driven types
- Notes: DEVIATIONS: no e2e (user decision 2026-10-14); WebKit not run; not pushed (lead instruction); placements have no audience filter (the order is per type; a filtered reorder would send a partial list)

## Last blocks

### ADM-109 — Business types: contract 1.12.0 re-sync + type filters + badges + medical license

- Branch: `feat/adm-109-business-types`
- Status: IN REVIEW
- Acceptance criteria (BUSINESS_DOMAIN §2, §3.3, §5.13, §5.19, §12.10; INTEGRATION §5a; SRV-174…178; operations getSalons, getSalonsById, patchSalonsByIdAudience, getSalonsApplications(+ById), getBookings(+ById), getReviews, getRecommended, putRecommendedReorder, getCatalogServices, postCatalogServices, getCatalogRequests, postExports, getSearch, getAlerts):
  - [x] `npm run api:sync` → admin contract 1.12.0 (`gender` → `businessType` + `audience`, `/gender` → `/audience`, type filters, `medicalLicenseUrls`, alert kind `SALON_AUDIENCE_WIDENED`, 3 new error codes, branches list paged)
  - [x] Domain kernel `domain/shared/businessType.ts` (enums, `audiencesFor`, `audienceFor`, `isWidening`, `canChangeAudience`, `catalogFits` = server rule, `brideAllowed`, `PersonGender` for customers/campaigns); `gender` gone from salons, applications, catalog, placements, bookings (snapshots + person gender), search
  - [x] All / Salons / Clinics switch (`BusinessTypeFilter`, URL key `type`) on salons (+ audience filter, export), applications, bookings (+ export), reviews, catalog services, catalog requests; placements per type (Recommended salons / clinics, reorder per type); server-side params only
  - [x] Type + audience badges (`BusinessBadges`, status registry kinds `businessType`/`audience`) on salon rows/details, applications rows/review, booking rows/details, catalog rows, placements rows
  - [x] Application review: trade license + medical license documents (signed URLs); a clinic without one is flagged
  - [x] Error codes `BUSINESS_TYPE_MISMATCH`, `AUDIENCE_CHANGE_NOT_ALLOWED`, `BRIDE_NOT_ALLOWED` (AR + EN); alert kind label; salon-edit services/staff use `catalogFits`/`brideAllowed`
  - [x] Mocks follow the server (clinic salon, clinic application with medical license, clinic catalog service + placement, type filters, audience change refusals)
- Tests: new tests/business-types.test.tsx (13); updated applications, catalog, catalog-approve, placements, salons, salonInsights, salon-actions, list-exports, alerts, contract, contract-ids, status, search, salonEdit; `vitest run` 120 files / 1397 tests green; `sh scripts/gate.sh` GATE OK
- Browser check: done once for both tasks after ADM-110 (see the ADM-110 block)
- Loops: 1/1 — re-checked every criterion against the diff, the tests and the shared browser run (filters on every listed screen send `businessType`, badges on rows/details, medical license on the clinic review)
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — one kernel module for type/audience rules, one filter component + URL key for every list, status registry for badge tones, tolerant read only where the contract is wrong (salon-edit profile)
- Notes: DEVIATIONS: browser check run after ADM-110, not before this commit (lead instruction: one check for both); reports/banners/campaigns/transactions have no `businessType` parameter in contract 1.12.0, so no type filter there (server gap); `getSalonsByIdProfile` still declares `gender` while the server sends `businessType` + `audience`: read with `.omit({ gender })` (server gap, reported); the catalog page and the salon audience dialog get their full per-type behaviour in ADM-110; contract re-sync also fixed the 3 `contract.test` failures noted in ADM-108 (branches list now sends page/pageSize).

### ADM-108 — Cloudflare Pages deploy

- Branch: `feat/adm-108-cloudflare`
- Status: DONE
- Acceptance criteria: `write-hosting.ts --target cloudflare` writes the same `_headers`/`_redirects` (Cloudflare Pages reads them); `.node-version` 22; `docs/DEPLOY.md` has the Git settings (root directory, build command, output directory, variables) and a wrangler CLI deploy
- Tests: tests/hosting.test.ts (+1, 16 total) green; full suite 1374 pass; builds dev-release + prod-release and the Cloudflare `_headers` generation checked. DEVIATION: 3 tests in tests/contract.test.ts fail on `origin/admin` itself (the committed contract is behind the server spec; a resync changes the branches query and breaks 77 test files): not touched here, needs its own contract re-sync task.
- Loops: 1/1 (user decision)
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — config and docs only. DEVIATION: no e2e; the deploy itself needs the owner's Cloudflare login.
