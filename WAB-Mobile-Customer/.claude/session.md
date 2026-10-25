# WAB-Mobile-Customer — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next customer`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Consumes `/customer/v1` (51 ops) through DTOs generated from `WAB-Server/docs/api/openapi.customer.json` (CUS-009); dev builds use `DATA_SOURCE=remote` against the hosted dev API (CUS-060); gap list `docs/REMOTE_DEV_GAPS.md`.
- Done before the backlog: rules, variants + CI, policy checks, design system, base components, language/theme, permissions, refresh interceptor (CUS-001…003, 005, 007, 008, 014…017).
- Payments through the `wab-payments` KMP launcher (CUS-047 ← PAY-011); push via FCM facade (CUS-004); Firebase apps registered (dev + prod).

## Current task

### CUS-088 — Re-sync the customer contract 1.3.0 after SRV-151 (`./gradlew apiSync`)
- Branch: `feat/cus-088-contract-sync` (from `origin/customer`)
- Status: IN REVIEW
- Acceptance criteria (CUS-088 row; `openapi.customer.json` 1.3.0: `POST /customer/v1/salons/{salonId}/availability`, `POST /customer/v1/bookings/drafts`, id `pattern`s):
  - [x] `api_sync.py` re-run: snapshot 4fde7a6f (1.2.0 → 1.3.0); `api_sync --check` ok; DTO changes: availability `others[].start/end` and draft `persons[].start` are non-null `String`; ids `^[a-fA-F0-9]{24}$` (snapshot only; the app does not validate patterns)
  - [x] Every request builder sends the times: `availabilityBodyOf` already sends only picks with staff + start + end (CUS-060); `draftBodyOf` returns `null` when a person has no slot and `BookingDraftRepositoryImpl.create` answers `AppError.UnknownError` without a request (the flow cannot reach the summary without a slot, so this is a guard, not a UI path); no other body carries a time
  - [x] Fixtures: regenerated `MockFixtures`/`ContractDecoders` (only the sha header changed; response shapes unchanged, captured ids already ObjectIds); `contract_gaps.py` 0 gaps
  - [x] `docs/REMOTE_DEV_GAPS.md`: rows 13, 14 Fixed (SRV-151 + this re-sync), 15 and 17 fixed on the server (not re-captured against the hosted dev API), row 1 notes the 1.3.0 snapshot
- Tests: new `ContractV13RequestBodiesTest` (5: wire JSON of draft `persons[].start` and availability `others[].start/end`, no draft body without a slot, repository sends nothing for an incomplete draft, real fixture ids match the pattern); `BranchRequestBodiesTest` adapted (nullable body); `feature/booking/data` commonTest gets `kotlinx-coroutines-test` + `ktor-client-mock` (catalog entries already used by other data modules). `./gradlew testAndroidHostTest --continue` (Terminal panel) exit 0, 429 host tests, 0 failures; `policy_checks.py all` ok; `scripts/ci/tests` 89 OK; `api_sync.py --check` ok; `contract_gaps.py` 0
- Loops: 1/1 — §3.13 batch form (host unit tests only) on the final tree; re-checked each criterion against the regenerated DTOs and every generated `*Body` (only availability + drafts carry times); found and fixed: one 142-char test line (detekt MaxLineLength 140), `BranchRequestBodiesTest` relying on a non-null draft body
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — code reading of the branch diff: generated files untouched by hand; the missing-slot guard lives in data (mapper + repository) and never sends an invalid body; error text stays the localized generic one; contract change is additive for the app (no new operation); no UI/strings changed
- Notes: DEVIATIONS — no detekt, no Android/iOS variant builds, no emulator/simulator (rules §3.13; the lead runs the final gate); fixtures not re-captured (the hosted dev API may not run SRV-151 yet; seed and rate-limit fixes unverified from the client).

### CUS-060 — Dev builds on `DATA_SOURCE=remote` against the dev API: per-feature gap list, socket events verified, fixtures updated to real shapes
- Branch: `feat/cus-060-remote-dev` (from `origin/customer`)
- Status: DONE
- Acceptance criteria (CUS-060 row; `openapi.customer.json` all operations the app calls; BUSINESS_DOMAIN §7 sockets, §11 error codes):
  - [x] Dev uses `remote` against the dev host on Android (`DEV_DATA_SOURCE`, `DEV_API_BASE_URL`) and iOS (`Dev.xcconfig` `DATA_SOURCE`, `API_BASE_URL`, same host); prod never `mock`; no URL in code
  - [x] Real responses captured for 46 of the 48 operations the app calls (`scripts/capture_remote_fixtures.py`: public ones from the hosted dev API, authenticated ones from the local real stack on a throwaway customer deleted afterwards; tokens / signed URLs redacted, local media → dev CDN) into `core/data/fixtures/remote/`; not captured: `POST /uploads/confirm`, `PUT /profile/avatar` (need a real image upload)
  - [x] Wire vs contract: `scripts/contract_gaps.py` = 0 gaps (missing / null / type / enum / undeclared) for all captured envelopes
  - [x] Contract drift fails a test: `api_sync.py` embeds the captures in `MockFixtures` (`captured` set; `data` last so Empty works with `meta`) and generates `ContractDecoders` (commonTest); `ContractFixturesTest` decodes every fixture with the generated DTOs + the app's `NetworkJson`; per-feature `Real*Fixture(s)Test` run the mappers on the real shapes
  - [x] Mock/dev fixtures are the real shapes (mock mode serves the captured envelopes)
  - [x] Client gaps fixed: availability `others[]` now sends `start` + `end` (server rejected `end` missing → `VALIDATION_ERROR`; `DraftPerson.end` from the picked slot); realtime de-duplication no longer drops a real second `booking.updated` with the same status (key + payment status, 5 s window); contract re-synced (drafts `branch`, bookings `requestedAt`)
  - [x] Socket events verified on the local stack: `booking.updated` summary on create/cancel, `notifications.unread {count}`, bad token → `connect_error` `UNAUTHORIZED`
  - [x] Gap list per feature with fix + status: `docs/REMOTE_DEV_GAPS.md` (fixed / verified / server-side / open)
- Tests: `./gradlew testAndroidHostTest --continue` (Terminal panel) → BUILD SUCCESSFUL, 424 host tests, 0 failures; new: `ContractFixturesTest` (3), `RealHomeFixtureTest` (1), `RealSalonsFixtureTest` (1), `RealSalonFixturesTest` (3), `RealBookingFixturesTest` (3), `RealBookingsFixturesTest` (3), `RealNotificationsFixtureTest` (2), `RealProfileFixturesTest` (2), `RealAuthFixturesTest` (2), `RealtimeRefreshTest` (+2), `SocketIoProtocolTest` (+1), `BookingFlowViewModelTest` (slot end); Python `scripts/ci/tests` 89 OK (new `test_contract_gaps.py` 6, `test_dev_remote_config.py` 3, `test_api_sync.py` +2); `policy_checks.py all` ok; `api_sync.py --check` ok
- Loops: 1/1 — §3.13 batch form (host unit tests only): re-checked every criterion on the final tree with `testAndroidHostTest` (424, 0 failures), Python tests (89 OK), policy `all: ok`, `api_sync --check` ok, `contract_gaps` 0; found and fixed during the loop: `collapse()` joined paths without dots (caught by its test), `BookingsApiTest` missing the new required `requestedAt`, six test lines over 140 chars, capture rate-limited on the shared stack (retry on 429), signed upload URL and local media origin in fixtures (redacted / rewritten)
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — code reading of the branch diff: one JSON config (`NetworkJson`) for client and tests; generated decoders keep the drift check free of hand-kept lists; capture tool refuses non-local auth bases and never commits credentials; fixes are in data/domain with tests; no UI/strings added. Non-blocking: toggling services after a slot pick keeps the old `start`/`end` (pre-existing; the draft call re-validates server-side)
- Notes: DEVIATIONS — no detekt, no Android/iOS variant builds, no emulator/simulator run (rules §3.13: the lead runs the full gate at the end); the app itself was not run against the dev host on a device. Captures are English only (mock mode shows English data for captured operations in the Arabic UI). `capture_remote_fixtures.py` writes its call report to `build/remote-capture-report.json` (not committed). Server-side items (spec nullability of `others[]`, `/i` in ObjectId patterns, Arabic seed text in EN, OTP limiter on catalog/banners/profile) are listed, not edited.

### CUS-087 — Bookings list/details, notifications and the review flow show the branch (name + address); review attaches the branch
- Branch: `feat/cus-087-bookings-branch` (from `feat/cus-086-booking-branch`)
- Status: IN REVIEW
- Acceptance criteria (BUSINESS_DOMAIN §5.11, §5.18; `GET /customer/v1/bookings`, `GET /customer/v1/bookings/{id}`, `POST /customer/v1/salons/{id}[/staff/{memberId}]/reviews`):
  - [x] Bookings list card: "Branch: ‹name›" under the salon name; booking details salon block: branch name + address (`BookedBranchLines`); nothing for bookings made before branches
  - [x] Booking details Call / WhatsApp use the booked branch's phone and WhatsApp (salon profile `forBranch(booking.branch)`), image stays salon-wide
  - [x] Rating flow (S18): every step carries the booked branch, the salon step shows it, and both salon and staff reviews send `branchId`; `ReviewDraft.branchId` → review bodies
  - [x] Notifications: tapping a booking notification opens booking details, which shows the branch; the notification list text itself is rendered by the server (`GET /notifications` has no branch field)
- Tests: `RatingStepsTest` (+1), `RatingViewModelTest` (+1), `BookingDetailsViewModelTest` (+1), `ReviewsRepositoryTest` (1, request bodies); `testAndroidHostTest` exit 0 (401 host tests, 0 failures), `run_detekt.sh` exit 0, policy `all: ok`
- Loops: 1/1 — own unit-test run on the final tree (`./gradlew testAndroidHostTest`, 401 tests, 0 failures) + detekt + policy; found and fixed: MockEngine test without JSON content type / with an unparsable `data`, one detekt MaxLineLength in `ReviewsRepositoryImpl`
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — branch display is one shared composable; review branch flows domain → data body; contacts reuse `forBranch`; strings AR+EN. DEVIATIONS: notification rows cannot show the branch client-side (no contract field; server text); reviews written from salon details (not from a booking) stay salon-wide (no branch picker), as BUSINESS_DOMAIN §5.11 allows; UI not opened on a device.
- Notes: `feature/salon/data` gets `kotlinx-coroutines-test` + `ktor-client-mock` for tests (catalog entries already used by other data modules; no new library).
