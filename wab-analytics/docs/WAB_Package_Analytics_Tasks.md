# wab-analytics — Task Backlog

> One task = one branch = one PR into `server`. Next task: `python3 scripts/tasks.py next analytics`. Rules: `.claude/Rules.md`; target architecture and API: `.claude/Integration.md`; requirements: `docs/WAB_Package_Analytics_BRD.md`. Server counterpart: `WAB-Server/src/providers/analytics` (server events already stored in MongoDB by SRV-020/SRV-105; `SRV-110` adds BigQuery through this package). Statuses: `TODO` · `IN PROGRESS` · `IN REVIEW` · `DONE` · `PENDING` (owner) · `BLOCKED`.

| ID | Task | Branch | Needs | Status | Sources / notes |
|---|---|---|---|---|---|
| ANA-001 | Project scaffold (copy the `wab-notifications` setup): TS strict, eslint, prettier, jest, tsup, `verify`, loop-test config | `feat/ana-001-scaffold` | — | TODO | Rules §4.12 |
| ANA-002 | Shared kernel: errors, zod options (`environment`, `provider`, cache, limits: max date range, max bytes billed, timeouts), prod rules, redacting logger, constants (event schema fields, group-bys, timeZone default) | `feat/ana-002-kernel` | ANA-001 | TODO | Rules §2, §3; BUSINESS_DOMAIN server-event schema |
| ANA-003 | `AnalyticsProvider` port (`track`, `linkIdentity`, `countEvents`, `funnel`, `cohorts`, `journey`, `overview`) + memory adapter; `track` never throws | `feat/ana-003-port-memory` | ANA-002 | TODO | Integration.md §3 |
| ANA-004 | Mongo adapter: server-events collection (append-only), identity links, indexes; works with an injected Mongoose connection | `feat/ana-004-mongo` | ANA-003 | TODO | Must read the collections `WAB-Server` already writes (SRV-020, SRV-105) |
| ANA-005 | Query layer on Mongo: `countEvents` by name/day (Asia/Amman days), `funnel`, `cohorts`, `journey` (guest + registered merged through identity links), `overview` | `feat/ana-005-queries` | ANA-004 | TODO | Powers admin analytics without BigQuery (ADM-063 already consumes the server overview/events) |
| ANA-006 | Result cache: memory + Redis adapters, key = query hash, TTL from options; stale-while-revalidate optional | `feat/ana-006-cache` | ANA-005 | TODO | Rules §1.4 performance |
| ANA-007 | BigQuery adapter: Firebase Analytics export schema (events_*, user_pseudo_id, app_instance_id), Crashlytics export, date-partition pruning, `maximumBytesBilled` guard, dry-run cost check, every BigQuery error mapped | `feat/ana-007-bigquery` | ANA-005 | TODO | SRV-110 consumer; dataset/credentials are env only |
| ANA-008 | Identity linking: `app_instance_id` ↔ customer/member id merge for journeys and funnels across guest and registered history | `feat/ana-008-identity` | ANA-007 | TODO | Customer PRD §14, Merchant PRD §14 |
| ANA-009 | Unit tests per file + coverage gate, loop test (track → query, ≥ 50 iterations, concurrent), package smoke, README, `Integration.md` | `feat/ana-009-quality` | ANA-006, ANA-008 | TODO | Rules §4.11–14 |
| ANA-010 | Publish `@wab/analytics`; `WAB-Server` switches `ANALYTICS_PROVIDER=real` to the package | `feat/ana-010-publish` | ANA-009 | TODO | Owner runs the publish; unblocks SRV-110 and SRV-112 |
