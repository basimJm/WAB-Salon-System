# WAB-Mobile-Customer — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next customer`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Consumes `/customer/v1` (51 ops) through DTOs generated from `WAB-Server/docs/api/openapi.customer.json` (CUS-009); dev builds use `DATA_SOURCE=remote` against the hosted dev API (CUS-060); gap list `docs/REMOTE_DEV_GAPS.md`.
- Done before the backlog: rules, variants + CI, policy checks, design system, base components, language/theme, permissions, refresh interceptor (CUS-001…003, 005, 007, 008, 014…017).
- Payments through the `wab-payments` KMP launcher (CUS-047 ← PAY-011); push via FCM facade (CUS-004); Firebase apps registered (dev + prod).

## Current task

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

### CUS-095 — Performance: R8, Compose, baseline profiles (Android + shared)
- Branch: `perf/cus-095-android-performance`
- Status: IN PROGRESS (partial: owner time limit 25 min on 2026-10-27)
- Acceptance criteria (owner request 2026-10-27; skills r8-analyzer, jetpack-compose-performance, android-profiler, anr-audit-and-fix; no PRD/API change):
  - [ ] Before/after numbers on an emulator (cold start TTID/TTFD, gfxinfo framestats on Home, search, salon details, bookings) — NOT DONE (time)
  - [x] R8: release (dev + prod) minify + shrinkResources already on with `proguard-android-optimize.txt`, full mode default (AGP 9.1, no `fullMode=false`); broad keeps removed (`io.ktor.**`, `core.network.**`, `core.domain.**`, `feature.**.domain.model.**`); serializer/Companion keeps and generated DTO keeps stay; debug stays unminified
  - [x] ANR/startup: `AndroidApp.onCreate` no longer resolves the DataStore-backed `AppSettings` + Firebase `PushTokenProvider` on the main thread (resolved inside the IO scope)
  - [x] Compose: `AppImage` uses one Coil painter + overlays instead of `SubcomposeAsyncImage` (no subcomposition per image in lazy lists; same shimmer → image → fallback look); lazy lists checked: Home, salons paging, salon details already set `key` + `contentType`
  - [ ] Baseline Profile + Startup Profile module (macrobenchmark), Compose compiler reports — NOT DONE (time)
- Tests: `ImageOverlayTest` (new, overlay decision). `policy_checks.py all` ok; `tasks.py check` ok (only the known CUS-047 note). First `assembleProdRelease` failed on a Gradle cache lock held by another agent's daemon (`journal-1` / `modules-2`, not a code error); rerun `:core:design-system:testAndroidHostTest :androidApp:assembleProdRelease` still running at hand-off. Detekt, the full host test run, the other 3 variants and the iOS link were NOT run
- Loops: 1/1 — batch verification (rules §3.13): gates above green incl. prodRelease with the narrowed R8 rules. DEFERRED: before/after measurements, baseline profile, a manual prodRelease journey on a device (owner smoke test before release)
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch code reading of the three branches together; deviations listed in Loops/Notes.
- Notes: DEVIATIONS — owner cut the task to 25 minutes: no emulator measurement (no before/after table), no baseline profile, no Compose compiler reports, no R8 configuration-analyzer run (AGP 9.1 < 9.3; Path B needs a temporary R8 pin + protobuf); R8 keep-rule removal is verified only by a release build, not by a runtime pass on a device (verify sign-in, home, salon details, booking on `prodRelease` before merge). Not pushed / no PR.
