# wab-otp — Integration (technical implementation document)

> Single source of truth for **how this package is built and how any project uses it**. Updated after every commit/push that changes the implementation (Rules.md §14). Status legend: ✅ done · 🚧 in progress · ⬜ not started.

| Field | Value |
|---|---|
| Package | `@wab/otp` |
| Type | Node.js package (TypeScript, npm), server only |
| BRD | `docs/WAB_Package_OTP_BRD.md`; behaviour: `BUSINESS_DOMAIN.md` §3.1a, §10 `otp.*`, §11 |
| Version | **0.3.0** (OTP-012; BREAKING: Meta WhatsApp channel removed, ARQAM channel added; adopted by WAB-Server in SRV-158). Not published (owner runs `npm publish`). |
| Node | >= 22, TypeScript strict, ESM + CJS builds |
| Server counterpart in WAB | `WAB-Server/src/providers/otp` (`arqam.ts`, `sdk.ts`, `fake.ts`, `arqamCheck.ts`) |
| Owner setup guide | `docs/ARQAM_SETUP.md` (ARQAM project, sender, AR + EN templates, TEST/LIVE keys, Render env names, check command) |
| Vendor spec | ARQAM OTP API docs (otp.arqam.tech/apidoc, read 2026-10-26) |

## 1. Purpose and boundaries
Confirms that a user controls a phone number before sensitive actions and enforces OTP abuse limits. Owner decisions 2026-10-26: the **server** generates the code, stores only its HMAC, hands it to **ARQAM OTP** as `otpCode` (ARQAM delivers it over WhatsApp from its approved sender with an authentication template, one template per app language), checks the typed code itself (ARQAM's `/sms/verify` is not used) and issues a **signed single-use proof** (`otpToken`) that every phone-verified action checks. Firebase Phone Auth and the direct Meta Cloud API channel are removed; no SMS fallback (an SMS channel exists for a future vendor).

**Not in this package:** JWT/refresh tokens (backend auth), admin e-mail 2FA (wab-notifications), UI, webhooks (ARQAM webhooks carry no OTP statuses).

## 2. Architecture
```
createArqamOtp / createSmsOtp ──> createCodeOtp ──> OtpChannel (port)
                                      │              ├── adapters/arqam (ARQAM OTP REST, fetch; + getAccount, getDeliveryStatus)
                                      │              │      └── adapters/http (FetchLike, bounded request, transport errors)
                                      │              ├── adapters/sms (SmsVendor + templates)
                                      │              └── adapters/fake/channel (FakeOtpChannel)
                                      ├── CodeStore (port): code-store/memory | code-store/redis
                                      └── proof/ (createProofs: issue + ProofVerifier)
createOtpService / createOtpVerifier ──> ProofVerifier: signed (proof/) | fake | custom
                                     └── limits/ over LimitStore: memory-store | redis-store
```
Kernel: `errors/`, `config/` (zod options), `retry/` (capped backoff + jitter, vendor wait hints), `logging/` (injected, redacting), events hook.

## 3. Public API
```ts
// code flow (BUSINESS_DOMAIN §3.1a steps 1–3)
createArqamOtp(o: CodeOtpOptions-without-channel & { arqam: ArqamChannelOptions-without-environment }): ArqamOtp
// ArqamOtp = CodeOtp & { getAccount(); getDeliveryStatus(messageId) }
createSmsOtp(o: … & { sms: { vendor: SmsVendor; templates: Record<lang,string>; fallbackLanguage? } }): CodeOtp
createCodeOtp(o: CodeOtpOptions): CodeOtp
interface CodeOtp {
  sendCode({phone, purpose, language, ip?}): Promise<{expiresInSec, messageId}>;   // stores HMAC, then sends; failure deletes the code
  verifyCode({phone, purpose, code}): Promise<{outcome:'VERIFIED'; phone; otpToken; expiresInSec} | {outcome:'INVALID_PROOF'|'EXPIRED'}>;
  proofs: ProofVerifier;   // checks otpToken
  channelName: string;
}
CodeOtpOptions = { environment; channel: OtpChannel; store: CodeStore; codeSecret; proofSecret;
  codeLength?=6; codeTtlSec?=300; proofTtlSec?=600; fixedCode? (dev only); keyPrefix?; logger?; onEvent?; now?; randomInt?; newId? }
ArqamChannelOptions = { environment; apiKey; templates: Record<appLang, templateName>; fallbackLanguage?; senderId?;
  baseUrl?='https://otp.arqam.tech/api'; timeoutMs?=5000; maxRetryAfterMs?=2000; fetch?: FetchLike; retry?; retryDeps?;
  newIdempotencyKey?=randomUUID; logger? }
createArqamChannel(o): ArqamChannel  // OtpChannel + getAccount(): {mode:'LIVE'|'TEST'|'UNKNOWN', balance?, status?}
                                     //            + getDeliveryStatus(id): {messageId, state:'SENT'|'DELIVERED'|'READ'|'FAILED'|'UNKNOWN', history[]}
createSmsChannel(o): OtpChannel     new FakeOtpChannel()  (.sent, .lastCode(phone), .failWith)
OtpMessage = { to; code; language; purpose; ttlSec; ip? }   // ip only when the consumer passes it

// proof (step 3/4)
createProofs({secret, store, ttlSec?=600, keyPrefix?, now?, newId?}): { issue({phone, purpose}): {otpToken, expiresInSec}; verifier: ProofVerifier }

// limits + verification (unchanged port)
createOtpService({environment, provider:'signed'|'fake'|'custom', proof?: {secret, store, keyPrefix?}, verifier?, limits?, otpLength?, resendAfterSec?, store?, keyPrefix?, logger?, onEvent?, now?}): OtpProvider
createOtpVerifier(same): ProofVerifier & { resolved }
OtpProvider { precheck; verify; reportFailure; resetLimits; getConfig; close }
```
Also exported: `ARQAM_ERRORS` (the mapping table), `DEFAULT_ARQAM`, `FetchLike`, types `ArqamAccount`, `DeliveryStatus`, `DeliveryEvent`, `ArqamMode`, `DeliveryState`. Stores: `MemoryLimitStore`, `RedisLimitStore`, `MemoryCodeStore`, `RedisCodeStore` (both Redis stores take the same `RedisClientLike`: `eval`, `pttl`, `get`, `del`).

ARQAM wire: `POST {baseUrl}/sms/otp`, headers `x-api-key`, `content-type`/`accept: application/json`, `idempotency-key` (one per `send`, reused by its retries), body `{phoneNumber: E.164 with +, otpCode, templateName, senderId?, ipAddress?}` → `{success:true, messageId, status:'sent', cost}`. `GET {baseUrl}/sms/account`, `GET {baseUrl}/messages/{messageId}/history` (no body, no idempotency key). `ipAddress` = the caller's `ip` with `::ffff:` removed; dropped when it is not an IP.

`otpToken` = `base64url(JSON{v:1, phone, purpose, jti, iat, exp}).base64url(HMAC-SHA256(proofSecret, payloadPart))`. Single use: `setIfAbsent(otp:used:{jti}, ttl = exp - now)`.

## 4. Configuration
| Option | Dev | Prod | WAB-Server env (SRV-158) |
|---|---|---|---|
| `environment` | `dev` | `prod` | `NODE_ENV` |
| channel | fake or ARQAM with a TEST key | ARQAM with a LIVE key; fake refused | `OTP_PROVIDER=fake\|arqam` |
| `arqam.apiKey` (secret) | TEST key (every code goes to the key's test phone) | LIVE key | `ARQAM_API_KEY` |
| `arqam.templates` | `{ar, en}` | same | `ARQAM_TEMPLATE_AR`, `ARQAM_TEMPLATE_EN` |
| `arqam.fallbackLanguage` | `ar` | same | — (server constant) |
| `arqam.senderId` | only on `SENDER_REQUIRED` | same | `ARQAM_SENDER_ID` |
| `ip` passed to `sendCode` | when the project has IP rate limiting | same | `ARQAM_SEND_IP=true` |
| `arqam.baseUrl` | any (local mock) | https only | `ARQAM_BASE_URL` (optional) |
| `codeSecret` / `proofSecret` (secrets, ≥ 32, different) | any strong value | required | `OTP_CODE_SECRET` / `OTP_PROOF_SECRET` |
| `codeLength` / `codeTtlSec` / `proofTtlSec` | 6 / 300 / 600 | settings | `otp.length`, `otp.codeTtlSec`, `otp.proofTtlSec` |
| `fixedCode` | allowed | refused | `OTP_FIXED_CODE` (dev only) |
| stores | memory | Redis (local refused) | existing Redis client |
| `limits`, `resendAfterSec` | 5/300/5/900, 60 | settings | `otp.*` |

## 5. Status and result mapping
| Situation | Result |
|---|---|
| right code, first use | `VERIFIED` + `otpToken`; code deleted |
| wrong code (any string) | `INVALID_PROOF` (consumer calls `reportFailure(WRONG_CODE)`) |
| no code / expired / already used / other phone or purpose | `EXPIRED` |
| concurrent verifications of the same code | exactly one `VERIFIED`, others `EXPIRED` |
| `otpToken` valid, first use | `VERIFIED` |
| bad signature / malformed / other secret / replayed | `INVALID_PROOF` |
| past `exp` | `EXPIRED` |
| phone / purpose differs | `PHONE_MISMATCH` / `PURPOSE_MISMATCH` (proof not consumed) |
| blocked by limiter (service) | `BLOCKED` |
| ARQAM 2xx with `messageId` (and `success` not false) | sent (`messageId` = ARQAM uuid) |
| ARQAM 2xx without `messageId` / `success:false` / non-JSON | `OTP_MALFORMED_RESPONSE`, not retried (could duplicate) |
| ARQAM refusal | by `errorCode` first, then HTTP status (§6) |
| account `mode` live / test / other | `LIVE` / `TEST` / `UNKNOWN` |
| history status sent / delivered / read / failed / other | `SENT` / `DELIVERED` / `READ` / `FAILED` / `UNKNOWN` |

## 6. Error model
| Code | When | Retryable |
|---|---|---|
| `OTP_DELIVERY_FAILED` | ARQAM `INVALID_PHONE` (400), `PROVIDER_ERROR` (502, WhatsApp refused; refunded) | no |
| `OTP_AUTH_FAILED` | ARQAM `UNAUTHORIZED`; HTTP 401/403 without a known code | no |
| `OTP_CONFIG_INVALID` | bad options; code not 4–6 digits; ARQAM `UNKNOWN_AUTH_TEMPLATE`, `SENDER_REQUIRED`, `INVALID_REQUEST` | no |
| `OTP_PROVIDER_UNAVAILABLE` | ARQAM `INSUFFICIENT_CREDITS` (402), `SENDER_NOT_AVAILABLE` (403), HTTP 402 (no); HTTP 5xx without a known code (yes); non-OtpError channel failure (yes) | see left |
| `OTP_RATE_LIMITED` | ARQAM `RATE_LIMIT_PHONE`, `RATE_LIMIT_IP` (no); `RATE_LIMITED` (yes, after `retryAfter` when ≤ `maxRetryAfterMs`, otherwise no); HTTP 429 without a code (yes) | see left |
| `OTP_TIMEOUT` / `OTP_NETWORK_ERROR` | no HTTP answer (retried with the same idempotency key) | yes |
| `OTP_MALFORMED_RESPONSE` | 2xx without message id / account / history; unexpected store reply | no |
| `OTP_STORE_UNAVAILABLE` | Redis down | yes |
| `OTP_INPUT_INVALID` | bad phone/purpose/language/code type, no template for the language, empty message id | no |
| `OTP_UNKNOWN` | any other status (logged with status, ARQAM code and message, phones masked) | no |

Details carry `status`, `arqamError`, `retryAfterMs` only. Logs never contain the key or the code; phones are masked. Log keys avoid `code`/`key` (the redactor hides such keys). `withRetry` waits at least `details.retryAfterMs`.

## 7. Environments
- **dev (localhost):** `FakeOtpChannel` (+ optional `fixedCode`), memory stores, `provider: 'fake'` (`fakeProof`) for proof-less tests; or ARQAM with a TEST key (hosted dev) / a local mock via `baseUrl` (http allowed).
- **prod:** ARQAM over https with a LIVE key, Redis stores, strong different secrets; fake channel, fixed code and local stores refused.

## 8. Performance notes
One HTTPS call per code (bounded `timeoutMs`, `AbortSignal.timeout`); one Redis SET per send, GET + DEL per verify, one SET NX per proof check; no I/O in `getConfig`; `fetch` is the platform's (keep-alive by undici).

## 9. Testing
- Unit tests per file (`tests/*.test.ts`): `arqam.test.ts` (body, template per language + fallback, senderId, IP normalization, headers, idempotency key per send reused by retries, every final refusal not retried, 5xx/timeout/network retried, `retryAfter` honoured or refused, malformed 2xx, 4–6 digit guard, no key/code/phone in logs, account + history lookups, `createArqamOtp` end to end, prod https/fixed code), `arqamErrors.test.ts` (every documented `errorCode`, HTTP fallbacks, wait hint), `arqamOptions.test.ts`, `arqamStatus.test.ts`, `http.test.ts`, kernel retry hint, code flow IP pass-through. Coverage gate 100 % functions, ≥ 95 % lines/branches (0.3.0: 99.5 % statements, 98.4 % branches).
- Loop test (`npm run test:loop`): 1 000 flows (50 phones × 20 rounds, 20 in flight) of precheck / send / wrong code / verify / otpToken use + replay, on memory stores and a real Redis; asserts block counts, resets, no code/limit key left, flat heap.
- Smoke: packed tarball, CJS + ESM: fake channel → code → otpToken → signed verify; ARQAM channel with a stubbed fetch.
- NOT verified: a real call to otp.arqam.tech (no ARQAM key here).

## 10. Adoption guide (WAB-Server, SRV-158)
1. `providers/otp/arqam.ts`: `createArqamChannel({environment, apiKey, templates: {ar, en}, fallbackLanguage: 'ar', senderId?, baseUrl?, logger})` + `createSdkOtp` (Redis code store, `forwardIp` = `ARQAM_SEND_IP`); `OTP_PROVIDER=fake` → `FakeOtpChannel`, optional fixed code (dev only).
2. `POST …/auth/otp/request`: server limits first, then `sendCode({phone, purpose, language from Accept-Language, ip: req.ip})`; `OTP_DELIVERY_FAILED` → 422 (request still counts); every other SDK error → 503 `ExternalServiceError` + `error` log.
3. `POST …/auth/otp/verify` and every `otpToken` check: unchanged from 0.2.0.
4. Startup: one non-blocking `getAccount()` log (a warning when a TEST key runs with `NODE_ENV=production`, which the hosted dev service also uses); `/ready` does not depend on ARQAM. Ops: `npm run otp:arqam-check [-- --send +E164 --lang ar|en]`.

## 11. Open questions / assumed-missing requirements
- **Delivery failures after acceptance** (WhatsApp accepted by ARQAM, then failed): not reported to the user; ARQAM webhooks carry no OTP statuses. `getDeliveryStatus` is ready for a later polling feature (owner cancelled the polling tasks CUS-091/MER-072 on 2026-10-26).
- **`Idempotency-Key` on `/sms/otp`:** ARQAM documents it for WhatsApp sends; we send one per code and reuse it on retries. If ARQAM ignores it, a retry after a timeout can send (and charge) a second message with the **same** code (harmless for the user).
- **`senderId` field on `/sms/otp`:** not shown in the request example; passed through only when configured (assumption from the `SENDER_REQUIRED` error text).
- **`GET /sms/account` shape:** only "status, mode, balance" is documented; the reader accepts the fields at the top level or under `account`/`data`, `balance` or `credits`, and maps unknown modes to `UNKNOWN`.
- **Code length:** ARQAM accepts 4–6 digits; the server setting `otp.length` allows 4–10. A length above 6 makes every send fail with `OTP_CONFIG_INVALID` (server 503). Owner should keep `otp.length` ≤ 6 (the settings range was not narrowed: that would change the admin contract).
- `RATE_LIMITED.retryAfter` above `maxRetryAfterMs` (2 s) is not waited for in-request.
- Per device/IP limit key (OTP-04 SHOULD) still not built.
- Redis Cluster: code/limit keys of a phone are not hash-tagged (single primary assumed). Phones appear inside store keys (not logs).
- Event schema (`precheck`, `verify`, `failure`, `provider_error`, `send`) must match `wab-analytics`.

## 12. Implementation status
| Item | Status |
|---|---|
| Scaffold, kernel, limits, memory/redis limit stores, fake proof | ✅ |
| Code flow (`createCodeOtp`), `OtpChannel` port, fake channel, fixed code (dev) | ✅ |
| ARQAM channel (send, error mapping, retry + wait hint, idempotency, timeout, account, delivery history) | ✅ |
| Signed single-use proof + `provider: 'signed'` | ✅ |
| Code stores memory + Redis | ✅ |
| SMS channel (no vendor chosen) | ✅ |
| Firebase verifier | removed in 0.2.0 |
| Meta WhatsApp Cloud API channel | removed in 0.3.0 |
| Unit tests + coverage gate, loop test, smoke | ✅ |

## 13. Changelog
| Date | Version | Change |
|---|---|---|
| 2026-10-14 | 0.0.0 | Design document created from the BRD; no code yet. |
| 2026-10-18 | 0.1.0 | OTP-001…008: scaffold, kernel, verifier, limits, Redis store, Firebase ID-token adapter + emulator, loop/smoke. |
| 2026-10-18 | 0.1.0 | OTP-009 server-verified SMS skeleton (fake vendor, HMAC code store). |
| 2026-10-19 | 0.1.0 | OTP-010 publish preparation; WAB-Server SRV-034 on the Firebase verifier. |
| 2026-10-26 | 0.2.0 | OTP-011 WhatsApp channel, generic code flow, signed single-use `otpToken`, Redis code store, `OTP_DELIVERY_FAILED`; Firebase verifier and `jose` removed (BREAKING; server adopts in SRV-153). |
| 2026-10-26 | 0.3.0 | OTP-012 ARQAM OTP channel (`createArqamChannel`/`createArqamOtp`, error table, `retryAfter`, idempotency key, `getAccount`, `getDeliveryStatus`), `ip` pass-through, generic `adapters/http`; Meta WhatsApp channel and `WHATSAPP_SETUP.md` removed (BREAKING; server adopts in SRV-158). |
