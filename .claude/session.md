# WAB: repo-level tasks

> Only open repo-level task blocks live here. The hook prints open tasks at session start; finished blocks go to `docs/knowledge/session-archive.md`.

### T-154a — The whole picture at session start, small loaded files (owner request 2026-11-05)
- Branch: `chore/t-154-feature-line`
- Status: IN REVIEW
- Acceptance criteria (plan step 1):
  - [x] `scripts/map.py` prints the system and each module from real state (system ~660 tokens, module ~370–450; budget test on the real repo)
  - [x] `scripts/recall.py` finds details as `path:line`; budgets in `tasks.py check` (`.claude/projects.json`)
  - [x] Long files moved to on-demand files: `docs/knowledge/`, `<project>/docs/ENGINEERING_RULES.md`; short `CLAUDE.md`, `session.md`, `memory.md`; session-start hook prints the map
- Tests: `scripts/test_tasks.py` + `scripts/test_map_recall.py`, hook tests, `SYSTEM_SETUP` tests (72), admin + server docs tests and prettier, customer + merchant policy checks and policy tests: green. `KMP_TEMPLATE` end-to-end test fails the same way on clean `server` (not from this branch; separate task offered)
- Loops: 1/1 — loaded files measured: root ~16k → ~1.4k tokens, module 9–18k → ~750; found and fixed: admin `.claude/Integration.md` failed prettier since T-153, template `tasks.py` must equal the live one, SDK session/memory files over budget, SRV-135 + CUS-080 stuck IN REVIEW though merged
- Review: PASSED (SE ✔ (stdlib only, hook falls back when the map fails), Mobile N/A, Architect ✔ (map is generated, nothing to go stale or conflict; old section citations point at the moved files), QA ✔ (tests above)) — DEVIATIONS: plan said a committed `.claude/MAP.md`; the hook prints it live instead, so it cannot go stale or conflict. Not yet measured in a real new session. `.claude/session.md` index table removed: the map replaces it

### T-154b — Light feature line (plan steps 0, 2–5, then SYSTEM_SETUP)
- Branch: `chore/t-154b-feature-line`
- Status: IN PROGRESS
- Plan: `/Users/basimabusnaimeh/.claude/plans/stateful-singing-bengio.md`
- Acceptance criteria:
  - [x] Step 0: thin worker measured with this line's real flags: start 6,848 tokens (target 10k), reviewer 3,078; guard hook fires; `gh`, `git commit`, `git merge` refused on their own
  - [x] Step 2: `scripts/line.py`, `scripts/usage.py`, `features/PACKET_TEMPLATE.md`, prompts, config in `.claude/projects.json`
  - [x] Step 3: `scripts/qa.py` over each module's gate by project kind
  - [ ] Step 4a: real trial on two modules, "Open now" (SRV-189 + CUS-110), measured with `usage.py`
  - [ ] Step 4b: first new feature across all four modules (needs a feature from the owner)
  - [ ] Step 5: optional local-model worker (the plan says later and optional)
  - [ ] Phase 2: `SYSTEM_SETUP` templates, docs and tests carry the new layer, no source-system names
- Tests: `scripts/test_line.py` (28), `scripts/test_qa_usage.py` (22): green with a fake `claude` and `gh`; the real trial is still running
- Loops: 0/1
- Review: PENDING
- Notes: `WAB-Server` had no `verify` script though its `CLAUDE.md` names it; added
