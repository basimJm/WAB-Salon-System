# WAB — Hooks & Task Workflow

Two layers work together:
1. **Automated hooks** (`.claude/settings.json` → `.claude/hooks/*.py`) run by Claude Code and enforce the hard rules.
2. **The review hook** (this file, §2) — the four-role code review Claude must perform after every task. The Stop hook blocks the end of a task until it is recorded.

## 1. Automated Hooks
| Event | Script | What it does |
|---|---|---|
| `SessionStart` | `session_start.py` | Prints branch, open tasks from `session.md`, and the mandatory-reading reminder. |
| `UserPromptSubmit` | `prompt_reminder.py` | Adds a one-line reminder of the rules to every request. |
| `PreToolUse` (Bash) | `guard_git.py` | **Blocks** commits on `main`, any push to `main`, force pushes, `--no-verify`, and pushing a branch whose task in `session.md` lacks `Loops: 3/3` and `Review: PASSED`. |
| `PostToolUse` (Edit/Write) | `check_hardcoded.py` | **Flags** hardcoded secrets, URLs, IPs and ports in source files; Claude must move them to config/constants. |
| `Stop` | `stop_review.py` | **Blocks** finishing while source code changed on the branch and either no test files changed or the task is missing `Loops: 3/3` / `Review: PASSED`. |

## 2. Review Hook — run after every task, before push
Review the full branch diff (`git diff origin/main...HEAD` plus uncommitted changes) once per role from `.claude/roles.md`. For each role list findings as **Blocking** or **Non-blocking**. Fix all blocking findings, re-run tests, then repeat the review for the changed parts.

Checklist (every item must be "yes" or justified):
- **Software Engineer:** correct; minimal scope; Clean Architecture layers; strong typing; errors handled; no duplication; no hardcoded values; no secrets; efficient queries/indexes; logs without sensitive data.
- **Mobile Engineer:** (if mobile/API-for-mobile touched) RTL+LTR, AR+EN strings in resources, light/dark, loading/empty/error states, accessibility, lifecycle/permissions, matches PRD screen + design.
- **Solution Architect:** API namespace/scope correct; contracts versioned and documented (Swagger + Postman updated); integrations via `wab-*` abstractions; business rules from `CLAUDE.md` §5 respected; config-driven; Phase 2 payments not blocked.
- **QA Engineer:** acceptance criteria listed; each has a unit test; edge cases covered; all tests/build/lint green; no regression in callers.

Record in the task block of `.claude/session.md`:
```
- Review: PASSED (SE ✔, Mobile ✔/N/A, Architect ✔, QA ✔) — <one-line summary>
```

## 3. Task Workflow (every task)
1. Read `.claude/memory.md` and the task block in `.claude/session.md`.
2. `git checkout main && git pull --ff-only && git checkout -b <type>/<name>`.
3. Add a task block to `session.md` (template below) with acceptance criteria.
4. Implement + unit tests. Run tests/build/lint.
5. Three verification loops → update `Loops: n/3`.
6. Four-role review (§2) → `Review: PASSED`.
7. Commit, push the branch, open a PR. Mark the task `DONE` (or `BLOCKED` with reason).
8. Update `memory.md` with durable facts only (decisions, paths, commands, gotchas). Keep it short.

### Task block template (`session.md`)
```
### T-XXX — <title>
- Project: <folder>
- Branch: `<type>/<name>`
- Status: TODO | IN PROGRESS | BLOCKED | DONE
- Acceptance criteria:
  - [ ] ...
- Tests: <files / command / result>
- Loops: 0/3
- Review: PENDING
- Notes: <short>
```
