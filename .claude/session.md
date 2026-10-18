# WAB — Session Log

> Every task gets a block (template in `.claude/hooks.md` §3). Keep only the current and last few sessions here; move durable knowledge to `memory.md` and delete stale blocks.

## Current Session

- Started: 2026-10-12
- Goal: Set up repo-wide rules, roles, hooks, session and memory for Claude Code.

### Open / In Progress

- (none)

### Completed

> Older task blocks: `docs/history/session-archive.md` (not auto-loaded). Keep only the last 3 task blocks here.

### T-000 — Merges into `admin` (standing record)

- Project: `WAB-Admin-Dashboard/`
- Branch: `admin`
- Status: DONE (standing block: every task PR is merged into `admin` after its own task block below passes the local gate; no code is committed on this branch)
- Acceptance criteria:
  - [x] Each task block records its gate, review and deviations; `admin` only receives merge commits
- Tests: see the task blocks
- Loops: 1/1 (user decision)
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — covered by the task blocks. DEVIATION: no e2e (user decision).

### T-094 — ADM-066 audit log

- Project: `WAB-Admin-Dashboard/`
- Branch: `feat/adm-066-audit-log`
- Status: DONE
- Acceptance criteria (Admin Tasks ADM-066):
  - [x] Audit log table (time, action, entity, reason, IP) with action search and entity/admin/day filters in the URL, a drawer with full details and the before/after values, read-only by design; AR+EN
- Tests: 5 new tests through the mock stack; no separate browser check
- Loops: 1/1 (user decision)
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — DEVIATION: no e2e (user decision). Entity links are not added (entity type names differ per module).

### T-095 — ADM-067 exports

- Project: `WAB-Admin-Dashboard/`
- Branch: `feat/adm-067-exports`
- Status: DONE
- Acceptance criteria (Admin Tasks ADM-067):
  - [x] Export history page (Reports > Exports) refreshing while a file is generated with a download link and failure reason; an Export button (Excel / CSV / PDF) on transactions, audit log and reports that asks for the file, waits for it and opens the short-lived link; waitForExport helper with a timeout
- Tests: 5 new tests through the mock stack; no separate browser check
- Loops: 1/1 (user decision)
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — DEVIATION: no e2e (user decision). 

### Pending (next)

- T-003 — Per-project rules for the remaining folders (customer, merchant, admin, packages) — awaiting user input.
- SRV-026 — next server task after T-036 is merged (see `WAB-Server/docs/WAB_Server_Tasks.md`).
- INT-01 — Contracts v1 (`contracts/`) — first task of the roadmap.
