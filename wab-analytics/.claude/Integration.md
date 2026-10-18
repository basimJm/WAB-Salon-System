# wab-analytics — Integration (technical implementation document)

> Single source of truth for **how this package is built and how any project uses it**. Updated after every commit/push that changes the implementation (Rules.md §14). Status legend: ✅ done · 🚧 in progress · ⬜ not started.

| Field | Value |
|---|---|
| Package | `@wab/analytics` (folder `wab-analytics`) |
| Type | Node.js package (TypeScript, npm), server only |
| BRD | `docs/WAB_Package_Analytics_BRD.md` |
| Version | 0.1.0 (feature complete; publish = ANA-010, owner) |
| Node | >= 22, TypeScript strict, ESM + CJS builds with `.d.ts` |
| Server counterpart in WAB | `WAB-Server/src/providers/analytics` (port `AnalyticsProvider`: `track`, `linkIdentity`, `countEvents`) |

## 1. Purpose and boundaries
Server events recorded with a common schema; analytics queries for admin APIs with date-range limits and max-bytes-billed guards; installation↔account identity links so journeys, funnels and cohorts merge guest and registered history; cached results.

**Not in this package:** client-side tracking (apps use Firebase directly), chart rendering, file export, alert delivery.

## 2. Architecture
```
consumer ──> createAnalytics(options, overrides?) ──> Analytics (AnalyticsProvider + init/close)
                 service (validation, retry, cache) ── queries (count, funnel, cohorts, journey, overview)
                                   ├── EventStore      : adapters/memory, adapters/mongo
                                   ├── IdentityStore   : adapters/memory, adapters/mongo
                                   ├── WarehouseQuery  : adapters/memory, adapters/bigquery (lazy @google-cloud/bigquery)
                                   └── ResultCache     : cache/stores (memory, redis) or custom
```
- `buildAdapters(options)` picks the adapters; `overrides` replaces any port (custom vendor = one object).
- Adapters never leak vendor types; vendor failures become `AnalyticsError` (§6). Vendor text stays in `cause`.
- Kernel: `errors/`, `config/options.ts` (zod), `logger.ts` (redacting), `retry.ts` (capped backoff + jitter), `range.ts`, `time.ts` (Intl day keys).

## 3. Public API
```ts
interface AnalyticsProvider {
  track(event: ServerEventInput): Promise<boolean>;                 // NEVER throws
  linkIdentity(link: {installationId; actorType; actorId}): Promise<void>;
  countEvents(q: {names?; from; to; groupBy: 'NAME'|'DAY'; timeZone?; source?: 'SERVER'|'APP'|'ALL'}): Promise<{key; count}[]>;
  funnel(def: {steps; from; to; windowMs?; source?; dropOffUsers?}): Promise<FunnelResult>;
  cohorts(def: {startEvent; returnEvent; from; to; unit: 'DAY'|'WEEK'; periods; timeZone?; source?}): Promise<CohortResult>;
  journey(actor, {from; to}, page?: {limit?; offset?}): Promise<JourneyItem[]>;
  overview({from; to}): Promise<Overview>;
}
interface Analytics extends AnalyticsProvider { init(): Promise<void>; close(): Promise<void> }
createAnalytics(options: AnalyticsOptions, overrides?: {events?; identity?; warehouse?; cache?}): Analytics
```
Ranges are half-open `[from, to)`, at most `limits.maxRangeDays` (92). `DAY` groups use the business time zone (default `Asia/Amman`). Results are JSON-safe (timestamps are ISO strings).

## 4. Configuration
| Option | Dev | Prod | Notes |
|---|---|---|---|
| `environment` | `dev` | `prod` | prod refuses the memory store and the memory warehouse |
| `provider` | `memory` (default) | `mongo` (required) | `mongo` needs `mongo: {events, identityLinks, ids?, ensureIndexes?}` (native collections) |
| `mongo.ids` | — | optional codec `{encode, decode}` | WAB-Server stores ids as ObjectId |
| `warehouse.provider` | `none` / `memory` / `bigquery` | `none` / `bigquery` | |
| `warehouse.bigquery` | `projectId`, `dataset` (+ `client` injected) | + `credentials` (service-account JSON, text or object) | `location`, `eventsPrefix` (`events_`), `intradayPrefix` (`events_intraday_`), `crashTable`, `dryRunFirst` (true) |
| `limits` | defaults | defaults | `maxRangeDays 92`, `maxScannedEvents 50000`, `maxFunnelSteps 10`, `maxCohortPeriods 12`, `maxJourneyItems 500`, `maxNames 20`, `topEvents 10`, `maxCountRows 1000`, `maxBytesBilled 10 GB` |
| `queryTimeoutMs` | 30000 | 30000 | Mongo `maxTimeMS`, BigQuery deadline |
| `retry` | `attempts 3`, `baseDelayMs 200`, `maxDelayMs 5000` | same | only retryable errors |
| `cache` | `none` / `memory` | `redis` (injected client) / `custom` | `ttlSec 60`, `staleSec 0`, `maxEntries 500`, `keyPrefix` |
| `timeZone` | `Asia/Amman` | `Asia/Amman` | IANA name |
| `sessionGapMs` | 30 min | 30 min | journey sessions |
| `idPattern`, `installationPattern` | defaults | defaults | formats of ids |
| `trackIdentityEvent` | true | true | also records `identity.linked` when a link is stored |
| `logger` | none | pino/winston adapter `(message, fields)` | fields are redacted |

Secrets (BigQuery credentials, Mongo URI) are supplied by the consumer from its own env/secret store; config errors name option paths only.

## 5. Status and result mapping
| Source result | Normalized |
|---|---|
| event stored | `true` |
| invalid event / store failure | `false` + warning (track never throws) |
| BigQuery job complete | rows (empty = `[]`, never null) |
| `rateLimitExceeded`, `quotaExceeded`, HTTP 429 | `RATE_LIMITED`, retried |
| `backendError`, `internalError`, 5xx | `ANALYTICS_UNAVAILABLE`, retried |
| `bytesBilledLimitExceeded` / dry-run estimate over `maxBytesBilled` | `ANALYTICS_QUERY_TOO_EXPENSIVE` |
| `notFound`, 404 | `ANALYTICS_NOT_CONFIGURED` |
| `accessDenied`, 401, 403 | `AUTH_FAILED` |
| `invalidQuery`, other 4xx | `VENDOR_ERROR` |
| network codes (`ECONNRESET`, `ENOTFOUND`...) | `NETWORK_ERROR`, retried |
| own deadline / Mongo `maxTimeMS` | `TIMEOUT`, retried |
| Mongo network / server selection | `ANALYTICS_UNAVAILABLE` |
| Mongo 13 / 18 | `AUTH_FAILED` |
| malformed document or row | `MALFORMED_RESPONSE` |
| anything else | `UNKNOWN` (cause kept) |

## 6. Error model
`AnalyticsError { code, retryable, cause, details }` (no secrets). Codes: `ANALYTICS_UNAVAILABLE`, `ANALYTICS_QUERY_TOO_EXPENSIVE`, `ANALYTICS_RANGE_INVALID`, `ANALYTICS_NOT_CONFIGURED`, `ANALYTICS_EVENT_INVALID`, `CONFIG_INVALID`, `VALIDATION_FAILED`, `AUTH_FAILED`, `NETWORK_ERROR`, `TIMEOUT`, `RATE_LIMITED`, `VENDOR_ERROR`, `MALFORMED_RESPONSE`, `UNKNOWN`. Retryable: unavailable, network, timeout, rate limited.

## 7. Environments
- **dev (localhost):** `memory` store + `MemoryWarehouse` (add fixtures with `addAppEvent` / `addCrash`), or Mongo on localhost; no credentials.
- **prod:** Mongo collections (Atlas) + BigQuery with a service account; Redis cache; memory refused.

## 8. Performance notes
Partitioned BigQuery access with `_TABLE_SUFFIX` pruning and a precise microsecond window; dry-run cost check and `maximumBytesBilled` on every job; Mongo indexes `{ts}`, `{name, ts}`, `{actorId, ts}`, `{bookingId, ts}` (same as WAB-Server); bounded scans (`maxScannedEvents`, flagged `truncated`); result cache with single flight and optional stale-while-revalidate; the BigQuery client is loaded lazily and reused.

## 9. Testing
- `npm test`: 150+ unit tests, one suite per area, coverage gate 100 % functions / ≥ 95 % lines and branches. Fakes: in-memory ports, a fake Mongo collection that interprets the exact filters/pipelines the adapter sends, a fake BigQuery client that records every job (parameters, types, dry run, cap).
- `npm run test:loop`: 1 000 iterations of track → link → count → funnel → journey, 20 concurrent, with an injected retryable store failure on every 7th event; asserts exact counts, cached = fresh, bounded cache, and that `track` never throws even when the store is down.
- `npm run test:smoke-package`: packs the tarball, installs it in a temp project and runs the dev flow through `require` and `import`.
- NOT verified here: a real MongoDB, a real BigQuery dataset (SQL is parameterized and reviewed, not executed).

## 10. Adoption guide (any project)
```ts
const analytics = createAnalytics({ environment: 'dev', timeZone: 'Asia/Amman' });
await analytics.track({ name: 'payment.failed', actorType: 'CUSTOMER', actorId, params: { code } });
const rows = await analytics.countEvents({ from, to, groupBy: 'DAY' });
```
**WAB-Server:** `ANALYTICS_PROVIDER=real` builds the package with `provider: 'mongo'` over the `serverEvents` collection (ObjectId codec) and, when `ANALYTICS_BIGQUERY_*` is set, the BigQuery warehouse (`WAB-Server/src/providers/analytics/real.ts`). The server keeps its own Mongo `AnalyticsProvider` port (`track`, `linkIdentity`, `countEvents`); funnels/cohorts/journey/overview are reachable through `sdk` for the admin analytics tasks.

### Event contract (ANA-16)
Names are dotted lower case (`family.action`), at most 80 characters. Params carry IDs and codes only — never phone numbers, names, tokens, OTPs, card data (keys that look secret are redacted; 8 KB limit).
| Family | Events (examples) | Typical params |
|---|---|---|
| OTP | `otp.requested`, `otp.failed`, `otp.blocked` | `purpose`, `reason` |
| Payments | `payment.started`, `payment.succeeded`, `payment.failed`, `payment.cancelled` | `code` (gateway code), `bookingId` |
| Refunds | `refund.created`, `refund.completed`, `refund.failed` | `code` |
| Bookings | `booking.created`, `booking.approved`, `booking.rejected`, `booking.cancelled`, `booking.completed`, `booking.no_show`, `booking.auto_cancelled` | `salonId`, `bookingId` |
| Jobs | `job.reminder_sent`, `job.auto_cancelled` | `bookingId` |
| Errors | `api.error` | `endpoint`, `status`, `latencyMs` |
| Push | `push.sent`, `push.failed` | `code` |
| Identity | `identity.linked` | `installationId` |
Common fields: `actorType` (`CUSTOMER`, `MEMBER`, `ADMIN`, `SYSTEM`), `actorId`, `salonId`, `bookingId`, `platform`, `appVersion`.

## 11. Open questions / assumed-missing requirements
- Mongo time-series vs plain collection (needs a real MongoDB; WAB-Server uses a plain indexed collection).
- Firebase→BigQuery export: dataset id (`analytics_<propertyId>`), streaming export enabled, Blaze plan, monthly budget, daily vs intraday overlap around the daily export.
- Crashlytics export table name; `installation_uuid` differs from the Firebase app-instance id, so crashes join mainly by user id.
- Firebase `user_id` equals our account id (apps set it at login); unlinked installations stay separate guests until the app sends the link.
- Event retention (none specified), PII review of params, archival strategy.
- Funnel/cohort definitions beyond the predefined list: callers pass step names; predefined funnels live in the consumer.
- Which producers emit `payment.*`, `booking.*`, `api.error` (WAB-Server must add the `track` calls).
- Scheduled aggregation tables in BigQuery (ANA-14) are not created by this package; the result cache is the first line of speed.

## 12. Implementation status
| Item | Status |
|---|---|
| Project scaffold (tsconfig strict, eslint, prettier, jest, build, scripts) | ✅ |
| Shared kernel (errors, config, retry, logger) | ✅ |
| Port + adapter: memory — events, identity links, warehouse | ✅ |
| Adapter: mongo — event store, identity links | ✅ (unverified against a real MongoDB) |
| Queries: count, funnel, cohorts, journey, overview | ✅ |
| Adapter: bigquery — Firebase Analytics/Crashlytics export queries | ✅ (unverified against a real dataset) |
| Result cache: memory, redis, custom, stale-while-revalidate | ✅ |
| Identity merge in funnels/cohorts/journeys | ✅ |
| Unit tests + coverage gate | ✅ |
| Loop test | ✅ |
| README + consumer smoke test | ✅ |
| Publish `@wab/analytics` (ANA-010, owner) | ⬜ |

## 13. Changelog
| Date | Version | Change |
|---|---|---|
| 2026-10-14 | 0.0.0 | Design document created from the BRD; no code yet. |
| 2026-10-18 | 0.1.0 | ANA-001…008: scaffold, kernel, port + memory, Mongo, queries, cache, BigQuery, identity merge. |
| 2026-10-18 | 0.1.0 | ANA-009: loop test (1 000 iterations, concurrency 20, injected failures), package smoke on the real API, README, event contract. |
