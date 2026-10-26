# wab-otp — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next otp`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- 0.2.0 (OTP-011): WhatsApp code channel + signed single-use `otpToken` + OTP limits; Firebase verifier removed. WAB-Server still on 0.1.0 until SRV-153.

## Current task

### OTP-011 — WhatsApp channel + signed single-use OTP proof (owner decision 2026-10-26)
- Branch: `feat/otp-011-whatsapp`
- Status: IN REVIEW (committed, not pushed; no PR yet)
- Acceptance criteria (BUSINESS_DOMAIN §3.1a, §10 `otp.*`, §11 `OTP_DELIVERY_FAILED`):
  - [x] `OtpChannel` port; `createCodeOtp` (CSPRNG code, HMAC at rest, TTL, single use, concurrent verify → one winner); SMS and WhatsApp are channels; `FakeOtpChannel`; dev-only `fixedCode`
  - [x] `createWhatsAppChannel` / `createWhatsAppOtp`: Meta authentication template, code in body + button (`sub_type: url`, `index: "0"`), `+` stripped, `languageCodes` + `fallbackLanguage`, configurable `apiVersion` (default `v26.0`), `baseUrl` https in prod, `timeoutMs`, injectable `fetch`, retry via `src/retry`
  - [x] Meta error mapping: 131026/131021/131030 → `OTP_DELIVERY_FAILED`; auth → `OTP_AUTH_FAILED`; template/params → `OTP_CONFIG_INVALID`; account → `OTP_PROVIDER_UNAVAILABLE`; throughput/429/5xx/timeouts retried; unknown → `OTP_UNKNOWN`; token, code never logged, phones masked
  - [x] Signed proof `otpToken` `{v, phone, purpose, jti, iat, exp}` (HMAC-SHA256, secret ≥ 32, `proofTtlSec` 600); `provider: 'signed'` checks signature, expiry, phone, purpose, single use (`otp:used:{jti}` via `setIfAbsent`)
  - [x] `RedisCodeStore` (+ `CodeStore.setIfAbsent`, `delete` → boolean); prod refuses fake channel, fixed code, local stores, http base URL
  - [x] Firebase verifier, `createEmulatorToken`, `createKeyProvider`, `FirebaseOptions`, `jose` removed; version 0.2.0; CHANGELOG + Integration.md say BREAKING (SRV-153)
  - [x] `docs/WHATSAPP_SETUP.md` owner guide (verified vs unverified facts marked)
- Assumed missing: Meta reports most undeliverable numbers asynchronously (webhook), not built; `Retry-After` not read; fallback language chosen by the consumer; env names final in SRV-153.
- Tests: `npm run verify` green (run through the Terminal panel because the Redis tests and the loop need a local port): typecheck, lint, format, 193 unit tests (coverage 99.48 % stmts / 98.43 % branches / 100 % functions / 99.84 % lines), build, CJS + ESM smoke, loop 2/2 (memory + real Redis, 1 000 flows each).
- Loops: 1/1 — re-checked each criterion against §3.1a and the task prompt; found and fixed: DOMException timeout from another realm mapped as network error, redactor hiding log keys containing `code`, prototype keys (`toString`) accepted as languages, dead `withTimeout`/`retry` options after the Firebase removal.
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — ports/adapters kept, no WAB rules inside, prod strict, every Meta group tested. DEVIATIONS: no real call to graph.facebook.com (no Meta app/token); Meta facts not re-checked are marked ⚠️ in the guide; WAB-Server not changed (SRV-153), so the server is incompatible with 0.2.0 until then (it uses `file:../wab-otp`).

### OTP-010 — Publish preparation + WAB-Server integration (SRV-034)
- Branch: `feat/otp-010-publish`
- Acceptance: package renamed `@wab/otp` (version 0.1.0, `publishConfig` GitHub Packages restricted, `repository`, `prepublishOnly` = verify, `pack:check`, CHANGELOG, README in the tarball; `npm pack --dry-run` shows dist + README + CHANGELOG); NOT published (owner runs it). WAB-Server: `OTP_PROVIDER=real` works through `providers/otp/real.ts` (env `FIREBASE_PROJECT_ID`, dev-only `FIREBASE_AUTH_EMULATOR_HOST`), `file:` dependency + `ensure-sdks` + Docker + `.env.example`, production refuses the emulator host, server tests (9 + config) pass.
- Assumed missing: owner must supply the GitHub Packages token and run `npm publish`; Firebase project ids per environment come from env (dev `wab-dev-397ab`, prod `wab-prod-9c58f`); no service account is needed for ID-token verification.
- Tests: `cd wab-otp && npm run verify` green; `cd WAB-Server && npm run docs && format:check && lint && typecheck && build && test && audit` green.
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — NOT verified: real Firebase ID token from the dev/prod project (no network/credentials here), Docker image build (no daemon), actual publish to the registry.
