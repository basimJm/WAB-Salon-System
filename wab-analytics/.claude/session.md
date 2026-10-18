# wab-analytics — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next analytics`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Server events + queries (Mongo first, BigQuery later) behind `AnalyticsProvider`; SRV-110 ← ANA-010.

## Current task

### ANA-005 — Query layer: count, funnel, cohorts, journey, overview
- Branch: `feat/ana-005-queries`
- Status: IN REVIEW
- Acceptance: `countEvents` by name / Amman day (ANA-003); `funnel` (ordered steps, window, best attempt per actor incl. restart, users, conversion from previous/first, drop-off, median time, drop-off user lists, `truncated` when more than `maxScannedEvents`); `cohorts` (first start event in range, DAY or Monday-WEEK periods in the business zone, retention k+1 periods later); `journey` (server events + app events + crashes of every linked installation, ordered, sessions by inactivity gap, paged); `overview` (totals, unique actors, installations, top events, daily series); all validate range/names/limits; `source: 'APP'` reads the warehouse; `MemoryWarehouse` for dev/tests.
- Assumed missing: funnels/cohorts run per source (server events subject = `TYPE:id`, app events `user:<id>` else `inst:<installation>`); guest/registered subject merge is ANA-008. Weeks start on Monday. Funnel step repeats restart the attempt only before step 2.
- Tests: `npm run verify` green (86 tests): hand-computed funnels/cohorts incl. Amman day change at 21:00Z, restart, window, truncation, paging.
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — QA caught two wrong expectations in the first draft of the tests (window default and Amman cohort day) by recomputing by hand; code was right.

### ANA-004 — Mongo adapter
- Status: DONE (PR #216)
