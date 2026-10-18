# wab-storage — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next storage`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Presign/confirm/CDN/signed URLs/variants behind `StorageProvider`; the server keeps its own S3 code until SRV-112 ← STO-010.

## Current task

### STO-005 — S3 adapter
- Branch: `feat/sto-005-s3`
- Status: IN REVIEW
- Acceptance criteria: Presigned PUT (content-type signed), confirm by HEAD+ranged GET magic bytes, read/write/delete (batched, both buckets), every S3 error code/status mapped, retries, lazy AWS SDK; verified with the real SDK against a local S3 wire emulator
- Tests: `npm run verify` green (typecheck, lint, format, jest coverage gate 100/95/95, build, package smoke, loop)
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — real AWS SDK exercised on localhost (found: Jest-wrapped socket errors lose code -> classify by message too); size cannot be enforced at PUT presign (checked at confirm); not run against real AWS
