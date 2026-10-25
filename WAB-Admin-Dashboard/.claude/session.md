# WAB-Admin-Dashboard — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next admin`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)

- Consumes all 116 `/admin/v1` operations through the generated contract (`npm run api:sync`); mock transport on fixtures in dev; realtime `/admin` namespace client done.
- Remote dev switch (ADM-079) waits for SRV-011; Phase 4C (ADM-068…077) BLOCKED on SRV-117…127 + SRV-110; ADM-002/005/006/082/083 PENDING owner hosting/CI; ADM-080 e2e waived by the owner.
- Gate: `sh scripts/gate.sh` + browser UI check before every commit; no GitHub CI.

## Current task

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

## Last blocks

### ADM-086 — a new deploy no longer breaks open tabs

- Branch: `feat/adm-086-chunk-reload`
- Status: DONE
- Acceptance criteria: route pages load through lazyPage(): when a page's code file is gone (a new deploy replaced the hashed files) the tab reloads once (not again within 10 s) and lands on the sign-in page with the destination kept; any other route error shows the panel's error state with a retry instead of the router's crash screen
- Tests: tests/lazyPage.test.tsx (6), tests/routeError.test.tsx (1); full suite + gate PASS; browser check: built twice with a changed About chunk while a tab was open: the tab reloaded once and showed /login?next=/about
- Loops: 1/1 (user decision)
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — DEVIATION: no e2e (user decision); browser UI check deferred to the end of the batch. DEVIATION: the reload signs the admin out (tokens live in memory only): accepted instead of a broken screen.

### ADM-087 — Render base URLs and fast deploy guide

- Branch: `feat/adm-087-onrender-urls`
- Status: DONE
- Acceptance criteria: .env.dev and .env.prod name https://wab-server-dev.onrender.com for the API and the socket; docs/DEPLOY.md has the Netlify CLI deploy commands
- Tests: tests/envFiles, hosting, config (33) green; server health 200 checked; gate not rerun (values and docs only)
- Loops: 1/1 (user decision)
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — DEVIATION: no e2e (user decision); browser UI check deferred to the end of the batch. DEVIATION: full gate not rerun for a values-and-docs change; the server answers 200 on /health but does not yet allow a Netlify origin in CORS.
