# wab-storage — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next storage`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Presign/confirm/CDN/signed URLs/variants behind `StorageProvider`; the server keeps its own S3 code until SRV-112 ← STO-010.

## Current task

### STO-006 — CDN URLs and signed GET URLs
- Branch: `feat/sto-006-urls`
- Status: IN REVIEW
- Acceptance criteria: publicUrlOf, S3 presigned GET or CloudFront canned-policy signed URLs (RSA-SHA1 via node:crypto, verified in tests), option validation with prod https
- Tests: `npm run verify` green (typecheck, lint, format, jest coverage gate 100/95/95, build, package smoke, loop)
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — CloudFront signing implemented without a dependency and verified against its public key; not tested against a real distribution
