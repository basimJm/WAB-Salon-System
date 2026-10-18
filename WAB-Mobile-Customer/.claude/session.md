# WAB-Mobile-Customer — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next customer`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Will consume `/customer/v1` (51 ops) through DTOs generated from `WAB-Server/docs/api/openapi.customer.json` (CUS-009); mock source until the dev API exists (CUS-060 ← SRV-011).
- Done before the backlog: rules, variants + CI, policy checks, design system, base components, language/theme, permissions, refresh interceptor (CUS-001…003, 005, 007, 008, 014…017).
- Payments through the `wab-payments` KMP launcher (CUS-047 ← PAY-011); push via FCM facade (CUS-004); Firebase apps registered (dev + prod).

## Current task

- Next: CUS-030 register S12, CUS-031…; task branches start from `origin/customer`.

### CUS-027 — Locations and reference data: countries, cities, areas (cached per language)
- Branch: `feat/cus-027-locations`
- Status: IN REVIEW
- Acceptance criteria (PRD §3.11, S11 default Jordan, S12 city → area; operations `GET /locations/countries|cities?countryCode|areas?cityId`):
  - [x] Domain `core/domain/locations`: `Country` (code, name, dial code, flag URL, phone regex), `City`, `Area`, `LocationsRepository` (`countries`, `cities(countryCode)`, `areas(cityId)`, `refresh` flag), `defaultCountry()` (Jordan else first)
  - [x] Data `core/data/locations`: `LocationsApi` from `CustomerOperations` paths + query params, mappers, `LocationsRepositoryImpl` with an in-memory cache keyed by language (+ parent id), errors never cached, refresh bypasses; bound in `dataModule` with the settings language flow
  - [x] Tests: `LocationsTest` (1), `LocationsRepositoryTest` (2, MockEngine: per-language cache, parent-keyed cache, error not cached, refresh)
- Tests: `:core:domain` + `:core:data` host tests green (3 new); `scripts/ci/run_local_checks.sh` incl. iOS → GATE-EXIT=0
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — repository built on the generated operations; cache keyed by the same language source as the Accept-Language header so a language switch refetches; errors never cached; no UI.
- Notes: no UI in this task (consumers: S11/S12 CUS-028, profile CUS-053); the Accept-Language header is added by the shared client, the cache key mirrors it.

### CUS-028 — Login S11: phone + country, check-phone, not-registered / blocked, language + theme, legal links
- Branch: `feat/cus-028-login`
- Status: IN REVIEW
- Acceptance criteria (PRD S11, §3.12 entry, §14 names; Design Script S11; operation `POST /auth/check-phone` → 200 / 404 PHONE_NOT_REGISTERED / 403 ACCOUNT_BLOCKED / 409 PHONE_ALREADY_REGISTERED):
  - [x] `feature/auth` (domain: `PhoneNumber`, `AuthPurpose`, `PhoneCheck`, `AuthRepository`, `CheckPhoneUseCase`; data: `AuthApi` on the generated operation, `AuthRepositoryImpl` + pure `phoneCheckOf` mapping the contract's error codes to outcomes; presentation: `LoginViewModel`, `LoginScreen` + `LoginOverlays`, `LoginNavigation` registering `Graph.Auth`; di)
  - [x] S11 behaviour: countries from `LocationsRepository` (default Jordan), number validated with the selected country's regex (error under the field once touched, button disabled until valid), loading spinner on submit; registered → OTP route; not registered → popup → Register route prefilled; blocked → suspended message with Contact action; errors as toast; language + theme icons persist through `AppearanceSettings`; legal links → `Screen.ContentPage(slug)`
  - [x] Shell: `Graph.Auth` + `Screen.Login/Register/Otp/ContentPage` routes; `AppNavScaffold(navigationVisible)` hides the tab bar outside the root tabs (`RootTab.forRoutesOrNull`); Profile placeholder carries the "Log in" entry; Register / OTP / content placeholders until CUS-029/030/05x; icons Language / ThemeDark / ThemeLight
  - [x] AR + EN texts from the prototype
  - [x] Tests: `PhoneCheckMapperTest` (2), `LoginViewModelTest` (6), `RootTabTest` (+1)
  - [x] Emulator (AR): Profile → Log in → empty / invalid / valid / loading, country picker, language toggle to EN, theme toggle, OTP placeholder after a registered number (mock answers 200)
- Tests: auth data/presentation + composeApp host tests green (9 new); policy suite 76 OK; `scripts/ci/run_local_checks.sh` incl. iOS → GATE-EXIT=0; emulator (Pixel): Profile → Log in, empty (disabled) / invalid (error) / valid (enabled), country picker, submit → OTP placeholder with the number, English LTR, dark mode, back to Arabic
- Loops: 1/1 — the loop found three defects (duplicate-key crash from mock fixtures, clipped legal links, literal apostrophe escapes) and fixed them
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — outcomes mapped from contract codes in one pure function; the number is normalized before it leaves the screen and never logged/tracked; auth graph hides the tab bar; strings AR + EN; no literals (slugs, purposes, analytics names are constants).
- Notes: the not-registered and blocked popups cannot be reached with the mock transport (always 200) and are verified by unit tests; `Screen.Otp` carries the purpose + national number for CUS-029. FOUND by the emulator check: mock list fixtures repeated identical ids/codes → duplicate `LazyColumn` key crash in the country picker; `api_sync.py` now varies ids/codes per item and emits Jordan phone samples (regenerated), the view model de-duplicates by code; legal links overflowed → `FlowRow`; `\'` in Compose string resources renders literally (unlike Android XML) → typographic apostrophes in the login and onboarding EN strings.

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
