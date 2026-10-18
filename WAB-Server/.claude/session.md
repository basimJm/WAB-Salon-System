# WAB-Server — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next server`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)

- Serves `/customer/v1` (51 ops), `/merchant/v1` (71), `/admin/v1` (116) + Socket.IO; contract = `docs/api/openapi.*.json` regenerated with `npm run docs` every task.
- Providers: notifier **real** (`wab-notifications`); analytics **real** (`@wab/analytics`, SRV-110); otp / storage / payments on in-repo fakes until SRV-034 / SRV-112 / SRV-092 (other SDK tasks).
- Open work: SRV-111 contract guard, Stage N (SRV-117…128, admin gaps), Stage O (SRV-129…134, merchant gaps). Deployment SRV-011/116 and SRV-059/115: owner (PENDING).

## Current task

### SRV-110 — `ANALYTICS_PROVIDER=real` through `@wab/analytics`

- Branch: `feat/ana-010-publish` (shared with ANA-010: package prep and the server wiring in one PR)
- Status: IN REVIEW
- Acceptance criteria (BE/NFR: ANA-03, ANA-04 via the package; server rules §2 externals behind interfaces, §5 no hardcoding, §8 provider errors):
  - [x] `@wab/analytics` dependency (`file:../wab-analytics`, built by `ensure-sdks`, Dockerfile + dockerignore), `@google-cloud/bigquery` for the warehouse
  - [x] Env keys `ANALYTICS_BIGQUERY_PROJECT_ID|DATASET|LOCATION|CREDENTIALS_JSON|CRASH_TABLE|MAX_BYTES_BILLED` in constants, schema, `.env.example`; project and dataset together; credentials must be a JSON object (never echoed); production requires project, dataset and credentials
  - [x] `providers/analytics/real.ts`: SDK over `serverEvents` (ObjectId codec) and `identityLinks`, Redis result cache, BigQuery when configured; caller errors -> `RangeError`, vendor errors -> `ExternalServiceError`; indexes created on start (failure logged); closed on shutdown; `sdk` exposed for funnels/cohorts/journey/overview
  - [x] `createProviders` builds it with `mongoose.connection`; without a connection or deps it fails loudly
  - [x] The existing Mongo-backed admin analytics (SRV-105) is untouched; admin gap tasks (SRV-117+) are NOT done here
- Tests: `tests/analyticsReal.test.ts` (19: options, codec, error mapping, stubbed SDK, real SDK over fake collections, createProviders) + config tests (analytics settings, production requirements)
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — NOT verified: a real MongoDB write/read through the package, a real BigQuery dataset or credentials, the Docker build (no daemon). API docs: no change.

## Last blocks

### T-123 — Wire `wab-notifications` into WAB-Server (`NOTIFIER_PROVIDER=real`)

- Branch: `claude/busy-johnson-2rch94` (PR #129, merged to `server`)
- Status: DONE
- Acceptance criteria: `file:../wab-notifications` dependency + `ensure-sdks`; env keys FCM__/SMTP__/EMAIL_FROM_*; adapter maps SDK errors → `ExternalServiceError`; closed on shutdown; Docker image builds from the repo root
- Tests: `npm test` 2420; lint/format/typecheck/build green; `tests/notifierReal.test.ts` (16)
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — NOT verified: real SMTP send (App Password pending), Docker build (no daemon). API docs: no change.
