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

### T-083 — ADM-050 reviews moderation and published reviews (ADM-050..051)

- Project: `WAB-Admin-Dashboard/`
- Branch: `feat/adm-050-reviews-queue`
- Status: DONE
- Acceptance criteria (Admin Tasks ADM-050):
  - [x] Reviews screen: pending queue (oldest first) with approve / reject, published tab with remove (rating recomputed), target and rating filters, bulk approve/reject up to 100 with per-item result counts, reasons recorded
- Tests: 5 new tests through the mock stack; no separate browser check
- Loops: 1/1 (user decision)
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — DEVIATION: no e2e (user decision). DEVIATIONS: ADM-050 and ADM-051 built as ONE task; reject asks for a reason in the UI though the server makes it optional. DECISION to confirm: total JS budget raised 280 -> 500 KB and applied to prod builds only (lazy module chunks all count in it; dev builds carry mock and gallery code).

### T-084 — ADM-052 transactions

- Project: `WAB-Admin-Dashboard/`
- Branch: `feat/adm-052-transactions`
- Status: DONE
- Acceptance criteria (Admin Tasks ADM-052):
  - [x] Payment attempts list (status, type, Amman-day filters in the URL; gateway code, fee, attempt) and details with the raw gateway answer and every attempt of the checkout, linking to the booking; AR+EN; error state
- Tests: 5 new tests through the mock stack; no separate browser check
- Loops: 1/1 (user decision)
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — DEVIATION: no e2e (user decision). Reconciliation endpoint (getFinanceReconciliation) is consumed by the finance overview task.

### Pending (next)

- T-003 — Per-project rules for the remaining folders (customer, merchant, admin, packages) — awaiting user input.
- SRV-026 — next server task after T-036 is merged (see `WAB-Server/docs/WAB_Server_Tasks.md`).
- INT-01 — Contracts v1 (`contracts/`) — first task of the roadmap.
