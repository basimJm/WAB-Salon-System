# wab-analytics — Integration (technical implementation document)

> Single source of truth for **how this package is built and how any project uses it**. Updated after every commit/push that changes the implementation (Rules.md §14). Status legend: ✅ done · 🚧 in progress · ⬜ not started.

| Field | Value |
|---|---|
| Package | `wab-analytics` |
| Type | Node.js package (TypeScript, npm), server only |
| BRD | `docs/WAB_Package_Analytics_BRD.md` |
| Version | 0.1.0 (in development) |
| Node | >= 22, TypeScript strict, ESM + CJS builds |
| Server counterpart in WAB | `WAB-Server/src/providers/analytics` (interface already in WAB-Server, fake only today) |

## 1. Purpose and boundaries
Server events recorded with a common schema; analytics queries for admin APIs with date-range limits and max-bytes-billed guards; installation↔user identity linking so journeys merge guest and registered history; cached results.

**Not in this package:** Client-side tracking (apps use Firebase directly), chart rendering, file export (backend).

## 2. Architecture
Ports and adapters:
```
consumer ──> createAnalytics(options) ──> AnalyticsProvider (port, stable interface)
                                       ├── adapters/memory   (dev: local/fake)
                                       ├── adapters/mongo
                                       ├── adapters/bigquery
                                       ├── adapters/cache-memory
                                       ├── adapters/cache-redis
```
- The factory picks the adapter from `options.provider` (+ `options.environment`). Unknown provider → `ConfigError`.
- Adapters never leak vendor types through the port; vendor responses are normalized (§5).
- Shared kernel: `errors/`, `config/` (zod-validated options), `http/` (timeouts, retry with backoff + jitter), `logger` (injected, redacting), `events` (optional hook for analytics).

## 3. Public API (port)
```ts
interface AnalyticsProvider {
  track(event: ServerEventInput): Promise<boolean>;            // never throws
  linkIdentity(link:{installationId; actorType:"CUSTOMER"|"MEMBER"; actorId}): Promise<void>;
  countEvents(q:{names?; from; to; groupBy:"NAME"|"DAY"; timeZone}): Promise<{key;count}[]>;
  funnel(def): Promise<FunnelResult>;  cohorts(def): Promise<CohortResult>;
  journey(actor, range): Promise<JourneyItem[]>;  overview(range): Promise<Overview>;
}
createAnalytics(options): AnalyticsProvider
```

## 4. Configuration
| Option / env key | Dev | Prod | Notes |
|---|---|---|---|
| `provider` | `memory` | `mongo`+`bigquery` | |
| `environment` | `dev` | `prod` | prod refuses memory |
| `mongo.uri` / collection names | localhost | secret | URI never logged |
| `bigquery.projectId/dataset/location` | emulator or fixtures | real | |
| `bigquery.credentials` | none | service account (secret) | |
| `limits.maxBytesBilled`, `limits.maxRangeDays` | small | configured | cost guard |
| `cache.ttlSec`, `cache.store` | memory | redis | order-insensitive keys |
| `timeZone` | Asia/Amman | Asia/Amman | consumer-supplied |

Rules: values come from the consumer (options/env), defaults live in `constants/`, prod refuses the fake adapter and missing secrets (`ConfigError` naming the key only).

## 5. Status and result mapping (every vendor status handled)
| Source result | Normalized |
|---|---|
| event stored | `true` |
| invalid event / store failure | `false` + logged (track never throws) |
| BigQuery job complete | rows |
| `rateLimitExceeded`, `backendError` | retried, then `ANALYTICS_UNAVAILABLE` |
| `bytesBilledLimitExceeded` | `ANALYTICS_QUERY_TOO_EXPENSIVE` |
| `notFound` table/dataset | `ANALYTICS_NOT_CONFIGURED` |
| empty result | empty array (never null) |

Unknown vendor value → `UNKNOWN` + raw response logged (redacted), never success.

## 6. Error model
All failures extend `AnalyticsError` with `code`, `retryable`, `cause`, `details` (no secrets).
| Code | When | Retryable |
|---|---|---|
| `ANALYTICS_UNAVAILABLE` | store/warehouse down | yes |
| `ANALYTICS_QUERY_TOO_EXPENSIVE` | cost guard | no |
| `ANALYTICS_RANGE_INVALID` | to<=from or beyond max range | no |
| `ANALYTICS_NOT_CONFIGURED` | missing dataset/credentials | no |
| `ANALYTICS_EVENT_INVALID` | schema violation (track returns false) | no |
Common codes for every package: `CONFIG_INVALID`, `VALIDATION_FAILED`, `AUTH_FAILED`, `NETWORK_ERROR`, `TIMEOUT`, `RATE_LIMITED`, `VENDOR_ERROR`, `MALFORMED_RESPONSE`, `UNKNOWN`.

## 7. Environments
- **dev (localhost):** `memory` adapter with seed fixtures, or Mongo on localhost; BigQuery replaced by fixtures.
- **prod:** Mongo (Atlas) + BigQuery with service account; Redis cache; memory refused.

## 8. Performance notes
Partitioned/clustered BigQuery tables with date filters mandatory; scheduled aggregation tables for dashboards; Redis result cache; Mongo indexes on `{name, ts}`, actor, booking; batch writes where possible.

## 9. Testing
- Unit tests: one test file per source file, every exported function: success, each error code, each status mapping, boundaries, idempotent replay. Vendor SDK/HTTP mocked. Coverage gate: 100 % functions, >= 95 % lines/branches.
- Loop test (`npm run test:loop`): 1 000 iterations of track → count → funnel → journey with concurrency 20 and injected store failures; asserts track never throws, counts exact, cache hits identical to misses, no leaks.
- Consumer smoke test: install the built tarball into a temp project and call the factory.

## 10. Adoption guide (any project)
```ts
const analytics = createAnalytics({ environment: "dev", provider: "memory", timeZone: "Asia/Amman" });
await analytics.track({ name: "payment.failed", actorType: "CUSTOMER", actorId, params: { code } });
```
How WAB-Server adopts it: replace `WAB-Server/src/providers/analytics` real mode (`*_PROVIDER=real`) with this package; the interface is already compatible (see §3).

## 11. Open questions / assumed-missing requirements
- Mongo time-series vs plain collection (needs real MongoDB to verify; WAB-Server uses a plain indexed collection today).
- Firebase→BigQuery export dataset/table names and schema versions.
- Event retention (none specified) and PII handling.
- Funnel/cohort definitions beyond the predefined list.
- Which producers must emit `payment.*`, `booking.*`, `api.error` events (none do yet).

## 12. Implementation status
| Item | Status |
|---|---|
| Project scaffold (tsconfig strict, eslint, prettier, jest, build, scripts) | ✅ |
| Shared kernel (errors, config, http/retry, logger) | ⬜ |
| Adapter: memory — in-memory events + fixtures for dev/tests | ⬜ |
| Adapter: mongo — event store: write events, count/group queries, identity links | ⬜ |
| Adapter: bigquery — Firebase Analytics/Crashlytics export queries | ⬜ |
| Adapter: cache-memory — dev cache | ⬜ |
| Adapter: cache-redis — prod cache (injected client) | ⬜ |
| Unit tests + coverage gate | ⬜ |
| Loop test | ⬜ |
| README + consumer smoke test | ⬜ |

## 13. Changelog
| Date | Version | Change |
|---|---|---|
| 2026-10-14 | 0.0.0 | Design document created from the BRD; no code yet. |
| 2026-10-18 | 0.1.0 | ANA-001 scaffold: tooling, package `@wab/analytics`, smoke and loop harness. |
