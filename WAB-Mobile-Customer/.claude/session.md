# WAB-Mobile-Customer — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next customer`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Will consume `/customer/v1` (51 ops) through DTOs generated from `WAB-Server/docs/api/openapi.customer.json` (CUS-009); mock source until the dev API exists (CUS-060 ← SRV-011).
- Done before the backlog: rules, variants + CI, policy checks, design system, base components, language/theme, permissions, refresh interceptor (CUS-001…003, 005, 007, 008, 014…017).
- Payments through the `wab-payments` KMP launcher (CUS-047 ← PAY-011); push via FCM facade (CUS-004); Firebase apps registered (dev + prod).

## Current task

- Next: CUS-029 OTP S13, CUS-030 register…; task branches start from `origin/customer`.

### CUS-026 — Nickname & gender S02 + launch router (PRD §4.2)
- Branch: `feat/cus-026-launch-router`
- Status: IN REVIEW
- Acceptance criteria (PRD §4.1–4.3, S02, §15; Design Script S02; prototype texts):
  - [x] Pure `launchDestinationOf(onboardingSeen, session)` → Onboarding / GuestProfile / Home (onboarding first; registered → Home; guest with nickname + gender → Home; else S02); `GuestProfile.isComplete`
  - [x] `MainViewModel` routes after the gate and re-routes after onboarding, after S02 and after a session expiry (guest without profile → S02); `UiState.launch`
  - [x] S02 in `feature/onboarding`: `SaveGuestProfileUseCase` (trimmed nickname + gender, local only), `GuestProfileViewModel` (Continue disabled until both valid, blank nickname error, `nickname_saved` with gender only), `GuestProfileScreen` (logo, title/subtitle, nickname field, Man / Woman choice cards, Continue), `GuestProfileRoute`
  - [x] Design system: `AppChoiceCard` (selected = accent border + soft fill), icons Man / Woman, size token `choiceCardHeight`
  - [x] AR + EN texts from the prototype
  - [x] Tests: `LaunchDestinationTest` (3), `GuestProfileViewModelTest` (3), `MainViewModelTest` (+3: first launch chain, registered skips S02, expired session → S02)
  - [x] Emulator: fresh install → onboarding → S02 (empty disabled, error, filled) → Home; relaunch before completing → S02 again; landscape
- Tests: domain + onboarding presentation + composeApp host tests green (9 new/updated); `scripts/ci/run_local_checks.sh` incl. iOS → GATE-EXIT=0; emulator (Pixel, AR): fresh install → onboarding → S02 empty (Continue disabled) → nickname + gender (card highlighted, Continue enabled) → Home; relaunch before saving shows S02 again, after saving goes straight to Home; landscape scrolls
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — router is one pure function; guest values never leave the device and the analytics event carries only the gender; Continue disabled state matches the design script; S02 built from design-system parts (`AppChoiceCard` new).
- Notes: S02 lives in `feature/onboarding` (same launch flow, no data module).

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
