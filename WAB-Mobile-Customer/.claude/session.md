# WAB-Mobile-Customer — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next customer`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Will consume `/customer/v1` (51 ops) through DTOs generated from `WAB-Server/docs/api/openapi.customer.json` (CUS-009); mock source until the dev API exists (CUS-060 ← SRV-011).
- Done before the backlog: rules, variants + CI, policy checks, design system, base components, language/theme, permissions, refresh interceptor (CUS-001…003, 005, 007, 008, 014…017).
- Payments through the `wab-payments` KMP launcher (CUS-047 ← PAY-011); push via FCM facade (CUS-004); Firebase apps registered (dev + prod).

## Current task

- Next: CUS-026 nickname & gender + launch router, then CUS-027…; task branches start from `origin/customer`.

### CUS-013 — Realtime client: Socket.IO over Ktor WebSockets, fake, foreground reconnect
- Branch: `feat/cus-013-realtime-client`
- Status: IN REVIEW
- Acceptance criteria (PRD §3.15; BUSINESS_DOMAIN §7; server `constants/sockets.ts`: `/socket.io`, namespace `/customer`, `auth.token`, ping 25 s / timeout 20 s):
  - [x] `core/realtime`: `RealtimeClient` (status StateFlow, events SharedFlow, connect / disconnect), `RealtimeEvents` constants (`booking.updated`, `booking.requested`, `booking.assigned`, `notifications.unread`), `RealtimeEvent(name, payload)`, `RealtimeStatus`
  - [x] `SocketIoProtocol` codec (Engine.IO v4 + Socket.IO v4 text frames: open / ping / pong / close, namespace connect with the token, connected, disconnect, event, connect error code) — pure, tested
  - [x] `SocketIoRealtimeClient`: handshake with the session's access token, pong on ping, silent server (ping budget) or close → reconnect with capped exponential backoff, `UNAUTHORIZED` → stop until the next `connect()`; transport behind `RealtimeTransport` (Ktor WebSockets on the platform engine; in-memory fake in tests)
  - [x] `FakeRealtimeClient` bound when `DATA_SOURCE=mock`; `realtimeModule` registered in `App.kt`
  - [x] Foreground rule: `RealtimeConnectionEffect(client, isSignedIn)` in the app shell connects when resumed + signed in, disconnects on pause / sign-out
  - [x] Tests: `SocketIoProtocolTest` (3), `RealtimeConfigTest` (2), `SocketIoRealtimeClientTest` (4), `RealtimeConnectionRuleTest` (1)
- Tests: `:core:realtime:testAndroidHostTest` + composeApp green (10 new tests, virtual time); `scripts/ci/run_local_checks.sh` incl. iOS → GATE-EXIT=0
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — protocol codec pure and tested against socket.io v4 framing; client state machine tested with an in-memory transport under virtual time (handshake, pong, event, unauthorized stop, drop + silence reconnect, backoff); token read on every attempt (rotations picked up); no literals (defaults mirror the server constants); not exercised against a live server (owner deployment pending).
- Notes: LIBRARY ADDED (CLAUDE.md §1.12): `io.ktor:ktor-client-websockets` (same Ktor 3.4.2 version) — the Socket.IO v4 protocol is implemented in common code over Ktor WebSockets instead of two native Socket.IO SDKs (one codebase, testable without a server, no Swift bridge). The socket URL derives from the API base URL (same host; no new env key).

### CUS-024 — App config + system screens: launch gate, force update, optional update, maintenance (S24)
- Branch: `feat/cus-024-config-system-screens`
- Status: IN REVIEW
- Acceptance criteria (PRD §4.2 first step, S24; operation `GET /customer/v1/config?platform&version`; server `appConfig.service.ts` statuses):
  - [x] Domain `core/domain/config`: `AppConfig` (update policy + status, maintenance, nearby radius, OTP length/resend, contact), `ClientPlatform`, `AppConfigRepository` (`current` + `refresh()`), pure `launchGateOf` (maintenance > force > optional > ready) — the template's `ApplicationSettings*` removed
  - [x] Data `core/data/config`: `AppConfigApi` from `CustomerOperations.getConfig` (+ `platform`, `version` query), mapper, repository with the last value for features; `appPlatformModule` binds `ClientPlatform`
  - [x] `MainViewModel`: config → `LaunchGate`; retry reloads; optional dismiss → ready; update → `OpenStore(storeUrl)` (platform `openStoreLink(url)` replaces the template's hardcoded store links); `UiState(loading, gate, error, appVersion)`
  - [x] Screens: `SplashScreen` (loader / error + retry), `ForceUpdateScreen` (blocking, Update), `MaintenanceScreen` (blocking, server message or default, Retry), optional update via `AppGlobalDialog(OptionalUpdate)` over the app; AR + EN texts from the design script; previews AR/EN, light/dark, portrait/landscape, tablet
  - [x] Mock fixtures: generator booleans default `false` (maintenance off in the fixture); `MockFixtures` regenerated
  - [x] Tests: `LaunchGateTest` (3), `AppConfigMapperTest` (1), `MainViewModelTest` (5)
- Tests: domain/data/composeApp host tests green (9 new); policy suite 76 OK; `scripts/ci/run_local_checks.sh` incl. iOS → GATE-EXIT=0; Android emulator (Pixel, dev-debug, Arabic): splash → home shell, RTL bottom bar, no fatal exception
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — gate decision is a pure function with tests; store URL comes from the backend (template literals removed, baseline shrank); config read through the generated operation; the ViewModel's error-text seam keeps tests free of resource loading; system screens built from design-system parts only.
- Notes: PLUGIN ADDED (CLAUDE.md §1.12): `com.google.firebase.crashlytics` 3.0.6 in the Android app convention plugin — the emulator check found the app aborting at startup since CUS-004 (`Crashlytics build ID is missing`); the plugin generates the id (mapping upload stays CUS-067). `viewModelOf(::MainViewModel)` cannot resolve the lambda/test-scope seams → explicit `viewModel { MainViewModel(...) }`. Unused template strings removed (optional update now uses the design-system global dialog). The blocking screens cannot be reached from the mock fixture (status OK, maintenance off) so they are verified through previews; the launch path (splash → home) is checked on the emulator.

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
