# wab-otp — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next otp`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- 0.3.0 (OTP-012): ARQAM OTP channel (WhatsApp delivery through ARQAM) + signed single-use `otpToken` + OTP limits; Meta WhatsApp channel removed. WAB-Server adopts it in SRV-158 (same branch).

## Current task

### OTP-012 — ARQAM OTP channel; direct Meta WhatsApp channel removed; 0.3.0 (owner decisions 2026-10-26)
- Branch: `feat/srv-158-arqam-otp` (one branch with SRV-158: the server uses `file:../wab-otp`)
- Status: IN REVIEW (committed, not pushed; no PR — the lead ships it)
- Acceptance criteria (BUSINESS_DOMAIN §3.1a, §11 `OTP_DELIVERY_FAILED`, §12.8; ARQAM API docs read 2026-10-26):
  - [x] `createArqamChannel` implements `OtpChannel`: `POST {baseUrl}/sms/otp` with `x-api-key`, JSON, one `idempotency-key` per send (reused by its retries), body `{phoneNumber (E.164), otpCode (our code), templateName (per app language, fallback), senderId?, ipAddress? (`::ffff:` removed, non-IPs dropped)}`; `messageId` returned; 2xx without it → `OTP_MALFORMED_RESPONSE` (not retried)
  - [x] `createArqamOtp` (code flow + `getAccount` + `getDeliveryStatus`); `SendCodeInput.ip` / `OtpMessage.ip` pass-through
  - [x] Error table `ARQAM_ERRORS` (every documented code) + HTTP fallback; `RATE_LIMITED` honours `retryAfter` within `maxRetryAfterMs` (`withRetry` waits ≥ `details.retryAfterMs`), longer waits not retried; timeouts/network/5xx retried; unknown → `OTP_UNKNOWN` logged with ARQAM's message (phones masked)
  - [x] Prod strict: https `baseUrl`, fake channel and fixed code refused; codes outside 4–6 digits → `OTP_CONFIG_INVALID` before any call; key and code never logged
  - [x] Removed: `adapters/whatsapp/*`, `constants/whatsapp.ts`, `createWhatsAppOtp`, `createWhatsAppChannel`, Meta options/error table/tests/fixtures, `docs/WHATSAPP_SETUP.md`; generic `adapters/http` (`FetchLike` with optional body, `sendHttp`, `transportError`)
  - [x] 0.3.0; CHANGELOG (BREAKING), README, `.claude/Integration.md`, `.claude/CLAUDE.md`, memory; owner guide `docs/ARQAM_SETUP.md`
- Assumed missing (Integration.md §11): `Idempotency-Key` honoured on `/sms/otp`; `senderId` accepted on `/sms/otp`; `/sms/account` field names; delivery failures after acceptance are not reported (no webhook statuses); `otp.length` > 6 breaks ARQAM sends.
- Tests: `tests/arqam.test.ts`, `arqamErrors.test.ts`, `arqamOptions.test.ts`, `arqamStatus.test.ts`, `http.test.ts`, `kernel.test.ts` (wait hint), `code.test.ts` (ip); `npm run verify` green through the Terminal panel (local ports): typecheck, lint, format, 183 unit tests (coverage 99.53 % stmts / 98.41 % branches / 100 % functions / 99.86 % lines), build, CJS + ESM smoke, loop 2/2 (memory + real Redis)
- Loops: 1/1 — re-checked every criterion against the ARQAM spec in the task and §3.1a; found and fixed: `::ffff:abcd` is a valid IPv6 (test expectation), `exactOptionalPropertyTypes` in tests, prettier drift in README.
- Review: PASSED (SE ✔ (ports/adapters, no WAB rule inside, files < 300 lines, no hardcoded wire values outside `constants/`), Mobile N/A, Architect ✔ (channel swap = one adapter; consumer API of the code flow unchanged except the additive `ip`), QA ✔ (every ARQAM code + HTTP fallback, retry/idempotency, malformed answers, logs)) — DEVIATIONS: no real call to otp.arqam.tech (no key); dashboard labels in the owner guide are marked ⚠️ guesses.

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
