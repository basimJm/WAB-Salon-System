# Merchant app — measured performance (MER-079, 2026-10-27)

Measured with the official Android skills (`android-profiler`, `r8-analyzer`, `jetpack-compose-performance`,
`anr-audit-and-fix`) on the **devRelease** build (R8, minified, signed with the debug key) against the local QA
stack. Owner request: "complete working and run skill to optimize performance".

## Setup

| Item | Value |
|---|---|
| Device | Android emulator Pixel 8 Pro AVD, host GPU (`-gpu host`), 1344 × 2992, 60 Hz |
| Build | `:androidApp:assembleDevRelease` + an untracked `local.properties` (`DEV_API_BASE_URL=http://10.0.2.2:4000`) and a temporary `src/devRelease` manifest (cleartext + `<profileable shell>`), never committed |
| Account | Lamar owner (+962 789000001), 5 pending requests on the shared stack |
| Compilation | `cmd package compile --reset`, profileinstaller broadcast, `compile -m speed-profile -f` (what a store install gets) |
| Cold start | `am start -W -S` TotalTime, app signed in (Home + request sheet) |
| Journey trace | Perfetto (sched, gfx/view/input/am/wm/dalvik/binder atrace, FrameTimeline): cold start → request sheet (scroll + close 5 requests) → Home scroll → Bookings fling ×9 → Calendar week + next week + grid scroll → day view + day paging → Salon hub. Phases split by `/proc/uptime` marks |
| Jank | app frames longer than 16.7 ms (FrameTimeline marks ~100 % of frames "Buffer Stuffing" on the emulator display, so its jank label is not used) |
| Host | shared Mac with other agents' Gradle builds: load average 5–22 during the runs |

**Before** = `origin/merchant` + the tab-bar release fix (below; without it the release build has no bottom bar, so
the journey cannot run). **After** = this branch.

## Results

| Metric | Before | After | Note |
|---|---|---|---|
| R8 optimization / obfuscation / shrinking score (r8-analyzer) | 83.39 / 83.55 / 83.54 % | 98.50 / 98.68 / 98.66 % | package-wide keep rules removed |
| devRelease APK (unsigned) | 10 422 274 B | 9 701 121 B (−6.9 %) | after includes the baseline profile |
| Cold start, sequential 11 + 11 (median) | 163 ms | 138 ms | same host-load window |
| Cold start, ABAB 30 + 30 (median, p25–p75) | 220 ms (139–385) | 234 ms (133–302) | host load 5–22: no difference outside the noise |
| Journey frames > 16.7 ms (mean of 3 / 4 traces) | 22.3 of 1082 (2.1 %) | 21.5 of 1079 (2.0 %) | within run-to-run spread (17–27 vs 14–26) |
| Frame duration p50 / p90 / p95 / p99 | 3.2 / 7.3 / 8.4 / 25.8 ms | 3.2 / 7.7 / 8.5 / 25.2 ms | |
| Main thread: `createLocalMediaPlayer` | 57 ms (5 calls, up to 22 ms) | 0 | request tone off the main thread |
| Main thread: binder transactions | 248 ms | 113 ms (−54 %) | tone + vibrator calls moved |
| Main thread: `Recomposer:recompose` | 252 ms | 203 ms (−19 %) | |
| Request sheet: frames > 16.7 ms, p90, p99, max | 6.3, 5.0, 23.0, 30.4 ms | 4.8, 4.1, 19.2, 24.9 ms | |
| Home scroll: p99, max | 12.8, 19.5 ms | 11.6, 15.7 ms | |
| Bookings fling: frames > 16.7 ms, p99 | 2.0, 13.5 ms | 1.5, 12.8 ms | |
| Calendar week: frames > 16.7 ms, p99 | 4.7, 25.0 ms | 5.2, 21.3 ms | long frames are RenderThread (`postAndWait`) |
| Calendar day: p99 | 30.0 ms | 24.7 ms | |

Reading: the app was already smooth on the emulator (p90 under 8 ms). The measurable wins are on the main thread
(no MediaPlayer creation and half the binder time while requests arrive) and in the request sheet; whole-journey jank
and cold start do not move outside the noise of a shared host. Long frames left are startup (first composition,
text layout, window relayout) and RenderThread syncs in the calendar grid.

## Changes (each from a measurement or a skill rule)

1. **Release bottom bar (bug, found by the release smoke test).** `MerchantRootTabs` matched routes with
   `KClass.qualifiedName`; R8 renames `core.navigation` classes, so no tab was found and the release build showed no
   bottom bar. Routes now come from the serializer's serial name (what navigation uses). Test:
   `MerchantRootTabsTest.everyTabRouteIsTheSerialNameOfItsGraph`.
2. **r8-analyzer.** `data-proguard-rules.pro` kept `io.ktor.**`, `core.data.**`, `core.network.**`, `core.domain.**`,
   feature DTOs/models and every `$$serializer` whole (≈ 18 % of kept items). Nothing reads them reflectively;
   kotlinx-serialization and Ktor ship their own consumer rules. All removed; proved on the release build (sign-in,
   dashboard, request accept, calendar, salon hub, upload presign → PUT → confirm). Policy test forbids package-wide
   keep rules again.
3. **Request tone off the main thread (android-profiler + anr-audit-and-fix).** `AndroidRequestAlert` created the
   ringtone MediaPlayer (binder) on the main thread at every request; play/stop now run in order on one background
   thread.
4. **Baseline profile.** `androidApp/src/main/baseline-prof.txt` (13 840 rules: app code, Ktor, kotlinx
   serialization/coroutines, Koin — libraries without their own profile), captured from the journey. The
   macrobenchmark / `androidx.baselineprofile` module and a **startup profile** (dex layout) were not added: the plugin
   would be a new module + library for AGP 9.1, and the gain could not be measured on this host.
5. **jetpack-compose-performance.** Compiler reports (`./gradlew <module>:compileAndroidMain -PcomposeReports=true`,
   output `build/compose-reports`): every restartable composable in bookings, home and the design system is skippable.
   The shared stability configuration did not reach the modules that add the Compose compiler by alias
   (design-system, ui, navigation, notification) — it does now (`KotlinMultiplatformLibraryPlugin`). Lazy items carry
   a content type everywhere (Home, Finance, Reviews, Statistics, Salon hub). Calendar hatch and block outlines use
   `drawWithCache` (no stroke / path-effect allocation per draw). `dateTimeText` is remembered and the business time
   zone is resolved once (list cards and calendar blocks recompose on the one-minute tick).
6. **anr-audit-and-fix (static).** No blocking call proven on the main thread besides the tone: image decode, EXIF,
   file reads and geocoding run on IO/Default; startup DataStore/Firebase work is on IO since MER-077.

## Regenerate

- Baseline profile: install `devDebug` over the signed-in app, run the journey twice, then
  `adb shell pm dump-profiles --dump-classes-and-methods com.fab.wab.merchant.dev` and keep the `com/fab/wab/merchant`,
  `io/ktor`, `kotlinx/serialization`, `kotlinx/coroutines` and `org/koin` lines of
  `/data/misc/profman/com.fab.wab.merchant.dev-primary.prof.txt`.
- R8 report: r8-analyzer Path B (AGP < 9.3): temporary `classpath("com.android.tools:r8:9.4.34")` in
  `settings.gradle.kts`, `:androidApp:minifyDevReleaseWithR8 --rerun --no-build-cache
  -Dcom.android.tools.r8.dumpkeepradiustodirectory=$PWD/tmp/r8analysis`, then the skill's `convert_pb_to_json.py`
  and `analyze.py` (protobuf ≥ 6.33.4 in a venv); revert the settings file.
- Measure on a quiet host (or a real device) before trusting startup numbers below ~50 ms.
