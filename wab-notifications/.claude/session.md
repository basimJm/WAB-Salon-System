# wab-notifications — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next notifications`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Built and wired in the server (`NOTIFIER_PROVIDER=real`, T-122/T-123). Remaining: NOT-010 publish, NOT-011 real SMTP send (owner App Password), NOT-012 optional HTTP email adapter.

## Current task

- (none) — run `python3 scripts/tasks.py next notifications`; task branches start from `origin/server`.

## Last blocks

### T-122 — `wab-notifications` SDK: FCM push + SMTP email behind one interface
- Branch: `claude/busy-johnson-2rch94` (merged to `server`)
- Status: DONE
- Tests: `npm run verify` (typecheck, lint, prettier, 200 unit tests, build, package smoke, loop test); `npm run smoke` real FCM dry-run
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — NOT verified: real SMTP send, prod key, end-to-end push to a device.
