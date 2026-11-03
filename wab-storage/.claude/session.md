# wab-storage — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next storage`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Presign/confirm/CDN/signed URLs/variants behind `StorageProvider`; the server keeps its own S3 code until SRV-112 ← STO-010.

## Current task

### STO-011 — Cloudflare R2 provider + copy/stat + bucket CORS (owner 2026-11-01)
- Branch: `feat/srv-180-r2-storage` (with SRV-180…182)
- Status: DONE (PR #605)
- Acceptance criteria: `provider: 'r2'` on the S3 adapter (account endpoint, region `auto`, checksums when required, two different buckets, prod https, CloudFront refused); `copy` + `stat` on S3/R2, memory, local-fs; `configureBucketCors`; 0.2.0; Integration.md + CHANGELOG
- Tests: `tests/r2.test.ts`; `npm run verify` 216 tests + coverage gate + `npm run test:loop` green (Terminal panel)
- Loops: 1/1 — re-checked the R2 S3-compatibility points (region auto, endpoint, unsupported checksums, per-bucket public access)
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔ (no WAB rule inside the package), QA ✔)
- Notes: real R2 not called (no credentials); presigned URL shape verified with the real AWS SDK offline.

### FIX-STO-CJS — Fix: lazy vendor SDK loading under CommonJS
- Branch: `fix/storage-cjs-vendor-loading`
- Status: IN REVIEW
- Acceptance criteria: CJS build turns lazy import() into require() (esbuild dynamic-import off for cjs only); ESM keeps native import(); package smoke now loads the AWS SDK and sharp through both module systems
- Tests: `npm run verify` green (typecheck, lint, format, jest coverage gate 100/95/95, build, package smoke, loop)
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — found by WAB-Server's Jest run: the CJS bundle kept native import(), which Jest/ts-node cannot execute, so every real S3 call failed with 'AWS SDK could not be loaded'
