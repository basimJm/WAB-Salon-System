# WAB — Business Requirements Document (BRD)
## Package: `wab-otp`

| Field | Value |
|---|---|
| Document | BRD — `wab-otp` package |
| Version | 1.0 |
| Date | October 2026 |
| Repository | Separate repository `wab-otp` |
| Deliverable | **Node.js package (TypeScript, npm)** — server only |
| Consumers | WAB backend (customer and merchant auth, phone change, booking confirmation, bank-details change); future projects |
| Related | Backend BRD, Customer App PRD (S13), Merchant App PRD (M03) |

---

## 1. Executive Summary
`wab-otp` is a server-side library that verifies one-time-password results and enforces the platform's OTP abuse rules behind a provider-independent **interface**. The first provider is **Firebase Authentication (phone / SMS)**: the mobile apps send and confirm the code with Firebase, then send a **Firebase ID token** to the backend; `wab-otp` verifies that token and that it belongs to the expected phone number.

The package also owns the **platform rate limits** (on top of the provider's own limits) and exposes the **OTP configuration** the apps need (`otpLength`, resend timing). If the provider changes later (e.g., a local SMS provider where the server sends and checks codes), the backend keeps calling the same interface.

---

## 2. Business Context
OTP is used for: customer login/registration, merchant member login, salon registration, phone-number change, booking confirmation, and changing salon bank details. There are no passwords for customers or merchants, so OTP is the security gate of the platform. OTP SMS has a direct cost, so abuse must be limited.

---

## 3. Goals
| ID | Goal |
|---|---|
| OG-1 | Securely confirm that the user controls the phone number before any sensitive action. |
| OG-2 | Prevent abuse and SMS cost spikes with platform-level limits and blocks. |
| OG-3 | Switch OTP provider without changing backend business code. |
| OG-4 | Keep OTP behavior configurable by admin (length, timing, limits). |

---

## 4. Scope

### 4.1 In Scope
- **Pre-check** before the app sends an OTP: is this phone (and device/IP) allowed now? Return `{ allowed, otpLength, resendAfterSeconds, blockedUntil? }`.
- **Verify** a provider proof (Phase 1: Firebase ID token) and confirm the verified phone matches the expected phone and purpose.
- **Record attempts:** requests, successes, wrong-code reports, expirations, provider errors.
- **Limits & blocks:**
  - 5 OTP requests within 5 minutes → blocked 15 minutes.
  - 5 wrong codes → blocked 15 minutes.
  - Resend allowed after 60 seconds.
  - All values configurable (admin settings).
- **Purposes:** `LOGIN`, `REGISTER`, `CHANGE_PHONE`, `BOOKING_CONFIRMATION`, `BANK_DETAILS`, `SALON_REGISTER` (extensible).
- **Provider abstraction** supporting two models:
  1. Client-verified (Firebase): app sends/verifies, server verifies proof.
  2. Server-verified (future SMS provider): server sends code and checks it.
- Emit structured events for analytics (sent, verified, failed, blocked).

### 4.2 Out of Scope
- Issuing the platform's JWT/refresh tokens (backend auth module).
- Admin 2FA by email (handled by backend + `wab-notifications`).
- UI (apps).

---

## 5. Business Requirements
| ID | Requirement | Priority |
|---|---|---|
| OTP-01 | Provide a stable interface: `precheck`, `verify`, `reportFailure`, `getConfig`. | M |
| OTP-02 | Phase 1 provider: verify Firebase ID tokens (signature, expiry, project) and extract the verified phone number. | M |
| OTP-03 | Reject verification if the verified phone differs from the expected phone or the purpose does not match. | M |
| OTP-04 | Enforce request limit (default 5 / 5 min → 15 min block) per phone, and SHOULD also limit per device/IP. | M |
| OTP-05 | Enforce wrong-attempt limit (default 5 → 15 min block). | M |
| OTP-06 | Return `otpLength` (default **6**, must match the provider) and `resendAfterSeconds` (default 60) to the apps. | M |
| OTP-07 | All limits/durations configurable at runtime (from admin settings). | M |
| OTP-08 | Store counters and blocks in Redis (TTL-based), injected by the consumer. | M |
| OTP-09 | Return clear, typed outcomes: `ALLOWED`, `BLOCKED(until)`, `VERIFIED`, `INVALID_PROOF`, `PHONE_MISMATCH`, `EXPIRED`, `PROVIDER_ERROR`. | M |
| OTP-10 | Emit events for analytics/alerts (OTP sends, failures, blocks) via a callback/hook. | M |
| OTP-11 | Support a server-verified provider model without changing the interface (future). | S |
| OTP-12 | Support test numbers/codes in non-production environments. | S |

---

## 6. Non-Functional Requirements
| ID | Area | Requirement |
|---|---|---|
| ONF-01 | Security | Never log codes or full tokens; mask phone numbers in logs. |
| ONF-02 | Security | Constant-time comparisons for server-verified codes (future provider). |
| ONF-03 | Performance | Pre-check and verify < 100 ms excluding provider network calls. |
| ONF-04 | Quality | TypeScript strict; unit tests for limits/blocks; tests for Firebase token verification with mocks. |
| ONF-05 | Versioning | Semantic versioning, changelog, private npm registry. |

---

## 7. Success Metrics
- OTP verification success rate; median time to verify.
- Blocks per day and SMS cost per registered user (watch for abuse).
- No account takeover via OTP bypass.

---

## 8. Risks & Mitigations
| Risk | Mitigation |
|---|---|
| Firebase SMS cost/limits | Platform pre-check limits; monitoring; provider swap possible |
| Firebase code length fixed (6) | `otpLength` returned dynamically; apps never hardcode |
| Token replay | Verify token freshness (auth_time) and single use per purpose window |
| SMS delivery issues in Jordan | Monitor failure rate; evaluate local SMS provider as second implementation |

---

## 9. Open Items
| # | Item |
|---|---|
| 1 | Per-IP/device limit values |
| 2 | Second (local) SMS provider evaluation |
| 3 | Firebase project/billing (Blaze) confirmation |
