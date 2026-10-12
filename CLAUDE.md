# WAB Wedding & Beauty — Monorepo Guide for AI Agents

> **MANDATORY for every session and every task — read and apply all of these before doing anything:**
> - Rules: @.claude/rules.md
> - Roles: @.claude/roles.md
> - Hooks & workflow (incl. the 4-role review): @.claude/hooks.md
> - Session tasks (done / pending): @.claude/session.md
> - Memory (durable facts — check before investigating): @.claude/memory.md
>
> Hooks in `.claude/settings.json` enforce these rules (branching, no-hardcode, unit tests, 3 verification loops, review). Never disable or bypass them.

> Read this file first in every session. It explains the whole business, every project in this repo, where the requirements live, and how the projects integrate. Then read the docs of the project you are working on **before** writing code.

---

## 1. The Business in One Page

**WAB Wedding & Beauty** is a two-sided marketplace in **Jordan** that connects customers with **men's and women's salons**.

- **Customers** (mobile app) discover salons by gender, search/filter, view salon profile (hours, staff, services & prices, reviews, gallery), and **book** appointments for themselves + up to **5 companions**. Women's salons support **bride bookings** (bride-only VIP services, bride-qualified staff).
- **Salons / merchants** (separate mobile app) register with a license document, get approved by admin, complete their profile, manage services (from an admin catalog), staff, schedules, policies, and **accept/reject booking requests in real time** (Uber/Careem-style).
- **Admin** (web panel) has full visibility (analytics of every screen/action/payment attempt/error, per-user journeys) and full control (approvals, bookings, refunds, payouts, subscriptions, reviews, catalog, content, push, settings, reports).

**Business model:** free for customers; salons pay a **monthly subscription** (first 3 months free, paid outside the app) and can buy **"Recommended" placement**. No commission today.

**Money flow (Phase 1, current):** online payments (deposit % or full) are collected by the **platform** through one gateway; **refunds are automatic** via the gateway; **payouts to salons are manual** (admin records transfers); gateway fees are deducted from salon payouts. **Phase 2 (future):** each salon becomes a sub-merchant (marketplace/split payments, direct settlement). Design code so Phase 2 is an extension, not a rewrite.

**Language/market:** Arabic is the default (RTL) + English. Currency **JOD only**, prices tax-inclusive. Time: store UTC, compute in **Asia/Amman**, display 12-hour.

---

## 2. Repository Map

| Path | Project | Status | Tech |
|---|---|---|---|
| `WAB-Mobile-Customer/` | Customer mobile app (Android + iOS) | Code in progress | Kotlin Multiplatform + Compose Multiplatform (see its `AGENTS.md`, `TECHSTACK.md`) |
| `WAB-Mobile-Salon/` | Merchant (salon) mobile app | Docs + design ready, no code yet | KMP + Compose Multiplatform (same stack/template as customer) |
| `WAB-Admin-Dashboard/` | Admin web panel | Docs + design ready, no code yet | React web app (desktop-first) |
| `WAB-Server/` | Backend API for all 3 clients | Old JS code removed; to be rebuilt from scratch in TypeScript per Backend BRD | Node.js + Express + Mongoose/MongoDB + Redis + Socket.IO |
| `wab-payments/` | Payment library (server **and** KMP) | BRD only | TypeScript npm package + KMP library |
| `wab-otp/` | OTP verification library (server) | BRD only | TypeScript npm package |
| `wab-notifications/` | Push + email library (server) | BRD only | TypeScript npm package |
| `wab-analytics/` | Server events + analytics queries (server) | BRD only | TypeScript npm package |
| `wab-storage/` | File storage library (server) | BRD only | TypeScript npm package |

Each project has:
- `docs/` — BRD (business), PRD (product/functional, source of truth for behavior), Design Script (UI brief).
- `design/` (apps only) — Claude Design export. `*.dc.html` = design source; `WAB Standalone/*.html` = offline viewable screens; `video/` or `*Demo*/*Ad*` = demo video. Use designs as the visual reference; the PRD wins on behavior.

> The `wab-*` packages are planned as **separate repositories published as private packages** (npm; Maven for the KMP part of `wab-payments`). They live here during design. Do not put business rules inside packages.

---

## 3. Document Index (read before coding)

| Area | Documents |
|---|---|
| **Whole business (data model, rules, state machines, permissions, jobs, settings, errors)** | **`BUSINESS_DOMAIN.md`** — mandatory for any server, contract or cross-project work |
| Customer app | `WAB-Mobile-Customer/docs/WAB_Customer_BRD.md`, `WAB_Customer_App_PRD.md`, `WAB_Customer_Design_Script.md` |
| Merchant app | `WAB-Mobile-Salon/docs/WAB_Merchant_BRD.md`, `WAB_Merchant_App_PRD.md`, `WAB_Merchant_Design_Script.md` |
| Admin panel | `WAB-Admin-Dashboard/docs/WAB_Admin_BRD.md`, `WAB_Admin_PRD.md`, `WAB_Admin_Design_Script.md` |
| Backend | `WAB-Server/docs/WAB_Backend_BRD.md`; task backlog `WAB-Server/docs/WAB_Server_Tasks.md` (legacy `WAB-Server/BRD.md` is superseded) |
| Packages | `wab-*/docs/WAB_Package_*_BRD.md` |
| Delivery plan | `ROADMAP.md` (phases & parallel tracks: SERVICE, SERVER, CUSTOMER, MERCHANT, ADMIN, INT) |
| Integration & environments | `INTEGRATION_WORKFLOW.md` (contracts in `contracts/`, mocks, dev/prod, CI/CD) |

**Precedence:** PRD > BRD > Design Script > design files. If two documents conflict, stop and ask; do not guess. Every PRD has an "Open Items & Assumptions" table — implement the stated assumption and keep it easy to change.

---

## 4. How the Projects Integrate

```
 Customer app (KMP) ─┐                         ┌─ Firebase (Phone Auth OTP, FCM, Analytics, Crashlytics → BigQuery)
 Merchant app (KMP) ─┼── REST /v1 + Socket.IO ─┤
 Admin panel (React)─┘          │              ├─ MongoDB (Atlas: Atlas Search, 2dsphere)
                                ▼              ├─ Redis (BullMQ jobs, Socket.IO adapter, locks, rate limits, cache)
                           WAB-Server ─────────┼─ Payment gateway (via wab-payments; HyperPay candidate)
                     (uses wab-* packages)     ├─ AWS S3 + CDN (via wab-storage; presigned uploads)
                                               └─ Gmail SMTP (admin alerts/2FA via wab-notifications)
```

### 4.1 API contract
- REST + JSON, versioned, **separate namespaces and token scopes**: `/customer/v1`, `/merchant/v1`, `/admin/v1`. A customer token must never work on merchant/admin endpoints.
- `Accept-Language: ar|en` on every request; server returns localized content.
- Swagger (OpenAPI) generated from code + a Postman collection kept in `WAB-Server/` — update both with every endpoint change.
- Pagination: page size 10 for apps (admin tables 25 default). Search debounce on clients: 500 ms.

### 4.2 Auth & OTP
- Customers and merchant members log in with **phone + OTP (Firebase Phone Auth, SMS)**. Flow: app → backend OTP pre-check (`allowed`, `otpLength` = 6 today, `resendAfterSeconds` = 60) → Firebase sends/verifies code → app sends **Firebase ID token** → backend (`wab-otp`) verifies token + phone → backend issues its own **JWT access (short) + rotating refresh token** (stored, revocable).
- Limits: 5 OTP requests / 5 min → 15 min block; 5 wrong codes → 15 min block. Never hardcode OTP length in apps.
- Admin: email + password + email OTP (2FA), lockout after 5 failures.
- Merchant permissions: Owner has all; owner grants per-feature permissions to Manager/Employee (15 keys, see Merchant PRD §6). Enforce on **every** merchant endpoint, socket event and notification. Hidden-not-disabled in UI.

### 4.3 Real-time
- **Socket.IO** (Redis adapter). Rooms per user, per salon (filtered by permission), and admin.
- Must update in real time: booking lists/details (all 3 clients), merchant dashboard + calendar, unread notification counts, admin live overview/queues. Clients also refresh on FCM message / app foreground.
- New booking request → Socket event (app open) **and** FCM high-priority data message (background) to members with `BOOKINGS_RESPOND`; clients de-duplicate by booking ID.

### 4.4 Notifications
- FCM: one Firebase project, 4 app registrations (customer Android/iOS, merchant Android/iOS). Merchant booking requests: Android overlay/full-screen; iOS time-sensitive with Accept/Reject actions.
- Tapping a system push in the customer app opens the Notifications screen. All triggers are listed in Customer PRD §10 and Merchant PRD §11.
- Admin email alerts (Gmail SMTP): new salon application, review pending, payment failure/spike, refund failed/delayed, crash/5xx spike, subscription ending in 7 days / trial ended, new catalog request.

### 4.5 Scheduled work (BullMQ + cron)
Per booking: reminders 1 h and 15 min before (approved); alert 30 min before if still pending; **auto-cancel 1 h after start if still pending** (mandatory full refund). Remove jobs when bookings change. Periodic: subscription/trial checks, recommended placement expiry, account deletion after 30-day grace, alert evaluation, report aggregation.

### 4.6 Files
Presigned upload URL → client compresses image/video → direct upload to S3 → backend confirms (type/size) → CDN URL. License documents and exports are private (short-lived signed URLs, admin only).

### 4.7 Analytics
Apps track **every screen and action** in Firebase Analytics (exported to BigQuery, kept forever); apps set Firebase user ID on login and send the Firebase app-instance ID to the backend so guest history links to the account. Server-side events (OTP, payment attempts with gateway codes, refunds, jobs, API errors, admin actions) are stored in MongoDB. `wab-analytics` serves admin dashboards, funnels, cohorts and per-user journeys. Apps never send analytics to the backend directly.

---

## 5. Core Business Rules (enforced on the server)

1. Each salon serves **one gender**; companions match it; max 5 companions.
2. Salon visible only if **approved + profile complete + not Offline**.
3. Slots every 15 min, up to 90 days ahead; duration = sum of service durations.
4. Staff eligible only if on duty, not on leave, skilled in **all** selected services, bride-qualified for brides, free for the full duration.
5. **No double booking** (Redis locks + atomic re-validation on create/approve/reassign). PENDING bookings hold their slot.
6. Status machine: PENDING → APPROVED / REJECTED → COMPLETED / NO_SHOW; cancellations: by customer, by salon, auto. Full status history (actor, time, reason).
7. Salon reject/cancel and auto-cancel → **full refund**. Customer cancel of an approved booking follows the salon's cancellation window and refund policy (snapshotted at booking time).
8. Only salon (or admin) marks Completed/No-show, at/after start time.
9. Prices and policies are **snapshotted at booking**; no rescheduling, no partial cancellation.
10. A failed payment never creates a booking; payments use idempotency keys and server-side verification.
11. Reviews (salon and staff, independent ratings) are published only after admin approval; any registered customer may review.
12. Admin can do anything, always with a reason, audit log, and notification to affected parties.

---

## 6. Engineering Conventions

- **Never commit secrets.** `.env*` (except `.env.example`), keystores, service-account JSON, xcconfig secrets stay out of git. Do not modify `.env.*` files without explicit permission.
- Backend target: **follow `WAB-Server/CLAUDE.md`** — TypeScript strict, layered `route → middleware → controller → service → repository → schema`, separate customer/merchant/admin modules, base success/error responses localized AR+EN, validation on every input, consistent error format, no magic numbers (config/constants), tests for business rules (availability, booking state machine, refunds, permissions).
- Mobile: follow `WAB-Mobile-Customer/CLAUDE.md` (mandatory rules: Clean Architecture + MVI by delegate, no hardcoding, AR+EN resources, all build variants, CI, 300-line files, portrait + landscape) and `WAB-Mobile-Customer/AGENTS.md` (clean + feature-driven, Koin, Ktor, Compose Navigation). Wrap Firebase (OTP, push, analytics, crash) behind app-level interfaces. Payments only through `wab-payments`.
- Admin: React, Arabic RTL default, data tables with server pagination, export (Excel/PDF), Socket.IO for live pages.
- Respect existing per-project agent files (`WAB-Server/CLAUDE.md`, `WAB-Mobile-Customer/CLAUDE.md`, `WAB-Mobile-Customer/AGENTS.md`) — they add project-specific rules on top of this file.
- Environments: **dev** and **prod**. CI/CD: GitHub Actions. Server hosting: DigitalOcean (TBD); files on AWS S3 + CDN.
- Before finishing a task: build, lint, run tests, and re-check the PRD acceptance criteria you touched.

---

## 7. Open Decisions (do not invent answers)

Platform domain (API/admin/deep links) · payment gateway selection · DigitalOcean product & managed Redis · error-tracking tool · Atlas tier · package registry (GitHub Packages assumed) · KMP library choices for the merchant app (use the customer app template) · admin tech-stack details beyond React.
