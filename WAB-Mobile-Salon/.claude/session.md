# WAB-Mobile-Salon — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next merchant`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Scaffolded (MER-001) with `KMP_TEMPLATE` from the customer app: all modules, design system + Liquid Glass, sample feature; rules copied in MER-003 (until then `WAB-Mobile-Customer/CLAUDE.md` applies).
- Will consume `/merchant/v1` (71 ops); 6 server gaps (SRV-129…134) block MER-042/043/049/050; MER-004 Firebase registrations = owner.
- Real-time booking requests: socket + FCM data message, Android overlay / iOS time-sensitive actions (MER-012, MER-028…030).

## Current task

### MER-013 — Theme, tokens and base kit
- Branch: `feat/mer-013-theme` (from `feat/mer-011-realtime-client`)
- Status: IN PROGRESS (batch 2)
- Acceptance criteria (Design Script §0–§1.1; customer CUS-018/020):
  - [x] Same theme and tokens as the customer app (light + dark, typography, spacing, radii, elevation, Liquid Glass) — from the template, no new colors
  - [x] Merchant identity: `AppWordmark` = "WAB" + gradient "Business / أعمال" pill (LTR in both languages) in `AppBrandHeader`; app names "WAB Business" / "WAB أعمال" (dev "… Dev" / "… تجريبي"), iOS display names "WAB Business (Dev)"
  - [x] Universal states (`AppStateContent`, shimmer), pagination (`AppPagedList`, `AppAdaptiveGrid`), pull-to-refresh, form kit (`AppPhoneField` + `AppCountryPicker`, `AppOtpInput`, `AppDropdownField`, `FormValidators`) present from the template
- Tests: design-system tests (`UniversalStatesTest`, `FormKitTest`, `ComponentLogicTest`, …); policy (localization AR/EN) ok
- Loops: 0/1
- Review: PENDING
- Notes: display name changed from "WAB Merchant" (MER-001) to the design's "WAB Business".

### MER-011 — Realtime client
- Branch: `feat/mer-011-realtime-client` (from `feat/mer-009-permissions`)
- Status: IN PROGRESS (batch 2)
- Acceptance criteria (PRD §3 real-time; BUSINESS_DOMAIN §7):
  - [x] Socket.IO client on namespace `/merchant` (template) + `FakeRealtimeClient`; connect while resumed and signed in, reconnect on foreground (`RealtimeConnectionEffect`)
  - [x] Event constants: `booking.requested`, `booking.updated`, `booking.assigned`, `permissions.updated`, `access.revoked`, `notifications.unread`; `bookingId` payload key restored
  - [x] Permission filter mirroring the rooms (`isVisibleTo` / `visibleTo`): requests need BOOKINGS_RESPOND, booking updates need a view permission, account events always pass
  - [x] Shell `RealtimeAccountEvents`: `permissions.updated` → `PermissionsSync.refresh()`, `access.revoked` → sign-out + "Your access was removed by the salon owner" banner (AR/EN)
- Tests: `RealtimeEventFilterTest` (3), `RealtimeAccountEventsTest`, realtime protocol/client/refresh tests, `MainViewModelTest`; realtime + composeApp tests + `assembleDevDebug` green
- Loops: 0/1
- Review: PENDING

### MER-009 — Permissions model
- Branch: `feat/mer-009-permissions` (from `feat/mer-008-session-store`)
- Status: IN PROGRESS (batch 2)
- Acceptance criteria (PRD §3, §6; BUSINESS_DOMAIN §6):
  - [x] `Permission` (15 grantable keys), `OwnerCapability` (TEAM_MANAGE, PAYOUT_DETAILS_MANAGE, SALON_DELETE_REQUEST), `PermissionSet` with `has` / `anyOf` / `allOf` / `can` (owner has all), `SessionState.permissionSet()`, `PermissionTemplates` (PRD §6.3)
  - [x] `PermissionGated` (hidden-not-disabled) + `LocalPermissions` provided by the shell from the session
  - [x] Re-fetch: `PermissionsSync` rotates through the shared single-flight refresher (`SessionRefresher` = the `TokenRefreshCoordinator` now in Koin; the merchant refresh returns the member), stores member + keys; refused session → sign-out; called on app start (Home refresh, push and socket triggers call the same `refresh()`)
- Tests: `PermissionsTest` (4), `PermissionsSyncTest` (3), `RefreshMemberTest` (2), coordinator `refreshNow` test, `MainViewModelTest` start re-fetch; domain/network/data/design-system/composeApp tests + `assembleDevDebug` green
- Loops: 0/1
- Review: PENDING
- Notes: duplicate `createHttpClient` expect/actuals removed (identical); `BaseHttpClient` registered in Koin.

### MER-008 — Secure local storage of PRD §5 keys via one SessionStore
- Branch: `feat/mer-008-session-store` (batch 2 start, from `feat/mer-007-mock-source`)
- Status: IN PROGRESS (batch 2)
- Acceptance criteria (PRD §5):
  - [x] `SessionStore` holds tokens (secure store only), `member_id`, `salon_id`, member first name, `member_role`, `permissions` cache, `salon_state`, `push_enabled`, `overlay_permission_prompted`; language/theme stay in `AppSettings`
  - [x] `SessionState.SignedIn(member: MemberProfile, permissions, salonState)`; `MemberRole` / `SalonState` enums with tolerant `fromCode`
  - [x] Sign-out drops tokens + identity, keeps push / overlay flags; `clearAll` empties everything; incomplete identity = guest
- Tests: `DataStoreSessionStoreTest` (6), `AppSettingsImplTokensTest`, shell analytics tests; storage/composeApp/realtime host tests green
- Loops: 0/1
- Review: PENDING

### MER-007 — Mock data source
- Branch: `feat/mer-007-mock-source` (from `feat/mer-006-api-sync`)
- Status: DONE (batch 1 PR)
- Acceptance criteria (backlog MER-007; INTEGRATION.md §4):
  - [x] `DATA_SOURCE=mock|remote` (template); mock engine serves feature fixtures first, then one generated fixture per contract operation (`contractFixtures()`, 71 operations)
  - [x] Scenario switcher API: `MockScenarios` (transport scenario, salon state override, signed-in member override, `reset()`); UI entry lands with More (MER-048)
  - [x] Every salon state (`MockSalonState`: APPLICATION_PENDING / REJECTED, APPROVED_INCOMPLETE, LIVE, OFFLINE) and permission set (`MockPresets`: owner = all 15 keys, manager, employee, none) patched into any response (`patchFixture`: salon `state`, member `role` / `permissions`)
- Tests: `MockWorldTest` (5), `MockTransportTest`; `:core:data:testAndroidHostTest` green
- Loops: 1/1 — batch-1 run: policy `all: ok` (empty baseline), 78 policy-script tests, `testAndroidHostTest` (all modules) + `assembleDevDebug` green; per-task checks above (detekt clean in MER-003)
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch-1 code read: config/tooling and core plumbing only, no screens; contract + error catalog from the server spec; mock world covers every salon state and permission set.

### MER-006 — Contract tooling
- Branch: `feat/mer-006-api-sync` (from `feat/mer-005-network-kernel`)
- Status: DONE (batch 1 PR)
- Acceptance criteria (backlog MER-006; same generator as CUS-009):
  - [x] `python3 scripts/api_sync.py` / `./gradlew apiSync` generates DTOs + `MerchantOperations` (71 operations) + fixtures + snapshot from `../WAB-Server/docs/api/openapi.merchant.json` into `core/data/.../contract/generated`
  - [x] Stale check: `api_sync.py --check` (`./gradlew apiSyncCheck`) in the gate (always on now; the spec is in the monorepo)
  - [x] Operation registry helper `Operation.pathWith` (from the customer app) for repositories
- Tests: `OperationPathTest`, `test_api_sync.py`; core data/network/domain/design-system/notification host tests green; policy ok (error-codes now also checks the snapshot)
- Loops: 1/1 — batch-1 run: policy `all: ok` (empty baseline), 78 policy-script tests, `testAndroidHostTest` (all modules) + `assembleDevDebug` green; per-task checks above (detekt clean in MER-003)
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch-1 code read: config/tooling and core plumbing only, no screens; contract + error catalog from the server spec; mock world covers every salon state and permission set.

### MER-005 — Network kernel reused
- Branch: `feat/mer-005-network-kernel` (from `feat/mer-003-rules-gates`)
- Status: DONE (batch 1 PR)
- Acceptance criteria (backlog MER-005; same as CUS-006/007, merchant token scope):
  - [x] Ktor per environment (`ApiConfig` from `AppEnvironment`), `Accept-Language` on every request, base envelope + `safeApiCall` (from the template)
  - [x] Refresh interceptor on `POST /merchant/v1/auth/refresh` (request `refreshToken`, rotating pair in `data`; matches `openapi.merchant.json`)
  - [x] Error-code catalog = the 43 codes of BUSINESS_DOMAIN §11 / `openapi.merchant.json` + `UNKNOWN`, AR + EN `error_code_*`, handling actions; the error policy reads the root BUSINESS_DOMAIN (local generic copy removed)
- Tests: `AuthEndpointsTest`, `ErrorCodeTest`, `ErrorTextTest`, existing `SafeApiCallTest` / `AuthRefreshInterceptorTest` / `TokenRefreshCoordinatorTest`; policy `all: ok`
- Loops: 1/1 — batch-1 run: policy `all: ok` (empty baseline), 78 policy-script tests, `testAndroidHostTest` (all modules) + `assembleDevDebug` green; per-task checks above (detekt clean in MER-003)
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch-1 code read: config/tooling and core plumbing only, no screens; contract + error catalog from the server spec; mock world covers every salon state and permission set.

### MER-003 — Project rules and quality gates
- Branch: `feat/mer-003-rules-gates` (from `feat/mer-002-variants-ci`)
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
- Branch: `feat/mer-002-variants-ci` (batch 1 start, from `origin/merchant`)
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
