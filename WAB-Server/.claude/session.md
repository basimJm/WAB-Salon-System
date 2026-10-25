# WAB-Server — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next server`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)

- Serves `/customer/v1` (51 ops), `/merchant/v1` (71), `/admin/v1` (155) + Socket.IO; contract = `docs/api/openapi.*.json` regenerated with `npm run docs` every task.
- Providers: notifier **real** (`wab-notifications`); otp **real** (`wab-otp`, SRV-034, needs `FIREBASE_PROJECT_ID`); analytics = the server's own MongoDB events (no analytics provider; BigQuery/`@wab/analytics` dropped, owner 2026-10-19); payments **paused** (`PAYMENT_PROVIDER=disabled` in production, `fake` in dev/test; HyperPay/`@wab/payments` not used by the server); storage on the in-repo S3 code until SRV-112.
- Open work: SRV-111 contract guard, Stage N (SRV-117…128, admin gaps), Stage O (SRV-129…134, merchant gaps). Deployment SRV-011/116 and SRV-059/115: owner (PENDING).

## Current task

### SRV-132 — Merchant statistics (M21), branch-scoped

- Branch: `feat/srv-132-merchant-statistics`
- Status: IN REVIEW
- Acceptance criteria (Merchant PRD M21, BUSINESS_DOMAIN §6 branch scope; operation `GET /merchant/v1/statistics` — client impact MER-043, MER-063):
  - [x] `GET /merchant/v1/statistics?from=&to=&branchId=` (`STATISTICS_VIEW`), civil days Asia/Amman both included, at most 92 days (400 otherwise)
  - [x] Bookings by appointment day in the period: by status, approval rate (approved / answered), cancellation rate, no-show rate (no-show / finished), average response minutes (request → first member answer), bride bookings, revenue in JOD (online kept net of refunds + paid at the salon on completion)
  - [x] Profile views = new `salon.viewed` server events written when a customer opens a salon page (salon-wide; index `{salonId, name, ts}`); new published reviews; average rating (salon rating, or the branch's labelled reviews for a branch)
  - [x] Per-day series (bookings, revenue) for every day; top 5 services (booking snapshot names) and staff (first name, rating) among approved/completed bookings
  - [x] Branch members get their branch only (another → 403 `BRANCH_SCOPE_DENIED`); the owner sees the salon or one branch
- Tests: `tests/merchantStatistics.test.ts` (5), `tests/salonDetails.test.ts` (+1 view tracked), `tests/audit.test.ts` (read-only `countFor` allowed); full gate 150 suites / 2755 tests
- Loops: 1/1
- Review: PASSED (SE ✔ (pure calculator + thin service; bookings of the period are loaded once, bounded by the 92-day cap), Mobile ✔, Architect ✔, QA ✔) — profile views start counting from this release (no history before).

### SRV-131 — Merchant reviews read (M20), branch-scoped

- Branch: `feat/srv-131-merchant-reviews`
- Status: DONE (PR #401)
- Acceptance criteria (Merchant PRD M20, BUSINESS_DOMAIN §5.11, §6 branch scope; operation `GET /merchant/v1/reviews` — client impact MER-042, MER-063):
  - [x] `GET /merchant/v1/reviews?target=SALON|STAFF&memberId=&branchId=` (`REVIEWS_VIEW`): published reviews newest first, paginated; first name, stars, comment, date, branch label, staff for STAFF; review id = Report reference
  - [x] Summary of the same scope: average (1 decimal), count, distribution per star
  - [x] Branch members see their branch only (salon reviews by branch label, staff reviews of their branch's staff; another branch → 403 `BRANCH_SCOPE_DENIED`); the owner sees all with an optional `branchId`
  - [x] `memberId` required for STAFF (400); unknown staff 404
  - [x] Review view mapping shared with the customer list (`createReviewViews`), no duplication
- Tests: `tests/merchantReviews.test.ts` (4) + reviews suites; full gate
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile ✔ (M20 fields), Architect ✔ (merchant namespace, permission + branch scope), QA ✔)

### SRV-148 — Branches end to end (Stage P)

- Branch: `feat/srv-148-branches-e2e`
- Status: DONE (PR #394)
- Acceptance criteria (BUSINESS_DOMAIN §3.3a, §5.16; API docs: no change in this task — contract checked after SRV-136…147):
  - [x] `seed:demo`: after the main-branch migration, Lamar gets Khalda + Dabouq and Al-Ostaz gets Shmeisani, each complete with own place, hours, prices (percent of the main branch), a branch manager (bride-qualified in women's salons) and an employee; deterministic ids, insert-only; `branchCount` synced
  - [x] `Branch` is a demo collection; every demo branch row passes the real Mongoose schemas
  - [x] Contract regenerated and compared (docs test green); client impact list per task (ADM-088…091, CUS-082…087, MER-061…066) in `.claude/Integration.md`; DEPLOYMENT.md demo section updated
- Tests: `tests/demoBranches.test.ts` (3), `tests/demoSeed.test.ts` (Branch filled later); full gate
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔ (salon legacy place/hours fields stay mirrored until every client reads branches — dropping them is a later contract change), QA ✔) — the demo seed itself was not run against the hosted dev database in this task (owner runs `npm run seed:demo`).

### SRV-135 — App Links / Universal Links for shared salon links (owner request 2026-10-21)

- Branch: `feat/srv-135-app-links`
- Status: IN REVIEW
- Acceptance criteria (Customer PRD §4.4 deep links; CLAUDE.md §5 config, §7 locales, §11 docs; client impact: CUS deep-link host):
  - [x] `GET /.well-known/assetlinks.json`: one entry per `APP_LINKS_ANDROID_PACKAGES` with `APP_LINKS_ANDROID_SHA256`; empty env → `[]`; 200 JSON, platform format (no envelope, documented)
  - [x] `GET /.well-known/apple-app-site-association`: `APP_LINKS_IOS_APP_IDS` with `/salon/*`; 200 JSON
  - [x] `GET /salon/{salonId}`: localized AR (rtl) / EN fallback page, store buttons from optional `APP_LINKS_PLAY_STORE_URL` / `APP_LINKS_APP_STORE_URL`, `noindex`, escaped output; invalid id → standard 404
  - [x] Env keys in schema, `AppConfig.appLinks`, `.env.example`, `docker/env.{dev,prod}.example` (commented); wired through `createApp` and `server.ts`
  - [x] OpenAPI (`common`) + `npm run docs` regenerated; locales AR/EN
- Tests: `tests/appLinks.test.ts` (+ config cases), `tests/docs.test.ts` expected common paths; full gate green via the Terminal panel: format, lint, typecheck, build, 135 suites / 2649 tests
- Loops: 1/1 — re-checked each criterion against the routes, config and the regenerated common document
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — root routes like health; values from env only. NOTE: owner sets the env on Render dev (package `com.fab.wab.customer.dev`, debug SHA-256) and deploys `server`.

### T-135 — Customer inserts fail with `language override unsupported: ar` (found while running the demo seed, 2026-10-21)

- Branch: `fix/srv-customer-text-index`
- Status: IN REVIEW
- Acceptance criteria (BUSINESS_DOMAIN customers `language` ar|en; CLAUDE.md §2 schema layer; API docs: no change):
  - [x] Cause: the customer text index (admin search) had no `language_override`, so MongoDB read each row's `language` field as its text-search language and refused `ar`: every insert of an Arabic-language customer failed once the index existed (registration too, not only the seed)
  - [x] The index is named `customer_search_text`, keeps `default_language: 'none'` and sets `language_override` to a field no document has
  - [x] `ensureIndexes` drops the named `RETIRED_INDEXES` (the old auto-named customer text index) before creating, so the new one can exist (one text index per collection); "index/collection not found" is fine, any other drop error stops start-up as before
  - [x] Guard: no text index in any model may read a stored field as its language
- Tests: `tests/indexes.test.ts` (+8; 2 fail without the model fix); full gate green
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — drop runs once per database (then not found), safe with several instances. NOT verified against Atlas until the demo seed reruns.

### T-134 — Demo seed for every collection (owner request 2026-10-21: dev only, realistic sample data, all collections, owner provides photos)

- Branch: `feat/srv-demo-seed-all`
- Status: IN REVIEW
- Acceptance criteria (BUSINESS_DOMAIN schemas/enums/§5 booking rules/§5.8 refunds/payout formula; CLAUDE.md §5 no hardcoding; API docs: no change):
  - [x] `npm run seed:demo` (refused in production, needs `seed:admin`) runs the reference + demo catalog seeds, then writes a linked data set to 31 collections: 10 salons in every state with owners/staff/services/hours/gallery/closures/leaves/policies/subscriptions/placements/catalog requests; 24 customers (incl. blocked + deletion pending) with installations and favorites; ~225 bookings over −28…+10 days in every status with transactions, refunds (completed/failed/pending), ledger and payouts; reviews, notifications (real locale templates), server events, banners, content, FAQs, contact, app versions, maintenance, campaigns, alerts, audit logs, exports, upload records; then stores 14 daily reports through the real reports service
  - [x] Business rules hold in the data: one gender per salon and customer, ≤ 5 companions, staff skilled in every service, bride-qualified staff for brides, inside opening hours and working days, no staff double booking, money integer fils via `calculateAmounts`, refunds via the domain calculators, ordered status history never after the run, reviews only on completed bookings, ratings from approved reviews, LIVE salons complete and visible
  - [x] Deterministic ids and choices; insert-only (existing id or natural key = left alone); every row validated against its real schema before anything is written
  - [x] `npm run seed:demo-images -- <folder>` uploads the owner's photos (sub-folders per kind, same-name match first) to the demo keys, re-encoded JPEG + list thumbnails
- Tests: `tests/demoSeed.test.ts` (18); full gate green (134 suites / 2631 tests via the Terminal panel, lint, typecheck, build, format)
- Loops: 1/1 — re-checked each criterion against BUSINESS_DOMAIN rules and the real model validators (all rows pass `validateSync`)
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — dev-only tooling, no endpoint/schema change. Not seeded on purpose: settings (missing = default), refresh tokens, booking drafts. DEVIATION: not yet run against the dev database (owner confirms the target first).
- Notes: demo phones `+96279900xxxx` / `+96278900xxxx` are invented; add them as Firebase test numbers before signing in as one.

### T-133 — Invalid stored file key must not break public lists (owner report 2026-10-20)

- Branch: `fix/srv-country-flag-key-only` (clean copy of PR #330 without an unrelated customer commit)
- Status: IN REVIEW
- Acceptance criteria (BUSINESS_DOMAIN §countries/banners/catalogServices `*Key` = stored object keys; CLAUDE.md §8/§9; client impact: admin forms for countries/banners/catalog get 400 on a URL/space/emoji key):
  - [x] Render dev: after an admin added a country, `GET /customer|merchant/v1/locations/countries` answered 500 for everyone (`RangeError storage request rejected: STORAGE_KEY_INVALID` from `getPublicUrl`); admin validation accepted any non-empty text as `flagKey`
  - [x] Admin create/update of countries (`flagKey`), banners (`imageKey.ar|en`) and catalog (`imageKey`) validate the storage object-key shape (`OBJECT_KEY_PATTERN`/`OBJECT_KEY_MAX_LENGTH`, same rule as the SDK) → 400 with the field path
  - [x] Public lists absorb an invalid stored key per row (`createSafePublicUrl`, warn log with the row id, key never logged): country kept with `flagUrl: ''`, banner left out, catalog row kept with `imageUrl: ''`; provider outages still fail the request
- Tests: `tests/invalidStoredKeys.test.ts` (19, incl. 6 bad key shapes, provider outage still fails); full gate green: 133 suites / 2613 tests (run in the Terminal panel: the sandbox blocks local ports), lint, typecheck, build, format, docs regenerated, audit 0
- Loops: 1/1 — re-checked each criterion against BUSINESS_DOMAIN (`flagKey`/`imageKey` are stored keys), the merchant countries route (same shared service) and the regenerated admin contract
- Review: PASSED (SE ✔, Mobile ✔ (apps must show a placeholder when `flagUrl`/`imageUrl` is empty; owner to note for CUS/MER phone pickers and catalog), Architect ✔, QA ✔) — the only RangeError absorbed is an invalid key; outages still 5xx; keys are not logged
- Notes: API docs: `openapi.admin.json` regenerated (pattern + maxLength on the three key fields). Existing bad rows in the database are not migrated: fix them in the admin panel.

### T-132 — Clear startup errors for invalid configuration (owner report 2026-10-20)

- Branch: `fix/srv-clear-config-errors`
- Status: IN REVIEW
- Acceptance criteria (CLAUDE.md §8 errors, §5; API docs: no change):
  - [x] The Render log only said `Invalid environment configuration: JWT_ACCESS_SECRET, PAYOUT_ENCRYPTION_KEY, CDN_BASE_URL`; the startup error now lists one line per key: not set / set but empty / invalid value, plus what a valid value looks like and how to generate it (`ENV_KEY_HINTS`); values are never printed
  - [x] `env:check` prints the same per-key reasons
  - [x] The three keys of the failed deploy were reproduced with the built server and now read clearly
- Tests: `tests/configErrors.test.ts` (5), `tests/checkEnv.test.ts`, `tests/config.test.ts`, `tests/payoutDetails.test.ts` adapted; full gate green
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — the failing deploy itself was a configuration problem (placeholder values left in three keys), not a code defect. DEVIATION: ops hints are English constants (stderr at startup, not an API response).

### T-131 — Fix the Render image build: copy `WAB-Server/scripts` into the build stage (owner report 2026-10-20)

- Branch: `fix/srv-docker-scripts`
- Status: IN REVIEW
- Acceptance criteria (CLAUDE.md §5; API docs: no change):
  - [x] The Render build log failed at `npm run build` (`prebuild` runs `node scripts/ensure-sdks.cjs`, the folder was never copied into the image): `Dockerfile` copies `WAB-Server/scripts` before the build and `Dockerfile.dockerignore` allows it
  - [x] A test derives the folders that npm scripts run from and requires them in the Dockerfile and the dockerignore (fails without the fix, proven by removing the line)
  - [x] The build stage and the runtime stage were replayed by hand in clean folders (SDK builds, server build, `npm ci --omit=dev`, `node dist/server.js` with production real-provider env reaches the MongoDB connect and nothing earlier)
- Tests: `tests/docker.test.ts` (+1, 16 in file); full gate green
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — NOT verified: an actual `docker build` (no daemon here); the hand replay mirrors the Dockerfile steps but not Alpine/musl.
- Notes: the first Render deploy exposed this; the image had never been built before.

### T-130 — Commented env templates for hosted dev and prod (owner request 2026-10-20)

- Branch: `chore/srv-env-templates`
- Status: IN REVIEW
- Acceptance criteria (CLAUDE.md §5; API docs: no change):
  - [x] `docker/env.dev.example` and `docker/env.prod.example` (renamed from `env.production.example`) list every key the server needs on a hosted service, each with a comment saying what it is and where to get it; fixed values pre-filled (providers, Gmail SMTP host/port, `TRUST_PROXY_HOPS=1`, Firebase project per environment); `PORT` left out (the host sets it)
  - [x] `env:check` tests run both templates: untouched fails and names keys only, filled passes, fakes and enabled payments refused
- Tests: `tests/checkEnv.test.ts` (10); full gate green
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — templates + docs only. NOT verified: a real deploy on Render.

### T-128 — Run any environment on any Docker host (owner order 2026-10-19)

- Branch: `chore/srv-deploy-compose`
- Status: IN REVIEW
- Acceptance criteria (CLAUDE.md §5 no hardcoding; no BUSINESS_DOMAIN change; API docs: no change):
  - [x] `docker-compose.deploy.yml`: one API per environment from a required `ENV_FILE`, built from the repository root, container port pinned to 3000, host port `API_PORT` on `127.0.0.1` unless `API_BIND` opts in, optional password-protected Redis behind `--profile redis`; no credential in the file
  - [x] `.env.*` git-ignored except `.env.example`; `docs/DEPLOYMENT.md` gains run-per-environment, keys-per-environment (local, hosted dev, prod; Atlas per environment) and how Redis works / how to run it
- Tests: `tests/dockerDeploy.test.ts` (6); `docker compose config` accepted the file; full gate green
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — config + docs only. NOT verified: an actual `docker compose up` / image build (no Docker daemon in this runner), Atlas and managed Redis connections.
- Notes: hosting product stays open (owner chose "any server"); the file is host-agnostic.

### T-127 — Deployment readiness: env templates, `env:check`, DEPLOYMENT.md (owner order 2026-10-19)

- Branch: `chore/srv-deploy-envs`
- Status: IN REVIEW
- Acceptance criteria (CLAUDE.md §5 no hardcoding, NFR config; no BUSINESS_DOMAIN change; API docs: no change):
  - [x] `npm run env:check -- <file>` validates an env file with the server's own schema and production rules and prints key names only (never values); exit 0 pass, 1 invalid, 2 usage
  - [x] `docker/env.development.example` passes as is; `docker/env.prod.example` fails until every placeholder is filled, then passes; fake providers, enabled payments and bad values are refused in production
  - [x] `docs/DEPLOYMENT.md`: local build/run, the three environments (local, hosted dev, prod), where each value comes from, release checklist, what is still owner-side
- Tests: `tests/checkEnv.test.ts` (6); full gate green (130 suites, 2578 tests, lint, typecheck, build, format, docs unchanged, audit 0, tasks.py check OK)
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — tooling + docs only, no endpoint or schema change; templates hold placeholders, no secrets. DEVIATION: the CLI prints English ops text (like `loadtest`), not locale keys (not an API response).
- Notes: Not verified: Docker build (no daemon), a real boot against Mongo/Redis.

### T-125 — Remove the analytics and payment SDK providers from WAB-Server (owner order 2026-10-19)

- Branch: `chore/srv-remove-analytics-payments`
- Status: IN REVIEW (draft PR into `server`)
- Acceptance criteria (CLAUDE.md §3/§4, BUSINESS_DOMAIN payments rules 4.10):
  - [x] No `analytics` provider: `ANALYTICS_PROVIDER` + `ANALYTICS_BIGQUERY_*`, `AnalyticsSettings`, `providers/analytics/real.ts`, `@wab/analytics` dependency, Docker/ensure-sdks entries removed; ONE `createMongoAnalytics` in `server.ts` feeds installation links and admin analytics
  - [x] No HyperPay: `HYPERPAY_*`, `PAYMENT_GATEWAY`, `PaymentSettings`, `providers/payments/real.ts`, `@wab/payments` dependency, Docker/ensure-sdks entries removed
  - [x] `PAYMENT_PROVIDER` = `fake|disabled`; production accepts only `disabled`; `DisabledPaymentProvider` answers 503 (`ExternalServiceError`, unavailable) on createSession/verify/refund/getRefund and `UnauthorizedError` on webhooks
  - [x] A paused payment start creates no transaction and no draft link (failure happens before `transactions.create`); refunds cannot exist because no payment can succeed
  - [x] Backlog: SRV-092 and SRV-110 set to PENDING by the tool (dependents ADM-075/076 → BLOCKED so `tasks.py check` stays OK)
- Tests: `tests/paymentsDisabled.test.ts` (provider), `tests/paymentsPaused.test.ts` (HTTP 503, no transaction; webhook 401), `tests/providers.test.ts`, `tests/config.test.ts`, `tests/payoutDetails.test.ts` adapted; deleted `paymentsReal`/`analyticsReal` tests
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile ✔ (apps get 503 on payment start; CUS-047/062 blocked by the owner's pause), Architect ✔, QA ✔) — NOT verified: Docker build (no daemon), real Mongo. DEVIATIONS: the owner's "delete provider" was interpreted as removing the SDK adapters/config and pausing payments (ports, fakes and the Mongo analytics kept, `wab-analytics`/`wab-payments` folders kept); `tasks.py` touched two admin backlog rows (status only) to keep `check` green.

### SRV-123 — Admin booking extras: eligible staff, reassign, cancel modes, chosen-amount refund, bookings export (G6)

- Branch: `feat/srv-123-admin-booking-extras`
- Status: IN REVIEW
- Acceptance criteria (Admin PRD A15; BUSINESS_DOMAIN §5.4 eligibility, §5.7 transitions, §5.8 refunds; client impact: ADM-071):
  - [x] `GET /admin/v1/bookings/:id/eligible-staff?personIndex` lists who could take that person (current, inactive and non-providing staff left out; rules of §5.4 + a free slot); `POST /bookings/:id/reassign {personIndex, staffId, reason}` re-checks under the staff lock (409 SLOT_TAKEN, 422 ineligible/not APPROVED/past), audits, and notifies through the existing reassign hook (customer, staff, sockets)
  - [x] `POST /bookings/:id/cancel {mode: CUSTOMER|SALON|ADMIN, reason}` on PENDING/APPROVED only: CUSTOMER = status CANCELLED_BY_CUSTOMER with the snapshotted policy refund (all while PENDING), SALON/ADMIN = CANCELLED_BY_SALON with a full refund; audited; refund + notifications through the existing hook
  - [x] `POST /bookings/:id/refund {amount (JOD string), reason}`: more than what is still refundable, zero or malformed is refused (400 `body.amount`), nothing paid online is 422, audited; a gateway outage keeps the refund pending and retries (no error); payments disabled = nothing paid = 422
  - [x] Export kind `BOOKINGS` (statuses, payment status, salon, customer, appointment day range, text) over the booking list as the admin audience, paged, EXPORT_MAX_ROWS rule
  - [x] Admin token only; contract regenerated; no hardcoded values
- Tests: `tests/bookingAdminExtras.test.ts` (13: cancel modes incl. policy refund / PENDING / deposit / pay-on-arrival / status guard, chosen-amount refund wiring + validation, eligible staff filters, reassign audit + hook, refusals) + `tests/refundService.test.ts` (+5: partial, cumulative cap, over/zero/fraction refused, nothing paid 422, gateway down keeps refund pending) + `tests/exports.test.ts` (+3: BOOKINGS paging/filters/limit/request schema); full gate green (2572 tests, lint, typecheck, build, docs, audit 0). API docs: 4 operations added under `/admin/v1/bookings/{id}/…` + export kind BOOKINGS; client impact: ADM-071.
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔)
- Notes: Assumption to confirm: cancel mode ADMIN is recorded as CANCELLED_BY_SALON (no separate status exists; history/cancellation keep the admin as actor). Reassign core refactored into one shared function for merchant and admin (merchant suite unchanged and green). Payments paused: nothing is paid online, so refund answers 422 and cancel refunds are 0; a gateway outage keeps a refund pending and retried. NOT verified: real Mongo/gateway.

### SRV-127 — Live analytics: dropped (owner 2026-10-19, analytics excluded)

- Branch: `feat/srv-127-live-analytics`
- Status: PENDING (dropped, no server code)
- Acceptance criteria (backlog/doc work only):
  - [x] SRV-123 set DONE (PR #297 merged)
  - [x] SRV-127 and SRV-110 set PENDING with the note "dropped by owner 2026-10-19: analytics excluded"; no endpoint, socket presence or counters are built
  - [x] ADM-074, ADM-075, ADM-076, ADM-077 set PENDING with the same note: the admin hides or skips those screens; if analytics ever returns, ADM-074 should depend on SRV-127 only (SRV-110 stays dropped)
  - [x] `python3 scripts/tasks.py check` OK and the board in `INTEGRATION.md` regenerated
- Tests: `python3 scripts/tasks.py check` (408 tasks OK), `python3 .claude/hooks/test_hooks.py` (25 OK)
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — DEVIATION: docs/backlog only, no product code and no unit tests (nothing to test); the analytics work was stopped on the owner's order.
- Notes: none.
