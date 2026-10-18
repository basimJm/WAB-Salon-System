# wab-otp — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next otp`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Firebase ID-token verification + OTP limits behind `OtpProvider`; replaces the server fake in SRV-034 (← OTP-010).

## Current task

### OTP-009 — Server-verified SMS skeleton
- Branch: `feat/otp-009-sms-skeleton`
- Acceptance: `createSmsOtp` sends a code through an `SmsVendor` port and verifies it through the same `ProofVerifier` port (so it plugs into `createOtpService({provider: 'custom'})`); only an HMAC of the code is stored (secret >= 32 chars), constant-time comparison, single use, TTL, bound to phone + purpose; vendor failure removes the stored code and throws a retryable `OtpError`; fake vendor and process-local code store are refused in production.
- Assumed missing: no vendor chosen (owner decision), no shared `CodeStore` implementation yet (a Redis one is a few lines on the same port), wrong-code counting stays in the limits engine.
- Tests: `npm run verify` green (113 unit tests).
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — skeleton only; no real vendor or secrets in the repo.
