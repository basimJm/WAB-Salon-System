# wab-analytics — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next analytics`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Server events + queries (Mongo first, BigQuery later) behind `AnalyticsProvider`; SRV-110 ← ANA-010.

## Current task

### ANA-002 — Shared kernel
- Branch: `feat/ana-002-kernel`
- Status: IN REVIEW
- Acceptance: typed `AnalyticsError` + 14 codes (retryable by code); zod options (environment, provider, time zone, limits, timeouts, retry, cache, bigquery identifiers) with prod rules (memory refused, mongo + bigquery credentials required) naming only option paths; redacting logger; range guard (valid dates, to > from, max days); capped backoff retry; constants for every default.
- Assumed missing: BUSINESS_DOMAIN event schema is mirrored generically (name pattern, upper-case actor type, id/installation patterns overridable); injected clients (`mongo`, `redis`, BigQuery `client`) are typed `object` here and narrowed by the adapter tasks; sensitive-key redaction list (password/secret/token/otp/iban/card…) leaves gateway `code` readable.
- Tests: `npm run verify` green (24 tests, coverage 100%).
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — QA found zod `.default()` of nested objects mis-typed (switched to `.prefault`) and verified secrets never appear in config errors.

### ANA-001 — Project scaffold
- Status: DONE (PR #203)
