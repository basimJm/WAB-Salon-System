# WAB-Mobile-Salon — Integration (what this app consumes)

> Read when a task touches the API, Firebase, realtime, push or the mock. Cross-project map: root `INTEGRATION.md`. Updated 2026-11-04.

## Consumes
| Dependency | Contract | How | State |
|---|---|---|---|
| Server `/merchant/v1` (contract 1.13.0, 106 operations) | `WAB-Server/docs/api/openapi.merchant.json` | DTOs by `./gradlew apiSync`; envelope + error catalog; permission errors hide features | done; every remaining row is owner-gated (`tasks.py blocked`) |
| Branches: `/merchant/v1/branches…` + `?branchId=` filters | BUSINESS_DOMAIN §5.16–§5.18, §6 | core `branch/`, `feature/branches`, `AppBranchSwitcher` | done; `branchId` on the member profile |
| Business types, new bookings, closing: `PATCH /salon/audience`, `GET /customers/lookup`, `POST /bookings`, `?tab=TO_CLOSE` | BUSINESS_DOMAIN §5.19–§5.21, §5.23 | `core/.../salon/BusinessKind`, `feature/bookings` | done |
| Server Socket.IO (namespace `/merchant`; branch and member rooms) | BUSINESS_DOMAIN §7: `booking.requested`, booking changes, unread count, `permissions.updated` | `RealtimeClient` + fake | done |
| Server phone OTP (server generates, ARQAM OTP delivers over WhatsApp; BUSINESS_DOMAIN §3.1a) | `POST /auth/otp/request` → `POST /auth/otp/verify` → single-use `otpToken` for login, application, change phone, bank details | `feature/auth` OTP screen; verify is a public request (no token refresh on its 401) | done |
| Firebase (push, analytics, crash reporting only) | FCM (high-priority data messages; Android full-screen intent; iOS time-sensitive + actionable categories `BOOKING_REQUEST`, `BOOKING_CLOSE`), Analytics, Crashlytics | `core/firebase`; **merchant apps not yet registered** in the Firebase projects (MER-004, owner) | pending owner |
| Uploads (Cloudflare R2, presigned) | `/uploads/presign|confirm`, `/uploads/license/presign|confirm`; purposes include `MEDICAL_LICENSE`, `BOOKING_REFERENCE` | `UploadsRepository`, `UploadFileUseCase` | done |
| Maps | map picker + reverse geocoding | `MapProvider`; key from config | done |
| Customer app | deep link `<merchant-domain>/register` from the customer app's register entry (CUS-056) | `MerchantDeepLinks` | domain = owner |
| Mock | contract fixtures, every business state and permission set | `DATA_SOURCE=mock|remote`; dev builds are `remote` (hosted dev API on Render) | done |

## Environment
Same scheme as the customer app (`DEV_API_BASE_URL` / `PROD_API_BASE_URL`, xcconfig per env), plus socket URL, maps key (secret, local/CI only), store links and deep-link domain as config keys.

## Waiting on
- Owner: merchant Firebase registrations (MER-004 → MER-012/055/056), platform domain and production API URL, store accounts (MER-059/060). Dev merchant maintenance is ON at the owner's choice.

## Gate
`scripts/ci/run_local_checks.sh` + `.github/workflows/merchant-ci.yml`.
