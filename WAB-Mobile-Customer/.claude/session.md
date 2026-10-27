# WAB-Mobile-Customer — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next customer`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Consumes `/customer/v1` (51 ops) through DTOs generated from `WAB-Server/docs/api/openapi.customer.json` (CUS-009); dev builds use `DATA_SOURCE=remote` against the hosted dev API (CUS-060); gap list `docs/REMOTE_DEV_GAPS.md`.
- Done before the backlog: rules, variants + CI, policy checks, design system, base components, language/theme, permissions, refresh interceptor (CUS-001…003, 005, 007, 008, 014…017).
- Payments through the `wab-payments` KMP launcher (CUS-047 ← PAY-011); push via FCM facade (CUS-004); Firebase apps registered (dev + prod).

## Current task

### CUS-094 — Device integrations: call, WhatsApp, permissions, camera/gallery upload, location, maps (Android + iOS)
- Branch: `fix/cus-094-device-integrations`
- Status: IN PROGRESS
- Acceptance criteria (PRD S03 nearest, S07 items 4–5, S15 contact, S21 photo + push + contact, S23 contact; PRD §3.16 uploads):
  - [ ] Call: dialer opens with a dialable number (`+` and digits only) on Android (`ACTION_DIAL`, no CALL_PHONE) and iOS (`UIApplication.open`); a device without a phone app shows a localized message, never a crash
  - [ ] WhatsApp: `https://wa.me/<digits>` (works without the app); Android `<queries>` for WhatsApp packages; iOS `LSApplicationQueriesSchemes` `whatsapp`; no handler → message
  - [ ] Maps: Android `geo:` chooser when a maps app exists, else the Google Maps web URL; iOS Google Maps app when installed (`comgooglemaps`), else Apple Maps; no handler → message
  - [ ] Every iOS hand-off (tel, WhatsApp, maps, mail, browser, settings) uses `open(_:options:completionHandler:)` (the deprecated `openURL:` is a no-op on iOS 18+); share sheet presents from the top view controller with an iPad popover anchor
  - [ ] Permissions: camera denied → message, blocked → settings dialog; notifications blocked → settings dialog; location unchanged flow; permission requests survive Activity recreation; iOS usage strings AR + EN (camera text = profile photo)
  - [ ] Camera/gallery: Android Photo Picker + full-resolution `TakePicture` through a FileProvider (no CAMERA permission needed), sampled decode + EXIF rotation; iOS PHPicker for the gallery, camera through UIImagePickerController with a strongly held delegate, unavailable camera (simulator) → message; JPEG ≤ 1024 px; presign → PUT → confirm → avatar end to end
  - [ ] Location: suspend provider with cancellation; Android fused current fix → last known, context from Koin (no `!!`); iOS CLLocationManager on the main thread, `requestLocation` + recent cached fix; authorization callbacks on main
  - [ ] Unit tests for link builders, outcomes, VM handling of unavailable hand-offs / camera / permission outcomes, image scaling math
  - [ ] Device proof: Android emulator + iOS simulator per feature (results below)
- Tests: (pending)
- Device results: (pending)
- Loops: 0/1
- Review: PENDING
- Notes: (pending)

### CUS-093 — Bride-only services, staff per person, list rejection, completed money (SRV-170, contract 1.5.0)
- Branch: `feat/cus-093-srv-170-contract`
- Status: IN PROGRESS (ready for the lead: not pushed, no PR)
- Acceptance criteria (PRD S07/S10 staff sheet, S14, S15, S16 step 1, S18; `openapi.customer.json` 1.5.0: `GET /salons/{salonId}` + `/staff/{memberId}` `services[].brideOnly`, `GET /bookings` `rejection`, `GET /bookings/{id}` `persons[].staff {firstName, photoUrl}` + `money.paidAtSalon` + `remaining` 0 once final, `POST /salons/{salonId}/staff/{memberId}/reviews`; closes E2E gaps #26 #28 #30 #33 #35):
  - [x] Contract re-synced (`api_sync.py`, snapshot 052913e6) + real fixtures re-captured from the local stack (incl. OTP request/verify, now captured); `api_sync --check` ok; `contract_gaps.py` 0; capture script picks a main-branch, non-VIP service (was a 400 on availability)
  - [x] S16 step 1 offers bride-only services only to a bride person (`UiState.offeredServices`, toggle guard); unmarking the bride drops the VIP picks (`DraftPerson.withBride`); VIP rows labelled "Brides only"
  - [x] S07 services list + service sheet and the S07a staff sheet show the bride-only label
  - [x] S15 person card: staff first name + photo (initial fallback; no line when unassigned); S18 staff step shows the photo and posts the staff review (verified live)
  - [x] S14 card shows the rejection reason on REJECTED bookings
  - [x] S15 money: "Remaining" = server `remaining` (0 once final), "Paid at the salon" row for COMPLETED, "Paid" → "Paid online"
  - [x] AR + EN strings; no hardcoded values; tests for every mapper / VM / helper change
  - [x] E2E re-run (owner request): fixed "Closed today" shown outside today's hours (cards, favorites, branch step) and system Back leaving the booking flow (`AppBackHandler`); results + Render gap in `docs/E2E_RESULTS.md`
- Tests: new `BookingFlowBrideOnlyTest` (3), `Srv170MappersTest` (3), `BookingMoneyRowsTest` (4), `FavoriteStatusTest` (1); +1 `SalonDetailsMappersTest`, +1 `StaffMappersTest`, +1 `RatingStepsTest`, `DomainCardsTest` hours rule rewritten, `ContractFixturesTest` (OTP captured). Terminal panel: `run_detekt.sh` ok; `./gradlew testAndroidHostTest --continue` 474 tests, 0 failures; `:androidApp:assembleDevDebug` ok; `:composeApp:linkDebugFrameworkIosSimulatorArm64` ok; `policy_checks.py all` ok; `scripts/ci/tests` 93 OK; `api_sync --check` ok; `contract_gaps` 0
- Loops: 1/1 — every criterion re-checked on the device (Pixel 4 AVD, local stack): VIP hidden for non-bride + companion, shown + labelled for the bride, Back returns to the person step, booking WAB-SKFH82 with staff per person, cancel → remaining 0, REJECTED reason on the card (AR + EN, dark), COMPLETED paid at salon 8.000 / remaining 0, staff rating step submitted; found and fixed in the loop: wrong duration in the new VM test, capture script over 300 lines, two detekt MaxLineLength
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — branch diff read once per role: filtering in domain helpers + VM state (no logic in composables), money/rejection decisions in pure tested helpers, mappers fall back safely (blank first name / photo), generated contract untouched by hand; AR + EN for every new text; `AppBackHandler` in the design system over `navigationevent-compose` (already in the graph, now declared, same version) instead of the deprecated `BackHandler`; Render must get SRV-170 before a dev build points at it (`brideOnly` required)
- Notes: DEVIATIONS — not pushed / no PR / not merged (lead ships); emulator = Pixel 4 AVD (2 GB, swapping; the larger AVDs were used by other agents): tapping "Dark" in the theme sheet raised a system ANR twice while the app main thread was idle (trace) — environment, dark checked via system night mode, re-check on a healthy device; iOS: only the K/N framework link, no simulator run and no Xcode scheme build; `AppBackHandler` wiring is checked on the device, not by a Compose UI test; customer-app paid/deposit flows not exercised (payments paused). I created an AVD `WAB_Customer_E2E` that never came online (deleted again) and, by mistake, closed three idle Terminal tabs from other sessions (the local stack kept running). Local overrides only (untracked `local.properties`, `androidApp/src/devDebug/AndroidManifest.xml`), never committed.

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
