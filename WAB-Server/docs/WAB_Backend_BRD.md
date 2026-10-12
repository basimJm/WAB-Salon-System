# WAB Wedding & Beauty — Business Requirements Document (BRD)
## Backend Platform

| Field | Value |
|---|---|
| Document | Business Requirements Document — Backend |
| Product | WAB Wedding & Beauty — Backend platform and shared server packages |
| Version | 1.0 |
| Date | October 2026 |
| Related documents | Customer App PRD & BRD, Merchant App PRD & BRD, Admin PRD & BRD, Backend PRD (upcoming), package PRDs (upcoming) |

---

## 1. Executive Summary

The backend is the single source of truth for the WAB platform. One backend serves **three clients**: the Customer app, the Merchant app (both Kotlin Multiplatform) and the Admin panel (React). It owns all business rules — availability, bookings and their lifecycle, payments, refunds, payouts, subscriptions, permissions, reviews and content — and delivers real-time updates, notifications, scheduled jobs, analytics data and reports.

Reusable infrastructure capabilities (payments, OTP, notifications, analytics, storage) are built as **separate, published packages** behind abstractions, so a provider can be replaced without changing the backend or the apps.

---

## 2. Business Context & Goals

| ID | Goal |
|---|---|
| BG-1 | Enforce every business rule **on the server** so all clients behave consistently and cannot bypass rules. |
| BG-2 | Never double-book a staff member, never charge twice, never lose a refund. |
| BG-3 | Deliver booking changes to customers, merchants and admin **in real time**. |
| BG-4 | Run time-based rules reliably (auto-cancel, reminders, subscription expiry, alerts). |
| BG-5 | Give the admin **complete, permanent visibility** of user behavior and system health. |
| BG-6 | Allow providers (payment gateway, SMS/OTP, push, email, storage, analytics) to be swapped with minimal impact. |
| BG-7 | Be secure by default and protect personal and financial data. |
| BG-8 | Be easy for AI agents and engineers to extend (clear architecture, documented APIs). |

---

## 3. Scope

### 3.1 In Scope
- One backend application serving Customer, Merchant and Admin APIs.
- Five shared packages in separate repositories: `wab-payments`, `wab-otp`, `wab-notifications`, `wab-analytics`, `wab-storage`.
- REST JSON APIs, real-time (Socket.IO), background jobs and schedules, alerts, reports and exports.
- Integrations: Firebase (Auth phone OTP, FCM, Analytics/Crashlytics via BigQuery), payment gateway, AWS S3 + CDN, Gmail SMTP.
- Dev and Prod environments, CI/CD on GitHub Actions, hosting on DigitalOcean.

### 3.2 Out of Scope
- Microservices deployment (packages are libraries, not separate servers).
- Automated payouts and online subscription billing (manual for now).
- Support ticketing.
- Web clients other than the Admin panel.

---

## 4. Technical Decisions (confirmed)

| Area | Decision |
|---|---|
| Runtime & language | **Node.js + TypeScript** |
| Framework | **Express** |
| Database | **MongoDB + Mongoose** (Atlas required for Atlas Search) |
| Architecture | **Clean Architecture**, organized by feature modules (controller → service/use case → repository), evolving from the current MVC setup |
| API style | REST + JSON, versioned (`/v1`), separate namespaces: `/customer/v1`, `/merchant/v1`, `/admin/v1` |
| API documentation | Swagger (OpenAPI) generated from code + a **Postman collection** kept in the repository |
| Real-time | **Socket.IO** with Redis adapter |
| Jobs & queues | **Redis + BullMQ** (delayed jobs) + scheduled (cron) jobs |
| Cache, locks, rate limits | **Redis** |
| OTP | **Firebase Authentication (phone SMS)**; backend verifies Firebase ID tokens; code length returned to apps (currently 6) |
| Push | **Firebase Cloud Messaging** — one Firebase project with 4 app registrations (Customer Android/iOS, Merchant Android/iOS) |
| Analytics | **Firebase Analytics + Crashlytics** with **BigQuery export** (permanent); server-side events in MongoDB |
| Search | **MongoDB Atlas Search** (Arabic + English) |
| Geo | MongoDB **2dsphere** index for nearest salons |
| File storage | **AWS S3** with **presigned upload URLs** + **CDN**; private bucket/prefix for license documents |
| Media | Images and videos compressed on device; server generates image size variants |
| Email | **Nodemailer + Gmail SMTP** (admin alerts and admin OTP only) |
| Hosting | **DigitalOcean** (server only); S3 + CDN remain on AWS |
| Environments | **Dev** and **Prod** |
| CI/CD | **GitHub Actions** on GitHub |
| Error monitoring & logs | Server error tracking + centralized logs (tool TBD, e.g., Sentry) |
| Time | Stored in UTC; business calculations in **Asia/Amman** |
| Localization | Admin-entered content stored in Arabic + English; merchant-entered text stored as entered |
| Domain | **TBD (to-do)** |

---

## 5. Shared Packages (separate repositories)

Each package exposes an **interface (abstraction)** and one or more **provider implementations**. The backend depends only on the interface; switching provider = new implementation + configuration, no business-code change.

| Package | Server (npm) | Mobile (KMP) | Responsibilities | First provider |
|---|---|---|---|---|
| `wab-payments` | ✅ | ✅ | Server: create payment session, verify result, refund, webhook verification, idempotency. Mobile: present the gateway payment UI | HyperPay (candidate; gateway not final) |
| `wab-otp` | ✅ | — | Verify Firebase ID token and phone match; platform rate limits and blocks; `otpLength` config | Firebase Auth |
| `wab-notifications` | ✅ | — | Push (single, multicast, topics, data messages, time-sensitive), email; delivery results | FCM, Gmail SMTP |
| `wab-analytics` | ✅ | — | Record server events; query BigQuery and MongoDB for dashboards, funnels, journeys, reports | Firebase/BigQuery |
| `wab-storage` | ✅ | — | Presigned upload URLs, upload confirmation, signed private URLs, delete, CDN URL building | AWS S3 + CDN |

**Requirements for all packages:**
- TypeScript, semantic versioning, published as private packages (e.g., GitHub Packages).
- Typed interfaces, typed errors, configuration via injected settings (no hardcoded secrets).
- Unit tests and a README with usage examples.
- No business rules inside packages (they stay in the backend).

---

## 6. Business Capabilities Required

### 6.1 Identity & Access
| ID | Requirement |
|---|---|
| BE-01 | Authenticate customers and merchant members with phone + Firebase OTP; issue the platform's own access token (short-lived) and refresh token (rotated, stored, revocable). |
| BE-02 | Authenticate the single admin with email + password + email OTP (2FA), lockout and session timeout. |
| BE-03 | Keep token scopes separate per client (customer / merchant / admin). |
| BE-04 | Enforce merchant **per-feature permissions** on every merchant endpoint, socket event and notification; owner-only capabilities are never grantable. |
| BE-05 | Enforce resource ownership on every request (no access to other users' or salons' data). |
| BE-06 | Support account blocking (admin), customer account deletion with 30-day grace period, member deactivation, salon Offline state. |
| BE-07 | Enforce OTP platform limits on top of Firebase: 5 requests / 5 min → 15 min block; 5 wrong attempts → 15 min block; return `otpLength` and resend timing. |

### 6.2 Catalog, Salons & Staff
| ID | Requirement |
|---|---|
| BE-10 | Manage the admin services catalog (men/women, ar/en) and salon requests for new services. |
| BE-11 | Manage salon applications (documents, approve/reject with reason, resubmission) and the salon lifecycle (pending, rejected, approved-incomplete, live, offline) with automatic completeness calculation. |
| BE-12 | Manage salon profile, gallery, location, contacts, weekly schedule (different per day), exceptional closures, policies. |
| BE-13 | Manage members, roles, permissions and staff profiles (skills, bride qualification, working days, custom hours, leaves). |
| BE-14 | Detect and return **conflicts** (affected upcoming bookings) before schedule, closure, leave, skill or member changes, and support bulk cancellation with refunds. |
| BE-15 | Only **live** salons appear to customers. |

### 6.3 Discovery
| ID | Requirement |
|---|---|
| BE-20 | Home aggregate in one response per gender (banners, services, recommended, nearest, unread notifications count). |
| BE-21 | Salon search combining text (Atlas Search) + filters (all selected services offered, sum of selected service prices within range, minimum rating, recommended) + nearest sorting within the admin-configured radius (default 10 km), paginated. |
| BE-22 | Open/closed status and today's hours computed in Asia/Amman, honoring exceptional closures. |
| BE-23 | Favorites, reviews (pending until admin approval), salon and staff ratings kept independent. |

### 6.4 Availability & Booking Engine
| ID | Requirement |
|---|---|
| BE-30 | Compute available slots (15-minute steps, up to 90 days ahead) per person from: salon schedule, closures, staff working days/hours, leaves, skills (all selected services), bride qualification, and existing PENDING/APPROVED bookings, for the full total duration. |
| BE-31 | Return eligible staff per slot and support "any available staff" assignment. |
| BE-32 | Create bookings with up to 5 companions (same gender as the salon), bride flags, bride-only services, price and policy snapshots, and a unique reference number. |
| BE-33 | **Prevent double booking** under concurrency (distributed locks + atomic re-validation at creation, approval and reassignment). |
| BE-34 | Hold slots while a booking is PENDING and briefly during an online payment session. |
| BE-35 | Implement the booking state machine: PENDING → APPROVED / REJECTED → COMPLETED / NO_SHOW, and CANCELLED_BY_CUSTOMER / CANCELLED_BY_SALON / AUTO_CANCELLED, with full status history (actor, time, reason). |
| BE-36 | Enforce cancellation windows and refund outcomes from the policy snapshot; salon rejection/cancellation and auto-cancel always refund in full. |
| BE-37 | Allow admin to perform any booking action with reason and audit trail. |

### 6.5 Payments, Refunds, Payouts & Subscriptions
| ID | Requirement |
|---|---|
| BE-40 | Collect deposits and full payments through the platform gateway (`wab-payments`); a failed payment never creates a booking. |
| BE-41 | Verify gateway results server-side (webhook signature + status query); use idempotency keys to prevent double charges. |
| BE-42 | Record **every payment attempt** with gateway response codes and messages. |
| BE-43 | Create and track refunds automatically (REFUND_PENDING → REFUNDED / FAILED), with retry and manual completion by admin. |
| BE-44 | Maintain per-salon balances (collected − gateway fees − refunds − paid out) and record manual payouts. |
| BE-45 | Maintain subscriptions manually: 3-month trial, recorded payments, expiry tracking; admin sets salons Offline. |
| BE-46 | Store bank details encrypted; changes require owner OTP. |

### 6.6 Real-time, Notifications & Jobs
| ID | Requirement |
|---|---|
| BE-50 | Emit real-time events (Socket.IO) for booking changes to the customer, permitted salon members and admin; unread counts; permission changes. |
| BE-51 | Send push notifications for every trigger defined in the Customer and Merchant PRDs, respecting permissions and user push preferences; store all notifications for in-app lists. |
| BE-52 | Merchant booking requests delivered as high-priority data messages (Android overlay / iOS time-sensitive with Accept/Reject actions). |
| BE-53 | Scheduled per-booking jobs: reminders (1 h and 15 min before), pending alert (30 min before), **auto-cancel 1 h after start** if still pending; jobs removed when the booking changes. |
| BE-54 | Periodic jobs: subscription and trial expiry checks, recommended placement expiry, account deletion after grace period, alert evaluations, report aggregation. |
| BE-55 | Promotional push campaigns with targeting and scheduling. |

### 6.7 Admin, Analytics, Alerts & Reports
| ID | Requirement |
|---|---|
| BE-60 | Admin APIs for every module in the Admin PRD (customers, salons, applications, bookings, finance, reviews, catalog, content, push, settings). |
| BE-61 | Analytics from BigQuery (Firebase events + Crashlytics, retained forever) and MongoDB server events: live overview, funnels, cohorts, search analytics, payments, errors, **per-user journeys** including guest history linked via Firebase app instance ID. |
| BE-62 | Email alerts to the admin: new salon application, review pending, payment failure/spike, refund failed/delayed, crash/server-error spike, subscription ending in 7 days / trial ended, new catalog request (thresholds configurable). |
| BE-63 | Daily, weekly and monthly reports; export any report or table to Excel and PDF at any time (async for large exports). |
| BE-64 | Immutable audit log of all admin actions (before/after, reason, IP). |
| BE-65 | All platform settings configurable by admin (radius, booking rules, OTP rules, locations, app versions, maintenance, alerts). |

### 6.8 Files
| ID | Requirement |
|---|---|
| BE-70 | Issue presigned upload URLs restricted by type, size and expiry; confirm uploads; serve public media via CDN. |
| BE-71 | Keep license documents private; admin access only through short-lived signed URLs. |
| BE-72 | Generate image size variants (thumbnails) after upload. |

---

## 7. Non-Functional Requirements

| ID | Area | Requirement |
|---|---|---|
| NFR-01 | Security | Apply all approved controls: Helmet headers, HTTPS only, CORS limited to the admin domain, rate limiting (global and stricter on OTP/login/payments), schema validation of every input, NoSQL-injection and XSS sanitization, request size limits, short-lived JWT + rotating revocable refresh tokens, separate token scopes, permission and ownership checks, bcrypt + 2FA + lockout for admin, encryption of sensitive fields, file type/size validation and private documents, webhook signature verification, payment idempotency keys, secrets only in environment/secret stores, no sensitive data in logs, dependency scanning in CI, admin audit log, daily database backups. |
| NFR-02 | Correctness | Booking, payment and refund operations are atomic and idempotent; no double booking or double charge under concurrency. |
| NFR-03 | Performance | Common read endpoints respond within ~300 ms (p95) excluding network; home aggregate and search use indexes and caching. |
| NFR-04 | Real-time | Booking events reach connected clients within ~2 seconds. |
| NFR-05 | Reliability | Jobs survive restarts (persistent queues); failed jobs retried with backoff and visible to admin. |
| NFR-06 | Scalability | Stateless API instances (horizontal scaling) with Redis for sockets, locks and queues. |
| NFR-07 | Data retention | Analytics retained forever (BigQuery); operational data retained per business rules; deleted accounts purged after the grace period. |
| NFR-08 | Observability | Structured logs, error tracking, health checks, job and queue monitoring, API error/latency metrics feeding the admin Errors page. |
| NFR-09 | Maintainability | Clean Architecture modules, TypeScript strict mode, linting and formatting, consistent error format, Swagger + Postman always in sync with code. |
| NFR-10 | Testing | Unit tests for business rules (availability, booking state machine, refunds, permissions); integration tests for key APIs; tests run in CI. |
| NFR-11 | Localization | Responses localized by `Accept-Language` (ar/en). |
| NFR-12 | Time | UTC storage; Asia/Amman for schedules, open/closed status, reminders and reports. |

---

## 8. Key Business Rules Enforced by the Backend

| ID | Rule |
|---|---|
| BER-01 | Each salon serves one gender; companions match the salon's gender; max 5 companions. |
| BER-02 | Bookings up to 90 days ahead, 15-minute slots, duration = sum of services. |
| BER-03 | Staff eligible only if on duty, not on leave, skilled in all selected services, bride-qualified for brides, and free for the whole duration. |
| BER-04 | Pending bookings hold their slot; auto-cancel 1 hour after start with mandatory full refund. |
| BER-05 | Salon rejection/cancellation → full refund; customer cancellation follows the policy snapshot. |
| BER-06 | Only the salon (or admin) marks Completed (paid) or No-show, at or after start time. |
| BER-07 | Prices and policies are snapshotted at booking time. |
| BER-08 | Reviews published only after admin approval; any registered customer may review. |
| BER-09 | Salons are visible only when approved, complete and not Offline. |
| BER-10 | Owner-only permissions are never grantable; permissions enforced on APIs, sockets and notifications. |
| BER-11 | Gateway fees are borne by salons; payouts and subscriptions are recorded manually. |

---

## 9. Success Metrics

| Area | Metric |
|---|---|
| Availability | Uptime ≥ 99.5% (Prod) |
| Correctness | Zero double bookings; zero duplicate charges |
| Performance | p95 API latency targets met (NFR-03) |
| Real-time | p95 event delivery ≤ 2 s |
| Jobs | Reminder/auto-cancel jobs executed on time ≥ 99.9% |
| Payments | Payment verification success; refund completion time tracked |
| Security | No critical vulnerabilities open in dependency scans |

---

## 10. Assumptions, Constraints & Dependencies

**Assumptions**
- Firebase Blaze plan enabled (phone auth SMS and BigQuery export).
- MongoDB hosted on Atlas (needed for Atlas Search).
- Gmail account with App Password for SMTP (admin emails only).

**Constraints**
- Server hosted on DigitalOcean; files on AWS S3 + CDN.
- Payment gateway not yet selected.
- Domain not yet selected.

**Dependencies**
- Firebase (Auth, FCM, Analytics, Crashlytics, BigQuery export).
- Payment gateway account and SDKs.
- AWS S3 + CDN.
- GitHub (repositories, Actions, private packages).

---

## 11. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Race conditions cause double bookings | Redis locks + atomic re-validation + unique constraints |
| Firebase OTP limits/costs | Platform-side rate limits; monitoring of SMS usage; `wab-otp` abstraction allows provider change |
| Payment webhook lost or delayed | Status polling fallback, idempotency, reconciliation view |
| BigQuery query costs grow | Partitioned tables, scheduled aggregations, cached dashboard queries |
| Gmail SMTP sending limits | Admin-only usage, digests for frequent alerts; `wab-notifications` allows switching provider |
| Single region hosting outage | Backups, infrastructure as documented, quick redeploy via CI/CD |
| Split infrastructure (DigitalOcean + AWS) | Clear configuration per environment; storage behind `wab-storage` |

---

## 12. Open Items

| # | Item |
|---|---|
| 1 | Platform domain (API, admin, deep links) |
| 2 | Payment gateway selection |
| 3 | DigitalOcean product (Droplets vs App Platform) and managed Redis |
| 4 | Error tracking / logging tool |
| 5 | Atlas cluster tier |
| 6 | Package registry (GitHub Packages assumed) |

---

## 13. Glossary

| Term | Meaning |
|---|---|
| Clean Architecture | Code organized in layers (controllers, services/use cases, repositories) with business rules independent of frameworks |
| Package | Reusable library in its own repository, published and installed by projects |
| Presigned URL | Temporary, restricted URL that lets a client upload a file directly to storage |
| CDN | Network of servers that delivers images/videos from the location closest to the user |
| Delayed job | Task scheduled to run at a specific time for a specific entity (e.g., a booking reminder) |
| Idempotency key | Unique key ensuring a repeated request (e.g., payment) is processed only once |
| Socket.IO | Real-time, two-way connection between clients and the server |
