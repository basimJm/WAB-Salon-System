# wab-otp — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next otp`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Firebase ID-token verification + OTP limits behind `OtpProvider`; replaces the server fake in SRV-034 (← OTP-010).

## Current task

### OTP-004 — Limits engine and `createOtpService`
- Branch: `feat/otp-004-limits`
- Acceptance: request limit (default 5 / 5 min → 15 min block), wrong-code limit (5 → 15 min block), resend cooldown (60 s), `blockedUntil`, `resendAfterSeconds`; all values from options; the request that reaches a limit is allowed and starts the block, later ones are denied (same semantics as the WAB-Server gate); requests and wrong codes share one block; success resets; only `WRONG_CODE` counts; `verify` answers `BLOCKED` while blocked; prod needs an injected shared store.
- Assumed missing: per-device/IP limits (`deviceId`/`ip` accepted but not limited yet; open question in Integration.md).
- Tests: `npm run verify` green (62 unit tests).
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — added `LimitStore.countOf` so non-counting failure reports can still return `attemptsRemaining`.
