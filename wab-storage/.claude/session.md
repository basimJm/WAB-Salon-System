# wab-storage — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next storage`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Presign/confirm/CDN/signed URLs/variants behind `StorageProvider`; the server keeps its own S3 code until SRV-112 ← STO-010.

## Current task

### STO-001 — Project scaffold
- Branch: `feat/sto-001-scaffold`
- Status: IN REVIEW
- Acceptance criteria: TS strict, eslint, prettier, jest + coverage gate, tsup ESM+CJS+d.ts, `verify`, loop config, package smoke (copied from `wab-notifications`)
- Tests: `npm run verify` green (placeholder test + loop; real ones come with later tasks)
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — tooling only; vendor SDKs (`@aws-sdk/*`, `sharp`) declared external in tsup, added as dependencies by the tasks that use them.
