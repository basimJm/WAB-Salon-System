# WAB-Mobile-Customer — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next customer`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Will consume `/customer/v1` (51 ops) through DTOs generated from `WAB-Server/docs/api/openapi.customer.json` (CUS-009); mock source until the dev API exists (CUS-060 ← SRV-011).
- Done before the backlog: rules, variants + CI, policy checks, design system, base components, language/theme, permissions, refresh interceptor (CUS-001…003, 005, 007, 008, 014…017).
- Payments through the `wab-payments` KMP launcher (CUS-047 ← PAY-011); push via FCM facade (CUS-004); Firebase apps registered (dev + prod).

## Current task

- Next: features from CUS-024 (config + system screens), CUS-025…; task branches start from `origin/customer`.

### CUS-011 — Session store: PRD §5 keys, secure tokens (Keystore / Keychain)
- Branch: `feat/cus-011-session-store`
- Status: IN REVIEW
- Acceptance criteria (PRD §5, §15; BUSINESS_DOMAIN enums; CLAUDE.md §2 core/security seam):
  - [x] `core/domain/session`: `Gender`, `GuestProfile`, `UserProfile`, `SessionState` (Guest / SignedIn with `genderScope`), one `SessionStore` interface (state, onboardingSeen, pushEnabled flows; `tokens()` on demand; signIn / updateTokens / updateUser / setOnboardingSeen / setGuestProfile / setPushEnabled / signOut / clearAll)
  - [x] `core/security`: `SecureKeyValueStore` + `StringCipher` ports, `SecurePayload` (iv:cipher base64 framing), Android `KeystoreCipher` (AES-256-GCM, non-exportable Keystore key), iOS `KeychainSecureStore` (generic password, after-first-unlock-this-device-only); `InMemorySecureKeyValueStore` for tests
  - [x] `core/storage`: `DataStoreSessionStore` (plain keys in DataStore, tokens in the secure store, non-secret `signed_in` marker so the state is a flow), `EncryptedPreferencesSecureStore`, `createSecureKeyValueStore` expect/actual, `AppSettingsImpl` tokens delegated to the same secure entries (refresh interceptor unchanged), `clearSession` → `signOut`
  - [x] Analytics context: user type + gender scope from `SessionStore.state` (only the scope leaves the device)
  - [x] Tests: `SessionStateTest` (2), `SecurePayloadTest` (2), `DataStoreSessionStoreTest` (5), `EncryptedPreferencesSecureStoreTest` (2), `AppSettingsImplTokensTest` (2), `AppAnalyticsContextProviderTest` (3)
- Tests: JVM host tests of domain/security/storage/composeApp green; `scripts/ci/run_local_checks.sh` incl. iOS → GATE-EXIT=0 (4 Android variants + lint, 4 iOS configurations + K/N tests)
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — one `SessionStore` port in `core/domain`, platform crypto behind `core/security` ports, DataStore never holds a plain token (test asserts it), the network refresh path reads the same secure entries, no literals beyond named key constants.
- Notes: tokens are never logged or exposed as flows; guest nickname/gender never leave the device. `push_enabled` defaults to true (PRD gives no default; OS permission still gates delivery). The Keystore/Keychain actuals are exercised by the device builds, not by unit tests (JVM host has no AndroidKeyStore).

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
