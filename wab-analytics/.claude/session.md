# wab-analytics — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next analytics`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Server events + queries (Mongo first, BigQuery later) behind `AnalyticsProvider`; SRV-110 ← ANA-010.

## Current task

### ANA-001 — Project scaffold
- Branch: `feat/ana-001-scaffold`
- Status: IN REVIEW
- Acceptance: TS strict, eslint (no any/console), prettier, jest with coverage gate 100/95/95, tsup ESM+CJS+d.ts, `verify`, loop-test config, package smoke (CJS + ESM) — same as `wab-notifications`.
- Assumed missing: package name `@wab/analytics` (scoped, GitHub Packages) already from the start so the server dependency name never changes; `private: true` until ANA-010.
- Tests: `npm run verify` green.
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — tooling only; mirrors the proven notifications setup.
