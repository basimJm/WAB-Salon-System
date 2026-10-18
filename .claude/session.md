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

### T-090 — ADM-059 push campaigns: compose and history (ADM-059..060)

- Project: `WAB-Admin-Dashboard/`
- Branch: `feat/adm-059-campaigns`
- Status: DONE
- Acceptance criteria (Admin Tasks ADM-059):
  - [x] Campaigns screen: history with delivery stats and status filter, cancel a scheduled campaign with a reason, compose a campaign (texts in both languages, app, audience kinds with an estimate, link, now or scheduled time in Amman, phone previews, reason); AR+EN
- Tests: 6 new tests through the mock stack; no separate browser check
- Loops: 1/1 (user decision)
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — DEVIATION: no e2e (user decision). DEVIATIONS: ADM-059 and ADM-060 built as ONE task; live stats are the list's stats column (no polling page); CITY audience takes one city in the form (API allows up to 50).

### T-091 — ADM-061 alerts and live shell counters (ADM-061..062)

- Project: `WAB-Admin-Dashboard/`
- Branch: `feat/adm-061-alerts`
- Status: DONE
- Acceptance criteria (Admin Tasks ADM-061):
  - [x] Alerts list (severity, kind, link to the subject, status filters, acknowledge) plus live numbers in the shell: the bell shows NEW alerts and opens the page, sidebar counters for pending applications, pending reviews and alerts; all refresh through the realtime invalidation bus
- Tests: 4 new tests through the mock stack; no separate browser check
- Loops: 1/1 (user decision)
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — DEVIATION: no e2e (user decision). DEVIATION: ADM-061 and ADM-062 built as ONE task.

### Pending (next)

- T-003 — Per-project rules for the remaining folders (customer, merchant, admin, packages) — awaiting user input.
- SRV-026 — next server task after T-036 is merged (see `WAB-Server/docs/WAB_Server_Tasks.md`).
- INT-01 — Contracts v1 (`contracts/`) — first task of the roadmap.
