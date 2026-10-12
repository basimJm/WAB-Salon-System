# WAB — Session Log

> Every task gets a block (template in `.claude/hooks.md` §3). Keep only the current and last few sessions here; move durable knowledge to `memory.md` and delete stale blocks.

## Current Session
- Started: 2026-10-12
- Goal: Set up repo-wide rules, roles, hooks, session and memory for Claude Code.

### Open / In Progress
- (none)

### Completed
### T-001 — Repo-wide Claude rules, roles, hooks, session & memory
- Project: repo root (`.claude/`, `CLAUDE.md`)
- Branch: `chore/claude-rules-hooks`
- Status: DONE
- Acceptance criteria:
  - [x] `.claude/rules.md` with token-efficiency, requirements and delivery rules (tests, branching, no-hardcode, 3 loops)
  - [x] `.claude/roles.md` with the four senior roles
  - [x] `.claude/hooks.md` + `.claude/settings.json` hooks enforcing branch, hardcode, tests and review rules
  - [x] `.claude/session.md` and `.claude/memory.md`
  - [x] `CLAUDE.md` imports all of them so every session reads them
- Tests: `python3 .claude/hooks/test_hooks.py` — 19 pass (QA findings fixed: guard false positives on flags inside commit messages and on other commands chained with git push; now strips quotes/heredocs and checks each shell segment, covered by tests)
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — config/docs only; hooks covered by unit tests.
- Notes: Per-project rules to be added next (user will provide).

### T-002 — Delivery roadmap & shared integration workflow
- Project: repo root (`ROADMAP.md`, `INTEGRATION_WORKFLOW.md`, `CLAUDE.md`)
- Branch: `docs/roadmap-integration`
- Status: DONE
- Acceptance criteria:
  - [x] Phases P0–P6 with tasks split by track: SERVICE, SERVER, CUSTOMER, MERCHANT, ADMIN (+ INT/REL)
  - [x] Tracks can run in parallel; API integration is last (P5)
  - [x] Rule for unready dependencies: build against contract fixtures behind interfaces with config-switched mocks
  - [x] Shared integration workflow: contracts, mocks, dev/prod environments per project, CI/CD and promotion
  - [x] Linked from `CLAUDE.md`
- Tests: docs only (no source code); links and task IDs cross-checked against PRD screen IDs
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — consistent with CLAUDE.md §4–5 and PRDs.

### Pending (next)
- T-003 — Per-project rules for each folder (awaiting user input).
- INT-01 — Contracts v1 (`contracts/`) — first task of the roadmap.
