# WAB-Mobile-Customer — Integration (what this app consumes)

> Read when a task touches the API, Firebase, payments, realtime or the mock. Cross-project map: root `INTEGRATION.md`. Data and rules: `BUSINESS_DOMAIN.md`. Updated 2026-11-04.

## Consumes
| Dependency | Contract | How (task) | State |
|---|---|---|---|
| Server `/customer/v1` (contract 1.13.0, 52 operations) | `WAB-Server/docs/api/openapi.customer.json` | DTOs generated into `core/data/.../contract/generated` by `./gradlew apiSync` with `apiSyncCheck` in the gate (CUS-009); repositories per feature; envelope + error catalog AR/EN (CUS-006) | in use; dev builds run `remote` against the hosted dev API (CUS-060) |
| Server Socket.IO (customer room) | BUSINESS_DOMAIN §7: booking changes, unread count; `wss://<api host>/socket.io/` namespace `/customer`, `auth.token` | `core/realtime`: `RealtimeClient` + Socket.IO v4 client over Ktor WebSockets + `FakeRealtimeClient` (CUS-013); features consume `events` (CUS-052) | done; verified on the local stack (`docs/REMOTE_DEV_GAPS.md` #6) |
| Phone OTP (WhatsApp) | `POST /auth/otp/request` (server generates the code, ARQAM OTP delivers it on WhatsApp) → `POST /auth/otp/verify` → single-use `otpToken` for login / register / change phone / booking confirmation (BUSINESS_DOMAIN §3.1a) | `feature/auth` `OtpViewModel` + `VerifyOtpUseCase`, errors via `otpFailureOf` (CUS-089) | done; no Firebase Phone Auth, no SMS fallback; device test CUS-061 waits on SRV-159 |
| Firebase | FCM, Analytics, Crashlytics only (no Auth, no App Check) | facades in `core/firebase` with fakes (CUS-004); dev `wab-dev-397ab`, prod `wab-prod-9c58f` (`google-services.json`, `GoogleService-Info.plist` tracked, do not edit without the owner). No BigQuery | registered; push end to end CUS-063 waits on the owner |
| `wab-payments` KMP | `PaymentLauncher` port (open checkout for a server-created session, return a result the server verifies) | library exists (PAY-011, PAY-015); the app does not include it yet (CUS-047, CUS-062) | **paused**: no gateway chosen; the app offers pay on arrival only (`DraftCoordinator.ENABLED_METHODS`) |
| Uploads | `POST /uploads/presign` → PUT → `POST /uploads/confirm`, then `PUT /profile/avatar` (`CUSTOMER_AVATAR`) or draft `persons[].referenceImageKey` (`BOOKING_REFERENCE`, tattoo design image, private) | `core/domain/upload` + `core/data/upload` (CUS-053, CUS-104); storage is Cloudflare R2 | done |
| Mock | captured real envelopes per operation (`core/data/fixtures/remote`) behind the repository interfaces, scenario switcher | `DATA_SOURCE=mock\|remote` build config (CUS-010); prod refuses `mock` | done; dev builds use `remote` |

## Environment (config, never literals)
Android `gradle.properties` `DEV_API_BASE_URL` / `PROD_API_BASE_URL` (override in `local.properties`), iOS `iosApp/Configuration/{Dev,Prod}.xcconfig`; the hosted dev API is on Render (`wab-server-dev.onrender.com`); the socket derives from the API host (server serves `/socket.io` on the same HTTP server); deep-link host and merchant store/deep link are config keys (CUS-056, CUS-057). Maps/signing secrets in `local.properties` / CI secrets.

## Waiting on
- ARQAM setup (SRV-159, owner) → CUS-061 real OTP on devices.
- APNs key + real iOS dev plist (owner) → CUS-063 push end to end.
- Payment gateway choice (owner) + SRV-092 → CUS-047, CUS-062.
- Platform domain and production hosting (owner) → prod hosts and deep links (`docs/REMOTE_DEV_GAPS.md` #16); store accounts → CUS-066, CUS-067.

## Gate
`scripts/ci/run_local_checks.sh` (policy, contract, detekt, unit tests, Android variants + lint, iOS configurations) + CI `customer-ci.yml` (Android dev/prod × debug/release, iOS schemes). Android SDK downloads are blocked in the cloud sandbox: CI is the compiler there.
