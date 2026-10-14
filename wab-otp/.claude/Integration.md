# wab-otp — Integration (technical implementation document)

> Single source of truth for **how this package is built and how any project uses it**. Updated after every commit/push that changes the implementation (Rules.md §14). Status legend: ✅ done · 🚧 in progress · ⬜ not started.

| Field | Value |
|---|---|
| Package | `wab-otp` |
| Type | Node.js package (TypeScript, npm), server only |
| BRD | `docs/WAB_Package_OTP_BRD.md` |
| Version | 0.0.0 (design only — no code yet) |
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
  precheck(i:{phone:string; purpose:OtpPurpose; deviceId?:string; ip?:string}): Promise<{allowed:boolean; otpLength:number; resendAfterSeconds:number; blockedUntil?:Date}>;
  verify(i:{proof:string; expectedPhone:string; purpose:OtpPurpose}): Promise<{outcome:"VERIFIED"; phone:string} | {outcome:"INVALID_PROOF"|"PHONE_MISMATCH"|"EXPIRED"|"PURPOSE_MISMATCH"|"BLOCKED"}>;
  reportFailure(i:{phone:string; purpose:OtpPurpose; reason:"WRONG_CODE"|"EXPIRED"|"PROVIDER_ERROR"}): Promise<{blocked:boolean; attemptsRemaining:number; blockedUntil?:Date}>;
  getConfig(): {otpLength:number; resendAfterSeconds:number};
}
createOtpService(options): OtpProvider
```

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

Rules: values come from the consumer (options/env), defaults live in `constants/`, prod refuses the fake adapter and missing secrets (`ConfigError` naming the key only).

## 5. Status and result mapping (every vendor status handled)
| Vendor result | Normalized |
|---|---|
| valid token, phone == expected | `VERIFIED` |
| bad signature / wrong project / malformed | `INVALID_PROOF` |
| `auth/id-token-expired` | `EXPIRED` |
| phone differs | `PHONE_MISMATCH` |
| purpose differs | `PURPOSE_MISMATCH` |
| blocked by limiter | `BLOCKED` |
| Firebase 5xx / network / quota | throws `OtpProviderError` (retryable) — never an outcome |

Unknown vendor value → `UNKNOWN` + raw response logged (redacted), never success.

## 6. Error model
All failures extend `OtpError` with `code`, `retryable`, `cause`, `details` (no secrets).
| Code | When | Retryable |
|---|---|---|
| `OTP_PROVIDER_UNAVAILABLE` | Firebase down/timeout/quota | yes |
| `OTP_CONFIG_INVALID` | missing project/credentials in prod | no |
| `OTP_STORE_UNAVAILABLE` | limiter store down | yes |
| `OTP_INPUT_INVALID` | phone not E.164 / empty proof | no |
Common codes for every package: `CONFIG_INVALID`, `VALIDATION_FAILED`, `AUTH_FAILED`, `NETWORK_ERROR`, `TIMEOUT`, `RATE_LIMITED`, `VENDOR_ERROR`, `MALFORMED_RESPONSE`, `UNKNOWN`.

## 7. Environments
- **dev (localhost):** `provider: fake` (deterministic proofs) or Firebase Auth emulator on localhost; `memory-store` limiter; no credentials.
- **prod:** `provider: firebase` with injected service account; `redis-store` limiter; fake refused.

## 8. Performance notes
Initialize the Firebase app once and reuse; cache Google public keys (library default); limiter uses one atomic Redis script per call; no I/O in `getConfig`.

## 9. Testing
- Unit tests: one test file per source file, every exported function: success, each error code, each status mapping, boundaries, idempotent replay. Vendor SDK/HTTP mocked. Coverage gate: 100 % functions, >= 95 % lines/branches.
- Loop test (`npm run test:loop`): 1 000 iterations of precheck → verify → reportFailure across 50 phones with concurrency 20; asserts block after exactly the configured count, no counter leaks, stable memory.
- Consumer smoke test: install the built tarball into a temp project and call the factory.

## 10. Adoption guide (any project)
```ts
const otp = createOtpService({ environment: "dev", provider: "fake", limits: { /* from settings */ } });
const r = await otp.verify({ proof, expectedPhone: "+9627XXXXXXXX", purpose: "LOGIN" });
```
How WAB-Server adopts it: replace `WAB-Server/src/providers/otp` real mode (`*_PROVIDER=real`) with this package; the interface is already compatible (see §3).

## 11. Open questions / assumed-missing requirements
- Per device/IP limit key design (OTP-04 SHOULD): needs device id source from apps.
- Server-verified provider (code storage, hashing, SMS vendor) — vendor not chosen.
- Purpose binding cannot be enforced by Firebase tokens; enforced by backend session/state.
- Event schema for analytics (sent/verified/failed/blocked) must match `wab-analytics`.
- Firebase emulator availability in CI.

## 12. Implementation status
| Item | Status |
|---|---|
| Project scaffold (tsconfig strict, eslint, prettier, jest, build, scripts) | ⬜ |
| Shared kernel (errors, config, http/retry, logger) | ⬜ |
| Adapter: fake — in-memory, deterministic proofs for dev/tests | ⬜ |
| Adapter: firebase — Firebase Admin `verifyIdToken` → verified phone | ⬜ |
| Adapter: memory-store — LimitStore for dev/tests | ⬜ |
| Adapter: redis-store — LimitStore for prod (atomic Lua counters, TTL) | ⬜ |
| Adapter: sms-server-verified — FUTURE: server sends + checks code | ⬜ |
| Unit tests + coverage gate | ⬜ |
| Loop test | ⬜ |
| README + consumer smoke test | ⬜ |

## 13. Changelog
| Date | Version | Change |
|---|---|---|
| 2026-10-14 | 0.0.0 | Design document created from the BRD; no code yet. |
