# wab-storage — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next storage`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Presign/confirm/CDN/signed URLs/variants behind `StorageProvider`; the server keeps its own S3 code until SRV-112 ← STO-010.

## Current task

### FIX-STO-CJS — Fix: lazy vendor SDK loading under CommonJS
- Branch: `fix/storage-cjs-vendor-loading`
- Status: IN REVIEW
- Acceptance criteria: CJS build turns lazy import() into require() (esbuild dynamic-import off for cjs only); ESM keeps native import(); package smoke now loads the AWS SDK and sharp through both module systems
- Tests: `npm run verify` green (typecheck, lint, format, jest coverage gate 100/95/95, build, package smoke, loop)
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — found by WAB-Server's Jest run: the CJS bundle kept native import(), which Jest/ts-node cannot execute, so every real S3 call failed with 'AWS SDK could not be loaded'
