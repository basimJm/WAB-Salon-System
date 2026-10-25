# WAB-Admin-Dashboard — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next admin`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)

- Consumes all 116 `/admin/v1` operations through the generated contract (`npm run api:sync`); mock transport on fixtures in dev; realtime `/admin` namespace client done.
- Remote dev switch (ADM-079) checked against the real server (local stack + hosted dev wiring): gap list `docs/REMOTE_DEV_GAPS.md`; Phase 4C (ADM-068…077) BLOCKED on SRV-117…127 + SRV-110; ADM-002/005/006/082/083 PENDING owner hosting/CI; ADM-080 e2e waived by the owner.
- Gate: `sh scripts/gate.sh` + browser UI check before every commit; no GitHub CI.

## Current task

### ADM-096 — Re-sync the admin contract 1.5.0 after SRV-150/151; drop the S6 id workarounds; alert titles; branch status messages

- Branch: `feat/adm-096-contract-sync` (from `origin/admin`)
- Status: IN REVIEW
- Acceptance criteria (task row; SRV-150 alerts `titles {ar,en}` + `entityType` enum, SRV-151 id patterns `^[a-fA-F0-9]{24}$` + branch status messages; operations: every admin operation with an id field, getAlerts/postAlertsByIdAcknowledge, postSalonsByIdBranchesByBranchId{Main,Close,...}):
  - [x] `npm run api:sync` (contract 1.3.0 → 1.5.0); typecheck/test fallout fixed (mock alerts now send `titles` + enum subject)
  - [x] S6 workarounds removed everywhere the generated schema is now correct: `data/api/objectId.ts` deleted; bookings, catalog approve, customers (list + patch), exports (generated per-kind union), branches create/update, transactions + reconciliation, locations areas, reviews (list + bulk), refunds, salons (list + members), salon edit (profile, gallery order, hours/closures/services query + body, member branch, staff), audit, recommended, payouts, campaigns, and the mocks; branch-aware endpoints use `optionalQuery(dto.<op>QuerySchema)` (`data/api/endpoint.ts`)
  - [x] Alerts: `alertTitle(alert, language)` = `titles[language]`, fallback `title`; the list uses it (no socket toast shows titles; realtime only invalidates queries); repository tolerates servers before 1.4.0 (`titles` optional, `entityType` string, `alertLink` keeps normalizing)
  - [x] Branch status refusals: the panel already shows the server `message` in the branches-tab `InlineAlert`; mock now answers `INVALID_TRANSITION` with the server's branch wording (AR+EN, `MockBusinessError` messageKey)
  - [x] `docs/SERVER_ISSUES.md` S6 (SRV-151), S11/S12 (SRV-150) FIXED; `docs/REMOTE_DEV_GAPS.md` G10 FIXED, G13/G14 wording, G17 added
- Tests: new tests/contract-ids.test.ts (snapshot has only `^[a-fA-F0-9]{24}$`; 32 former override sites accept lower/upper-case real ids and refuse malformed; optionalQuery; no `{24}` left in `src/data`; export + reconciliation through the repositories), tests/alert-titles.test.tsx (4), tests/branch-status-messages.test.tsx (3); catalog-approve / branchesContract / locations tests moved to the generated schemas; `vitest run` 110 files, 1285 tests green; `sh scripts/gate.sh` GATE OK
- Browser check (dev-release built against the local real stack, preview :4174, QA admin, AR RTL; the stack still runs the OLD server build, before SRV-150/151): with real ids `bookings?salon=`, `transactions?salon=`, `reviews?salon=`, `refunds?salon=`, reconciliation, salon details, salon edit hours (no branch query = main) + "check affected bookings" preview (POST with optional query) + services, catalog requests, payouts, recommended, audit: every screen loads with no error alert; a malformed id (`undefined`) is refused client-side with the validation alert; alerts list 20 rows, links to /catalog/requests, /salons/applications/:id, /salons/:id (old-server titles are English: fallback works), 1280 px dark and 375 px light, no horizontal page scroll; console: only the 400s of my own `/salons/undefined` probes and one 401 from an unauthenticated manual fetch
- Loops: 1/1 — re-checked every criterion against the diff, the tests and the old real stack; the new "no `{24}` in data" test found four sites the task row did not name (audit, recommended, payouts, campaigns) and they were moved too
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — generated schemas only (one guarded cast for the export body: the screens build `params` as a record, the generated union validates them before the request); tolerances for pre-1.4.0 alert answers are documented in the repository. DEVIATIONS: the new Arabic alert titles and the branch status messages could not be seen on a real server (local stack runs the pre-SRV-150 build; covered by mock + unit tests); branch-filtered real calls not exercised (Noor has one branch on the stack); EN language not switched in the real-stack pass (EN covered by tests); domain-level form checks in `banners.ts` / `campaigns.ts` keep their own case-insensitive id regex (user input validation, not an S6 workaround); no e2e (user decision).

## Last blocks

### ADM-095 — Booking list/detail show the request time `requestedAt` (12-hour, Asia/Amman)

- Branch: `feat/adm-095-booking-requested-at` (from `origin/admin`)
- Status: IN REVIEW
- Acceptance criteria (PRD A15 list "created at" + details; design `06 Bookings` has a 100 px "Created" column; gap G15; operations getBookings / getBookingsById `requestedAt`):
  - [x] `BookingSummary.requestedAt` (domain) read from the contract (list and details DTOs both carry it; the mock already sends it)
  - [x] Bookings list: "Requested" / "وقت الطلب" column after Total (the PRD and the design both list the creation time, so the list has room), `formatInstant(…, 'dateTime')` = Asia/Amman, 12-hour, language digits
  - [x] Booking details: "Requested" row between the appointment and the salon's answer deadline
  - [x] G15 FIXED in `docs/REMOTE_DEV_GAPS.md`
- Tests: tests/booking-requested-at.test.tsx (3: 21:30 UTC → "25 Oct 2026, 12:30 am" Amman day change, list column in EN, details row in AR); bookings tests unchanged green; `sh scripts/gate.sh` GATE OK (the first gate run had one test failing under machine load while other agents ran builds; a full `vitest run` then showed timeouts in the a11y/app/layers files, each passed alone, and the second gate run was green)
- Browser check (dev-release against the local real stack, preview :4174, QA admin): EN LTR dark 1280 px bookings list: "Requested" is the last column (e.g. WAB-BW1JEZ appointment 27 Sept 9:30 am, requested 25 Sept 6:30 pm); AR RTL light 375 px list + details: "وقت الطلب = ٢٥ أيلول ٢٠٢٦، ٦:٣٠ م" for server `requestedAt` 2026-09-25T15:30:00Z (= 18:30 Amman), no horizontal page scroll, console clean
- Loops: 1/1 — re-checked the shown values against the raw server answer (UTC → Amman) and each criterion against the tests
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — one domain field, one column, one detail row, existing date utility. DEVIATIONS: the bookings table already scrolled inside its wrapper at 1280 px (128 px minimum per column, 1008 px wrapper); the new column adds 128 px to that inner scroll (page itself does not scroll); no e2e (user decision).

### ADM-094 — Export menu on the customers and salons lists (export kinds `CUSTOMERS`, `SALONS`, SRV-126)

- Branch: `feat/adm-094-list-exports` (from `origin/admin`)
- Status: IN REVIEW
- Acceptance criteria (PRD §2 "export at any time" + A12 customers / A13 salons; gap G14; operation postExports kinds CUSTOMERS `{status?, gender?, cityId?, q?}` and SALONS `{state?, gender?, cityId?, subscription?, q?}`, getExportsById):
  - [x] Customers list header has the shared `ExportMenu` (Excel / CSV / PDF, same toasts and polling as bookings/transactions through `useExportRunner`) exporting `CUSTOMERS` with the list's status, gender, city and search
  - [x] Salons list header has the same menu exporting `SALONS` with state, gender, city, subscription and search; the recommended / deletion switches have no export parameter and are left out
  - [x] Pure mappers: `customerQueryOf` + `customerExportParams` (new `presentation/customers/customerFilters.ts`, the page now uses it), `salonExportParams` next to `salonQueryOf`; paging never reaches the export
  - [x] Export body: `cityId` re-checked with OBJECT_ID (the generated pattern refuses real ids, S6); G14 FIXED in `docs/REMOTE_DEV_GAPS.md`
- Tests: tests/list-exports.test.tsx (5: both mappers incl. unknown values and dropped switches, real vs malformed city id, both menus send the right kind + params and open the link); `sh scripts/gate.sh` GATE OK
- Browser check (dev-release against the local real stack, preview :4174, QA admin): AR RTL light 375 px customers `?status=ACTIVE`: "تصدير" menu with three formats, Excel → server job `CUSTOMERS {status: ACTIVE}` DONE, 25 rows, signed download link opened; EN LTR dark 1280 px salons `?state=LIVE&gender=FEMALE`: Export at the header end, Excel → `SALONS {state, gender}` DONE and opened; CSV → job FAILED `GENERATION_FAILED` on the server (known S5: CSV/PDF fail on the real S3 storage) and the menu shows its failure toast; no horizontal page scroll; console clean
- Loops: 1/1 — re-checked every criterion against the contract params, the tests and the real job answers
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — reuses ExportMenu/useExportRunner, no contract hand edit, customers page query logic moved to a tested pure function. DEVIATIONS: salons export ignores the recommended / deletion-request switches (server has no such params); CSV/PDF fail on the real stack because of S5 (server); a city filter was not exercised against the real server (schema covered by unit test); no e2e (user decision).
