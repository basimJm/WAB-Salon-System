# Changelog

## 0.1.0

- First release: provider-independent phone OTP verification (`OtpProvider`: precheck, verify, reportFailure, getConfig, resetLimits) with request / wrong-code limits.
- Adapters: Firebase ID-token verification on `jose` (key cache, rotation, stale keys, emulator mode for dev), fake, server-verified SMS skeleton; stores: memory and Redis.
- Typed errors, redacting logger, prod/dev option rules, ESM + CJS builds with `.d.ts`.
