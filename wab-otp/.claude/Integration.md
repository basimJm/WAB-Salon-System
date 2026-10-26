# wab-otp — Integration (technical implementation document)

> Single source of truth for **how this package is built and how any project uses it**. Updated after every commit/push that changes the implementation (Rules.md §14). Status legend: ✅ done · 🚧 in progress · ⬜ not started.

| Field | Value |
|---|---|
| Package | `@wab/otp` |
| Type | Node.js package (TypeScript, npm), server only |
| BRD | `docs/WAB_Package_OTP_BRD.md`; behaviour: `BUSINESS_DOMAIN.md` §3.1a, §10 `otp.*`, §11 |
| Version | **0.2.0** (OTP-011; BREAKING for WAB-Server, adopted in SRV-153). Not published (owner runs `npm publish`). |
| Node | >= 22, TypeScript strict, ESM + CJS builds |
| Server counterpart in WAB | `WAB-Server/src/providers/otp` (still on 0.1.0 Firebase API until SRV-153) |
| Owner setup guide | `docs/WHATSAPP_SETUP.md` (Meta app, number, system-user token, template, env names) |

## 1. Purpose and boundaries
Confirms that a user controls a phone number before sensitive actions and enforces OTP abuse limits. Phase 1 (owner decision 2026-10-26): the **server** generates the code, stores only its HMAC, delivers it through the **WhatsApp Cloud API** authentication template, checks the typed code and issues a **signed single-use proof** (`otpToken`) that every phone-verified action checks. Firebase Phone Auth is removed; no SMS fallback (an SMS channel exists for a future vendor).

**Not in this package:** JWT/refresh tokens (backend auth), admin e-mail 2FA (wab-notifications), UI, Meta webhooks.

## 2. Architecture
```
createWhatsAppOtp / createSmsOtp ──> createCodeOtp ──> OtpChannel (port)
                                         │              ├── adapters/whatsapp (Meta Graph API, fetch)
                                         │              ├── adapters/sms (SmsVendor + templates)
                                         │              └── adapters/fake/channel (FakeOtpChannel)
                                         ├── CodeStore (port): code-store/memory | code-store/redis
                                         └── proof/ (createProofs: issue + ProofVerifier)
createOtpService / createOtpVerifier ──> ProofVerifier: signed (proof/) | fake | custom
                                     └── limits/ over LimitStore: memory-store | redis-store
```
Kernel: `errors/`, `config/` (zod options), `retry/` (capped backoff + jitter), `logging/` (injected, redacting), events hook.

## 3. Public API
```ts
// code flow (BUSINESS_DOMAIN §3.1a steps 1–3)
createWhatsAppOtp(o: CodeOtpOptions-without-channel & { whatsapp: WhatsAppChannelOptions-without-environment }): CodeOtp
createSmsOtp(o: … & { sms: { vendor: SmsVendor; templates: Record<lang,string>; fallbackLanguage? } }): CodeOtp
createCodeOtp(o: CodeOtpOptions): CodeOtp
interface CodeOtp {
  sendCode({phone, purpose, language}): Promise<{expiresInSec, messageId}>;      // stores HMAC, then sends; failure deletes the code
  verifyCode({phone, purpose, code}): Promise<{outcome:'VERIFIED'; phone; otpToken; expiresInSec} | {outcome:'INVALID_PROOF'|'EXPIRED'}>;
  proofs: ProofVerifier;   // checks otpToken
  channelName: string;
}
CodeOtpOptions = { environment; channel: OtpChannel; store: CodeStore; codeSecret; proofSecret;
  codeLength?=6; codeTtlSec?=300; proofTtlSec?=600; fixedCode? (dev only); keyPrefix?; logger?; onEvent?; now?; randomInt?; newId? }
WhatsAppChannelOptions = { environment; phoneNumberId; accessToken; templateName; languageCodes: Record<appLang, metaLang>;
  fallbackLanguage?; apiVersion?='v26.0'; baseUrl?='https://graph.facebook.com'; timeoutMs?=5000; fetch?: FetchLike; retry?; retryDeps?; logger? }
createWhatsAppChannel(o): OtpChannel     createSmsChannel(o): OtpChannel     new FakeOtpChannel()  (.sent, .lastCode(phone), .failWith)

// proof (step 3/4)
createProofs({secret, store, ttlSec?=600, keyPrefix?, now?, newId?}): { issue({phone, purpose}): {otpToken, expiresInSec}; verifier: ProofVerifier }

// limits + verification (unchanged port)
createOtpService({environment, provider:'signed'|'fake'|'custom', proof?: {secret, store, keyPrefix?}, verifier?, limits?, otpLength?, resendAfterSec?, store?, keyPrefix?, logger?, onEvent?, now?}): OtpProvider
createOtpVerifier(same): ProofVerifier & { resolved }
OtpProvider { precheck; verify; reportFailure; resetLimits; getConfig; close }   // as in 0.1.0
```
Stores: `MemoryLimitStore`, `RedisLimitStore`, `MemoryCodeStore`, `RedisCodeStore` (both Redis stores take the same `RedisClientLike`: `eval`, `pttl`, `get`, `del`).

`otpToken` = `base64url(JSON{v:1, phone, purpose, jti, iat, exp}).base64url(HMAC-SHA256(proofSecret, payloadPart))`. Single use: `setIfAbsent(otp:used:{jti}, ttl = exp - now)`.

## 4. Configuration
| Option | Dev | Prod | Server env (SRV-153 decides final names) |
|---|---|---|---|
| `environment` | `dev` | `prod` | `NODE_ENV` |
| channel | fake or WhatsApp test number | WhatsApp; fake refused | `OTP_CHANNEL` / `OTP_PROVIDER` |
| `whatsapp.phoneNumberId` | test number id | business number id | `WHATSAPP_PHONE_NUMBER_ID` |
| `whatsapp.accessToken` (secret) | system-user token | system-user token | `WHATSAPP_ACCESS_TOKEN` |
| `whatsapp.templateName` | approved template | same | `WHATSAPP_TEMPLATE_NAME` |
| `whatsapp.apiVersion` | default `v26.0` | same | `WHATSAPP_API_VERSION` |
| `whatsapp.baseUrl` | any (local mock) | https only | — |
| `whatsapp.languageCodes` | `{ar:'ar', en:'en_US'}` | same | — (code) |
| `codeSecret` / `proofSecret` (secrets, ≥ 32, different) | any strong value | required | `OTP_CODE_SECRET` / `OTP_PROOF_SECRET` |
| `codeLength` / `codeTtlSec` / `proofTtlSec` | 6 / 300 / 600 | settings | `otp.length`, `otp.codeTtlSec`, `otp.proofTtlSec` |
| `fixedCode` | allowed | refused | dev only |
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
| WhatsApp 2xx with `messages[0].id` | sent (`messageId` = wamid) |
| WhatsApp 2xx without a message id / non-JSON | `OTP_MALFORMED_RESPONSE`, not retried (could duplicate) |
| WhatsApp error | by Meta `error.code` first, then HTTP status (§6) |

## 6. Error model
| Code | When | Retryable |
|---|---|---|
| `OTP_DELIVERY_FAILED` | Meta 131026 (not on WhatsApp / undeliverable), 131021 (same number), 131030 (not in test allowed list) | no |
| `OTP_AUTH_FAILED` | Meta 0, 3, 10, 190, 200–299, 131005; HTTP 401/403 | no |
| `OTP_CONFIG_INVALID` | bad options; Meta 100, 131008, 131009, 132000, 132001, 132005, 132007, 132012, 132015, 132016, 135000 | no |
| `OTP_PROVIDER_UNAVAILABLE` | Meta account 368, 130497, 131031, 131037, 131042, 131045, 133010 (no); temporary 1, 2, 131000, 131016, 131057, 133004 and HTTP 5xx (yes); non-OtpError channel failure (yes) | see left |
| `OTP_RATE_LIMITED` | Meta 4, 80007, 130429, 131056, HTTP 429 (yes); 131048 spam limit (no) | see left |
| `OTP_TIMEOUT` / `OTP_NETWORK_ERROR` | no HTTP answer | yes |
| `OTP_MALFORMED_RESPONSE` | 2xx without message id; unexpected store reply | no |
| `OTP_STORE_UNAVAILABLE` | Redis down | yes |
| `OTP_INPUT_INVALID` | bad phone/purpose/language/code type, code > 15 chars, no template language | no |
| `OTP_UNKNOWN` | any other WhatsApp status/code (logged with status, Meta code, fbtrace_id) | no |
Details carry `status`, `metaCode`, `metaSubcode`, `fbtraceId` only. Logs never contain the token or the code; phones are masked. Log keys avoid the word `code` (the redactor hides such keys).

## 7. Environments
- **dev (localhost):** `FakeOtpChannel` (+ optional `fixedCode`) or the Meta test number with up to 5 verified recipients; memory stores; `provider: 'fake'` (`fakeProof`) still available for proof-less tests.
- **prod:** WhatsApp channel over https, Redis stores, strong different secrets; fake channel, fixed code and local stores refused.

## 8. Performance notes
One HTTPS call per code (bounded `timeoutMs`, `AbortSignal.timeout`); one Redis SET per send, GET + DEL per verify, one SET NX per proof check; no I/O in `getConfig`; `fetch` is the platform's (keep-alive by undici).

## 9. Testing
- Unit tests per file (`tests/*.test.ts`): request body (both parameters, language mapping, `+` stripped), every Meta code group and HTTP status, retry only on retryable (5xx/429/throughput/timeouts), timeout abort, https in prod, code HMAC/TTL/single use/concurrency, proof signature/expiry/phone/purpose/replay/concurrency, limits interplay, code stores (memory + real Redis). Coverage gate 100 % functions, ≥ 95 % lines/branches (0.2.0: 99.5 % statements, 98.4 % branches).
- Loop test (`npm run test:loop`): 1 000 flows (50 phones × 20 rounds, 20 in flight) of precheck / send / wrong code / verify / otpToken use + replay, on memory stores and a real Redis; asserts block counts, resets, no code/limit key left (only used-proof flags with TTL), flat heap.
- Smoke: packed tarball, CJS + ESM: fake channel → code → otpToken → signed verify; WhatsApp channel with a stubbed fetch.
- NOT verified: a real call to graph.facebook.com (no Meta app/token here).

## 10. Adoption guide (WAB-Server, SRV-153)
1. `providers/otp`: build `createWhatsAppOtp({environment, store: new RedisCodeStore(redis), codeSecret, proofSecret, codeLength: settings.otp.length, codeTtlSec, proofTtlSec, whatsapp: {phoneNumberId, accessToken, templateName, apiVersion?, languageCodes: {ar:'ar', en:'en_US'}, fallbackLanguage:'ar'}, logger})`; `OTP_PROVIDER=fake` → `FakeOtpChannel` + `MemoryCodeStore`/Redis, optional fixed code (dev only).
2. `POST …/auth/otp/request`: server limits first, then `sendCode({phone, purpose, language from Accept-Language})`; map `OTP_DELIVERY_FAILED` → 422 `OTP_DELIVERY_FAILED` (request still counts), retryable errors → 503 `ExternalServiceError`.
3. `POST …/auth/otp/verify`: `verifyCode` → `INVALID_PROOF` = `OTP_INVALID` (+ wrong-attempt limit), `EXPIRED` = `OTP_EXPIRED`, `VERIFIED` → return `otpToken`.
4. Login/register/change phone/booking/bank: replace the Firebase ID token by `otpToken`; verify with `createOtpVerifier({environment, provider:'signed', proof:{secret: proofSecret, store}})` (same store as step 1).
5. Remove `FIREBASE_PROJECT_ID`/`FIREBASE_AUTH_EMULATOR_HOST` from OTP config (Firebase stays for push). Apps: remove Firebase Phone Auth (customer/merchant tasks).

## 11. Open questions / assumed-missing requirements
- **Async delivery failures:** Meta often accepts (200 + wamid) and reports 131026 later via webhook. Without a webhook the user sees "code sent" and never gets it. Needs a server webhook task (owner).
- Template name/languages, display name, business verification and pricing are owner actions (`docs/WHATSAPP_SETUP.md`).
- Retrying after a timeout may deliver the same code twice (same code, harmless); 2xx-without-id is not retried.
- Rate-limit `Retry-After`/Meta backoff hints are not read; capped exponential backoff is used.
- `fallbackLanguage` default left to the consumer (WAB: `ar`).
- Per device/IP limit key (OTP-04 SHOULD) still not built.
- Redis Cluster: code/limit keys of a phone are not hash-tagged (single primary assumed). Phones appear inside store keys (not logs).
- Event schema (`precheck`, `verify`, `failure`, `provider_error`, `send`) must match `wab-analytics`.
- API version default `v26.0` comes from Meta's documentation example on 2026-10-26; pin it per environment via `WHATSAPP_API_VERSION`.

## 12. Implementation status
| Item | Status |
|---|---|
| Scaffold, kernel, limits, memory/redis limit stores, fake proof | ✅ |
| Code flow (`createCodeOtp`), `OtpChannel` port, fake channel, fixed code (dev) | ✅ |
| WhatsApp channel (Meta authentication template, error mapping, retry, timeout) | ✅ |
| Signed single-use proof + `provider: 'signed'` | ✅ |
| Code stores memory + Redis | ✅ |
| SMS channel (no vendor chosen) | ✅ |
| Firebase verifier | removed in 0.2.0 |
| Meta delivery-status webhook | ⬜ (server side, not planned yet) |
| Unit tests + coverage gate, loop test, smoke | ✅ |

## 13. Changelog
| Date | Version | Change |
|---|---|---|
| 2026-10-14 | 0.0.0 | Design document created from the BRD; no code yet. |
| 2026-10-18 | 0.1.0 | OTP-001…008: scaffold, kernel, verifier, limits, Redis store, Firebase ID-token adapter + emulator, loop/smoke. |
| 2026-10-18 | 0.1.0 | OTP-009 server-verified SMS skeleton (fake vendor, HMAC code store). |
| 2026-10-19 | 0.1.0 | OTP-010 publish preparation; WAB-Server SRV-034 on the Firebase verifier. |
| 2026-10-26 | 0.2.0 | OTP-011 WhatsApp channel, generic code flow, signed single-use `otpToken`, Redis code store, `OTP_DELIVERY_FAILED`; Firebase verifier and `jose` removed (BREAKING; server adopts in SRV-153). |
