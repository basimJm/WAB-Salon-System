# WAB-Admin-Dashboard — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next admin`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)

- Consumes all 116 `/admin/v1` operations through the generated contract (`npm run api:sync`); mock transport on fixtures in dev; realtime `/admin` namespace client done.
- Remote dev switch (ADM-079) checked against the real server (local stack + hosted dev wiring): gap list `docs/REMOTE_DEV_GAPS.md`; Phase 4C (ADM-068…077) BLOCKED on SRV-117…127 + SRV-110; ADM-002/005/006/082/083 PENDING owner hosting/CI; ADM-080 e2e waived by the owner.
- Gate: `sh scripts/gate.sh` + browser UI check before every commit; no GitHub CI.

## Current task

### ADM-097 — Session lasts 2 days (client idle sign-out, proactive refresh, reload keeps the session)

- Branch: `feat/adm-097-session-two-days`
- Status: IN REVIEW
- Acceptance criteria (owner 2026-10-26 "make session time out after 2 days"; PRD §4 session; BUSINESS_DOMAIN `admin.sessionIdleSec` (server default 1800 → 172800 in parallel); operations postAuthRefresh/postAuthLogout):
  - [x] Client idle sign-out = 2 days (`SESSION_IDLE_DAYS`/`SESSION_IDLE_MS` in `constants/session.ts`), never shorter than the server; warning dialog still 60 s before; login brand note and "signed out after inactivity" notice read the constant (`{{days}}`, AR+EN)
  - [x] Proactive refresh: `useProactiveRefresh` (AppShell) refreshes the access token `REFRESH_SKEW_MS` before expiry without waiting for a request, and at once when the tab returns to the foreground; pure `refreshDelay()` in `domain/auth/sessionRules.ts`
  - [x] Reload keeps the session: the store mirrors the session to this tab's `sessionStorage` (`infrastructure/storage/tabStorage.ts`, key `STORAGE_KEYS.session`), validated with zod on start; malformed / refresh-expired values are dropped; sign-out and expiry remove it; never `localStorage` (CLAUDE.md §5 + README updated)
  - [x] Mock: refresh tokens carry the admin email so they still work after a reload (single use, revoked on logout); mock refresh TTL = 2 days
  - [x] Settings screen accepts 172800 for `admin.sessionIdleSec` (bound 60…2592000 s, was 86400); mock default 172800
  - [x] Gate fallout fixed: contract re-synced (`npm run api:sync`) and `OTP_DELIVERY_FAILED` added to the error catalog + AR/EN messages (BUSINESS_DOMAIN §11 already had it; the gate was red on `origin/admin`)
- Tests: new tests/session-persistence.test.tsx (store persistence + reload, expired/malformed values, tabStorage never throws and never touches localStorage, mock token across instances, refreshDelay table, useProactiveRefresh timer/visibility/unmount, setting bound + mock default); tests/idle.test.tsx (2-day default test; mechanics on an explicit 30-min window), tests/login-page.test.tsx text; `sh scripts/gate.sh` GATE OK
- Browser check: dev-debug mock (preview :4192, AR RTL): login brand note "انتهاء الجلسة بعد ٢ يوم من الخمول"; signed in → sessionStorage holds the session (localStorage empty), refresh TTL 48 h; full navigation to /bookings stays signed in; access token forced expired + reload → refreshed (new expiry +15 min), list loads. Real local stack (dev-release remote → 127.0.0.1:4000, preview :4174, QA admin): sign-in, access forced expired + reload → refresh token rotated on the server, /bookings 25 rows, no alerts; sign-out clears the stored session; console clean
- Loops: 1/1 — re-checked every criterion against the diff, the tests and both browser runs; found the settings bound (86400) that would have refused the owner's 172800 and the stale "30 minutes" notice text
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — session stays in the app layer (store + persistence adapter), pure rule in domain, hook in presentation; no new dependency. DEVIATIONS: idle length is a 2-day client constant, not read from the server setting (the server enforces its own value through refresh-token expiry; a shorter server value ends the session at the next refresh); persistence is per tab (sessionStorage), so closing the tab or opening a new tab needs a new sign-in, and a duplicated tab shares one refresh token (the first refresh in either tab can revoke the family on the server); the local stack still runs `admin.sessionIdleSec` = 1800 (refresh TTL 30 min seen), so the 2-day server lifetime was not observed end to end; contract/error-catalog fix is outside the task row; no e2e (user decision).

## Last blocks

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
