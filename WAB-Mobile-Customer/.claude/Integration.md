# WAB-Mobile-Customer — Integration (what this app consumes)

> Read when a task touches the API, Firebase, payments, realtime or the mock. Cross-project map: root `INTEGRATION.md`. Updated 2026-10-18.

## Consumes
| Dependency | Contract | How (planned task) | State |
|---|---|---|---|
| Server `/customer/v1` (51 operations) | `WAB-Server/docs/api/openapi.customer.json` | DTOs generated into `core/network/contract` by `./gradlew apiSync` with a stale-check test (CUS-009); repositories per feature; envelope + error catalog AR/EN (CUS-006) | contract complete for PRD §13; no client code yet |
| Server Socket.IO (customer room) | BUSINESS_DOMAIN §7: booking changes, unread count; `wss://<api host>/socket.io/` namespace `/customer`, `auth.token` | `core/realtime`: `RealtimeClient` + Socket.IO v4 client over Ktor WebSockets + `FakeRealtimeClient` (CUS-013); features consume `events` (CUS-052) | client done (CUS-013); server SRV-080/081 |
| Firebase | Phone Auth (OTP SMS), FCM, Analytics, Crashlytics | facades in `core` with fakes (CUS-004); app registered in dev `wab-dev-397ab` and prod `wab-prod-9c58f` (`google-services.json`, `GoogleService-Info.plist` tracked, do not edit without the owner) | registered; facade pending |
| `wab-payments` KMP | `PaymentLauncher` port (open checkout for a server-created session, return a result the server verifies) | in-repo module first (PAY-010/011), Maven artifact later (PAY-015) | not started |
| Uploads (avatar) | `POST /uploads/presign` → PUT → `POST /uploads/confirm` → `PUT /profile/avatar` | CUS-053 | — |
| Mock | fixtures per operation behind the repository interfaces, scenario switcher | `DATA_SOURCE=mock|remote` build config (CUS-010); prod forces remote | — |

## Environment (config, never literals)
Android `gradle.properties` `DEV_API_BASE_URL` / `PROD_API_BASE_URL` (override in `local.properties`), iOS `iosApp/Configuration/{Dev,Prod}.xcconfig`; the socket derives from the API host (server serves `/socket.io` on the same HTTP server); deep-link domain and merchant store/deep link added by CUS-056/057 as config keys. Maps/signing secrets in `local.properties` / CI secrets.

## Waiting on
- Dev API (SRV-011, owner) → CUS-060 remote switch, CUS-061 real OTP (+ SRV-034), CUS-063 push e2e.
- `wab-payments` KMP (PAY-011 mock launcher → CUS-047; PAY-015 + SRV-092 → CUS-062).
- Platform domain (owner) → deep links CUS-057 (config only).

## Gate
`scripts/ci/run_local_checks.sh` (policy, detekt, unit tests) + CI `customer-ci.yml` (Android dev/prod × debug/release, iOS schemes). Android SDK downloads are blocked in the cloud sandbox: CI is the compiler there.
