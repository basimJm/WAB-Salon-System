# wab-analytics — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next analytics`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Server events + queries (Mongo first, BigQuery later) behind `AnalyticsProvider`; SRV-110 ← ANA-010.

## Current task

### ANA-007 — BigQuery adapter (Firebase Analytics + Crashlytics exports)
- Branch: `feat/ana-007-bigquery`
- Status: IN REVIEW
- Acceptance: `WarehouseQuery` over BigQuery with an injected or lazily loaded `@google-cloud/bigquery` (optional peer dependency); ONLY parameterized SQL (caller values travel as typed params; table names come from validated identifier options); partition pruning by `_TABLE_SUFFIX` (padded by one day) on `events_*` and `events_intraday_*`; precise microsecond window; `maximumBytesBilled` on every job plus a dry-run estimate that refuses expensive queries before running; query deadline; job labels; every vendor reason/HTTP/network error mapped (rate limit, backend, too expensive, not found, auth, timeout, invalid query, unknown) with vendor text only in `cause`; Firebase `event_params` flattened and redacted; Crashlytics rows from a configured table; credentials JSON validated without echo.
- Assumed missing: dataset/table names (`events_`, `events_intraday_`, `crashTable`) are options (Firebase default layout); Crashlytics `installation_uuid` is NOT the Firebase app-instance id, so crashes join mainly through `user.id`; daily and intraday exports may double count for a moment around the daily export; param-value types limited to string/number.
- Tests: `npm run verify` green (145 tests, fake client records every job; the real package constructor is exercised offline). NOT verified: a real dataset, real credentials, SQL syntax against BigQuery (no dry-run possible here).
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — QA: injection attempt in names/ids stays in params; every param has a declared type; dry-run refusal never runs the job.

### ANA-006 — Result cache
- Status: DONE (PR #224)
