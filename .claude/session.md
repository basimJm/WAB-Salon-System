# WAB: repo-level tasks

> Only open repo-level task blocks live here. The hook prints open tasks at session start; finished blocks go to `docs/knowledge/session-archive.md`.

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

### T-155 — Round 21: MER-092, T-154b and Open now reach every master; clean change list (owner request 2026-11-05)
- Branch: `chore/sync-masters-into-main-21`
- Status: IN REVIEW
- Acceptance criteria:
  - [x] Merged: SRV-189 (#660), CUS-110 (#661), wrap-ups (#662, #663), MER-092 (#664), T-154b; statuses set; new rows CUS-112, MER-093
  - [x] Change list empty: `.DS_Store` untracked, `marketing/` and the customer debug manifest ignored, vendored `.claude/skills/` tracked (T-144)
  - [x] Not merged: `wip/t-154b-system-setup` (paused by the owner), PR #330 (owner decision pending)
- Tests: `scripts/test_tasks.py`, `test_map_recall.py`, `test_line.py`, `test_qa_usage.py`, hook tests, `tasks.py check` (only the known CUS-047 note), server prettier: run before this commit
- Loops: 1/1 — checks above re-run after the merges; every master compared with `main` after the fast-forward
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — merges, backlog statuses and ignore rules only; product code was reviewed in its own blocks. Fast-forward of the masters on the owner's explicit request ("pull masters from the main")
