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

### T-084 — ADM-052 transactions

- Project: `WAB-Admin-Dashboard/`
- Branch: `feat/adm-052-transactions`
- Status: DONE
- Acceptance criteria (Admin Tasks ADM-052):
  - [x] Payment attempts list (status, type, Amman-day filters in the URL; gateway code, fee, attempt) and details with the raw gateway answer and every attempt of the checkout, linking to the booking; AR+EN; error state
- Tests: 5 new tests through the mock stack; no separate browser check
- Loops: 1/1 (user decision)
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — DEVIATION: no e2e (user decision). Reconciliation endpoint (getFinanceReconciliation) is consumed by the finance overview task.

### T-085 — ADM-053 refunds

- Project: `WAB-Admin-Dashboard/`
- Branch: `feat/adm-053-refunds`
- Status: DONE
- Acceptance criteria (Admin Tasks ADM-053):
  - [x] Refunds list (status filter, attempts, next attempt, last error, overdue highlight), retry a refund with a reason, mark as refunded manually with a bank reference and reason; refreshes on refund.updated
- Tests: 5 new tests through the mock stack; no separate browser check
- Loops: 1/1 (user decision)
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — DEVIATION: no e2e (user decision). 

### Pending (next)

- T-003 — Per-project rules for the remaining folders (customer, merchant, admin, packages) — awaiting user input.
- SRV-026 — next server task after T-036 is merged (see `WAB-Server/docs/WAB_Server_Tasks.md`).
- INT-01 — Contracts v1 (`contracts/`) — first task of the roadmap.
