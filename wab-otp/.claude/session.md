# wab-otp — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next otp`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Firebase ID-token verification + OTP limits behind `OtpProvider`; replaces the server fake in SRV-034 (← OTP-010).

## Current task

### OTP-002 — Shared kernel
- Branch: `feat/otp-002-kernel`
- Acceptance: typed `OtpError` (code, retryable, cause, details); zod options with defaults from `constants/`; prod refuses fake / missing project / emulator / http key URL / process-local store; custom needs a verifier; redacting logger (secrets removed, phones masked to last 3 digits); retry with capped backoff + jitter and timeout helper; ports (`OtpProvider`, `ProofVerifier`, `LimitStore`) typed.
- Assumed missing: `PURPOSE_MISMATCH` and `BLOCKED` outcomes exist in the SDK enum although Firebase cannot bind purpose; per-device/IP limits are out (needs device id source).
- Tests: `npm run verify` green (22 unit tests, gate met).
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — QA found my own wrong mask-length expectation (fixed in tests); lint-driven test cleanups only.
