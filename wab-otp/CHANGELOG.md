# Changelog

## 0.3.0 (BREAKING)

- ARQAM OTP channel (owner decision 2026-10-26): `createArqamChannel` / `createArqamOtp` hand our server-generated code to ARQAM OTP (`POST {baseUrl}/sms/otp`, `X-API-Key`, `otpCode`, template per app language from `templates`, optional `senderId`, `ipAddress` when the caller passes `ip`, one `Idempotency-Key` per send reused by its retries). ARQAM delivers it over WhatsApp from its approved sender.
- ARQAM error mapping: `INVALID_PHONE` / `PROVIDER_ERROR` → `OTP_DELIVERY_FAILED`; `UNAUTHORIZED` → `OTP_AUTH_FAILED`; `UNKNOWN_AUTH_TEMPLATE` / `SENDER_REQUIRED` / `INVALID_REQUEST` → `OTP_CONFIG_INVALID`; `INSUFFICIENT_CREDITS` / `SENDER_NOT_AVAILABLE` → `OTP_PROVIDER_UNAVAILABLE` (not retried); 5xx, timeouts, network → retried; `RATE_LIMIT_PHONE` / `RATE_LIMIT_IP` → `OTP_RATE_LIMITED` (not retried); `RATE_LIMITED` retried after `retryAfter` when it is within `maxRetryAfterMs` (default 2 s). Unknown codes fall back to the HTTP status; anything else is `OTP_UNKNOWN`.
- Helpers `getAccount()` (`GET /sms/account`: `LIVE`/`TEST`/`UNKNOWN`, balance) and `getDeliveryStatus(messageId)` (`GET /messages/{id}/history`: `SENT`/`DELIVERED`/`READ`/`FAILED`/`UNKNOWN`).
- `OtpMessage.ip` and `SendCodeInput.ip` (optional, passed through); `withRetry` waits at least a vendor's `details.retryAfterMs`; `FetchLike.body` is optional (GET).
- **Removed:** the direct Meta WhatsApp Cloud API channel (`createWhatsAppOtp`, `createWhatsAppChannel`, `WhatsAppChannelOptions`, `WhatsAppOtpOptions`, Meta error table) and `docs/WHATSAPP_SETUP.md` (replaced by `docs/ARQAM_SETUP.md`). WAB-Server adopts this in SRV-158.

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
