# WAB — Business Requirements Document (BRD)
## Package: `wab-notifications`

| Field | Value |
|---|---|
| Document | BRD — `wab-notifications` package |
| Version | 1.0 |
| Date | October 2026 |
| Repository | Separate repository `wab-notifications` |
| Deliverable | **Node.js package (TypeScript, npm)** — server only |
| Consumers | WAB backend (customer/merchant push, admin email alerts, admin 2FA email, promotional campaigns); future projects |
| Related | Backend BRD, Customer PRD (§10), Merchant PRD (§11, M10), Admin PRD (A25, A27) |

---

## 1. Executive Summary
`wab-notifications` delivers messages through pluggable channels behind one **interface**. Phase 1 channels: **Push via Firebase Cloud Messaging (FCM)** for the customer and merchant apps (one Firebase project, 4 app registrations), and **Email via Nodemailer + Gmail SMTP** for admin alerts and admin 2FA codes. The backend decides *who* gets *what* and *when*; the package handles *how* it is delivered and reports delivery results.

---

## 2. Business Context
Notifications drive the core experience: booking status changes, reminders (1 h and 15 min), pending alerts (30 min), refunds, promotions, and above all the **Uber-style real-time booking request** for merchants (high-priority data message; Android overlay/full-screen; iOS time-sensitive notification with Accept/Reject actions). The admin receives email alerts (new application, review pending, payment failure/spike, refund failed/delayed, error spikes, subscription ending, catalog request).

---

## 3. Goals
| ID | Goal |
|---|---|
| NG-1 | Reliable, fast delivery of booking-critical notifications. |
| NG-2 | Support all message types required by the apps (visible, data-only, high-priority, time-sensitive, actionable). |
| NG-3 | Swap channel providers (push or email) without backend business changes. |
| NG-4 | Report delivery outcomes and clean invalid tokens automatically. |

---

## 4. Scope

### 4.1 In Scope
**Push (FCM):**
- Send to one device token, many tokens (multicast/batches), or topics.
- Message kinds: visible notification, **data-only**, **high-priority data** (merchant booking request), iOS **time-sensitive** interruption level, custom sound, **action category** (Accept/Reject), badge count, deep-link payload.
- Localized title/body provided by the caller (ar/en).
- Target app selection (customer vs merchant) and platform-specific options (Android channel ID, full-screen intent flag; APNs headers).
- Delivery result per token; detect invalid/unregistered tokens and return them for removal.
- Silent data pushes (e.g., `PERMISSIONS_UPDATED`).

**Email (Nodemailer + Gmail SMTP):**
- Send HTML + plain-text emails with templates (alert email, admin 2FA code, report-ready email).
- Branded WAB templates (ar/en).
- Recipients list configurable (admin settings).
- Rate-aware sending (Gmail daily limits) with digest support for frequent alerts.

**Common:**
- Provider-independent interface (`sendPush`, `sendEmail`, results).
- Retry with backoff for transient failures; idempotency key per logical notification to avoid duplicates.
- Events/hooks for analytics (sent, delivered, failed, opened when reported by the app).

### 4.2 Out of Scope
- Deciding recipients, permissions, user preferences, schedules (backend: notification service + BullMQ jobs).
- Storing the in-app notifications list (backend database).
- SMS (OTP is in `wab-otp`), WhatsApp messaging.
- Customer/merchant marketing emails (not planned).

---

## 5. Business Requirements
| ID | Requirement | Priority |
|---|---|---|
| NOT-01 | Stable interface for push and email with typed payloads and results. | M |
| NOT-02 | FCM implementation supporting single, multicast (batched) and topic sends. | M |
| NOT-03 | Support high-priority data messages and Android full-screen intent flag for merchant booking requests. | M |
| NOT-04 | Support iOS time-sensitive interruption level, custom sound and actionable categories (Accept/Reject). | M |
| NOT-05 | Support silent/data-only pushes for app state updates. | M |
| NOT-06 | Return per-token results and list invalid tokens for cleanup. | M |
| NOT-07 | Email implementation via Nodemailer + Gmail SMTP with HTML templates (alerts, 2FA, reports). | M |
| NOT-08 | Email deliverability: correct From name/address, plain-text alternative, no spammy content; SPF/DKIM guidance in README for a custom domain later. | M |
| NOT-09 | Digest mode for frequent email alerts (e.g., reviews pending hourly) to stay within Gmail limits. | S |
| NOT-10 | Retries with exponential backoff for transient provider errors; no retry on permanent errors. | M |
| NOT-11 | Idempotency key per logical notification to prevent duplicates on retries. | M |
| NOT-12 | Hooks for analytics/alerts on send/fail. | M |
| NOT-13 | Configuration (Firebase service account, SMTP credentials, sender) injected by consumer; no secrets in package. | M |
| NOT-14 | Allow adding providers later (e.g., Amazon SES, another push provider) without interface changes. | S |

---

## 6. Non-Functional Requirements
| ID | Area | Requirement |
|---|---|---|
| NNF-01 | Performance | Booking-request push dispatched within 1 s of the backend call. |
| NNF-02 | Scale | Campaign sends in batches (FCM batch limits) without blocking the API (consumer runs them in jobs). |
| NNF-03 | Security | Never log full device tokens or email credentials. |
| NNF-04 | Quality | TypeScript strict; unit tests with provider mocks; template snapshot tests. |
| NNF-05 | Versioning | Semantic versioning; private npm registry; changelog. |

---

## 7. Success Metrics
- Push delivery success rate; invalid tokens cleaned.
- Median time from booking creation to merchant notification.
- Admin alert emails delivered (not in spam).

---

## 8. Risks & Mitigations
| Risk | Mitigation |
|---|---|
| iOS cannot show overlays | Time-sensitive + actionable notifications; in-app sheet on open |
| Gmail SMTP limits (~500/day) and spam | Admin-only use, digests; switch to SES/other via interface |
| Duplicate notifications on retries | Idempotency keys |
| Stale tokens | Automatic invalid-token reporting and cleanup |

---

## 9. Open Items
| # | Item |
|---|---|
| 1 | Custom sending domain (later) and move from Gmail to a transactional provider |
| 2 | Android notification channels list and sounds (design) |
| 3 | Campaign throughput targets |
