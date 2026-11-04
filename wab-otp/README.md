# wab-otp

Provider-independent phone OTP for WAB projects (Node >= 22, TypeScript, ESM + CJS): server-generated codes delivered over **WhatsApp by ARQAM OTP** (our code as `otpCode`, one authentication template per language) or any other channel, a **signed single-use proof** (`otpToken`) after a correct code, and request / wrong-code limits.

Owner setup of the ARQAM side (project, sender, templates, TEST/LIVE keys): [`docs/ARQAM_SETUP.md`](docs/ARQAM_SETUP.md).

## Quick start

```ts
import { createArqamOtp, createOtpService, RedisCodeStore, RedisLimitStore } from '@wab/otp';

const codeStore = new RedisCodeStore(redis); // shared store, required in prod
const otp = createArqamOtp({
  environment: 'prod', // 'dev' | 'prod'
  store: codeStore,
  codeSecret: process.env.OTP_CODE_SECRET!, // >= 32 chars
  proofSecret: process.env.OTP_PROOF_SECRET!, // >= 32 chars, different
  codeLength: 6, // otp.length (ARQAM accepts 4-6 digits)
  codeTtlSec: 300, // otp.codeTtlSec
  proofTtlSec: 600, // otp.proofTtlSec
  arqam: {
    apiKey: process.env.ARQAM_API_KEY!, // TEST key in dev, LIVE key in prod
    templates: { ar: process.env.ARQAM_TEMPLATE_AR!, en: process.env.ARQAM_TEMPLATE_EN! },
    fallbackLanguage: 'ar',
    // senderId: only when ARQAM answers SENDER_REQUIRED
  },
});
const limits = createOtpService({
  environment: 'prod',
  provider: 'signed', // verifies otpToken
  proof: { secret: process.env.OTP_PROOF_SECRET!, store: codeStore },
  store: new RedisLimitStore(redis),
});

// 1. request: limits first, then send (ip only when the ARQAM project limits per IP)
const pre = await limits.precheck({ phone, purpose: 'LOGIN' }); // { allowed, otpLength, resendAfterSeconds, blockedUntil? }
if (pre.allowed) await otp.sendCode({ phone, purpose: 'LOGIN', language: 'ar', ip }); // { expiresInSec, messageId }

// 2. verify the typed code
const r = await otp.verifyCode({ phone, purpose: 'LOGIN', code });
// { outcome: 'VERIFIED', phone, otpToken, expiresInSec } | { outcome: 'INVALID_PROOF' | 'EXPIRED' }
if (r.outcome === 'INVALID_PROOF')
  await limits.reportFailure({ phone, purpose: 'LOGIN', reason: 'WRONG_CODE' });

// 3. any action that needs a verified phone
await limits.verify({ proof: otpToken, expectedPhone: phone, purpose: 'LOGIN' });
// { outcome: 'VERIFIED', phone } | INVALID_PROOF (bad / replayed) | EXPIRED | PHONE_MISMATCH | PURPOSE_MISMATCH | BLOCKED

// ops: account mode (LIVE/TEST) + balance; delivery history of one message
await otp.getAccount(); // { mode, balance, status }
await otp.getDeliveryStatus(messageId); // { state: SENT | DELIVERED | READ | FAILED | UNKNOWN, history }
```

Only proof verification (when your backend owns the limits): `createOtpVerifier({ environment, provider: 'signed', proof })`, or `otp.proofs.verify(...)`.

Failures **throw** `OtpError` (`code`, `retryable`, `details` without secrets). ARQAM `INVALID_PHONE` / `PROVIDER_ERROR` → `OTP_DELIVERY_FAILED` (not retried; the stored code is removed). Key / template / sender / credits / per-phone or per-IP limits are not retried; 5xx, timeouts and network errors are retried with capped backoff + jitter and the same `Idempotency-Key`; `RATE_LIMITED` waits its `retryAfter` (up to `maxRetryAfterMs`). Full table: `ARQAM_ERRORS` and `.claude/Integration.md` §6.

## Environments

|              | dev                                                                          | prod                                                               |
| ------------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| channel      | `FakeOtpChannel` (records codes, `lastCode(phone)`) or ARQAM with a TEST key | ARQAM with a LIVE key (fake channel refused)                       |
| fixed code   | `fixedCode: '123456'` allowed                                                | refused                                                            |
| stores       | `MemoryCodeStore`, `MemoryLimitStore`                                        | shared stores (`RedisCodeStore`, `RedisLimitStore`); local refused |
| ARQAM URL    | any (`baseUrl` for a local mock)                                             | https only                                                         |
| proof verify | `provider: 'fake'` (`fakeProof(phone)`) or `'signed'`                        | `'signed'` or `'custom'`                                           |

Other channels: any `OtpChannel` with `createCodeOtp({ ..., channel })`; a vendor-neutral SMS adapter also exists (`createSmsOtp({ ..., sms: { vendor, templates } })`, fake vendor only). WAB does not use it: ARQAM over WhatsApp is WAB's only real channel, with no SMS fallback. Behind a proxy: pass `arqam.fetch`.

## Develop

`npm run verify` runs typecheck, lint, format, unit tests with the coverage gate (100 % functions, 95 % lines/branches), build, a packaged-tarball smoke test (CJS + ESM) and the loop test. Redis tests use a real `redis-server` on localhost (or `REDIS_TEST_URL`).

Technical document: `.claude/Integration.md`.
