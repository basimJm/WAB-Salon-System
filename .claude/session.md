# WAB — Session Log

> Every task gets a block (template in `.claude/hooks.md` §3). Keep only the current and last few sessions here; move durable knowledge to `memory.md` and delete stale blocks.

## Current Session

- Started: 2026-10-12
- Goal: Set up repo-wide rules, roles, hooks, session and memory for Claude Code.

### Open / In Progress

- (none)

### Completed

> Older task blocks: `docs/history/session-archive.md` (not auto-loaded). Keep only the last 3 task blocks here.

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

### T-072 — ADM-035 Content: legal pages

- Project: `WAB-Admin-Dashboard/` (`domain/content`, `data/content`, `presentation/content/{LegalPagesPage,PageEditor}.tsx`, mock `contentRoutes`, locales, route `/content/pages`)
- Branch: `feat/adm-035-content-pages`
- Status: DONE
- Acceptance criteria (Admin Tasks ADM-035; PRD A24 legal pages):
  - [x] List of Privacy / Terms / About pages per app (filter by app); create a missing page; edit opens a full-width editor with the Arabic and English rich text tabs (Markdown subset, sanitized HTML out) and live preview
  - [x] Both languages required (max 50,000 characters), mandatory reason, errors per language tab; app and kind fixed after creation; AR+EN; error state with retry
- Tests: `sh scripts/gate.sh` all PASS (4 new tests through the mock stack); browser check dev-debug: list loads, edit opens the editor with preview, no horizontal scroll
- Loops: 1/1 (user decision)
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — DEVIATION: no e2e (user decision). ADR-0006 (Markdown subset instead of Tiptap) still awaits the owner's confirmation.
- Notes: ADM-036 adds FAQ and contact info to `ContentRepository`.

### Pending (next)

- T-003 — Per-project rules for the remaining folders (customer, merchant, admin, packages) — awaiting user input.
- SRV-026 — next server task after T-036 is merged (see `WAB-Server/docs/WAB_Server_Tasks.md`).
- INT-01 — Contracts v1 (`contracts/`) — first task of the roadmap.
