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
- Status: TODO
- Plan: `/Users/basimabusnaimeh/.claude/plans/stateful-singing-bengio.md`
- Blocked until the owner runs `claude auth login`: step 0 measures a thin worker's start size; above 15k tokens, stop and report.
- Loops: 0/1
- Review: PENDING
