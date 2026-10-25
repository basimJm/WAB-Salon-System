# WAB-Admin-Dashboard — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next admin`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)

- Consumes all 116 `/admin/v1` operations through the generated contract (`npm run api:sync`); mock transport on fixtures in dev; realtime `/admin` namespace client done.
- Remote dev switch (ADM-079) waits for SRV-011; Phase 4C (ADM-068…077) BLOCKED on SRV-117…127 + SRV-110; ADM-002/005/006/082/083 PENDING owner hosting/CI; ADM-080 e2e waived by the owner.
- Gate: `sh scripts/gate.sh` + browser UI check before every commit; no GitHub CI.

## Current task

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

## Last blocks

### ADM-090 — Branch-aware salon editing (hours, closures, services, staff; move staff)

- Branch: `feat/adm-090-branch-editing` (from `feat/adm-089-salon-branches`)
- Status: IN REVIEW
- Acceptance criteria (BUSINESS_DOMAIN §3.3a, §5.16; operations getSalonsByIdHours/putSalonsByIdHours/…Preview/…Closures*/getSalonsByIdServices/postSalonsByIdServices/patchSalonsByIdServicesByServiceId with `?branchId=`, getSalonsByIdMembers `?branchId=`, postSalonsByIdMembersByMemberIdBranch):
  - [x] Salon edit page: a Branch picker (open branches, main first, default main) above the Hours and closures, Services and Staff tabs only; profile, gallery and policy stay salon-wide
  - [x] Every hours/closures/services call carries `?branchId=` of the picked branch (`BranchScope` in the salon-edit repository); no branch = the main branch
  - [x] Staff tab lists the members of the picked branch, skills from that branch's services; empty branch says "This branch has no staff yet"
  - [x] Move a member to another open branch (reason dialog; the hint says their services are cleared); member list and staff profile refresh
  - [x] Mock: hours/closures/services state per branch (main branch = salon default), members store with `?branchId=` filter and the move route (refuses a closed branch)
- Tests: tests/salonEdit-branches.test.tsx (4: query/params of every scoped call, picker visibility, services per branch, staff per branch + move) + existing salonEdit suite; `sh scripts/gate.sh` GATE OK
- Browser check (dev-debug from this worktree): salon edit → Staff in EN light 1280 px (picker Abdoun/Dabouq/Khalda, move Sara to Khalda → Abdoun empty, Khalda lists Sara + Lina, toast) and AR RTL dark 375 px (Hours tab picker → Khalda, Staff → Dabouq empty message, hint shown); no horizontal scroll, no new console messages
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — repository signatures moved from `salonId` to `BranchScope` for the branch-scoped methods (max-params 4 kept). DEVIATIONS: no e2e (user decision); the mock seeds every branch with the same starting menu/hours (the real server keeps each branch's own data); the admin PRD has no branch section yet.

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
