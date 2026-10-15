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

### T-081 — ADM-044 customers list, details and actions (ADM-044..046)

- Project: `WAB-Admin-Dashboard/`
- Branch: `feat/adm-044-customers`
- Status: DONE
- Acceptance criteria (Admin Tasks ADM-044):
  - [x] Customers list (search name/phone, status/audience/city filters in the URL), customer page (profile, devices, block reason, deletion date, journey id) and the actions that fit the status: block, unblock, start deletion, restore, each with a mandatory reason
- Tests: 6 new tests through the mock stack; no separate browser check
- Loops: 1/1 (user decision)
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — DEVIATION: no e2e (user decision). DEVIATION: ADM-044, ADM-045 and ADM-046 were built and merged as ONE task/branch (one repository and one pair of pages) instead of three; tabs for bookings/payments reuse later modules.

### T-082 — ADM-047 bookings list, details and status change (ADM-047..049)

- Project: `WAB-Admin-Dashboard/`
- Branch: `feat/adm-047-bookings-list`
- Status: DONE
- Acceptance criteria (Admin Tasks ADM-047):
  - [x] Bookings list (tabs, status/payment/bride/day filters in the URL as Amman days, search, salon/customer deep-link filters, JOD totals, refreshes on booking.updated), booking page (facts, persons and services, money, history) and an admin status change with a mandatory reason that flags irregular moves
- Tests: 6 new tests through the mock stack; no separate browser check
- Loops: 1/1 (user decision)
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — DEVIATION: no e2e (user decision). DEVIATION: ADM-047, 048 and 049 built as ONE task. Reassign staff / arbitrary refunds are not server operations; transactions/refunds tabs come with the finance modules.

### Pending (next)

- T-003 — Per-project rules for the remaining folders (customer, merchant, admin, packages) — awaiting user input.
- SRV-026 — next server task after T-036 is merged (see `WAB-Server/docs/WAB_Server_Tasks.md`).
- INT-01 — Contracts v1 (`contracts/`) — first task of the roadmap.
