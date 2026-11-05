# WAB: repo-level tasks

> Only open repo-level task blocks live here. The hook prints open tasks at session start; finished blocks go to `docs/knowledge/session-archive.md`.

### T-154b — Light feature line (plan steps 0, 2, 3, 4a)
- Branch: `chore/t-154b-feature-line`
- Status: IN REVIEW (no PR yet)
- Plan: `/Users/basimabusnaimeh/.claude/plans/stateful-singing-bengio.md`
- Acceptance criteria:
  - [x] Step 0: thin worker starts at 6,848 tokens (10.5–12.4k with its card); guard hook fires; `gh`, `git commit`, `git merge` refused
  - [x] Steps 2 + 3: `scripts/line.py`, `usage.py`, `qa.py`, `features/` template and prompts, config in `.claude/projects.json`
  - [x] Step 4a: "Open now" ran and merged (PRs 660–663): 198 requests, 7.7M tokens, $2.28 + two stopped workers of unknown cost; cache read 2.1M and 3.0M (the 3.0M worker was stopped at its cap), 1M target missed
  - [x] Open items moved to T-154c: 4b, step 5, Phase 2
- Tests: 85 in `test_tasks`, `test_map_recall`, `test_line`, `test_qa_usage` + 28 hook + 72 `SYSTEM_SETUP`: green; `tasks.py check`: only the known `CUS-047`
- Loops: 1/1 — independent re-read of line.py, qa.py, usage.py and REPORT numbers (match `usage.py`); fixed with tests: docs worker output merged unchecked, failed smoke check did not stop the merge, drift left a stale `Review: PASSED` and could not be re-synced
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔), one independent reviewer agent, not the author. Not verified: step 0 numbers (taken from the earlier measurement); a real `claude -p` run after the fixes (tests use a fake claude and gh); a worker can still bypass its deny list through `python3`/`node`/`find` (documented as guardrails, not a sandbox); `src/{debug,devDebug}/google-services.json` of the merchant left in, inert
- Notes: `line.py status`/`report` refuse once the packet's tasks are DONE. No browser, emulator, iOS build or cross-API smoke

### T-154c — Feature line: first new feature, local model, SYSTEM_SETUP
- Branch: `chore/t-154c-feature-line`
- Status: TODO
- Acceptance criteria:
  - [ ] Step 4b: a new feature across server, admin, customer and merchant through `line.py` (the owner brings one)
  - [ ] Step 5: optional local-model worker
  - [ ] Phase 2 `SYSTEM_SETUP`: PAUSED by the owner 2026-11-05, parked on `wip/t-154b-system-setup`
  - [ ] Review leftovers (non-blocking): reviewer failure starts a fix worker; diff cut at 30k chars; hooks read from the worktree; wrap-up push unguarded
- Loops: 0/1
- Review: PENDING
