# wab-storage — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next storage`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Presign/confirm/CDN/signed URLs/variants behind `StorageProvider`; the server keeps its own S3 code until SRV-112 ← STO-010.

## Current task

### STO-010 — Publish preparation @wab/storage
- Branch: `feat/sto-010-publish`
- Status: IN REVIEW
- Acceptance criteria: package renamed @wab/storage 0.1.0, files, publishConfig (GitHub Packages, restricted), .npmrc scope, CHANGELOG, prepublishOnly=verify, npm pack dry-run lists 9 files (dist, README, CHANGELOG, package.json); NOT published
- Tests: `npm run verify` green (typecheck, lint, format, jest coverage gate 100/95/95, build, package smoke, loop)
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — owner runs npm publish with a registry token; consumers use file:../wab-storage until then (same as @wab/notifications)
