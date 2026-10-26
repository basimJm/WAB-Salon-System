# Changelog

## 0.2.0 (BREAKING)

- WhatsApp OTP (owner decision 2026-10-26): `createWhatsAppOtp` / `createWhatsAppChannel` send server-generated codes through the Meta WhatsApp Cloud API authentication template (copy-code button, code in body and button, app language mapped by `languageCodes`). Meta errors mapped: not on WhatsApp / undeliverable → new `OTP_DELIVERY_FAILED`; token → `OTP_AUTH_FAILED`; template/parameters → `OTP_CONFIG_INVALID`; throughput limits, 429, 5xx, timeouts → retried.
- Generic server-generated code flow `createCodeOtp` over the new `OtpChannel` port (WhatsApp, SMS, `FakeOtpChannel`); dev-only `fixedCode`.
- Signed single-use proof: a correct code returns `otpToken` (`createProofs`); `provider: 'signed'` verifies signature, expiry, phone, purpose and single use (`otp:used:{jti}`).
- `CodeStore` port gains `setIfAbsent` and `delete` returns whether the key existed; new `RedisCodeStore`; `MemoryCodeStore` moved to the code-store adapter.
- `createSmsOtp` now takes `codeSecret`, `proofSecret` and `sms: { vendor, templates }` and returns the same `CodeOtp` as WhatsApp.
- **Removed:** Firebase Phone Auth verifier (`provider: 'firebase'`, `FirebaseOptions`, `createFirebaseVerifier`, `createEmulatorToken`, `createKeyProvider`), the `jose` dependency, `OtpOptions.retry`/`retryDeps`. `FetchLike` now has the WhatsApp channel's shape. WAB-Server adopts this in SRV-153.

## 0.1.0

- First release: provider-independent phone OTP verification (`OtpProvider`: precheck, verify, reportFailure, getConfig, resetLimits) with request / wrong-code limits.
- Adapters: Firebase ID-token verification on `jose` (key cache, rotation, stale keys, emulator mode for dev), fake, server-verified SMS skeleton; stores: memory and Redis.
- Typed errors, redacting logger, prod/dev option rules, ESM + CJS builds with `.d.ts`.
