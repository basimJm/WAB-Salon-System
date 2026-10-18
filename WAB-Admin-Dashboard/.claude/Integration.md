# WAB-Admin-Dashboard — Integration (what this project consumes)

> Read when a task touches the API, realtime or the mock. Cross-project map: root `INTEGRATION.md`. Updated 2026-10-18.

## Consumes
| Dependency | Contract | How | State |
|---|---|---|---|
| Server `/admin/v1` (116 operations) | `WAB-Server/docs/api/openapi.admin.json` → `contract/openapi.admin.json` + `src/data/contract/generated/{dto,operations}.ts` | `npm run api:sync`; repositories call `container.api` with `defineEndpoint(OPERATIONS.x, schemas)`; `docs/API_CONSUMED.md` via `npm run docs:api` (checked by `verify`) | All 116 consumed (ADM-030…067); DTO drift fails the build |
| Server Socket.IO `/admin` | BUSINESS_DOMAIN §7 events → `constants/realtime.ts` (event → query invalidations) | `container.realtime` (`SocketIoRealtimeClient` remote, `FakeRealtimeClient` mock); `useRealtime(event, handler)` | Client done; server emits 2 of 6 events (SRV-124) |
| Auth | login `{otpRequired, expiresAt, resendAfterSeconds}` → verify-otp `{email, code}` → refresh / logout (no `me`, no resend endpoint: resend = login again) | `container.sessionManager` (single-flight refresh, idle timeout 30 min) | done (ADM-025/030) |
| Uploads | presign → PUT → confirm | `repositories.uploads.upload(purpose, file, onProgress)` | done (ADM-037) |
| Mock | fixtures per operation (`data/mock/fixtures.ts`) served through the real HTTP client; scenarios | `VITE_DATA_SOURCE=mock` (dev builds only; prod compiles it out) | done (ADM-026/078) |

## Environment (public values only; keys in `.env.example`)
`VITE_API_BASE_URL`, `VITE_SOCKET_URL` (https required in prod), `VITE_DATA_SOURCE=mock|remote`, build variants `<dev|prod>-<debug|release>`.

## Waiting on
- Dev API URL (SRV-011, owner) → ADM-079 remote switch and per-module gap list.
- Server gaps G1–G11 → SRV-117…127 (Stage N) → ADM-068…077 flip to TODO automatically (`tasks.py`).
- Hosting/domain/CSP/error tracking (owner) → ADM-002/005/006/082/083.

## Gate
`sh scripts/gate.sh` (verify, four variant builds, `check:size`) + browser UI check before every commit (`.claude/rules.md` §6); e2e only on request (owner decision 2026-10-14). Merge own PR into `admin` after the gate.
