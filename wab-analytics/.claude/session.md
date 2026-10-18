# wab-analytics — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next analytics`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Server events + queries (Mongo first, BigQuery later) behind `AnalyticsProvider`; SRV-110 ← ANA-010.

## Current task

### ANA-003 — `AnalyticsProvider` port + memory adapter
- Branch: `feat/ana-003-port-memory`
- Status: IN REVIEW
- Acceptance: stable port (`track`, `linkIdentity`, `countEvents`, `funnel`, `cohorts`, `journey`, `overview`) + lifecycle (`init`, `close`); ports `EventStore`, `IdentityStore`, `WarehouseQuery`; memory adapters; `createAnalytics(options, overrides)` factory (custom adapter = one override); `track` never throws and retries only retryable store errors; invalid events/links named by path only; count query validation (range, names, groupBy, time zone); `source: 'APP'` needs a warehouse.
- Assumed missing: the four richer queries answer `ANALYTICS_NOT_CONFIGURED` until ANA-005; actor type/id/installation formats are generic patterns (overridable) because the BRD defines no format.
- Tests: `npm run verify` green (47 tests; gate met).
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — QA: DAY grouping verified at Amman midnight (21:00Z), half-open range, desc tie order.

### ANA-002 — Shared kernel
- Status: DONE (PR #208)
