# wab-otp — Integration (technical implementation document)

> Single source of truth for **how this package is built and how any project uses it**. Updated after every commit/push that changes the implementation (Rules.md §14). Status legend: ✅ done · 🚧 in progress · ⬜ not started.

| Field | Value |
|---|---|
| Package | `wab-otp` |
| Type | Node.js package (TypeScript, npm), server only |
| BRD | `docs/WAB_Package_OTP_BRD.md` |
| Version | 0.1.0 (implemented; publish prepared, owner runs `npm publish`) |
| Node | >= 22, TypeScript strict, ESM + CJS builds |
| Server counterpart in WAB | `WAB-Server/src/providers/otp` (interface already in WAB-Server, fake only today) |

## 1. Purpose and boundaries
Confirms that a user controls a phone number before sensitive actions (login, register, change phone, booking confirmation, bank details) and enforces platform OTP abuse limits. Phase 1 provider: Firebase ID-token verification (signature, expiry, project, phone). A future server-verified provider (send code + check code) plugs in as another adapter.

**Not in this package:** Issuing JWT/refresh tokens (backend auth), admin e-mail 2FA (wab-notifications), UI.

## 2. Architecture
Ports and adapters:
```
consumer ──> createOtpService(options) ──> OtpProvider (port, stable interface)
                                       ├── adapters/fake   (dev: local/fake)
                                       ├── adapters/firebase
                                       ├── adapters/memory-store
                                       ├── adapters/redis-store
                                       ├── adapters/sms-server-verified
```
- The factory picks the adapter from `options.provider` (+ `options.environment`). Unknown provider → `ConfigError`.
- Adapters never leak vendor types through the port; vendor responses are normalized (§5).
- Shared kernel: `errors/`, `config/` (zod-validated options), `http/` (timeouts, retry with backoff + jitter), `logger` (injected, redacting), `events` (optional hook for analytics).

## 3. Public API (port)
```ts
interface OtpProvider {
  precheck(i:{phone; purpose; deviceId?; ip?}): Promise<{allowed; otpLength; resendAfterSeconds; blockedUntil?: Date}>;
  verify(i:{proof; expectedPhone; purpose}): Promise<{outcome:"VERIFIED"; phone} | {outcome:"INVALID_PROOF"|"PHONE_MISMATCH"|"EXPIRED"|"PURPOSE_MISMATCH"|"BLOCKED"}>;
  reportFailure(i:{phone; purpose; reason:"WRONG_CODE"|"EXPIRED"|"PROVIDER_ERROR"}): Promise<{blocked; attemptsRemaining; blockedUntil?: Date}>;
  resetLimits(phone): Promise<void>;           // admin unblock; a VERIFIED outcome resets by itself
  getConfig(): {otpLength; resendAfterSeconds};  // no I/O
  close(): Promise<void>;
}
createOtpService(options): OtpProvider      // verification + limits
createOtpVerifier(options): ProofVerifier   // verification only (WAB-Server uses this one: it owns the limits, SRV-027)
```
Ports: `ProofVerifier` (any vendor), `LimitStore` (`MemoryLimitStore`, `RedisLimitStore`). `purpose` is any UPPER_SNAKE name (the six platform purposes are in `OTP_PURPOSES`).

## 4. Configuration
| Option / env key | Dev | Prod | Notes |
|---|---|---|---|
| `provider` | `fake` or `firebase` | `firebase` | adapter selector |
| `environment` | `dev` | `prod` | prod refuses `fake` |
| `firebase.projectId` | optional | required | no hardcoding |
| `firebase.credentials` (service account, injected) | emulator host instead | required (secret) | never logged |
| `firebase.authEmulatorHost` | `localhost:9099` (consumer-supplied) | forbidden | dev only |
| `limits.requestMax/requestWindowSec/blockSec` | 5/300/900 | same (admin-settable) | |
| `limits.wrongMax/blockSec` | 5/900 | same | |
| `resendAfterSec`, `otpLength` | 60 / 6 | same | otpLength must match provider |
| `store` | memory | redis (injected client) | atomic ops |

Also: `firebase.jwksUrl` (https in prod), `firebase.timeoutMs` (5000), `firebase.clockSkewSec` (30), `firebase.maxAuthAgeSec` (600), `firebase.fetch` (proxy / tests), `retry` (3 attempts, capped backoff + jitter), `keyPrefix`, `logger` (always wrapped by the redactor), `onEvent`, `now`.

Rules: values come from the consumer (options/env), defaults live in `constants/`, prod refuses the fake adapter and missing secrets (`ConfigError` naming the key only).

## 5. Status and result mapping (every vendor status handled)
| Vendor result | Normalized |
|---|---|
| valid token, phone == expected | `VERIFIED` |
| bad signature, unknown `kid`, alg != RS256 (incl. `none`), wrong issuer/audience, missing `sub`/`iat`/`exp`/`auth_time`, provider != `phone`, non-E.164 phone, malformed token | `INVALID_PROOF` |
| token expired (beyond clock skew) or sign-in older than `maxAuthAgeSec` | `EXPIRED` |
| phone differs | `PHONE_MISMATCH` |
| blocked by limiter (service only) | `BLOCKED` |
| key endpoint 5xx / 408 / network / timeout / 429 | throws `OtpError` (retryable, retried with backoff first; stale keys served up to 24 h) |
| key endpoint 401/403 | throws `OTP_AUTH_FAILED` (not retried) |
| key endpoint other 4xx / bad JSON / bad key shape | throws `OTP_PROVIDER_UNAVAILABLE` (not retried) / `OTP_MALFORMED_RESPONSE` |
| custom adapter returns an unknown outcome, or VERIFIED without a phone | throws `OTP_MALFORMED_RESPONSE` (never success) |
| custom adapter says VERIFIED for a different phone | downgraded to `PHONE_MISMATCH` |
| custom adapter throws a non-`OtpError` | `OTP_UNKNOWN` with the cause |
`PURPOSE_MISMATCH` is reserved for adapters that can bind a purpose (Firebase tokens cannot).

## 6. Error model
All failures extend `OtpError` with `code`, `retryable`, `cause`, `details` (no secrets).
| Code | When | Retryable |
|---|---|---|
| `OTP_PROVIDER_UNAVAILABLE` | Firebase down/timeout/quota | yes |
| `OTP_CONFIG_INVALID` | missing project/credentials in prod | no |
| `OTP_STORE_UNAVAILABLE` | limiter store down | yes |
| `OTP_INPUT_INVALID` | phone not E.164 / empty or oversize proof / bad purpose | no |
| `OTP_AUTH_FAILED` | key endpoint 401/403 | no |
| `OTP_NETWORK_ERROR` / `OTP_TIMEOUT` / `OTP_RATE_LIMITED` | key endpoint unreachable / slow / 429 | yes |
| `OTP_MALFORMED_RESPONSE` | key endpoint or adapter answered nonsense | no |
| `OTP_UNKNOWN` | unexpected adapter failure | no |
Common codes for every package: `CONFIG_INVALID`, `VALIDATION_FAILED`, `AUTH_FAILED`, `NETWORK_ERROR`, `TIMEOUT`, `RATE_LIMITED`, `VENDOR_ERROR`, `MALFORMED_RESPONSE`, `UNKNOWN`.

## 7. Environments
- **dev (localhost):** `provider: fake` (deterministic proofs) or Firebase Auth emulator on localhost; `memory-store` limiter; no credentials.
- **prod:** `provider: firebase` with injected service account; `redis-store` limiter; fake refused.

## 8. Performance notes
Initialize the Firebase app once and reuse; cache Google public keys (library default); limiter uses one atomic Redis script per call; no I/O in `getConfig`.

## 9. Testing
- Unit tests: one test file per source file, every exported function: success, each error code, each status mapping, boundaries, idempotent replay. Vendor SDK/HTTP mocked. Coverage gate: 100 % functions, >= 95 % lines/branches.
- Loop test (`npm run test:loop`): 1 000 flows (50 phones x 20 rounds, 20 in flight) of precheck / wrong codes / verify with real RS256 tokens, on the memory store and on a real Redis; asserts the block starts after exactly the configured count, success resets, no key is left behind and the heap stays flat.
- Firebase tests use locally generated RSA keys and a stubbed key endpoint; the real Firebase endpoint has NOT been called from CI or this repo yet.
- Consumer smoke test: install the built tarball into a temp project and call the factory.

## 10. Adoption guide (any project)
```ts
const otp = createOtpService({ environment: "dev", provider: "fake", limits: { /* from settings */ } });
const r = await otp.verify({ proof, expectedPhone: "+9627XXXXXXXX", purpose: "LOGIN" });
```
How WAB-Server adopts it (done, SRV-034): `"@wab/otp": "file:../wab-otp"`, `src/providers/otp/real.ts` calls `createOtpVerifier({environment, provider: 'firebase', firebase: {projectId, authEmulatorHost?}, logger})` and maps outcomes / `OtpError`s to the server's `OtpProvider` + `ExternalServiceError`; env `OTP_PROVIDER=real`, `FIREBASE_PROJECT_ID` (dev `wab-dev-397ab`, prod `wab-prod-9c58f`), dev-only `FIREBASE_AUTH_EMULATOR_HOST`. No service account is needed: ID tokens are verified with Google's public keys.

Publishing (OTP-010, owner runs it): package `@wab/otp`, registry GitHub Packages (`publishConfig`), `npm publish` runs `prepublishOnly` = `npm run verify`; `npm run pack:check` lists the tarball (dist + README + CHANGELOG). Consumers then replace the `file:` dependency by the registry version (SRV-112).

## 11. Open questions / assumed-missing requirements
- Per device/IP limit key design (OTP-04 SHOULD): `deviceId`/`ip` are accepted by `precheck` but not limited yet; needs a device id source from the apps.
- `maxAuthAgeSec` default 600 s (freshness of the sign-in behind a proof) is an assumption; token single-use per purpose window (BRD risk "token replay") needs the backend to store used `jti`/`sub+auth_time` — not built.
- Server-verified provider (code storage, hashing, SMS vendor) — vendor not chosen (OTP-009 skeleton only).
- Purpose binding cannot be enforced by Firebase tokens; enforced by backend session/state.
- Event schema for analytics (`precheck`, `verify`, `failure`, `provider_error`) must match `wab-analytics`.
- Firebase emulator availability in CI; the emulator token shape comes from Firebase behaviour/docs, not a captured token.
- Real Firebase check is unverified: needs the dev project (`wab-dev-397ab`) and a real phone sign-in token.
- Redis Cluster: counter and block keys of a phone are not hash-tagged (single primary / managed Redis assumed).
- Phone numbers appear inside store keys (`otp:*:+9627…`), not in logs; confirm that is acceptable for Redis.

## 12. Implementation status
| Item | Status |
|---|---|
| Project scaffold (tsconfig strict, eslint, prettier, jest, build, scripts) | ✅ |
| Shared kernel (errors, config, http/retry, logger) | ✅ |
| Adapter: fake — in-memory, deterministic proofs for dev/tests | ✅ |
| Adapter: firebase — Firebase Admin `verifyIdToken` → verified phone | ✅ |
| Adapter: memory-store — LimitStore for dev/tests | ✅ |
| Adapter: redis-store — LimitStore for prod (atomic Lua counters, TTL) | ✅ |
| Adapter: sms-server-verified — FUTURE: server sends + checks code | 🚧 |
| Unit tests + coverage gate | ✅ |
| Loop test | ✅ |
| README + consumer smoke test | ✅ |

## 13. Changelog
| Date | Version | Change |
|---|---|---|
| 2026-10-14 | 0.0.0 | Design document created from the BRD; no code yet. |
| 2026-10-18 | 0.1.0 | OTP-001 scaffold (tooling, build, smoke, loop config). |
| 2026-10-18 | 0.1.0 | OTP-002 kernel: errors, zod options with prod rules, redacting logger, retry/timeout, ports. |
| 2026-10-18 | 0.1.0 | OTP-003 verifier: createOtpVerifier, fake adapter, memory store, input validation. |
| 2026-10-18 | 0.1.0 | OTP-004 limits engine + createOtpService (precheck/verify/reportFailure/getConfig). |
| 2026-10-18 | 0.1.0 | OTP-005 Redis LimitStore (Lua scripts, ioredis-shaped client). |
| 2026-10-18 | 0.1.0 | OTP-006 Firebase ID-token adapter on jose (JWK cache, rotation, stale keys, claim checks). |
| 2026-10-18 | 0.1.0 | OTP-007 Firebase Auth emulator mode (dev only) + createEmulatorToken. |
| 2026-10-18 | 0.1.0 | OTP-008 quality: loop test (memory + real Redis), richer package smoke, README, docs. |
| 2026-10-18 | 0.1.0 | OTP-009 server-verified SMS skeleton (fake vendor, HMAC code store). |
