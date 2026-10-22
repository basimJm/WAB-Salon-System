# WAB-Mobile-Salon — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next merchant`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Scaffolded (MER-001) with `KMP_TEMPLATE` from the customer app: all modules, design system + Liquid Glass, sample feature; rules copied in MER-003 (until then `WAB-Mobile-Customer/CLAUDE.md` applies).
- Will consume `/merchant/v1` (71 ops); 6 server gaps (SRV-129…134) block MER-042/043/049/050; MER-004 Firebase registrations = owner.
- Real-time booking requests: socket + FCM data message, Android overlay / iOS time-sensitive actions (MER-012, MER-028…030).

## Current task

### MER-027 — Booking details & actions M09
- Branch: `feat/mer-027-booking-details`
- Branched: (from `feat/mer-026-bookings-list`; code committed together with MER-026)
- Status: IN PROGRESS (batch 5)
- Acceptance criteria (PRD M09, §10; operations `GET /bookings/{id}`, approve/reject/cancel/complete/no-show/reassign; design 03 `on.details`):
  - [x] Header (reference + copy, status / payment / refund / bride badges, date-time, pending auto-cancel countdown, refund note, reject/cancel reason), customer with Call / WhatsApp, persons (staff, time, services), payment rows (total, paid online, remaining, refunded), snapshotted policy, status history
  - [x] Sticky action bar = the server's `actions` for this member (hidden, not disabled); accept at once; reject / cancel need a reason (OTHER needs text ≤ 300) with the full-refund note on cancel; complete ("collected X") and no-show confirmations; reassign sheet (person + active provider)
  - [x] `ALREADY_HANDLED` → "already handled" dialog + refresh; schedule / transition conflicts close the sheet + refresh; other errors keep the sheet; never a blind retry; success banners; realtime booking events refresh
  - [x] `ExternalActions.copyText` (Android clipboard, iOS pasteboard) for the reference
- Tests: `BookingDetailsViewModelTest` (7); `/tmp/claude/quick.sh m26c` bookings + design-system + ui + composeApp tests + `assembleDevDebug` green; policy ok
- Loops: 0/1
- Review: PENDING
- Notes: reassign lists every active provider (no eligible-staff endpoint in the contract); the server validates and a `STAFF_NOT_ELIGIBLE` refreshes.

### MER-026 — Bookings list M08
- Branch: `feat/mer-026-bookings-list`
- Branched: (from `feat/mer-025-setup-checklist`)
- Status: IN PROGRESS (batch 5)
- Acceptance criteria (PRD M08; operation `GET /bookings`; design 03 `on.list`):
  - [x] `feature/bookings` (domain models, repository, API + mappers, Koin); tabs Pending / Upcoming / Today / Past; search debounced 500 ms; filter sheet (dates, staff, status, bride, payment) with active chips; paging (10) with de-duplication
  - [x] Cards with status / payment badges and live pending countdown (1 s clock); shimmer / empty per tab / no-results / error + retry; pull-to-refresh; realtime `booking.requested|updated|assigned` reload the first page; scope by the server (`BOOKINGS_VIEW_OWN`)
  - [x] Bookings tab registered in the shell; `jodText` / `dateTimeText` formats (12-hour, Asia/Amman) in the design system
- Tests: `BookingRulesTest`, `BookingMappersTest`, `BookingsViewModelTest` (4), `FormatsTest`; green with MER-027 run
- Loops: 0/1
- Review: PENDING
- Notes: list rows carry no `createdAt`, so no request age is shown.

### MER-025 — Setup checklist M06
- Branch: `feat/mer-025-setup-checklist`
- Branched: (from `feat/mer-024-launch-router`)
- Status: IN PROGRESS (batch 5)
- Acceptance criteria (PRD M06, §4.2 completeness; `GET /salon` completeness; design 01 `on.check`):
  - [x] Steps from the server's missing items (profile & images, location & contact, hours, services, staff, policies) + optional gallery / team; ✓ when complete; progress "n of 6" + bar + steps left (AR plurals)
  - [x] Pending-approval note; each step opens its screen (profile, hours, services, team, policies, gallery); pull-to-refresh; live → "Your salon is live!" → home
  - [x] `Graph.Setup` start for the APPROVED_INCOMPLETE route
- Tests: `SetupChecklistTest` (2), `SetupChecklistViewModelTest` (3); application tests + `assembleDevDebug` green; policy ok
- Loops: 0/1
- Review: PENDING
- Notes: optional steps have no completeness signal from the server, so they never show ✓.

### MER-024 — Launch router + offline banner
- Branch: `feat/mer-024-launch-router`
- Branched: (batch 5 start, from `feat/mer-023-application-status`)
- Status: IN PROGRESS (batch 5)
- Acceptance criteria (PRD §4.2–4.3, §3 offline banner, §8.1; operation `GET /salon`):
  - [x] Core salon source: `SalonProfile` (state, completeness `missing` items from the server: COVER, PROFILE_IMAGE, NAME, DESCRIPTION, LOCATION, PHONE, WORKING_HOURS, SERVICE, STAFF, POLICY; location, contacts, rating) + `SalonRepository` (`current` + `refresh`, stores the salon state in the session); refreshed at launch and after every sign-in
  - [x] `launchRouteOf(session)`: guest → login; pending / rejected → application status; approved incomplete → setup checklist; live / offline (or unknown yet) → home; deactivated members are signed out by the permission refresh / `access.revoked` (MER-009/011) and see the login message
  - [x] Shell `MerchantShell`: NavHost restarts at the route's graph when the route changes; permission-gated bottom bar / rail (`visibleMerchantTabs` ∩ tabs shipped), shown on tab destinations only; the first visible tab is the home start
  - [x] Offline banner on every screen while the salon is OFFLINE ("Your salon is currently offline…", Contact → WAB WhatsApp from the config contact)
- Tests: `LaunchRouteTest` (2), `SalonMapperTest` (2), `MerchantRootTabsTest` (2), `MainViewModelTest` (+1 salon refresh on sign-in); domain / data / composeApp tests, `assembleDevDebug`, iOS framework link green; policy ok
- Loops: 0/1
- Review: PENDING
- Notes: tabs register themselves in `REGISTERED_TABS` as their features land (bookings, calendar, salon, more, home).

### MER-023 — Application status M05
- Branch: `feat/mer-023-application-status`
- Branched: (from `feat/mer-022-registration`; same `feature/application` module)
- Status: IN REVIEW (batch 4 PR)
- Acceptance criteria (PRD M05; operation `GET /salon/application`; design 01 `on.status`):
  - [x] Pending: "Your application is under review", submitted date, "Prepare your salon profile" → setup checklist (M06), refresh + pull-to-refresh
  - [x] Rejected: reason card + "Edit & resubmit" → M04 in resubmission mode (`POST /salon/application/resubmit`, back to pending)
  - [x] Approved (APPROVED_INCOMPLETE / LIVE / OFFLINE): "Your salon is approved!" + Continue → checklist or home; the cached salon state follows every load
  - [x] First-load error with retry; refresh errors as a banner; `Graph.Onboarding` navigation (status, registration, resubmission)
- Tests: `ApplicationStatusViewModelTest` (4), `ApplicationUseCasesTest` (3), `ApplicationMappersTest` (2)
- Loops: 1/1 — batch-4 run: policy `all: ok`, 81 policy-script tests OK, `testAndroidHostTest` (all modules, fresh results: 80 suites, 303 tests, 0 failures) + `:androidApp:assembleDevDebug` green
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch-4 code read: analytics fields, auth feature ported from the customer app and narrowed to the merchant contract (no register / change-phone / push switch), `feature/application` (registration, status, resubmit) on the shared upload pipeline; Clean Architecture + MVI by delegate, AR + EN from design 01, tokens only, files < 300 lines. Deviations: real SMS / analytics need the owner's Firebase files (MER-004); no email in the application contract; resubmission not prefilled (contract); detekt, full gate and device checks once after the backlog.
- Notes: DEVIATION: "opens M04 prefilled" — `GET /salon/application` returns no name / type / documents, so the resubmission form starts empty (name, type and documents only, as the resubmit operation accepts). The push on approval / rejection is MER-012/047.

### MER-022 — Salon registration M04
- Branch: `feat/mer-022-registration`
- Branched: (from `feat/mer-021-otp`)
- Status: IN REVIEW (batch 4 PR)
- Acceptance criteria (PRD M04, §12; operations `POST /uploads/license/presign|confirm`, `POST /salon/applications`, `GET /locations/cities|areas`; design 01 `on.register`):
  - [x] `feature/application` (domain / data / presentation / di): salon name, type Men / Women (choice cards + "cannot be changed later"), owner first / last name, city → area (area disabled until a city; cities of the phone's country), 1–5 license documents (`AppDocumentUploader`, `FilePicker` + `UploadFileUseCase` with the public license purpose, progress, remove, retry, refusal messages), terms checkbox + terms page link
  - [x] Pure validation (`registrationErrors`: required fields, lengths 80 / 50, 1–5 confirmed documents, nothing still uploading, terms); errors shown after the first submit; Submit with spinner
  - [x] Submit with the REGISTER proof → salon `APPLICATION_PENDING` + owner signed in (all permissions, salon state cached) → M05; missing proof → back to login
- Tests: `RegistrationRulesTest` (5), `RegistrationViewModelTest` (5: missing proof, cities/areas, valid submit signs in, upload failure + retry + refusal + remove, resubmission); application domain / data / presentation tests + `assembleDevDebug` green; policy ok
- Loops: 1/1 — batch-4 run: policy `all: ok`, 81 policy-script tests OK, `testAndroidHostTest` (all modules, fresh results: 80 suites, 303 tests, 0 failures) + `:androidApp:assembleDevDebug` green
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch-4 code read: analytics fields, auth feature ported from the customer app and narrowed to the merchant contract (no register / change-phone / push switch), `feature/application` (registration, status, resubmit) on the shared upload pipeline; Clean Architecture + MVI by delegate, AR + EN from design 01, tokens only, files < 300 lines. Deviations: real SMS / analytics need the owner's Firebase files (MER-004); no email in the application contract; resubmission not prefilled (contract); detekt, full gate and device checks once after the backlog.
- Notes: DEVIATION: PRD lists an optional email, but `POST /salon/applications` has no email field — not collected (server gap; add when the contract has it).

### MER-021 — OTP M03
- Branch: `feat/mer-021-otp`
- Branched: (from `feat/mer-020-login`; the OTP screen came with the auth port of MER-020)
- Status: IN REVIEW (batch 4 PR)
- Acceptance criteria (PRD M03 "same rules as the customer app"; operations `POST /auth/otp/request`, `/auth/otp/wrong-attempt`, `/auth/login`):
  - [x] Modes LOGIN / REGISTER / CHANGE_PHONE / BANK_DETAILS (`AuthPurpose`); OTP pre-check (`allowed`, `otpLength` boxes from the backend, `resendAfterSeconds`, `blockedUntil`), Firebase phone verification through the `PhoneAuthGateway` facade (fake in mock mode), wrong-attempt reporting with remaining attempts and the 15-minute block, resend countdown, expiry popup
  - [x] LOGIN → `POST /auth/login` with the ID token + installation (app-instance id, platform, versions, FCM token) → session stores tokens, member, role and permission keys → home; REGISTER → proof published → salon registration (M04); BANK_DETAILS / CHANGE_PHONE → proof published → back to the caller
- Tests: `OtpViewModelTest` (8: request + countdown, login stores the member, wrong code + block, expiry + server errors, register → registration, bank details → back, block remaining time, Firebase send failure), `AuthMappersTest` (3)
- Loops: 1/1 — batch-4 run: policy `all: ok`, 81 policy-script tests OK, `testAndroidHostTest` (all modules, fresh results: 80 suites, 303 tests, 0 failures) + `:androidApp:assembleDevDebug` green
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch-4 code read: analytics fields, auth feature ported from the customer app and narrowed to the merchant contract (no register / change-phone / push switch), `feature/application` (registration, status, resubmit) on the shared upload pipeline; Clean Architecture + MVI by delegate, AR + EN from design 01, tokens only, files < 300 lines. Deviations: real SMS / analytics need the owner's Firebase files (MER-004); no email in the application contract; resubmission not prefilled (contract); detekt, full gate and device checks once after the backlog.
- Notes: DEVIATION: needs MER-010 (code done) and the owner's Firebase files (MER-004) for a real SMS; mock mode verifies any code.

### MER-020 — Welcome & login M02
- Branch: `feat/mer-020-login`
- Branched: (from `feat/mer-010-analytics`)
- Status: IN REVIEW (batch 4 PR)
- Acceptance criteria (PRD M02, §4.4; operations `GET /locations/countries`, `POST /auth/check-phone`; design 01 `on.login`):
  - [x] `feature/auth` ported from the customer app (domain / data / presentation / di) and adapted to the merchant contract; core `locations` (countries, cities, areas; cache per language) ported and bound
  - [x] Country picker (server list, Jordan default) + phone field with the country regex; Continue → `check-phone`: active member → OTP; `PHONE_NOT_REGISTERED` → "not linked to any salon" dialog → Register a new salon (OTP REGISTER → M04); `MEMBER_INACTIVE` → "Your access was removed"; `ACCOUNT_BLOCKED` → blocked → contact WAB; "New salon? Register your salon" link (valid number → registration OTP)
  - [x] Language + theme toggles, legal links (privacy / terms / contact content pages), invalid / loading states; texts from design 01 in AR + EN
  - [x] Merchant navigation map (`Graph` auth / onboarding / tabs, `Screen` M02–M25); shell starts guests at login (launch router = MER-024); `InstallationInfoProvider` bound by the shell
- Tests: `LoginViewModelTest` (7: default country + regex, registered → OTP, not linked → register, deactivated popup, register link, blocked + errors, toggles, countries retry), `PhoneCheckMapperTest` (2), `SessionUseCasesTest` (2), `InstallationMapperTest`, `LocationsTest`; auth / domain / data / composeApp host tests + `assembleDevDebug` green; policy ok
- Loops: 1/1 — batch-4 run: policy `all: ok`, 81 policy-script tests OK, `testAndroidHostTest` (all modules, fresh results: 80 suites, 303 tests, 0 failures) + `:androidApp:assembleDevDebug` green
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch-4 code read: analytics fields, auth feature ported from the customer app and narrowed to the merchant contract (no register / change-phone / push switch), `feature/application` (registration, status, resubmit) on the shared upload pipeline; Clean Architecture + MVI by delegate, AR + EN from design 01, tokens only, files < 300 lines. Deviations: real SMS / analytics need the owner's Firebase files (MER-004); no email in the application contract; resubmission not prefilled (contract); detekt, full gate and device checks once after the backlog.
- Notes: customer register screen, change-phone and push switch dropped (no merchant operations); the form fields stay for the salon registration (MER-022).

### MER-010 — Analytics tracker + Crashlytics facade
- Branch: `feat/mer-010-analytics`
- Branched: (batch 4 start, from `feat/mer-019-splash-config`)
- Status: IN REVIEW (batch 4 PR)
- Acceptance criteria (PRD §14):
  - [x] Common fields on every event: user type, language, app version, platform, environment (template) + `app = MERCHANT`, and while signed in `member_id`, `salon_id`, `member_role` (`AnalyticsContext`, `AppAnalyticsContextProvider`)
  - [x] Firebase user id = member id on sign-in, cleared on sign-out, on analytics and Crashlytics; `salon_id` / `member_role` user properties set and cleared with it (`SessionAnalyticsSync`)
  - [x] App-instance id for the backend: `AppInstanceIdProvider` port (core/firebase, template) — sent by login (MER-020/021)
- Tests: `AppAnalyticsContextProviderTest` (+1), `SessionAnalyticsSyncTest` (extended); core/analytics + composeApp host tests green; policy ok
- Loops: 1/1 — batch-4 run: policy `all: ok`, 81 policy-script tests OK, `testAndroidHostTest` (all modules, fresh results: 80 suites, 303 tests, 0 failures) + `:androidApp:assembleDevDebug` green
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch-4 code read: analytics fields, auth feature ported from the customer app and narrowed to the merchant contract (no register / change-phone / push switch), `feature/application` (registration, status, resubmit) on the shared upload pipeline; Clean Architecture + MVI by delegate, AR + EN from design 01, tokens only, files < 300 lines. Deviations: real SMS / analytics need the owner's Firebase files (MER-004); no email in the application contract; resubmission not prefilled (contract); detekt, full gate and device checks once after the backlog.
- Notes: DEVIATION: depends on MER-004 (owner Firebase files, PENDING); the code path is complete and runs on the no-op bridges with the placeholder configs; real events and crash reports are verified once the owner adds the files.

### MER-019 — Splash + config + system screens
- Branch: `feat/mer-019-splash-config`
- Branched: (from `feat/mer-018-calendar-grid`; backlog name `feat/mer-019-config-system`)
- Status: IN REVIEW (batch 3 PR)
- Acceptance criteria (PRD M01, M26 "same as the customer app"; operation `GET /merchant/v1/config?platform&version`; design 01 `on.splash`, `on.sys`):
  - [x] Domain `core/domain/config` (from the customer app): `AppConfig` (update policy, maintenance, OTP length + resend, contact), `UpdateStatus` (unknown → OK), `ClientPlatform`, `LaunchGate` + `launchGateOf` (maintenance over force update over optional update)
  - [x] Data `core/data/config`: `AppConfigApi` (platform + installed version), mapper (blank texts → null, numbers → ints), `AppConfigRepositoryImpl` (`current` StateFlow for OTP / contact); bound in `dataModule`; `ClientPlatform` bound by the shell (`appPlatformModule`)
  - [x] Shell: `MainContract` (loading, gate, error, `OpenStore`), `MainViewModel` loads the config at start, retry, optional-update dismiss, store link; `LaunchGateContent`: splash until the gate is known, maintenance / force update blocking, optional update dialog over the app
  - [x] Splash (app icon 108 + WAB Business wordmark + tagline, loader, version, error + retry) and system screens (icon + wordmark row, circle icon, title, body, button) per design 01; AR + EN strings; previews
- Tests: `LaunchGateTest` (3), `AppConfigMapperTest` (2), `MainViewModelTest` (+4: gate ready, maintenance / force update, optional update → store / dismiss, error → retry); domain / data / composeApp host tests, `assembleDevDebug`, `linkDebugFrameworkIosSimulatorArm64` green; policy ok
- Loops: 1/1 — batch-3 run: policy `all: ok` (empty baseline), 81 policy-script tests OK, `testAndroidHostTest` (all modules, fresh results: 68 suites, 258 tests, 0 failures) + `:androidApp:assembleDevDebug` green; per task the iOS compile / framework link of the touched modules
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch-3 code read (98 files): request sheet, uploaders, map picker, calendar and config gate behind ports (`RequestAlert`, `FilePicker`, `ImageCropper`, `MapProvider`, `ReverseGeocoder`, `UploadsRepository`, `AppConfigRepository`) with Android + iOS implementations and fakes; pure logic tested; tokens only, AR + EN, files < 300 lines, one `@Suppress` with its reason. Deviations: detekt, the full gate and device checks run once after the backlog (rules §3.13); the components are not yet on screens, so nothing was exercised on the emulator / simulator.
- Notes: the post-gate launch router (session, salon state) is MER-024; mock mode answers the config with the generated fixture (status OK, maintenance off).

### MER-018 — Calendar grid component
- Branch: `feat/mer-018-calendar-grid`
- Branched: (from `feat/mer-017-map-picker`)
- Status: IN REVIEW (batch 3 PR)
- Acceptance criteria (PRD M11; Design Script M11; design 04 Calendar):
  - [x] Models + pure helpers: blocks / shades (closed, leave) / columns in local minutes, `TimeWindow.covering` (working hours widened to every block, snapped to whole hours), `spanIn` (15-minute resolution, clamped), `weekOf` (Saturday-first week), `pageDate` (day ±1, week ±7)
  - [x] `AppCalendarDayView`: staff header (avatar, name, leave tag), time column (pre-formatted 12-hour labels), hour grid, hatched closed hours and amber leave, status-coloured blocks (pending dashed on the card colour, completed faded, bride crown + rose outline; tap → details), now line, empty / closed card, horizontal swipe (mirrored in RTL)
  - [x] `AppCalendarWeekView` (compact day columns, tap a day) + `AppCalendarLegend`; `AppCalendarHeader` (title, month → date picker, Today, staff filter with count, Day / Week switch, previous / next, week strip with today outline, selection gradient and booking dots)
  - [x] Tokens (56 dp per hour, columns, hatch, now line), AR + EN strings, previews (day light/dark RTL, week LTR)
- Tests: `CalendarTest` (5); design-system host tests, `assembleDevDebug`, design-system iOS compile green; policy ok
- Loops: 1/1 — batch-3 run: policy `all: ok` (empty baseline), 81 policy-script tests OK, `testAndroidHostTest` (all modules, fresh results: 68 suites, 258 tests, 0 failures) + `:androidApp:assembleDevDebug` green; per task the iOS compile / framework link of the touched modules
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch-3 code read (98 files): request sheet, uploaders, map picker, calendar and config gate behind ports (`RequestAlert`, `FilePicker`, `ImageCropper`, `MapProvider`, `ReverseGeocoder`, `UploadsRepository`, `AppConfigRepository`) with Android + iOS implementations and fakes; pure logic tested; tokens only, AR + EN, files < 300 lines, one `@Suppress` with its reason. Deviations: detekt, the full gate and device checks run once after the backlog (rules §3.13); the components are not yet on screens, so nothing was exercised on the emulator / simulator.
- Notes: DEVIATION (PRD over design): the design colours blocks per staff member; PRD M11 says "colored by status", so blocks use the status hues and the legend shows statuses. Data, staff filter, employee single column and permissions are the calendar screen (MER-031). Only the visible window is drawn (no virtualisation needed: ≤ 24 h × staff columns).

### MER-017 — Map picker
- Branch: `feat/mer-017-map-picker`
- Branched: (from `feat/mer-016-uploaders`)
- Status: IN REVIEW (batch 3 PR)
- Acceptance criteria (PRD M13; design 05 Salon `on.map`; maps key env/CI only):
  - [x] `MapProvider` port (core/ui): Google Maps (maps-compose) on Android when `MAPS_API_KEY` is set (local.properties or CI env → manifest meta-data), MapKit on iOS (no key), `NoMapProvider` otherwise; camera follows `target`, reports the idle centre and moving state
  - [x] `ReverseGeocoder` port (core/domain) with platform `Geocoder` (Android 13+ listener, older blocking call on IO) and `CLGeocoder`, in the app language; `addressLineOf` (trim, de-duplicate, Arabic/Latin comma), `isSamePointAs` (≈ 1 m), Amman default centre
  - [x] `AppMapPicker(MapPickerUi, mapProvider, onAction)`: map under a fixed centre pin (lifts while moving), search field + suggestions, "Use my location" (spinner while locating), bottom card with pin hint, address / "Finding the address…", error, Confirm (off while resolving or locating); stylized design map (grid, roads, park; drag to move) when no platform map
  - [x] Tokens: map colours (light/dark from the design), pin/grid/road sizes; AR + EN strings; previews
- Tests: `ReverseGeocoderTest` (2), `MapPickerTest` (2); domain + design-system host tests, `assembleDevDebug`, iOS compile of core/ui (MapKit), core/data (CLGeocoder), design-system, core/di green; policy ok
- Loops: 1/1 — batch-3 run: policy `all: ok` (empty baseline), 81 policy-script tests OK, `testAndroidHostTest` (all modules, fresh results: 68 suites, 258 tests, 0 failures) + `:androidApp:assembleDevDebug` green; per task the iOS compile / framework link of the touched modules
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch-3 code read (98 files): request sheet, uploaders, map picker, calendar and config gate behind ports (`RequestAlert`, `FilePicker`, `ImageCropper`, `MapProvider`, `ReverseGeocoder`, `UploadsRepository`, `AppConfigRepository`) with Android + iOS implementations and fakes; pure logic tested; tokens only, AR + EN, files < 300 lines, one `@Suppress` with its reason. Deviations: detekt, the full gate and device checks run once after the backlog (rules §3.13); the components are not yet on screens, so nothing was exercised on the emulator / simulator.
- Notes: "use my location" permission + device position and the Places search wiring belong to the profile screen (MER-033), which owns the view model; the pin is "drag the map" (design hint), not a draggable marker.

### MER-016 — Uploaders
- Branch: `feat/mer-016-uploaders`
- Branched: (from `feat/mer-015-request-sheet`)
- Status: IN REVIEW (batch 3 PR)
- Acceptance criteria (PRD M04, M13, M14, §12; operations `POST /uploads/presign|confirm`, `POST /uploads/license/presign|confirm`; design 01 Onboarding documents, 05 Salon crop + gallery):
  - [x] Domain `core/domain/upload`: purposes, `LocalFile` (kind from MIME), limits (documents 1–5, image/PDF, ≤ 10 MB; images ≤ 10 MB; videos ≤ 50 MB and ≤ 60 s; gallery 50 photos / 10 videos), `validateUpload` / `acceptUploads` (refusals WRONG_TYPE / TOO_LARGE / TOO_LONG / TOO_MANY), `UploadsRepository`, `UploadFileUseCase` (presign → PUT with progress → confirm; failures stop the chain; retry = new run)
  - [x] Data `core/data/upload`: `UploadsApi` (WAB client + bare storage client, Ktor `onUpload` progress), `UploadsRepositoryImpl` (license purpose → public license endpoints; storage non-2xx / IO → errors), `uploadModule` in Koin; mock mode answers the storage PUT
  - [x] Platform pickers `core/ui/media`: `FilePicker` (documents: PDF + images; media: photos + videos, multi-select), `ImageCropper` (normalized region → JPEG ≤ 2048 px); Android (OpenMultipleDocuments, PickMultipleVisualMedia, MediaMetadataRetriever duration, sampled decode + crop) and iOS (UIDocumentPicker, PHPicker, AVURLAsset duration, orientation-safe CGImage crop); fakes for tests
  - [x] Design system `components/upload`: `AppUploadTile` (uploading % + bar / uploaded + size / failed + retry / remove), `AppUploadAddTile`, `AppDocumentUploader` (3 columns, n / max, hint, error), `uploadRejectionText`, `AppImageUploader` (16:9 / 1:1 slot, progress, retry, change), `AppImageCropper` (frame + thirds grid, drag, pinch, zoom slider, Cancel / Use image), `AppMediaGrid` (Normal "First" badge, Reorder numbers + long-press drag + tap-to-move-earlier, Select checks, video duration, progress / failed cells); `AppImage(bytes)` for local previews
  - [x] AR + EN strings; previews (light RTL, dark reorder, LTR select); localization policy now flags duplicate keys (found `media_position` clash)
- Tests: `UploadRulesTest` (5), `UploadFileUseCaseTest` (3), `UploadComponentsTest` (7), `UploadsMapperTest` (2), `test_localization.py` (+1); domain / data / ui / design-system host tests, `assembleDevDebug`, iOS compile of core/ui + core/data + design-system green; policy ok
- Loops: 1/1 — batch-3 run: policy `all: ok` (empty baseline), 81 policy-script tests OK, `testAndroidHostTest` (all modules, fresh results: 68 suites, 258 tests, 0 failures) + `:androidApp:assembleDevDebug` green; per task the iOS compile / framework link of the touched modules
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch-3 code read (98 files): request sheet, uploaders, map picker, calendar and config gate behind ports (`RequestAlert`, `FilePicker`, `ImageCropper`, `MapProvider`, `ReverseGeocoder`, `UploadsRepository`, `AppConfigRepository`) with Android + iOS implementations and fakes; pure logic tested; tokens only, AR + EN, files < 300 lines, one `@Suppress` with its reason. Deviations: detekt, the full gate and device checks run once after the backlog (rules §3.13); the components are not yet on screens, so nothing was exercised on the emulator / simulator.
- Notes: whole files are read into memory before upload (videos up to 50 MB); a streaming upload would need a file-source port (later if memory shows up). Screens (registration, profile, gallery, services) wire these in MER-022/033/034/036.

### MER-015 — Request sheet component
- Branch: `feat/mer-015-request-sheet`
- Branched: (batch 3 start, from `feat/mer-014-components`)
- Status: IN REVIEW (batch 3 PR)
- Acceptance criteria (PRD M10 in-app; Design Script M10; design 02 Home `sheetOn`):
  - [x] `AppBookingRequestSheetContent(RequestSheetUi, onAction)`: "New booking request" + age · reference, "1 of 3" queue chip (only with more than one), bride banner ("Bridal booking — high priority"), customer + persons + time/date, one card per person (services, staff · time, bride badge), total + payment badge, Reject (outlined rose) / Accept (green, check icon, spinner while accepting), View details
  - [x] "Handled by {member}" state: content dimmed, actions off, dark toast with the outcome line (approved / rejected / closing); `RequestSheetDefaults.HANDLED_DISMISS_MS` for the host
  - [x] Accepted state: check, "Booking accepted", reference, body, Next request (when queued) / View booking / Done
  - [x] Sound + vibration hook: `RequestAlert` port (`play(sound, vibrate)` / `stop()`), `RequestAlertSound` NOTIFICATION / ALARM / SILENT (configurable, stored by code), Android ringtone + `VibrationEffect` waveform (`VIBRATE` permission), iOS `AudioServicesPlaySystemSound` + vibrate, `SilentRequestAlert`; bound in Koin (`requestAlertModule` in `coreModule`)
  - [x] `ButtonKind.Success` (green accept) and an outlined Destructive button (design reject)
  - [x] AR + EN strings; previews (queued bride light RTL, handled dark, accepted LTR)
- Tests: `RequestSheetTest` (4), `RequestAlertTest` (2); `:core:ui` + `:core:design-system` host tests, `assembleDevDebug`, `:core:ui:compileKotlinIosSimulatorArm64` green; policy ok
- Loops: 1/1 — batch-3 run: policy `all: ok` (empty baseline), 81 policy-script tests OK, `testAndroidHostTest` (all modules, fresh results: 68 suites, 258 tests, 0 failures) + `:androidApp:assembleDevDebug` green; per task the iOS compile / framework link of the touched modules
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch-3 code read (98 files): request sheet, uploaders, map picker, calendar and config gate behind ports (`RequestAlert`, `FilePicker`, `ImageCropper`, `MapProvider`, `ReverseGeocoder`, `UploadsRepository`, `AppConfigRepository`) with Android + iOS implementations and fakes; pure logic tested; tokens only, AR + EN, files < 300 lines, one `@Suppress` with its reason. Deviations: detekt, the full gate and device checks run once after the backlog (rules §3.13); the components are not yet on screens, so nothing was exercised on the emulator / simulator.
- Notes: hosting, queue, de-duplication, reason picker and the Android overlay / iOS time-sensitive paths are MER-028/029/030; the design's pulsing "ring" animations are not drawn.

### MER-014 — Merchant components
- Branch: `feat/mer-014-components`
- Branched: (from `feat/mer-013-theme`; backlog name `feat/mer-014-merchant-components`)
- Status: IN REVIEW (batch 2 PR)
- Acceptance criteria (Design Script §1.2; PRD §8.1, M07–M09; BUSINESS_DOMAIN §2 enums, §5 `respondBy`; design 02 Home / 03 Bookings):
  - [x] Shared booking enums in core/domain `booking/` (`BookingStatus` 8, `PaymentStatus` 4, `RefundStatus` incl. NONE, tolerant `fromCode`) + `BookingTimers` (pending age, auto-cancel remaining from `respondBy`; pure, never negative)
  - [x] Badges: status (design hues: pending amber, approved green, completed violet, rejected/no-show rose, cancellations grey), payment (violet), refund (pending/refunded/failed), bride (crown on the rose gradient, new `brideStart/End` tokens)
  - [x] `AppBookingCard(BookingCardUi)`: customer + bride badge, `#reference` (LTR), status, date · time, persons (plural), staff, payment + refund badges, pending age, auto-cancel strip only while pending
  - [x] Pending age ("now", minutes, hours, days) and countdown ("6h 50m", minutes rounded up, "auto-cancelling now" when due) with AR plurals (zero/one/two/few/many/other)
  - [x] Home: `AppSalonStateStrip` (chip + dot + hint per salon state), `AppWarningBanner` (trial notice), `AppPendingRequestsCard` (count circle, view all, rows with bride badge / age / countdown), `AppKpiTile` / `AppStatTile` / `AppNextBookingTile`
  - [x] `AppStatusTimeline(StatusHistoryEntryUi)`: dots + connector, latest highlighted, optional reason note
  - [x] Permission-gated bottom nav: `MerchantTab` (5 tabs, PRD §8.1 rules; Salon = any management permission or owner), `visibleMerchantTabs`, `defaultMerchantTab` (first visible), `resolveMerchantTab` (falls back when a permission is revoked), `merchantNavItems` for `AppNavScaffold`; new design icons (bookings list, store, menu, crown)
  - [x] Glass: cards on `AppCard` / `glassBackground`; preview gallery `MerchantGalleryPreviews` (light/dark, RTL/LTR)
  - [x] Localization policy: plural placeholders compared as a set (Arabic spells out one/two); test added
- Tests: `BookingStatusTest` (4), `MerchantComponentsTest` (6), `MerchantTabsTest` (6), `test_localization.py` (+1); policy `all: ok`
- Loops: 1/1 — batch-2 run: policy `all: ok` (empty baseline), 80 policy-script tests OK, `testAndroidHostTest` (all modules: 102 suites, 393 tests, 0 failures) + `:androidApp:assembleDevDebug` green
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch-2 code read (77 files): session/permissions/realtime plumbing and design-system components only; no `!!`/`println`/`runBlocking`/unexplained suppressions, every file < 300 lines, AR+EN for every new key (plurals with all Arabic quantities), tokens only; permission gating pure and tested. Deviations: detekt, the full gate and device checks run once after the backlog (rules §3.13); components are not yet on a screen (no emulator check).
- Notes: the shell adopts the tabs when the first tab screens land (MER-024/025); pending-card "ring" pulse animation of the design not drawn (static count circle).

### MER-013 — Theme, tokens and base kit
- Branch: `feat/mer-013-theme`
- Branched: (from `feat/mer-011-realtime-client`)
- Status: IN REVIEW (batch 2 PR)
- Acceptance criteria (Design Script §0–§1.1; customer CUS-018/020):
  - [x] Same theme and tokens as the customer app (light + dark, typography, spacing, radii, elevation, Liquid Glass) — from the template, no new colors
  - [x] Merchant identity: `AppWordmark` = "WAB" + gradient "Business / أعمال" pill (LTR in both languages) in `AppBrandHeader`; app names "WAB Business" / "WAB أعمال" (dev "… Dev" / "… تجريبي"), iOS display names "WAB Business (Dev)"
  - [x] Universal states (`AppStateContent`, shimmer), pagination (`AppPagedList`, `AppAdaptiveGrid`), pull-to-refresh, form kit (`AppPhoneField` + `AppCountryPicker`, `AppOtpInput`, `AppDropdownField`, `FormValidators`) present from the template
- Tests: design-system tests (`UniversalStatesTest`, `FormKitTest`, `ComponentLogicTest`, …); policy (localization AR/EN) ok
- Loops: 1/1 — batch-2 run: policy `all: ok` (empty baseline), 80 policy-script tests OK, `testAndroidHostTest` (all modules: 102 suites, 393 tests, 0 failures) + `:androidApp:assembleDevDebug` green
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch-2 code read (77 files): session/permissions/realtime plumbing and design-system components only; no `!!`/`println`/`runBlocking`/unexplained suppressions, every file < 300 lines, AR+EN for every new key (plurals with all Arabic quantities), tokens only; permission gating pure and tested. Deviations: detekt, the full gate and device checks run once after the backlog (rules §3.13); components are not yet on a screen (no emulator check).
- Notes: display name changed from "WAB Merchant" (MER-001) to the design's "WAB Business".

### MER-011 — Realtime client
- Branch: `feat/mer-011-realtime-client`
- Branched: (from `feat/mer-009-permissions`)
- Status: IN REVIEW (batch 2 PR)
- Acceptance criteria (PRD §3 real-time; BUSINESS_DOMAIN §7):
  - [x] Socket.IO client on namespace `/merchant` (template) + `FakeRealtimeClient`; connect while resumed and signed in, reconnect on foreground (`RealtimeConnectionEffect`)
  - [x] Event constants: `booking.requested`, `booking.updated`, `booking.assigned`, `permissions.updated`, `access.revoked`, `notifications.unread`; `bookingId` payload key restored
  - [x] Permission filter mirroring the rooms (`isVisibleTo` / `visibleTo`): requests need BOOKINGS_RESPOND, booking updates need a view permission, account events always pass
  - [x] Shell `RealtimeAccountEvents`: `permissions.updated` → `PermissionsSync.refresh()`, `access.revoked` → sign-out + "Your access was removed by the salon owner" banner (AR/EN)
- Tests: `RealtimeEventFilterTest` (3), `RealtimeAccountEventsTest`, realtime protocol/client/refresh tests, `MainViewModelTest`; realtime + composeApp tests + `assembleDevDebug` green
- Loops: 1/1 — batch-2 run: policy `all: ok` (empty baseline), 80 policy-script tests OK, `testAndroidHostTest` (all modules: 102 suites, 393 tests, 0 failures) + `:androidApp:assembleDevDebug` green
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch-2 code read (77 files): session/permissions/realtime plumbing and design-system components only; no `!!`/`println`/`runBlocking`/unexplained suppressions, every file < 300 lines, AR+EN for every new key (plurals with all Arabic quantities), tokens only; permission gating pure and tested. Deviations: detekt, the full gate and device checks run once after the backlog (rules §3.13); components are not yet on a screen (no emulator check).

### MER-009 — Permissions model
- Branch: `feat/mer-009-permissions`
- Branched: (from `feat/mer-008-session-store`)
- Status: IN REVIEW (batch 2 PR)
- Acceptance criteria (PRD §3, §6; BUSINESS_DOMAIN §6):
  - [x] `Permission` (15 grantable keys), `OwnerCapability` (TEAM_MANAGE, PAYOUT_DETAILS_MANAGE, SALON_DELETE_REQUEST), `PermissionSet` with `has` / `anyOf` / `allOf` / `can` (owner has all), `SessionState.permissionSet()`, `PermissionTemplates` (PRD §6.3)
  - [x] `PermissionGated` (hidden-not-disabled) + `LocalPermissions` provided by the shell from the session
  - [x] Re-fetch: `PermissionsSync` rotates through the shared single-flight refresher (`SessionRefresher` = the `TokenRefreshCoordinator` now in Koin; the merchant refresh returns the member), stores member + keys; refused session → sign-out; called on app start (Home refresh, push and socket triggers call the same `refresh()`)
- Tests: `PermissionsTest` (4), `PermissionsSyncTest` (3), `RefreshMemberTest` (2), coordinator `refreshNow` test, `MainViewModelTest` start re-fetch; domain/network/data/design-system/composeApp tests + `assembleDevDebug` green
- Loops: 1/1 — batch-2 run: policy `all: ok` (empty baseline), 80 policy-script tests OK, `testAndroidHostTest` (all modules: 102 suites, 393 tests, 0 failures) + `:androidApp:assembleDevDebug` green
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch-2 code read (77 files): session/permissions/realtime plumbing and design-system components only; no `!!`/`println`/`runBlocking`/unexplained suppressions, every file < 300 lines, AR+EN for every new key (plurals with all Arabic quantities), tokens only; permission gating pure and tested. Deviations: detekt, the full gate and device checks run once after the backlog (rules §3.13); components are not yet on a screen (no emulator check).
- Notes: duplicate `createHttpClient` expect/actuals removed (identical); `BaseHttpClient` registered in Koin.

### MER-008 — Secure local storage of PRD §5 keys via one SessionStore
- Branch: `feat/mer-008-session-store`
- Branched: (batch 2 start, from `feat/mer-007-mock-source`)
- Status: IN REVIEW (batch 2 PR)
- Acceptance criteria (PRD §5):
  - [x] `SessionStore` holds tokens (secure store only), `member_id`, `salon_id`, member first name, `member_role`, `permissions` cache, `salon_state`, `push_enabled`, `overlay_permission_prompted`; language/theme stay in `AppSettings`
  - [x] `SessionState.SignedIn(member: MemberProfile, permissions, salonState)`; `MemberRole` / `SalonState` enums with tolerant `fromCode`
  - [x] Sign-out drops tokens + identity, keeps push / overlay flags; `clearAll` empties everything; incomplete identity = guest
- Tests: `DataStoreSessionStoreTest` (6), `AppSettingsImplTokensTest`, shell analytics tests; storage/composeApp/realtime host tests green
- Loops: 1/1 — batch-2 run: policy `all: ok` (empty baseline), 80 policy-script tests OK, `testAndroidHostTest` (all modules: 102 suites, 393 tests, 0 failures) + `:androidApp:assembleDevDebug` green
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch-2 code read (77 files): session/permissions/realtime plumbing and design-system components only; no `!!`/`println`/`runBlocking`/unexplained suppressions, every file < 300 lines, AR+EN for every new key (plurals with all Arabic quantities), tokens only; permission gating pure and tested. Deviations: detekt, the full gate and device checks run once after the backlog (rules §3.13); components are not yet on a screen (no emulator check).

### MER-007 — Mock data source
- Branch: `feat/mer-007-mock-source`
- Branched: (from `feat/mer-006-api-sync`)
- Status: DONE (batch 1 PR)
- Acceptance criteria (backlog MER-007; INTEGRATION.md §4):
  - [x] `DATA_SOURCE=mock|remote` (template); mock engine serves feature fixtures first, then one generated fixture per contract operation (`contractFixtures()`, 71 operations)
  - [x] Scenario switcher API: `MockScenarios` (transport scenario, salon state override, signed-in member override, `reset()`); UI entry lands with More (MER-048)
  - [x] Every salon state (`MockSalonState`: APPLICATION_PENDING / REJECTED, APPROVED_INCOMPLETE, LIVE, OFFLINE) and permission set (`MockPresets`: owner = all 15 keys, manager, employee, none) patched into any response (`patchFixture`: salon `state`, member `role` / `permissions`)
- Tests: `MockWorldTest` (5), `MockTransportTest`; `:core:data:testAndroidHostTest` green
- Loops: 1/1 — batch-1 run: policy `all: ok` (empty baseline), 78 policy-script tests, `testAndroidHostTest` (all modules) + `assembleDevDebug` green; per-task checks above (detekt clean in MER-003)
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch-1 code read: config/tooling and core plumbing only, no screens; contract + error catalog from the server spec; mock world covers every salon state and permission set.

### MER-006 — Contract tooling
- Branch: `feat/mer-006-api-sync`
- Branched: (from `feat/mer-005-network-kernel`)
- Status: DONE (batch 1 PR)
- Acceptance criteria (backlog MER-006; same generator as CUS-009):
  - [x] `python3 scripts/api_sync.py` / `./gradlew apiSync` generates DTOs + `MerchantOperations` (71 operations) + fixtures + snapshot from `../WAB-Server/docs/api/openapi.merchant.json` into `core/data/.../contract/generated`
  - [x] Stale check: `api_sync.py --check` (`./gradlew apiSyncCheck`) in the gate (always on now; the spec is in the monorepo)
  - [x] Operation registry helper `Operation.pathWith` (from the customer app) for repositories
- Tests: `OperationPathTest`, `test_api_sync.py`; core data/network/domain/design-system/notification host tests green; policy ok (error-codes now also checks the snapshot)
- Loops: 1/1 — batch-1 run: policy `all: ok` (empty baseline), 78 policy-script tests, `testAndroidHostTest` (all modules) + `assembleDevDebug` green; per-task checks above (detekt clean in MER-003)
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch-1 code read: config/tooling and core plumbing only, no screens; contract + error catalog from the server spec; mock world covers every salon state and permission set.

### MER-005 — Network kernel reused
- Branch: `feat/mer-005-network-kernel`
- Branched: (from `feat/mer-003-rules-gates`)
- Status: DONE (batch 1 PR)
- Acceptance criteria (backlog MER-005; same as CUS-006/007, merchant token scope):
  - [x] Ktor per environment (`ApiConfig` from `AppEnvironment`), `Accept-Language` on every request, base envelope + `safeApiCall` (from the template)
  - [x] Refresh interceptor on `POST /merchant/v1/auth/refresh` (request `refreshToken`, rotating pair in `data`; matches `openapi.merchant.json`)
  - [x] Error-code catalog = the 43 codes of BUSINESS_DOMAIN §11 / `openapi.merchant.json` + `UNKNOWN`, AR + EN `error_code_*`, handling actions; the error policy reads the root BUSINESS_DOMAIN (local generic copy removed)
- Tests: `AuthEndpointsTest`, `ErrorCodeTest`, `ErrorTextTest`, existing `SafeApiCallTest` / `AuthRefreshInterceptorTest` / `TokenRefreshCoordinatorTest`; policy `all: ok`
- Loops: 1/1 — batch-1 run: policy `all: ok` (empty baseline), 78 policy-script tests, `testAndroidHostTest` (all modules) + `assembleDevDebug` green; per-task checks above (detekt clean in MER-003)
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch-1 code read: config/tooling and core plumbing only, no screens; contract + error catalog from the server spec; mock world covers every salon state and permission set.

### MER-003 — Project rules and quality gates
- Branch: `feat/mer-003-rules-gates`
- Branched: (from `feat/mer-002-variants-ci`)
- Status: DONE (batch 1 PR)
- Acceptance criteria (backlog MER-003; root rules §3):
  - [x] `WAB-Mobile-Salon/CLAUDE.md`: the customer rules adapted to the merchant app (real module map, `/merchant/v1`, `merchant` master, merchant PRD/design paths, Liquid Glass usage) + merchant specifics (permission gating, conflict-safe booking actions, overlay permission, request sound)
  - [x] Policy baseline `{}` and detekt baseline without issues: the 53 policy findings and 49 detekt findings inherited from the template fixed in code (named constants, tokens, typed catches, `error()`, lifecycle-aware collection, Compose parameter order / effect lambdas, `NotificationTheme` supplied by the shell because `core/notification` sits below the design system); dead template code removed (`Utils`, `NumberFormatter`, `FeatureFlags` + old analytics stubs, `Encryptor`/`Algorithm`, `AppPagingDataSource`); `App()` without the unused platform parameter
  - [x] 300-line rule enforced by `policy_checks.py file-length` (unchanged)
  - [x] Tests: `test_baselines_empty.py` (baselines stay empty), `NotificationThemeTest`
- Tests: policy `all: ok` with empty baseline; detekt exit 0 with empty baseline; `testAndroidHostTest` + `assembleDevDebug` + iOS framework link green
- Loops: 1/1 — batch-1 run: policy `all: ok` (empty baseline), 78 policy-script tests, `testAndroidHostTest` (all modules) + `assembleDevDebug` green; per-task checks above (detekt clean in MER-003)
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch-1 code read: config/tooling and core plumbing only, no screens; contract + error catalog from the server spec; mock world covers every salon state and permission set.
- Notes: the fixes live in the merchant copy only; the customer core still carries them in its baselines (port later; KMP_TEMPLATE copies the customer core).

### MER-002 — Build variants + CI
- Branch: `feat/mer-002-variants-ci`
- Branched: (batch 1 start, from `origin/merchant`)
- Status: DONE (batch 1 PR)
- Acceptance criteria (backlog MER-002, mirror `customer-ci.yml`):
  - [x] Android dev/prod × debug/release and iOS Debug/Release-Dev/Prod (schemes iosApp-Dev/Prod) from the template; `variants` policy ok
  - [x] Root `.github/workflows/merchant-ci.yml` (paths `WAB-Mobile-Salon/**`): policy checks, detekt, secret scan, Android matrix (assemble + lint + unit tests + R8/APK budget `config/budgets.json`), iOS matrix; the in-folder copy removed (GitHub reads only the root)
  - [x] `config/policy.json` + policy tests + `run_ios_checks.sh` point at `merchant-ci.yml`
- Tests: `python3 -m unittest discover -s scripts/ci/tests` (77 OK); `policy_checks.py variants` ok
- Loops: 1/1 — batch-1 run: policy `all: ok` (empty baseline), 78 policy-script tests, `testAndroidHostTest` (all modules) + `assembleDevDebug` green; per-task checks above (detekt clean in MER-003)
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch-1 code read: config/tooling and core plumbing only, no screens; contract + error catalog from the server spec; mock world covers every salon state and permission set.

### MER-001 — Scaffold the KMP app from the customer template
- Branch: `feat/mer-001-scaffold`
- Status: DONE (PR into `merchant`)
- Acceptance criteria (backlog row MER-001; owner request 2026-10-22: "use the tool, project name merchant, package com.fab.wab.merchant, skip Firebase files"):
  - [x] Generated with `.claude/tools/KMP_TEMPLATE/KMP_TEMPLATE --merge` into this folder (docs/design/.claude kept): same `libs.versions.toml`, `build-logic`, every `core/*` module, `composeApp`, `androidApp` (flavors dev/prod), `iosApp` (schemes iosApp-Dev / iosApp-Prod), CI scripts/policies/detekt/workflow
  - [x] Package `com.fab.wab.merchant` (dev `com.fab.wab.merchant.dev`), project `Merchant`, display name "WAB Merchant" / "WAB للتجار"; API prefix `/merchant/v1`, Socket.IO namespace `/merchant`; dev API = WAB dev server, dev data source = mock
  - [x] Firebase skipped: placeholders in `androidApp/src/{dev,prod}` and `iosApp/Firebase/{dev,prod}` (MER-004 = owner files)
  - [x] ADR on sharing `core/*`: `docs/ADR-001-core-sharing.md` (copy now via the tool; included build / packages later)
  - [x] Local gate green (`scripts/ci/run_local_checks.sh` exit 0: policy tests + checks, detekt, unit tests, 4 Android variants + lint, 4 iOS configurations, K/N tests)
  - [x] Runs on the Android emulator (`com.fab.wab.merchant.dev`, sample list from mock data, glass cards) and the iOS simulator ("WAB Merchant Dev", same screen)
- Tests: generated unit tests (core + sample + shell) via the gate — all green
- Loops: 1/1 — re-checked every criterion against the gate log and both devices
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — generated code identical to the verified template; merchant-specific values only in config; no WAB customer business in the merchant core.
- Notes: DEVIATIONS from the backlog row (owner instructions win): package `com.fab.wab.merchant` instead of `com.wab.merchant`; `feature/sample` kept as the reference feature (removed when the first merchant feature lands) instead of removed.
