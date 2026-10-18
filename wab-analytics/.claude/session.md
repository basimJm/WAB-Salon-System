# wab-analytics — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next analytics`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Server events + queries (Mongo first, BigQuery later) behind `AnalyticsProvider`; SRV-110 ← ANA-010.

## Current task

### ANA-004 — Mongo adapter (events + identity links)
- Branch: `feat/ana-004-mongo`
- Status: IN REVIEW
- Acceptance: `MongoEventStore` writes/reads the layout WAB-Server already uses (`serverEvents`: ts, name, actorType, actorId/salonId/bookingId, params, platform, appVersion) through an injected native collection and an id codec (ObjectId); count by name / Amman day, find by actors, distinct actors, all with `maxTimeMS`; `MongoIdentityStore` idempotent upserts (duplicate-key race = success) with a unique index; indexes created only by `init()`; every driver error mapped (network -> UNAVAILABLE, maxTime -> TIMEOUT, auth -> AUTH_FAILED, other server -> VENDOR_ERROR, unknown -> UNKNOWN); malformed documents -> MALFORMED_RESPONSE.
- Assumed missing: time-series collection (needs a real MongoDB; stays a plain indexed collection like WAB-Server); the identity links live in their own collection `identityLinks` (WAB-Server must allow it; `init()` creates the indexes).
- Tests: `npm run verify` green (69 tests, fake collection interprets the exact filters/pipelines the adapter sends). NOT verified against a real MongoDB.
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — QA found the fake treated ObjectId-shaped filter values as operators (would have hidden a wrong-actor bug); fixed.

### ANA-003 — Port + memory adapter
- Status: DONE (PR #213)
