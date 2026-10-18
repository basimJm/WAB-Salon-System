# wab-storage — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next storage`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Presign/confirm/CDN/signed URLs/variants behind `StorageProvider`; the server keeps its own S3 code until SRV-112 ← STO-010.

## Current task

### STO-004 — Local-filesystem adapter + HTTP helper
- Branch: `feat/sto-004-local-fs`
- Status: IN REVIEW
- Acceptance criteria: Disk adapter, atomic writes, HMAC-signed private links, PUT upload + static serving handler for dev on localhost
- Tests: `npm run verify` green (typecheck, lint, format, jest coverage gate 100/95/95, build, package smoke, loop)
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — dev only (prod refuses); path traversal blocked by key pattern; fs errors mapped; tests use a real HTTP server on a temp dir
