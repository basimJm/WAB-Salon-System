# WAB-Mobile-Salon — Integration (what this app consumes)

> Read when a task touches the API, Firebase, realtime, push or the mock. Cross-project map: root `INTEGRATION.md`. Updated 2026-10-18. No code yet.

## Consumes
| Dependency | Contract | How (planned task) | State |
|---|---|---|---|
| Server `/merchant/v1` (71 operations) | `WAB-Server/docs/api/openapi.merchant.json` | DTOs by `./gradlew apiSync` (MER-006); envelope + error catalog (MER-005); permission middleware errors hide features (MER-009/052) | 6 gaps on the server: SRV-129 (member profile, change phone, push toggle), SRV-130 (dashboard), SRV-131 (reviews), SRV-132 (statistics), SRV-133 (leave / deletion request), SRV-134 (conflict preview) |
| Server `/merchant/v1/branches…` + `?branchId=` filters (Stage P) | `WAB-Server/.claude/Integration.md` "Salon branches contract" | MER-061…066 (core `branch/`, `feature/branches`) | owner management + switcher done; member `branchId` missing in the auth profile (server) |
| Server Socket.IO (salon rooms filtered by permission) | BUSINESS_DOMAIN §7: `booking.requested`, booking changes, unread count, `PERMISSIONS_UPDATED` | `RealtimeClient` + fake (MER-011) | — |
| Server phone OTP (WhatsApp, BUSINESS_DOMAIN §3.1a) | `POST /auth/otp/request` → `POST /auth/otp/verify` → single-use `otpToken` for login, application, change phone, bank details | `feature/auth` OTP screen (MER-070); verify is a public request (no token refresh on its 401) | done (contract 1.5.0) |
| Firebase | FCM (high-priority data messages; Android full-screen intent; iOS time-sensitive + actionable category), Analytics, Crashlytics | facade reused from the customer app (MER-010/012); **merchant apps not yet registered** in the Firebase projects (MER-004, owner) | pending owner |
| Uploads | `/uploads/presign|confirm`, `/uploads/license/presign|confirm` | MER-016, MER-022 | — |
| Maps | map picker + reverse geocoding | `MapProvider` interface + fake (MER-017); key from config | — |
| Customer app | deep link `<merchant-domain>/register` from "Register your salon" (CUS-056) | MER-053 | domain = owner |
| Mock | fixtures per operation, every salon state and permission set | `DATA_SOURCE=mock|remote` (MER-007) | — |

## Environment
Same scheme as the customer app (`DEV_API_BASE_URL` / `PROD_API_BASE_URL`, xcconfig per env), plus socket URL, maps key (secret, local/CI only), store links and deep-link domain as config keys.

## Waiting on
- Server Stage O (SRV-129…134) → MER-042/043/049/050; dev API (SRV-011) → MER-054…056; Firebase registrations (owner) → MER-004.

## Gate
Same as the customer app (`scripts/ci/run_local_checks.sh` + CI matrix), created in MER-002/003.
