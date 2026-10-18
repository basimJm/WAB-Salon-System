# wab-otp — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next otp`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Firebase ID-token verification + OTP limits behind `OtpProvider`; replaces the server fake in SRV-034 (← OTP-010).

## Current task

### OTP-008 — Quality: loop test, smoke, README, docs
- Branch: `feat/otp-008-quality`
- Acceptance: every source file has tests and the gate (100 % functions, >= 95 % lines/branches) is enforced; loop test of 1 000 flows (50 phones x 20 rounds, 20 in flight) on the memory store and a real Redis with real RS256 tokens (block after exactly the configured count, success resets, nothing left behind, flat heap); packaged-tarball smoke over CJS + ESM using the service and the emulator verifier; README quick start; Integration.md updated (API, config, status mapping, errors, open questions).
- Added `resetLimits(phone)` (admin unblock) to `OtpProvider` so the loop and consumers can clear a phone.
- Tests: `npm run verify` green (104 unit tests + 2 loop tests).
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — the first loop run exposed a test clock mismatch (tokens issued for a fixed `NOW`, service on the real clock), fixed by injecting `now`. Real Firebase still unverified (listed in Integration.md §11).
