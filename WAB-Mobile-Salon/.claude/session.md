# WAB-Mobile-Salon — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next merchant`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Scaffolded (MER-001) with `KMP_TEMPLATE` from the customer app: all modules, design system (flat, design files as drawn since MER-074), sample feature; rules copied in MER-003 (until then `WAB-Mobile-Customer/CLAUDE.md` applies).
- Consumes `/merchant/v1` (merchant contract 1.6.0 since MER-075, staff photos + paid at salon; 1.5.0 MER-070, WhatsApp OTP; 1.4.0 MER-068; 1.3.0 added dashboard, reviews, statistics, my account consumed by MER-050/042/043/049); MER-004 Firebase registrations = owner.
- Real-time booking requests: socket + FCM data message, Android overlay / iOS time-sensitive actions (MER-012, MER-028…030).

## Current task

### MER-078 — Performance: iOS release build + Compose iOS settings
- Branch: `perf/mer-078-ios-performance`
- Status: IN PROGRESS
- Acceptance criteria (owner 2026-10-27: the iOS app lags; smooth on Dev/Prod, Debug/Release; iOS only, shared Compose in a parallel task):
  - [x] Release-Dev/Release-Prod: Kotlin/Native release framework (`KOTLIN_FRAMEWORK_BUILD_TYPE = release`, read by `embedAndSignAppleFrameworkForXcode`), Swift `-O` + whole module, `DEAD_CODE_STRIPPING`, every arch (`ONLY_ACTIVE_ARCH` YES only in Debug), SwiftUI previews off in Release; locked by policy V001 (`_check_ios_build_settings`)
  - [x] K/N runtime: `-Xbinary=appStateTracking=enabled` (no timer GC in the background); `gc` stays the default CMS, `objcDisposeOnMain` stays default (Compose releases UIKit objects on main)
  - [x] `ComposeUIViewController(configure = { parallelRendering = true })` (Compose 1.10.3 API); ProMotion `CADisableMinimumFrameDurationOnPhone` already in Info.plist, verified by the default strict plist check
  - [x] Startup: APNs registered once and only when Firebase is configured; `didFailToRegister` logs once, no retry (Personal Team without `aps-environment`); Koin stays synchronous before the first frame (the UI reads it immediately), Firebase `configure` must run on main; realtime socket is not started at launch (`IosBookingRequests.start` only observes the language)
  - [ ] Simulator builds: iosApp-Dev Debug-Dev + Release-Dev, iosApp-Prod Release-Prod
- Tests: `scripts/ci/tests/test_variants.py` (+5 `IosBuildSettingsTest`); `python3 -m unittest discover -s scripts/ci/tests` 110 OK; `policy_checks.py all` ok
- Loops: 0/1
- Review: PENDING
- Notes: image cache = shared code (single Coil `ImageLoader` with default memory + disk cache in `App.kt`), not changed. Local.xcconfig untouched.

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
