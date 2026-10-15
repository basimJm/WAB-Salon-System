# WAB — Session Log

> Every task gets a block (template in `.claude/hooks.md` §3). Keep only the current and last few sessions here; move durable knowledge to `memory.md` and delete stale blocks.

## Current Session

- Started: 2026-10-12
- Goal: Set up repo-wide rules, roles, hooks, session and memory for Claude Code.

### Open / In Progress

- (none)

### Completed

> Older task blocks: `docs/history/session-archive.md` (not auto-loaded). Keep only the last 3 task blocks here.

### T-074 — ADM-037 banners with image upload

- Project: `WAB-Admin-Dashboard/`
- Branch: `feat/adm-037-banners`
- Status: DONE
- Acceptance criteria (Admin Tasks ADM-037):
  - [x] Banners list (gender filter) and full-width editor: Arabic and English artwork uploaded through presign + PUT + confirm, action (none/salon/https link) with value rules, audience, Amman-day schedule with included end day, order, active, phone previews, mandatory reason
- Tests: 17 new tests incl. upload flow through the mock stack; browser check: editor opens with 2 uploaders and 2 previews, no horizontal scroll
- Loops: 1/1 (user decision)
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — DEVIATION: no e2e (user decision). 

### T-075 — ADM-038 catalog services

- Project: `WAB-Admin-Dashboard/`
- Branch: `feat/adm-038-catalog-services`
- Status: DONE
- Acceptance criteria (Admin Tasks ADM-038):
  - [x] Catalog services (women/men segmented view, server-paginated): create and edit in a side panel with names and descriptions in Arabic and English, image upload, order, active switch with a deactivation warning, mandatory reason; no delete
- Tests: 4 new tests through the mock stack; browser check skipped for this task (same list+drawer pattern verified in ADM-033/034/036)
- Loops: 1/1 (user decision)
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — DEVIATION: no e2e (user decision). Browser check not repeated (identical pattern to earlier pages); catalog requests (approve/reject) belong to ADM-039.

### Pending (next)

- T-003 — Per-project rules for the remaining folders (customer, merchant, admin, packages) — awaiting user input.
- SRV-026 — next server task after T-036 is merged (see `WAB-Server/docs/WAB_Server_Tasks.md`).
- INT-01 — Contracts v1 (`contracts/`) — first task of the roadmap.
