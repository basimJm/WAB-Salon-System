# WAB-Mobile-Salon — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next merchant`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Scaffolded (MER-001) with `KMP_TEMPLATE` from the customer app: all modules, design system (flat, design files as drawn since MER-074), sample feature; rules copied in MER-003 (until then `WAB-Mobile-Customer/CLAUDE.md` applies).
- Consumes `/merchant/v1` (merchant contract 1.6.0 since MER-075, staff photos + paid at salon; 1.5.0 MER-070, WhatsApp OTP; 1.4.0 MER-068; 1.3.0 added dashboard, reviews, statistics, my account consumed by MER-050/042/043/049); MER-004 Firebase registrations = owner.
- Real-time booking requests: socket + FCM data message, Android overlay / iOS time-sensitive actions (MER-012, MER-028…030).

## Current task

### MER-080 — Register as salon or clinic (contract 1.9.0)
- Branch: `feat/mer-080-business-type-register`
- Status: IN PROGRESS
- Acceptance criteria (owner 2026-10-29; BUSINESS_DOMAIN §5.19, §2, §3.3, §12.10; INTEGRATION §5a; operations `POST /salon/applications`, `POST /salon/application/resubmit`, `POST /uploads/license/presign` purpose `MEDICAL_LICENSE`, `GET /catalog/services?businessType=&gender=`):
  - [x] `apiSync` to merchant contract 1.9.0 (`api_sync --check` ok); generator fixed: a `$ref` to a scalar enum component (`BusinessType`, `Audience`) is inlined as `String` with its enum doc (it emitted undefined Kotlin types); captured remote fixtures migrated per §5.19 Migration (salon/catalog `gender` → `businessType` SALON + `audience`; bookings `businessType` + `salonAudience` + person `gender`) → `contract_gaps` 0
  - [x] core: `BusinessType`, `Audience`, `BusinessKind` (brideAllowed, canWidenAudience, catalogGender, clinic = BOTH), `SalonProfile.businessType/audience/kind`, `SalonRepository.currentKind()`; `UploadPurpose.MEDICAL_LICENSE` through the public license routes (`purpose` sent)
  - [x] M04 first step Salon / Clinic; Salon → audience Men / Women / Both; Clinic → no audience question (unisex note) + required medical license (1–5 files, camera / photo / files picker of MER-076, own list, retry/remove); name label Salon/Clinic name; review card with type, audience and medical license; type warning
  - [x] Resubmission: type read from `GET /salon` and locked; salon audience editable; clinic medical license optional (kept on file unless replaced, server rule)
  - [x] Error codes `BUSINESS_TYPE_MISMATCH`, `AUDIENCE_CHANGE_NOT_ALLOWED`, `BRIDE_NOT_ALLOWED` (ErrorCode + AR/EN + ErrorHandling)
  - [x] Contract compile fallout: catalog by `businessType` (+ `gender` for MALE/FEMALE salons), bride flags from `brideAllowed` (UI follow-up in MER-081)
  - [x] AR + EN strings; mock: generated fixtures serve 1.9.0 (captured salon = FEMALE SALON)
- Tests: `BusinessKindTest` (5), `SalonMapperTest` (+1), `RegistrationRulesTest` (+3), `ApplicationMappersTest` (+1), `RegistrationViewModelTest` (+2: clinic medical license, locked resubmission type), `ServicesMappersTest`, `test_api_sync.py` (+1, 11 OK); `policy_checks.py all` ok
- Loops: 0/1
- Review: PENDING
- Notes: PRD M04 is still the single-screen form (no PRD section for clinics yet): "first step" = the first card of the form, "review step" = a review card above Submit. DEVIATION: captured fixtures were migrated by script, not re-captured (needs the local stack with SRV-174…178).

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
- Tests: `MerchantRootTabsTest`, `LocationFallbackTest`, `MapPickerLocateTest`, `test_performance_config.py` (policy forbids package-wide keep rules); gate: policy + detekt + host unit tests + devDebug/devRelease/prodRelease + all four iOS simulator configurations green
- Loops: 1/1 — re-checked once: gate above green; release smoke test on the emulator (sign-in, dashboard, request accept, calendar, salon hub, upload) after the R8 narrowing; measurements in `docs/PERFORMANCE.md`. DEFERRED (owner 2026-10-28: skip): the remaining device checks of MER-076 on iOS, macrobenchmark/startup profile module
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — read the diff: tab routes by serial name (release bottom bar), package-wide keep rules removed with a policy guard, tone off the main thread, stability config reaches every Compose module, calendar `drawWithCache`, geocoder/location bounded with fallbacks; temporary local manifests removed, none committed.
- Notes: results — main-thread binder time −54 %, recomposition −19 %, request-sheet long frames 6.3 → 4.8, APK −6.9 %, R8 scores 83 % → 98.5 %; cold start and whole-journey jank unchanged within the noise of a shared host.

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
