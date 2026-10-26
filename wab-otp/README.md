# wab-otp

Provider-independent phone OTP for WAB projects (Node >= 22, TypeScript, ESM + CJS): server-generated codes delivered over **WhatsApp** (Meta Cloud API authentication template) or any other channel, a **signed single-use proof** (`otpToken`) after a correct code, and request / wrong-code limits.

Owner setup of the Meta side (app, number, token, template): [`docs/WHATSAPP_SETUP.md`](docs/WHATSAPP_SETUP.md).

## Quick start

```ts
import { createWhatsAppOtp, createOtpService, RedisCodeStore, RedisLimitStore } from '@wab/otp';

const codeStore = new RedisCodeStore(redis); // shared store, required in prod
const whatsapp = createWhatsAppOtp({
  environment: 'prod', // 'dev' | 'prod'
  store: codeStore,
  codeSecret: process.env.OTP_CODE_SECRET!, // >= 32 chars
  proofSecret: process.env.OTP_PROOF_SECRET!, // >= 32 chars, different
  codeLength: 6, // otp.length
  codeTtlSec: 300, // otp.codeTtlSec
  proofTtlSec: 600, // otp.proofTtlSec
  whatsapp: {
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID!,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN!,
    templateName: process.env.WHATSAPP_TEMPLATE_NAME!,
    languageCodes: { ar: 'ar', en: 'en_US' },
    fallbackLanguage: 'ar',
  },
});
const limits = createOtpService({
  environment: 'prod',
  provider: 'signed', // verifies otpToken
  proof: { secret: process.env.OTP_PROOF_SECRET!, store: codeStore },
  store: new RedisLimitStore(redis),
});

// 1. request: limits first, then send
const pre = await limits.precheck({ phone, purpose: 'LOGIN' }); // { allowed, otpLength, resendAfterSeconds, blockedUntil? }
if (pre.allowed) await whatsapp.sendCode({ phone, purpose: 'LOGIN', language: 'ar' }); // { expiresInSec, messageId }

// 2. verify the typed code
const r = await whatsapp.verifyCode({ phone, purpose: 'LOGIN', code });
// { outcome: 'VERIFIED', phone, otpToken, expiresInSec } | { outcome: 'INVALID_PROOF' | 'EXPIRED' }
if (r.outcome === 'INVALID_PROOF')
  await limits.reportFailure({ phone, purpose: 'LOGIN', reason: 'WRONG_CODE' });

// 3. any action that needs a verified phone
await limits.verify({ proof: otpToken, expectedPhone: phone, purpose: 'LOGIN' });
// { outcome: 'VERIFIED', phone } | INVALID_PROOF (bad / replayed) | EXPIRED | PHONE_MISMATCH | PURPOSE_MISMATCH | BLOCKED
```

Only proof verification (when your backend owns the limits): `createOtpVerifier({ environment, provider: 'signed', proof })`, or `whatsapp.proofs.verify(...)`.

Failures **throw** `OtpError` (`code`, `retryable`, `details` without secrets). Not on WhatsApp / not deliverable → `OTP_DELIVERY_FAILED` (not retried; the stored code is removed). 429 / 5xx / Meta throughput limits / timeouts are retried with capped backoff + jitter.

## Environments

|              | dev                                                                               | prod                                                               |
| ------------ | --------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| channel      | `FakeOtpChannel` (records codes, `lastCode(phone)`) or WhatsApp with test numbers | WhatsApp (fake channel refused)                                    |
| fixed code   | `fixedCode: '123456'` allowed                                                     | refused                                                            |
| stores       | `MemoryCodeStore`, `MemoryLimitStore`                                             | shared stores (`RedisCodeStore`, `RedisLimitStore`); local refused |
| Graph URL    | any (`baseUrl` for a local mock)                                                  | https only                                                         |
| proof verify | `provider: 'fake'` (`fakeProof(phone)`) or `'signed'`                             | `'signed'` or `'custom'`                                           |

Other channels: `createSmsOtp({ ..., sms: { vendor, templates } })`, or any `OtpChannel` with `createCodeOtp({ ..., channel })`. Behind a proxy: pass `whatsapp.fetch`.

## Develop

`npm run verify` runs typecheck, lint, format, unit tests with the coverage gate (100 % functions, 95 % lines/branches), build, a packaged-tarball smoke test (CJS + ESM) and the loop test. Redis tests use a real `redis-server` on localhost (or `REDIS_TEST_URL`).

Technical document: `.claude/Integration.md`.
