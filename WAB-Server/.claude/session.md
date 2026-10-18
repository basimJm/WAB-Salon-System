# WAB-Server — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next server`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)

- Serves `/customer/v1` (51 ops), `/merchant/v1` (71), `/admin/v1` (116) + Socket.IO; contract = `docs/api/openapi.*.json` regenerated with `npm run docs` every task.
- Providers: notifier **real** (`wab-notifications`); otp **real** (`wab-otp`, SRV-034, needs `FIREBASE_PROJECT_ID`); storage / payments / analytics on in-repo fakes until SRV-112 / SRV-092 / SRV-110 (BLOCKED on the SDK publish tasks; owner integrates).
- Open work: SRV-111 contract guard, Stage N (SRV-117…128, admin gaps), Stage O (SRV-129…134, merchant gaps). Deployment SRV-011/116 and SRV-059/115: owner (PENDING).

## Current task

### SRV-112 (storage part) — Wire `@wab/storage` into WAB-Server (`STORAGE_PROVIDER=real`)

- Branch: `feat/srv-112-storage-real`
- Status: IN REVIEW (SRV-112 itself stays BLOCKED on the other SDKs and the publish; this is the storage slice, owner grant 2026-10-18 "assume everything is ready")
- Acceptance criteria (BE-70 presigned uploads, NFR-01 secrets only in env, server rules §2 externals behind interfaces, §5 no hardcoding, §8 provider errors):
  - [x] `file:../wab-storage` dependency (`@wab/storage`), `ensure-sdks` builds it, Docker image + `Dockerfile.dockerignore` include it
  - [x] Env keys S3_* / CDN_BASE_URL / CLOUDFRONT_* in constants, schema (required when `STORAGE_PROVIDER=real`, credentials and CloudFront keys only complete) and `.env.example`; typed `config.storage`
  - [x] `providers/storage/real.ts` maps settings to SDK options (dev/prod, TTL ceilings from existing constants), SDK errors to 502/503 `ExternalServiceError`, caller errors to `RangeError`, `EMPTY` rejection to `TYPE_MISMATCH`
  - [x] `createProviders` builds it; missing settings or invalid SDK config fail at start-up
- Tests: `tests/storageReal.test.ts` (mapping, delegation, wiring, real SDK presigning offline), config and docker tests extended
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — NOT verified: real S3/CloudFront/CDN calls and the Docker build (no daemon). The SDK is verified against a wire emulator inside `wab-storage` tests. API docs: no change.

## Last blocks

### SRV-034 — Real Firebase ID-token verification via `wab-otp`

- Branch: `feat/otp-010-publish` (shared PR with OTP-010)
- Status: DONE
- Acceptance criteria: `@wab/otp` `file:` dependency + `ensure-sdks` + Docker; env `FIREBASE_PROJECT_ID` (required for `OTP_PROVIDER=real`), `FIREBASE_AUTH_EMULATOR_HOST` (dev only, refused in production); `providers/otp/real.ts` maps SDK outcomes (anything unexpected is an invalid proof, never success) and errors (outage -> `ExternalServiceError`, caller bug -> `RangeError`); closed on shutdown
- Tests: `tests/otpReal.test.ts` (9, includes the real SDK on emulator-shaped tokens) + config tests; full gate green
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — NOT verified: real Firebase ID tokens from the dev/prod projects, Docker build (no daemon). API docs: no change.

### T-123 — Wire `wab-notifications` into WAB-Server (`NOTIFIER_PROVIDER=real`)

- Branch: `claude/busy-johnson-2rch94` (PR #129, merged to `server`)
- Status: DONE
- Acceptance criteria: `file:../wab-notifications` dependency + `ensure-sdks`; env keys FCM__/SMTP__/EMAIL_FROM_*; adapter maps SDK errors → `ExternalServiceError`; closed on shutdown; Docker image builds from the repo root
- Tests: `npm test` 2420; lint/format/typecheck/build green; `tests/notifierReal.test.ts` (16)
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — NOT verified: real SMTP send (App Password pending), Docker build (no daemon). API docs: no change.
