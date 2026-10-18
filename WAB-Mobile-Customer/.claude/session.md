# WAB-Mobile-Customer — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next customer`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Will consume `/customer/v1` (51 ops) through DTOs generated from `WAB-Server/docs/api/openapi.customer.json` (CUS-009); mock source until the dev API exists (CUS-060 ← SRV-011).
- Done before the backlog: rules, variants + CI, policy checks, design system, base components, language/theme, permissions, refresh interceptor (CUS-001…003, 005, 007, 008, 014…017).
- Payments through the `wab-payments` KMP launcher (CUS-047 ← PAY-011); push via FCM facade (CUS-004); Firebase apps registered (dev + prod).

## Current task

- Next: CUS-013 realtime client, then features from CUS-024; task branches start from `origin/customer`.

### CUS-010 — Mock data source: fixtures per operation, scenario switcher, DATA_SOURCE config
- Branch: `feat/cus-010-mock-source`
- Status: IN REVIEW
- Acceptance criteria (INTEGRATION.md §4; backlog row):
  - [x] `DataSource` in `AppEnvironment` from `DATA_SOURCE` (Android build config from `DEV_/PROD_DATA_SOURCE`; iOS xcconfig + Info.plist); prod refuses `mock`; policy variants check the keys
  - [x] `api_sync.py` also generates `MockFixtures` (success envelope per operation from the response schema, text markers localized by Accept-Language)
  - [x] `core/data/mock`: `createMockEngine` (Ktor MockEngine over `CustomerOperations`, path templates, 404 envelope for unknown paths), `MockScenarios` (Success / Empty / Unauthorized / NotFound / ServerError / Timeout / Offline), `mockDataModule` binds the `HttpEngineProvider` seam of `core/network`
  - [x] Tests: `MockTransportTest` (5: matching, every operation has a fixture, localization, scenarios, unknown path), `AppEnvironmentTest` data source, `test_api_sync` fixtures, `test_variants` keys
- Tests: policy suite 76 OK; `scripts/ci/run_local_checks.sh` incl. iOS → GATE-EXIT=0 (BUILD SUCCESSFUL 3m04s; 4 iOS configurations + K/N tests)
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — fixture keys derived from method+path exactly like the generator (no index coupling); error envelopes carry only `code` (clients never show mock text); mock refused in prod by `AppEnvironment`; `ktor-client-mock` ships in the main source set so the engine choice stays a runtime config (prod binaries carry it unused).
- Notes: the scenario switcher UI lands with the profile screen (CUS-053); until then `MockScenarios.set` is called from code/tests. No visible screen changed → no simulator UI check. Dev builds now serve fixtures by default (`DEV_DATA_SOURCE=mock`); CUS-060 flips dev to `remote` once the dev API exists.

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
