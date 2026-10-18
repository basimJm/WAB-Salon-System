# wab-otp — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next otp`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Firebase ID-token verification + OTP limits behind `OtpProvider`; replaces the server fake in SRV-034 (← OTP-010).

## Current task

### OTP-003 — Port, fake adapter, memory store, verifier
- Branch: `feat/otp-003-port-fake`
- Acceptance: `createOtpVerifier(options)` validates input (E.164, purpose, proof size) with `OTP_INPUT_INVALID`; fake adapter (same proof format as the WAB-Server fake); `MemoryLimitStore` (process-local, same semantics as Redis, refused in prod); adapter answers are checked (unknown/incomplete answer = `OTP_MALFORMED_RESPONSE`, mismatching verified phone = `PHONE_MISMATCH`); unexpected throws = `OTP_UNKNOWN` with cause; event hook failures never break a verification; logs carry no proof or full phone.
- Assumed missing: outcomes `PURPOSE_MISMATCH`/`BLOCKED` are only produced by custom adapters/the service; `precheck`/`reportFailure` land with OTP-004.
- Tests: `npm run verify` green (48 unit tests).
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — QA added the malformed-answer and wrong-phone downgrade cases; the `custom` guard in the adapter selector is defensive (options already refuse it).
