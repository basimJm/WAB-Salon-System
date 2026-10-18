# WAB-Mobile-Customer — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next customer`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Will consume `/customer/v1` (51 ops) through DTOs generated from `WAB-Server/docs/api/openapi.customer.json` (CUS-009); mock source until the dev API exists (CUS-060 ← SRV-011).
- Done before the backlog: rules, variants + CI, policy checks, design system, base components, language/theme, permissions, refresh interceptor (CUS-001…003, 005, 007, 008, 014…017).
- Payments through the `wab-payments` KMP launcher (CUS-047 ← PAY-011); push via FCM facade (CUS-004); Firebase apps registered (dev + prod).

## Current task

- Next: CUS-009 contract tooling, then CUS-010 mock, CUS-011 session store, CUS-012, CUS-013, then features from CUS-024; task branches start from `origin/customer`.

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

### CUS-019 — Domain cards: salon card, service card, review item, staff item
- Branch: `feat/cus-019-domain-cards`
- Status: DONE
- Acceptance criteria (PRD 8.0, S06, S07 items 8–10; Design Script §1.2):
  - [x] `AppSalonCard` (Vertical / Horizontal): image with placeholder, name, `AppRatingStars` + `ratingValueText`, location, `AppExpandableText` description ("more" in place, only when it overflows), `OpenStatusLine` badge (open · hours / closed today), favorite heart with AR/EN content descriptions (gating in the feature)
  - [x] `AppServiceCardCompact`, `AppServiceCardExpandable` (expands in place), `AppSalonServiceRow` (duration + price)
  - [x] `AppReviewItem` (author, stars, comment truncated with "See more" or `onExpandRequest`, date), `AppStaffItem` (`AppAvatar` + first name + on duty / on leave badge)
  - [x] UI models `SalonCardUi`, `ServiceCardUi`, `ReviewUi`, `StaffItemUi`; strings in both languages; `DomainCardsTest` (3); `CardsGalleryPreviews` AR/EN, light/dark, portrait/landscape, tablet
- Tests: `scripts/ci/run_local_checks.sh` incl. iOS → GATE-EXIT=0 (`DomainCardsTest` 3/3)
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — `AppText` gained `onTextLayout` for overflow detection; all texts localized by the caller or resources; `@Immutable` models; no literals.
- Notes: UI checked through Compose previews only; no feature screen uses the cards yet.

### CUS-020 — Form kit: phone + country picker, validators, keyboard presets
- Branch: `feat/cus-020-form-kit`
- Status: DONE
- Acceptance criteria (PRD §11, S11–S13; Design Script §1.2):
  - [x] `AppPhoneField` (country chip with flag URL + dial code opening the picker, digits only, LTR text direction, inline error) and `AppCountryPicker` (full-screen sheet, search by name or dial code via pure `filterCountries`, empty state, selected check); `CountryUi` mirrors `GET /locations/countries`
  - [x] `FormValidators` in `core/common`: `normalizeNationalNumber`, `isValidPhone(raw, serverRegex)` (malformed regex fails closed), `isRequiredText`, `isValidEmail`, `isValidOtp(code, otpLength)`
  - [x] `AppKeyboards.phone/email/name/number`; `AppTextField` gains `textDirection`
  - [x] AR + EN strings (`country_*`); `FormGalleryPreviews` (phone empty/filled/error, email, name, city/area dropdowns incl. disabled, OTP filling/error, disabled submit) in AR/EN, light/dark, portrait/landscape, tablet
- Tests: `FormValidatorsTest` (6), `FormKitTest` (3); `scripts/ci/run_local_checks.sh` incl. iOS → GATE-EXIT=0
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — rules live in `core/common` (shared by ViewModels), UI only renders errors the caller passes; regex from the server never crashes; no literals.
- Notes: UI checked through Compose previews only. `AppOtpInput`, `AppDropdownField`, `AppTextField` already existed.

### CUS-021 — Sheets and dialogs: global dialogs, active filter chips
- Branch: `feat/cus-021-sheets-dialogs`
- Status: DONE
- Acceptance criteria (PRD §3.12, S03 nearest, S04 chips, S21 logout/delete, §4.3 session; Design Script §1.2–1.3):
  - [x] `AppGlobalDialog(kind)` for auth required, session expired (no cancel, no outside dismiss), optional update (Update / Later), location explanation, location permanently denied (Settings), logout, delete account (30-day message); AR + EN texts; pure `globalDialogSpec` tested
  - [x] `AppFilterChipRow(chips: List<ActiveFilterChip>, onRemove)` wrapping row with localized remove description
  - [x] Existing `AppBottomSheet`, `AppFullScreenSheet`, `AppSheetHeader`, `AppStepIndicator`, `AppStickyActionBar` confirmed; `OverlaysGalleryPreviews` (sheet header, chips, step indicator, sticky bar) AR/EN, light/dark, portrait/landscape, tablet
- Tests: `OverlaysTest` (3); `WAB_SKIP_IOS=1 scripts/ci/run_local_checks.sh` → GATE-EXIT=0; `scripts/ci/run_ios_checks.sh` → IOS-GATE-EXIT=0
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — one dialog composable with a data-driven spec; the feature owns when/what, the kit owns how; no literals.
- Notes: dialog windows cannot be previewed, so their look was verified through the shared `AppDialog` (already in the component gallery). The CUS-021 session block was first appended to the root session file by mistake (network failure mid-command) and removed.

### CUS-022 — Media: image loading, gallery grid, banner carousel, media viewer
- Branch: `feat/cus-022-media`
- Status: DONE
- Acceptance criteria (PRD §3.14, S03 banner carousel, S07 item 11, S10; Design Script §1.2):
  - [x] `AppImage` = `SubcomposeAsyncImage` on the shared Coil loader with shimmer while loading and `AppImageFallback` on error; `contentDescription` + `contentScale` params
  - [x] `AppGalleryGrid` / `AppMediaTile` (square tiles, play badge on videos, adaptive `galleryColumns` 3/4/6); `AppBannerCarousel` (HorizontalPager, auto-swipe from `motion.bannerAutoSwipe`, page dots, localized page description, pure `nextBannerIndex`)
  - [x] `AppMediaViewer` (full-screen pager, position label, close): images pinch-to-zoom (`clampZoom`, `panOffsetFor`), videos via `AppVideoPlayer` expect/actual (Android `VideoView` + `MediaController`; iOS `AVPlayerViewController` through `UIKitView`) — compiled for both platforms by the gate
  - [x] AR + EN strings (`media_*`, `banner_description`); `MediaTest` (5); `MediaGalleryPreviews` AR/EN, light/dark, portrait/landscape, tablet; icons `Play`, `Image` added
- Tests: `scripts/ci/run_local_checks.sh` incl. iOS → GATE-EXIT=0 (`MediaTest` 5/5)
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — no new dependency (platform players), lambdas in effects via `rememberUpdatedState`, zoom gestures read state in the draw phase (`graphicsLayer` lambda), keys on every lazy/pager item.
- Notes: previews run offline so image slots show loading/fallback; real image, zoom and video playback must be exercised on a device when the first feature screen uses them (Salon Details, CUS-036/039).

### CUS-023 — Adaptive app shell: four root tabs, bottom bar / rail, IME insets, font-scale previews
- Branch: `feat/cus-023-adaptive-scaffold`
- Status: DONE
- Acceptance criteria (PRD §7.1, §3; CLAUDE.md §7):
  - [x] `App` uses `AppNavScaffold` with `rootNavItems()` (Home, Favorites, Bookings, Profile; AR + EN labels); `switchRootTab` saves/restores each tab's back stack (single top); selected tab from the back-stack hierarchy via pure `RootTab.forRoutes`
  - [x] `Graph.Favorites/Bookings/Profile` + `Screen.*` roots in `core/navigation`; `registerPlaceholderRoots()` until CUS-040/041/053
  - [x] `AppScreen(handleIme = true)` applies IME padding; `ShellGalleryPreviews` (phone portrait bottom bar, landscape + tablet rail, RTL/LTR, light/dark, font scale 2.0 frame)
  - [x] UI check on the Android emulator (Pixel, dev-debug APK, Arabic): bottom bar with Home selected, tab switch to Favorites keeps selection, landscape shows the rail at the Start edge; logcat has no fatal exception
- Tests: `RootTabTest` (4); `WAB_SKIP_IOS=1 scripts/ci/run_local_checks.sh` → GATE-EXIT=0; `scripts/ci/run_ios_checks.sh` → IOS-GATE-EXIT=0
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — routes stay in `core/navigation`, the design system never sees them; labels from resources; standard nav-compose tab switching.
- Notes: FOUND (pre-existing, not from this task): the iOS app crashes at launch in the simulator (`FIRInstallations validateAPIKey`) because both tracked Firebase configs carry 42-character API keys (Firebase expects 39): `iosApp/iosApp/GoogleService-Info.plist` and `androidApp/google-services.json` are placeholders — owner must supply the real dev configs (CLAUDE.md §1.11: not edited by me). Android runs. Also observed: the sample screen shows a raw English exception text as its error message (sample feature, replaced by CUS-006's error catalog).

### CUS-004 — Firebase facade: phone auth, push token, crash reporting, analytics backend
- Branch: `feat/cus-004-firebase-facade`
- Status: DONE
- Acceptance criteria (root CLAUDE.md §6 wrap Firebase; PRD S13, §10.2, §14):
  - [x] `core/firebase` ports `PhoneAuthGateway`, `PushTokenProvider` (+ `PushTokenRelay`), `CrashReporter`; vendor-neutral `FirebaseFailure`/`FirebaseResult`; `FakePhoneAuthGateway`, `FakePushTokenProvider`, `FakeCrashReporter`
  - [x] Android: `AndroidPhoneAuthGateway` (current Activity from the Koin property, SMS + silent auto-verification, exception → failure mapping), `AndroidPushTokenProvider`, `AndroidCrashReporter`, `AndroidFirebaseAnalyticsBackend` bound by `platformFirebaseModule()`; messaging service publishes refreshed tokens to the relay
  - [x] iOS: bridge interfaces exported in the ComposeApp framework (`export(project(":core:firebase"))`), `FirebaseBridges.swift` implements them on FirebaseAuth / Messaging / Crashlytics / Analytics (SPM products added to the Xcode project), registered in `AppDelegate`; unregistered bridges answer `Unavailable`
  - [x] `analyticsModule()` takes the backend from Koin with a no-op fallback; `FirebaseFacadeTest` (4)
- Tests: `scripts/ci/run_local_checks.sh` incl. iOS → GATE-EXIT=0 (`FirebaseFacadeTest` 4/4; iOS compiled the Swift bridges)
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — nothing Firebase-typed leaves the module; error codes/timeouts are named constants; Android Task bridging without the play-services coroutine artifact.
- Notes: DECISION (CLAUDE.md §1.12): native SDKs behind ports instead of GitLive — the iOS app already links Firebase from Swift; Firebase Android 34.2.0 train (analytics 23.0.0, auth 24.0.1, crashlytics 20.0.1). NOT verified at runtime: real SMS / token / Crashlytics calls need the real Firebase dev configs (placeholders today). Crashlytics Gradle plugin + mapping upload deferred to CUS-067.

### CUS-006 — Network kernel: envelope, error-code catalog, retry/timeouts
- Branch: `feat/cus-006-network-kernel`
- Status: DONE
- Acceptance criteria (server CLAUDE.md §6–8, BUSINESS_DOMAIN §11, PRD §3.4, CLAUDE.md §3):
  - [x] `ErrorEnvelopeDto` → `AppError.ServerError(code: ErrorCode, statusCode, message, details, traceId)`; `ErrorCode` = 41 BUSINESS_DOMAIN §11 codes + `UNKNOWN`; non-envelope HTTP → `HttpError`; transport → `NetworkError`; the template's `ApiErrorDto` removed
  - [x] 42 AR + EN strings (`error_code_*`), `ERROR_CODE_STRINGS` table + `errorResource`, `appErrorMessage` (composable) and `appErrorText` (ViewModels); main + sample ViewModels use the catalog
  - [x] `NetworkDefaults` constants; GET-only `HttpRequestRetry` with exponential backoff; `BaseResponse.meta` (`PaginationMetaDto.hasMore`); `AuthEndpoints` confirmed against `openapi.customer.json`
  - [x] Tests: `ErrorCodeTest` (2), `SafeApiCallTest` (6, MockEngine), `ErrorTextTest` (2, every code has its own string)
- Tests: `scripts/ci/run_local_checks.sh` incl. iOS → GATE-EXIT=0
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — clients branch on `code`; writes are never retried; bodies never logged; baseline shrank (removed `println`).
- Notes: owner instruction 2026-10-18: continue task after task without stopping. `PageableDto` (Laravel-style) stays until CUS-009/010 rebuild the paging source on `BaseResponse.meta`.
