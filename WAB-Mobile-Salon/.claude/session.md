# WAB-Mobile-Salon — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next merchant`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Scaffolded (MER-001) with `KMP_TEMPLATE` from the customer app: all modules, design system (flat, design files as drawn since MER-074), sample feature; rules copied in MER-003 (until then `WAB-Mobile-Customer/CLAUDE.md` applies).
- Consumes `/merchant/v1` (merchant contract 1.6.0 since MER-075, staff photos + paid at salon; 1.5.0 MER-070, WhatsApp OTP; 1.4.0 MER-068; 1.3.0 added dashboard, reviews, statistics, my account consumed by MER-050/042/043/049); MER-004 Firebase registrations = owner.
- Real-time booking requests: socket + FCM data message, Android overlay / iOS time-sensitive actions (MER-012, MER-028…030).

## Current task

### MER-079 — Measured performance pass with the Android skills + deferred device checks of MER-076…078
- Branch: `perf/mer-079-measured-performance`
- Status: IN PROGRESS
- Acceptance criteria (owner 2026-10-27 "complete working and run skill to optimize performance"; CLAUDE.md §6; skills android-profiler, r8-analyzer, jetpack-compose-performance, anr-audit-and-fix):
  - [ ] Baseline: devRelease on the emulator against the local stack; cold start ×5 median; Perfetto startup + Home + bookings scroll + calendar day/week + request sheet (jank %, frame percentiles, main-thread hotspots); release smoke end to end
  - [ ] r8-analyzer: broad keep rules (Ktor, core.data/network/domain) narrowed, proved by the release smoke test
  - [ ] jetpack-compose-performance on the hot screens (compiler reports, stability, lazy keys, deferred reads, calendar grid); anr-audit-and-fix
  - [ ] Baseline Profile + Startup Profile if feasible
  - [ ] After: same measurements; before/after table here and in `docs/PERFORMANCE.md`
  - [ ] MER-076 device checks on Android + iOS simulator; Release-Dev iOS launch + scroll; iOS builds without `Local.xcconfig`
- Tests: pending
- Loops: 0/1
- Review: PENDING
- Notes: pending

### MER-076 — Device integrations: call, WhatsApp, permissions, camera/gallery upload, location, maps (Android + iOS)
- Branch: `fix/mer-076-device-integrations`
- Status: IN PROGRESS
- Acceptance criteria (owner report 2026-10-27; PRD M08/M09 call/WhatsApp, M13/M14 uploads + location, M04 license upload, M17 staff photos; operations `POST /uploads/presign`, `POST /uploads/{id}/confirm`):
  - [x] iOS hand-offs: every `UIApplication.openURL(_:)` (calls, WhatsApp, maps, mail, links, Settings shortcut, store link) was the one-argument API, a no-op since iOS 18 → `IosUiKit.open` (`open(_:options:completionHandler:)`, answers success); `whatsapp://` when installed (`LSApplicationQueriesSchemes`) else `wa.me`; share sheet from the top-most controller with an iPad popover anchor
  - [x] Android hand-offs: no handler (tablet without dialer, no WhatsApp/browser/maps) answered silently → `start()` reports false; one installed WhatsApp flavour (`com.whatsapp` / `.w4b`) opened directly; `<queries>` for dial/geo/https/mailto/IMAGE_CAPTURE/WhatsApp packages; store link no longer crashes without a browser
  - [x] Phones normalized before dialling (`ExternalLinks.dialable`: bidi isolates from `ltrIsolate`, spaces, Arabic-Indic digits); failed call copies the number + banner, failed WhatsApp/mail/link/maps explain (`ExternalHandoff`, AR + EN); Contact WAB WhatsApp prefilled (More, Subscription, offline banner, contact page)
  - [x] Camera was never offered on any upload (only the library) → source sheet (Take a photo / Photo library / Files for license documents) on every merchant upload: license documents, salon cover/profile, gallery, staff/member photo, my account photo, service media, catalog request image (`MediaPickHandler` + `AppMediaPicker`); camera row disabled with its reason when no camera (iOS simulator)
  - [x] Android camera: `TakePicture` into a FileProvider cache file (full resolution), CAMERA permission removed (declared-but-ungranted CAMERA makes ACTION_IMAGE_CAPTURE throw); EXIF orientation applied before crop/compress; picker requests survive activity recreation (rotation / camera app); missing picker/camera app no longer crashes
  - [x] iOS pickers: delegates were local (UIKit holds them weakly) → kept strongly while the picker is up (picker could never call back); presented from the top-most controller; camera checks AVCaptureDevice authorization first (refused → "Open settings" dialog instead of a black viewfinder)
  - [x] Location: iOS read the cached `CLLocationManager().location` (nil) → one-shot `requestLocation()` with a held delegate; Android had no timeout/SecurityException handling → `getCurrentLocation` + last-known fallback; 15 s timeout; denied / blocked / services off / not found shown on the map with Try again / Open settings (was silent or a jump to Settings); "Open in Maps" on the salon profile location
  - [x] Android 13+ notification permission was never requested → after sign-in an explanation then the system dialog, then (request answerers, once per install) the overlay explanation (`AlertsPermissionPrompt`)
  - [x] iOS usage strings rewritten for the merchant app in Info.plist + AR/EN `InfoPlist.strings`
  - [ ] Device proof on emulator + simulator — NOT DONE (owner time limit; see Notes)
- Tests: `MediaPickHandlerTest` (7), `ExternalHandoffTest` (4), `MapPickerLocateTest` (3), `AlertsPermissionViewModelTest` (3), `ExternalLinksTest` (+2), `GalleryViewModelTest` (+1), `SalonProfileViewModelTest` (+1, 1 changed), picking tests of Services/Catalog/MyAccount/Team/Registration updated to the source sheet; `./gradlew testAndroidHostTest` 188 suites / 627 tests / 0 failures, no `w:`; `run_detekt.sh` ok; `policy_checks.py all` ok; `:androidApp:assembleDevDebug` ok; `:composeApp:linkDebugFrameworkIosSimulatorArm64` ok. NOT run: `iosApp-Dev` xcodebuild simulator build, iOS K/N tests
- Loops: 1/1 — batch verification (rules §3.13) on `chore/merchant-integration-perf`: policy + detekt + host unit tests + devDebug/devRelease/prodRelease + all four iOS simulator configurations green; merged release manifest checked (POST_NOTIFICATIONS kept, no CAMERA). DEFERRED: device proof of every hand-off (emulator/simulator were taken by other agents; call + camera need a real iPhone)
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch code reading of the three branches together (manifest, AppDelegate push handling, R8/stability config); deviations listed in Loops/Notes.
- Notes: Stopped at the owner's 25-minute limit (2026-10-27). NOT done: emulator/simulator proof of each feature (the free AVD was already in use by another session), iOS `iosApp-Dev` simulator build, Personal-Team (`iosApp-Personal.entitlements`) launch check — AppDelegate only fails `registerForRemoteNotifications` there (no crash path found in code, not run). Removed dead code: `ImagePicker` port + platform pickers, `PlatformUrlLauncher`. `android.media.ExifInterface` (framework) used, no new library; design-system commonTest gained `kotlinx-coroutines-test` (already in the catalog). Staff have no call action in PRD/design, so none was added. "Open in Maps" has no web fallback (a host literal would need build config).
### MER-077 — Performance: R8, Compose, startup (Android + shared)
- Branch: `perf/mer-077-android-performance`
- Status: IN PROGRESS
- Acceptance criteria (owner 2026-10-27 "the app lags"; CLAUDE.md §6; skills r8-analyzer, jetpack-compose-performance, anr-audit-and-fix):
  - [x] R8: release already minified + `shrinkResources` with `proguard-android-optimize.txt` (AGP default = full mode), debug unminified and debuggable — verified in `AndroidAppPlugin`, unchanged
  - [x] Compose stability: shared `config/compose-stability.conf` (read-only collections, kotlinx.datetime, immutable domain models of core + home/bookings/team/finance/notifications, all `val`, checked) wired into every Compose module by `configureComposeStability()` (build-logic)
  - [x] Calendar: day/week column layout, time window and hour labels remembered on their inputs; the 1-minute clock tick (`nowMs`) and sheet flags no longer rebuild the layout; `rangeText` lambda remembered so `CalendarTexts` stays equal
  - [x] Coil: one process-wide loader (`SingletonImageLoader`, application context) shared by the shell and the booking-request overlay (one memory + disk cache instead of two)
  - [x] Startup/ANR: `AppSettings` + `PushTokenProvider` resolved inside the IO coroutine of `AndroidApp.onCreate` (DataStore + Firebase Messaging creation off the main thread)
  - [ ] Gates: host tests, detekt, `assembleDevRelease` + `assembleDevDebug`, iOS framework link — NOT RUN (see Notes)
- Tests: `CalendarLayoutTest.equalInputsGiveEqualLayout` (new: equal inputs give an equal layout/window, the property the remember keys rely on); `policy_checks.py all` ok; Gradle not run
- Loops: 1/1 — batch verification (rules §3.13): gates above green incl. devRelease/prodRelease with the Compose stability config. DEFERRED: before/after measurements, narrowing R8 keep rules, app baseline profile
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch code reading of the three branches together (manifest, AppDelegate push handling, R8/stability config); deviations listed in Loops/Notes.
- Notes: DEVIATIONS — Gradle runs only from the terminal panel (no Java in the sandbox) and the panel hook refused a new tab (6 tabs open by other agents; their tabs were not reused), so no Gradle task, no detekt, no device measurement ran. Not done (time box 25 min): narrowing the broad keep rules (`io.ktor.**`, whole `core.data/network/domain` packages) needs a release run on a device to prove nothing breaks; ProfileInstaller already arrives transitively through androidx.activity (library baseline profiles apply), no app baseline profile (needs a Macrobenchmark module); bookings list / Home / team / finance lists already use `key` + `contentType`.
### MER-078 — Performance: iOS release build + Compose iOS settings
- Branch: `perf/mer-078-ios-performance`
- Status: IN PROGRESS
- Acceptance criteria (owner 2026-10-27: the iOS app lags; smooth on Dev/Prod, Debug/Release; iOS only, shared Compose in a parallel task):
  - [x] Release-Dev/Release-Prod: Kotlin/Native release framework (`KOTLIN_FRAMEWORK_BUILD_TYPE = release`, read by `embedAndSignAppleFrameworkForXcode`), Swift `-O` + whole module, `DEAD_CODE_STRIPPING`, every arch (`ONLY_ACTIVE_ARCH` YES only in Debug), SwiftUI previews off in Release; locked by policy V001 (`_check_ios_build_settings`)
  - [x] K/N runtime: `-Xbinary=appStateTracking=enabled` (no timer GC in the background); `gc` stays the default CMS, `objcDisposeOnMain` stays default (Compose releases UIKit objects on main)
  - [x] `ComposeUIViewController(configure = { parallelRendering = true })` (Compose 1.10.3 API); ProMotion `CADisableMinimumFrameDurationOnPhone` already in Info.plist, verified by the default strict plist check
  - [x] Startup: APNs registered once and only when Firebase is configured; `didFailToRegister` logs once, no retry (Personal Team without `aps-environment`); Koin stays synchronous before the first frame (the UI reads it immediately), Firebase `configure` must run on main; realtime socket is not started at launch (`IosBookingRequests.start` only observes the language)
  - [ ] Simulator builds: iosApp-Dev Debug-Dev BUILD SUCCEEDED (composeApp recompiled + `linkDebugFrameworkIosSimulatorArm64`); Release-Dev FAILED before compiling (Gradle `journal-1` cache lock held by a parallel agent's daemon, not a code error); Release-Prod stopped at the 25-min time box; both to re-run
- Tests: `scripts/ci/tests/test_variants.py` (+5 `IosBuildSettingsTest`); `python3 -m unittest discover -s scripts/ci/tests` 110 OK; `policy_checks.py all` ok
- Loops: 1/1 — batch verification (rules §3.13): all four iOS simulator configurations build with the new Xcode/K/N settings; policy variants check enforces them. DEFERRED: launch measurements; Personal Team launch on a real iPhone (owner); parallelRendering is experimental
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch code reading of the three branches together (manifest, AppDelegate push handling, R8/stability config); deviations listed in Loops/Notes.
- Notes: NOT DONE: Release builds, detekt, Release cold-launch measurement, own simulator run. Image cache = shared code (single Coil `ImageLoader` with default memory + disk cache in `App.kt`), not changed. Local.xcconfig untouched.
