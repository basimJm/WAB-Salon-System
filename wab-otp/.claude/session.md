# wab-otp — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next otp`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Firebase ID-token verification + OTP limits behind `OtpProvider`; replaces the server fake in SRV-034 (← OTP-010).

## Current task

### OTP-001 — Project scaffold
- Branch: `feat/otp-001-scaffold`
- Acceptance: TS strict + eslint + prettier + jest (coverage gate 100/95/95) + tsup ESM/CJS/d.ts + `verify` + loop config + package smoke, same as `wab-notifications`.
- Assumed missing: package name stays `wab-otp` (consumers use a `file:` dependency); renamed to `@wab/otp` only in OTP-010.
- Tests: `npm run verify` green (scaffold test, build, smoke, loop).
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — tooling only, mirrors the proven SDK setup.
