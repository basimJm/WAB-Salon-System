# WAB-Admin-Dashboard — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next admin`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)

- Consumes all 116 `/admin/v1` operations through the generated contract (`npm run api:sync`); mock transport on fixtures in dev; realtime `/admin` namespace client done.
- Remote dev switch (ADM-079) waits for SRV-011; Phase 4C (ADM-068…077) BLOCKED on SRV-117…127 + SRV-110; ADM-002/005/006/082/083 PENDING owner hosting/CI; ADM-080 e2e waived by the owner.
- Gate: `sh scripts/gate.sh` + browser UI check before every commit; no GitHub CI.

## Current task

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

## Last blocks

### ADM-088 — Re-sync the contract with salon branches

- Branch: `feat/adm-088-branches-contract`
- Status: IN REVIEW
- Acceptance criteria (BUSINESS_DOMAIN §3.3a, §5.16, §10 `salon.maxBranches`, §11 branch codes; WAB-Server Integration "Salon branches contract"):
  - [x] `npm run api:sync` (164 operations; 8 branch operations + member move; `branchId` fields/filters); Appendix A rows for the 9 new operations (ADM-089/090); `docs/API_CONSUMED.md` regenerated
  - [x] Error codes BRANCH_NOT_FOUND, BRANCH_NOT_BOOKABLE, BRANCH_REQUIRED, BRANCH_LIMIT_REACHED, BRANCH_HAS_UPCOMING_BOOKINGS, LAST_BRANCH, BRANCH_SCOPE_DENIED in the catalog + AR/EN messages
  - [x] Setting `salon.maxBranches` (default 20, 1–200) in a "Salon branches" group of the Settings security tab, AR/EN labels
  - [x] Endpoints whose contract gained a query (`?branchId=` on hours/closures/services/members, `?salonId=&branchId=` on reconciliation) use `branchQuerySchema`/`salonBranchQuerySchema` (OBJECT_ID override of the server's broken id pattern; optional, so nothing changes for current callers)
  - [x] Mock: shared `branchesFixture.ts` (Noor: Abdoun main, Khalda, Dabouq offline + incomplete; one main branch for the others); salon detail `branches[]`, members `branchId`, bookings/reviews `branch`, transactions/refunds `branchId`
- Tests: tests/branchesContract.test.ts (6) + fixtures/settings/errorCatalog/i18n suites; `sh scripts/gate.sh` GATE OK (verify, 4 builds, check:size)
- Browser check: built dev-debug served from this worktree (own terminal tab, port 4191), Settings → Accounts and security shows "Salon branches / Most branches per salon, default 20" in AR RTL dark + EN LTR light, 1280 px and 375 px, no horizontal scroll, console empty
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — contract re-sync + mock data, no screen logic yet. DEVIATION: no e2e (user decision); the 9 new operations sit in `tests/fixtures.test.ts` WITHOUT_FIXTURE until ADM-089/090 build them; the admin PRD has no branch section yet (T-133), so BUSINESS_DOMAIN is the source.

### ADM-089 — Salon detail → Branches tab (full CRUD)

- Branch: `feat/adm-089-salon-branches` (from `feat/adm-088-branches-contract`)
- Status: IN REVIEW
- Acceptance criteria (BUSINESS_DOMAIN §3.3a, §5.16; operations getSalonsByIdBranches, postSalonsByIdBranches, patchSalonsByIdBranchesByBranchId, postSalonsByIdBranchesByBranchId{Main,Offline,Online,Close}):
  - [x] Branches tab on the salon page: main first, closed last; name + Main badge, status (+ offline reason), readiness (complete / missing parts), area, staff count (members by `branchId`), phone; "N open of max" from `salon.maxBranches`, Add disabled at the limit
  - [x] Create / edit drawer: names AR/EN, city → area, address, latitude/longitude with an "Open on the map" link, phone, optional WhatsApp; field validation (E.164, 1–60, 1–300, coordinates), only changed fields sent, "Nothing changed" guard, reason required
  - [x] Row menu: make main (active non-main only), take offline (reason shown to the owner) / bring online, close (non-main only); every action asks a reason; closed branches are read-only
  - [x] A refused close (409 BRANCH_HAS_UPCOMING_BOOKINGS) opens a dialog listing the blocking bookings with links; other refusals (LAST_BRANCH, INVALID_TRANSITION, BRANCH_LIMIT_REACHED, …) show the localized message above the table
  - [x] Mock server: shared branch store (salon detail + branch routes), server refusals via `MockBusinessError` (limit, last branch, main branch, upcoming bookings, not found)
- Tests: tests/domain/branches.test.ts (11), tests/salon-branches.test.tsx (11, incl. axe and the mock rules); `sh scripts/gate.sh` GATE OK (one earlier run had 2 timeouts in unrelated suites under machine load; the rerun was green)
- Browser check (dev-debug from this worktree, port 4191): Noor Salon → Branches in AR RTL dark at 375 px (list, add-drawer validation messages, drawer 375 px wide, close Khalda → blocked dialog with booking link) and EN LTR light at 1280 px (close Dabouq → Closed, read-only row); no horizontal scroll; console: only the app logger's expected `http.failed` warning for the 409
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — branch types/rules in `domain/shared/branches.ts` (shared kernel: salons, salon editing, bookings and finance all need them), repo `repositories.branches`. DEVIATIONS: no e2e (user decision); "location on map" is coordinates + a link to open them in a map, not an embedded map picker (no map library/tiles in the panel; adding one is an owner decision); missing parts show the server codes (same as the salon completeness list); the admin PRD has no branch section yet (BUSINESS_DOMAIN is the source).
