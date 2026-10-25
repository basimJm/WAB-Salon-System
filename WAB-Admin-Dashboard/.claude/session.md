# WAB-Admin-Dashboard — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next admin`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)

- Consumes all 116 `/admin/v1` operations through the generated contract (`npm run api:sync`); mock transport on fixtures in dev; realtime `/admin` namespace client done.
- Remote dev switch (ADM-079) checked against the real server (local stack + hosted dev wiring): gap list `docs/REMOTE_DEV_GAPS.md`; Phase 4C (ADM-068…077) BLOCKED on SRV-117…127 + SRV-110; ADM-002/005/006/082/083 PENDING owner hosting/CI; ADM-080 e2e waived by the owner.
- Gate: `sh scripts/gate.sh` + browser UI check before every commit; no GitHub CI.

## Current task

### ADM-079 — Switch to `remote` on dev (INT-05): per-module gap list and fixes, socket events verified against the real server

- Branch: `feat/adm-079-remote-dev` (from `origin/admin`)
- Status: IN REVIEW
- Acceptance criteria (task row; operations: all 116 admin GETs via `qa/contract-check.mjs`, getAlerts/postAlertsByIdAcknowledge, getExports*, getBookings*, postCatalogRequestsByIdApprove; realtime `/admin` namespace, BUSINESS_DOMAIN §7):
  - [x] Gap list per module in `docs/REMOTE_DEV_GAPS.md` (G1–G16: FIXED / SERVER / OPEN / OK) from the contract check, the socket check and a signed-in browser pass of `dev-release` on the local real stack (same server code as dev)
  - [x] Client fixes: contract re-synced (SRV-125/126, `requestedAt`); alert kind `SALON_DELETION_REQUEST` and export kinds `CUSTOMERS`/`SALONS` (AR+EN); `alertLink` reads the server's UPPER_SNAKE/camelCase subjects and sends applications to their page; mocks use the real shapes
  - [x] Realtime: event names match `WAB-Server/src/constants/{sockets,alerts}.ts`; received `booking.updated`, `application.created`, `overview.tick` live; handshake refusals measured (`active=false`): client now retries `UNAVAILABLE` with backoff and `UNAUTHORIZED` once the token changed, `FORBIDDEN` stops
  - [x] Hosted dev wiring: `.env.dev`/`.env.prod` resolve to the Render host in the bundle; `write-hosting.ts` now reads the variant `.env` file (CSP `connect-src` had only `'self'`); hosted health/ready 200, 401/404 envelopes, `/admin` websocket refuses no/malformed token with UNAUTHORIZED; CORS preflight has no allow-origin (S10)
  - [x] Server-side defects in `docs/SERVER_ISSUES.md` (S10 hosted CORS, S11 English alert titles, S12 entity type spelling); QA kit: `qa/socket-check.mjs`, `qa/hosted-check.mjs`, `QA_ADMIN_TOKEN`, fake providers in `qa/stack.sh`
- Tests: tests/socket-client.test.ts (+5: FORBIDDEN, UNAUTHORIZED token wait, UNAVAILABLE backoff, transport errors, backoff cap), tests/alerts.test.tsx (+2 + updated link), tests/exports.test.tsx (+1), tests/hosting.test.ts (+2); `sh scripts/gate.sh` GATE OK (1226+ tests)
- Browser check (dev-release built against the local stack, signed in as the QA admin): 36 screens in AR RTL light desktop, every request 200, no error alerts, console clean; alerts in EN LTR dark 375 px (links to /reviews and /salons/applications/:id, "Salon deletion request" filter, no horizontal overflow) and exports list
- Loops: 1/1 — re-ran the contract check and socket check after the fixes (66 OK, 2 BAD = S3 handled), re-checked each gap row against the code and the measured answers; found the CSP/env gap (G7) and the stale contract (G1) in this pass
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — fixes stay in data/domain/scripts, no contract hand edits, retry timers cleared on disconnect. DEVIATIONS: hosted checks are unauthenticated only (by instruction, no credentials to Render), so module flows were run on the local stack, not on Render; `alert.created`/`review.created`/`refund.updated` not received live (raised by the evaluate job / need a completed or paid booking; checked in the server code); G13–G15 (catalog map-to-existing, customers/salons export buttons, `requestedAt`) left OPEN for new backlog rows; no e2e (user decision); root `session.md` index line left to the lead.

## Last blocks

### ADM-092 — Branches QA (every branch screen, AR/EN, light/dark, phone/tablet/desktop)

- Branch: `feat/adm-092-branches-qa` (from `feat/adm-091-branch-filters`)
- Status: IN REVIEW
- Acceptance criteria (task row: every branch screen against the real server, AR/EN, light/dark, desktop/phone):
  - [x] Browser pass on the mock (dev-debug from this worktree) of 14 screens: Branches tab, salon edit Hours / Services / Staff, Members, Bookings (+ details), Reviews, Transactions, Refunds, Reconciliation (all with `?salon=Noor&branch=Khalda`), Settings, plus Live and Customers as layout controls — in AR RTL dark 375 px, EN LTR light 375 px, AR RTL light 768 px, EN LTR light + dark 1280/1440 px: horizontal page overflow, error states, untranslated keys
  - [x] Found and fixed: Reconciliation overflowed at 375 px (cards in `.wab-stack` grew to the table width) and Settings overflowed at 375 px in English (tab strip widened `.wab-settings`): both single-column grids now use `minmax(0, 1fr)` (tables and tab strips scroll inside); all screens clean afterwards
  - [x] Row menu stays inside the viewport on phone (RTL); add-branch drawer is full width on phone, 459 px on desktop; console: no errors in the final run
  - [x] Repeatable checks: tests/branches-qa.test.tsx (Arabic render + axe of the branches tab, salon-edit picker, bookings and reconciliation filters; CSS regression for the two grids)
- Tests: tests/branches-qa.test.tsx (5); full suite; `sh scripts/gate.sh` GATE OK
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — CSS fix is global but only constrains single-column grids to the page width. DEVIATIONS: NOT run against the real server (no WAB-Server reachable from this sandbox: local ports are blocked and the dev server on Render was not used), so this is a mock QA; the owner should repeat the pass on a server with `seed:demo` (Lamar Beauty Lounge, 3 branches). No e2e (user decision). The browser pane was hidden, so checks are JS measurements, not screenshots. Earlier console 404s came from chunks replaced by rebuilds while the tab was open (lazyPage reload), not from the app.

### ADM-091 — Branch filter and column across bookings, reviews, members, money and exports

- Branch: `feat/adm-091-branch-filters` (from `feat/adm-090-branch-editing`)
- Status: IN REVIEW
- Acceptance criteria (BUSINESS_DOMAIN §3.3a; operations getBookings/getBookingsById `branch`, getReviews `branchId`+`branch`, getSalonsByIdMembers `branchId`, getTransactions/getRefunds/getFinanceReconciliation `salonId`+`branchId`, postExports TRANSACTIONS/BOOKINGS `branchId`):
  - [x] Shared `SalonBranchFilters` (salon combobox → branch select of that salon; changing the salon clears the branch; both written in one URL change via the new `setFilters`) on bookings, reviews, transactions, refunds and reconciliation; a branch is only sent together with its salon
  - [x] Branch column: bookings (server name), reviews and customer reviews (`{ar,en}` in the admin's language), transactions / refunds / reconciliation (name looked up from the branch list of each salon on the page), salon members (owner = "All branches (owner)") with a branch filter on the members tab
  - [x] Booking details show the branch with its address
  - [x] Exports: BOOKINGS and TRANSACTIONS jobs carry `branchId`; the export body no longer uses the generated union whose id pattern refused every real salon/branch id (ids checked with OBJECT_ID instead)
  - [x] Mock: `branchId` filtering on bookings, reviews, transactions, refunds, reconciliation; money fixtures belong to Noor Salon so branch names resolve
- Tests: tests/branchFilters.test.tsx (7 screens), tests/branchQueries.test.ts (3: query mapping, export ids); full suite; `sh scripts/gate.sh` GATE OK
- Browser check (dev-debug from this worktree): bookings, transactions, refunds, reconciliation and reviews with `?salon=Noor&branch=Khalda` and booking details, AR RTL dark 375 px and EN LTR light 1280 px (bookings, refunds, salon members); one row each with the Khalda column, labels Salon/Branch, no horizontal scroll, console clean
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — filters live in a shared presentation component + hooks (`useBranchOptions`, `useBranchNames`), no feature imports another. DEVIATIONS: no e2e (user decision); the salon picker lists the first 100 salons (no server-side typeahead endpoint for options); reviews have no separate detail page, so the branch is a column of the list (and of the customer's reviews tab); booking branch names come localized by the server (the mock answers in English); "ledger" = the reconciliation screen (the admin has no ledger list endpoint).

### DOCS — ADM-079 DONE; gap rows ADM-093…095 + SRV-150
- Branch: `docs/adm-079-done-gap-rows`
- Status: DONE
- Acceptance criteria:
  - [x] ADM-079 DONE (PR #449); open gaps G13–G15 become ADM-093 (catalog map to existing), ADM-094 (customers/salons exports), ADM-095 (booking `requestedAt`); server issues S11/S12 become SRV-150
  - [x] `tasks.py check` OK (only the known CUS-047 note); board regenerated
- Tests: `python3 scripts/tasks.py check`
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — backlog only, no code.
