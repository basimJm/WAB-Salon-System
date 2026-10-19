# WAB-Mobile-Customer — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next customer`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Will consume `/customer/v1` (51 ops) through DTOs generated from `WAB-Server/docs/api/openapi.customer.json` (CUS-009); mock source until the dev API exists (CUS-060 ← SRV-011).
- Done before the backlog: rules, variants + CI, policy checks, design system, base components, language/theme, permissions, refresh interceptor (CUS-001…003, 005, 007, 008, 014…017).
- Payments through the `wab-payments` KMP launcher (CUS-047 ← PAY-011); push via FCM facade (CUS-004); Firebase apps registered (dev + prod).

## Current task

- Batch 1 (owner rule 2026-10-19: Gradle/gate/emulator/loop/review once per five tasks): CUS-032 ✓ code, CUS-033 ✓ code, CUS-034 ✓ code, CUS-035 ✓ code, CUS-036 ✓ code → then gate + emulator + loop + review + one PR into `customer`. Each task branch starts from the previous task branch.

### CUS-029 — OTP S13 (shared): pre-check, Firebase verification, ID token to the backend, wrong attempts, countdown
- Branch: `feat/cus-029-otp`
- Status: IN REVIEW
- Acceptance criteria (PRD S13, §14 names; root CLAUDE.md §4.2; operations `POST /auth/otp/request`, `POST /auth/otp/wrong-attempt`, `POST /auth/login`):
  - [x] Domain: `OtpPolicy`, `WrongAttemptResult`, `AuthSession`, `InstallationInfo`, `OtpVerified`, `PhoneNumber.toE164`; `AuthRepository.requestOtp / reportWrongAttempt / login`; `InstallationInfoProvider` (app binds it); `PendingOtpVerification` (proof hand-off for register / change phone / booking); use cases `RequestOtp`, `ReportWrongOtpAttempt`, `LoginWithIdToken` (stores the session), `ResolveDialCode`
  - [x] Data: `AuthApi` + mappers (lenient `blockedUntil`), `AuthRepositoryImpl`; `AuthMappersTest` (2)
  - [x] Screen: `OtpViewModel` (pre-check → Firebase `startVerification` → N boxes from the policy (`otpLength`, config fallback), resend countdown from `resendAfterSeconds`, `allowed=false` → blocked remaining time, confirm → LOGIN logs in + stores tokens/first name/gender → Home; other purposes publish the proof and go back; Firebase invalid → wrong-attempt report (+ block), expired → popup, throttling / network → error catalog), `OtpScreen` (title by purpose, "sent to {phone}", `AppOtpInput`, Verify, resend / countdown / block), `AuthNavigation` (Login + OTP in `Graph.Auth`), Koin factory with route params
  - [x] App: `Platform.osVersion / deviceModel`, `AppInstallationInfoProvider` (Firebase app-instance id, FCM token) bound in `appPlatformModule`; `AppInstallationInfoProviderTest` (2)
  - [x] AR + EN texts from the prototype; `formatCountdown` (`0:45`)
  - [x] Tests: `OtpViewModelTest` (6, virtual time), `AuthMappersTest` (2), `AppInstallationInfoProviderTest` (2)
  - [x] Emulator (AR): Login → OTP shows the E.164 number, 6 boxes (mock policy), countdown 0:54; filled boxes enable Verify; Verify → login through the mock API → Home, no fatal exception
- Tests: auth data/presentation + composeApp host tests green (10 new); policy suite 76 OK; `scripts/ci/run_local_checks.sh` incl. iOS → GATE-EXIT=0
- Loops: 1/1 — the loop found the fixture OTP policy (1 box, resend 1 s, not allowed) and the placeholder-config crash in the Firebase providers; both fixed
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — Firebase only through the `core/firebase` port (fake in mock mode), OTP length and resend timing from the backend with the config fallback, wrong attempts reported, block/countdown driven by the server timestamp through the injectable clock, proof hand-off for the other purposes is single-use, nothing phone-related in analytics.
- Notes: with `DATA_SOURCE=mock` the auth module binds `FakePhoneAuthGateway` (no SMS can be sent against fixtures; any code verifies), so the whole login flow runs on the emulator without Firebase; the real gateway stays bound for `remote`. FOUND by the emulator check: the OTP fixture sampled `otpLength = 1`, `resendAfterSeconds = 1`, `allowed = false` → generator hints (`otpLength` 6, `resendAfterSeconds` 60, `attemptsRemaining` 5, `allowed` true), fixtures regenerated. Second finding: with placeholder Firebase keys the Android app-instance-id / FCM token lookups throw `IllegalArgumentException` ("set a valid API key") → the Android providers now answer null for it too (login still proceeds with the unknown-installation marker).

### CUS-030 — Register S12: all fields, guest prefill, city → area, OTP (REGISTER), `POST /auth/register` → Home
- Branch: `feat/cus-030-register`
- Status: IN REVIEW
- Acceptance criteria (PRD S12, §11 validation; operations `POST /auth/check-phone` (REGISTER), `POST /auth/register`):
  - [x] Domain: `RegisterRequest`, `AuthRepository.register`, `RegisterUseCase` (stores tokens + first name + gender); data mappers (`toBody`, `PostAuthRegisterData.toDomain`); `AuthMappersTest` (+1)
  - [x] `RegisterViewModel`: first name + gender prefilled from the guest profile, country + number from the login hand-off; all seven fields required (email pattern of the contract, phone with the country regex); inline errors once touched or after submit; Register disabled until valid; city → areas loaded, area disabled until a city is chosen; submit → check-phone (REGISTER) → OTP route (purpose REGISTER); the OTP proof returns through `PendingOtpVerification` → register → Home; already registered / blocked → error from the catalog; language + theme icons; legal links; "I already have an account – Log in"
  - [x] `RegisterScreen` + `RegisterForm` (design-system fields / dropdowns / phone field), shared `AuthTopIcons` + `AuthLegalLinks` (Login refactored to use them); `AuthNavigation` hosts Register; placeholder removed
  - [x] AR + EN texts from the prototype
  - [x] Tests: `RegisterViewModelTest` (4), `AuthMappersTest` (+1)
  - [x] Emulator (AR): Login → "سجّل الآن" → Register prefilled (Sara, woman, +962 791234567), area disabled until a city is chosen, errors after submit, filled → OTP → Verify → Home
- Tests: auth data/presentation + composeApp host tests green (5 new); `scripts/ci/run_local_checks.sh` incl. iOS → GATE-EXIT=0; emulator (Pixel, AR): Login → Register prefilled (Sara, امرأة, +962), area disabled until a city is chosen, city → areas, filled form enables Register → OTP (REGISTER) → Verify → Home
- Loops: 1/1 — the loop caught the detekt complexity of `onEvent` (split into text / selection handlers)
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — register goes through the same check-phone → OTP → proof path as login; names / email / phone never reach analytics; the OTP proof is single-use; shared auth chrome removes the Login duplication; AR + EN strings.
- Notes: cities are loaded for Jordan (PRD §1 market) regardless of the phone's country; the register call reuses the installation record of login.

### CUS-031 — Session: logout, installations (`PUT /installations`, `PATCH /installations/push-enabled`)
- Branch: `feat/cus-031-session-installations`
- Status: IN REVIEW
- Acceptance criteria (PRD §10.2, §14, §5 `push_enabled`; BUSINESS_DOMAIN installations; operations `POST /auth/logout`, `PUT /installations`, `PATCH /installations/push-enabled`; `POST /auth/login` and `/auth/refresh` already covered by CUS-029 / CUS-003):
  - [x] Domain: `InstallationsRepository` (register, setPushEnabled), `InstallationLink`, `AuthRepository.logout`; use cases `LogoutUseCase` (revoke + unlink on the backend, always clears the local session), `SyncInstallationUseCase` (device facts + language; skipped without an app-instance id), `SetPushEnabledUseCase` (local flag, synced to the account when signed in)
  - [x] Data: `InstallationsApi`, `InstallationsRepositoryImpl`, `AuthApi.logout`; mapper `toPutBody(language)`
  - [x] App: `InstallationSyncer` re-registers at launch, on sign-in / sign-out (link / unlink), on language change and on every FCM token refresh (`PushTokenProvider.tokenUpdates`); serialized, silent on failure; started by `MainViewModel`
  - [x] Tests: `InstallationSyncerTest` (2), `SessionUseCasesTest` (3), `InstallationMapperTest` (1); `MainViewModelTest` updated
  - [x] Emulator (dev debug, mock): at launch the app sends `PUT /customer/v1/installations` (real app-instance id, `Accept-Language: ar`) and the mock answers `{installationId, linked:false}`; no fatal exception / Koin error in logcat
- Tests: auth data/presentation + composeApp host tests green (6 new); policy suite OK; `scripts/ci/run_local_checks.sh` incl. iOS → GATE-EXIT=0; emulator smoke launch clean
- Loops: 1/1 — the loop found the auth `di` module missing the coroutines dependency (`Flow` not on its classpath) and the syncer exposing a mutable history; both fixed
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — the device record is one `PUT` body built by a pure mapper; triggers are a pure flow composition (launch, sign-in/out, language, FCM token) serialized by a mutex and silent on failure; logout always clears the local session even when the backend call fails; the push switch stays local for guests; refresh tokens are read on demand and never logged or tracked.
- Notes: a replayed FCM token at startup causes a second `PUT` right after the launch one (same facts; harmless). If `PATCH /installations/push-enabled` fails the local flag already changed; the profile UI (CUS-053) surfaces that error. No screen in this task (logout and the push switch get their UI with the profile, CUS-053); the Home tab still shows the template's sample screen error (`/api/sample/items` is not a contract route → mock 404), pre-existing until CUS-040 replaces it.

### CUS-032 — Home S03: `GET /home`, header + badge, banners, search bar, gender tabs, sections, nearest permission states
- Branch: `feat/cus-032-home`
- Status: IN PROGRESS (code + host tests done; gate ran green except two detekt findings, fixed; emulator check, loop and review at the end of batch 1)
- Acceptance criteria (PRD S03 + 8.0, Design Script S03; operations `GET /home?gender=&lat=&lng=`, `PUT/DELETE /favorites/{salonId}`; realtime `notifications.unread {count}`):
  - [x] Core: `SalonSummary`/`OpeningHours` (core/domain `salon/`), `FavoritesRepository` (+ impl in core/data `favorites/`, bound in `dataModule`), `Operation.pathWith`, `TimeFormat.to12Hour/range12Hour` (core/common), routes `Screen.SalonDetails/AllSalons/AllServices/Notifications` + `SalonListFilter`, strings `time_am/pm/range_separator`, icons `Location/LocationOff`
  - [x] `feature/home` domain (`HomeContent`, `BannerAction` + `bannerActionOf`, `HomeRepository`, `LoadHomeUseCase`, `GetCurrentLocationUseCase` with timeout) · data (`HomeApi`, mappers, `HomeRepositoryImpl`) · presentation (`HomeViewModel`: gender from session, one request per tab, coordinates only when permission + service on, nearest LocationOff/Empty/Salons, explanation → system request → denied-permanently → settings, resume reload, live unread badge from the socket, favorites auth-gated + optimistic; `HomeScreen`/`HomeSections`/`HomeUiMappers`; `HomeNavigation` with `openUrl`) · di
  - [x] App: modules registered (settings, `ComposeAppPlugin`, `App.kt`), `MainNavigation` uses `HomeNavigation` (sample graph no longer registered), placeholders for S04/S06/S07/S19; fixture hints (`open/close` "HH:mm", `actionType` NONE) + regenerated
  - [x] Tests green: `TimeFormatTest` (3), `OperationPathTest` (2), `HomeMappersTest` (2), `HomeViewModelTest` (9)
  - [ ] Gate `scripts/ci/run_local_checks.sh` (detekt, 4 variants, iOS) — NOT RUN YET
  - [ ] Emulator check AR/EN, light/dark, portrait/landscape (guest + registered, tabs, nearest states) — NOT DONE YET
- Tests: host tests of core/common, core/data, feature/home data+presentation, composeApp green
- Loops: 0/1
- Review: PENDING
- Notes: `HomeViewModel` must read `uiState.value` (delegate), not `state.value`, inside `onStart`-launched work: the derived `state` lags and the first load was skipped. Welcome name/gender come from the session store, not the server's `firstName`.

### CUS-033 — All salons S04: `GET /salons` (debounced search + filters + gender + location), entry presets, chips, nearest without location
- Branch: `feat/cus-033-all-salons` (from `feat/cus-032-home`)
- Status: IN PROGRESS (code + tests written; Gradle not run yet — batch 1)
- Acceptance criteria (PRD S04 + 8.0, Design Script S04; operation `GET /salons` with `page, pageSize, gender, q(≤80), serviceIds, minPrice, maxPrice, minRating, general=RECOMMENDED, lat, lng, sort=NEAREST`):
  - [x] core/domain `salon/SalonFilters.kt`: `ServiceRef`, `PriceRange`, `GeneralFilter`, `SalonFilters`, `SalonQuery` (+ `SalonQueryDefaults`: page 10, q ≤ 80, debounce 500 ms), `SalonSearchRepository`; route `Screen.AllSalons(serviceId, serviceName, filter)` (Home passes the service name for the chip)
  - [x] `feature/salons` domain (`SearchSalonsUseCase`), data (`SalonSearchApi` builds the combined query: Recommended → `general`, Nearest → `sort=NEAREST` + lat/lng, services repeated `serviceIds`; `SalonSearchRepositoryImpl` + mapper), presentation (`AllSalonsViewModel`: entry presets → filters, gender from the session, 500 ms debounce on the typed text, paging by page size, chips removal reloads, Nearest without location → explanation dialog → system request → granted reload / refused drop + info toast, favorites auth-gated; `AllSalonsScreen`: sticky top bar + search bar + filter icon, `AppFilterChipRow`, shimmer / empty / offline / error / pull-to-refresh, `AppPagedList`; `SalonsNavigation` registers `Screen.AllSalons` at the host), di; AR + EN strings
  - [x] Tests: `SalonSearchApiTest` (2, MockEngine query assertions), `AllSalonsViewModelTest` (7: presets, first page + paging, debounce = no request per keystroke, chip removal, nearest refused → dropped, nearest granted → coordinates, empty/error)
  - [ ] Gradle + emulator: batch 1
- Tests: written, not yet run (batch rule)
- Loops: 0/1
- Review: PENDING
- Notes: ASSUMPTION `serviceIds` is sent as repeated query params (the contract schema has no `style`); S05 (`OpenFilters`) is wired in CUS-034; the S04 placeholder was removed.

### CUS-034 — Filter sheet S05: services paged 10 + See more, price bounds after a service, general / rating single-select, Apply / Reset / Close
- Branch: `feat/cus-034-filter-sheet` (from `feat/cus-033-all-salons`)
- Status: IN PROGRESS (code + tests written; Gradle not run yet — batch 1)
- Acceptance criteria (PRD S05, Design Script S05; operations `GET /catalog/services?gender&page&pageSize`, `GET /salons/filters?gender&serviceIds`):
  - [x] core: `CatalogRepository` / `CatalogService` (core/domain `catalog/`, impl core/data `catalog/`, bound in `dataModule`; reused by S06)
  - [x] `feature/salons`: `SalonFilterOptionsRepository` (price bounds) + `SalonFiltersApi` + impl; use cases `LoadFilterServices`, `LoadPriceBounds`; `FilterSheetViewModel(initial, gender)` seeded with the active filters (selected services kept visible even off page 1), services paged by 10 with See more, price bounds requested whenever the selection changes and hidden without a selection / numeric bounds, general + rating single-select (tap again clears), Reset clears all, Apply emits the filters (a full-bounds slider = no price filter); `FilterSheet` (full-screen `AppBottomSheet`: close / title / Reset header, chips FlowRow + shimmer chips + See more, range slider with JOD text, radio rows, sticky Apply); `SalonsNavigation` hosts the sheet per request key and feeds `OnFiltersApplied` to S04 (chips + reload page 1); close discards
  - [x] AR + EN strings
  - [x] Tests: `FilterSheetViewModelTest` (5: reflects active filters + first page + bounds call, See more paging stops on a short page, price visibility + single-selects, reset/apply payloads, bounds failure / non-numeric + range conversions)
  - [ ] Gradle + emulator: batch 1
- Tests: written, not yet run (batch rule)
- Loops: 0/1
- Review: PENDING
- Notes: the contract has no "general filters list" endpoint, so the two options are the `GeneralFilter` enum (PRD says "list from server"; flagged). Price bounds come as JOD text; the slider rounds to whole JOD.

### CUS-035 — All services S06: `GET /catalog/services?gender=` paginated expandable cards, tap → S04 prefiltered
- Branch: `feat/cus-035-all-services` (from `feat/cus-034-filter-sheet`)
- Status: IN PROGRESS (code + tests written; Gradle not run yet — batch 1)
- Acceptance criteria (PRD S06, Design Script S06; operation `GET /catalog/services?gender&page&pageSize`):
  - [x] Route `Screen.AllServices(gender)` carries the Home tab's gender (Home passes it in `OpenAllServices`); placeholder removed
  - [x] `AllServicesViewModel(gender)` over `CatalogRepository` (page 10, load more, pull-to-refresh, empty/offline/error), tap → `Screen.AllSalons(serviceId, serviceName)`; `AllServicesScreen` (top bar, `AppPagedList` of `AppServiceCardExpandable` = description collapsed with "more", expands in place); registered in `SalonsNavigation`; AR + EN strings
  - [x] Tests: `AllServicesViewModelTest` (2: gender + paging + open salons; empty/error)
  - [ ] Gradle + emulator: batch 1
- Tests: written, not yet run (batch rule)
- Loops: 0/1
- Review: PENDING

### CUS-036 — Salon details S07: `GET /salons/{id}`, maps / call / WhatsApp, hours + closures, staff, reviews, services, gallery, sticky Book, share, favorite
- Branch: `feat/cus-036-salon-details` (from `feat/cus-035-all-services`)
- Status: IN PROGRESS (code + tests written; Gradle not run yet — batch 1)
- Acceptance criteria (PRD S07 items 1–12 + acceptance, Design Script S07; operation `GET /salons/{salonId}`; sheets / reviews list / media viewer / booking are CUS-037/038/039/042):
  - [x] Env: `AppEnvironment.webBaseUrl` (`DEV/PROD_WEB_BASE_URL` → Android `BuildConfig.WEB_BASE_URL`, iOS `WEB_BASE_URL` xcconfig → Info.plist), `DeepLinks.salon(webBaseUrl, id)` (core/common)
  - [x] core/ui `external/ExternalActions` port (maps chooser, dialer, WhatsApp, native share) with Android intents + iOS `UIApplication`/`UIActivityViewController`, `ExternalLinks` pure builders, `FakeExternalActions`; `externalActionsModule` in `coreDiModule`
  - [x] core/domain `salon/SalonDetails.kt` (`DayOfWeek` SAT…FRI, `StaffStatus`, `MediaType`, `RatingSummary`, `DaySchedule`, `Closure`, `StaffPreview`, `SalonService`, `GalleryItem`, `Review`, `ReviewsPreview`, `SalonDetails`); `TimeFormat.isoDateText`
  - [x] `feature/salon`: domain (`SalonDetailsRepository`, `GetSalonDetailsUseCase`), data (`SalonDetailsApi` via `pathWith`, mappers with safe enum fallbacks), presentation (`SalonDetailsViewModel`: load / refresh, share = name + deep link, maps / call / WhatsApp through the port, favorite auth-gated + optimistic with revert, Book always enabled → guest auth dialog / registered → `Screen.BookingStart`, hours expand; screens: top bar with share + favorite, cover + overlapping avatar, open/closed badge + today's hours, tappable location, Call + WhatsApp (only with a number), expandable description, working hours + "Day off" + upcoming closures, staff row, reviews header (salon rating independent) + first 3 + See all + Add review (auth-gated), services rows, gallery grid from rows, sticky Book in the bottom bar), `SalonNavigation`, di; AR + EN strings incl. day names
  - [x] Routes `Screen.SalonReviews(salonId)`, `Screen.BookingStart(salonId)` with placeholders; the S07 placeholder removed
  - [x] Tests: `DeepLinksTest` (1), `ExternalLinksTest` (1), `TimeFormatTest` (+1), `AppEnvironmentTest` (+1), `SalonDetailsMappersTest` (1), `SalonDetailsViewModelTest` (4)
  - [ ] Gradle + emulator: batch 1
- Tests: written, not yet run (batch rule)
- Loops: 0/1
- Review: PENDING
- Notes: web base URLs are PLACEHOLDERS like the API hosts (owner decision: platform domain); staff / service taps and gallery taps emit side effects consumed by CUS-037 / CUS-039 (no-ops now).
