# WAB-Mobile-Customer — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next customer`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Will consume `/customer/v1` (51 ops) through DTOs generated from `WAB-Server/docs/api/openapi.customer.json` (CUS-009); mock source until the dev API exists (CUS-060 ← SRV-011).
- Done before the backlog: rules, variants + CI, policy checks, design system, base components, language/theme, permissions, refresh interceptor (CUS-001…003, 005, 007, 008, 014…017).
- Payments through the `wab-payments` KMP launcher (CUS-047 ← PAY-011); push via FCM facade (CUS-004); Firebase apps registered (dev + prod).

## Current task

- Batch 7 = salon branches (CUS-082…086, then CUS-087), chained branches from `feat/cus-082-branches-contract`; per task policy checks + tests written, host unit tests after five (rules §3.13). The parent agent pushes and merges the chain.

### CUS-087 — Bookings list/details, notifications and the review flow show the branch (name + address); review attaches the branch
- Branch: `feat/cus-087-bookings-branch` (from `feat/cus-086-booking-branch`)
- Status: IN REVIEW
- Acceptance criteria (BUSINESS_DOMAIN §5.11, §5.18; `GET /customer/v1/bookings`, `GET /customer/v1/bookings/{id}`, `POST /customer/v1/salons/{id}[/staff/{memberId}]/reviews`):
  - [x] Bookings list card: "Branch: ‹name›" under the salon name; booking details salon block: branch name + address (`BookedBranchLines`); nothing for bookings made before branches
  - [x] Booking details Call / WhatsApp use the booked branch's phone and WhatsApp (salon profile `forBranch(booking.branch)`), image stays salon-wide
  - [x] Rating flow (S18): every step carries the booked branch, the salon step shows it, and both salon and staff reviews send `branchId`; `ReviewDraft.branchId` → review bodies
  - [x] Notifications: tapping a booking notification opens booking details, which shows the branch; the notification list text itself is rendered by the server (`GET /notifications` has no branch field)
- Tests: `RatingStepsTest` (+1), `RatingViewModelTest` (+1), `BookingDetailsViewModelTest` (+1), `ReviewsRepositoryTest` (1, request bodies); `testAndroidHostTest` exit 0 (401 host tests, 0 failures), `run_detekt.sh` exit 0, policy `all: ok`
- Loops: 1/1 — own unit-test run on the final tree (`./gradlew testAndroidHostTest`, 401 tests, 0 failures) + detekt + policy; found and fixed: MockEngine test without JSON content type / with an unparsable `data`, one detekt MaxLineLength in `ReviewsRepositoryImpl`
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — branch display is one shared composable; review branch flows domain → data body; contacts reuse `forBranch`; strings AR+EN. DEVIATIONS: notification rows cannot show the branch client-side (no contract field; server text); reviews written from salon details (not from a booking) stay salon-wide (no branch picker), as BUSINESS_DOMAIN §5.11 allows; UI not opened on a device.
- Notes: `feature/salon/data` gets `kotlinx-coroutines-test` + `ktor-client-mock` for tests (catalog entries already used by other data modules; no new library).

### CUS-086 — Booking step 1 = choose branch (skipped when one bookable branch); services, staff and slots of that branch; summary shows the branch; a deep link with `branchId` preselects it
- Branch: `feat/cus-086-booking-branch` (from `feat/cus-085-details-branches`)
- Status: IN REVIEW
- Acceptance criteria (BUSINESS_DOMAIN §5.18; `POST /customer/v1/salons/{id}/availability`, `POST /customer/v1/bookings/drafts`):
  - [x] New first step `BookingStep.BRANCH` (title, hint, one selection card per branch with address and today's open/closed line); Continue needs a branch; progress bars and "Step x of n" count only the steps this salon has
  - [x] Skipped when the salon has one bookable branch (auto-selected) or when a branch arrives from salon details / deep link (`Screen.BookingStart(salonId, branchId)`); with several branches Back from the person step returns to the branch step, Back from the first step exits
  - [x] After the choice the flow uses `salon.forBranch(branch)`: services/prices, staff, weekly hours and closures of that branch only; changing the branch clears every person's services, slot and staff (names stay)
  - [x] Availability and draft requests send `branchId` (repositories, use cases, `availabilityBodyOf`, `draftBodyOf`); `BRANCH_REQUIRED` / `BRANCH_NOT_BOOKABLE` / `BRANCH_NOT_FOUND` surface through the localized error texts of CUS-082
  - [x] Summary shows "Branch: ‹name›" and the branch address
  - [x] Deep link `https://<web>/salon/{salonId}?branchId={branchId}` → `DeepLink.Salon(salonId, branchId)` → salon details with that branch preselected → Book now carries it
- Tests: `BookingFlowBranchTest` (5), `BranchRequestBodiesTest` (2), `DeepLinksTest` (+1); fakes updated (`DraftFake`/`AvailabilityFake` record the branch, `VerifyRepoFake`); full `testAndroidHostTest --continue` green
- Loops: 1/1 — batch run (CUS-082…086) on the final tree: `./gradlew testAndroidHostTest` exit 0, 397 host tests, 0 failures (Gradle reused up-to-date results of unchanged modules), plus `run_detekt.sh` exit 0 and `policy_checks.py all` ok; found and fixed during the batch: `HomeMappersTest` missing `branchCount`, `VerifyRepoFake` old `create` signature, one 168-char KDoc line (detekt MaxLineLength)
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch code reading: branch rules are pure domain functions (`BranchRules`, `forBranch`, `withLoadedSalon`/`withBranch`) shared by details and booking; contract additive and nullable for older servers; route args through `SalonDetailsArgs`/`BookingFlowArgs` (no nullable Koin parameters); AR+EN strings incl. Arabic plurals; no hardcoded values (policy ok). DEVIATION: UI not opened on the emulator/simulator yet (rules §3.13 defers it to the end of the backlog)
- Notes: ASSUMPTION — the deep-link query name `branchId` (BUSINESS_DOMAIN §5.17 says a link "may carry `branchId`" without a URL format); analytics `booking_branch_select` (catalog: by view model). The verify screen (draft response has no branch field) does not show the branch.

### CUS-085 — Salon details: clear, always-visible branch selector; branch address, map, phone, hours, open now; staff and services/prices per selected branch; reviews salon-wide with the branch label on each
- Branch: `feat/cus-085-details-branches` (from `feat/cus-084-nearest-branches`)
- Status: IN REVIEW
- Acceptance criteria (BUSINESS_DOMAIN §5.11, §5.17; `GET /customer/v1/salons/{id}`):
  - [x] Branch selector right under the header whenever the salon has more than one bookable branch: one chip per branch (main first, "· Main" mark), selected chip highlighted; single-branch salons show no selector
  - [x] Initial branch = route `branchId` (Home nearest entry / deep link) when listed, else main, else first; the choice survives pull-to-refresh; unknown ids are ignored
  - [x] `UiState.view = salon.forBranch(selected)`: header location link + maps (pin label "Salon - Branch"), open/closed badge, Call / WhatsApp, working hours, closures, staff and services/prices all follow the selected branch; name, gallery, description, rating and reviews stay salon-wide
  - [x] Review cards (details preview, staff sheet, reviews list) show "‹branch› branch" / "فرع ‹branch›" when the review carries a branch
  - [x] Book now passes the selected branch (`OpenBooking(salonId, branchId)` → `Screen.BookingStart(salonId, branchId)`, used by CUS-086); analytics `salon_branch_select` (catalog: by view model)
- Tests: `SalonDetailsViewModelTest` (+3: main default + branch-driven place/contacts/staff/services/booking, requested + kept on refresh, fallback + single branch), `BranchRulesTest` (+1 `forBranch`), `SalonBranchTextsTest` (2); full `testAndroidHostTest --continue` green
- Loops: 1/1 — batch run (CUS-082…086) on the final tree: `./gradlew testAndroidHostTest` exit 0, 397 host tests, 0 failures (Gradle reused up-to-date results of unchanged modules), plus `run_detekt.sh` exit 0 and `policy_checks.py all` ok; found and fixed during the batch: `HomeMappersTest` missing `branchCount`, `VerifyRepoFake` old `create` signature, one 168-char KDoc line (detekt MaxLineLength)
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch code reading: branch rules are pure domain functions (`BranchRules`, `forBranch`, `withLoadedSalon`/`withBranch`) shared by details and booking; contract additive and nullable for older servers; route args through `SalonDetailsArgs`/`BookingFlowArgs` (no nullable Koin parameters); AR+EN strings incl. Arabic plurals; no hardcoded values (policy ok). DEVIATION: UI not opened on the emulator/simulator yet (rules §3.13 defers it to the end of the backlog)
- Notes: no feature-level `@Preview`s exist in this app (unchanged practice); the selector reuses `AppFilterChip` (portrait/landscape via `LazyRow`, RTL/LTR and light/dark from tokens). UI check deferred to the end-of-batch pass (rules §3.13).

### CUS-084 — Nearest section and map: one entry per branch titled "Salon - Branch" (e.g. Hifa Salon - Mecca Street); single-branch salons show the salon name
- Branch: `feat/cus-084-nearest-branches` (from `feat/cus-083-search-branches`)
- Status: IN REVIEW
- Acceptance criteria (BUSINESS_DOMAIN §5.17; `GET /customer/v1/home` `nearest[]`):
  - [x] Home nearest maps one entry per bookable branch with the server `title` ("Salon - Branch", or the salon name when single-branch; blank → salon name) and its `branch`; recommended cards map `branchCount`/`branch`
  - [x] Nearest cards show the title, the branch's area and distance, never a branch count; list keys are unique per branch (`entryKey` = salon/branch) so a salon with two near branches does not crash the LazyRow
  - [x] Tapping a nearest entry opens the salon with that branch preselected (`OnSalonClick(salonId, branchId)` → `OpenSalon` → `Screen.SalonDetails(salonId, branchId)`); salon cards open without a branch
  - [x] "Map": the app has no in-app map; the maps hand-off of the selected branch is CUS-085
- Tests: `SalonSummaryTest` (3), `HomeMappersTest` (+1, recommended count), `HomeViewModelTest` (+1); full `testAndroidHostTest --continue` green
- Loops: 1/1 — batch run (CUS-082…086) on the final tree: `./gradlew testAndroidHostTest` exit 0, 397 host tests, 0 failures (Gradle reused up-to-date results of unchanged modules), plus `run_detekt.sh` exit 0 and `policy_checks.py all` ok; found and fixed during the batch: `HomeMappersTest` missing `branchCount`, `VerifyRepoFake` old `create` signature, one 168-char KDoc line (detekt MaxLineLength)
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch code reading: branch rules are pure domain functions (`BranchRules`, `forBranch`, `withLoadedSalon`/`withBranch`) shared by details and booking; contract additive and nullable for older servers; route args through `SalonDetailsArgs`/`BookingFlowArgs` (no nullable Koin parameters); AR+EN strings incl. Arabic plurals; no hardcoded values (policy ok). DEVIATION: UI not opened on the emulator/simulator yet (rules §3.13 defers it to the end of the backlog)
- Notes: favorite toggles stay per salon (every entry of that salon follows).

### CUS-083 — Search and filtered lists: one card per salon (never per branch) with the nearest branch's distance/area and "N branches"
- Branch: `feat/cus-083-search-branches` (from `feat/cus-082-branches-contract`)
- Status: IN REVIEW
- Acceptance criteria (BUSINESS_DOMAIN §5.17; `GET /customer/v1/salons`, `GET /customer/v1/favorites`):
  - [x] Search / filtered list cards keep one card per salon; place, hours and distance are the server's nearest bookable branch (`branch {id,name}` kept on `SalonSummary`); `branchCount` mapped (≥ 1)
  - [x] Card place line = "area · N branches" only when the salon has several bookable branches (AR plural فرعان / N فروع / N فرعاً, EN N branches) on the All salons row, the Home recommended card and the Favorites card
  - [x] Favorites cards map `branchCount` / `branch` the same way
- Tests: `SalonCardMapperTest` (2), `BranchTextsTest` (3); policy `all: ok`; compile with `testAndroidHostTest --continue` green except the `feature:home:data` test (fixed in CUS-084)
- Loops: 1/1 — batch run (CUS-082…086) on the final tree: `./gradlew testAndroidHostTest` exit 0, 397 host tests, 0 failures (Gradle reused up-to-date results of unchanged modules), plus `run_detekt.sh` exit 0 and `policy_checks.py all` ok; found and fixed during the batch: `HomeMappersTest` missing `branchCount`, `VerifyRepoFake` old `create` signature, one 168-char KDoc line (detekt MaxLineLength)
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch code reading: branch rules are pure domain functions (`BranchRules`, `forBranch`, `withLoadedSalon`/`withBranch`) shared by details and booking; contract additive and nullable for older servers; route args through `SalonDetailsArgs`/`BookingFlowArgs` (no nullable Koin parameters); AR+EN strings incl. Arabic plurals; no hardcoded values (policy ok). DEVIATION: UI not opened on the emulator/simulator yet (rules §3.13 defers it to the end of the backlog)
- Notes: plurals carry an unused EN `many` item so the localization policy's placeholder count matches the AR plural (one/two carry no number in Arabic). Cards open the salon without a preselected branch (only the nearest entries carry a branch, CUS-084).

### CUS-082 — `./gradlew apiSync` with branches: `Branch` model, branch on salon details, drafts and bookings, branch error codes (AR/EN)
- Branch: `feat/cus-082-branches-contract` (from `origin/customer`)
- Status: IN REVIEW
- Acceptance criteria (BUSINESS_DOMAIN §3.3a, §5.11, §5.17, §5.18, §11; `WAB-Server/.claude/Integration.md` "Salon branches contract"):
  - [x] Contract re-synced (`scripts/api_sync.py`, snapshot 8a88db97691d): `branches[]`, `branchId` on staff/services, `branch` on cards, reviews and bookings, `branchId` in availability / draft / review bodies
  - [x] Domain: `BranchRef(id, name, locationText?)`, `SalonBranch` (place, contacts, hours, closures), `BranchRules` (several branches, initial branch, booking preselection, per-branch filter), `SalonDetails.branches/servicesOf/staffOf`, `branchId` on `StaffPreview`/`SalonService`, `branch` on `Review`, `BookingSummary`, `BookingDetails`; `SalonSummary.branchCount/branch/title` (mapped in CUS-083/084)
  - [x] Mappers: salon details (branches main first, blank text → null), staff/services branch ids, review branch labels (details, staff, review lists), booked branch with address (list + details)
  - [x] Error codes `BRANCH_NOT_FOUND`, `BRANCH_NOT_BOOKABLE`, `BRANCH_REQUIRED`, `BRANCH_LIMIT_REACHED`, `BRANCH_HAS_UPCOMING_BOOKINGS`, `LAST_BRANCH`, `BRANCH_SCOPE_DENIED`: `ErrorCode`, AR + EN text, handling path (not-found → retry, scope denied → contact, others → message)
  - [x] Mock: fixtures carry 3 branches (first is main), `branchCount` 3 (`SAMPLE_NUMBER_HINTS`, `SAMPLE_FIRST_ITEM_FLAGS`)
- Tests: `BranchRulesTest` (4), `SalonDetailsMappersTest` (+2), `BookingsApiTest` (+1), `ErrorCodeTest` (codes list), `ErrorTextTest` (table covers every code), `test_api_sync.py` (+1); policy `all: ok`; early compile: `:core:domain`, `:core:design-system`, `:feature:salon:data`, `:feature:bookings:data` `testAndroidHostTest` green
- Loops: 1/1 — batch run (CUS-082…086) on the final tree: `./gradlew testAndroidHostTest` exit 0, 397 host tests, 0 failures (Gradle reused up-to-date results of unchanged modules), plus `run_detekt.sh` exit 0 and `policy_checks.py all` ok; found and fixed during the batch: `HomeMappersTest` missing `branchCount`, `VerifyRepoFake` old `create` signature, one 168-char KDoc line (detekt MaxLineLength)
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch code reading: branch rules are pure domain functions (`BranchRules`, `forBranch`, `withLoadedSalon`/`withBranch`) shared by details and booking; contract additive and nullable for older servers; route args through `SalonDetailsArgs`/`BookingFlowArgs` (no nullable Koin parameters); AR+EN strings incl. Arabic plurals; no hardcoded values (policy ok). DEVIATION: UI not opened on the emulator/simulator yet (rules §3.13 defers it to the end of the backlog)
- Notes: availability/draft `branchId` is wired in CUS-086 (needs the branch step); review submit `branchId` in CUS-087.

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
- Status: DONE (PR #349)
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
