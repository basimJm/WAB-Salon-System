# WAB — Session Log

> Every task gets a block (template in `.claude/hooks.md` §3). Keep only the current and last few sessions here; move durable knowledge to `memory.md` and delete stale blocks.

## Current Session

- Started: 2026-10-12
- Goal: Set up repo-wide rules, roles, hooks, session and memory for Claude Code.

### Open / In Progress

- (none)

### Completed

> Older task blocks: `docs/history/session-archive.md` (not auto-loaded). Keep only the last 3 task blocks here.

### T-077 — ADM-040 salons list

- Project: `WAB-Admin-Dashboard/`
- Branch: `feat/adm-040-salons-list`
- Status: DONE
- Acceptance criteria (Admin Tasks ADM-040):
  - [x] All salons list (server-paginated): name, audience, city, state badge, rating, subscription, created; filters state/audience/city and name search, all in the URL; error and empty states; city filter works around the server's broken id pattern
- Tests: 4 new tests through the mock stack; no separate browser check (same list pattern)
- Loops: 1/1 (user decision)
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — DEVIATION: no e2e (user decision). Missing on the server (G4): recommended and bookings(30d) columns, subscription filter.

### T-078 — ADM-041 salon details

- Project: `WAB-Admin-Dashboard/`
- Branch: `feat/adm-041-salon-overview`
- Status: DONE
- Acceptance criteria (Admin Tasks ADM-041):
  - [x] Salon page /salons/:id opened from a list row: overview (audience, city, phone, rating, completeness checklist, offline reason), members tab, side panel with owner and subscription; error state; AR+EN
- Tests: 6 new tests through the mock stack
- Loops: 1/1 (user decision)
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — DEVIATION: no e2e (user decision). Shortcut tabs to bookings/reviews/transactions/payouts come with those modules; salon editing is blocked on the server (G-salon-edit).

### Pending (next)

- T-003 — Per-project rules for the remaining folders (customer, merchant, admin, packages) — awaiting user input.
- SRV-026 — next server task after T-036 is merged (see `WAB-Server/docs/WAB_Server_Tasks.md`).
- INT-01 — Contracts v1 (`contracts/`) — first task of the roadmap.
