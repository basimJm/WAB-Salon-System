# HyperPay — full integration flow for WAB (server, mobile SDKs, statuses, refunds, subscriptions, settlement, payouts)

> **Status (2026-11-04):** online payment is paused, no gateway is chosen and HyperPay is only a candidate; this flow is not in use.

> Written 2026-10-26 from HyperPay's developer docs (OPPWA platform, <https://hyperpay.docs.oppwa.com/>) and the current WAB code. **✅** = stated in HyperPay docs (link in §13) · **⚠️** = not in the docs / must be confirmed with HyperPay before go-live (§12). Business rules stay in `BUSINESS_DOMAIN.md`; this file is the gateway design. Owner decisions are marked **[DECIDE]**.

---

## 0. What already exists (reuse, do not rebuild)

| Piece | Where | State |
|---|---|---|
| Gateway-neutral port `PaymentProvider` (createSession / clientCheckout / verify / refund / getRefund / handleWebhook / capabilities; Phase 2 `destinations`, `subMerchantId`) | `wab-payments/src/types.ts`, `src/provider.ts` | built, tested |
| HyperPay adapter: `POST /v1/checkouts` (DB), `GET /v1/checkouts/{id}/payment`, refund `POST /v1/payments/{id}` RF with `/v1/query` duplicate check, AES-256-GCM webhooks, result-code groups | `wab-payments/src/hyperpay/*`, `src/constants/hyperpay.ts` | built, **never called the real gateway** |
| Local HyperPay-shaped mock gateway (hosted page + encrypted webhooks) | `wab-payments/src/mock-gateway/*` | built |
| KMP `PaymentLauncher` + Android `HyperPayAndroidBridge`/`CheckoutActivityHost` + iOS `HyperPayCheckoutBridge.swift` | `wab-payments/kmp/*` | built, **not compiled against the real OPP SDK** |
| Server: payments service (start / verify / confirm amount / webhook → query / reconcile pending / orphan refunds), refunds (retry, manual), ledger (CHARGE, GATEWAY_FEE, REFUND, PAYOUT), payouts (manual), admin finance, jobs | `WAB-Server/src/domain/{payments,refunds,ledger,payouts,finance}` | built, runs with `PAYMENT_PROVIDER=fake|disabled` (payments **paused** 2026-10-19) |
| Removed real adapter wiring (HYPERPAY_* env, Redis idempotency, session directory) | `git show eb167788^:WAB-Server/src/providers/payments/real.ts` | restore |
| Customer app: draft → OTP → summary; only Pay-on-arrival enabled | `WAB-Mobile-Customer/feature/booking` (`DraftCoordinator.ENABLED_METHODS`) | CUS-047 / CUS-062 blocked |
| Admin: transactions, refunds, payouts, reconciliation, subscriptions pages | `WAB-Admin-Dashboard/src/presentation/{transactions,refunds,payouts,subscriptions}` | built |

**So the work is: un-pause + extend** (pre-auth/capture, tokens, subscriptions, settlement, chargebacks, webhooks for all types), not a new integration.

---

## 1. Accounts, environments, credentials

| Item | Value / where | Notes |
|---|---|---|
| Test host | `https://eu-test.oppwa.com/` ✅ | base URL **must end with `/`** ✅ |
| Live host | `https://eu-prod.oppwa.com/` ✅ | TLS 1.2+ ✅ |
| Auth | `Authorization: Bearer <access token>` ✅ (back office → Administration → Account data → Merchant/Channel info) | server only; **never in the apps** |
| `entityId` | 32-hex channel id ✅, sent in the **body** for POST, query for GET | ⚠️ **one entity per brand group** is HyperPay practice (cards / MADA / APPLEPAY / GOOGLEPAY) — get test + live ids per brand |
| `testMode` | `INTERNAL` (simulator, default) / `EXTERNAL` (acquirer test) ✅ | **sending it in live → `600.200.701`** ✅ |
| Webhook secret | 64-hex key per webhook ✅ | server only |
| Apple Pay | Apple Merchant ID + payment-processing certificate from a CSR generated in the HyperPay back office (Administration → Mobile Payment) ✅ | ⚠️ separate entity |
| Google Pay | `gatewayMerchantId = entityId` ✅; Google Pay production access request | |

**Server env (proposal; names only, values in Render / prod secrets):** `PAYMENT_PROVIDER=hyperpay|fake|disabled`, `HYPERPAY_BASE_URL`, `HYPERPAY_ACCESS_TOKEN`, `HYPERPAY_ENTITY_CARDS`, `HYPERPAY_ENTITY_MADA`, `HYPERPAY_ENTITY_APPLEPAY`, `HYPERPAY_ENTITY_GOOGLEPAY`, `HYPERPAY_WEBHOOK_SECRET`, `HYPERPAY_TEST_MODE` (dev only, refused in prod), `HYPERPAY_SHOPPER_RESULT_URL` (web only; apps use their scheme), `HYPERPAY_BRANDS` (enabled list).

**Money format ⚠️ (blocking question):** HyperPay `amount` = `[0-9]{1,10}(\.[0-9]{2})?` (2 decimals) ✅, but **JOD has 3 decimals (fils)** and the docs never mention JOD. WAB stores integer fils. Until HyperPay confirms, the adapter must refuse any amount whose fils are not a multiple of 10 (and we price in 10-fils steps), or HyperPay confirms 3-decimal JOD support for our entity.

---

## 2. Integration choice per surface

| Surface | Integration | PCI | Why |
|---|---|---|---|
| Customer app (booking payment) | **Mobile SDK, ready-to-use UI** (`CheckoutActivity` / `OPPCheckoutProvider`) with checkoutId from our server ✅ | SDK collects card in-app → ⚠️ SAQ A-EP-like, confirm with HyperPay/QSA | native 3DS2, Apple/Google Pay, Arabic built-in (`ar` / `ar_AR`) ✅; hybrid not supported → our KMP app wraps native SDKs ✅ |
| Merchant app (subscription card, placements) | same SDK, ready-to-use UI | same | one integration for both apps (`wab-payments` KMP launcher) |
| Admin web (future) | COPYandPAY widget ✅ | SAQ A | hosted fields |
| Server → HyperPay | Server-to-Server **back-office calls only** (CP, RV, RF, registrations payments, query, reports) ✅ | — | we never send card numbers server-side (S2S card entry = full PCI) ✅ |

---

## 3. Booking payment — end-to-end flow (customer)

Two models; **[DECIDE]** which one. Today's `BUSINESS_DOMAIN` §5.6 = **Model A**.

### Model A — Debit at request (current domain)
```mermaid
sequenceDiagram
  participant App as Customer app
  participant API as WAB server
  participant HP as HyperPay
  App->>API: POST /bookings/drafts (holds slot 10 min) → verify-otp
  App->>API: POST /payments {draftId} (deposit or full)
  API->>HP: POST /v1/checkouts entityId, amount, currency=JOD, paymentType=DB, merchantTransactionId=draftId:attempt, customer.*, billing.*
  HP-->>API: id = checkoutId
  API-->>App: {paymentId, checkoutId, brands}
  App->>HP: SDK checkout (card / Apple Pay / Google Pay), 3DS2 native challenge
  HP-->>App: resourcePath (or cancel 9001)
  App->>API: POST /payments/{id}/verify
  API->>HP: GET /v1/checkouts/{checkoutId}/payment  (≤ 9/min live, 2/min test)
  HP-->>API: result.code, id, amount, currency, paymentBrand
  API->>API: check amount/currency/merchantTransactionId; SUCCESS → create booking + ledger CHARGE; PENDING → wait for webhook; REVIEW → hold
  HP-->>API: webhook PAYMENT (encrypted) → decrypt → query → same confirm (idempotent)
```
Salon rejects / auto-cancel / customer cancel while PENDING → **RF** full (§6). Slot lost after payment → RF full + `SLOT_TAKEN` (existing).

### Model B — Pre-authorize at request, capture on approval (recommended if HyperPay confirms windows)
- Checkout with `paymentType=PA` ✅ → booking `PENDING` holds the authorization (money reserved, not taken).
- Salon **approves** → `POST /v1/payments/{paId}` `paymentType=CP` (full or partial) ✅ → ledger CHARGE.
- Salon **rejects** / auto-cancel / customer cancels while pending → `paymentType=RV` (void, customer sees no charge, **no refund fee**) ✅.
- Risk: a PA "usually expires after a couple of days" ✅ (exact window ⚠️ per acquirer). Bookings can be 90 days ahead, but approval normally happens within hours. Rule needed: if still PENDING at `payment.authExpiryHours − margin` → **[DECIDE]** auto-cancel the request (RV) or capture early.
- MADA: PA/CP supported, **no RV after DB** ✅ (RV of a PA ⚠️ confirm).

### Server rules for every confirm (both models)
1. Never trust the app result; always query HyperPay (`GET …/payment` or `/v3/query/{id}`) ✅.
2. Compare `amount`, `currency`, `merchantTransactionId`, `paymentType`, brand with the stored transaction ✅ → mismatch = `AMOUNT_MISMATCH` (existing) + alert.
3. Classify `result.code` with HyperPay's regex groups (§5) — **"success, manual review" (`000.400.0xx`, `000.400.100`) is NOT paid**: keep the slot, alert admin.
4. A checkoutId is single-use after a successful status read and lives ≤ 30 min ✅; a reused checkout can produce extra transactions → reconcile by `merchantTransactionId` ✅.
5. Status endpoints are throttled (2–9/min per id) ✅ → poll with backoff; webhooks are the main signal; `/v3/query` (100/min) for reconciliation ✅.

---

## 4. Webhooks (all types)

| Setting | Value |
|---|---|
| URL | `POST https://<api>/webhooks/payments` (existing route, raw body) |
| Types | **PAYMENTS, REGISTRATIONS, SCHEDULES, RISKS** ✅ |
| Fields | `NON_CUSTOMER_DATA` (minimize personal data) ✅ |
| Wrapper | `JSON` (`{"encryptedBody":"…"}`) ✅ |
| Activation | inactive until **"Click to Test"** passes ✅; public HTTPS, trusted cert ✅ |

Processing (extend `payments.service.handleWebhook`):
1. Decrypt AES-256-GCM: key = hex secret, IV = `X-Initialization-Vector`, tag = `X-Authentication-Tag` ✅. Tag failure → 401, log. (No HMAC/IP allow-list documented ✅.)
2. Answer **2xx within 30 s** ✅ → enqueue (BullMQ) and return; retries come at 1, 2, 4, 8, 15, 30 min, 1 h, then daily for 30 days ✅.
3. Idempotent by `id + result.code` (order/duplicates not guaranteed ⚠️; delivery can lag ~15 min ✅).
4. Route by `type`: `PAYMENT` → query + state machine (§5); `REGISTRATION` (CREATED/UPDATED/DELETED) → card tokens (§7); `SCHEDULE` → subscription schedule events (§8); `RISK` → admin alert.
5. Lenient parsing (new fields appear) ✅.

---

## 5. Status model — every state and how we detect it

**Result-code groups** (HyperPay regex ✅, implemented in `wab-payments/src/hyperpay/codes.ts` — extend):

| Group | Regex | WAB meaning |
|---|---|---|
| Success | `^(000\.000\.|000\.100\.1|000\.[36]|000\.400\.[1][12]0|000\.500\.)` | SUCCEEDED (test success `000.100.110`) |
| Success – manual review | `^(000\.400\.0[^3]|000\.400\.100)` | **REVIEW** (not paid) |
| Pending (session) | `^(000\.200)` (times out ~30 min → `100.396.103`) | PENDING |
| Pending for days | `^(800\.400\.5|100\.400\.500)` | PENDING_EXTERNAL (do not retry) |
| Cancelled by user | `100.396.101` | CANCELLED |
| 3DS / soft decline | `^(000\.400\.[1][0-9][1-9]|000\.400\.2)`, `300.100.100` | FAILED (retry with 3DS) |
| Bank decline (hard) | `^(800\.[17]00|800\.800\.[123])` | FAILED (no retry) |
| Communication error | `^(900\.[1234]00|000\.400\.030)` | **UNKNOWN → query by merchantTransactionId** |
| System / risk / validation | `^(800\.[56]|999\.|600\.1|800\.800\.[84])`, `800\.[32]…`, `^(200\.[123]|…)` | FAILED + alert |
| Duplicate | `800.110.100`, `200.200.106` | look up existing transaction |
| Chargeback | `^(000\.100\.2)` on a `CB` | CHARGEBACK |

**Lifecycle → detection → WAB record**

| State | Detected by | Stored as (proposal) |
|---|---|---|
| Checkout created | our call | transaction `PENDING` (+ `checkoutId`) |
| 3DS challenge / redirect | SDK (native) / `redirect.url` (S2S) | still `PENDING` |
| Authorized (PA) | status/webhook success + `paymentType=PA` | transaction `AUTHORIZED` (new) |
| Captured (CP) / Debited (DB) | success + `paymentType=CP|DB` | `SUCCEEDED` + ledger CHARGE |
| Review | review group | `REVIEW` (new) → admin approve (CP/keep) or RV/RF |
| Failed / cancelled | groups above | `FAILED` / `CANCELLED`, slot released |
| Reversed (RV) | RV success (sync) / linked query | `REVERSED` (new), no ledger charge |
| Refunded partial / full | RF success(es); sum RF vs charge ourselves ✅ | refund `REFUNDED`; booking `refundStatus`; ledger REFUND− |
| Chargeback / reversal | `CB` / `CR` transactions (query, webhook ⚠️), settlement report `CHARGEBACK` / `CHARGEBACK REVERSAL` ✅ | new `disputes` record + ledger ADJUSTMENT−/+ + admin alert + salon hold **[DECIDE]** |
| Settled | settlement report `SETTLED` + `matchedTransactions` MATCHED ✅ (only documented signal; no settlement webhook) | `transactions.settledAt`, `settlementBatchId` |
| Fee | settlement report `FEE` ✅ | ledger `GATEWAY_FEE` (replaces estimates) |
| Paid out to salon | not a HyperPay state (Phase 1 manual) | `payouts.TRANSFERRED` (existing) |
| Token created/deleted | REGISTRATION webhook ✅ | `paymentMethods` (new) |
| Scheduled charge | SCHEDULE + PAYMENT webhooks ✅ | `subscriptions.payments[]` |

Domain change needed: `TransactionStatus` gains `AUTHORIZED`, `REVIEW`, `REVERSED`, `PENDING_EXTERNAL`; `transactions` gains `paymentType`, `settledAt`, `settlementBatchId`, `feeFils`; new `disputes` collection. (BUSINESS_DOMAIN §2/§3.5 update in the implementing PR.)

---

## 6. Refunds, reversals, captures (back office, server only)

`POST /v1/payments/{paymentId}` with `entityId`, `paymentType`, and `amount`+`currency` for CP/RF ✅.

| Case | Call | Rules |
|---|---|---|
| Void before settlement (Model B reject, or same-day DB) | `RV` (no amount) | full only; before connector cut-off; **MADA: no RV after DB** ✅ |
| Capture on approval | `CP` (amount ≤ PA) | partial/multiple allowed (cards, MADA) ✅; `sequence=FINAL` on the last ✅ |
| Refund full/partial (salon reject, cancel policy, no-show, admin, slot lost) | `RF` (amount) | partial + multiple ✅ (cards, Apple Pay also "higher" ✅); window "a few days up to a year" ⚠️ |
| Refund after the refund window | `CD` stand-alone credit (card data) | acquirer-dependent; MADA no CD ✅ → **manual bank transfer** fallback (existing `markManual`) |

Safety (existing + extend): idempotency key per refund (`refundId`), **query by `merchantTransactionId` before any retry** (no idempotent replay ✅), never blind-retry; `REFUND_PENDING` until success code; retry job `refunds-retry` (5 min) with `refund.maxRetries`; delayed alert after `refund.delayAlertHours`; over-refund guard on our side (sum of RF ≤ charged).

---

## 7. Saved cards (tokenization) — optional for customers, required for subscriptions

| Step | Call ✅ |
|---|---|
| Save during a payment | checkout/payment with `createRegistration=true`, `standingInstruction.mode=INITIAL`, `source=CIT`, `type=UNSCHEDULED` → response `registrationId` |
| Save without paying | checkout with `createRegistration=true`, no `paymentType` (SDK `registerTransaction`) |
| One-click pay | checkout with `registrations[0].id=…`, `source=CIT`, `mode=REPEATED`, `type=UNSCHEDULED`; SDK `TokenPaymentParams` (CVV per brand rule) |
| Delete | `DELETE /v1/registrations/{id}` (stops immediately) |
| Extend | `POST /v1/registrations/{id}/extendlife` (+24 months) |

Store only `registrationId`, brand, last4, expiry, `initialTransactionId` (`resultDetails.CardholderInitiatedTransactionID`) — never PAN/CVV. Tokens kept 14 months after card expiry ✅.

---

## 8. Subscriptions (salon monthly plan) and one-off purchases (Recommended placement)

Today salons pay **outside the app** (`BUSINESS_DOMAIN` §5.13). **[DECIDE]** moving to in-app card billing:

1. **Card on file (merchant app, owner only):** checkout `paymentType=PA`, `amount=0.00`, `createRegistration=true`, `standingInstruction.type=RECURRING`, `mode=INITIAL`, `source=CIT`, `recurringType=SUBSCRIPTION`, with `expiry` + `frequency` (3DS mandatory on the initial) ✅. Mastercard needs `recurringType` on **every** CIT/MIT ✅.
2. **Monthly charge — recommended: our scheduler** (existing `subscriptions:check` job, BullMQ): `POST /v1/registrations/{id}/payments` `paymentType=DB`, `type=RECURRING`, `mode=REPEATED`, `source=MIT`, `recurringType=SUBSCRIPTION`, `merchantTransactionId=sub:{salonId}:{period}` ✅ → success → `subscriptions.payments[]` + period extended; failure → our retry plan (e.g. day 1, 3, 7) + notify owner to update the card; subscription `EXPIRED` per existing rules.
   *Alternative:* HyperPay scheduler `POST /scheduling/v1/schedules` (cron fields), reschedule / `DELETE` ✅ and MAC Scheduler retries (contract needed) ✅ — less control over our trial/expiry rules.
3. **Recommended placement purchase:** one-off `DB` checkout from the merchant app (or saved card CIT `REPEATED`) → on success create the placement (today admin-entered).
4. Card expiry: no account updater documented ⚠️ → on decline, ask the owner to add a new card (new CIT INITIAL).

---

## 9. Settlement, fees, reconciliation, chargebacks

- **Daily job `payments-settlement`** (new): `GET /reports/v1/reconciliations/aggregations?entityId&date.from&date.to&currency` → for each aggregation `GET /reports/v2/reconciliations/aggregations/{id}?pageNo=n` ✅ → records with `reconciliationType` `SETTLED | FEE | CHARGEBACK | CHARGEBACK REVERSAL` and `matchedTransactions` (`MATCHED | NOT_MATCHED | MULTIPLE_MATCHES`) ✅. Needs **settlement matching enabled by the account manager** and connector support ⚠️.
  - SETTLED → `transactions.settledAt`; FEE → ledger `GATEWAY_FEE` (real fee); CHARGEBACK → dispute + ledger; NOT_MATCHED / MULTIPLE → admin reconciliation queue (existing `/admin/v1/finance/reconciliation`).
- **Existing jobs kept:** `payments-reconcile` (5 min, pending → `/v3/query` by `merchantTransactionId`, orphan refunds), `ledger-reconcile` (02:20).
- **Chargebacks:** `CB` linked to the DB, code `000.100.2xx` ✅; reason in settlement `ReasonCode/ReasonDesc` ✅; fee stays with the merchant even if reversed ✅. WAB: dispute record, ledger debit, deduct from the salon's next payout **[DECIDE]**, admin + salon notification.

---

## 10. Payouts to salons

- **Phase 1 (current, keep):** WAB collects; payouts are **manual bank transfers** recorded in admin (`/admin/v1/payouts`, ledger PAYOUT−). Net = charges − refunds − fees − chargebacks.
- HyperPay `CD` pays a **card**, not a bank account ✅ → not a salon payout.
- `marketPlace.sellers[n]` / `cart.items[n].sellerId` / `merchant.submerchantId` are **data fields** (payfac descriptors), **not split settlement** ✅. Send `marketPlace.sellers[0].id=salonId` now for future reporting.
- **Phase 2:** HyperPay **HyperSplit** (bank payouts "within 24 hours") ⚠️ — API not in the developer docs, Jordan/JOD coverage unknown. Our port already carries `destinations` / `subMerchantId`; a `HyperSplitPayoutAdapter` would implement payouts when confirmed.

---

## 11. Mobile SDK integration (KMP)

| Topic | Android | iOS |
|---|---|---|
| Delivery | AARs from HyperPay (`oppwa.mobile.aar`, `ipworks3ds_sdk.aar`) in `libs/` + `dependencies.txt` deps; viewBinding on ✅ | `OPPWAMobile.xcframework` + `ipworks3ds_sdk.xcframework`, Embed & Sign ✅ (no Maven/CocoaPods/SPM) |
| Min OS | API 24 ✅ | iOS 15 (docs disagree 13/15 → use 15) ✅ |
| Prod 3DS lib | `ipworks3ds_sdk_deploy.aar` in **prod variants only** (refuses debugger/emulator/side-loaded builds) ✅ | `_deploy` xcframework in Release-Prod only ✅ |
| UI | ready-to-use: `CheckoutActivityResultContract` + `CheckoutSettings(checkoutId, brands, ProviderMode)` ✅ | `OPPCheckoutProvider(paymentProvider:checkoutID:settings:)` kept strongly referenced ✅ |
| Language | `setLocale("ar_AR")` ✅ (RTL ⚠️ test) | `language = "ar"` ✅ |
| Async return | intent-filter scheme, `singleTask`, `onNewIntent` (API<29 ordering) ✅ | URL type starting with bundle id, e.g. `com.fab.wab.customer.payments`, + `LSApplicationQueriesSchemes`; set `shopperResultURL` **in the app only** ✅ |
| 3DS2 | native, SDK-handled; `ThreeDS2Service.wasTransactionKilled()` → ask server ✅ | native ✅ |
| Wallets | Google Pay (`play-services-wallet`, `GOOGLEPAY`, gatewayMerchantId = entityId) ✅ | Apple Pay (`APPLEPAY`, `merchantCapabilities` incl. `threeDSecure`) ✅ |
| Cancel / errors | `isCanceled`, codes 9001 cancel, 6000/6001 3DS, 4006 unknown → server query ✅ | `cancelHandler`, `OPPErrorCode` ✅ |

KMP shape (existing `wab-payments/kmp`): `PaymentLauncher.launch(CheckoutSession{checkoutId, brands, mode}) → PaymentResult(ClientCompleted|Cancelled|Failed)`; the result only triggers `POST /payments/{id}/verify`. Customer app: enable `DEPOSIT`/`FULL_ONLINE` in `DraftCoordinator`, add the pay step (CUS-047), Arabic/English, dismiss checkout on background ✅. Merchant app: card-on-file + placement purchase screens. Test cards: VISA 4200000000000000 (no 3DS) / 4200000000000042 (challenge), MASTER 5454545454545454 / 5200000000000015, AMEX 377777777777770 ✅; 3DS flags `customParameters[3DS2_enrolled]`, `[3DS2_flow]` (test only) ✅.

---

## 12. Must confirm with HyperPay before building (send this list)

1. **JOD**: 3-decimal amounts accepted? exact format for 1.250 JOD.
2. Jordan acquirer + enabled brands (VISA, MASTER, AMEX?, Apple Pay, Google Pay, **CliQ**, MADA not relevant?) and **entity per brand** (test + live).
3. PA validity window, RV cut-off, RF window per brand on our acquirer; is **RV of a PA** allowed for each brand.
4. Webhooks: do **refunds and chargebacks** produce PAYMENT webhooks; ordering / duplicates.
5. **Settlement matching** enabled + settlement/fee report availability for our connector; settlement timing; fees.
6. Current **mobile SDK version**, download, **R8/ProGuard rules**, PCI SAQ level for the SDK flow.
7. Card-on-file / recurring enabled for our MID (Mastercard `recurringType`), MAC Scheduler need.
8. **HyperSplit** in Jordan (Phase 2 payouts), API docs access.
9. Account updater / network tokens for subscription cards.

---

## 13. Implementation plan (tasks; WAB rules apply: branch per task, tests, gates)

| # | Project | Task |
|---|---|---|
| 1 | owner | HyperPay merchant account (test), entities per brand, access token, webhook secret, Apple Merchant ID + cert; answers to §12 |
| 2 | wab-payments | Extend adapter: PA/CP/RV, registrations (create/pay/delete/extend), `/v3/query`, all webhook types, review/pending-external/communication-error states, JOD amount guard, entity-per-brand routing, settlement report client; mock gateway extended; tests |
| 3 | WAB-Server | Restore real provider (`PAYMENT_PROVIDER=hyperpay`), env + config checks; domain: new transaction states, disputes, settled/fee fields; Model A/B per decision; webhook queue; settlement job; chargeback handling; subscription billing job; placement purchase; OpenAPI + contract bump; BUSINESS_DOMAIN update |
| 4 | wab-payments/kmp | Compile Android/iOS bridges against the real SDK (dev + `_deploy` libs per variant), Apple Pay / Google Pay, R8 rules |
| 5 | Customer app | CUS-047 pay step (deposit / full), result → verify, saved cards (optional), CUS-062 device tests |
| 6 | Merchant app | subscription card on file, placement purchase, payment history |
| 7 | Admin | review queue (REVIEW), disputes, settlement view, real fees in reconciliation |
| 8 | All | sandbox end-to-end: success, 3DS challenge, decline, cancel, pending, refund partial/full, RV, chargeback (simulated), settlement report (testMode INTERNAL dummy data ✅) → go-live review with HyperPay account manager ✅ |

**Owner decisions needed:** Model A (debit) vs **Model B (pre-auth + capture)**; in-app salon subscription billing (yes/no) and placement purchases in app; chargeback handling vs salon payouts; saved cards for customers.

---

## 14. Sources (HyperPay docs, read 2026-10-26)

Parameters & throttling <https://hyperpay.docs.oppwa.com/reference/parameters> · Result codes <https://hyperpay.docs.oppwa.com/reference/resultCodes> · COPYandPAY <https://hyperpay.docs.oppwa.com/integrations/widget> · Server-to-Server <https://hyperpay.docs.oppwa.com/integrations/server-to-server> · Back office (CP/RV/RF/CD) <https://hyperpay.docs.oppwa.com/integrations/backoffice> · 3DS parameters <https://hyperpay.docs.oppwa.com/tutorials/threeDSecure/Parameters> · 3DS testing <https://hyperpay.docs.oppwa.com/tutorials/threeDSecure/TestingGuide> · Webhooks <https://hyperpay.docs.oppwa.com/tutorials/webhooks> · Tokens <https://hyperpay.docs.oppwa.com/integrations/server-to-server/registrationtokens> · Card on file <https://hyperpay.docs.oppwa.com/tutorials/card-on-file> · Subscriptions <https://hyperpay.docs.oppwa.com/integrations/subscriptions> · MAC Scheduler <https://hyperpay.docs.oppwa.com/integrations/mac-control/mac-scheduler> · Transaction reports <https://hyperpay.docs.oppwa.com/integrations/reporting/transaction> · Settlement reports <https://hyperpay.docs.oppwa.com/integrations/reporting/settlement> · Data retention <https://hyperpay.docs.oppwa.com/reference/data-retention-policy> · Mobile SDK <https://hyperpay.docs.oppwa.com/integrations/mobile-sdk> (first integration, custom UI, tokenization, 3DS new flow, async payments, Apple Pay, Google Pay, error codes) · Going live <https://hyperpay.docs.oppwa.com/support/goinglive> · HyperSplit <https://www.hyperpay.com/hypersplit/>.
