# wab-otp — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next otp`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Firebase ID-token verification + OTP limits behind `OtpProvider`; replaces the server fake in SRV-034 (← OTP-010).

## Current task

### OTP-010 — Publish preparation + WAB-Server integration (SRV-034)
- Branch: `feat/otp-010-publish`
- Acceptance: package renamed `@wab/otp` (version 0.1.0, `publishConfig` GitHub Packages restricted, `repository`, `prepublishOnly` = verify, `pack:check`, CHANGELOG, README in the tarball; `npm pack --dry-run` shows dist + README + CHANGELOG); NOT published (owner runs it). WAB-Server: `OTP_PROVIDER=real` works through `providers/otp/real.ts` (env `FIREBASE_PROJECT_ID`, dev-only `FIREBASE_AUTH_EMULATOR_HOST`), `file:` dependency + `ensure-sdks` + Docker + `.env.example`, production refuses the emulator host, server tests (9 + config) pass.
- Assumed missing: owner must supply the GitHub Packages token and run `npm publish`; Firebase project ids per environment come from env (dev `wab-dev-397ab`, prod `wab-prod-9c58f`); no service account is needed for ID-token verification.
- Tests: `cd wab-otp && npm run verify` green; `cd WAB-Server && npm run docs && format:check && lint && typecheck && build && test && audit` green.
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — NOT verified: real Firebase ID token from the dev/prod project (no network/credentials here), Docker image build (no daemon), actual publish to the registry.
