# wab-otp

Provider-independent phone OTP verification and abuse limits for WAB projects (Node >= 22, TypeScript, ESM + CJS).

Phase 1 provider: **Firebase Phone Auth**. The app sends and confirms the SMS code with Firebase; the server verifies the resulting **ID token** (RS256 signature, issuer, audience, expiry, freshness, `phone` provider, phone match). Another provider (Twilio Verify, a local SMS vendor) is one more adapter behind the same interface.

## Quick start

```ts
import { createOtpService } from 'wab-otp';

const otp = createOtpService({
  environment: 'prod', // 'dev' | 'prod'
  provider: 'firebase', // 'fake' | 'firebase' | 'custom'
  firebase: { projectId: process.env.FIREBASE_PROJECT_ID! },
  store: new RedisLimitStore(redis), // shared store, required in prod
  limits: { requestMax: 5, requestWindowSec: 300, wrongMax: 5, blockSec: 900 }, // from your settings
});

await otp.precheck({ phone, purpose: 'LOGIN' }); // { allowed, otpLength, resendAfterSeconds, blockedUntil? }
const result = await otp.verify({ proof: firebaseIdToken, expectedPhone: phone, purpose: 'LOGIN' });
// { outcome: 'VERIFIED', phone } | { outcome: 'INVALID_PROOF' | 'PHONE_MISMATCH' | 'EXPIRED' | 'BLOCKED' }
await otp.reportFailure({ phone, purpose: 'LOGIN', reason: 'WRONG_CODE' }); // { blocked, attemptsRemaining, blockedUntil? }
```

Only verification, no limits (when your backend owns the limits): `createOtpVerifier(options).verify(...)`.

A provider outage (Firebase keys unreachable, store down) **throws** an `OtpError` (`code`, `retryable`, `cause`); it is never an outcome.

## Environments

|                  | dev                                                              | prod                                                          |
| ---------------- | ---------------------------------------------------------------- | ------------------------------------------------------------- |
| provider         | `fake` (deterministic proofs) or `firebase` + `authEmulatorHost` | `firebase` (or `custom`); `fake` and the emulator are refused |
| limit store      | `MemoryLimitStore` by default                                    | injected shared store (`RedisLimitStore`)                     |
| Firebase project | dev project id (a different project from prod)                   | prod project id                                               |
| key endpoint     | any URL                                                          | https only                                                    |

Local development without credentials: `fakeProof(phone)` for the fake provider, or run the Firebase Auth emulator and set `firebase.authEmulatorHost` (`createEmulatorToken` builds emulator-shaped tokens for tests).

Behind a proxy: pass `firebase.fetch` (any `fetch`-compatible function with an agent).

## Develop

`npm run verify` runs typecheck, lint, format, unit tests with the coverage gate (100 % functions, 95 % lines/branches), build, a packaged-tarball smoke test (CJS + ESM) and the loop test. Redis tests use a real `redis-server` on localhost (or `REDIS_TEST_URL`).

Technical document: `.claude/Integration.md`.
