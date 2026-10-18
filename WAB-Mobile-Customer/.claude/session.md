# WAB-Mobile-Customer — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next customer`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Will consume `/customer/v1` (51 ops) through DTOs generated from `WAB-Server/docs/api/openapi.customer.json` (CUS-009); mock source until the dev API exists (CUS-060 ← SRV-011).
- Done before the backlog: rules, variants + CI, policy checks, design system, base components, language/theme, permissions, refresh interceptor (CUS-001…003, 005, 007, 008, 014…017).
- Payments through the `wab-payments` KMP launcher (CUS-047 ← PAY-011); push via FCM facade (CUS-004); Firebase apps registered (dev + prod).

## Current task

- Next: finish CUS-032 (see block), then CUS-033…; task branches start from `origin/customer`.

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
- Status: IN PROGRESS (code + host tests done; gate, emulator check, loop and review still pending — session ended on the usage limit)
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
