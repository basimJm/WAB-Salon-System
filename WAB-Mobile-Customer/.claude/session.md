# WAB-Mobile-Customer — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next customer`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Will consume `/customer/v1` (51 ops) through DTOs generated from `WAB-Server/docs/api/openapi.customer.json` (CUS-009); mock source until the dev API exists (CUS-060 ← SRV-011).
- Done before the backlog: rules, variants + CI, policy checks, design system, base components, language/theme, permissions, refresh interceptor (CUS-001…003, 005, 007, 008, 014…017).
- Payments through the `wab-payments` KMP launcher (CUS-047 ← PAY-011); push via FCM facade (CUS-004); Firebase apps registered (dev + prod).

## Current task

- Next: CUS-025 onboarding, CUS-026 launch router…; task branches start from `origin/customer`.

### CUS-012 — Analytics tracker: route screen views, action screen context, user id sync, app-instance id
- Branch: `feat/cus-012-analytics-tracker`
- Status: IN REVIEW
- Acceptance criteria (PRD §14; CLAUDE.md §3 analytics rule):
  - [x] `track(screen)` on every route: `TrackNavigationScreens(navController)` in the app shell → `AnalyticsTracker.trackRoute(route)`; `AnalyticsScreenNames.fromRoute` derives snake_case names from typed routes; a route view waits one grace window so a screen's own `TrackScreen` (with ids) replaces it instead of doubling
  - [x] Every action carries the current `screen_name` (event params win); common fields already merged by the tracker
  - [x] Firebase user id set on login / cleared on logout on analytics and Crashlytics (`SessionAnalyticsSync` over `SessionStore.state`, started by `MainViewModel`); user properties `user_type`, `gender_scope`; `UserProfile.id` stored under `user_id`
  - [x] App-instance id exposed for the backend: `AppInstanceIdProvider` port (Android `FirebaseAnalytics.appInstanceId`, iOS `AnalyticsBridge.appInstanceId()` → `Analytics.appInstanceID()`), fake for tests; consumed by CUS-058 installations
  - [x] Tests: `AnalyticsScreenNamesTest` (2), `DefaultAnalyticsTrackerTest` (+2: action screen context, route view claim), `SessionAnalyticsSyncTest` (1), `FirebaseFacadeTest` (+1), storage/domain tests updated for the user id
- Tests: JVM host tests of analytics/firebase/storage/domain/composeApp green; `scripts/ci/run_local_checks.sh` incl. iOS → GATE-EXIT=0
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — route views deduped by a tested grace window instead of per-screen wiring; screen context attached synchronously at call time (no cross-thread state); user id sync is one flow collector on the session state; app-instance id stays behind the `core/firebase` port; nothing analytics-related goes to the backend.
- Notes: apps never send analytics to the backend (unchanged); only the user id and gender scope leave the device.

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
