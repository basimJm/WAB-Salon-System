# WAB — Mandatory Rules (all projects, every task)

> Enforced by `CLAUDE.md` imports and `.claude/settings.json` hooks. Project folders may add stricter rules; they never relax these. Updated 2026-10-18 (one verification loop, per-project session/memory, backlog tool).

## 1. Token Efficiency (read once, work from the task row)
- **Auto-loaded files are never read with a tool.** Root `CLAUDE.md`, `.claude/{rules,roles,hooks,session,memory}.md` and the project's `CLAUDE.md` + `.claude/{session,memory}.md` are already in context on every turn. Do not `cat`/Read them; do not re-read them "to be sure".
- **Backlogs are read only through the tool.** `python3 scripts/tasks.py next <project>` gives the one task to do (ID, title, branch, needs, notes, session file); `show <ID>`, `blocked`, `board`, `check`. Never open a `*_Tasks.md` file whole; never list all tasks.
- **Requirements by section.** A task row names its PRD screens/sections and OpenAPI operations; read only those headings (`grep -n "^### S07"` then `sed -n`), never a PRD/BRD/design script whole. `design/*.dc.html` are visual reference only, opened for UI tasks.
- **One project per session.** Work inside one project folder so only its `CLAUDE.md`/session/memory load. Cross-project facts live in `INTEGRATION.md` (read §1–§5 once when a task touches two projects) and in root `memory.md`.
- Start by inspecting `git status`, the relevant files and the existing implementation; search for symbols before opening files; read only needed ranges; never re-read files you just wrote.
- Avoid dumping build logs, dependency trees or generated files into context. Prefer one quiet gate command (`sh scripts/gate.sh` admin, `npm run verify` server/SDKs, `scripts/ci/run_local_checks.sh` apps) and read only its summary.
- Keep each project's `.claude/session.md` to the current task + the last 2 blocks and `.claude/memory.md` to durable facts (both are loaded on every turn in that project). Root `session.md` is an index only.
- Use `/clear` between unrelated tasks and `/compact` when continuing a long task.

## 2. Understand Requirements Before Coding
- Identify the exact requested outcome; inspect the implementation, callers, dependencies and existing tests.
- Convert the request into explicit acceptance criteria in the **project's** `.claude/session.md` task block, naming the PRD/BRD/BUSINESS_DOMAIN sections and OpenAPI operations touched.
- Identify constraints, edge cases, regressions. Distinguish requirements from assumptions. Ask a concise question only when a missing detail materially affects correctness and the repo cannot answer it.
- Do not expand scope, refactor unrelated code or add features without justification.
- Source of truth: PRD > BRD > Design Script > design files (`CLAUDE.md` §2); data and rules: `BUSINESS_DOMAIN.md`. Wire format: the server OpenAPI snapshot (`INTEGRATION.md` §3).

## 3. Delivery Rules
1. **Unit tests for every task.** Every code change ships with unit tests covering the acceptance criteria, edge cases and the regression it fixes. All must pass. No tests → task not done.
2. **Branch per task from the project's master, checked before the first edit.** Masters: `server` (WAB-Server + all `wab-*`), `admin`, `customer`, `merchant` (`INTEGRATION.md` §1). `git fetch origin && git branch --no-track feat/<prefix>-NNN-<key> origin/<master> && git checkout feat/...`; `git branch --show-current` must show the task branch before editing. PRs target the master, never `main`. Never commit or push to `main` or a master; never force-push; never `--no-verify`. The owner merges masters into `main`; if a master is behind `main`, merge `main` into it by PR first.
3. **No hardcoded values anywhere.** No URLs, hosts, ports, keys, secrets, IDs, user-visible strings, colors, sizes, limits, timeouts or magic numbers in code. Use config/env, constants, localization resources, design tokens or server-driven settings.
4. **One verification loop before push** (`Loops: 1/1`, owner decision 2026-10-18): re-check every acceptance criterion once, covering requirements coverage, edge cases/errors/security/no-hardcode, and tests/build/lint green + PRD/BRD consistency. Record it in the project's `session.md`.
5. **Four-role review before push** (`.claude/hooks.md` §2). Record `Review: PASSED`. Fix every blocking finding first.
6. **Status through the tool, both sides at once.** When a task starts: `python3 scripts/tasks.py set <ID> "IN PROGRESS"`; PR open: `IN REVIEW`; merged: `DONE`. The tool unblocks dependents in other projects and rebuilds the board in `INTEGRATION.md`; commit those file changes with the task. A contract change names the affected client tasks in the task block.
7. **Keep the project's `session.md` and `memory.md` current** (`.claude/hooks.md` §3); root `session.md` index line updated when a project's current task changes; root `memory.md` only for cross-project facts.
8. Never commit secrets; never edit `.env*` files without explicit permission.
9. **Admin gate is local (no admin CI):** before every push `sh scripts/gate.sh` (verify, four variant builds, `check:size`) green, plus the browser UI check of `WAB-Admin-Dashboard/.claude/rules.md` §6 before every commit; e2e only when the owner asks (decision 2026-10-14).
10. **Autonomous backlog flow (owner grant 2026-10-14).** After the gate is green: push, open the PR into the master, merge it (merge commit), return to the updated master and start the next backlog task, until the backlog has no ready task. Stop only on `PENDING`/`BLOCKED` tasks and report them. If the owner says stop, stop.
11. **Run every UI project in a browser/simulator before committing** (`WAB-Admin-Dashboard/.claude/rules.md` §6; apps: previews + local build): use the changed screens in AR and EN, light and dark, phone and desktop/tablet; console clean; measure widths/positions. State what was opened in the commit/PR body.
12. **Pushes and merges through the Terminal panel bypass the Bash guard hook**: the `Loops: 1/1` and `Review: PASSED` lines must be written (and true) in the project's `session.md` before any push or merge made that way.
13. **Batched verification (owner decisions 2026-10-19, override §3.4/§3.5/§3.9/§3.11 timing).** Per task: implement, write the unit tests, run the in-sandbox policy checks, record the task block (`Loops: 0/1`, `Review: PENDING`), commit on the task branch and branch the next task from it. **After every five tasks: run the unit tests only** (one Gradle host-test run), fix failures, record `Loops: 1/1` + `Review: PASSED` for the five blocks (review = the code reading of the batch; UI check deferred), open one PR from the last branch into the master, merge, set the five tasks DONE. **After the whole backlog:** detekt, the full gate (Android variants + iOS), and one end-to-end journey on the emulator and the simulator, fixing what they find in a final batch.
14. **Report deviations honestly.** When a rule was not fully applied, say so in the task block and in the final answer. Never record `Loops: 1/1` or `Review: PASSED` for a pass that did not happen.
