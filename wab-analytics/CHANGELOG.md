# Changelog

## 0.1.0

- First release: server events (`track`, `linkIdentity`) and analytics queries (`countEvents`, `funnel`, `cohorts`, `journey`, `overview`) behind one `AnalyticsProvider` port.
- Adapters: memory (dev/tests), MongoDB (events + identity links), BigQuery (Firebase Analytics / Crashlytics exports, parameterized SQL, bytes-billed guard), memory/Redis/custom result cache.
- Guest and registered history merge through identity links (`source: 'ALL'`).
- Typed `AnalyticsError` with 14 codes, retry with backoff, redacting logger.
