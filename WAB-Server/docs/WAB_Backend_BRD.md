# WAB Wedding & Beauty — Business Requirements Document (BRD)
## Backend Platform

| Field | Value |
|---|---|
| Document | Business Requirements Document — Backend |
| Product | WAB Wedding & Beauty — Backend platform and shared server packages |
| Version | 2.0 (salons, beauty clinics and tattoo studios; branches; merged discovery; bookings made by the business; closing finished bookings; ARQAM OTP; R2 storage) |
| Date | 2026-11-04 |
| Precedence | PRD > BRD > Design Script > design files. Root `BUSINESS_DOMAIN.md` holds the data, enums, rules, state machine, permissions, jobs, settings and error codes |
| Contract | The generated `WAB-Server/docs/api/openapi.*.json`: customer 1.13.0 (52 operations), merchant 1.13.0 (106), admin 1.16.0 (164), common 1.2.0 (6) |
| Related documents | Customer App PRD & BRD, Merchant App PRD & BRD, Admin PRD & BRD, package BRDs (`wab-*/docs/`), `INTEGRATION.md` |

---

## 1. Executive Summary

The backend is the single source of truth for the WAB platform, a two-sided marketplace in Jordan connecting customers with **businesses of three types: salons (men, women or both), beauty clinics and tattoo studios**. One backend serves **three clients**: the Customer app, the Merchant app (both Kotlin Multiplatform) and the Admin panel (React). It owns all business rules — availability, branches, bookings and their lifecycle, payments, refunds, payouts, subscriptions, permissions, reviews and content — and delivers real-time updates, notifications, scheduled jobs, server analytics and reports.

Reusable infrastructure capabilities (payments, OTP, notifications, analytics, storage) are built as **separate packages** behind abstractions, so a provider can be replaced without changing the backend or the apps. The server uses three of them today (`wab-otp`, `wab-storage`, `wab-notifications`); `wab-payments` and `wab-analytics` are built but not used (section 5).

**Status today:** online payment is **paused** (`PAYMENT_PROVIDER=disabled` in production, `fake` in dev; no gateway chosen; HyperPay is only a candidate), so apps offer pay on arrival. BigQuery and the `@wab/analytics` SDK in the server were **dropped** by the owner on 2026-10-19; the server records its own events in MongoDB.

---

## 2. Business Context & Goals

| ID | Goal |
|---|---|
| BG-1 | Enforce every business rule **on the server** so all clients behave consistently and cannot bypass rules. |
| BG-2 | Never double-book a staff member, never charge twice, never lose a refund. |
| BG-3 | Deliver booking changes to customers, merchants and admin **in real time**. |
| BG-4 | Run time-based rules reliably (auto-cancel, reminders, closing reminders, subscription expiry, alerts). |
| BG-5 | Give the admin **complete visibility** of platform activity and system health (server events, alerts, reports, audit log). App screens and actions stay in Firebase Analytics, crashes in Crashlytics. |
| BG-6 | Allow providers (payment gateway, OTP delivery, push, email, storage) to be swapped with minimal impact. |
| BG-7 | Be secure by default and protect personal and financial data. |
| BG-8 | Be easy for AI agents and engineers to extend (clear architecture, documented APIs). |

---

## 3. Scope

### 3.1 In Scope
- One backend application serving Customer, Merchant and Admin APIs.
- Five shared packages in this monorepo: `wab-payments`, `wab-otp`, `wab-notifications`, `wab-analytics`, `wab-storage`.
- REST JSON APIs, real-time (Socket.IO), background jobs and schedules, alerts, reports and exports.
- Integrations: ARQAM OTP (WhatsApp delivery), Firebase (FCM push; Analytics and Crashlytics are used by the apps directly), Cloudflare R2 (AWS S3 + CDN as fallback), Gmail SMTP. A payment gateway when the owner chooses one.
- Local, hosted dev and prod environments. The hosted dev API runs on Render (`wab-server-dev.onrender.com`). Production hosting is an open owner decision (section 12).

### 3.2 Out of Scope
- Microservices deployment (packages are libraries, not separate servers).
- Automated payouts and online subscription billing (manual for now).
- Split payments and sub-merchants (Phase 2; ports already carry optional `destinations`).
- BigQuery and any analytics from the apps to the backend (dropped by the owner 2026-10-19).
- Messages to people without an account (a business-made booking for an unregistered number sends no WhatsApp or SMS).
- Support ticketing.
- Web clients other than the Admin panel.

---

## 4. Technical Decisions (confirmed)

| Area | Decision |
|---|---|
| Runtime & language | **Node.js + TypeScript** |
| Framework | **Express** |
| Database | **MongoDB + Mongoose** (Atlas in hosted environments) |
| Architecture | **Clean Architecture**, organized by feature modules: route → middleware → controller → service → repository → schema |
| API style | REST + JSON, versioned (`/v1`), separate namespaces: `/customer/v1`, `/merchant/v1`, `/admin/v1` |
| API documentation | Swagger (OpenAPI) generated from code + a **Postman collection** kept in the repository |
| Real-time | **Socket.IO** with Redis adapter |
| Jobs & queues | **Redis + BullMQ** (delayed jobs) + scheduled (cron) jobs |
| Cache, locks, rate limits | **Redis** |
| OTP | **The server generates the code, ARQAM OTP delivers it over WhatsApp** (AR/EN template by `Accept-Language`); verification returns a single-use `otpToken`; code length returned to apps (`otpLength` = 6). No Firebase Phone Auth, no SMS fallback, no direct Meta Cloud API. Dev/QA: `OTP_PROVIDER=fake` + fixed code |
| Push | **Firebase Cloud Messaging** — one Firebase project per environment, 4 app registrations (Customer Android/iOS, Merchant Android/iOS). Merchant registrations are an open owner input |
| Analytics | Apps: **Firebase Analytics + Crashlytics**. Server: its own events in MongoDB (`serverEvents`), read by the admin. **No BigQuery, no analytics provider in the server** (owner 2026-10-19) |
| Search | Text search on a stored search field with a basic matcher behind a search interface. **Not built yet:** MongoDB Atlas Search (Arabic + English analyzers, SRV-059, waits for the owner's Atlas tier) |
| Geo | MongoDB **2dsphere** index for nearest branches |
| File storage | **Cloudflare R2** (`STORAGE_PROVIDER=cloudflare-r2`, public + private bucket, owner 2026-11-01) with **presigned upload URLs**; AWS S3 + CDN is only a fallback (`STORAGE_PROVIDER=real`); private bucket for license and medical documents and tattoo design images |
| Media | Images and videos compressed on device; server generates image size variants |
| Email | **Nodemailer + Gmail SMTP** through `wab-notifications` (admin alerts and admin OTP only) |
| Hosting | Hosted dev on **Render**. **Production hosting is open** (section 12) |
| Environments | **Local**, **hosted dev** and **prod** |
| CI/CD | **No server CI** (owner 2026-10-13): the local gate (format, lint, typecheck, build, tests, `npm audit --omit=dev`, `npm run docs`) runs before every push |
| Error monitoring & logs | Structured logs today. **Not built yet:** error tracking (tool is an open owner decision, SRV-115) |
| Time | Stored in UTC; business calculations in **Asia/Amman** |
| Localization | Admin-entered content stored in Arabic + English; merchant-entered text stored as entered |
| Domain | **Open** (section 12) |

---

## 5. Shared Packages

Each package exposes an **interface (abstraction)** and one or more **provider implementations**. The backend depends only on the interface; switching provider = new implementation + configuration, no business-code change. The packages live in monorepo folders; the server consumes the ones it uses through `file:` dependencies (`npm run ensure-sdks`). The private registry is an open owner decision.

| Package | Server (npm) | Mobile (KMP) | Responsibilities | Provider | Status today |
|---|---|---|---|---|---|
| `wab-payments` | ✅ | ✅ | Server: create payment session, verify result, refund, webhook verification, idempotency. Mobile: present the gateway payment UI | No gateway chosen; HyperPay is only a candidate | Built, **not used**: payments are paused |
| `wab-otp` | ✅ | — | Generate and check codes, deliver them over WhatsApp, issue and verify the signed single-use `otpToken` (platform limits stay in the server, `domain/otp`) | ARQAM OTP | Used |
| `wab-notifications` | ✅ | — | Push (single, multicast, topics, data messages, time-sensitive), email; delivery results | FCM, Gmail SMTP | Used |
| `wab-analytics` | ✅ | — | Record server events; query BigQuery and MongoDB for dashboards | Firebase/BigQuery | Built, **not used**: BigQuery dropped by the owner 2026-10-19; the server has its own MongoDB events |
| `wab-storage` | ✅ | — | Presigned upload URLs, upload confirmation, signed private URLs, delete, public URL building | Cloudflare R2 (active); AWS S3 + CDN (fallback) | Used |

**Requirements for all packages:**
- TypeScript, semantic versioning, publishable as private packages (GitHub Packages assumed; open owner decision).
- Typed interfaces, typed errors, configuration via injected settings (no hardcoded secrets).
- Unit tests and a README with usage examples.
- No business rules inside packages (they stay in the backend).

---

## 6. Business Capabilities Required

### 6.1 Identity & Access
| ID | Requirement |
|---|---|
| BE-01 | Authenticate customers and merchant members with phone + WhatsApp OTP; issue the platform's own access token (short-lived) and refresh token (rotated, stored, revocable). |
| BE-02 | Authenticate the single admin with email + password + email OTP (2FA), lockout (5 failures → 15 min) and session timeout (idle sign-out after 2 days). |
| BE-03 | Keep token scopes separate per client (customer / merchant / admin). |
| BE-04 | Enforce merchant **per-feature permissions** (16 grantable keys, §6) on every merchant endpoint, socket event and notification, scoped to the member's branch; owner-only capabilities are never grantable. |
| BE-05 | Enforce resource ownership on every request (no access to other users' or businesses' data). |
| BE-06 | Support account blocking (admin), customer account deletion with 30-day grace period, member deactivation, business Offline state (admin) and branch Offline state (owner or admin). |
| BE-07 | Enforce OTP platform limits: 5 requests / 5 min → 15 min block; 5 wrong attempts → 15 min block; return `otpLength`, resend timing (`resendAfterSeconds` = 60) and `expiresInSeconds`. |
| BE-08 | Generate phone codes on the server (stored only as an HMAC) and deliver them **over WhatsApp through ARQAM OTP** with the Arabic or English template of the request language (`POST …/auth/otp/request`). There is no Firebase Phone Auth, SMS fallback or direct Meta Cloud API. A refused recipient answers `OTP_DELIVERY_FAILED`; provider outages answer 503. Dev/QA: `OTP_PROVIDER=fake` + fixed code, refused in production. |
| BE-09 | Exchange a right code for a short-lived signed single-use `otpToken` (`POST …/auth/otp/verify`); login, register, change phone, booking confirmation and bank details take it and check signature, expiry, phone, purpose and single use (§3.1a). |

### 6.2 Catalog, Businesses & Staff
| ID | Requirement |
|---|---|
| BE-10 | Manage the admin services catalog per business type and audience (ar/en) and business requests for new services. |
| BE-11 | Manage business applications (documents, approve/reject with reason, resubmission) and the business lifecycle (pending, rejected, approved-incomplete, live, offline) with automatic completeness calculation at business and branch level (§5.2). |
| BE-12 | Manage the business profile, gallery and policy, and per branch the location, contacts, weekly schedule (different per day) and exceptional closures. |
| BE-13 | Manage members, roles, permissions and staff profiles (branch, skills, bride qualification, working days, custom hours, leaves). |
| BE-14 | Detect and return **conflicts** (affected upcoming bookings) before schedule, closure, leave, skill, member or branch changes, and support bulk cancellation with refunds. |
| BE-15 | Only **live, complete** businesses with at least one bookable branch appear to customers. |
| BE-16 | Keep `BusinessType = SALON \| CLINIC \| TATTOO` (never changes) and `Audience = MALE \| FEMALE \| BOTH` on every business. Clinics and tattoo studios are always BOTH. A MALE or FEMALE salon takes only persons of its audience (`GENDER_MISMATCH`); a BOTH salon, clinic or tattoo studio takes mixed-gender persons in one booking. Bride bookings exist only at FEMALE or BOTH salons (`BRIDE_NOT_ALLOWED`) (§5.19, §5.23). |
| BE-17 | Applications per type: a salon chooses its audience and sends the trade license; a clinic sends the trade license + a **medical license** (`MEDICAL_LICENSE`); a tattoo studio sends the trade license only. Admin sees the documents before approval. |
| BE-18 | Catalog services carry `businessType` + `audience`; a business offers and requests only services of its own type that fit its audience (`BUSINESS_TYPE_MISMATCH`). |
| BE-19 | The owner may widen a salon's audience to BOTH instantly (audit + admin notification `salon.audience_widened`); narrowing only by admin with a reason, conflicting future bookings and services following §5.12; a clinic's or tattoo studio's audience never changes (`AUDIENCE_CHANGE_NOT_ALLOWED`). |

### 6.3 Discovery
| ID | Requirement |
|---|---|
| BE-20 | Home aggregate in one response: banners, Explore, Recommended, Book again, Near you, unread notifications count (BE-25). |
| BE-21 | Business search combining text + filters (all selected services offered, sum of selected service prices within range, minimum rating, recommended) + nearest sorting within the admin-configured radius (default 10 km), paginated. One card per business, built from its nearest bookable branch. **Not built yet:** Atlas Search for the text part (SRV-059); a server "open now" filter (the app filters loaded pages on the device). |
| BE-22 | Open/closed status and today's hours computed per branch in Asia/Amman, honoring exceptional closures. |
| BE-23 | Favorites, reviews (pending until admin approval), business and staff ratings kept independent. The business rating covers all branches; each review carries its branch as a label (§5.11). |
| BE-24 | **Gender never filters discovery** (§5.22): every LIVE business of every type and audience is listed for everyone on home, nearest, Recommended, favorites, deep links and search; gender is asked only in guest setup and registration. Cards and details return type and audience. The `gender` parameter of the home operation selects banners only. |
| BE-25 | Home sections in the order **banners → Explore → Recommended → Book again → Near you**, each honoring the type lens (`businessType`; All · Salons · Clinics · Tattoo). Explore = most-booked catalog services across the lens' types. Recommended = one rail of the active placements. Book again = registered customers with completed bookings. Near you = one entry per bookable branch by distance, named "Business - Branch" when the business has several branches. Older per-type fields stay in the response for app versions before CUS-102. |
| BE-26 | Typed **search suggestions** (`GET /customer/v1/salons/suggestions`): Services with the number of places offering them, then Places. |
| BE-27 | Search filters: business type (several), services (catalog of the chosen types), gender (Men = MALE or BOTH, Women = FEMALE or BOTH), price (min–max in fils), minimum rating; sort by rating or nearest. |

### 6.4 Availability & Booking Engine
| ID | Requirement |
|---|---|
| BE-30 | Compute available slots (15-minute steps, up to 90 days ahead) per person, for the chosen branch, from: branch schedule, closures, staff working days/hours, leaves, skills (all selected services), bride qualification, and existing PENDING/APPROVED bookings, for the full total duration. |
| BE-31 | Return eligible staff per slot and support "any available staff" assignment. |
| BE-32 | Create bookings with up to 5 companions (audience rules of BE-16), bride flags, bride-only services, price and policy snapshots, branch snapshot and a unique reference number. |
| BE-33 | **Prevent double booking** under concurrency (distributed locks + atomic re-validation at creation, approval and reassignment). |
| BE-34 | Hold slots while a booking is PENDING and for 10 minutes while a draft is open (including an online payment session). |
| BE-35 | Implement the booking state machine: PENDING → APPROVED / REJECTED → COMPLETED / NO_SHOW, and CANCELLED_BY_CUSTOMER / CANCELLED_BY_SALON / AUTO_CANCELLED, with full status history (actor, time, reason). |
| BE-36 | Enforce cancellation windows and refund outcomes from the policy snapshot; business rejection/cancellation and auto-cancel always refund in full. |
| BE-37 | Allow admin to perform any booking action with reason and audit trail. |

### 6.5 Payments, Refunds, Payouts & Subscriptions

**Status today: online payment is paused.** No gateway is chosen (HyperPay is only a candidate) and `@wab/payments` is not used by the server. `PAYMENT_PROVIDER=disabled` in production answers 503 on gateway calls and 401 on webhooks; `fake` serves dev and tests. Apps offer pay on arrival and show online payment as "coming soon". BE-40…BE-43 state the designed Phase 1 rules (the platform collects, refunds automatically, pays businesses manually); the code paths exist and run against the fake provider. Phase 2 = split payments.

| ID | Requirement |
|---|---|
| BE-40 | Collect deposits and full payments through the platform gateway (`wab-payments`); a failed payment never creates a booking. |
| BE-41 | Verify gateway results server-side (webhook signature + status query); use idempotency keys to prevent double charges. |
| BE-42 | Record **every payment attempt** with gateway response codes and messages. |
| BE-43 | Create and track refunds automatically (REFUND_PENDING → REFUNDED / FAILED), with retry and manual completion by admin. |
| BE-44 | Maintain per-business balances (collected − gateway fees − refunds − paid out), with branch filters, and record manual payouts (one bank account and one payout per business). |
| BE-45 | Maintain subscriptions manually: one per business covering all its branches, 3-month trial from approval, payments made outside the app and recorded by admin, expiry tracking; admin sets businesses Offline. |
| BE-46 | Store bank details encrypted; changes require owner OTP. |

### 6.6 Real-time, Notifications & Jobs
| ID | Requirement |
|---|---|
| BE-50 | Emit real-time events (Socket.IO) for booking changes to the customer, permitted members of the branch, the owner and admin; unread counts; permission changes. |
| BE-51 | Send push notifications for every trigger in the notifications matrix (§8), respecting permissions and user push preferences; store all notifications for in-app lists. Booking notifications name "Business - Branch" when the business has several branches. |
| BE-52 | Merchant booking requests delivered as high-priority data messages (Android overlay / iOS time-sensitive with Accept/Reject actions), de-duplicated by booking id. |
| BE-53 | Scheduled per-booking jobs: reminders (1 h and 15 min before), pending alert (30 min before), **auto-cancel 1 h after start** if still pending, closing reminders and overdue alert (BE-90, BE-91); jobs removed when the booking changes. |
| BE-54 | Periodic jobs (§9): subscription and trial expiry checks, account deletion after grace period, alert evaluations and emails, report aggregation, ledger reconciliation, refund retries and delays, payment reconciliation, booking-job reconciliation, storage cleanup. A placement counts as active from its dates, so it has no expiry job. |
| BE-55 | Promotional push campaigns with targeting and scheduling. |

### 6.7 Admin, Analytics, Alerts & Reports
| ID | Requirement |
|---|---|
| BE-60 | Admin APIs for every module in the Admin PRD (customers, businesses, branches, applications, bookings, finance, reviews, catalog, content, push, settings), filterable by business type. |
| BE-61 | Server analytics from MongoDB events (`serverEvents`): overview and event counts per section, and per-business insights. Apps send screens and actions to Firebase Analytics and crashes to Crashlytics, and never send analytics to the backend. **Dropped by the owner 2026-10-19:** BigQuery, funnels, cohorts and per-user journeys (SRV-110, SRV-127 and ADM-074…077 stay PENDING as dropped). |
| BE-62 | Email alerts to the admin: new business application, review pending, payment failure/spike, refund failed/delayed, subscription ending in 7 days / trial ended, new catalog request, business deletion request, audience widened, booking close overdue (thresholds configurable). **Not built yet:** crash and server-error spike alerts (no data source until error tracking exists, SRV-115). |
| BE-63 | Daily, weekly and monthly reports; export any report or table to Excel, CSV and PDF at any time (async for large exports). |
| BE-64 | Immutable audit log of all admin actions (before/after, reason, IP). |
| BE-65 | All platform settings configurable by admin (radius, booking rules, closing intervals, branch limit, OTP rules, locations, app versions, maintenance, alerts). |

### 6.8 Files
| ID | Requirement |
|---|---|
| BE-70 | Issue presigned upload URLs restricted by type, size and expiry; confirm uploads; serve public media through the public bucket's URL. |
| BE-71 | Keep license and medical documents and tattoo design images private; access only through short-lived signed URLs. |
| BE-72 | Generate image size variants (thumbnails) after upload. |
| BE-73 | **File slots:** a single-image field (customer avatar, business logo and cover, member photo, catalog image, banner image, design image) has one stable key; the server copies the confirmed temporary upload onto that key and stores `key?v=n`, so a replacement never leaves an orphan and the URL changes with the version. |
| BE-74 | **Storage cleanup outbox:** modules never delete objects directly. Deletions are queued in `storageCleanups` and run by `periodic.storage-cleanup`; `demo/` keys are never deleted and live slots are skipped. |
| BE-75 | Cloudflare R2 is the active provider; AWS S3 + CDN stays available as a fallback behind the same port. The server alone holds the keys; `npm run storage:cors` sets the browser rule on both buckets. |

### 6.9 Branches
| ID | Requirement |
|---|---|
| BE-80 | A business has one or more branches (limit `salon.maxBranches` = 20, `BRANCH_LIMIT_REACHED`). Per branch: location, contacts, hours, closures, services and prices, staff (one branch per member). Business-wide: name, audience, logo, cover, gallery, description, policy, subscription, payouts, rating, Recommended placement. |
| BE-81 | New branches need no admin approval: a branch is bookable as soon as it is ACTIVE and complete. Owner and admin manage branches. |
| BE-82 | Closing a branch is refused with upcoming bookings (`BRANCH_HAS_UPCOMING_BOOKINGS`); the last branch cannot close (`LAST_BRANCH`); closing the main branch needs a new main branch first. Closed branches keep their history. |
| BE-83 | Branch offline by owner or admin (other branches stay bookable); business offline by admin only. |
| BE-84 | Booking with branches: the first step chooses the branch when more than one is bookable (`BRANCH_REQUIRED`); a draft and its booking keep `branchId` + `branchSnapshot`. Requests go to the owner and the branch's members with `BOOKINGS_RESPOND` over the rooms `branch:{id}:respond` and `branch:{id}:all`. |
| BE-85 | Branch-scoped permissions: managers and employees belong to one branch and every permission applies to that branch (`BRANCH_SCOPE_DENIED`); `FINANCE_VIEW`, `SUBSCRIPTION_VIEW` and `POLICIES_MANAGE` cannot be granted to branch members; branches, team, bank details and the delete request stay owner-only (§6). |

### 6.10 Bookings Made by the Business
| ID | Requirement |
|---|---|
| BE-86 | The owner or a member with `BOOKINGS_CREATE` creates a booking for their branch (`POST /merchant/v1/bookings`) under the same persons, audience, bride, services, staff and slot rules and the same locks as the app, in one step (no draft, no OTP, no online payment). It starts **APPROVED**, pay on arrival, `source = MERCHANT`, `createdBy` = the member; reminders and closing jobs are scheduled. |
| BE-87 | Customer lookup (`GET /merchant/v1/customers/lookup?phone=`), rate-limited with a server event: `{registered, firstName?, gender?}`. Registered → the booking gets `customerId` (a BLOCKED customer → `ACCOUNT_BLOCKED`). Not registered → `customerContact {name, phone, gender}` only: **no account is created and no WhatsApp or SMS is sent**. |
| BE-88 | Claim: when a customer registers or changes phone with a number that has MERCHANT bookings without `customerId`, those bookings get the new `customerId`; their history is not re-notified. |
| BE-89 | A registered customer receives every status notification of that booking, each naming "Booked by <Business - Branch>"; the booking shows in their app with that label and they may cancel it under the snapshotted policy. A booking without an account sends no rating prompt and cannot be reviewed until claimed. Admin lists, details and exports show and filter by `source` and `createdBy`. |

### 6.11 Closing Finished Bookings
| ID | Requirement |
|---|---|
| BE-90 | A booking still APPROVED after its end is *to close*. A reminder `booking.close_reminder` goes out every `booking.closeReminderIntervalMinutes` (60) until it is COMPLETED or NO_SHOW, with no cap: push with Completed / No-show actions + in-app + socket, to the assigned staff, the branch's members with `BOOKINGS_OPERATE` and the owner. |
| BE-91 | After `booking.closeOverdueAlertHours` (24), once: `booking.close_overdue` to the same people and the admin (email + alerts list); reminders continue. |
| BE-92 | Assigned staff may mark their own booking COMPLETED or NO_SHOW without `BOOKINGS_OPERATE` (`TOO_EARLY_TO_COMPLETE` before the start). List tab `TO_CLOSE` on the merchant and admin booking lists, oldest first. |

### 6.12 Tattoo Studios
| ID | Requirement |
|---|---|
| BE-93 | In a TATTOO booking each person may attach **one optional design image** (`BOOKING_REFERENCE` upload by the customer, or by the member for BE-86): private bucket, file slot `bookings/{bookingId}/persons/{index}/reference`, short-lived signed URLs for the customer and members who can view that booking. Any other business type → `BUSINESS_TYPE_MISMATCH`. Tattoo studios have no bride and no age check (§5.23). |

---

## 7. Non-Functional Requirements

| ID | Area | Requirement |
|---|---|---|
| NFR-01 | Security | Apply all approved controls: Helmet headers, HTTPS only, CORS limited to the admin domain, rate limiting (global and stricter on OTP/login/payments), schema validation of every input, NoSQL-injection and XSS sanitization, request size limits, short-lived JWT + rotating revocable refresh tokens, separate token scopes, permission and ownership checks, bcrypt + 2FA + lockout for admin, encryption of sensitive fields, file type/size validation and private documents, webhook signature verification, payment idempotency keys, secrets only in environment/secret stores, no sensitive data in logs, dependency scanning in the local gate, admin audit log, daily database backups. Control-by-control status: `docs/SECURITY_CHECKLIST.md`. |
| NFR-02 | Correctness | Booking, payment and refund operations are atomic and idempotent; no double booking or double charge under concurrency. |
| NFR-03 | Performance | Common read endpoints respond within ~300 ms (p95) excluding network; home aggregate and search use indexes and caching. |
| NFR-04 | Real-time | Booking events reach connected clients within ~2 seconds. |
| NFR-05 | Reliability | Jobs survive restarts (persistent queues); failed jobs retried with backoff and visible to admin. |
| NFR-06 | Scalability | Stateless API instances (horizontal scaling) with Redis for sockets, locks and queues. |
| NFR-07 | Data retention | Server events and operational data kept in MongoDB per business rules; deleted accounts purged after the grace period. App analytics stay in Firebase under Firebase's own retention (no BigQuery export). |
| NFR-08 | Observability | Structured logs, health checks, job and queue monitoring. **Not built yet:** error tracking and API error/latency metrics for the admin Errors page (SRV-115, ADM-082; tool is an open owner decision). |
| NFR-09 | Maintainability | Clean Architecture modules, TypeScript strict mode, linting and formatting, consistent error format, Swagger + Postman always in sync with code. |
| NFR-10 | Testing | Unit tests for business rules (availability, booking state machine, refunds, permissions); integration tests for key APIs; tests run in the local gate before every push. |
| NFR-11 | Localization | Responses localized by `Accept-Language` (ar/en). |
| NFR-12 | Time | UTC storage; Asia/Amman for schedules, open/closed status, reminders and reports. |

---

## 8. Key Business Rules Enforced by the Backend

| ID | Rule |
|---|---|
| BER-01 | A business has one audience. A MALE or FEMALE salon takes only persons of its audience; a BOTH salon, clinic or tattoo studio takes mixed persons; max 5 companions. |
| BER-02 | Bookings up to 90 days ahead, 15-minute slots, duration = sum of services. |
| BER-03 | Staff eligible only if on duty, not on leave, skilled in all selected services, bride-qualified for brides, and free for the whole duration. |
| BER-04 | Pending bookings hold their slot; auto-cancel 1 hour after start with mandatory full refund. |
| BER-05 | Business rejection/cancellation → full refund; customer cancellation follows the policy snapshot. |
| BER-06 | Only the business (its assigned staff included, for their own booking) or admin marks Completed (paid) or No-show, at or after start time. |
| BER-07 | Prices and policies are snapshotted at booking time. |
| BER-08 | Reviews published only after admin approval; any ACTIVE customer may review any LIVE business or its staff. |
| BER-09 | Businesses are visible only when approved, complete, not Offline and with at least one bookable branch. |
| BER-10 | Owner-only permissions are never grantable; permissions enforced on APIs, sockets and notifications. |
| BER-11 | Gateway fees are borne by businesses; payouts and subscriptions are recorded manually. |
| BER-12 | Gender never filters discovery; it only limits who a MALE or FEMALE salon can take. |
| BER-13 | `BusinessType` never changes; catalog services are per type (`BUSINESS_TYPE_MISMATCH`). |
| BER-14 | A business-made booking starts APPROVED and pay on arrival, and contacts nobody without an account. |
| BER-15 | An APPROVED booking past its end keeps reminding until it is closed. |

---

## 9. Success Metrics

| Area | Metric |
|---|---|
| Availability | Uptime ≥ 99.5% (Prod) |
| Correctness | Zero double bookings; zero duplicate charges |
| Performance | p95 API latency targets met (NFR-03) |
| Real-time | p95 event delivery ≤ 2 s |
| Jobs | Reminder/auto-cancel jobs executed on time ≥ 99.9% |
| Payments | When payments resume: payment verification success; refund completion time tracked |
| Security | No critical vulnerabilities open in dependency scans |

---

## 10. Assumptions, Constraints & Dependencies

**Assumptions**
- MongoDB hosted on Atlas in hosted environments.
- Gmail account with App Password for SMTP (admin emails only).
- ARQAM OTP project per environment: TEST key on hosted dev (every code goes to the key's own test phone), LIVE key on prod, approved AR and EN authentication templates.

**Constraints**
- Production hosting not yet selected; the hosted dev API runs on Render.
- Payment gateway not yet selected; online payment is paused.
- Domain not yet selected.

**Dependencies**
- ARQAM OTP (WhatsApp delivery).
- Firebase (FCM in the server; Analytics and Crashlytics in the apps).
- Cloudflare R2 (AWS S3 + CDN as fallback).
- A payment gateway account and SDKs, when payments resume.
- GitHub (repository, private packages when a registry is chosen).

---

## 11. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Race conditions cause double bookings | Redis locks + atomic re-validation + unique constraints |
| WhatsApp OTP delivery fails or costs grow | Platform-side rate limits; delivery failures answered to the app (`OTP_DELIVERY_FAILED`) and logged; `wab-otp` abstraction allows provider change |
| Payment webhook lost or delayed (when payments resume) | Status polling fallback, idempotency, reconciliation view |
| Gmail SMTP sending limits | Admin-only usage, digests for frequent alerts; `wab-notifications` allows switching provider |
| Single region hosting outage | Backups, infrastructure as documented, quick redeploy |
| Split infrastructure (API host, Atlas, R2) | Clear configuration per environment; storage behind `wab-storage` |
| A wrong number on a business-made booking | No message goes to a number without an account; a claim happens only when that number registers with a verified OTP |

---

## 12. Open Items

| # | Item |
|---|---|
| 1 | Platform domain (API, admin, deep links) |
| 2 | Payment gateway selection (HyperPay is a candidate); payments stay paused until then |
| 3 | Production hosting product (DigitalOcean was the working assumption) and managed Redis |
| 4 | Error tracking / logging tool |
| 5 | Atlas cluster tier (Atlas Search waits for it) |
| 6 | Package registry (GitHub Packages assumed) |

---

## 13. Glossary

| Term | Meaning |
|---|---|
| Business | A salon, beauty clinic or tattoo studio. API and field names keep `salon` (`salonId`, `/salons`) as in the contract |
| Branch | A business location with its own contacts, hours, services, prices and staff |
| Audience | Who a business serves: `MALE`, `FEMALE` or `BOTH` |
| Clean Architecture | Code organized in layers (controllers, services/use cases, repositories) with business rules independent of frameworks |
| Package | Reusable library in its own monorepo folder, consumed by projects |
| Presigned URL | Temporary, restricted URL that lets a client upload a file directly to storage |
| File slot | One stable storage key for a single-image field; a replacement overwrites it and bumps `?v=n` |
| Delayed job | Task scheduled to run at a specific time for a specific entity (e.g., a booking reminder) |
| Idempotency key | Unique key ensuring a repeated request (e.g., payment) is processed only once |
| `otpToken` | Signed single-use proof that a phone number was verified for one purpose |
| Socket.IO | Real-time, two-way connection between clients and the server |
