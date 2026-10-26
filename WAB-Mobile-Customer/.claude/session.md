# WAB-Mobile-Customer — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next customer`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Consumes `/customer/v1` (51 ops) through DTOs generated from `WAB-Server/docs/api/openapi.customer.json` (CUS-009); dev builds use `DATA_SOURCE=remote` against the hosted dev API (CUS-060); gap list `docs/REMOTE_DEV_GAPS.md`.
- Done before the backlog: rules, variants + CI, policy checks, design system, base components, language/theme, permissions, refresh interceptor (CUS-001…003, 005, 007, 008, 014…017).
- Payments through the `wab-payments` KMP launcher (CUS-047 ← PAY-011); push via FCM facade (CUS-004); Firebase apps registered (dev + prod).

## Current task

### CUS-093 — Bride-only services, staff per person, list rejection, completed money (SRV-170, contract 1.5.0)
- Branch: `feat/cus-093-srv-170-contract`
- Status: IN PROGRESS
- Acceptance criteria (PRD S07/S10 staff sheet, S14, S15, S16 step 1, S18; `openapi.customer.json` 1.5.0: `GET /salons/{salonId}` + `/staff/{memberId}` `services[].brideOnly`, `GET /bookings` `rejection`, `GET /bookings/{id}` `persons[].staff {firstName, photoUrl}` + `money.paidAtSalon` + `remaining` 0 once final, `POST /salons/{salonId}/staff/{memberId}/reviews`; closes E2E gaps #26 #28 #30 #33 #35):
  - [ ] Contract re-synced (`api_sync.py`, snapshot 052913e6) + real fixtures re-captured from the local stack (incl. OTP request/verify); `api_sync --check` ok; `contract_gaps.py` 0
  - [ ] S16 step 1 offers bride-only services only to a bride person; unmarking the bride drops the VIP picks; VIP rows labelled "Brides only"
  - [ ] S07 services list + service sheet and the S07a staff sheet show the bride-only label
  - [ ] S15 person card: staff first name + photo (no line when unassigned); S18 staff step shows the photo and posts the staff review
  - [ ] S14 card shows the rejection reason on REJECTED bookings
  - [ ] S15 money: "Remaining" = server `remaining` (0 once final), "Paid at the salon" row for COMPLETED
  - [ ] AR + EN strings; no hardcoded values; tests for every mapper / VM / helper change
- Tests: (pending)
- Loops: 0/1
- Review: PENDING
- Notes: (pending)

### CUS-092 — End-to-end pass against a real server: fix every defect found
- Branch: `feat/cus-092-e2e-fixes`
- Status: IN PROGRESS
- Acceptance criteria (owner request 2026-10-26; PRD S01…S24, §3.15 real-time; `openapi.customer.json` as served by the local stack; results `docs/E2E_RESULTS.md`):
  - [x] Every PRD screen walked on the Android emulator against the local stack (AR + EN, light + dark), salon actions through the merchant API; iOS simulator smoke path (launch → home → salon → sign-in)
  - [x] Each defect fixed with a unit test: S05 stale sheet after chip removal; S07 dead "See more" on reviews; S07 raw closure dates; S06 "more" on one-line texts; S16/S15 "30%%"; S15 misleading "Any available" staff; S15 raw reason code; double-tap Book now; socket dead after token expiry; Home not reloaded on language switch; Arabic/English counted texts (plurals); iOS sign-in 422 without a Firebase app-instance id
  - [x] Server-side gaps listed, not patched here (bride-only flag, customer staff per person, rejection reason in the list row, remaining after completion)
- Tests: new `FilterSheetRequestTest`, `ReviewCardStyleTest`, `ClosureDatesTest`, `BookingStaffLineTest`, `BookingReasonTextTest`, `ScreenNavigationTest`, `ExpandToggleTest`; +1 `SocketIoRealtimeClientTest`, +1 `HomeViewModelTest`, +2 `AppInstallationInfoProviderTest`; `test_localization.py` +1 (`%%` rule). Terminal panel batch gate: `policy_checks.py all` ok; `run_detekt.sh` ok (after wrapping 3 long plural lines); `./gradlew testAndroidHostTest --continue` 460 tests, 0 failures; `:androidApp:assembleDevDebug` + `:composeApp:linkDebugFrameworkIosSimulatorArm64` ok; `xcodebuild iosApp-Dev Debug-Dev` (simulator) ok; `scripts/ci/tests` localization 9 OK
- Loops: 1/1 — re-checked every fix on the device after the final build: S05 sheet clean after chip removal, no dead "See more" on S07 reviews, single-day closure text, S06 "more" only on overflow, "30%" in S16/S15, staff line hidden, localized cancel reason, Home reloads on AR/EN switch, live badge after token refresh, iOS sign-in with demo customer 2 (was 422); found and fixed during the loop: HomeViewModel over 300 lines, detekt MaxLineLength on plural call sites, a `?.` warning in the provider test
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — branch diff read once per role: fixes stay in their layer (presentation helpers pure + tested, socket retry in core/realtime without a second refresher, single-top in the shared navigator), no hardcoded values (new texts in AR + EN resources, plurals for counts), no contract change; server gaps listed in `docs/E2E_RESULTS.md` instead of client workarounds
- Notes: DEVIATIONS — not pushed / no PR (lead runs the remote loop); S24 maintenance/force-update and the 5-minute OTP expiry not exercised live (shared stack / time; unit-tested); single-top navigation and the review/service "more" toggles are covered by option/rule tests, not Compose UI tests; `InstallationInfo.UNKNOWN_INSTALLATION` (repository fallback) is still contract-invalid but no longer reachable from the app; iOS only a smoke path (no booking on iOS). Local overrides only (untracked `local.properties`, `androidApp/src/devDebug/AndroidManifest.xml`, git-ignored `iosApp/Configuration/Local.xcconfig`); never committed.

### CUS-090 — Crash fix: decoding failures become `AppError.ParseError`
- Branch: `fix/cus-090-decode-crash`
- Status: IN REVIEW
- Acceptance criteria (owner crash report 2026-10-26; rules §1.7 "failures are AppResult/AppError, never thrown"):
  - [x] Root cause: Ktor wraps body decoding failures in `io.ktor.serialization.JsonConvertException` (a `ContentConvertException`, not a kotlinx `SerializationException`), so `safeApiCall` let it escape → FATAL on `OTP request` when the hosted dev API (old server) omitted `expiresInSeconds`
  - [x] `safeApiCall` catches `ContentConvertException` → `AppError.ParseError` (the screen shows its error state instead of crashing)
  - [x] Regression test: a 200 body missing a required field → `ParseError`; proven to fail without the fix (`JsonConvertException`)
- Tests: `SafeApiCallTest` (+1, 7 total); `./gradlew :core:network:testAndroidHostTest` green; red without the fix
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — one catch in the transport layer, no behaviour change for valid responses. NOTE: the OTP screen will still show an error against the hosted dev API until it runs the new server (main sync after the owner sets the Render env, SRV-154).
