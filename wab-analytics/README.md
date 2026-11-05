# @wab/analytics

> **Status (2026-11-04): built but not used.** WAB-Server does not depend on this package: it records its own events in MongoDB (`serverEvents`) and has no analytics provider. BigQuery was dropped by the owner on 2026-10-19 (SRV-110, SRV-127 and ADM-074…077 stay PENDING as dropped). The apps send screens and actions to Firebase Analytics and crashes to Crashlytics. The code and this document are kept for a later decision.

Provider-independent **server events** and **analytics queries** for WAB projects: record events, link app installations to accounts, and query counts, funnels, cohorts, user journeys and an overview. MongoDB holds the server events, BigQuery serves the Firebase Analytics / Crashlytics exports. Every backend sits behind a small port, so another store or warehouse is one adapter.

Technical details, options, error codes and the event contract: `.claude/Integration.md`.

## Quick start (development, no services)

```ts
import { createAnalytics } from '@wab/analytics';

const analytics = createAnalytics({ environment: 'dev', timeZone: 'Asia/Amman' });

await analytics.track({
  name: 'payment.failed',
  actorType: 'CUSTOMER',
  actorId: customerId,
  params: { code: '05' }, // IDs and codes only
}); // resolves true/false, never throws

const perDay = await analytics.countEvents({ from, to, groupBy: 'DAY' });
const funnel = await analytics.funnel({
  steps: ['signup.started', 'otp.verified', 'booking.created'],
  from,
  to,
  dropOffUsers: 20,
});
```

## Production setup of the package (MongoDB + BigQuery + Redis cache)

Not in use in WAB (see the status above); this documents the adapter.

```ts
const analytics = createAnalytics({
  environment: 'prod',
  provider: 'mongo',
  mongo: { events: db.collection('serverEvents'), identityLinks: db.collection('identityLinks') },
  warehouse: {
    provider: 'bigquery',
    bigquery: {
      projectId: process.env.BQ_PROJECT,
      dataset: process.env.BQ_DATASET, // Firebase export dataset
      credentials: process.env.BQ_CREDENTIALS_JSON, // service account, supplied by you
      crashTable: process.env.BQ_CRASH_TABLE,
    },
  },
  cache: { store: 'redis', redis: redisClient, ttlSec: 60 },
  limits: { maxBytesBilled: 5_000_000_000 },
});
await analytics.init(); // creates the Mongo indexes (idempotent)
```

`@google-cloud/bigquery` is an optional peer dependency: install it when you use the BigQuery warehouse.

## API

| Method                                                                 | Purpose                                                              |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `track(event)`                                                         | Store one server event. Returns whether it was stored; never throws. |
| `linkIdentity({installationId, actorType, actorId})`                   | Link a Firebase app-instance id to an account (idempotent).          |
| `countEvents({names?, from, to, groupBy: 'NAME' \| 'DAY', source?})`   | Counts by event name or by local day.                                |
| `funnel({steps, from, to, windowMs?, source?, dropOffUsers?})`         | Users per step, conversion, drop-off, median time, drop-off users.   |
| `cohorts({startEvent, returnEvent, from, to, unit, periods, source?})` | Retention by day or week.                                            |
| `journey(actor, {from, to}, {limit?, offset?})`                        | Timeline of server events, app events and crashes in sessions.       |
| `overview({from, to})`                                                 | Totals, unique actors, installations, top events, daily series.      |
| `init()` / `close()`                                                   | Lifecycle.                                                           |

`source` is `SERVER` (default), `APP` (BigQuery) or `ALL` (both, with linked installations merged into the account).

## Swapping a vendor

Pass your own adapter for any port: `createAnalytics(options, { events, identity, warehouse, cache })` (`EventStore`, `IdentityStore`, `WarehouseQuery`, `ResultCache`).

## Errors

Every failure is an `AnalyticsError` with `code`, `retryable`, `cause`, `details` (no secrets). Use `isAnalyticsError(error)`. Codes are listed in `.claude/Integration.md` §6.

## Scripts

`npm run verify` runs typecheck, lint, format check, unit tests with the coverage gate, build, the package smoke test and the loop test.
