# WAB — Mandatory Rules (all projects, every task)

> Enforced by `CLAUDE.md` imports and `.claude/settings.json` hooks. Project folders may add stricter rules; they never relax these.

## 1. Token Efficiency
- Use the minimum context, tool calls, and output necessary to complete the task correctly.
- Never scan the entire repository unless the task explicitly requires it.
- Start by inspecting `git status`, the relevant files, and the existing implementation.
- Search for specific symbols, classes, functions, and usages before opening files.
- Read only relevant sections of large files, logs, and documentation.
- Never reread files or repeat searches unless new information justifies it.
- Avoid dumping full build logs, dependency trees, generated files, or unrelated code into context.
- Prefer concise summaries and targeted command output.
- Do not explain obvious code or produce lengthy progress updates.
- Use the existing project structure and abstractions instead of inventing new ones.
- Avoid unnecessary agents, parallel investigations, and repeated planning.
- Use the simplest suitable model for routine tasks; reserve stronger reasoning for complex architectural decisions.
- Use `/clear` between unrelated tasks and `/compact` when continuing a long task with useful context.
- Check `.claude/memory.md` before investigating; it may already hold the answer.

## 2. Understand Requirements Before Coding
- Identify the exact requested outcome before modifying code.
- Inspect the relevant implementation, its callers, dependencies, and existing tests.
- Convert the request into explicit acceptance criteria (write them into `.claude/session.md`).
- Identify constraints, edge cases, and potential regressions.
- Distinguish explicit requirements from assumptions.
- If a missing detail materially affects correctness, ask a concise clarifying question before proceeding.
- Do not ask questions that can be answered by inspecting the repository.
- For complex or multi-file changes, provide a short implementation plan and list the expected files before editing.
- For straightforward changes, skip unnecessary planning and proceed directly.
- Do not expand the scope, refactor unrelated code, or introduce additional features without justification.
- Requirements source of truth: the project's PRD > BRD > Design Script > design files (see `CLAUDE.md` §3).

## 3. Delivery Rules
1. **Unit tests for every task.** Every code change ships with unit tests covering the acceptance criteria, edge cases and the regression it fixes. Run them; all must pass. No tests → task not done.
2. **Never commit or push to `main`.** Always: `git checkout main && git pull --ff-only` → `git checkout -b <type>/<short-name>` (types: `feat`, `fix`, `chore`, `refactor`, `test`, `docs`) → commit on the branch → push the branch → open a PR. Never force-push, never `--no-verify`.
3. **No hardcoded values anywhere.** No hardcoded URLs, hosts, ports, keys, secrets, IDs, user-visible strings, colors, sizes, limits, timeouts or magic numbers in code. Use config/env, constants files, localization resources, theme/design tokens, or server-driven settings.
4. **Three verification loops before push.** Re-check the work against every acceptance criterion three separate times (loop 1: requirements coverage; loop 2: edge cases, errors, security, no-hardcode; loop 3: tests/build/lint green + PRD/BRD consistency). Record each loop in `.claude/session.md` (`Loops: 3/3`).
5. **Four-role review before push** (see `.claude/hooks.md`). Record `Review: PASSED` in `.claude/session.md`. Fix every blocking finding first.
6. **Keep `session.md` and `memory.md` current** (see `.claude/hooks.md` §3).
7. Never commit secrets; never edit `.env*` files without explicit permission.
8. **Server work uses the `server` branch as its master.** All WAB-Server tasks branch from the latest `origin/server` and their PRs target `server` (never `main`); `server` is created from `main` and the user merges `server` into `main` when they decide. After each merge, restart the working branch from `origin/server`. If `server` is behind `main`, merge `main` into `server` first (pull request, never a force-push). Other projects keep using `main`.
9. **Admin work uses the `admin` branch as its master and has NO GitHub CI.** All WAB-Admin-Dashboard tasks branch from the latest `origin/admin` and their PRs target `admin` (never `main`). Because Actions is switched off for the admin panel, the gate is local: before every push run the local gate on the developer machine: `npm ci`, `npm run verify`, the four variant builds (`npm run build:dev-debug`, `build:dev-release`, `build:prod-debug`, `build:prod-release`) with `VITE_API_BASE_URL`/`VITE_SOCKET_URL` set to https placeholders, `npm run check:size -- dev-debug dev-release prod-debug prod-release`, and `npm run e2e` for screens; push only when all of it is green, and report what ran. Before every commit the admin app is also built, run in a browser and UI-tested against the BRD, PRD, task row and `BUSINESS_DOMAIN.md` (`WAB-Admin-Dashboard/.claude/rules.md` §6). I may merge a task PR into `admin` only after that gate is green. The user pulls the branch and runs the project on their own device before merging `admin` into `main`. If `admin` is behind `main`, merge `main` into `admin` by pull request first (never force-push).
10. **One task = one branch from the master branch, checked before the first edit.** Run `git branch --show-current` before editing: it must be the task branch (`feat/<project>-<id>-<key>`), never the master branch (`admin`, `server`) and never `main`. Create the branch from the freshly fetched `origin/<master>` (use `git branch --no-track <name> origin/<master>` then `git checkout <name>` when the sandbox cannot write `.git/config`). The PR always targets the master branch, never `main`.
11. **Autonomous backlog flow (user grant, 2026-10-14).** The user gave full access to the device and to merging my own PRs. After the local gate is green I push, open the PR into the master branch, merge it (merge commit), return to the updated master branch and start the next backlog task at once, without waiting for approval, until the whole backlog is done. I stop only for tasks marked PENDING or blocked by missing owner input, and I report them. If the user says stop, I stop.
12. **Run the project in Chrome before every commit** (every project with a UI): build it, open it in a real browser (the built-in browser and the real Chrome through e2e), use the screens the change touches in Arabic and English, light and dark, phone and desktop, keep the console clean, check widths and positions with measurements (unit tests cannot see CSS layout), and state in the commit/PR what was opened and found. A UI change committed without this is not done.
13. **Pushes and merges made through the Terminal panel do not pass the Bash guard hook.** The `Loops: 3/3` and `Review: PASSED` block in `.claude/session.md` must therefore be written (and be true) before any push or merge made that way; do not rely on the hook to catch a missing one.
14. **Report deviations honestly.** When a rule above was not fully applied (a step skipped, done in a shortened form, or done late), say so in the task block of `session.md` and in the final answer, with what was done instead. Never record `Loops: 3/3` or `Review: PASSED` for a pass that did not happen.
