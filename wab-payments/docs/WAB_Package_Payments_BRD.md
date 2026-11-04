# WAB — Business Requirements Document (BRD)
## Package: `wab-payments`

| Field | Value |
|---|---|
| Document | BRD — `wab-payments` package |
| Version | 1.1 (status: built, not used; payments paused) |
| Date | 2026-11-04 |
| Repository | Monorepo folder `wab-payments/` |
| Deliverables | **Node.js package (TypeScript, npm)** + **Kotlin Multiplatform library (Maven)** |
| Consumers | None today. Designed for the WAB backend (server part) and the WAB Customer app (KMP part) when payments resume; future projects |
| Related | Backend BRD, Customer App PRD (S16 Booking Flow), Admin PRD (Finance). Root `BUSINESS_DOMAIN.md` holds the rules; this package holds none of the business rules |
| Status | **Built, not used** (see below) |

---

## 1. Executive Summary
**Status (2026-11-04): built but not used.** Online payment is paused: no gateway is chosen, HyperPay is only a candidate, and WAB-Server does not depend on this package (`PAYMENT_PROVIDER=disabled` in production, `fake` in dev). The apps offer pay on arrival and show online payment as "coming soon". The requirements below describe the package as designed and built.

`wab-payments` is a reusable payment library that hides the payment gateway behind a stable **interface (abstraction)**. The backend and the mobile app call only the interface; the concrete gateway (HyperPay is the first candidate, not final) is an implementation inside the package. Changing the gateway must not require changes in the backend's business code or in the apps — only a new implementation, configuration and a package version bump.

It is the only package with **both** a server part and a mobile (KMP) part, because the payment UI is presented on the device while verification, refunds and webhooks happen on the server.

---

## 2. Business Context
- Designed: customers pay a **deposit** (business-defined %) or the **full amount** online, or choose pay-on-arrival (no package involvement). Today only pay-on-arrival is offered.
- **Phase 1 (designed):** all online payments are collected into the **platform's** gateway account; **refunds are automatic** through the gateway from the platform account; **payouts to businesses are manual** (recorded by admin). Gateway fees are deducted from business payouts.
- **Phase 2 (future):** each business becomes a **sub-merchant** (marketplace / split payments) and money settles **directly** to the business's bank account; refunds come from the business's balance. The package must be designed so Phase 2 is an extension, not a rewrite.
- A failed payment must **never** create a booking; a payment must **never** be charged twice.

---

## 3. Goals
| ID | Goal |
|---|---|
| PG-1 | Swap payment gateways without changing backend business code or app code. |
| PG-2 | Zero duplicate charges; every payment verified server-side before a booking is created. |
| PG-3 | Automatic, trackable refunds (full and partial). |
| PG-4 | Full traceability: every attempt and gateway response recorded for the admin panel. |
| PG-5 | Reusable by other projects (no WAB-specific business rules inside). |
| PG-6 | Ready for Phase 2 (sub-merchants, split settlement) without breaking changes. |

---

## 4. Scope

### 4.1 In Scope (Phase 1)
**Server (Node.js):**
- Create a payment session/checkout for an amount, currency (JOD), reference and customer info.
- Verify payment status (query gateway) and return a normalized result.
- Receive and **verify webhooks** (signature/authenticity) and map them to normalized events.
- **Refund** full or partial amounts; query refund status.
- **Idempotency** on create, capture and refund.
- Normalized errors and gateway response codes/messages (raw response kept for logs).
- Optional: void/cancel a pending session.

**Mobile (KMP):**
- Present the gateway's payment UI using the gateway's native SDKs (Android + iOS) from a common Kotlin interface.
- Return a normalized result to the app (success / failed / cancelled / pending) with references needed for server verification.
- The app never treats a client result as final; the server verification is the source of truth.

### 4.2 Phase 2 (designed for, implemented later)
- Sub-merchant onboarding (submit KYC data, track status: pending / approved / rejected).
- Split payment at charge time (amount per destination; platform commission optional, may be zero).
- Refunds charged to the sub-merchant balance.
- Settlement/payout reporting per sub-merchant.

### 4.3 Out of Scope
- Business rules (deposit %, cancellation windows, refund eligibility) — stay in the backend.
- Subscription billing of salons (paid outside the app).
- Storing card data (handled only by the PCI-compliant gateway).
- Wallets, BNPL, CliQ (can be added later as providers/methods).

---

## 5. Business Requirements
| ID | Requirement | Priority |
|---|---|---|
| PAY-01 | Expose one stable interface for: create session, verify, handle webhook, refund, refund status. | M |
| PAY-02 | Provide the first implementation for the selected gateway (HyperPay candidate). | M |
| PAY-03 | Support JOD with correct decimal handling (3 decimals for JOD where the gateway requires). | M |
| PAY-04 | Every create/refund call accepts an **idempotency key**; repeated calls return the same result without double charging/refunding. | M |
| PAY-05 | Webhooks must be authenticated (signature/secret) before being trusted; unverifiable webhooks are rejected and logged. | M |
| PAY-06 | Provide a status-query fallback so a lost/delayed webhook never leaves a payment unknown. | M |
| PAY-07 | Return normalized statuses: `PENDING`, `SUCCEEDED`, `FAILED`, `CANCELLED`, `REFUND_PENDING`, `REFUNDED`, `REFUND_FAILED`. | M |
| PAY-08 | Return the gateway's raw response code/message alongside normalized fields (for admin "every attempt" analytics). | M |
| PAY-09 | Support full and partial refunds, and multiple partial refunds up to the captured amount. | M |
| PAY-10 | Report gateway fees per transaction when the gateway provides them (needed for salon payouts). | S |
| PAY-11 | KMP library presents the payment UI on Android and iOS via one common API and returns a normalized result. | M |
| PAY-12 | Configuration (keys, entity IDs, environment test/live, URLs) is injected by the consumer; no secrets in the package. | M |
| PAY-13 | Test/sandbox mode supported by configuration. | M |
| PAY-14 | Interfaces designed so Phase 2 (sub-merchant onboarding, split, merchant-funded refunds) can be added without breaking changes. | M |
| PAY-15 | Documentation: README, usage examples for backend and KMP, provider-implementation guide. | M |

---

## 6. Business Rules Enforced by the Consumer (not by the package)
- A booking is created only after the backend verifies `SUCCEEDED`.
- Refund amounts and eligibility follow the booking's policy snapshot (backend).
- Salon rejection/cancellation and auto-cancel → full refund (backend triggers the package).

---

## 7. Non-Functional Requirements
| ID | Area | Requirement |
|---|---|---|
| PNF-01 | Security | Never log card data, secrets or full tokens; mask identifiers in logs. |
| PNF-02 | Security | PCI scope minimized: card entry only inside the gateway UI/SDK. |
| PNF-03 | Reliability | Network timeouts and retries with backoff for status queries (never blind retries for charges without idempotency). |
| PNF-04 | Quality | TypeScript strict mode; Kotlin with explicit types; unit tests with gateway mocks; contract tests per provider. |
| PNF-05 | Versioning | Semantic versioning; breaking changes only in major versions; changelog. |
| PNF-06 | Distribution | Private packages: npm (e.g., GitHub Packages) and Maven for KMP. |
| PNF-07 | Platforms | KMP targets Android + iOS (same minimum versions as the apps). |

---

## 8. Success Metrics
- Zero duplicate charges and zero bookings created from unverified payments.
- 100% of payment attempts recorded with normalized + raw result.
- Refund initiation success rate; median time to `REFUNDED`.
- Gateway switch possible with no backend business-code changes (validated when a second provider is added).

---

## 9. Risks & Mitigations
| Risk | Mitigation |
|---|---|
| Gateway not selected yet | Interface-first design; sandbox provider; pay-on-arrival can launch first |
| Webhook lost or delayed | Status-query fallback + backend reconciliation job |
| Gateway SDK differences on Android/iOS | Common KMP interface with per-platform `actual` wrappers |
| Phase 2 needs different data | Phase 2 operations reserved in the interface design from day one |
| Regulatory exposure of holding funds (Phase 1) | Move to Phase 2 marketplace model; confirm requirements with gateway/legal |

---

## 10. Open Items
| # | Item |
|---|---|
| 1 | Gateway selection, an open owner decision; payments stay paused until then (must support Jordan, JOD, mobile SDKs, refunds API, webhooks; ideally marketplace for Phase 2) |
| 2 | Supported card schemes and local methods |
| 3 | Phase 2 timeline and commission policy (zero now) |
| 4 | Package registry (GitHub Packages assumed) |
