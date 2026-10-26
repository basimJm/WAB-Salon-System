# WAB-Server — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next server`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)

- Serves `/customer/v1` (51 ops), `/merchant/v1` (71), `/admin/v1` (155) + Socket.IO; contract = `docs/api/openapi.*.json` regenerated with `npm run docs` every task.
- Providers: notifier **real** (`wab-notifications`); otp **arqam** (`wab-otp` 0.3.0, SRV-158: `ARQAM_API_KEY`, `ARQAM_TEMPLATE_AR/EN` (+ optional `ARQAM_SENDER_ID`, `ARQAM_SEND_IP`, `ARQAM_BASE_URL`) + `OTP_CODE_SECRET`/`OTP_PROOF_SECRET`; `fake` + `OTP_FIXED_CODE` for local QA; `whatsapp`/`real` refused); analytics = the server's own MongoDB events (no analytics provider; BigQuery/`@wab/analytics` dropped, owner 2026-10-19); payments **paused** (`PAYMENT_PROVIDER=disabled` in production, `fake` in dev/test; HyperPay/`@wab/payments` not used by the server); storage on the in-repo S3 code until SRV-112.
- Open work: SRV-111 contract guard, Stage N (SRV-117…128, admin gaps), Stage O (SRV-129…134, merchant gaps). Deployment SRV-011/116 and SRV-059/115: owner (PENDING).

## Current task

### SRV-161 — Admin session timeout 2 days (owner 2026-10-26)

- Branch: `feat/srv-161-admin-session-2-days`
- Branched: from `origin/server` + `origin/main` merged (already up to date); independent of SRV-160 (both add a row after SRV-159 in the backlog: trivial merge)
- Status: IN REVIEW (committed, not pushed; no PR — the lead ships it)
- Acceptance criteria (BUSINESS_DOMAIN §10 `admin.sessionIdleSec`; SRV-030 admin refresh lifetime = idle timeout; operations `POST /admin/v1/auth/verify-otp|refresh` unchanged):
  - [x] Default `admin.sessionIdleSec` = 172 800 s (2 days) in `constants/settings.ts`; `domain/settings/definitions.ts` reads that default (positive int, no upper bound server-side); BUSINESS_DOMAIN §10 updated
  - [x] Behaviour: every refresh restarts the 2-day window (sliding); 2 days without a refresh → 401 and sign-in again; access token TTL unchanged (`auth.accessTokenTtlSec` 900 s, refreshed silently by the client)
  - [x] Existing overrides: settings are never seeded (seeds/demo write none), so a database follows the new default unless an admin saved `admin.sessionIdleSec` in Admin → Settings; such a stored value wins and must be changed there (no migration: nothing was seeded explicitly)
  - [x] Contract: OpenAPI names the setting, not its value → `npm run docs` no diff, no contract bump
  - [x] Admin client follow-up named: the admin settings registry caps the field at 86 400 (`WAB-Admin-Dashboard/src/domain/settings/registry.ts`), `src/constants/session.ts` + Admin PRD §4 say 30 min — the admin agent's parallel task
- Tests (full jest 2890 green, gate static checks green): `tests/adminAuth.test.ts` (default is 2 days; token lives the idle window; refreshes keep it alive; 401 at exactly 2 days, valid one second before; setting override still read), `tests/settings.test.ts` (default registry); gate in the Terminal panel: prettier --check, eslint, typecheck, `npm run docs` (build + generate, no diff), full jest
- API docs: no change
- Loops: 1/1 — re-read BUSINESS_DOMAIN §10 and SRV-030/031 (refresh lifetime = `admin.sessionIdleSec`, rotation restarts it) against `adminAuth.service.ts` and `refreshTokens.service.ts`; grepped every 1800 / 30-minute use in WAB-Server (none left besides unrelated test values)
- Review: PASSED (SE ✔ (one constant, setting still overridable), Mobile N/A, Architect ✔ (no contract change; client follow-up named), QA ✔ (boundary at exactly 2 days + sliding refresh tested))
- Notes: DEVIATION: Admin PRD §4 still says 30 minutes (owner decision supersedes it; the PRD belongs to the admin project, updated by the admin agent).
### SRV-160 — Demo seed with multiple branches for the merchant app (owner 2026-10-26)
- Branch: `feat/srv-160-demo-branches-seed`
- Branched: from `origin/server` + `origin/main` merged (already up to date)
- Acceptance criteria (BUSINESS_DOMAIN §3.3a branches, §3.5 booking `branchId` + `branchSnapshot`, §5.16–§5.18 branch lifecycle/discovery/booking, §6 branch-scoped permissions, §7/§8 recipients; no operation changed):
  - [x] Two women's (Lamar 4 branches, Rose 3) and two men's salons (Al-Ostaz 3, Gentlemen's Corner 3) in Amman areas; specs appended so SRV-148 staff phones (merchant tooling 789000001 / 789010001 / 789010002) stay stable
  - [x] Each extra branch: place, hours (one day off), phone, services at its own prices, a bride-qualified manager on women's branches, employees with `BOOKINGS_VIEW_OWN` + `REVIEWS_VIEW`, a staff leave and a closure after the booked period; owner per salon (existing)
  - [x] Bookings 4 weeks back → 10 days ahead, ≥1 per open day (today/tomorrow included), every status, companions + brides, skills/working days/no double booking; `branchId` + `branchSnapshot` on bookings, `branchId` on transactions, refunds, ledger, reviews; notifications to the owner + branch manager + customer
  - [x] Idempotent: base data set written once (last upload = marker), each branch once (its closure = marker, written last); a branch SRV-148 created without activity is completed; ratings / customer counts recomputed from stored data
  - [x] Dev only: `assertDemoAllowed(config, databaseName)` refuses `NODE_ENV=production` unless `SEED_DEMO_DATABASE` equals the connected database name (CLI `seed:demo`, `seed:demo-images`, startup)
  - [x] `SEED_DEMO_ON_START=true` runs the seed in the background after the API is up (never throws; logs refused/failed/finished); config refuses it under production rules without `SEED_DEMO_DATABASE`; `.env.example`, `docker/env.{dev,prod}.example`
  - [x] `docs/DEMO_ACCOUNTS.md` (owner/manager/employee table), `docs/DEPLOYMENT.md` (branches + startup seed)
- Tests (full jest 163 suites / 2908 tests green on the second run; the first run under parallel load from other agents had 12 timeouts in 3 unrelated suites, e.g. `validate.test.ts`): `tests/demoBranchActivity.test.ts` (shape: genders/branch counts, roles + permissions, every status, today/tomorrow, branch ids/snapshot, skills/bride/no overlap, reviews, recipients, closure/leave dates, real Mongoose validation, determinism, unique phones/references/ids; idempotency with in-memory models: second run on another day writes nothing, SRV-148 branch completed, base once; `seedDemoOnStart` disabled/refused/seeded/failed), `tests/config.test.ts` (new keys + production rule), `tests/demoBranches|demoSeed|demoCatalog.test.ts` updated; gate: prettier --check, eslint, `tsc --noEmit`, build, `npm run docs` (no diff), full jest (see Loops)
- API docs: no change (`npm run docs` regenerated identical files)
- Loops: 1/1 — re-read §3.3a/§3.5/§5.16–§5.18/§6 against the generated rows (dumped the accounts and per-branch counts: 45–53 bookings, 15–28 reviews per branch, all 8 statuses, 36 bride bookings); found and fixed: a re-run on another day would have inserted overlapping bookings (now base-once + per-branch markers), existing SRV-148 branches had no activity (now completed), old tests assumed 3 branch specs
- Review: PASSED (SE ✔ (seed-only code; DB access stays in `branchSources`/writer; constants in `demoSeed.ts`; env via config), Mobile ✔ (merchant data: branch-scoped manager/employee accounts, today/tomorrow requests; no contract change), Architect ✔ (no API change; production guard is an explicit per-database opt-in; startup seed never blocks or crashes the API), QA ✔ (shape, rules, idempotency and guard tests; full suite green))
- Notes: DEVIATIONS: no real MongoDB run (no mongod; writes tested with in-memory models, rows validated against the real schemas); Jordan has no reserved fictional mobile range and the API only accepts `7[789]…`, so the demo keeps the existing invented `78900/78901/79900` blocks (documented); Al-Ostaz's SRV-148 extra branch is named "Shmeisani" like its main area (kept, renaming would change existing dev data).


### SRV-158 — Server adopts ARQAM OTP (owner decisions 2026-10-26)

- Branch: `feat/srv-158-arqam-otp` (with OTP-012, `@wab/otp` 0.3.0; one branch because the server uses `file:../wab-otp`)
- Status: IN REVIEW (committed, not pushed; no PR — the lead ships it)
- Acceptance criteria (BUSINESS_DOMAIN §3.1a steps 1, 5, 6, §11 `OTP_DELIVERY_FAILED`, §12.8; operations `POST /{customer,merchant}/v1/auth/otp/request|verify` unchanged):
  - [x] `OTP_PROVIDER=arqam|fake`; `whatsapp` and `real` refused at startup with the hint "must be arqam in production… whatsapp and real are no longer supported"; production = `arqam` only, fake + `OTP_FIXED_CODE` refused, `ARQAM_BASE_URL` must be https
  - [x] Env (names only in `.env.example`, `docker/env.{dev,prod}.example`): `ARQAM_API_KEY` (secret, trimmed), `ARQAM_TEMPLATE_AR`, `ARQAM_TEMPLATE_EN`, optional `ARQAM_SENDER_ID`, `ARQAM_SEND_IP` (default false), `ARQAM_BASE_URL`; `WHATSAPP_*` removed; missing values fail fast naming the keys; `env:check` uses the same schema (templates updated, tests green)
  - [x] `providers/otp/arqam.ts`: SDK `createArqamChannel` (templates `{ar, en}`, fallback `ar`) + `createSdkOtp` (Redis code store); request language → template; `req.ip` (TRUST_PROXY_HOPS aware) → `PhoneOtpService` → provider → forwarded to ARQAM only with `ARQAM_SEND_IP=true`
  - [x] Errors: ARQAM `INVALID_PHONE`/`PROVIDER_ERROR` → 422 `OTP_DELIVERY_FAILED` (request still counts, no code stored); key/credits/sender/template/request/rate limits/outages → 503 `ExternalServiceError` + `error` log (`otp provider failed`, SDK code, `arqamError`, masked phone; never key or code). No admin alert: `ALERT_KINDS` is part of the admin contract, so adding a kind would change it — logged only
  - [x] Readiness: `/ready` does NOT depend on ARQAM (existing pattern: Mongo + Redis only); startup logs the account once, non-blocking (`providers.reportOtpAccount`), a TEST key under `NODE_ENV=production` is a `warn` (hosted dev runs production rules)
  - [x] `npm run otp:arqam-check [-- --send +E164 --lang ar|en]`: account mode/balance/templates, optional test send with a random code; never prints the key; exit 0/1/2
  - [x] Contract: `npm run docs` → no change in `docs/api/**` (customer/merchant/admin/common OpenAPI and Postman identical; contract guard unchanged; no client task)
  - [x] Docs: README env table + check command, `docs/DEPLOYMENT.md`, `docs/SECURITY_CHECKLIST.md`, `.claude/Integration.md`, memory; root `INTEGRATION.md`, root `CLAUDE.md` §3 Auth, root `.claude/memory.md` OTP line, `BUSINESS_DOMAIN.md` §1/§3.1a/§12.8
  - [x] Backlog: OTP-012, SRV-158, SRV-159 (owner, PENDING) added; SRV-154…157, CUS-091, MER-072 CANCELLED (new registry status); CUS-061 / MER-055 wait for SRV-159 (ARQAM TEST key)
- Tests: `tests/otpProviders.test.ts` (ARQAM provider with a stubbed ARQAM API: body, templates ar/en, sender, base URL, IP on/off, 422 for INVALID_PHONE/PROVIDER_ERROR, 503 + error log for 8 codes, missing project, prod https + fixed code, 4/8-digit codes, account; startup report; `createSdkOtp` IP forwarding; `createProviders` arqam + report), `tests/arqamCheck.test.ts` (CLI), `tests/config.test.ts` (ARQAM keys, malformed values, retired whatsapp/real with hint, prod rules), `tests/phoneOtp.test.ts` (client IP behind a proxy reaches the provider), `tests/checkEnv|providers|payoutDetails.test.ts` updated; full gate through the Terminal panel: prettier --check, eslint, `tsc --noEmit`, `tsc -p tsconfig.build.json`, `node dist/docs/generate.js` (no diff), jest 162 suites / 2890 tests green
- API docs: no change (`npm run docs` regenerated identical files)
- Loops: 1/1 — re-read BUSINESS_DOMAIN §3.1a/§11/§12.8 against the code and tests; grepped every `WHATSAPP`/`whatsapp` use in WAB-Server (remaining ones are salon contact fields, the `otp.channel` = WHATSAPP medium setting and API descriptions that still say "on WhatsApp", all still true); found and fixed: hosted dev runs `NODE_ENV=production`, so a TEST-key startup error would have been a false alarm (now a warn), and `OTP_FIXED_CODE` cannot be used on hosted dev (guide corrected)
- Review: PASSED (SE ✔ (route → controller → `PhoneOtpService` → `OtpProvider` port over `@wab/otp`; names in constants; no secrets logged), Mobile N/A (no app or contract change), Architect ✔ (contract unchanged; vendor swap confined to `providers/otp` + config; production = arqam only), QA ✔ (every ARQAM error code → API status, IP on/off, config refusals, CLI exit codes, full suite))
- Notes: DEVIATIONS: no real call to otp.arqam.tech (no key; fetch stubbed everywhere); `tasks.py` gained a `CANCELLED` status in `.claude/projects.json` (the tool had no "won't do" status; DONE would have been false); this file was not pruned to the last 2 blocks (history kept as found).

### SRV-153 — WhatsApp phone OTP: server codes, `otp/verify`, single-use `otpToken` (owner decision 2026-10-26)

- Branch: `feat/srv-153-whatsapp-otp` (on top of `feat/otp-011-whatsapp`, `@wab/otp` 0.2.0; both ship in one PR)
- Status: IN REVIEW
- Acceptance criteria (BUSINESS_DOMAIN §3.1 OTP Redis keys, §3.1a steps 1–6, §10 `otp.*` (+ `otp.codeTtlSec`, `otp.proofTtlSec`, `otp.channel`), §11 `OTP_DELIVERY_FAILED`, §12 point 8; BRD NFR-01 OTP limits; contracts customer 1.4.0, merchant 1.5.0, admin 1.6.0, common 1.1.0):
  - [x] `POST /{customer,merchant}/v1/auth/otp/request {phone, purpose}`: OtpGate limits first, then `sendCode` in the `Accept-Language` language (ar default, `en` → template `en_US`); answer `{allowed, otpLength, resendAfterSeconds, expiresInSeconds, blockedUntil?}` (`expiresInSeconds` 0 when nothing was sent); WhatsApp refusal → 422 `OTP_DELIVERY_FAILED` (AR + EN, request still counts, no code stored); outage / auth / config / throttling / store → 503 `ExternalServiceError` logged with the SDK code, masked phone, Meta code + fbtrace id (never code, token or access token)
  - [x] NEW `POST /{customer,merchant}/v1/auth/otp/verify {phone, purpose, code}`: `assertNotBlocked` first (429 `OTP_BLOCKED`); wrong code → 401 `OTP_INVALID` + `reportWrongAttempt` (detail `body.code` says the attempts left; the 5th → 429 `OTP_BLOCKED`); no / expired / used / other-purpose code → 401 `OTP_EXPIRED` (not counted); right code → `{otpToken, expiresInSeconds}`, code deleted, gate reset
  - [x] `POST /auth/otp/wrong-attempt` removed in both namespaces (the server counts wrong codes itself)
  - [x] `idToken` → `otpToken` (max 2048) in customer login / register / change-phone / booking draft verify-otp and merchant login / change-phone / salon application / PUT payout-details; checked by `ProofVerifier` through `PhoneVerifier` (signature, expiry, phone, purpose, single use `otp:used:{jti}`); mismatch / replay / tampered → `OTP_INVALID`, expired → `OTP_EXPIRED`
  - [x] Providers: `OTP_PROVIDER=whatsapp|fake` (`real` retired); whatsapp = `createWhatsAppChannel` + Redis code store; fake = `FakeOtpChannel` + Redis (memory in tests) + dev-only `OTP_FIXED_CODE`; production refuses fake and a fixed code (config + SDK); env `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_TEMPLATE_NAME`, `WHATSAPP_API_VERSION` (opt), `OTP_CODE_SECRET`, `OTP_PROOF_SECRET` (≥ 32, distinct) fail fast; `FIREBASE_PROJECT_ID` / `FIREBASE_AUTH_EMULATOR_HOST` removed (FCM keys untouched)
  - [x] Settings `otp.codeTtlSec` 300, `otp.proofTtlSec` 600, `otp.channel` WHATSAPP (defaults in constants, read per call); error code + locales; Redis keys = the SDK's `otp:code:{purpose}:{e164}` and `otp:used:{jti}`
  - [x] Local QA: `WAB-Admin-Dashboard/qa/lib.mjs` `proof(ns, phone, purpose)` = request + verify with `QA_OTP_CODE` (default 123456; `qa/stack.sh` sets `OTP_FIXED_CODE`); `seed.mjs` / `socket-check.mjs` send `otpToken`
  - [x] OpenAPI + Postman regenerated; contracts bumped with client impact CUS-089 / MER-070; docs: README OTP env table, `docs/DEPLOYMENT.md`, `docs/SECURITY_CHECKLIST.md`, `.claude/Integration.md`, root `INTEGRATION.md` §1/§2/§4, root `CLAUDE.md` §3 Auth, root memory OTP line; `.env.example` + `docker/env.*.example` templates
- Tests: `tests/phoneOtp.test.ts` (request: language, settings, countdown, block, 422 AR/EN, 503 per SDK code, purposes, validation; verify: token single use, settings TTL, phone/purpose binding, foreign/tampered, wrong-code countdown + block, expired/other purpose/other phone, validation, route removed, IP limit, 503), `tests/otpProviders.test.ts` (WhatsApp provider with a stubbed Meta API: template body, language, URL/version, HMAC only, no secrets in logs, 131026 → 422, 401 → 503, missing account, fixed code refused in prod, settings rebuild; fake provider; SDK error mapping; `PhoneVerifier` × every purpose: valid once, replay, cross-purpose, other phone, expired, tampered, foreign, blocked; `createProviders`), `tests/config.test.ts` (missing keys, malformed values, distinct secrets, retired `real`, production refuses fake / fixed code), `tests/customerAuth|merchantAuth|salonApplication.test.ts` (real signed tokens via `tests/helpers/otp.ts`; replay + wrong purpose on login), booking stubs assert `BOOKING_CONFIRMATION`, `tests/settings|errors|checkEnv|providers.test.ts` updated; full gate (see Notes)
- API docs: customer + merchant (+ error enum in admin/common) regenerated; `contract:bump` customer 1.4.0, merchant 1.5.0, admin 1.6.0, common 1.1.0
- Loops: 1/1 — re-read BUSINESS_DOMAIN §3.1 (Redis keys), §3.1a steps 1–6, §10 `otp.*`, §11 and §12.8 against the code, tests and the regenerated customer/merchant contracts; grepped every `idToken` / `wrong-attempt` / `fake-otp` / `FIREBASE_PROJECT_ID` use in WAB-Server and the admin QA scripts; found and fixed: single-use tokens reused across tests (salon application BODY), config tests building providers without `otp` settings, booking stubs not checking the purpose
- Review: PASSED (SE ✔ (layers: route → controller → `PhoneOtpService` → `OtpProvider` port over `@wab/otp`; constants/locales; no secrets or codes logged), Mobile ✔ (breaking contract named for CUS-089 / MER-070 with every field and route; AR + EN messages), Architect ✔ (contracts bumped; production = whatsapp only, fake + fixed code refused; Firebase stays for push), QA ✔ (every consumer purpose: valid once / replay / wrong phone / wrong purpose / expired / tampered; full gate green))
- Notes: full gate run in the Terminal panel (local ports): prettier --check, eslint, `tsc --noEmit`, `tsc -p tsconfig.build.json`, jest 161 suites / 2859 tests green. DEVIATIONS: tools run directly from a symlinked `node_modules` (npm cache is root-owned; `ensure-sdks` skipped; `@wab/otp` built from this branch with `tsup`); `npm audit --omit=dev` not run (npm cache); no real call to graph.facebook.com (Meta account is SRV-154, owner); `contract:bump` only bumps minor versions, so the breaking change is a minor bump with BREAKING in the note; mobile capture scripts not changed (client tasks). Client impact CUS-089 / MER-070 (BREAKING: new verify step, `idToken` → `otpToken`, wrong-attempt route gone; the mobile `scripts/capture_remote_fixtures.py` + `config/remote-capture.json` still send `fake-otp:` proofs and must move to request + verify with the fixed code there). Single-use tokens: a sign-in that fails after the proof was checked (e.g. `PHONE_NOT_REGISTERED`) needs a new code.

### SRV-151 — Remote-dev contract fixes (ADM-079 S6, CUS-060 #13/#14/#15/#17, MER-054 #9/#10/#11)

- Branch: `feat/srv-151-remote-dev-fixes`
- Status: IN REVIEW
- Acceptance criteria (BUSINESS_DOMAIN §5.4 step 4 (busy intervals), §3.3/§3.3a (single-language `description`/`locationText`), §5.16 + §11 error codes (no `BRANCH_*` code for "main branch"), BRD NFR-01 (stricter limits on OTP/login/payments only); contracts customer 1.3.0, merchant 1.4.0, admin 1.5.0):
  - [x] Ids: `OBJECT_ID_PATTERN` = `/^[a-fA-F0-9]{24}$/` (no flag; zod-to-openapi copies `toString()`, so `/i` leaked into every `pattern`); same accepted ids; all three documents fixed at the source
  - [x] Companion picks: domain says a busy interval, so the validator was right; `others[].start/end` and draft `persons[].start` use `instantInput` (ISO date-time with Z/offset → Date): documented required non-nullable `date-time`, and `null` (coerced to 1970 before) is refused
  - [x] `POST /merchant/v1/salon/applications` `member` = the shared `MemberProfile` schema (firstName, lastName, phone, permissions, providesServices, branchId declared)
  - [x] Closing the main branch: code stays `INVALID_TRANSITION` (no `BRANCH_*` code fits; none invented) with its own message `branches.mainCannotClose` (top-level + `details[isMain]`); the other branch-status refusals say `branches.invalidStatus` instead of the booking-status text; AR + EN
  - [x] Demo seed: salon/branch `description` + `locationText` (single-language fields) in English for every demo salon
  - [x] Rate limits: the real defect was ONE shared Redis store (`rate:http:otp`) for every per-route limiter, so any 20 requests/min from an IP (config, banners, catalog, search…) tripped the OTP-strict routes; `ApiServices.rateLimitStoreFor(scope)` gives each family its own counter (`rate:http:<ns>:<family>`: otp, browse, booking-draft, booking, payment, payout-details, upload); OTP family only on OTP/auth/change-phone/salon application/admin login; banners, catalog, profile, config, content, locations, installations, merchant inbox → browse (300/min); uploads keep 20/min in their own counter; global limiter unchanged
- Tests: `tests/remoteDevFixes.test.ts` (patterns in every document, pick validation + spec, draft start, application member, branch messages AR/EN, seed text, limiter scopes + OTP budget isolation), `tests/merchantBranches.test.ts` (message keys); full gate (see Notes)
- API docs: customer/merchant/admin regenerated; contract bumps with client impact: customer `./gradlew apiSync` (CUS-060), merchant `./gradlew apiSync` (MER-054), admin `npm run api:sync` (ADM-079, can drop its objectId re-validation)
- Loops: 1/1 — re-checked each criterion against BUSINESS_DOMAIN §5.4, §3.3/§3.3a, §5.16, §11 and BRD NFR-01; grepped every `createOtpRouteLimiter`/`rateLimitStore` caller (found config/content/locations/installations/uploads/merchant catalog+inbox also on the OTP store) and every `z.coerce.date()` in customer pick fields
- Review: PASSED (SE ✔, Mobile ✔ (apps: decoders already tolerate; DTOs re-sync), Architect ✔ (contract bumps, backward-compatible: stricter only for null/epoch inputs), QA ✔)
- Notes: DEVIATIONS: docs/bump ran `tsc -p tsconfig.build.json` + `node dist/docs/*.js` directly (npm cache permission error; `prebuild` ensure-sdks skipped; `node_modules` symlinked from the main checkout, removed before commit). Seed is insert-only: the hosted dev DB keeps the old Arabic Lamar text until the owner re-seeds or edits it. Admin `z.coerce.date()` fields (placements, banners, campaigns, audit filters) still document `["string","null"]`: out of scope, not changed. Merchant `GET /config` maintenance on hosted dev (MER-054 #8) is a dev setting, not code.

### SRV-150 — Alerts: titles in the request language (+ both) and one uppercase subject type

- Branch: `feat/srv-150-alert-i18n`
- Status: IN REVIEW
- Acceptance criteria (server issues S11/S12 from ADM-079, `WAB-Admin-Dashboard/docs/SERVER_ISSUES.md`; BUSINESS_DOMAIN §3.7 `alerts` (updated here), §7 admin room `alert.created`; CLAUDE.md §7 admin answers carry AR + EN; operations `GET /admin/v1/alerts`, `POST /admin/v1/alerts/{id}/acknowledge` — contract admin 1.4.0, client impact ADM-079):
  - [x] S11: new alerts store `title{ar,en}` from the locale keys `alerts.<KIND>.title` (both already existed); list/acknowledge answer `title` in the `Accept-Language` language (default ar) plus `titles{ar,en}`; alerts stored before the fix (English string) read their titles from the kind, so no data migration
  - [x] Socket `alert.created` carries `title` in the default language (ar; a socket has no request language) plus `titles{ar,en}` (was English)
  - [x] S12: `ALERT_ENTITY_TYPES` (`SALON|REFUND|REVIEW|CATALOG_REQUEST`) types `RaiseInput.entityType` and the schema enum; salon deletion now raises `SALON`; demo seed wrote `salon`/`refund` and English titles, fixed; stored lowercase values are normalized on read (`normalizeAlertEntityType`; unknown → null), so no migration
  - [x] BUSINESS_DOMAIN §3.7 records `title{ar,en}`, the entityType enum and the response/socket shape (domain was silent; chose the CLAUDE.md §7 bilingual convention while keeping `title` a string for compatibility)
- Tests: `tests/alertI18n.test.ts` (9: titles per kind, stored on raise, list/ack in AR/EN/default, legacy string title, feed payload, legacy `salon`, normalizer, schema enum + both titles); `tests/accountRemoval.test.ts` asserts `entityType: 'SALON'`; full gate (Terminal panel, outside the sandbox): typecheck, build, jest 159 suites / 2803 tests green; lint + format re-run green after fixing the new test (deprecated `validateSync`) and the pre-existing prettier drift in this file
- API docs: `openapi.admin.json` regenerated (`titles` added, `entityType` enum); contract admin 1.3.0 → 1.4.0 (`contract:bump`)
- Loops: 1/1 — re-checked each criterion against BUSINESS_DOMAIN §3.7/§7, every `entityType` write in alerts (alerts.service, salonDeletion, demo seed) and every reader of `alert.title` (routes, socket; emails already used the kind's locale key)
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔ (backward compatible: `title` stays a string, `titles` added, contract bumped, ADM-079 named), QA ✔) — audit-log `entityType: 'salon'` (a different collection) is untouched on purpose
- Notes: client impact ADM-079: `alertLink` can drop the lowercase normalization; the panel may show `titles[lang]` for socket toasts. DEVIATION: docs/build ran `tsc` + `node dist/docs/*.js` directly (worktree shares the main checkout's `node_modules`, `prebuild` skipped).

### SRV-149 — Member profile carries `branchId` (gap found by MER-061)

- Branch: `feat/srv-149-member-profile-branch`
- Status: IN REVIEW
- Acceptance criteria (BUSINESS_DOMAIN §6 branch scope; operations merchant login/refresh/application, `GET /merchant/v1/me` — contract merchant 1.3.0, client impact MER-061):
  - [x] `MemberProfile` (login, refresh, salon application, `/me`) has `branchId`: the member's branch, `null` for the owner; `/me` no longer adds it separately
  - [x] `contract:bump` fixed: it silently wrote nothing when the stored note contained braces (`{id}`); it now matches the whole entry, fails loudly when nothing matched, and the replacement is a tested helper (`replaceContractEntry`)
- Tests: `tests/memberProfileBranch.test.ts` (1), `tests/contractGuard.test.ts` (+1); full gate
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — the bump bug was caught by the guard test itself (merchant fingerprint stayed old).

### SRV-128 — Customer/merchant contract review (+ SRV-128a, SRV-128b)

- Branch: `feat/srv-128-contract-review`
- Status: DONE (PR #414)
- Acceptance criteria (Customer PRD §13, Merchant PRD §15, INTEGRATION.md §3; contracts merchant 1.2.0, customer 1.2.0):
  - [x] Every capability listed in both PRDs mapped to an operation (notes in `.claude/Integration.md`)
  - [x] Gaps added as rows and fixed here: SRV-128a `GET /merchant/v1/bookings/{id}/eligible-staff?personIndex=` (BOOKINGS_OPERATE, salon + branch scope, same rules as the admin list); SRV-128b customer draft response `branch {id, name, locationText}`
- Tests: `tests/contractGaps.test.ts` (3); full gate
- Loops: 1/1
- Review: PASSED (SE ✔ (the admin eligible list gained an optional merchant scope instead of a copy), Mobile ✔, Architect ✔ (both contracts bumped), QA ✔) — NOTE: SRV-128a/b were built in this PR rather than separate branches.

### SRV-126 — Exports: customers and salons kinds; Arabic-capable PDF

- Branch: `feat/srv-126-exports-arabic-pdf`
- Status: DONE (PR #410)
- Acceptance criteria (Admin PRD exports (G9), BUSINESS_DOMAIN exports; operation `POST /admin/v1/exports` — contract admin 1.3.0, client impact ADM-047):
  - [x] BOOKINGS kind already existed (SRV-123); new kinds CUSTOMERS (status, gender, city, search) and SALONS (state, gender, city, subscription, search) with the columns of their admin lists
  - [x] PDF exports embed IBM Plex Sans Arabic (OFL, the font the apps already ship; `assets/fonts` + NOTICE, copied into the Docker runtime image): Arabic letters are shaped and read right to left; Arabic cells are right-aligned
- Tests: `tests/exportsArabic.test.ts` (3), `tests/exports.test.ts` (builder deps); a rendered sample page was checked visually (pdftoppm)
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔ (Dockerfile copies the fonts), QA ✔) — LIMITATION: no full Unicode bidi; punctuation between Arabic and Latin runs may sit on the wrong side. OFL licence: NOTICE names the licence and its URL; the owner may want the full OFL text added beside the fonts.

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

### SRV-011a — Hosted dev API recorded; client remote-switch tasks unblocked (owner request 2026-10-25)

- Branch: `chore/srv-011a-dev-api`
- Status: DONE
- Acceptance criteria:
  - [x] Server backlog row SRV-011a (DONE) for the owner-hosted Render dev API `https://wab-server-dev.onrender.com`; `/health` 200 and `/ready` mongodb + redis up (checked 2026-10-25)
  - [x] ADM-079, CUS-060, MER-054 depend on SRV-011a instead of SRV-011 and are TODO; SRV-011 (DigitalOcean) stays PENDING for the owner
  - [x] `tasks.py check` OK (only the known CUS-047 payments-paused note); board regenerated
- Tests: `python3 scripts/tasks.py check`; `python3 -m unittest scripts/test_tasks.py`
- Loops: 1/1 — re-checked that each client URL config (admin `.env.dev`, customer `gradle.properties`/`Dev.xcconfig`) already points at this host
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — backlog only, no code. API docs: no change.

### DOCS-OTP — WhatsApp phone OTP decision recorded; tasks for SDK, server, apps (owner request 2026-10-26)

- Branch: `docs/whatsapp-otp-domain`
- Status: DONE
- Acceptance criteria:
  - [x] Owner answers: end to end, Firebase Phone Auth removed (no SMS fallback)
  - [x] `BUSINESS_DOMAIN.md`: actors table, §3.1a WhatsApp OTP flow (server code, HMAC store, request/verify, single-use `otpToken`), Redis keys, settings `otp.codeTtlSec` / `otp.proofTtlSec` / `otp.channel`, error `OTP_DELIVERY_FAILED`, open point 8
  - [x] Backlog: OTP-011, SRV-153, SRV-154 (owner Meta setup), CUS-089, MER-070; CUS-061 / MER-055 rewritten for WhatsApp
- Tests: `python3 scripts/tasks.py check` (only the known CUS-047 note)
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — docs + backlog only. API docs: no change.
