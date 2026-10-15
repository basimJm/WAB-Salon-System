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

### T-086 — ADM-055 payouts balances, creation and transfer (ADM-055..056)

- Project: `WAB-Admin-Dashboard/`
- Branch: `feat/adm-054-payouts`
- Status: DONE
- Acceptance criteria (Admin Tasks ADM-055):
  - [x] Payouts screen: per-salon balances (collected, gateway fees, refunds, paid out, due now), create a payout up to the end of an Amman day after a ledger preview, payout history with status filter, record the manual bank transfer (net amount, day, bank reference, note); AR+EN
- Tests: 4 new tests through the mock stack; no separate browser check
- Loops: 1/1 (user decision)
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — DEVIATION: no e2e (user decision). DEVIATIONS: ADM-055 and ADM-056 built as ONE task on branch feat/adm-054-payouts (name differs from the backlog); ADM-054 reconciliation is still open.

### T-087 — ADM-054 reconciliation

- Project: `WAB-Admin-Dashboard/`
- Branch: `feat/adm-054-reconciliation`
- Status: DONE
- Acceptance criteria (Admin Tasks ADM-054):
  - [x] Payment problems screen: stuck pending, paid without a booking, missing ledger charge — each a list that opens the payment attempt, with a clean/needs-review badge; error state
- Tests: 2 new tests through the mock stack; no separate browser check
- Loops: 1/1 (user decision)
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — DEVIATION: no e2e (user decision). The server returns problems, not period totals (backlog note).

### Pending (next)

- T-003 — Per-project rules for the remaining folders (customer, merchant, admin, packages) — awaiting user input.
- SRV-026 — next server task after T-036 is merged (see `WAB-Server/docs/WAB_Server_Tasks.md`).
- INT-01 — Contracts v1 (`contracts/`) — first task of the roadmap.
