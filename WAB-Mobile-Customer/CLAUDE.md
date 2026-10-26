# WAB-Mobile-Customer — Rules for AI Agents

> These rules add to the root `CLAUDE.md` and `.claude/*.md`. They never relax them. If two rules conflict, the stricter one wins. If documents conflict, stop and ask (PRD > BRD > Design Script > design files).

**Auto-loaded with this file (never read them with a tool):**
- Session (current task, integration status): @.claude/session.md
- Memory (durable customer-app facts): @.claude/memory.md

## 0. Per task (nothing else is read up front)
1. `python3 scripts/tasks.py next customer` → the task row (ID, branch from `origin/customer`, needs, PRD screens, operations). Root rules/roles/hooks and this file are already in context; `TECHSTACK.md` only when adding a library (`AGENTS.md` module lists are generated and partly wrong; §2 below is real).
2. Only the `docs/WAB_Customer_App_PRD.md` screens/sections and the `openapi.customer.json` operations the row names (grep the heading, read that range); `docs/WAB_Customer_Design_Script.md` section and the matching `design/*.dc.html` for UI work (visual reference only; the PRD wins; the 4-box OTP in the prototype is wrong: `otpLength` comes from the backend).
3. `.claude/Integration.md` when the task touches the API, Firebase, payments, realtime or the mock; `BUSINESS_DOMAIN.md` sections the row names.

## 1. Non-Negotiable Rules
1. **Clean Architecture + MVI by delegate.** Every screen follows §3. No business logic in composables, no Android/iOS types in `commonMain` domain code.
2. **Never hardcode.** No literal strings, colors, `dp`/`sp`, shapes, durations, alphas, URLs, hosts, keys, IDs, limits or magic numbers in feature or component code. Use string resources, design tokens (`core/design-system/.../theme`), named constants, or per-environment build config (§5). CI fails on violations (`python3 scripts/ci/policy_checks.py hardcoded|quality|…`). Legacy violations are listed in `config/policy-baseline.json` and `config/detekt/baseline.xml`; those files may only shrink (a stale entry also fails), so fix the code instead of editing a baseline. Allowed literals: `0`, `1`, `-1`, `0f`, `1f`, empty strings, `Modifier.weight(1f)` and similar structural values.
3. **Arabic and English for every resource.** Every string exists in `values/strings.xml` (English) and `values-ar/strings.xml` (Arabic) with the same keys and placeholders. Arabic is the default language of the product, so write the Arabic text first; it must read naturally, not as a machine translation. CI fails on a missing or extra key.
4. **Performance first.** See §6.
5. **Every build variant must build:** Android `dev` and `prod` flavors, each with `debug` and `release`; iOS configurations `Debug-Dev`, `Release-Dev`, `Debug-Prod`, `Release-Prod` with one shared scheme per environment (`iosApp-Dev`, `iosApp-Prod`). A change is not done until all four variants of both platforms compile in CI.
6. **Always run CI.** Run the local checks (`scripts/ci/run_local_checks.sh`) before every commit and push the branch so GitHub Actions (`.github/workflows/customer-ci.yml`) runs. Read the result; never merge or report "done" on red or pending checks.
7. **No runtime errors, no compile errors, no warnings.** `allWarningsAsErrors` is on for Kotlin; Android Lint runs with `warningsAsErrors`; Swift builds with warnings treated as errors. Do not use `!!`, unchecked casts, `@Suppress` without a one-line reason comment, empty `catch`, `GlobalScope`, `runBlocking`, `TODO()`, or `println`/`printStackTrace` (logs go through the logging abstraction and never contain tokens or personal data). Failures are modeled as `AppResult`/`AppError`, never thrown to the UI.
8. **No source file longer than 300 lines** (Kotlin, Swift, Gradle, XML, Python). Split by responsibility. CI fails above the limit.
9. **Portrait and landscape, phone to tablet.** Every screen and component works in portrait and landscape, on small phones, large phones, foldables and tablets/iPads, with system font scaling up to 200 %, RTL and LTR, light and dark. See §7.
10. **Branching.** One new branch per task (`feat/cus-NNN-<key>` as named in the backlog) from the freshly fetched `origin/customer` (the customer master branch); the PR targets `customer`; the owner merges `customer` into `main`. **Never commit or push to `main` or `customer` directly.** Cloud sessions pinned to a branch (for example `claude/<name>`) use that branch and restart it from `origin/customer` after its PR merges.
11. Never commit secrets (API keys, keystores, `local.properties`, signing configs). Do not edit the Firebase files (`androidApp/src/{dev,prod}/google-services.json`, `iosApp/Firebase/{dev,prod}/GoogleService-Info.plist`) without the owner; setup in `docs/FIREBASE_SETUP.md`.
12. Do not add a library or change a version without a reason recorded in the task; use `gradle/libs.versions.toml`.

## 2. Module Map (real, not generated)
```
androidApp/            Android entry (MainActivity, Application, flavors dev/prod)
iosApp/                iOS entry (SwiftUI host, xcconfig per environment, schemes)
composeApp/            Shared app shell: App(), theme wiring, navigation host, DI aggregation
core/common            Platform-free helpers (formatters, validators, AppInfoProvider)
core/domain            Result/error types, settings contracts, shared models
core/data, storage     Repositories' shared plumbing, DataStore-backed settings
core/network           Ktor client, env-driven ApiConfig, safeApiCall (WAB envelope → AppError.ServerError)
core/realtime          RealtimeClient port (status, events, connect/disconnect) + Socket.IO v4 client over Ktor WebSockets (same host as the API, `/customer` namespace, token in the handshake) + FakeRealtimeClient (mock data source); `RealtimeEvents` constants
core/data/contract     GENERATED DTOs + `CustomerOperations` from `WAB-Server/docs/api/openapi.customer.json` (`./gradlew apiSync`; `apiSyncCheck` in the gate; never edit by hand)
core/navigation        Typed routes (Graph/Screen), Navigator
core/notification      In-app toast host + push handling
core/security          Security helpers (keep secrets out of logs, secure storage seam)
core/mvi               MVI base (MVI, MVIDelegate, BaseViewModel, CollectSideEffect) — standalone, depends only on Compose runtime + lifecycle
core/firebase          Firebase behind ports (no phone auth: OTP is WhatsApp via the server): PushTokenProvider, CrashReporter, AppInstanceIdProvider, AnalyticsBackend; Android = Firebase Android SDK, iOS = Swift bridges (FirebaseBridges.swift); fakes for tests
core/analytics         AnalyticsTracker port (screens + actions, user id/properties), common-field context, validation, TrackScreen, no-op/recording/composite backends — vendor backend is wired by the app
core/ui                Locale/dark-mode locals, permission flow
core/design-system     Theme, tokens, adaptive layout, base components, icons, string resources
core/di                Koin aggregation
feature/<name>/{domain,data,presentation,di}   One folder per feature (see `feature/sample`; `feature/onboarding` = first product feature, no data module: it reads `SessionStore`)
build-logic/convention Convention plugins: KMP library, Android app, feature layers, core.library / core.compose (namespace from the path, SDK levels from `AndroidSdk.kt`)
scripts/ci, config/    Policy checks (with tests) and linter configuration used by CI
```
Dependency direction: `presentation → domain ← data`; `di` wires them. `domain` depends on nothing UI/Android/iOS/Ktor. `core/design-system` depends only on `core/ui` and Compose; it never imports a feature.

## 3. Clean Architecture + MVI by Delegate (the only way to build a screen)
```
feature/<name>/domain         model/ (pure data), repository/ (interfaces), usecase/ (one action each, returns Flow<AppResult<T>>)
feature/<name>/data           remote/dto + service, repository/ (implements the domain interface, maps DTO → model)
feature/<name>/presentation   controller/contract/<Name>Contract.kt   sealed interface with UiState, UiAction, SideEffect
                              controller/vm/<Name>ViewModel.kt        extends BaseViewModel<UiState, UiAction, SideEffect>
                              screen/<Name>Screen.kt                  stateless composable: (state, onAction) + CollectSideEffect
                              navigation/, di/
feature/<name>/di             Koin module that binds data → domain
```
- **MVI by delegate** (`core/mvi`, package `com.fab.wab.customer.core.mvi`, added to every feature presentation module by the convention plugin): `BaseViewModel` is `ViewModel(), MVI<UiState, UiAction, SideEffect> by mvi(initialState)`. State lives in the delegate and changes only through `updateState { copy(...) }`; one-shot work (navigation, toast) goes through `emitSideEffect`. A ViewModel overrides `onEvent(UiAction)` and optionally `onStart()`. Do not create ad hoc `MutableStateFlow`s in a ViewModel.
- `UiState` is an immutable data class with defaults and derived properties; `UiAction` is a sealed interface of user intents; `SideEffect` is a sealed interface of one-time effects.
- A screen composable takes `state` and `onAction`, owns no business logic, and has a `@Preview` for each state (loading, content, empty, error, offline) in Arabic RTL and English LTR.
- Use cases and repositories return `AppResult` (`Loading | Success | Error`); ViewModels map `AppError` to localized text via string resources, never raw server text.
- Platform code lives behind `expect/actual` or an interface in `core`; Firebase, payments and maps are wrapped behind app-level interfaces (root `CLAUDE.md` §6).
- **Analytics on every screen and action** (PRD §14, `core/analytics`, added to every feature presentation module by the convention plugin): the app shell reports every route change (`TrackNavigationScreens`, screen name derived from the route class); a screen composable whose view needs ids starts with `TrackScreen(<Feature>Analytics.SCREEN)` and that richer view replaces the route view; ViewModels receive `AnalyticsTracker` and call `trackAction(AnalyticsAction(name, params))` for every `UiAction` that is a user intent; event/param names are snake_case constants in a `<Feature>Analytics` object, never literals at call sites.
- Every ViewModel, use case, mapper and token/utility has a unit test in `commonTest` (kotlin-test + coroutines test, fakes instead of mocks).

## 4. Design System (the only source of visual values)
- Tokens live in `core/design-system/src/commonMain/.../theme`: colors (light + dark), typography, spacing, shapes, elevation, sizes, motion, and adaptive layout breakpoints. Components read them through `AppTheme.colors`, `.spacing`, `.shapes`, `.typography`, `.sizes`, `.elevation`, `.alpha`, `.motion`, `.adaptive`; they never use raw values.
- Build screens from `App*` components only. A missing component is added to the design system first (with a preview and a test), then used.
- Layout uses Start/End, never Left/Right. Icons that have direction mirror in RTL. Text uses `TextDirection.Content`.
- Fonts: Playfair Display (headings), Poppins (Latin body), IBM Plex Sans Arabic (Arabic body and headings). Only the bundled files in `composeResources/font`.

## 5. Environments and Build Variants
| | Android | iOS |
|---|---|---|
| Dev | flavor `dev`: `assembleDevDebug`, `assembleDevRelease` | configs `Debug-Dev`, `Release-Dev`, scheme `iosApp-Dev` |
| Prod | flavor `prod`: `assembleProdDebug`, `assembleProdRelease` | configs `Debug-Prod`, `Release-Prod`, scheme `iosApp-Prod` |
- `DATA_SOURCE` (`mock` | `remote`) is part of the environment: Android `DEV_DATA_SOURCE` / `PROD_DATA_SOURCE` in `gradle.properties`, iOS `DATA_SOURCE` in the xcconfig; `mock` serves the generated fixtures through `core/data/mock` (scenarios: success, empty, 401, 404, 500, timeout, offline via `MockScenarios`); prod refuses `mock` at startup.
- Environment values (API base URL, display name, environment label) are config, not code: Android `gradle.properties` keys `DEV_API_BASE_URL` / `PROD_API_BASE_URL` → `BuildConfig`; iOS `iosApp/Configuration/<Env>.xcconfig` → `Info.plist`. Shared code reads them through `core/network` `ApiConfig`, never a literal.
- Release builds are minified and shrunk (R8) with explicit keep rules; every reflective lookup needs a rule and a test.
- Secrets (maps key, signing) come from `local.properties` / CI secrets; CI builds release variants unsigned.

## 6. Performance Checklist (apply to every composable and ViewModel)
- State hoisting; pass stable types (`@Immutable`/`@Stable`, immutable collections or wrapper classes); no `List`/lambda allocations per recomposition in hot paths (`remember`, method references).
- Lazy lists always set `key` and `contentType`; no nested scrolling of the same axis; images sized to their slot with Coil memory/disk cache.
- Read fast-changing state in the draw/layout phase (`Modifier.drawBehind`, `graphicsLayer`, lambda modifiers), not in composition; use `derivedStateOf` for thresholds.
- Collect flows with `collectAsStateWithLifecycle`; cancel work when the screen is not visible; debounce search input at 500 ms.
- No blocking work on the main thread; mapping and parsing run on `Dispatchers.Default`/IO inside data/use cases.
- Startup: no eager initialization of features that are not on the first screen; shimmer instead of spinners for content.
- CI enforces: R8 on for release, release APK size budget (`config/budgets.json`), detekt performance and Compose rules, and policy checks for lazy-list keys, `collectAsStateWithLifecycle`, `runBlocking`/`Thread.sleep`.

## 7. Adaptive Layout (portrait, landscape, every size)
- Use `AppWindowSize` (width class × height class × orientation) from the design system. Compact width: single column and bottom bar. Medium and Expanded width, or landscape: navigation rail, content constrained to the max content width token, multi-column grids (`AppAdaptiveGrid`).
- Never use fixed widths/heights for content; use weights, `fillMaxWidth`, min/max constraints and the token scale. Touch targets stay ≥ 48 dp.
- Respect system insets (status/navigation bar, display cutout, IME); scroll containers add insets as content padding so nothing is clipped in landscape.
- Text uses `sp` tokens and survives 200 % font scale (wrap or scroll, never clip or overlap). Previews cover: phone portrait, phone landscape, tablet landscape, font scale 2.0, RTL, dark.

## 8. Definition of Done (per task)
1. Acceptance criteria written in `.claude/session.md` before coding; each covered by a unit test.
2. `scripts/ci/run_local_checks.sh` green (policy checks, detekt, unit tests, the four Android variants + lint when the SDK exists, and `scripts/ci/run_ios_checks.sh` = the four iOS configurations + Kotlin/Native tests when Xcode exists; `WAB_SKIP_IOS=1` skips iOS). Android/iOS builds that cannot run in the current environment run in CI; the PR is not done until CI is green.
3. One verification loop and the four-role review recorded in `.claude/session.md` (`Loops: 1/1`, `Review: PASSED`); `python3 scripts/tasks.py set CUS-NNN <STATUS>` at start, PR and merge.
4. Branch pushed (never `main`), draft PR opened, `memory.md` updated with durable facts.
