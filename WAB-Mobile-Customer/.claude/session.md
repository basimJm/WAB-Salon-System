# WAB-Mobile-Customer — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next customer`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Will consume `/customer/v1` (51 ops) through DTOs generated from `WAB-Server/docs/api/openapi.customer.json` (CUS-009); mock source until the dev API exists (CUS-060 ← SRV-011).
- Done before the backlog: rules, variants + CI, policy checks, design system, base components, language/theme, permissions, refresh interceptor (CUS-001…003, 005, 007, 008, 014…017).
- Payments through the `wab-payments` KMP launcher (CUS-047 ← PAY-011); push via FCM facade (CUS-004); Firebase apps registered (dev + prod).

## Current task

- CUS-023 next (adaptive scaffolds); task branches start from `origin/customer`.

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
