# WAB-Mobile-Customer — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next customer`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Will consume `/customer/v1` (51 ops) through DTOs generated from `WAB-Server/docs/api/openapi.customer.json` (CUS-009); mock source until the dev API exists (CUS-060 ← SRV-011).
- Done before the backlog: rules, variants + CI, policy checks, design system, base components, language/theme, permissions, refresh interceptor (CUS-001…003, 005, 007, 008, 014…017).
- Payments through the `wab-payments` KMP launcher (CUS-047 ← PAY-011); push via FCM facade (CUS-004); Firebase apps registered (dev + prod).

## Current task

- Next: CUS-028 login S11, CUS-029 OTP…; task branches start from `origin/customer`.

### CUS-025 — Onboarding S01: 4-page pager, skip/next, `onboarding_seen` on display
- Branch: `feat/cus-025-onboarding`
- Status: IN REVIEW
- Acceptance criteria (PRD S01 + §4.3 onboarding rules; Design Script S01; prototype texts):
  - [x] `feature/onboarding` (domain: `OnboardingPage` ×4, `MarkOnboardingSeenUseCase`, `ObserveOnboardingSeenUseCase` over `SessionStore`; presentation: contract, `OnboardingViewModel` (marks seen in `onStart`, next → scroll, last → complete, skip → finished, analytics `onboarding_next/skip/complete` with page), `OnboardingScreen` (pager, dots, Skip always visible, Next / Get started), `OnboardingRoute`; di modules)
  - [x] Design system: `AppPageIndicator` (selected dot stretches, localized description) shared with the banner carousel; icons Discover / Booking / Bride / Payment; size tokens `pageIndicatorActive`, `onboardingIllustration`
  - [x] App shell: `MainViewModel` decides `onboardingRequired` once per launch from `onboarding_seen` (after the config gate); `OnboardingRoute` renders before the tab scaffold; `OnOnboardingFinished` continues to Home (S02 lands with CUS-026)
  - [x] AR + EN texts from the prototype (4 titles + 4 texts, skip/next/start)
  - [x] Tests: `OnboardingPageTest` (1), `OnboardingViewModelTest` (3), `MainViewModelTest` (+1 first launch)
  - [x] Emulator: fresh install shows onboarding (AR, RTL), swipe + Next + Get started reach Home; relaunch skips it (`onboarding_seen`); landscape layout
- Tests: onboarding domain/presentation + composeApp + design-system host tests green; `scripts/ci/run_local_checks.sh` incl. iOS → GATE-EXIT=0; emulator (Pixel, AR): onboarding on fresh install, Next ×3, Get started → Home, relaunch skips, landscape re-checked after the fix
- Loops: 1/1 — the loop caught two things: detekt `ParameterNaming` (`onFinished` → `onFinish`) and landscape clipping (texts pushed off-screen) → compact-height pages use a Row layout
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — feature follows the sample layout (domain/presentation/di), `onboarding_seen` written on display (PRD), page indicator reused by the carousel, texts in resources (AR first), analytics constants, no literals.
- Notes: illustrations are icon placeholders inside a tinted circle (the prototype has image slots only; owner art pending).

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
