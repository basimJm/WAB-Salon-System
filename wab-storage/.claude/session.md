# wab-storage — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next storage`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Presign/confirm/CDN/signed URLs/variants behind `StorageProvider`; the server keeps its own S3 code until SRV-112 ← STO-010.

## Current task

### STO-008 — MinIO dev mode and rejection fixtures
- Branch: `feat/sto-008-minio`
- Status: IN REVIEW
- Acceptance criteria: ensureDevBuckets (dev only, idempotent, race tolerant), path-style endpoint support, shipped upload fixtures (valid/missing/mismatch/empty/too large) run on memory, local-fs and the real SDK for adapter parity
- Tests: `npm run verify` green (typecheck, lint, format, jest coverage gate 100/95/95, build, package smoke, loop)
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — bucket bootstrap refuses prod; fixtures prove identical confirm behaviour on all adapters; not run against a real MinIO container (docker unavailable) - the wire emulator stands in
