# wab-analytics — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next analytics`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Server events + queries (Mongo first, BigQuery later) behind `AnalyticsProvider`; SRV-110 ← ANA-010.

## Current task

### ANA-009 — Quality: loop test, package smoke, README, Integration.md
- Branch: `feat/ana-009-quality`
- Status: IN REVIEW
- Acceptance: loop test with 1 000 iterations of track -> link -> count -> funnel -> journey, concurrency 20, injected retryable store failure on every 7th event, asserting exact counts, cached = fresh, bounded cache and that `track` never throws with a dead store; package smoke runs the real API through `require` and `import` and checks the typed prod config error; README (quick start, prod setup, API, vendor swap, errors); Integration.md rewritten to the real API, options, mapping tables, event contract (ANA-16), open questions, status.
- Assumed missing: the event contract in the README/Integration is a proposal derived from `WAB-Server/src/constants/analytics.ts` and the PRD sections 14, to be confirmed with the app teams.
- Tests: `npm run verify` green (unit tests with the gate, build, smoke, loop).
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — QA found the loop test racing on timestamps (parallel tracks of one actor) and a range beyond the 92-day cap; both were test defects, fixed.

### ANA-008 — Identity linking
- Status: DONE (PR #233)
