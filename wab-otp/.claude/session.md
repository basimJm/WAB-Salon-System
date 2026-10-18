# wab-otp — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next otp`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Firebase ID-token verification + OTP limits behind `OtpProvider`; replaces the server fake in SRV-034 (← OTP-010).

## Current task

### OTP-007 — Firebase Auth emulator dev mode
- Branch: `feat/otp-007-emulator`
- Acceptance: with `firebase.authEmulatorHost` (dev) the unsigned (`alg: none`) tokens the Auth emulator issues are accepted with every claim check of the real verifier and no network call; the same tokens are rejected by the real verifier; prod refuses the host in the options and again in the emulator verifier; `createEmulatorToken` builds the emulator token shape for dev tooling and consumer tests.
- Assumed missing: emulator token shape is taken from Firebase docs/behaviour (claims `iss/aud/sub/user_id/auth_time/phone_number/firebase.sign_in_provider`), not captured from a running emulator (none available here); CI availability of the emulator stays an open question.
- Tests: `npm run verify` green (103 tests).
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — dual guard against emulator use in prod; shared `finishVerification` avoids duplicating claim logic.
