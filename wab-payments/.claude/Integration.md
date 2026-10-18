# wab-payments — Integration (technical implementation document)

> Single source of truth for **how this package is built and how any project uses it**. Updated after every commit/push that changes the implementation (Rules.md §14). Status legend: ✅ done · 🚧 in progress · ⬜ not started.

| Field | Value |
|---|---|
| Package | `wab-payments` |
| Type | Node.js package (TypeScript, npm) + Kotlin Multiplatform library (Maven) |
| BRD | `docs/WAB_Package_Payments_BRD.md` |
| Version | 0.1.0 (Node part implemented; KMP part in `kmp/`) |
| Node | >= 22, TypeScript strict, ESM + CJS builds |
| Server counterpart in WAB | `WAB-Server/src/providers/payments` (interface already in WAB-Server, fake only today) |

## 1. Purpose and boundaries
Zero duplicate charges, server-side verification before any booking, automatic trackable refunds, full traceability (raw gateway response kept for logs), gateway-independent and method-independent. Phase 2 (sub-merchants, split settlement) is an extension of the same port (`destinations`, `subMerchantId` optional fields).

**Not in this package:** Business rules (deposit %, cancellation windows, refund eligibility), salon subscription billing, card storage (PCI is the gateway), wallets/BNPL until added as methods.

## 2. Architecture
Ports and adapters:
```
consumer ──> createPayments(options) ──> PaymentProvider (port, stable interface)
                                       ├── adapters/fake   (dev: local/fake)
                                       ├── adapters/mock-gateway
                                       ├── adapters/hyperpay
                                       ├── adapters/<next gateway>
                                       ├── adapters/kmp-launcher
```
- The factory picks the adapter from `options.provider` (+ `options.environment`). Unknown provider → `ConfigError`.
- Adapters never leak vendor types through the port; vendor responses are normalized (§5).
- Shared kernel: `errors/`, `config/` (zod-validated options), `http/` (timeouts, retry with backoff + jitter), `logger` (injected, redacting), `events` (optional hook for analytics).

## 3. Public API (port)
```ts
interface PaymentProvider {
  createSession(r:{idempotencyKey;amountFils;reference;currency?;customer?;method?;destinations?}): Promise<PaymentSession>;
  verify(sessionId): Promise<{sessionId;status:PaymentStatus;amountFils;gatewayCode;gatewayMessage;feeFils?;raw}>;
  refund(r:{idempotencyKey;sessionId;amountFils}): Promise<RefundResult>;   // full or partial
  getRefund(refundId): Promise<RefundResult>;
  handleWebhook(i:{rawBody:string; signature:string}): Promise<PaymentWebhookEvent>;  // throws on bad signature
  cancelSession?(sessionId): Promise<void>;
}
createPayments(options): PaymentProvider      // amounts are integer fils (1 JOD = 1000 fils)
```

## 4. Configuration
| Option / env key | Dev | Prod | Notes |
|---|---|---|---|
| `provider` | `fake`/`mock-gateway` | gateway adapter id | |
| `environment` | `dev` | `prod` | prod refuses fake/mock |
| `gateway.baseUrl` | `http://localhost:<port>` (consumer) | https vendor URL | |
| `gateway.credentials` (entity id, token, webhook secret) | test values | secrets | never logged |
| `currency` | JOD | JOD | |
| `methods` (enabled list) | any | enabled list | per adapter |
| `webhook.signatureHeader`, `tolerance` | consumer | consumer | |
| `timeoutMs`, `retry`, `idempotency.store/ttl` | defaults | defaults | |

Rules: values come from the consumer (options/env), defaults live in `constants/`, prod refuses the fake adapter and missing secrets (`ConfigError` naming the key only).

## 5. Status and result mapping (every vendor status handled)
| Gateway outcome | Normalized `PaymentStatus` |
|---|---|
| success codes | `SUCCEEDED` |
| pending / 3DS in progress | `PENDING` |
| declined / insufficient funds / expired card / risk | `FAILED` (+ gatewayCode/message) |
| user cancelled / timeout on checkout | `CANCELLED` |
| unknown code | `UNKNOWN` (logged raw; never success) |
| refund accepted / pending / rejected | `REFUNDED` / `PENDING` / `FAILED` |
| bad webhook signature | throws `PAYMENT_WEBHOOK_INVALID` |
| amount mismatch on verify | surfaced as `amountFils` ≠ requested (caller marks FAILED) |

Unknown vendor value → `UNKNOWN` + raw response logged (redacted), never success.

## 6. Error model
All failures extend `PaymentError` with `code`, `retryable`, `cause`, `details` (no secrets).
| Code | When | Retryable |
|---|---|---|
| `PAYMENT_GATEWAY_UNAVAILABLE` | network/5xx/timeout | yes |
| `PAYMENT_AUTH_FAILED` | credentials rejected | no |
| `PAYMENT_WEBHOOK_INVALID` | signature/timestamp invalid | no |
| `PAYMENT_DUPLICATE` | same key, different payload | no |
| `PAYMENT_REFUND_EXCEEDS` | refund > paid | no |
| `PAYMENT_METHOD_UNSUPPORTED` | method not enabled for adapter | no |
Common codes for every package: `CONFIG_INVALID`, `VALIDATION_FAILED`, `AUTH_FAILED`, `NETWORK_ERROR`, `TIMEOUT`, `RATE_LIMITED`, `VENDOR_ERROR`, `MALFORMED_RESPONSE`, `UNKNOWN`.

## 7. Environments
- **dev (localhost):** `fake` scenarios or `mock-gateway` HTTP simulator on localhost; no real credentials; KMP launcher fake returns scripted results.
- **prod:** Real gateway adapter with https endpoint and secrets; fake/mock refused; webhook signature mandatory.

## 8. Performance notes
Keep-alive HTTP agent; idempotency check before network call; timeouts and bounded retries only for safe/idempotent calls; refunds polled by caller job, not blocking requests.

## 9. Testing
- Unit tests: one test file per source file, every exported function: success, each error code, each status mapping, boundaries, idempotent replay. Vendor SDK/HTTP mocked. Coverage gate: 100 % functions, >= 95 % lines/branches.
- Loop test (`npm run test:loop`): 500 iterations of create → verify → refund (full/partial) → webhook replay with concurrency 20 and injected gateway failures; asserts one charge per idempotency key, refunds never exceed paid, webhook replay is a no-op.
- Consumer smoke test: install the built tarball into a temp project and call the factory.

## 10. Adoption guide (any project)
```ts
const payments = createPayments({ environment: "dev", provider: "fake", currency: "JOD" });
const s = await payments.createSession({ idempotencyKey, amountFils: 12500, reference: bookingDraftId });
```
How WAB-Server adopts it: replace `WAB-Server/src/providers/payments` real mode (`*_PROVIDER=real`) with this package; the interface is already compatible (see §3).

## 11. Open questions / assumed-missing requirements
- Gateway not final (HyperPay candidate): credentials, webhook format/header, 3DS flow, refund API specifics unknown.
- KMP SDK packaging (Maven coordinates, minimum Android/iOS versions) and gateway native SDK licences.
- Partial-refund rules per gateway; settlement fee reporting field names.
- Phase 2 sub-merchant KYC fields.
- Whether `amountFils` or decimal strings cross the KMP boundary (decision: fils).

## 12. Implementation status
| Item | Status |
|---|---|
| Project scaffold (tsconfig strict, eslint, prettier, jest, build, scripts) | ✅ |
| Shared kernel (errors, config, http/retry, logger) | ⬜ |
| Adapter: fake — scenario-driven (success/fail/cancel/pending) for dev/tests | ⬜ |
| Adapter: mock-gateway — local HTTP gateway simulator on localhost (OPP-compatible) | ✅ |
| Adapter: hyperpay — checkout + verify done, refunds/webhooks next | 🚧 |
| Adapter: <next gateway> — any other gateway: implement PaymentGateway port + register | ⬜ |
| Adapter: kmp-launcher — Android/iOS payment UI wrapper | ⬜ |
| Unit tests + coverage gate | ⬜ |
| Loop test | ⬜ |
| README + consumer smoke test | ⬜ |

## 13. Changelog
| Date | Version | Change |
|---|---|---|
| 2026-10-18 | 0.1.0 | PAY-014: iOS bridge contract + Swift reference. |
| 2026-10-18 | 0.1.0 | PAY-013: Android HyperPay bridge + SdkResult mapping. |
| 2026-10-18 | 0.1.0 | PAY-012: publish prep + clientCheckout + server integration. |
| 2026-10-18 | 0.1.0 | PAY-011: mock launcher + platform in-app browsers. |
| 2026-10-18 | 0.1.0 | PAY-010: KMP ports, fake launcher, shared native launcher, tests. |
| 2026-10-18 | 0.1.0 | PAY-009: quality gate, README, Integration reference, webhook event id fix. |
| 2026-10-18 | 0.1.0 | PAY-008: Phase 2 port fields + capability flags. |
| 2026-10-18 | 0.1.0 | PAY-007: webhook decryption/normalization + replay flag. |
| 2026-10-18 | 0.1.0 | PAY-006: HyperPay refund + getRefund + SessionDirectory (prod requires a shared directory). |
| 2026-10-18 | 0.1.0 | PAY-005: HyperPay adapter part 1 (checkout, verify, result codes), HTTP client, mock-gateway provider. |
| 2026-10-18 | 0.1.0 | PAY-004: mock OPP gateway on localhost + notification crypto (encrypt/decrypt AES-256-GCM). |
| 2026-10-18 | 0.1.0 | PAY-003: port + facade + fake + idempotency store + createPayments. |
| 2026-10-18 | 0.1.0 | PAY-002: kernel: PaymentSdkError, options + prod rules, redacting logger, money, retry. |
| 2026-10-18 | 0.1.0 | PAY-001 scaffold (`@wab/payments`). Gateway decided: HyperPay (OPP/COPYandPAY). |
| 2026-10-14 | 0.0.0 | Design document created from the BRD; no code yet. |

## 14. Implementation reference (current, 0.1.0)

**Gateway decision (owner, 2026-10-18): HyperPay (OPP / COPYandPAY).** Everything below the line "UNVERIFIED" was built from the public OPP documentation and fixtures; no real HyperPay call has been made.

### Layers
`createPayments(options)` -> facade (`provider.ts`: validation, idempotency, bounded retries for reads, redacting logger, webhook replay flag) -> `PaymentGateway` adapter (`adapters/fake`, `hyperpay` also used for `mock-gateway`, `custom`).

### Options (see `config/options.ts`)
`environment`, `provider`, `currency` (JOD), `methods` (default `['CARD']`), `timeoutMs`, `retry`, `idempotency.{store,ttlSec}`, `directory`, `gateway` (custom), `http` (replace the network layer), `logger`, `hyperpay.{baseUrl,entityId,accessToken,webhookDecryptionKey,shopperResultUrl,testMode,brands,amountDecimals,integrity}`, `mockGateway.{baseUrl,entityId,accessToken,shopperResultUrl,webhookDecryptionKey}`.
Prod rules (config error naming keys only): no `fake`/`mock-gateway`; shared `idempotency.store`; HyperPay needs `directory`, https base URL on a non-sandbox host, no `testMode`, `webhookDecryptionKey`, https-or-custom-scheme return URL.

### HyperPay adapter
| Port call | OPP call | Notes |
|---|---|---|
| `createSession` | `POST /v1/checkouts` (form) | amount as decimal string (`amountDecimals` default 3, 2 only if exact), `paymentType=DB`, `merchantTransactionId=reference`, `customParameters[idempotencyKey]`, `integrity=true`, `shopperResultUrl`; result must be `000.200.100`. Returns `client` (checkoutId, brands, widgetScriptUrl, integrity) |
| `verify` | `GET /v1/checkouts/{id}/payment?entityId=` | "no payment yet" (`200.300.404`, HTTP 200 or 404) = `PENDING`, amount 0; success remembers checkout->payment in the directory |
| `refund` | `GET /v1/query?merchantTransactionId=RF:<key>` then `POST /v1/payments/{paymentId}` `paymentType=RF` | duplicate-protected; read-only steps retried, the POST never |
| `getRefund` | `GET /v1/payments/{refundId}` | must be `paymentType=RF` |
| `handleWebhook` | AES-256-GCM: key = portal key (hex), IV = `X-Initialization-Vector`, tag = `X-Authentication-Tag`, body = hex or `{"encryptedBody"}` | event id = hash of stable fields, so resends are `replayed` |

Result codes (`constants/resultCodes.ts`, first match wins): SUCCESS -> SUCCEEDED; REVIEW/PENDING/NO_PAYMENT -> PENDING; CANCELLED -> CANCELLED; REJECTED/COMMUNICATION/SYSTEM -> FAILED; UNCERTAIN/unknown -> UNKNOWN; AUTH/THROTTLED/NOT_FOUND/INVALID_REQUEST -> thrown errors. Refund: 700.400.2xx -> `PAYMENT_REFUND_EXCEEDS`, 700.400.7xx -> validation error.
HTTP: 401/403 `PAYMENT_AUTH_FAILED`; 408 `PAY_TIMEOUT`; 429 `PAY_RATE_LIMITED`; 5xx `PAYMENT_GATEWAY_UNAVAILABLE` (all retryable); other 4xx `PAY_VENDOR_ERROR`; bad JSON `PAY_MALFORMED_RESPONSE`.

### Mock gateway
`@wab/payments/mock-gateway` / `npm run mock-gateway` (env `MOCK_GATEWAY_*`): OPP-compatible server with hosted pay page, refunds, query, encrypted notifications, failure injection. `provider: 'mock-gateway'` = HyperPay adapter against it.

### Error codes
`PAY_CONFIG_INVALID, PAY_VALIDATION_FAILED, PAYMENT_AUTH_FAILED, PAYMENT_GATEWAY_UNAVAILABLE, PAYMENT_WEBHOOK_INVALID, PAYMENT_DUPLICATE, PAYMENT_DUPLICATE_IN_PROGRESS, PAYMENT_REFUND_EXCEEDS, PAYMENT_METHOD_UNSUPPORTED, PAYMENT_FEATURE_UNSUPPORTED, PAYMENT_SESSION_NOT_FOUND, PAYMENT_REFUND_NOT_FOUND, PAY_NETWORK_ERROR, PAY_TIMEOUT, PAY_RATE_LIMITED, PAY_VENDOR_ERROR, PAY_MALFORMED_RESPONSE, PAY_UNKNOWN`.

### UNVERIFIED against real HyperPay / owner inputs
1. Result-code regexes (from memory of the OPP reference; docs host unreachable from the build sandbox).
2. JOD amount decimals (3 assumed; `amountDecimals: 2` if the account needs it); JOD enabled on the entity; brands (`VISA MASTER`) per entity.
3. Webhook body shape (hex vs `{encryptedBody}`), presence of `ndc` in the payload, resend payload equality.
4. `/v1/query` by `merchantTransactionId` availability for RF duplicate protection; 404 vs 200 answers for unpaid checkouts.
5. Gateway fee is not in the status answer (`feeFils` omitted): needs the settlement report API (open).
6. Owner inputs: entityId per environment, access tokens, webhook decryption key, return URL / app scheme, registry token.

## 15. KMP client library (`kmp/`, Maven `com.wab:payments`)

Gradle build (same toolchain as the customer app: Kotlin 2.3.20, AGP 9.1.0, `com.android.kotlin.multiplatform.library`), module `:payments`, targets Android + iosArm64/iosSimulatorArm64/iosX64, `explicitApi()`, warnings as errors. No business rules; no card data ever crosses the library (the gateway UI collects it).

### API used by the customer app (CUS-047 / CUS-062)
```kotlin
// 1. POST /payments -> server creates the session with @wab/payments; map its `client` part:
val session = CheckoutSession(provider, PaymentEnvironment.fromServer(env)!!, sessionId, checkoutId, brands, shopperResultUrl, amountFils)
// 2. open the gateway UI (DI binds one PaymentLauncher: DelegatingPaymentLauncher by provider)
when (val r = launcher.launch(session)) {
    is PaymentResult.ClientCompleted -> api.verify(r.sessionId)   // server-side verify decides; NEVER trust the client
    is PaymentResult.Cancelled -> backToSummary()
    is PaymentResult.Failed -> show(r.error)                      // PaymentError(code, message, retryable, sdkCode)
}
```
Ports: `PaymentLauncher` (alias `CheckoutLauncher`), `DelegatingPaymentLauncher`, `FakePaymentLauncher` (tests/previews), `NativeCheckoutBridge` + `NativeCheckoutLauncher` (shared half of the Android and iOS HyperPay launchers), `ShopperResult` (return-URL parsing), `PaymentError`/`PaymentErrorCode`, `Redaction.scrub`.

Verification done here: commonMain + commonTest compile with warnings-as-errors and the unit tests pass on a JVM-only harness (`kotlin("jvm")` over the same source dirs). NOT verified here: the Android/iOS targets (Google Maven and Xcode are unavailable in the sandbox): CI/mac must run `./gradlew :payments:allTests`.

### Dev launcher (PAY-011)
`MockGatewayLauncher(browser: InAppBrowser)` opens `CheckoutSession.checkoutUrl` (the OPP mock's hosted page, returned by the server in dev as `client.checkoutUrl`) and parses the redirect to `shopperResultUrl`. Browsers: Android `WebViewInAppBrowser(context)` (WebView activity declared in the library manifest; a debug network-security-config must allow the cleartext mock host), iOS `WebAuthInAppBrowser()` (`ASWebAuthenticationSession`; the return URL must use a custom scheme such as `wab://payment/result`). Bind it for provider `mock-gateway` in `DelegatingPaymentLauncher`. The Android and iOS browser classes are NOT compiled here.

### Android HyperPay bridge (PAY-013)
Module `:payments-hyperpay-android` (`com.wab:payments-hyperpay-android`): `HyperPayAndroidBridge(context, CheckoutActivityHost)` opens the OPP ready-to-use `CheckoutActivity` with `CheckoutSettings(checkoutId, brands, TEST|LIVE)` + `shopperResultUrl` and maps the activity result through the platform-neutral `sdkOutcome(...)` (common, tested). `ActivityResultRegistryHost(registry)` is the stock `CheckoutActivityHost`. The OPP SDK is `compileOnly` (version/repository are owner inputs in `kmp/gradle.properties`); the app declares the 3-DS return intent filter (`kmp/docs/android.md`). UNVERIFIED: the module is not compiled here and the OPP class/constant names come from the vendor documentation.

### iOS HyperPay bridge (PAY-014)
`NativeCheckoutBridge` is implemented in Swift on OPPWAMobile (`kmp/ios/HyperPayCheckoutBridge.swift`, reference file: copy into the app) and handed to `hyperPayIosLauncher(bridge)` (iosMain). `IosOutcomes` gives Swift three constructors (completed / cancelled / failed) over the shared `sdkOutcome` mapping. 3-D Secure returns through the app's URL scheme: forward URLs to `bridge.handleReturn(url:)`. Framework name `WabPayments` (static). UNVERIFIED: no Xcode/OPP framework here, nothing iOS was compiled; see `kmp/docs/ios.md`.
