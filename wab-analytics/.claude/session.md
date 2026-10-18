# wab-analytics — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next analytics`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Server events + queries (Mongo first, BigQuery later) behind `AnalyticsProvider`; SRV-110 ← ANA-010.

## Current task

### ANA-010 — Publish preparation + WAB-Server switches to the package
- Branch: `feat/ana-010-publish`
- Status: IN REVIEW (the registry publish itself is run by the owner)
- Acceptance: `@wab/analytics` 0.1.0 ready to publish to GitHub Packages (`publishConfig` restricted, `repository`, `files` = dist + README + CHANGELOG, `.npmrc` scope, `prepublishOnly` = `verify`, `pack:check` dry run lists 9 files / 117 kB), CHANGELOG; WAB-Server depends on `file:../wab-analytics` (like notifications; switches to the registry version after the owner publishes) and `ANALYTICS_PROVIDER=real` builds the package over the `serverEvents` collection (ObjectId codec), the identity-links collection, the Redis cache and, when configured, BigQuery.
- Not done by design: the publish (needs the owner's registry token) and any admin gap task (SRV-117+).
- Tests: `npm run verify` green here; server gate recorded in `WAB-Server/.claude/session.md` (SRV-110).
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔)

### ANA-009 — Quality gates
- Status: DONE (PR #238)
