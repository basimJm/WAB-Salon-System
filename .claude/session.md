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

### T-078 — ADM-041 salon details

- Project: `WAB-Admin-Dashboard/`
- Branch: `feat/adm-041-salon-overview`
- Status: DONE
- Acceptance criteria (Admin Tasks ADM-041):
  - [x] Salon page /salons/:id opened from a list row: overview (audience, city, phone, rating, completeness checklist, offline reason), members tab, side panel with owner and subscription; error state; AR+EN
- Tests: 6 new tests through the mock stack
- Loops: 1/1 (user decision)
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — DEVIATION: no e2e (user decision). Shortcut tabs to bookings/reviews/transactions/payouts come with those modules; salon editing is blocked on the server (G-salon-edit).

### T-079 — ADM-042 salon actions

- Project: `WAB-Admin-Dashboard/`
- Branch: `feat/adm-042-salon-actions`
- Status: DONE
- Acceptance criteria (Admin Tasks ADM-042):
  - [x] On the salon page: take offline / put online with a reason, change audience (warning that services switch off, same audience refused), payout details tab: full IBAN only after an explicit click (never cached; server audits the read), replace with validated IBAN and reason
- Tests: 4 new tests through the mock stack
- Loops: 1/1 (user decision)
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — DEVIATION: no e2e (user decision). No separate browser check (same dialog/drawer patterns).

### Pending (next)

- T-003 — Per-project rules for the remaining folders (customer, merchant, admin, packages) — awaiting user input.
- SRV-026 — next server task after T-036 is merged (see `WAB-Server/docs/WAB_Server_Tasks.md`).
- INT-01 — Contracts v1 (`contracts/`) — first task of the roadmap.
