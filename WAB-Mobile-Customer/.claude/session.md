# WAB-Mobile-Customer — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next customer`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Consumes `/customer/v1` (51 ops) through DTOs generated from `WAB-Server/docs/api/openapi.customer.json` (CUS-009); dev builds use `DATA_SOURCE=remote` against the hosted dev API (CUS-060); gap list `docs/REMOTE_DEV_GAPS.md`.
- Done before the backlog: rules, variants + CI, policy checks, design system, base components, language/theme, permissions, refresh interceptor (CUS-001…003, 005, 007, 008, 014…017).
- Payments through the `wab-payments` KMP launcher (CUS-047 ← PAY-011); push via FCM facade (CUS-004); Firebase apps registered (dev + prod).

## Current task

### CUS-098 — Business types in discovery: salons and beauty clinics
- Branch: `feat/cus-098-clinics-discovery`
- Status: IN PROGRESS
- Acceptance criteria (BUSINESS_DOMAIN §2, §5.19, §12.10; INTEGRATION §5a; contract 1.10.0: `GET /home`, `GET /salons`, `GET /catalog/services`, `GET /favorites`, `GET /salons/{id}`):
  - [x] Contract re-synced (`api_sync.py`, `--check` ok, `contract_gaps` 0); generator emits the shared string enums (`BusinessType`, `Audience`) as typealiases; mock samples rotate audiences and make the clinic home sections clinics; pre-1.10.0 captured fixtures migrated with the §5.19 rule (gender → SALON + audience), no clinics invented in captures
  - [x] Domain `BusinessType`/`Audience`/`BusinessRules` (core/domain); `SalonSummary` + `SalonDetails` carry type + audience (unknown type = SALON, the migration default); new error codes BUSINESS_TYPE_MISMATCH, AUDIENCE_CHANGE_NOT_ALLOWED, BRIDE_NOT_ALLOWED (AR+EN)
  - [x] Home order: banners, salon services, clinic services, Recommended salons, Recommended clinics, nearest salons, nearest clinics; clinic sections hidden when empty, nearest clinics never repeats the location prompt
  - [x] "See more"/"See all" of clinic sections open the same S04/S06 screens filtered to CLINIC (`Screen.AllSalons/AllServices.businessType`); search opens S04 for every type
  - [x] S04 All / Salons / Clinics tabs (`businessType` query, kept while paging, other filters kept); S06 per type
  - [x] Cards (Home, S04 rows, favorites) and S07 header show "Salon · Women" / "Beauty clinic · Men & women"; AR+EN
  - [x] Tests: `BusinessTypeTest`, `BusinessTypeTextsTest`, `HomeMappersTest`, `HomeStateUpdatesTest`, `HomeViewModelTest` (clinic see-more), `AllSalonsViewModelTest` (type tabs), `AllServicesViewModelTest` (clinic catalog), `SalonSearchApiTest`, `SalonCardMapperTest`, `RealSalonFixturesTest`
- Tests: `./gradlew testAndroidHostTest` green (all modules); `policy_checks.py all` ok
- Loops: 0/1
- Review: PENDING
- Notes: batch flow (rules §3.13) with CUS-099. The S05 filter sheet still lists the gender's catalog without a type filter (unchanged behaviour). Captured fixtures (`core/data/fixtures/remote`) were migrated by script, not re-captured from a 1.10.0 server: re-capture when the local stack runs SRV-174…178.

### CUS-097 — Measured performance pass with the Android skills + deferred device checks of CUS-094…096
- Branch: `perf/cus-097-measured-performance`
- Status: IN PROGRESS
- Acceptance criteria (owner 2026-10-27 "complete working and run skill to optimize performance"; skills r8-analyzer, jetpack-compose-performance, android-profiler, anr-audit-and-fix; no PRD/API change):
  - [ ] Baseline on devRelease (emulator, local stack): cold start `am start -W` x5 median; Perfetto startup + Home scroll + search + salon details + bookings -> jank %, frame p50/p90/p99, main-thread hotspots
  - [ ] Release smoke journey (sign-in -> home -> salon details -> booking -> bookings) on the minified build; any crash -> keep rule fixed first
  - [ ] r8-analyzer report applied; jetpack-compose-performance on the hot screens (compiler reports, keys/contentType, deferred reads, blur); anr-audit-and-fix scan
  - [ ] Baseline Profile + Startup Profile (`:baselineprofile`) + ProfileInstaller, if feasible
  - [ ] After measurements; before/after table here and in `docs/PERFORMANCE.md`
  - [ ] CUS-094 deferred device checks: Android gallery upload, nearest location, rotation during picker; iOS simulator maps, wa.me, Settings, gallery, simulated location, no-camera message; Release-Dev launches and scrolls
  - [ ] Unit tests for changed logic; policy + detekt baselines empty; gates green
- Tests: (pending)
- Loops: 1/1 — re-checked the committed changes once: policy + detekt + host unit tests + devDebug/devRelease/prodRelease + all four iOS simulator configurations green; KMP_TEMPLATE tool tests green (build-logic changed). DEFERRED (owner 2026-10-28: skip measuring): before/after numbers, device checks of CUS-094; an extra uncommitted r8-analyzer change (drop the blanket `core.data` keep) was reverted because no release run proved it
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — read the diff: release keep rules limited to the class names read at runtime (route/screen/ViewModel), secure store off the main thread with an in-memory cache + test, glass cost cuts, Compose caching, generated Baseline + Startup Profiles + `:baselineprofile` producer; temporary local manifests/overrides removed, none committed.
- Notes: local overrides untracked (local.properties, cleartext manifest), removed at the end.
### CUS-096 — Performance: iOS release build + Compose iOS settings
- Branch: `perf/cus-096-ios-performance`
- Status: IN PROGRESS
- Acceptance criteria (owner 2026-10-27 "iOS lags"; no PRD screen; iOS host + K/N framework only):
  - [x] Release-Dev / Release-Prod: release Kotlin framework (`KOTLIN_FRAMEWORK_BUILD_TYPE = release`, already set; `embedAndSignAppleFrameworkForXcode` honours it), Swift `-O` whole-module, clang `-Os`, dead-code stripping, `ONLY_ACTIVE_ARCH = NO`, dSYM; Debug configs unchanged (fast dev loop)
  - [x] K/N binary options on every iOS binary: `bundleId` (from `AndroidSdk.NAMESPACE_ROOT`, no literal), `gc=cms` (concurrent marking), `appStateTracking=enabled`
  - [x] `ComposeUIViewController` `parallelRendering = true`, `opaque = true` (named constants); `CADisableMinimumFrameDurationOnPhone` (120 Hz ProMotion) already in Info.plist
  - [ ] iosApp-Dev Debug + Release, iosApp-Prod Release simulator builds green (see Tests)
- Tests: no Kotlin logic changed (build settings + one view-controller configuration), so no new unit tests; `policy_checks.py all` ok; policy tests 93 OK; simulator builds: see Notes
- Loops: 1/1 — batch verification (rules §3.13): all four iOS simulator configurations (Debug/Release × Dev/Prod) build with the new K/N and Xcode settings. DEFERRED: launch/scroll measurements; parallelRendering is experimental (switch PARALLEL_RENDERING off first if native views glitch)
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch code reading of the three branches together; deviations listed in Loops/Notes.
- Notes: DEVIATIONS — time-boxed (25 min); startup work (Koin/Firebase on the main thread, push permission prompt at launch) left as is: both must run on the main thread before the first frame; no cold-launch / scroll measurement done; simulator builds NOT verified: Debug-Dev failed in the `Compile Kotlin Framework` phase on `Timeout waiting to lock journal cache (~/.gradle/caches/journal-1)` held by a parallel agent's Gradle, Release-Dev stalled > 8 min at the K/N compile tasks (same lock) and was stopped; iosApp-Prod Release and the framework link were not reached. Rerun `xcodebuild -scheme iosApp-Dev -configuration Release-Dev -destination 'generic/platform=iOS Simulator' build` (and Debug-Dev, iosApp-Prod Release-Prod) once no other Gradle runs; `gc=cms` and `parallelRendering` need a scroll check on device/simulator.
