# wab-payments — Integration (technical implementation document)

> Single source of truth for **how this package is built and how any project uses it**. Updated after every commit/push that changes the implementation (Rules.md §14). Status legend: ✅ done · 🚧 in progress · ⬜ not started.

| Field | Value |
|---|---|
| Package | `wab-payments` |
| Type | Node.js package (TypeScript, npm) + Kotlin Multiplatform library (Maven) |
| BRD | `docs/WAB_Package_Payments_BRD.md` |
| Version | 0.0.0 (design only — no code yet) |
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
| 2026-10-18 | 0.1.0 | PAY-006: HyperPay refund + getRefund + SessionDirectory (prod requires a shared directory). |
| 2026-10-18 | 0.1.0 | PAY-005: HyperPay adapter part 1 (checkout, verify, result codes), HTTP client, mock-gateway provider. |
| 2026-10-18 | 0.1.0 | PAY-004: mock OPP gateway on localhost + notification crypto (encrypt/decrypt AES-256-GCM). |
| 2026-10-18 | 0.1.0 | PAY-003: port + facade + fake + idempotency store + createPayments. |
| 2026-10-18 | 0.1.0 | PAY-002: kernel: PaymentSdkError, options + prod rules, redacting logger, money, retry. |
| 2026-10-18 | 0.1.0 | PAY-001 scaffold (`@wab/payments`). Gateway decided: HyperPay (OPP/COPYandPAY). |
| 2026-10-14 | 0.0.0 | Design document created from the BRD; no code yet. |
