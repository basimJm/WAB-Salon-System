# wab-analytics — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next analytics`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Server events + queries (Mongo first, BigQuery later) behind `AnalyticsProvider`; SRV-110 ← ANA-010.

## Current task

### ANA-006 — Result cache (memory + Redis, stale-while-revalidate)
- Branch: `feat/ana-006-cache`
- Status: IN REVIEW
- Acceptance: `ResultCache` port; `MemoryCache` (TTL, size bound) and `RedisCache` (injected client, `SET EX`); `cache.store` none | memory | redis | custom; key = prefix + kind + sha256 of the query (object-key and `names` order-insensitive, `steps` order-sensitive, dates as ISO); TTL from options; optional `staleSec` serves one stale answer while refreshing; equal concurrent misses share one computation; cache read/write failures and corrupt entries never fail a query; failures are not cached; cached answers equal fresh ones.
- Assumed missing: no invalidation on `track` (answers are at most `ttlSec` old, 60 s default, same as WAB-Server's analytics cache today); cached values are JSON-safe by construction (timestamps are ISO strings).
- Tests: `npm run verify` green (99 tests).
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — QA: concurrency (20 identical misses -> 1 computation), stale refresh failure logged, corrupt payload shapes.

### ANA-005 — Query layer
- Status: DONE (PR #219)
