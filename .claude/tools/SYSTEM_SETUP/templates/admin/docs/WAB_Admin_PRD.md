# WAB Wedding & Beauty — Admin Panel PRD

> **Document type:** Product Requirements Document — Admin Panel (web)
> **Audience:** AI coding agents and engineers implementing the admin panel.
> **Version:** 1.1 — updated with backend decisions: Socket.IO real-time, analytics from Firebase/BigQuery, email via Nodemailer + Gmail SMTP.
> **Related documents:** Customer App PRD & BRD, Merchant App PRD & BRD, Admin BRD, Backend BRD.

---

## 0. How to Read This Document
- **MUST / SHOULD / MAY** as usual.
- Each page lists: purpose, layout, data, filters, actions, states, acceptance criteria.
- Entities, statuses and rules referenced here are defined in the Customer and Merchant PRDs; this document does not redefine them.
- Undecided items are listed in **Section 14**.

---

## 1. Overview

A **React web application** for a **single administrator** with full permissions to monitor and operate the WAB platform. Priority #1 is **analytics and full visibility** (every screen view, every action, every payment attempt, every error, every user journey). Priority #2 is **full control** over all entities with an audit trail.

---

## 2. Technical Constraints

### 2.1 Confirmed
- **React** single-page web app, desktop-first, responsive down to tablet.
- Talks to the backend (Node.js + TypeScript + Express + Mongoose, MongoDB, Redis) via admin APIs under a dedicated namespace (e.g., `/admin/v1`) with a separate admin token scope.
- **Real-time:** Socket.IO (admin room).
- **Email alerts and admin OTP:** Nodemailer + Gmail SMTP (through the `wab-notifications` server package).
- **Files:** AWS S3 + CDN; private documents (salon licenses) only through short-lived signed URLs.
- **Analytics source:** Firebase Analytics + Crashlytics raw data exported to **BigQuery**, queried by the backend (`wab-analytics` package); server-side events stored in MongoDB.

### 2.2 Tech Stack
> **TBD — provided later by the product owner as a template.**

---

## 3. Global UI Rules

- **Languages:** Arabic (RTL) and English (LTR), switchable; default Arabic. All dates in **Asia/Amman** timezone, 12-hour format.
- **Layout:** collapsible sidebar (modules) + top bar (global search, alerts bell with unread count, language, admin menu).
- **Global search:** search across customers (name/phone), salons (name), bookings (reference), members (phone) — results grouped by type.
- **Tables:** server-side pagination (default 25, options 10/25/50/100), sorting, column filters, saved filter in URL (shareable/bookmarkable), column visibility toggle, row click → details page, **Export** (Excel/CSV and PDF) of the current filtered result.
- **Date range picker** with presets: Today, Yesterday, Last 7 days, Last 30 days, This month, Last month, This year, Custom. Optional comparison with the previous period.
- **Charts:** line/bar/pie/funnel with tooltips; every chart has "View data" (table) and export.
- **States:** skeleton loading, empty state, error with retry, permission-denied (session expired → login).
- **Destructive or impactful actions:** confirmation modal + **mandatory reason**; after success show toast; action written to the audit log; affected users notified (push/in-app) where applicable.
- **Edits:** forms with validation identical to the mobile apps' rules; show "last updated by/at".
- **Deep links between entities:** every reference (customer, salon, booking, member, transaction) is clickable.
- **Real-time (Socket.IO):** Live Overview, Bookings list and details, Applications queue, Reviews queue, Refunds and Alerts update instantly.

---

## 4. Authentication & Security
- Login: email + password, then **second factor** (OTP code sent to the admin email or authenticator app — assumption: email OTP).
- Session timeout after 2 days of inactivity (owner 2026-10-26; server `admin.sessionIdleSec` = 172800); refresh token for active sessions; a page reload keeps the session.
- Lockout after 5 failed logins for 15 minutes; alert email on new-device login.
- Admin profile: change password, change email (with verification), alert email recipients.

---

## 5. Analytics Data Foundation (shared contract)

**Sources:**
1. **App events** — tracked with Firebase Analytics in the customer and merchant apps and exported by Firebase to **BigQuery** (daily + streaming export), retained **forever**. Every app event carries the custom parameters below.
2. **Crashes** — Firebase Crashlytics exported to BigQuery.
3. **Server events** — produced by the backend (OTP, payments, refunds, jobs, API errors, admin actions) and stored in MongoDB.

The backend (`wab-analytics` package) queries BigQuery and MongoDB and exposes aggregated and raw data to the panel. Pre-aggregated tables (scheduled queries) back the dashboards. Common fields:

| Field | Description |
|---|---|
| `eventId` | Unique ID |
| `eventName` | e.g., `screen_view`, `booking_submit` |
| `clientTimestamp`, `serverTimestamp` | Times |
| `app` | CUSTOMER / MERCHANT |
| `installationId` | Unique per app install (identifies guests) |
| `userId?` / `memberId?` / `salonId?` | When authenticated |
| `userType` | GUEST / CUSTOMER / MERCHANT_OWNER / MANAGER / EMPLOYEE |
| `sessionId` | Session grouping |
| `screen` | Screen ID (S03, M09…) |
| `platform`, `osVersion`, `appVersion`, `deviceModel` | Device context |
| `language`, `genderScope`, `city?` | Context |
| `networkType` | wifi/cellular/offline |
| `params` | JSON (salonId, serviceId, bookingId, query, filters, error codes…) |

**Identity merge:** `installationId` = Firebase app instance ID. On login/registration the apps set the Firebase user ID and send the app instance ID to the backend, which stores the link (installation ↔ user/member). Journeys include all events of every linked installation, including guest events before registration. A user may have multiple installations (devices).

**System events** (server-side) are also recorded: OTP sent/failed/blocked, payment gateway requests/responses, refunds, auto-cancellations, push sends/deliveries, API errors (endpoint, status, latency).

---

## 6. Navigation (Sidebar)

1. **Live Overview**
2. **Analytics** — Traffic & Users · Screens & Events · Funnels · Search & Discovery · Retention · Bookings · Payments · Errors & Issues · Merchants
3. **User Journey**
4. **Customers**
5. **Salons** — All salons · Applications
6. **Bookings**
7. **Finance** — Transactions · Refunds · Payouts · Subscriptions · Reconciliation
8. **Reviews**
9. **Catalog** — Services · Requests
10. **Content** — Banners · Recommended · Legal pages · FAQ · Contact info
11. **Push Notifications**
12. **Reports**
13. **Alerts**
14. **Settings**
15. **Audit Log**

---

## 7. Page Specifications — Analytics

### A01 — Live Overview
**Auto-refresh.** Cards:
- Active users now (last 5 min) — split: guests / customers / merchants; by platform.
- Today: new installs, new registrations, bookings created (by status), pending requests (oldest waiting time), bride bookings.
- Today's payments: attempts, success, failed (top failure reason), amount collected.
- Refunds pending / failed.
- Errors last hour: API error rate, crashes, OTP blocks.
- Salons: pending applications, Offline count, trials ending ≤7 days.
- **Live activity feed:** latest important events (registration, booking, payment failure, application, review) with links.
- Mini-charts: bookings per hour today vs same day last week.

### A02 — Traffic & Users
- KPIs: installs, DAU, WAU, MAU, sessions, avg session duration, guest→registered conversion.
- Breakdowns: app, platform, app version, OS version, device model, language, gender scope, city.
- Charts over time; table export.

### A03 — Screens & Events
- **Screens ranking:** views, unique users, avg time on screen, exits (last screen in session) per screen.
- **Event explorer:** select event name → count over time, unique users, breakdown by any param; raw events table (paginated) with all fields and JSON params; click user → User Journey.
- Filters: date range, app, platform, user type, version, gender, city, salon.

### A04 — Funnels
Predefined funnels (step counts, conversion %, drop-off %, median time between steps; segment filters):
1. **Activation:** first open → onboarding seen → nickname & gender saved → home viewed.
2. **Registration:** login/register started → OTP requested → OTP verified → registered.
3. **Booking:** salon details viewed → Book tapped → (auth) → person → services → date/time → staff → companions → summary → OTP verified → payment started → payment success / pay-on-arrival → booking created.
4. **Approval:** booking created → approved / rejected / auto-cancelled → completed / no-show.
5. **Merchant onboarding:** app opened → OTP verified → application submitted → approved → setup checklist complete → live.
- Click any drop-off → list of users who dropped at that step → User Journey.
- **Custom funnel builder (SHOULD):** choose ordered events + time window.

### A05 — Search & Discovery
- Top search queries; **zero-result queries** (count, last seen, gender, city).
- Filter usage (each filter, combinations), entry points to All Salons.
- Banner impressions/clicks/CTR; Recommended section clicks per salon.
- Nearby: location permission granted/denied/permanently denied rates.
- Salon profile views ranking; calls/WhatsApp/map taps per salon; shares and deep link opens.
- Favorites added/removed per salon.

### A06 — Retention
- Cohort table (by install week/month) for customers and merchants: % active on day 1/7/30, week N.
- Repeat booking rate (30/90 days); bookings per customer distribution.

### A07 — Bookings Analytics
- Bookings by status over time; by gender; by city; by salon; bride bookings; persons per booking.
- Average salon response time (overall and per salon), approval rate, rejection reasons, salon cancellation reasons, customer cancellations (and timing vs window), auto-cancellations, no-shows.
- Payment method distribution (on arrival / deposit / full).
- Lead time (booking created → appointment).

### A08 — Payments Analytics
- **Every attempt** table: time, customer, salon, booking reference, amount, method (deposit/full), result (success/failed/cancelled/pending), **gateway response code & message**, duration, device/app version; click → Transaction details.
- KPIs: success rate, failures by reason, failures by platform/version, amounts collected, gateway fees.
- Refunds: count, amount, average time to complete, failed.

### A09 — Errors & Issues
- API errors: by endpoint, status code, rate over time, p95 latency; click → list of failed requests (user, time, payload summary).
- Client errors: no-internet occurrences, server-error screens shown, retries.
- Crashes: crash count and crash-free users per app/platform/version (from the Crashlytics BigQuery export), with link-out to the Firebase console.
- OTP: sends, failures (provider), wrong attempts, blocks.
- Payment failures and refund failures (links to Finance).
- Push delivery failures.

### A10 — Merchants Analytics
- Salons by state (pending, rejected, incomplete, live, offline); application approval time.
- Profile completeness distribution; salons missing items.
- Per salon: response time, approval/cancellation/no-show rates, bookings, revenue, rating, profile views, last activity.
- Member activity: logins, actions per member.
- Subscriptions: trials active, ending ≤7 days, expired, paid active.

---

## 8. Page Specifications — Operations

### A11 — User Journey
- Search by phone, name, user ID, member ID, installation ID, or booking reference.
- Header: identity (customer/guest/member), devices & installations, first seen, last seen, registration date, totals (sessions, bookings, payments).
- **Timeline** (newest or oldest first): grouped by session; each event shows time, screen, event name, key params, device; errors and payment attempts highlighted; expandable JSON.
- Filters: date range, event types, app, session.
- Pre-registration (guest) events shown in the same timeline with a "Guest" marker.
- Export timeline.

### A12 — Customers
**List:** name, phone, gender, city, registered at, last active, bookings count, status (active/blocked/deletion pending). Filters, search, export.
**Details (tabs):** Profile (edit all fields) · Bookings · Payments & refunds · Reviews · Journey (A11 embedded) · Devices & installations · Notifications sent.
**Actions:** edit, block/unblock (reason), restore account in grace period, force delete (reason), send push to this user.

### A13 — Salons
**List:** name, gender type, city/area, state, subscription status, rating, bookings (30d), recommended flag, created at. Filters by state/gender/city/subscription; export.
**Details (tabs):**
- Overview: state, completeness checklist, subscription summary, KPIs, actions.
- Profile (edit all: names, images, description, location, contacts, gender type).
- Documents (license files preview/download).
- Gallery (view/delete/upload).
- Working hours & closures (edit).
- Services (edit price/duration/flags, deactivate).
- Members & staff (edit, deactivate, roles, permissions).
- Policies (edit).
- Bookings, Reviews, Finance (transactions, refunds, payouts, balance, bank details), Analytics, Activity (members' journeys).
**Actions:** approve/reject application (reason), set **Online/Offline** (reason; Offline hides the salon and blocks new bookings), mark/unmark Recommended (→ A20), handle deletion request, send push to owner/members.

### A14 — Applications Queue
- Pending applications (oldest first): salon name, type, city, owner, phone, submitted at, resubmission count.
- Review page: all submitted data + document viewer (zoom, rotate, download) → **Approve** or **Reject** (reason; notifies owner).

### A15 — Bookings
**List:** reference, customer, salon, appointment date/time, persons, bride, status, payment status, refund status, total, created at. Filters: status, payment, refund, date ranges (created/appointment), salon, gender, city, bride, method. Export.
**Details:** everything from the mobile booking details + full **status history** (actor: customer/member/system/admin, reason), related transactions & refunds, notifications sent, related events.
**Admin actions (all require reason, notify customer and salon):** approve, reject, cancel (as salon or as customer policy, or admin cancel with full refund), mark completed/paid, mark no-show, revert status (with warning), reassign staff (eligible list), issue refund (full/partial).

### A16 — Transactions
- Every payment attempt and capture (see A08 table) with filters and export.
- Details: gateway request/response log, booking link, amounts, fees, status timeline.

### A17 — Refunds
- List: booking, customer, salon, amount, reason/source (salon rejection, salon cancel, auto-cancel, customer cancel, admin), status (pending/refunded/failed), created, completed.
- Actions: retry failed refund, **mark as refunded manually** (reference required), issue manual refund from booking.
- Alert when pending longer than the configured threshold.

### A18 — Payouts
- Per-salon balances: collected online, gateway fees, refunds, previous payouts, **net due**.
- Create payout: select salon(s) and period → system computes amounts → admin records **transfer date, amount, bank reference, note** → status Transferred (salon notified).
- Payout history, filters, export. Salon bank details shown read-only (editable with reason).

### A19 — Subscriptions
- List: salon, status (trial/active/expired), trial end, current period end, days remaining, last payment.
- Record payment: amount, date, period covered (from–to), method, reference, note → extends period.
- Bulk view: trials/subscriptions ending in ≤7 days; expired.
- Action: set salon Offline/Online from here.

### A20 — Recommended Salons
- List per gender: salon, period (start–end), order, amount paid, status (scheduled/active/ended).
- Add/edit/remove; drag to reorder; expired placements automatically removed from the customer app.

### A21 — Reconciliation
- Period summary: total collected, gateway fees, refunds, payouts transferred, balance owed to salons; mismatches flagged.

### A22 — Reviews Moderation
- Queue: pending reviews (salon or staff), author, target, rating, comment, submitted at, author's previous reviews count.
- Actions: **Approve**, **Reject** (optional reason). Bulk approve/reject.
- Published reviews list: remove (reason), filter by salon/staff/rating.

### A23 — Catalog
- **Services:** list by gender; create/edit: name (ar/en), description (ar/en), image, gender, active, sort order. Deactivation warns about salons using it.
- **Requests:** salon requests (name, description, image, salon) → Approve (creates or maps to a catalog service; notifies salon) / Reject (note).

### A24 — Content
- **Banners:** image (ar/en variants), action (none / salon / external URL), target gender (men/women/both), start–end schedule, order, active; preview.
- **Legal pages:** Privacy, Terms, About (rich text ar/en), separately for customer and merchant apps.
- **FAQ:** questions/answers (ar/en), per app, ordering.
- **Contact info:** phone, WhatsApp, email (per app).

### A25 — Push Notifications
- Compose: title & body (ar/en), app (customer/merchant), audience: all / guests / registered / gender / city / salon members / specific users (search) / users from a saved analytics segment; optional link target; send now or schedule.
- History: audience size, sent, delivered, opened, failures.
- Promotional notifications appear in customers' notification lists (type PROMOTION).

### A26 — Reports
Predefined reports with date period selection and **Export to Excel and PDF at any time**:
- **Daily:** installs, registrations, active users, bookings by status, payments (success/fail), revenue collected, refunds, new applications, reviews pending, errors summary.
- **Weekly:** daily report aggregated + funnels, top salons, top services, response times, cancellations/no-shows, zero-result searches.
- **Monthly:** weekly content + retention, subscriptions (trials, paid, expired), payouts, recommended placements, growth vs previous month.
- Each report also viewable on screen with charts.
- (MAY) Schedule automatic email of reports.

### A27 — Alerts
**Delivered by email** to the configured admin email(s) and listed in the Alerts page (bell icon):
| Alert | Default condition (configurable in Settings) |
|---|---|
| New salon application | On each submission |
| New review pending moderation | On each submission (or digest every hour — configurable) |
| Payment failure / spike | Each failure (digest) and spike: ≥5 failures in 15 min or failure rate ≥20% in 1 hour |
| Refund failed or delayed | Failed immediately; pending > 48 h |
| Crash / server error spike | API 5xx rate ≥2% over 10 min, or crashes ≥10 in 1 hour |
| Subscription ending / trial ended | 7 days before end; on trial end |
| New catalog service request | On each submission |
- Alerts page: status (new/acknowledged), link to entity, acknowledge action.

### A28 — Settings
- **Discovery:** nearby radius (km, default 10).
- **Booking rules:** max days ahead (90), slot interval (15 min), max companions (5), auto-cancel delay after appointment start (1 h), pending alert before appointment (30 min), reminders (1 h, 15 min).
- **OTP:** code length returned to apps (currently **6**, must match Firebase), resend wait (60 s), request limit (5 / 5 min), wrong attempts (5), block duration (15 min). Channel: SMS via Firebase.
- **Locations:** countries (name, flag, dial code, phone regex, active), cities and areas (ar/en, active).
- **App versions** (per app & platform): latest version, minimum supported (force update), optional update flag, store URLs.
- **Maintenance mode** per app with message (ar/en).
- **Account deletion grace period** (30 days).
- **Alerts:** recipients and thresholds.
- **Payout settings:** payout frequency note.

### A29 — Audit Log
- Every admin action: time, action, entity type/id (link), before/after values (diff), reason, IP, device.
- Filters, export. Immutable.

---

## 9. Admin Action → Notification Matrix
| Admin action | Customer notified | Merchant notified |
|---|---|---|
| Booking status change / cancel / reassign | ✅ | ✅ |
| Manual refund | ✅ | ✅ (FYI) |
| Application approved/rejected | — | ✅ Owner |
| Salon Online/Offline | — | ✅ Owner |
| Review rejected | — (assumption: silent) | — |
| Customer blocked | On next login message | — |
| Payout transferred | — | ✅ |
| Catalog request decision | — | ✅ |

---

## 10. Validation
Same field rules as the mobile PRDs for any entity edited from the panel; plus: banner schedule end > start; recommended period end > start; payout amount > 0 and ≤ net due (warning if different); subscription period dates valid.

---

## 11. Performance
- Analytics queries over large ranges MUST use pre-aggregated data where possible; raw event tables paginated.
- Pages SHOULD load within 2 seconds for common ranges (≤30 days).

---

## 12. Expected Backend Capabilities (indicative)
Admin auth (password + 2FA); analytics query APIs (aggregates, funnels, cohorts, event explorer, journeys); CRUD/admin actions for customers, salons, applications, members, services, catalog, bookings, refunds, payouts, subscriptions, reviews, content, push campaigns, settings; exports (async generation for large files); alerts engine + email delivery; audit log.

---

## 13. Out of Scope
Multiple admins/roles, ticketing, automated payouts, online subscription billing, merchant web dashboard.

---

## 14. Open Items & Assumptions

| # | Item | Assumption |
|---|---|---|
| 1 | Tech stack details | TBD (React confirmed) |
| 2 | Admin 2FA method | Email OTP |
| 3 | Alert thresholds | Defaults in A27, configurable |
| 4 | Real-time mechanism | Socket.IO (decided) |
| 5 | Crash data source | Crashlytics BigQuery export (decided) |
| 6 | Scheduled report emails | Optional |
| 7 | Panel languages | Arabic + English |
| 8 | Admin panel domain | TBD (to-do) |
