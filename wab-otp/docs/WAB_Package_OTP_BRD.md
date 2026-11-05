# WAB — Business Requirements Document (BRD)
## Package: `wab-otp`

| Field | Value |
|---|---|
| Document | BRD — `wab-otp` package |
| Version | 2.0 (WhatsApp delivery through ARQAM OTP) |
| Date | 2026-11-04 |
| Repository | Monorepo folder `wab-otp/` |
| Deliverable | **Node.js package (TypeScript, npm)** — server only |
| Consumers | WAB backend (customer and merchant auth, phone change, booking confirmation, bank-details change); future projects |
| Related | Backend BRD, Customer App PRD (S13), Merchant App PRD (M03). Root `BUSINESS_DOMAIN.md` §3.1a holds the rules; this package holds none of the business rules |
| Status | Built and used by WAB-Server (`OTP_PROVIDER=arqam`), version 0.3.0. The ARQAM project itself (sender, templates, keys) is owner setup (SRV-159, `docs/ARQAM_SETUP.md`) |

---

## 1. Executive Summary
`wab-otp` is a server-side library that delivers and checks one-time codes and enforces OTP abuse limits behind a provider-independent **interface**. The real channel is **WhatsApp through ARQAM OTP**: the server generates the code, stores only its HMAC, hands it to ARQAM with the Arabic or English authentication template, checks the typed code itself, and issues a **signed single-use proof** (`otpToken`) that every phone-verified action takes.

There is no Firebase phone verification, no direct Meta Cloud API channel and no SMS fallback in WAB. The package also owns the **limits** building blocks and exposes the **OTP configuration** the apps need (`otpLength`, resend timing). If the provider changes later, the backend keeps calling the same interface.

---

## 2. Business Context
OTP is used for: customer login/registration, merchant member login, business registration, phone-number change, booking confirmation, and changing a business's bank details. There are no passwords for customers or merchants, so OTP is the security gate of the platform. Every WhatsApp code has a direct cost, so abuse must be limited.

---

## 3. Goals
| ID | Goal |
|---|---|
| OG-1 | Securely confirm that the user controls the phone number before any sensitive action. |
| OG-2 | Prevent abuse and message cost spikes with platform-level limits and blocks. |
| OG-3 | Switch OTP provider without changing backend business code. |
| OG-4 | Keep OTP behavior configurable by admin (length, timing, limits). |

---

## 4. Scope

### 4.1 In Scope
- **Pre-check** before a code is sent: is this phone (and device/IP) allowed now? Return `{ allowed, otpLength, resendAfterSeconds, blockedUntil? }`.
- **Send** a server-generated code over the channel (ARQAM OTP: WhatsApp, AR/EN template by language).
- **Check** the typed code and, when right, issue a short-lived signed single-use `otpToken`.
- **Verify** an `otpToken` and confirm the phone and purpose match the expected ones.
- **Record attempts:** requests, successes, wrong-code reports, expirations, provider errors.
- **Limits & blocks:**
  - 5 OTP requests within 5 minutes → blocked 15 minutes.
  - 5 wrong codes → blocked 15 minutes.
  - Resend allowed after 60 seconds.
  - All values configurable (admin settings).
- **Purposes:** `LOGIN`, `REGISTER`, `CHANGE_PHONE`, `BOOKING_CONFIRMATION`, `BANK_DETAILS`, `SALON_REGISTER` (extensible).
- **Channel abstraction:** `OtpChannel` port with the ARQAM channel and a fake channel for dev and tests. The package also carries a vendor-neutral SMS channel adapter (`createSmsOtp`, fake vendor only); WAB does not use it.
- **Provider operations:** ARQAM account mode (`LIVE`/`TEST`) and balance, delivery history of one message.
- Emit structured events (precheck, verified, failed, blocked) through a callback.

### 4.2 Out of Scope
- Issuing the platform's JWT/refresh tokens (backend auth module).
- Admin 2FA by email (handled by backend + `wab-notifications`).
- UI (apps).
- SMS delivery and any fallback channel in WAB (owner decision 2026-10-26).
- ARQAM webhooks (they carry no OTP statuses).

---

## 5. Business Requirements
| ID | Requirement | Priority |
|---|---|---|
| OTP-01 | Provide a stable interface: `precheck`, `verify`, `reportFailure`, `getConfig` (limits and proof) and `sendCode`, `verifyCode` (code flow). | M |
| OTP-02 | Real provider: ARQAM OTP delivers server-generated codes over WhatsApp (`createArqamOtp`), one authentication template per language with a fallback language; the code is checked by the package, ARQAM's own verify endpoint is not used. | M |
| OTP-03 | Reject verification if the proof's phone differs from the expected phone or the purpose does not match. | M |
| OTP-04 | Enforce request limit (default 5 / 5 min → 15 min block) per phone, and SHOULD also limit per device/IP. | M |
| OTP-05 | Enforce wrong-attempt limit (default 5 → 15 min block). | M |
| OTP-06 | Return `otpLength` (default **6**; ARQAM accepts 4–6 digits) and `resendAfterSeconds` (default 60) to the apps. | M |
| OTP-07 | All limits/durations configurable at runtime (from admin settings). | M |
| OTP-08 | Store counters, blocks and codes in Redis (TTL-based), injected by the consumer. | M |
| OTP-09 | Return clear, typed outcomes: `ALLOWED`, `BLOCKED(until)`, `VERIFIED`, `INVALID_PROOF`, `PHONE_MISMATCH`, `PURPOSE_MISMATCH`, `EXPIRED`; provider failures throw `OtpError`. | M |
| OTP-10 | Emit events for alerts (OTP sends, failures, blocks) via a callback/hook. | M |
| OTP-11 | Support another channel without changing the interface (`OtpChannel` + `createCodeOtp`). | S |
| OTP-12 | Support test codes in non-production environments (`FakeOtpChannel`, dev-only `fixedCode`; refused in prod). | S |
| OTP-13 | Issue a signed single-use `otpToken` after a right code (HMAC, expiry, phone, purpose, one use per `jti`); login, register, change phone, booking confirmation and bank details verify it. | M |
| OTP-14 | Map every ARQAM answer: `INVALID_PHONE` and `PROVIDER_ERROR` → `OTP_DELIVERY_FAILED` (not retried, the stored code is removed); 5xx, timeouts and network errors retried with capped backoff and the same idempotency key; key, template, sender, credit and rate-limit errors typed and not retried. | M |

---

## 6. Non-Functional Requirements
| ID | Area | Requirement |
|---|---|---|
| ONF-01 | Security | Never log codes or full tokens; mask phone numbers in logs. |
| ONF-02 | Security | Constant-time comparisons for codes and proofs; only the code's HMAC is stored. |
| ONF-03 | Performance | Pre-check and verify < 100 ms excluding provider network calls. |
| ONF-04 | Quality | TypeScript strict; unit tests for limits/blocks; tests for the ARQAM channel against a stubbed API. |
| ONF-05 | Versioning | Semantic versioning, changelog, private npm registry (open owner decision). |

---

## 7. Success Metrics
- OTP verification success rate; median time to verify.
- Blocks per day and WhatsApp message cost per registered user (watch for abuse).
- No account takeover via OTP bypass.

---

## 8. Risks & Mitigations
| Risk | Mitigation |
|---|---|
| WhatsApp message cost/limits | Platform pre-check limits; monitoring; provider swap possible |
| ARQAM outage or exhausted credits | 503 to the app + server error log; `npm run otp:arqam-check` shows account mode and balance |
| Token replay | Signed proof with short expiry and single use per `jti` |
| Delivery fails after ARQAM accepted the message | Not reported to the user (ARQAM has no OTP webhook); the user can resend; `getDeliveryStatus` is available for a later polling feature |

---

## 9. Open Items
| # | Item |
|---|---|
| 1 | Per-IP/device limit values |
| 2 | ARQAM project setup per environment (SRV-159): sender, AR + EN templates, TEST/LIVE keys |
