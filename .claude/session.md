# WAB — Session Log

> Every task gets a block (template in `.claude/hooks.md` §3). Keep only the current and last few sessions here; move durable knowledge to `memory.md` and delete stale blocks.

## Current Session

- Started: 2026-10-12
- Goal: Set up repo-wide rules, roles, hooks, session and memory for Claude Code.

### Open / In Progress

- (none)

### Completed

> Older task blocks: `docs/history/session-archive.md` (not auto-loaded). Keep only the last 3 task blocks here.

### T-070 — Merge ADM-033 into `admin`

- Project: `WAB-Admin-Dashboard/`
- Branch: `admin`
- Status: DONE (PR #166 merged into `admin`; no new code on this branch)
- Acceptance criteria:
  - [x] ADM-033 (T-069) passed the local gate before the merge (`sh scripts/gate.sh` all PASS) and the browser check; local `admin` is on `origin/admin` with no uncommitted changes
- Tests: see T-069; nothing changed since
- Loops: 1/1 (user decision)
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — review recorded in T-069; this block only covers the merge on the master branch. DEVIATION: no e2e (user decision).
- Notes: Next: ADM-034 on `feat/adm-034-app-config` from `origin/admin`.

### T-071 — ADM-034 App versions and maintenance mode

- Project: `WAB-Admin-Dashboard/` (`domain/appconfig`, `data/appconfig`, `presentation/appconfig/*`, shared `data/api/resource.ts`, `domain/shared/resource.ts`, `hooks/useResourcePanel.ts`, mock `appConfigRoutes`/`mockCollection`, locales)
- Branch: `feat/adm-034-app-config`
- Status: DONE
- Acceptance criteria (Admin Tasks ADM-034; PRD A28 app versions, maintenance):
  - [x] App versions per app (customer/salon) and platform (Android/iOS): latest, minimum supported (force update), optional-update flag, https store link; filters; create (app and platform fixed afterwards) and edit with mandatory reason; rules: well-formed dotted versions, minimum not above latest, https link
  - [x] Maintenance per app: on/off, message in Arabic and English (required, 500 max), reason; AR+EN; list state in the URL
  - [x] Nav: Settings gets "App versions" and "Maintenance"; refactor: locations and app config share one resource helper, panel hook and mock collection
- Tests: `sh scripts/gate.sh` all PASS (15 new tests incl. version rules and both pages through the mock stack); browser check dev-debug: both pages load their rows, no horizontal scroll
- Loops: 1/1 (user decision)
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — DEVIATION: no e2e (user decision). The server has no delete for these records; records are edited in place.
- Notes: contains the T-070 merge note for ADM-033.

### Pending (next)

- T-003 — Per-project rules for the remaining folders (customer, merchant, admin, packages) — awaiting user input.
- SRV-026 — next server task after T-036 is merged (see `WAB-Server/docs/WAB_Server_Tasks.md`).
- INT-01 — Contracts v1 (`contracts/`) — first task of the roadmap.
