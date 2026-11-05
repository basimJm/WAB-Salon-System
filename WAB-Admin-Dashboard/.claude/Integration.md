# WAB-Admin-Dashboard — Integration (what this project consumes)

> Read when a task touches the API, realtime or the mock. Cross-project map: root `INTEGRATION.md`. Updated 2026-11-04.

## Consumes

| Dependency                                           | Contract                                                                                                                                                 | How                                                                                                                                                                     | State                                                                                                                      |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Server `/admin/v1` (contract 1.16.0, 164 operations) | `WAB-Server/docs/api/openapi.admin.json` → `contract/openapi.admin.json` + `src/data/contract/generated/{dto,operations}.ts`                             | `npm run api:sync`; repositories call `container.api` with `defineEndpoint(OPERATIONS.x, schemas)`; `docs/API_CONSUMED.md` via `npm run docs:api` (checked by `verify`) | State per operation in `docs/API_CONSUMED.md` (generated: 92 implemented, 72 planned or exempt); DTO drift fails the build |
| Server Socket.IO `/admin`                            | BUSINESS_DOMAIN §7 events → `constants/realtime.ts` (event → query invalidations)                                                                        | `container.realtime` (`SocketIoRealtimeClient` remote, `FakeRealtimeClient` mock); `useRealtime(event, handler)`                                                        | Done on both sides: all 6 events (SRV-124, ADM-079)                                                                        |
| Auth                                                 | login `{otpRequired, expiresAt, resendAfterSeconds}` → verify-otp `{email, code}` → refresh / logout (no `me`, no resend endpoint: resend = login again) | `container.sessionManager` (single-flight refresh, idle sign-out 2 days, session kept in the tab's `sessionStorage`)                                                    | done (ADM-025/030)                                                                                                         |
| Uploads                                              | presign → PUT → confirm                                                                                                                                  | `repositories.uploads.upload(purpose, file, onProgress)`                                                                                                                | done (ADM-037)                                                                                                             |
| Mock                                                 | fixtures per operation (`data/mock/fixtures.ts`) served through the real HTTP client; scenarios                                                          | `VITE_DATA_SOURCE=mock` (dev builds only; prod compiles it out)                                                                                                         | done (ADM-026/078)                                                                                                         |

## Environment (public values only; keys in `.env.example`)

`VITE_API_BASE_URL`, `VITE_SOCKET_URL` (https required in prod), `VITE_DATA_SOURCE=mock|remote`, build variants `<dev|prod>-<debug|release>`.

## Waiting on

- Hosted dev API is live on Render (`https://wab-server-dev.onrender.com`, ADM-079 done); its `CORS_ALLOWED_ORIGINS` must list the panel origin (`docs/SERVER_ISSUES.md` S10).
- Server gaps SRV-162…168 → ADM-100…106 (BLOCKED, flip to TODO through `tasks.py`).
- Dropped by the owner 2026-10-19 (stay PENDING): ADM-074…077 with SRV-110, SRV-127 (no BigQuery; the pages show their empty state).
- Hosting/domain/CI/error tracking (owner) → ADM-002/005/082/083. ADM-080 e2e only on request.

## Gate

`sh scripts/gate.sh` (verify, four variant builds, `check:size`) + browser UI check before every commit (`.claude/rules.md` §6); e2e only on request (owner decision 2026-10-14). Merge own PR into `admin` after the gate.
