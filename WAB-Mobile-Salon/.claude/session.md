# WAB-Mobile-Salon — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next merchant`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Scaffolded (MER-001) with `KMP_TEMPLATE` from the customer app: all modules, design system (flat, design files as drawn since MER-074), sample feature; rules copied in MER-003 (until then `WAB-Mobile-Customer/CLAUDE.md` applies).
- Consumes `/merchant/v1` (merchant contract 1.6.0 since MER-075, staff photos + paid at salon; 1.5.0 MER-070, WhatsApp OTP; 1.4.0 MER-068; 1.3.0 added dashboard, reviews, statistics, my account consumed by MER-050/042/043/049); MER-004 Firebase registrations = owner.
- Real-time booking requests: socket + FCM data message, Android overlay / iOS time-sensitive actions (MER-012, MER-028…030).

## Current task

<<<<<<< HEAD
<<<<<<< HEAD
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
- Loops: 0/1
- Review: PENDING
- Notes: Stopped at the owner's 25-minute limit (2026-10-27). NOT done: emulator/simulator proof of each feature (the free AVD was already in use by another session), iOS `iosApp-Dev` simulator build, Personal-Team (`iosApp-Personal.entitlements`) launch check — AppDelegate only fails `registerForRemoteNotifications` there (no crash path found in code, not run). Removed dead code: `ImagePicker` port + platform pickers, `PlatformUrlLauncher`. `android.media.ExifInterface` (framework) used, no new library; design-system commonTest gained `kotlinx-coroutines-test` (already in the catalog). Staff have no call action in PRD/design, so none was added. "Open in Maps" has no web fallback (a host literal would need build config).
=======
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
- Loops: 0/1
- Review: PENDING
- Notes: DEVIATIONS — Gradle runs only from the terminal panel (no Java in the sandbox) and the panel hook refused a new tab (6 tabs open by other agents; their tabs were not reused), so no Gradle task, no detekt, no device measurement ran. Not done (time box 25 min): narrowing the broad keep rules (`io.ktor.**`, whole `core.data/network/domain` packages) needs a release run on a device to prove nothing breaks; ProfileInstaller already arrives transitively through androidx.activity (library baseline profiles apply), no app baseline profile (needs a Macrobenchmark module); bookings list / Home / team / finance lists already use `key` + `contentType`.
>>>>>>> perf/mer-077-android-performance
=======
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
- Loops: 0/1
- Review: PENDING
- Notes: NOT DONE: Release builds, detekt, Release cold-launch measurement, own simulator run. Image cache = shared code (single Coil `ImageLoader` with default memory + disk cache in `App.kt`), not changed. Local.xcconfig untouched.
>>>>>>> perf/mer-078-ios-performance

### MER-075 — Merchant contract 1.6.0 (SRV-170) + end-to-end pass on the local stack
- Branch: `feat/mer-075-contract-1-6`
- Status: IN REVIEW
- Acceptance criteria (SRV-170, BUSINESS_DOMAIN §5.5; `GET /bookings`, `GET /bookings/{id}`, `GET /dashboard`; PRD M07–M09; design 03 `on.details`):
  - [x] `apiSync` to merchant contract 1.6.0; `api_sync --check` ok; `contract_gaps.py` 0 gaps after re-capturing `GetBookings`, `GetBookingsById` (a COMPLETED booking) and `GetDashboard` from the local stack (read-only owner capture, no full capture: it would cancel leftover bookings of the shared stack)
  - [x] Staff per person `{id, name, firstName, photoUrl}`: `StaffRef.photoUrl` mapped on list rows, details staff and persons; details person footer = design 03 26 dp staff circle (photo, else first letter) + name + start – end
  - [x] `money.remaining` = still owed (0 once final), `money.paidAtSalon` new: "Paid at the salon" row (AR + EN) when non-zero; "Refunded" only when non-zero (was shown as 0 on every booking)
  - [x] `rejection` on list rows decoded (contract tests); NOT drawn on list cards: PRD M08 card and design 03 list card have no reason (details already shows it, design `hasReason`)
  - [x] Hand dashboard mock fixture carries the new required `firstName`
  - [x] End-to-end pass on the local stack (owner, Khalda manager, Khalda employee, Rose owner; Android emulator + iOS simulator) → `docs/E2E_RESULTS.md`; 10 app defects fixed there (request sheet covering View booking / View details, raw reason codes, phone `+` at the end, scrambled RTL meta lines, reassign from the team instead of `eligible-staff`, team page 1 only, broken avatar photos, rotation back to Home, iOS sign-in with installation "unknown", SVG flags); server findings listed there
- Tests: `BookingMappersTest` (+3), `RealBookingsFixturesTest` (+1 completed booking), `BookingMoneyTest` (2, new), `BookingRequestsViewModelTest` (+2, 1 changed), `BookingDetailsViewModelTest` (+1, 1 changed), `BookingsRepositoryStaffTest` (2, new), `FormatsTest` (+2), `MainViewModelTest` (+1), `AppInstallationInfoProviderTest` (3, new); `./gradlew testAndroidHostTest` 184 suites / 606 tests / 0 failures, no `w:`; detekt ok (empty baseline); `policy_checks.py all` ok; `api_sync --check` ok; `contract_gaps` 0; `:androidApp:assembleDevDebug` ok; `:composeApp:linkDebugFrameworkIosSimulatorArm64` ok; `iosApp-Dev` Debug-Dev simulator build ok
- New library: `io.coil-kt.coil3:coil-svg` (same version as coil) — flags of `GET /locations/countries` are `.svg`.
- Loops: 1/1 — re-checked every criterion on the devices after the last fix (details with paid at salon / remaining 0 / staff letters, rejection label, request sheet closing, reassign eligible list, calendar columns, rotation, iOS sign-in + approve); found and fixed in the loop the iOS installation and the View-details covering
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — contract adopted through apiSync + captured fixtures (read-only capture, no shared-stack mutations); fixes sit in the layer that owns them (VM state, repository paging, design-system formats/avatars, shell session holder); AR + EN texts; no hardcoded values (design constants file). DEVIATIONS: the full capture script was not run (it cancels leftover bookings of the shared stack) — only the three changed reads were re-captured; SVG flags not seen drawn (local flag object 404); `ALREADY_HANDLED` only by unit tests (socket refresh wins on device); notifications inbox and bank-details save not re-run this pass; landscape/EN/dark checked on Home and details only; iOS covered sign-in, Home, request sheet, details, approve, bookings list (no landscape/dark on iOS); the merchant debug build was also installed once on the customer agent's emulator by an `installDevDebug` without a serial (no data changed there).

### MER-074 — Design as drawn, no Liquid Glass
- Branch: `feat/mer-074-flat-design`
- Branched: (from `fix/mer-073-otp-screen`)
- Status: IN REVIEW
- Acceptance criteria (owner 2026-10-26 "ignore liquid glass effect and implement the design as is"; `design/WAB Merchant 01…08 *.dc.html`, `tv()` colours):
  - [x] Glass removed from the merchant design system: `components/glass` (AppGlassSurface, liquidGlass, glassBackground, press-scale, Haze backdrop), `GlassTokens`, glass previews + tests, `haze` dependency; `AppTheme.glass` → `AppTheme.surfaces` (`SurfaceTokens`: `--card/--surface/--soft` + `--line` 1 dp, state border 1.5 dp)
  - [x] One flat primitive set (`components/surface`): `cardBackground(tone, stateBorder)` (card fill gets the line edge, tinted fills none), `barBackground(edge)`, `AppSurface`, `appClickable` (ripple); all 30 call sites in core + features moved
  - [x] Colours = design `tv()`: `--surface` #F8F7FB / #1F2340, `--soft` #F3EEFB / #2C2553 (were translucent violet)
  - [x] Tab bar = design: attached `var(--card)` bar with `border-top` line, items `padding:6px 0;gap:3px`, 22 dp icon, 11 sp 700/500 accent/faint, no pill; content sits above it (no floating inset); rail in landscape with the same flat items and a content-side edge
  - [x] Top bar = design: plain 22 dp back chevron (no circle), `padding:0 10px`, centered title; icon buttons = 46 dp `radius:14` card + line (Home bell, filter, calendar arrows)
  - [x] Buttons: gradient primary + violet shadow, disabled = `var(--soft)` + faint text (not dimmed); secondary/outlined = card + line; chips = `chipS` (36 dp, radius 11, soft + 1.5 dp #A855F7 selected, card + line otherwise, 12.5/600 ink); segmented tabs = `segS` (surface track, 4 dp gap, radius 11, gradient selected, muted others, 12.5/600); fields = card + 1.5 dp line / accent focus / danger error; toast, dialog, OTP boxes flat
  - [x] Screens checked against the design: Home (greeting above the Playfair 19 name, pending card 1.5 dp #D8B4FE border + soft shadow, KPI tiles on `--surface`/`--soft`), Salon hub (salon card radius 20, 2-column tiles radius 18 with 40 dp soft icon box, 14/700 title, 11.5 sub, `padding:8px 20px`, gap 10), Finance (gradient payout card 30/700 + divider, info on `--surface`), notifications (unread = `--soft` without edge), bookings, calendar, more, profile, services, team, policies, bank details
  - [x] M10 request sheet keyed by request id: Back no longer leaves an invisible scrim that swallows the next tap (found while touring)
  - [x] `CLAUDE.md` module map + §4 rule rewritten (design files as drawn, no Liquid Glass, owner 2026-10-26); README, detekt allowed locals, catalog comment
- Tests: `SurfaceTokensTest` (2: design colours per tone light/dark; opaque fills, 1 dp line < 1.5 dp state border); `GlassTokensTest` removed with the glass code; `./gradlew testAndroidHostTest` 181 suites / 589 tests / 0 failures; `policy_checks.py all` ok; detekt ok (empty baseline); `:androidApp:assembleDevDebug` ok; `:composeApp:linkDebugFrameworkIosSimulatorArm64` ok
- Loops: 1/1 — re-checked each criterion on the emulator (Pixel 8 Pro, local stack; Lamar owner, Khalda employee, Rose owner): AR RTL light + dark, landscape rail, employee 4-tab bar; found and fixed in the loop: invisible request-sheet scrim, hub tiles in one column (design: 2), flat finance card (design: gradient), detekt line lengths
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — change made once in the design system (tokens + one primitive file), screens follow; customer app untouched; no hardcoded values (constants files carry the design CSS). DEVIATIONS: EN LTR checked on auth/OTP only (tab screens toured in Arabic); only Home, Salon hub, Finance, Bookings, Calendar, More compared with the design file side by side (profile/services/team/policies/bank looked at, not measured); previews not re-rendered in the IDE; no iOS simulator run (framework link only).
