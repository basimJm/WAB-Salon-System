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

### T-096 — ADM-078 fixture tests

- Project: `WAB-Admin-Dashboard/`
- Branch: `feat/adm-078-fixture-tests`
- Status: DONE
- Acceptance criteria (Admin Tasks ADM-078):
  - [x] A test fails when an operation of the contract has no mock fixture and no written reason (the list of exemptions can only shrink), when a fixture names an operation the contract lacks, and when a readable fixture answers with anything its generated schema forbids; the mock answers 404 when a fixture cannot find a record
- Tests: 3 new tests; gate green
- Loops: 1/1 (user decision)
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — DEVIATION: no e2e (user decision). 

### T-097 — ADM-081 QA pass: accessibility and RTL

- Project: `WAB-Admin-Dashboard/`
- Branch: `feat/adm-081-qa-pass`
- Status: DONE
- Acceptance criteria (Admin Tasks ADM-081):
  - [x] axe finds no violations on any of the 29 module screens in Arabic (RTL) and English; chart titles no longer skip heading levels
- Tests: tests/pages-a11y.test.tsx (58 tests); gate PASS; no browser check (user decision)
- Loops: 1/1 (user decision)
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — DEVIATION: no e2e (user decision). DEVIATION: ADM-080 e2e flows skipped (user decision); performance is covered by check:size budgets only, no Lighthouse run.

### Pending (next)

- T-003 — Per-project rules for the remaining folders (customer, merchant, admin, packages) — awaiting user input.
- SRV-026 — next server task after T-036 is merged (see `WAB-Server/docs/WAB_Server_Tasks.md`).
- INT-01 — Contracts v1 (`contracts/`) — first task of the roadmap.
