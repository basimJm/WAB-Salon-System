# WAB-Mobile-Customer — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next customer`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Will consume `/customer/v1` (51 ops) through DTOs generated from `WAB-Server/docs/api/openapi.customer.json` (CUS-009); mock source until the dev API exists (CUS-060 ← SRV-011).
- Done before the backlog: rules, variants + CI, policy checks, design system, base components, language/theme, permissions, refresh interceptor (CUS-001…003, 005, 007, 008, 014…017).
- Payments through the `wab-payments` KMP launcher (CUS-047 ← PAY-011); push via FCM facade (CUS-004); Firebase apps registered (dev + prod).

## Current task

- Batch 1 (CUS-032…036) shipped (PR #277). Batch 2 (CUS-037…041) shipped as one PR from `feat/cus-041-bookings-tab`. Owner rule (revised 2026-10-19): every five tasks unit tests only + one PR; detekt, full gate, emulator + simulator journey once after the whole backlog. Batch 3 (CUS-042…046) shipped (PR #287). Batch 4 (CUS-048/049/050/053/057) shipped (PR #293). Batch 5 (CUS-051/052/054/055/056) shipped (PR #296). Batch 6 = CUS-058 + CUS-059 (the last code tasks) → unit-test run green → PR. Batch 6 shipped (PR #301). `main` merged into `customer` (PR #314). CUS-064 + CUS-065 end-of-backlog pass shipped (PR #315). Backlog has no ready task: remaining rows are blocked/pending (`tasks.py next customer`).

### CUS-058 — Analytics events: every screen view and every action of PRD §14 with the common fields, verified by a test
- Branch: `feat/cus-058-analytics-events` (from `origin/customer`, batch 6 start)
- Status: DONE (batch 6, PR #301)
- Acceptance criteria (PRD §14; CUS-012 common fields already attached by `DefaultAnalyticsTracker`):
  - [x] core/mvi `UiActionObserver` tap: `BaseViewModel.onEvent` is now final (notifies the observer, then `handle(event)`); the 25 view models' reducers were renamed `onEvent` → `handle` (call sites and tests unchanged)
  - [x] App shell `AnalyticsCatalog`: `screenNameOf(Screen)` exhaustive over all 22 routes (consistent with the route-derived names of `TrackNavigationScreens`), `actionEventOf(action)` exhaustive per feature contract → `Named` (shell logs it with the owning view model), `ByViewModel` (richer event already logged with ids) or `Silent` (keystrokes, dismissals, lifecycle, paging); `ActionAnalytics.install(tracker)` wired in `App.kt`
  - [x] Shell event names cover the PRD suggested list not already logged by view models (salon/staff/service/gallery open, call/whatsapp from S15, booking steps date/slot/staff/companions/submit, filter chip remove, login open, legal open, location permission result, …)
  - [x] Tests: `AnalyticsCatalogTest` (4): every route → snake_case unique name equal to the route-derived one; every contract's actions classified; `eventFor` carries the owner and never duplicates view-model events; PRD §14 suggested events map to a constant; the tap fires before the reducer
- Tests: run with the batch-6 host-test run
- Loops: 1/1 — batch-6 full host-test run (`./gradlew testAndroidHostTest`, 297 tests across every module + `:androidApp:compileDevDebugKotlin`, exit 0) found: the core/mvi test view model still overrode `onEvent` (renamed to `handle`), `AllSalonsContract.UiAction.OnFiltersApplied` missing from the catalog (the exhaustive `when` caught it at compile time, as designed), and a typed-list inference in the tap test.
- Review: PASSED (SE ✔, Mobile N/A (no screen changed; `AppErrorState` keeps its defaults), Architect ✔, QA ✔) — the action tap lives in core/mvi with a single observer installed by the shell; the catalog is exhaustive per contract and never duplicates view-model events; error handling paths are a pure mapping over the contract codes, enforced by the new `error-codes` policy check in the gate; AR/EN parity; policy suite ok. NON-BLOCKING: screens still call `AppErrorState` with the default retry action (login / contact / update buttons wire up in the UI pass).
- Notes: payment events (`payment_start/success/failure`) and `push_open` arrive with CUS-047 (payments) and the push tap is logged when CUS-063 runs on devices (the shell routes taps today; the event constant lands with the gateway work). A new route or `UiAction` fails compilation until classified (compile-time guarantee, the unit test checks naming).

### CUS-059 — Error-code coverage: every code of BUSINESS_DOMAIN §11 and `openapi.customer.json` has AR + EN text and a handling path; contract test
- Branch: `feat/cus-059-error-coverage` (from `feat/cus-058-analytics-events`)
- Status: DONE (batch 6, PR #301)
- Acceptance criteria (BUSINESS_DOMAIN §11; `openapi.customer.json` error enums; CLAUDE.md §3 "never raw server text"):
  - [x] Policy check `error-codes` (`scripts/ci/policy/error_codes.py`, in `policy_checks.py all` and the gate): codes of §11 ∪ the snapshot's `code` enums must all be in `ErrorCode`, `ErrorCode` must not carry codes outside the contract (except `UNKNOWN`), every code needs `error_code_<code>` in EN and AR and a branch in `ErrorHandling.kt`; Python unit test `tests/test_error_codes.py`
  - [x] Handling path: `ErrorAction { RETRY, LOGIN, CONTACT, UPDATE, DISMISS }`, `errorActionOf(code)` exhaustive over the 42 codes (login for auth/account codes, contact for permission / internal / unknown, update for `UPDATE_REQUIRED`, retry for transient / availability codes, dismiss for validation-type business rules), `errorActionOf(AppError)` (transport → retry), `errorActionLabel` (retry / log in / contact us / update the app; AR/EN strings); `AppErrorState(action, onAction)` renders the matching button (retry by default, existing call sites unchanged)
  - [x] Current state: 41 contract codes + `UNKNOWN` all present with EN + AR strings (CUS-006) → check passes
  - [x] Tests: `ErrorTextTest` (+1), `test_error_codes.py` (1)
- Tests: run with the batch-6 host-test run
- Loops: 1/1 — batch-6 full host-test run (`./gradlew testAndroidHostTest`, 297 tests across every module + `:androidApp:compileDevDebugKotlin`, exit 0) found: the core/mvi test view model still overrode `onEvent` (renamed to `handle`), `AllSalonsContract.UiAction.OnFiltersApplied` missing from the catalog (the exhaustive `when` caught it at compile time, as designed), and a typed-list inference in the tap test.
- Review: PASSED (SE ✔, Mobile N/A (no screen changed; `AppErrorState` keeps its defaults), Architect ✔, QA ✔) — the action tap lives in core/mvi with a single observer installed by the shell; the catalog is exhaustive per contract and never duplicates view-model events; error handling paths are a pure mapping over the contract codes, enforced by the new `error-codes` policy check in the gate; AR/EN parity; policy suite ok. NON-BLOCKING: screens still call `AppErrorState` with the default retry action (login / contact / update buttons wire up in the UI pass).
- Notes: screens keep showing the code's text through `appErrorText`; the action mapping is now available for screens that want a login / contact / update button (`AppErrorState(action = errorActionOf(error))`). Wiring every screen to `onAction` is UI work for the end-of-backlog pass.

### T-126 — Merge `main` into `customer` (owner request 2026-10-19)
- Branch: `chore/merge-main-into-customer`
- Status: DONE (PR #314)
- Acceptance criteria:
  - [x] `origin/main` merged into a branch from `origin/customer`; only conflict = generated board in `INTEGRATION.md` (regenerated by `tasks.py board`)
  - [x] No customer-app source touched by the merge
- Tests: none needed (docs/board + server files already verified on `main`)
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — merge commit only; board regenerated from the backlogs.

### CUS-064 — Accessibility and RTL QA pass: TalkBack names, 48 dp targets, font scale 200 %, RTL mirroring, dark mode, landscape; fixes + screenshot evidence
- Branch: `feat/cus-064-a11y-rtl-qa` (from `origin/customer` after the `main` merge, PR #314)
- Status: DONE (PR #315)
- Acceptance criteria (PRD §12; CLAUDE.md §7; rules §3.13 end-of-backlog pass):
  - [x] detekt clean over the whole app after batches 1–6 (reducer splits in BookingFlow / Profile / Notifications, analytics catalog split into `AuthDiscoveryActionEvents` / `BookingAccountActionEvents`, error-action tables, line wraps, modifier/naming fixes)
  - [x] Kotlin/Native build + tests: kotlinx-datetime aligned to 0.7.1 (Ktor already pulled it on iOS → mixed klibs broke linking), `BusinessTime.nowInstant()` replaces `Clock.System` (name clash with core/common `Clock` on K/N), file-level deprecation suppressions until the datetime API migration, `toEpochDays()` Long, `import ComposeApp` in `iOSApp.swift`
  - [x] Emulator journey (Pixel-class AVD, mock data, 39 screenshots + uiautomator dumps in the session scratchpad): onboarding → S02 → Home AR/RTL light → Profile → theme Dark → language EN/LTR → landscape (rail) → font scale 2.0 (wraps, no clipping) → All salons → Salon details → auth gate → Login → OTP (mock) → Home registered → booking steps 0–5 (draft + summary) → verify placeholder → Bookings → Booking details → Notifications (popup, filter sheet) → Profile registered (photo sheet) → FAQ → Contact sheet → Edit profile (S22)
  - [x] Audit script (`a11y_dump.py`: clickable nodes without a label, targets under 48 dp at 440 dpi) → findings fixed: picker radio rows misaligned and only the radio tappable (now centered, whole row tappable); `AppTextButton` 16 dp tall (all buttons now ≥ 48 dp); button labels truncated in narrow cards ("WhatsA…" on S15; labels wrap to 2 lines); "Personal information" section header duplicated the row (now "Account"); unlabeled clickable containers were Compose wrappers whose child carries the text/content-desc (false positives)
  - [x] Final gate green (`scripts/ci/run_local_checks.sh` exit 0 on the final commit: policy tests, policy checks, contract, detekt, Gradle unit tests + 4 Android variants, 4 iOS configurations, K/N tests)
- Tests: `scripts/ci/run_local_checks.sh` exit 0 (2026-10-19, after `2277fc8`)
- Loops: 1/1 — re-checked every criterion against the journey screenshots + a11y dumps and the gate log; the AppButton min-height change re-verified on S15/S21 before the final gate
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — fixes are confined to the design system (`AppButton`, `RadioRow`) and one string; all strings AR+EN; no hardcoded values; gate green. DEVIATION: iOS simulator journey not run (placeholder Firebase keys, owner input); Android journey only, on one AVD.
- Notes: iOS simulator journey still blocked by the placeholder Firebase keys (`GoogleService-Info.plist`, owner input); the iOS build itself is green. Slot chips show the fixture's raw "09:00" (real server sends instants → 12-hour text).

### CUS-065 — Performance pass: cold start, R8 keep rules, release size budget, baseline profile, image sizing, no main-thread blocking; measurements recorded
- Branch: `feat/cus-064-a11y-rtl-qa` (same end-of-backlog branch)
- Status: DONE (PR #315)
- Acceptance criteria (CLAUDE.md §6; `config/budgets.json` 60 MiB per flavor):
  - [x] Cold start (dev debug, emulator, `am start -W` ×3 after force-stop): 1021 / 968 / 969 ms TotalTime; PSS after launch 176 MB (debug build, Compose + Koin)
  - [x] Release APK size: dev 10,307,971 B, prod 10,308,003 B (unsigned, R8) vs budget 62,914,560 B → `budget: ok`
  - [x] R8: release variants minified + shrunk by the convention plugin with the keep rules of CUS-001; the gate builds them
  - [x] Main thread: repositories/use cases run on IO through Ktor; mapping is small; no `runBlocking`/`Thread.sleep` (policy Q rules); lists use keys + content types (P001)
  - [x] Images: `AppImage` sized to its slot with Coil caches; avatar uploads compressed on device to ≤ 1024 px JPEG q85
  - [x] Baseline profile: not generated (needs a device run of the `baselineprofile` module → deferred to the release task CUS-066 with the owner's signing)
- Tests: measurements above; `policy_checks.py budget` ok; gate exit 0
- Loops: 1/1 — numbers re-read from the gate output; no code change specific to this task beyond the batch fixes
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — measurements recorded, budget enforced in the gate. DEVIATION: baseline profile deferred to CUS-066 (needs owner signing/device run); cold start measured on a debug build only.

### T-127 — Docs: CUS-064/065 DONE, board + session index
- Branch: `docs/cus-064-065-done`
- Status: IN REVIEW
- Acceptance criteria: statuses set through `tasks.py`; board regenerated; session/memory current
- Tests: none (docs only)
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — docs only, no source changed.

### CUS-069 — Design fidelity pass: app icon + logo, every component and screen matched to `design/WAB 0x *.dc.html`
- Branch: `feat/cus-069-design-fidelity`
- Status: DONE (PR #322)
- Branched from `origin/customer` after PR #319.
- Acceptance criteria (owner request 2026-10-19/20; design files = reference, `CLAUDE.md` §3 precedence):
  - [x] App icon = `design/assets/wab-app-icon.png` on iOS + Android (legacy, round, adaptive, Play 512); in-app logo = same icon via `brand/AppLogo` + `AppBrandHeader` (wordmark/tagline typography tokens, non-translatable brand strings)
  - [x] Design icons: 50 stroke icons rebuilt from the design SVG paths (`icons/DesignIcons.kt` + `DesignIconPaths.kt`), `AppIcons` points at them (Material kept only for icons the design lacks)
  - [x] Chrome: tab bar (22 dp icons, bold active label, top hairline, design padding), top bar title bold
  - [x] Screens rewritten against the design: auth/onboarding/system (01), discovery (02), salon (03), booking flow + S17 (04), bookings + details + rating (05), notifications/favorites/profile/edit/content (06); feature values in `*DesignConstants.kt`
  - [x] Date fields open a calendar (owner request 2026-10-20): `AppDatePickerDialog` (theme colours, AR/EN title, calendar only, no typed-input toggle) + `DatePickerDates` (ISO ↔ picker millis, dd/MM/yyyy display); notifications From/To use it
  - [x] Policy: `*Constants.kt` may hold dp/sp (previews still may not); test added
- Tests: `scripts/ci/run_local_checks.sh` exit 0 (policy, contract, detekt, unit tests + 4 Android variants, 4 iOS configs, K/N tests) after the screen work; then `testAndroidHostTest` + detekt + policy green after the date picker; new `DatePickerDatesTest` (4), `BookingSuccessViewModelTest` copied flag, `test_hardcoded` constants case
- Loops: 1/1 — re-checked: gate log, emulator (Pixel AVD, AR dark) home with design icons/tab bar, notifications filter → calendar → 20/10/2026 → Apply enabled; found and fixed: English picker title, typed-date toggle, preview dp exemption, booking legend detekt, success-VM test collector
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — design-system additions are token-based and reusable; no contract/API change; AR+EN strings for every new key. DEVIATIONS: per-screen visual comparison was done by agents reading the design HTML, emulator spot-checks only covered home and the notifications filter (not every screen, not EN light / landscape); iOS simulator run blocked by placeholder Firebase keys; states the contracts cannot express (salon image on booking cards, staff rating, bride-only VIP flag, payment verify screen = CUS-047) stay as before; the claude.ai/design import could not run (needs interactive `/design-login`), the repo copies of the design were used.

### T-128 — Docs: CUS-069 DONE
- Branch: `docs/cus-069-done`
- Status: IN REVIEW
- Acceptance criteria: status set through `tasks.py`; board regenerated
- Tests: none (docs only)
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — docs only.

### CUS-070 — iOS: no launch crash with placeholder Firebase keys; OTP countdown text
- Branch: `fix/cus-070-ios-firebase-guard`
- Status: DONE (PR #325)
- Acceptance criteria (owner request 2026-10-20 "run iOS and see if there are crashes"):
  - [x] Launch no longer crashes: `FirebaseSetup.configureIfValid()` configures Firebase only when `GoogleService-Info.plist` has a 39-char API key; otherwise no Firebase bridges, no Messaging delegate, APNs token ignored (Kotlin side falls back to its no-op bridges, as Android does)
  - [x] OTP resend line formats the countdown into `otp_resend_in` (was showing a raw `%1$s`)
- Tests: `:feature:auth:presentation:testAndroidHostTest` green, detekt + policy green, `xcodebuild iosApp-Dev Debug-Dev` succeeded
- Loops: 1/1 — simulator (iPhone 17, AR light): launch → onboarding → nickname → home → salon → book (login gate) → login → OTP → home → bookings → booking details → profile → favorites → notifications → filter → calendar → 15/10/2026 → logout → login → OTP text fixed; no crash report after the fix (only the 10:02 pre-fix `com.firebase.installations` report)
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — guard is a startup-only Swift change; real keys keep the full Firebase path. DEVIATION: with placeholder keys iOS runs without push/analytics/crash reporting until the owner supplies the real plist; no Swift unit test (the guard is plain plist reading, verified on the simulator).

### T-129 — Docs: CUS-070 DONE
- Branch: `docs/cus-070-done`
- Status: IN REVIEW
- Acceptance criteria: status set through `tasks.py`; board regenerated
- Tests: none (docs only)
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — docs only.

### CUS-071 — Firebase per environment; version name without env suffix
- Branch: `feat/cus-071-firebase-per-env`
- Status: DONE (PR #334; customer → main #335; main → customer synced)
- Acceptance criteria (owner requests 2026-10-21):
  - [x] Dev ids `com.fab.wab.customer.dev` (Android `DEV_APPLICATION_ID_SUFFIX=.dev`, iOS `BUNDLE_ID_SUFFIX = .dev`); prod `com.fab.wab.customer`
  - [x] Android `src/{dev,prod}/google-services.json`; iOS `iosApp/Firebase/{dev,prod}/GoogleService-Info.plist` copied by the "Copy Firebase Config" build phase per `APP_ENV`; old single files removed; placeholders until the owner's real files
  - [x] `docs/FIREBASE_SETUP.md` (console steps, SHA keys, APNs, file paths); CLAUDE.md rule paths updated
  - [x] `/config` app version: Android `versionNameSuffix` removed, so dev and prod send `1.0` (iOS already `1.0`)
- Tests: aapt: dev `com.fab.wab.customer.dev` 1.0, prod `com.fab.wab.customer` 1.0; xcodebuild Debug-Dev / Debug-Prod: bundle id and bundled plist BUNDLE_ID match; gate: policy, contract, detekt, unit tests, all Android variants, iOS Dev configs green
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — build config only; no business code. DEVIATIONS: gate stopped by the owner before iOS Prod configs and K/N tests (Debug-Prod built by hand and green); side-by-side install on a device not done (emulator was closed); real Firebase files pending (owner).

### CUS-072 — iOS Phone OTP URL scheme + Crashlytics dSYM upload
- Branch: `feat/cus-072-firebase-ios-otp-crashlytics`
- Status: DONE (PR #336)
- Acceptance criteria (owner request 2026-10-21 "set up Firebase SMS OTP, Analytics, Crashlytics for Android and iOS"):
  - [x] Android: Phone Auth, Analytics, Crashlytics, FCM already wired (CUS-004); nothing missing in code
  - [x] iOS Phone Auth: build step registers the encoded-app-id / reversed-client-id URL scheme from the env plist; `FirebaseSetup.handleAuthURL` passes reCAPTCHA return URLs to Firebase Auth before deep links
  - [x] iOS Crashlytics: "Upload Crashlytics Symbols" phase (Release dSYMs; skipped for placeholder configs)
  - [x] `docs/FIREBASE_SETUP.md` lists what is wired per platform
- Tests: xcodebuild Debug-Dev + Release-Prod green; built Info.plist has the URL scheme; upload step skips with the placeholder; app launches on the simulator
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — build scripts + one Swift entry point. DEVIATION: real OTP, events and crash reports cannot be verified until the owner adds the real Firebase files and finishes the console steps.

### CUS-073 — Firebase App Check (Play Integrity / App Attest) + phone-auth resend token
- Branch: `feat/cus-073-firebase-app-check`
- Status: DONE (PR #337)
- Acceptance criteria (owner request 2026-10-21 "Firebase Auth, Phone Auth and App Check Play Integrity on Android and iOS"):
  - [x] Android App Check: Play Integrity provider in release, debug provider in debug (per build-type source sets, so the debug provider never ships); installed in `AndroidApp.onCreate` before any Auth call, skipped when Firebase is not initialised
  - [x] iOS App Check: `WABAppCheckProviderFactory` (App Attest, DeviceCheck before iOS 14, debug provider on simulator / Debug) set before `FirebaseApp.configure`; FirebaseAppCheck package linked; App Attest entitlement per env (`APP_ATTEST_ENVIRONMENT`)
  - [x] Phone Auth (Android): Firebase resend token reused for the same number, cleared on sign-out; Auth + Phone Auth flow otherwise unchanged (already complete)
  - [x] `docs/FIREBASE_SETUP.md`: App Check console steps (Play Integrity link, App Attest/DeviceCheck, debug tokens, enforce last), Apple capability
- Tests: `:androidApp:assembleDevDebug` + `:androidApp:assembleProdRelease` + `:core:firebase:testAndroidHostTest` green; xcodebuild Debug-Dev + Release-Prod green; detekt + policy green; app launches on the simulator
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — providers chosen by build type, no secrets. DEVIATIONS: App Check tokens, OTP and enforcement cannot be verified until the owner adds the real Firebase files, links Play Integrity and enables App Attest on the App IDs; device build signing for the App Attest entitlement is owner input.

### CUS-074 — OTP: Verify does nothing when Firebase did not send a code
- Branch: `fix/cus-074-otp-verify-guard`
- Status: DONE (PR #338)
- Acceptance criteria (owner report 2026-10-21 "verify button not work on verification screen"):
  - [x] Root cause found on the emulator: Firebase `verifyPhoneNumber` failed with 17006 (`ERROR_OPERATION_NOT_ALLOWED`, Phone provider not enabled in `wab-dev-397ab`), so there was no verification to confirm, yet Verify was enabled and silently returned
  - [x] `UiState.codeSent`: true only after Firebase reports the code sent; `canVerify` requires it; cleared on every new request and on Firebase failure (stale verification dropped)
  - [x] Test `firebaseSendFailureKeepsVerifyOffAndShowsTheError`
- Tests: `:feature:auth:presentation:testAndroidHostTest` green, detekt + policy green; emulator: OTP screen with no sent code shows Verify disabled
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — state-only change, no contract/API change. NOTE: real SMS still needs the owner to enable Phone sign-in (and App Check debug token / SHA keys) in Firebase.

### CUS-075 — Phone Auth diagnostic logs (Android + iOS)
- Branch: `feat/cus-075-phone-auth-logs`
- Status: DONE (PR #339)
- Acceptance criteria (owner request 2026-10-21 "no real SMS received, add logs for Firebase phone auth"):
  - [x] Android tag `WAB-PhoneAuth`: start (masked phone, activity, project, resend token), verifyPhoneNumber requested, codeSent (+ elapsed ms and what to check), autoRetrievalTimeout, verificationCompleted, failures with exception type + Firebase errorCode + message, confirm start / OK / failure; App Check token OK / FAILED at startup
  - [x] iOS prefix `WAB-PhoneAuth` (NSLog): same steps, `AuthErrorCode` name on failures, App Check token result, "Firebase NOT configured" when the plist is a placeholder
  - [x] No codes or tokens logged; numbers masked (`+962*****059`)
- Tests: Android installDevDebug + prodRelease + core:firebase tests green, iOS Debug-Dev green, detekt + policy green; emulator log shows `WAB-PhoneAuth: codeSent … afterMs=3182`
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — logging only, PII masked.

### CUS-076 — Firebase Android SDK upgrade (owner bumped versions) + FCM 26 API
- Branch: `feat/cus-076-firebase-upgrade`
- Status: DONE (PR #340)
- Acceptance criteria (owner request 2026-10-21 "updated Firebase versions, update the code for deprecations"):
  - [x] Versions (owner): google-services 4.5.0, Crashlytics plugin 3.0.8, Messaging 26.0.0, Analytics 24.0.0, Auth 25.0.0, Crashlytics 21.0.0, App Check 20.0.0
  - [x] FCM 26 deprecates `getToken()` / `deleteToken()` / `onNewToken()`: now `FirebaseMessaging.register()` at startup and in `AndroidPushTokenProvider.currentToken()`; the token arrives in `MyFirebaseMessagingService.onRegistered()` → `PushTokenRelay` + `AppSettings`; provider waits up to 15 s for it
  - [x] No other deprecations (build is `-Werror`); iOS Firebase 12.12.1 unchanged
- Tests: devDebug + prodRelease assemble, all host unit tests, detekt + policy green; emulator: app starts, `appCheck token OK (provider=debug)`
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — API swap only. DEVIATION: delivery of a push to the new token not tested (needs a send from the Firebase console).

### CUS-077 — Booking verification (OTP) + success, no online payment; FCM token stored again
- Branch: `feat/cus-077-booking-verify`
- Status: DONE (PR #342)
- Acceptance criteria (owner requests 2026-10-21):
  - [x] `Screen.BookingVerify(draftId)` real screen (placeholder `PlaceholderNavigation.kt` removed): loads the draft (salon, date/time, people, pay on arrival, total), "Verify with code" → OTP (BOOKING_CONFIRMATION, own phone from the profile) → `verify-otp` → `POST /bookings` → `BookingSuccess`; the whole booking flow (start, summary, verify) is popped so Back from S17 leaves booking
  - [x] Errors: DRAFT_EXPIRED → message + back to booking; failed verify → retry reopens OTP; failed create → retry create without a new code
  - [x] Summary: only PAY_ON_ARRIVAL selectable; online methods visible but disabled with AR/EN "coming soon" note
  - [x] FCM token stored at startup again: `AndroidApp` stores `PushTokenProvider.currentToken()` (register + `onRegistered` relay, fallback to the stored registration)
  - [x] Tests: `BookingVerifyViewModelTest` (happy path, other-purpose proof ignored, expired draft, expiry during create, verify failure, create failure), repository mapper test, booking fakes + summary payment test updated
- Tests: `./gradlew :androidApp:assembleDevDebug testAndroidHostTest` exit 0 (all modules), detekt exit 0, policy ok; dev build installed on the emulator
- Loops: 1/1 — re-checked every criterion against the code and the test run; found and fixed: Back after success landed on the summary step (now `popUpTo<Screen.BookingStart>(inclusive)`)
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — reuses the OTP hand-off pattern (`PendingOtpVerification`), contract ops from the generated snapshot, no payment code. DEVIATIONS: emulator walk-through stopped at login (Firebase rejected 123456 for the test number +962799000004 — owner to confirm the test code), so the verify/success screens were not exercised on a device; iOS not built for this change; FCM token delivery not tested with a console push.

### CUS-078 — Dev deep links on the dev server host (owner request 2026-10-21)
- Branch: `feat/cus-078-dev-app-links`
- Status: DONE (PR #345)
- Acceptance criteria (PRD §4.4; server SRV-135 serves the .well-known files + fallback page):
  - [x] Dev web/deep-link host = `wab-server-dev.onrender.com` (Android `DEV_WEB_BASE_URL`, iOS Dev `WEB_BASE_URL` + `DEEP_LINK_HOST`), so shared salon links are `https://wab-server-dev.onrender.com/salon/{id}`; prod unchanged (placeholder until the domain exists)
  - [x] `docs/DEEP_LINKS_CHECKLIST.md`: current setup + Render env values
- Tests: config only (no code); emulator: `am start -a VIEW -d https://wab-server-dev.onrender.com/salon/08c23382575950264c482f48` opens Salon Details "Gentlemen's Corner"; policy ok
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — config + doc only. PENDING (owner): set `APP_LINKS_*` on Render dev and deploy `server` (dev host still answers 404 for assetlinks.json), then verify the tap-from-WhatsApp path on a device; iOS needs the Team ID + Associated Domains capability.

### CUS-079 — iOS signing: entitlements actually applied; team + free-account mode configurable
- Branch: `fix/cus-079-ios-signing`
- Status: DONE (PR #346)
- Acceptance criteria (owner request 2026-10-21 "run on my iPhone 17 Pro"):
  - [x] Bug: `CODE_SIGN_ENTITLEMENTS` was never set, so push, Associated Domains and App Attest were never signed into the app; now `CODE_SIGN_ENTITLEMENTS = $(WAB_ENTITLEMENTS)` (default `iosApp/iosApp.entitlements`) in `Config.xcconfig`
  - [x] Team no longer hardcoded in the target: `DEVELOPMENT_TEAM = $(TEAM_ID)` (default X6UZ9NMK56); bundle id no longer appends `$(TEAM_ID)`
  - [x] Optional git-ignored `Local.xcconfig` (included last by Dev/Prod) + `Local.xcconfig.example`: own `TEAM_ID`, and `WAB_ENTITLEMENTS = iosApp/iosApp-Personal.entitlements` (empty) for free Apple IDs
- Tests: policy ok; xcodebuild Debug-Dev simulator green; generated entitlements = aps-environment development, applinks:wab-server-dev.onrender.com, appattest development; bundle id com.fab.wab.customer.dev
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — build config only. PENDING (owner): sign in to Xcode with an Apple ID and enable Developer Mode on the iPhone before a device build can run.

### CUS-080 — iOS dev API base URL cut at `//` (splash called `http://https/customer/v1/config`)
- Branch: `fix/cus-080-ios-dev-api-url`
- Status: DONE (PR #347)
- Acceptance criteria (owner report 2026-10-22 on the real iPhone):
  - [x] `Dev.xcconfig` `API_BASE_URL` written as `https:/$()/wab-server-dev.onrender.com` (`//` starts an xcconfig comment, the value became `https:`)
  - [x] iOS dev uses the real dev server like Android (`DATA_SOURCE = remote`, owner change)
- Tests: built app Info.plist `API_BASE_URL` checked after the device build; config only
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — config only. LESSON: every URL in an xcconfig needs the `$()` split.

### CUS-081 — Liquid Glass (iOS 26 style) across the app
- Branch: `feat/cus-081-liquid-glass`
- Status: DONE (PR into `customer`)
- Acceptance criteria (owner requests 2026-10-22: liquid glass everywhere like iOS native, comfortable with the current design; bottom sheet must show):
  - [x] Material (`components/glass`): Haze 1.7.2 backdrop blur for chrome; content glass = see-through gradient body, specular sheen, refractive diagonal rim; tokens in `GlassTokens` (light + dark, palette-derived); liquid press (spring scale, no ripple) `rememberGlassPress`/`glassPressScale`/`glassClickable`; violet ambient `glassBackdrop` behind every `AppScreen`
  - [x] Applied: tab bar (+ glass lens on the selected tab), rail, top bars, sheets, dialogs, sticky bars, toasts, buttons (primary keeps gradient + sheen/rim), icon buttons, cards, chips, time slots, segmented tabs, text field, dropdown, search bar, OTP boxes
  - [x] Bottom sheet visible again (own window has no backdrop → card colour + sheen/rim)
  - [x] Home, Bookings, Favorites, Profile scroll under the floating tab bar (`scrollsUnderTabBar` + `tabBarInset()`)
  - [x] Tests `GlassTokensTest` (+3: content transparency, rim/press/ambient, Content mode)
  - [x] Base primitive `AppGlassSurface(modifier, shape, style: GlassStyle.Subtle|Regular|Prominent, contentPadding, clipContent, blurBackdrop, content)`: glass on a background layer (children not clipped, no click/padding/size imposed), variants from `GlassTokens.level/fillTop/fillBottom/sheen`; shared `glassMaterial` used by `liquidGlass` (compat) and the surface; `AppCard` adopts it; `GlassGalleryPreviews` (variants × plain/brand/hero backgrounds, long text, nested, narrow, light/dark, RTL, font scale 2)
  - [x] Owner feedback round 2: `glassBackground(AppTheme.glass, shape, style, stateBorder)` (non-clipping) replaces `.background(colors.card).border(...)` in 25 feature files (cards, sections, rows, auth/profile/notification fields, OTP, search rows, filter options, salon Call/WhatsApp buttons, booking rows, slots); top bar + sticky bar drawn without rim; icon buttons = inset glass circle (no more touching circles in the top bar); emulator: Home, Profile, Salon details checked
  - [x] Owner feedback round 3: top bar back to opaque (no glass); light mode visible (lighter body 0.62→0.34, ambient 0.26, violet edge `gradientStart`@0.22, violet soft shadow per level 2/6/14 dp); text fields, search, dropdown, OTP, segmented, chips, secondary/outlined buttons and the tab lens use `glassBackground` (edge + shadow); OTP: no double border, no clip; Profile header card + Edit = glass; emulator light + dark Home/Profile checked
  - [x] Round 4: inner fills `soft`/`surface`/shimmer are translucent tints (no solid boxes inside glass); no elevation shadows under see-through glass (showed through as a dark inner rectangle): removed from `glassBackground`, `AppGlassSurface`, `AppCard` and 5 feature cards; Bookings header gets the status-bar inset (pre-existing overlap); emulator light + dark: Home, Home scrolled, Salon details, Bookings, Profile, Login
  - [x] Adaptive layout: navigation rail = floating glass capsule (inset, tab-bar shape) with a glass lens + liquid press on the selected item
  - [x] Tests: `GlassTokensTest` 11 (variant ordering, alphas ≤ 1, WCAG AA ink contrast for every style light/dark, blur-vs-fallback decision)
- Tests: gate on the final tree: policy ok, detekt ok, `testAndroidHostTest` (all modules) + `assembleDevDebug` + `assembleProdRelease` ok, `linkDebugFrameworkIosSimulatorArm64` ok
- Loops: 1/1 — re-checked every criterion on the emulator (light + dark: Home, Home scrolled, Salon details, Bookings, Profile, Login) after four owner feedback rounds; found and fixed: invisible sheet, top-bar rim and touching icon circles, invisible light glass, solid inner fills, see-through shadows, OTP double border, Bookings status-bar overlap, detekt findings
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — one base primitive (`AppGlassSurface` / `glassBackground` / `liquidGlass` share `glassMaterial`), token-driven light/dark, no feature logic touched, contrast AA tested. DEVIATIONS: landscape rail not seen on a device (emulator refused to rotate; builds + gate only); Arabic/RTL, OTP and booking-flow screens and the iOS simulator not checked visually; glass is a Compose imitation (no refraction), real blur only behind the floating bars; dialogs/sheets stay opaque (separate windows).
