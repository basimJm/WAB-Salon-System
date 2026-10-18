# WAB-Mobile-Customer — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next customer`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Will consume `/customer/v1` (51 ops) through DTOs generated from `WAB-Server/docs/api/openapi.customer.json` (CUS-009); mock source until the dev API exists (CUS-060 ← SRV-011).
- Done before the backlog: rules, variants + CI, policy checks, design system, base components, language/theme, permissions, refresh interceptor (CUS-001…003, 005, 007, 008, 014…017).
- Payments through the `wab-payments` KMP launcher (CUS-047 ← PAY-011); push via FCM facade (CUS-004); Firebase apps registered (dev + prod).

## Current task

- CUS-019 next (domain cards); task branches start from `origin/customer`.

### CUS-005a — Standalone `core/mvi` module + core convention plugins
- Branch: `feat/cus-005a-core-mvi`
- Status: DONE
- Acceptance criteria (owner request 2026-10-18; CLAUDE.md §2, §3):
  - [x] `MVI`, `MVIDelegate`, `BaseViewModel`, `CollectSideEffect` live in `core/mvi` (package `com.fab.wab.customer.core.mvi`); no `core.ui.mvi` import remains; `core/ui` keeps locale + permissions
  - [x] Convention plugins `com.fab.wab.customer.core.library` and `core.compose`: namespace derived from the module path, SDK levels from `AndroidSdk.kt` (also used by the Android app plugin), coroutines/lifecycle/test deps; `core/mvi` uses them; the feature-presentation, compose-app and android-app plugins add `:core:mvi`
  - [x] Unit tests: `MVIDelegateTest` (6), `BaseViewModelTest` (3) green on the JVM host
  - [x] Policy checks + detekt green; `assembleDevDebug/DevRelease/ProdDebug/ProdRelease` + lint green; `linkDebugFrameworkIosSimulatorArm64` green (owner's Mac, Gradle 9.3.1, JBR 21)
- Tests: `scripts/ci/run_local_checks.sh` → GATE-EXIT=0 (68 policy tests, policy all ok, detekt 0 issues, BUILD SUCCESSFUL 4m53s); `./gradlew :composeApp:linkDebugFrameworkIosSimulatorArm64` ok
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — core/mvi depends only on Compose runtime + lifecycle; no literals in the new build files (SDK levels in `AndroidSdk.kt`); plugin behaviour proven by the full build rather than plugin unit tests.
- Notes: outside the nominal scope but required for the local gate on this Mac: `from __future__ import annotations` in 4 policy scripts (system Python 3.9), detekt `SwallowedException` in `RemoteTokenRefreshApi` fixed by naming the intentionally ignored exceptions `ignored`, the 5000 ms subscription timeout named (`STATE_SUBSCRIPTION_TIMEOUT_MS`) and its baseline entry removed. No UI change → no browser/simulator UI check.

### CUS-005b — `core/analytics` module
- Branch: `feat/cus-005b-core-analytics`
- Status: DONE
- Acceptance criteria (owner request 2026-10-18; PRD §14 common fields; CLAUDE.md §3):
  - [x] `core/analytics`: `AnalyticsTracker` port, `AnalyticsBackend` vendor port, typed params + builder, `AnalyticsLimits`/`AnalyticsValidation` (Firebase-safe names, 25 params, 100-char values), `AnalyticsContext` (user type, gender scope, language, app version, platform, environment), `DefaultAnalyticsTracker` (context merge with event precedence, validate, sanitize, async, issues reported never thrown), no-op / recording / composite backends, `TrackScreen` + `LocalAnalyticsTracker` (resume-aware), Koin `analyticsModule(backend, issueReporter)`
  - [x] Feature-presentation and compose-app plugins add `:core:analytics`; app binds `AnalyticsContextProvider` (`AppAnalyticsContextProvider` from `AppEnvironment` + `AppearanceSettings.language` + `Platform.analyticsName`), `LocalAnalyticsTracker` provided in `App`; sample screen `TrackScreen(SampleAnalytics.SCREEN)`, sample ViewModel tracks refresh / item open
  - [x] Unit tests: `AnalyticsValidationTest` (5), `DefaultAnalyticsTrackerTest` (7), `AppAnalyticsContextProviderTest` (2)
  - [x] Policy + detekt green (`LocalAnalyticsTracker` added to the detekt composition-local allowlist); 4 Android variants + lint; iOS simulator framework
- Tests: `scripts/ci/run_local_checks.sh` → GATE-EXIT=0 (BUILD SUCCESSFUL 1m37s); `linkDebugFrameworkIosSimulatorArm64` ok
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — vendor-neutral port, nothing Firebase in common code, no literals at call sites (names in `*Analytics` objects / `AnalyticsKeys`), events validated before leaving the app.
- Notes: Firebase backend is CUS-004; user type / gender scope come from the session store (CUS-011) — until then the provider reports GUEST and no gender. No visible UI change → no browser/simulator UI check (sample screen behaviour unchanged).

### CUS-005c — Build variants verified locally
- Branch: `feat/cus-005c-variants-check`
- Status: DONE
- Acceptance criteria (owner request 2026-10-18; CLAUDE.md §1.5, §5):
  - [x] Android `assembleDevDebug/DevRelease/ProdDebug/ProdRelease` + lint green on the owner's Mac (CUS-005a/b gates, BUILD SUCCESSFUL)
  - [x] iOS `iosApp-Dev` Debug-Dev / Release-Dev and `iosApp-Prod` Debug-Prod / Release-Prod build for the simulator (`CODE_SIGNING_ALLOWED=NO`); `iosSimulatorArm64Test` green; SwiftLint not installed locally (CI runs it)
  - [x] `scripts/ci/run_ios_checks.sh` mirrors the CI matrix (`test_ios_checks.py` compares its dry-run with `customer-ci.yml`) and `run_local_checks.sh` runs it when Xcode exists (`WAB_SKIP_IOS=1` skips)
- Tests: `python3 -m unittest discover -s scripts/ci/tests` (71 incl. 3 new) OK; `scripts/ci/run_ios_checks.sh` → IOS-GATE-EXIT=0; policy all ok
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — gate script is data-driven (matrix list), no hardcoded paths beyond the project file CI also names; nothing in app code changed.
- Notes: the full `run_local_checks.sh` now takes ~15 min with iOS; use `WAB_SKIP_IOS=1` for Android-only iterations and run iOS once before the push.

### CUS-018 — Universal states: shimmer templates, paged list, state switcher
- Branch: `feat/cus-018-universal-states`
- Status: DONE
- Acceptance criteria (PRD §3.3, §3.4, §3.6, §3.7; Design Script §1.1):
  - [x] Shimmer templates shaped like content: `AppShimmerSalonCard` (vertical/horizontal), `AppShimmerListItem` (square/circular image), `AppShimmerSection`, `AppShimmerList`; sizes from new tokens `cardImageHeight`, `cardCompactWidth`, `listItemImage`
  - [x] `AppPagedList` (LazyColumn) and `AppAdaptiveGrid` (now with `hasMore/loadingMore/onLoadMore`, full-width footer) request the next page near the end via pure `shouldLoadMore` (prefetch `PagingUiDefaults.PREFETCH_ITEMS`), show a shimmer footer while loading more, never while loading or without more pages; `PagingDefaults.PAGE_SIZE = 10` in `core/data`
  - [x] `AppContentState` + `AppStateContent(state, onRetry)` switch loading / offline / error / empty / content; pure `contentStateOf(...)` keeps existing content visible during refresh/errors
  - [x] `StatesGalleryPreviews` (AR RTL light phone, EN LTR dark phone, landscape, tablet); unit tests `UniversalStatesTest` (5), `PagingConfigTest` (1)
- Tests: `scripts/ci/run_local_checks.sh` (incl. iOS) → GATE-EXIT=0; explicit `--rerun` of design-system + core/data tests green (5 + 1)
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — lambdas in effects via `rememberUpdatedState`, keys + content types on every lazy item, no literals (fractions/counts named), AR/EN strings unchanged (existing state strings reused).
- Notes: UI checked through Compose previews only (no feature screen uses the new components yet; the sample screen is unchanged). Baseline shrank by the `PagingConfig` entry.
