# WAB Wedding & Beauty — Admin Panel PRD

> **Document type:** Product Requirements Document — Admin Panel (web)
> **Audience:** AI coding agents and engineers implementing the admin panel.
> **Version:** 1.2 — 2026-11-04.
> **Related documents:** `BUSINESS_DOMAIN.md` (the single source for data, enums, rules, state machine, permissions, jobs, settings and error codes), Admin BRD, Admin Design Script, Customer and Merchant PRD & BRD. Wire format: the generated `WAB-Server/docs/api/openapi.admin.json`.
> **Precedence:** PRD > BRD > Design Script > design files.

---

## 0. How to Read This Document
- **MUST / SHOULD / MAY** as usual.
- Each page lists: purpose, layout, data, filters, actions, states, acceptance criteria.
- Entities, statuses and rules referenced here are defined in `BUSINESS_DOMAIN.md`; this document does not redefine them.
- **Business** = a salon, a beauty clinic or a tattoo studio (`businessType`: `SALON`, `CLINIC`, `TATTOO`). API names and some screen labels still say "salon": `/salons`, `salonId`, the "Salons" sidebar module.
- A line starting **Not built yet:** marks a requirement the panel or server does not deliver today.
- Undecided items are listed in **Section 14**.

---

## 1. Overview

WAB is a two-sided marketplace in Jordan connecting customers with businesses of three types: salons (men, women or both), beauty clinics and tattoo studios. The **admin panel** is a **React web application** for a **single administrator** with full permissions. Priority #1 is **full control** over every entity with an audit trail: business applications, businesses and their branches, customers, bookings, money, reviews, the per-type catalog, content, notifications and settings. Priority #2 is **visibility of what the server records**: booking, payment, refund, error and OTP events and the operational lists. App behaviour (screens, actions, crashes) is tracked in Firebase and read in the Firebase console, not in this panel (§5).

---

## 2. Technical Constraints

### 2.1 Confirmed
- **React** single-page web app, desktop-first, responsive down to phone (portrait and landscape).
- Talks to the backend (Node.js + TypeScript + Express + Mongoose, MongoDB, Redis) through `/admin/v1` with a separate admin token scope. Contract: admin 1.16.0, 164 operations.
- **Environments:** hosted dev API on Render (`wab-server-dev.onrender.com`). Production hosting and the platform domain are open owner decisions (§14).
- **Real-time:** Socket.IO, `/admin` namespace (admin room).
- **Email alerts and admin OTP:** Gmail SMTP through the `wab-notifications` server package.
- **Files:** Cloudflare R2 (`STORAGE_PROVIDER=cloudflare-r2`, public + private bucket; AWS S3 + CDN is only a fallback). Presigned upload → direct upload → confirm → public URL. Private files (business licenses, tattoo design images) only through short-lived signed URLs.
- **Analytics source:** the server's own events in MongoDB (`serverEvents`) and the operational lists. BigQuery and the `@wab/analytics` SDK in the server were dropped by the owner on 2026-10-19 (§5).

### 2.2 Tech Stack
React 19, TypeScript strict, Vite, React Router, TanStack Query, zod, i18next; Vitest and Playwright. Architecture and rules: `WAB-Admin-Dashboard/CLAUDE.md`, `docs/ADMIN_ARCHITECTURE.md`.

---

## 3. Global UI Rules

- **Languages:** Arabic (RTL) and English (LTR), switchable; default Arabic. All dates in **Asia/Amman** timezone, 12-hour format. Money in JOD, tax-inclusive.
- **Layout:** collapsible sidebar (modules) + top bar (global search, alerts bell with unread count, language, admin menu).
- **Global search:** across customers (name/phone), businesses (name), bookings (reference), members (phone); results grouped by type.
- **Tables:** server-side pagination (default `pagination.adminPageSize` = 25), filters kept in the URL (shareable/bookmarkable), row click → details page.
- **Export:** lists with an export kind (bookings, customers, businesses, transactions, audit log) have an **Export** menu (Excel/CSV/PDF) for the current filters; the server builds the file in a job and it is downloaded from Reports → Exports (A26).
- **Not built yet:** sorting by column and the column visibility toggle on module lists (the list endpoints take no sort parameter).
- **Business type switch:** every business list has the switch **All · Salons · Clinics · Tattoo studios** (URL key `type`, filtered by the server) and shows type + audience badges (`BUSINESS_DOMAIN` §5.19). Page by page: A13, A14, A15, A20, A22, A23.
- **Date range picker** with presets: Today, Yesterday, Last 7 days, Last 30 days, This month, Last month, This year, Custom. Optional comparison with the previous period.
- **Charts:** line/bar/donut/funnel/heatmap with tooltips; every chart has "View data" (table) and CSV export.
- **States:** skeleton loading, empty state, error with retry, permission-denied (session expired → login). Analytics cards with no server data show "No data yet"; numbers are never invented.
- **Destructive or impactful actions:** confirmation modal + **mandatory reason**; after success show toast; action written to the audit log; affected users notified (push/in-app) where applicable (§9).
- **Edits:** forms with validation identical to the mobile apps' rules.
- **Deep links between entities:** references (customer, business, booking, transaction) are clickable. A customer without an account (§A15) has no link.
- **Real-time (Socket.IO):** events `booking.updated`, `alert.created`, `application.created`, `review.created`, `refund.updated`, `overview.tick` refresh Live Overview, Bookings list and details, Applications, Reviews, Refunds and Alerts.

---

## 4. Authentication & Security (page A00)
- Login: email + password, then a **second factor**: a code sent to the admin email.
- **Lockout:** 5 failed logins → locked for 15 minutes (`admin.maxFailedLogins`, `admin.lockSec`).
- **Session:** idle sign-out after 2 days of inactivity (owner 2026-10-26; `admin.sessionIdleSec` = 172800) with a warning dialog first; the refresh token keeps an active session going. The session is kept in memory and in this tab's `sessionStorage`: a page reload keeps it, closing the tab ends it; never `localStorage`.
- Admin profile (A30): change password, change email (with verification), alert email recipients.
- A sign-in from a new IP address emails the admin's alert addresses (best effort: a failed email never blocks the sign-in).

---

## 5. Analytics Data Foundation (shared contract)

**Sources:**
1. **App events and crashes:** the customer and merchant apps send screens and actions to Firebase Analytics and crashes to Crashlytics. They are read in the Firebase console. Apps never send analytics to the backend. There is no export to BigQuery and no permanent copy (owner 2026-10-19; SRV-110, SRV-127 and ADM-074…077 stay PENDING as "dropped by owner").
2. **Server events:** the backend records its own events in MongoDB, `serverEvents` `{ts, name, actorType, actorId?, salonId?, bookingId?, params, platform?, appVersion?}`: bookings, payments, refunds, OTP, API errors. The panel reads them through `GET /analytics/overview` (counts per group: payments, refunds, bookings, errors) and `GET /analytics/events` (by name or day).
3. **Operational lists:** counts read from list totals (subscriptions, businesses by state).

**Identity:** `installations` links the Firebase app instance ID to a customer or member for push and for identity; the customer page shows the devices and `journeyUserId`.

**What each analytics page shows today:**

| Page | Real data today | Empty today | Still to come |
|---|---|---|---|
| A01 Live overview | Server event counts by group with their breakdown, events per day, alerts count | Active users, installs, live activity feed | SRV-162 → ADM-100: live KPI row and sparklines |
| A02 Traffic & users | Nothing | Every KPI and card ("No data yet") | Nothing: Firebase only |
| A03 Screens & events | Nothing | Every KPI and card | Nothing: Firebase only |
| A04 Funnels | Nothing | Every KPI and card | Nothing: Firebase only |
| A05 Search & discovery | Nothing | Every KPI and card | Nothing: Firebase only |
| A06 Retention | Nothing | Every KPI and card | Nothing: Firebase only |
| A07 Bookings | Bookings created, acceptance rate, auto-cancelled, no-show, status per day | Other KPIs and cards | SRV-168 → ADM-106 |
| A08 Payments | Success rate, attempts, refunds created, refunds failed, events per day (all zero while online payment is paused) | Other KPIs and cards | SRV-168 → ADM-106 |
| A09 Errors & issues | OTP blocked, failure counts (payment, refund, API, wrong OTP), error events per day | Latency, endpoints, push failures; crashes (Firebase console) | SRV-168 → ADM-106 for server items |
| A10 Merchants | Subscription counts and businesses by state (list totals) | Performance, completeness, member activity | SRV-168 → ADM-106 |
| A11 User journey | Nothing: a search ends in an empty state with a link to Customers | Timeline | Nothing: Firebase only |

No page is hidden: A02–A06 and A11 stay in the sidebar and show their empty state.

---

## 6. Navigation (Sidebar)

1. **Live overview**
2. **Analytics** — Traffic & users · Screens & events · Funnels · Search & discovery · Retention · Bookings · Payments · Errors & issues · Merchants
3. **User journey**
4. **Customers**
5. **Salons** (businesses of every type) — All salons · Applications
6. **Bookings**
7. **Finance** — Transactions · Refunds · Payouts · Subscriptions · Reconciliation
8. **Reviews**
9. **Catalog** — Services · Requests
10. **Content** — Banners · Recommended · Legal pages · FAQ · Contact info
11. **Push notifications**
12. **Reports** — Reports · Exports
13. **Alerts**
14. **Settings** — General · Countries · Cities · Areas · App versions · Maintenance
15. **Audit log**

Counters show pending work on Applications, Reviews and Alerts.

---

## 7. Page Specifications — Analytics

Sources and status of every board: §5. Layout of every board: KPI row + cards with a date range filter.

### A01 — Live Overview
**Live pill, today in Amman, shortcuts to today's report and to Alerts.** Date range with comparison to the previous period.
- Four KPI cards from `GET /analytics/overview`: payments, refunds, bookings, errors, each with its event breakdown and the change against the previous period.
- Trend chart: events per day.
- Refreshed by `booking.updated`, `alert.created` and `overview.tick`.
- **Not built yet:** bookings today by status, bride bookings, pending requests + oldest wait, registrations today, payment success + top decline + collected JOD, refunds pending/overdue, error rate last hour, offline businesses, trials ending, hourly sparklines (SRV-162 → ADM-100).
- Active users, installs, guest conversion and a live activity feed are Firebase-only or dropped (SRV-127) and stay out.

### A02 — Traffic & Users
Board with KPIs installs, DAU, WAU, MAU, sessions, average session, conversion; cards active users, by app, platform, version, gender, city, devices, language, OS version, daily. **Every KPI and card shows "No data yet":** the data is in Firebase only.

### A03 — Screens & Events
Board with KPIs events, users, events per user; cards screens ranking, over time, by parameter, raw events. **Every KPI and card shows "No data yet":** Firebase only.

### A04 — Funnels
Board with KPIs overall conversion, entered, completed, median time; result card. **Every KPI and card shows "No data yet":** Firebase only.

### A05 — Search & Discovery
Board with KPIs searches, zero results, banner CTR, Recommended clicks, location, favorites; cards top queries, no results, filters, entry points, banners, location permission, business pages. **Every KPI and card shows "No data yet":** Firebase only.

### A06 — Retention
Board with KPIs day 1, 7, 30 and repeat booking 30/90 days; cards cohorts, bookings per customer. **Every KPI and card shows "No data yet":** Firebase only.

### A07 — Bookings Analytics
Real data from server events: bookings created (with change), acceptance rate (approved / decided), auto-cancelled, no-show, bookings by status per day.
**Not built yet:** average response time, bride bookings, persons, lead time, by payment method/gender/city, rejection and business-cancellation reasons, customer cancellations by window, per-business table (SRV-168 → ADM-106).

### A08 — Payments Analytics
Real data from server events: success rate, attempts (outcomes), refunds created, refunds failed, payment and refund events per day, link to Transactions (A16). **Online payment is paused**, so these stay at zero until a gateway is chosen.
**Not built yet:** collected amount, gateway fees, average refund time, failures by gateway code and by platform/version (SRV-168 → ADM-106).

### A09 — Errors & Issues
Real data from server events: OTP blocked, failure counts (payment failed, refund failed, API errors, wrong OTP codes), error events per day.
**Not built yet:** API error rate, p95 latency, errors by endpoint, push delivery failures (SRV-168 → ADM-106). Crashes and client errors are read in the Firebase console and stay "No data yet" here.

### A10 — Merchants Analytics
Real data from list totals (a snapshot, no date range): subscriptions in trial, ending ≤ 7 days, expired, paid; businesses by state.
**Not built yet:** average accept time, profile completeness and missing items, per-business performance, member activity (SRV-168 → ADM-106).

---

## 8. Page Specifications — Operations

### A11 — User Journey
"Find a user" form (phone, name or ID). **The server has no journey data** (it needs Firebase data, dropped with BigQuery; ADM-077 dropped by the owner): a search ends in an empty state with **Open customers** carrying the search text. The customer's own profile, reviews and notifications are on A12.

### A12 — Customers
**List:** name, phone, gender, city, registered at, last active, bookings count, status (active/blocked/deletion pending/deleted). Filters: status, gender, city; search by name or phone. Export (`CUSTOMERS`).
**Details (tabs):** Profile (fields, devices, block reason, deletion date, `journeyUserId`) · Reviews · Notifications sent.
**Actions (by status, reason required):** edit, block/unblock, delete, restore in the grace period, force delete, send push to this user.
A customer who only exists as the contact of a business-made booking has no account and is not listed here (§A15).
**Not built yet:** Bookings and Payments & refunds tabs (today: the Bookings list takes the URL filter `customer`); registration date filter and customer code (SRV-164 → ADM-102).

### A13 — Businesses
Sidebar module "Salons". Rules: `BUSINESS_DOMAIN` §5.2, §5.16, §5.19, §5.23.

**List:** name (deletion-requested badge), type + audience badges, city, state, rating, subscription, Recommended, bookings (30 days), created at. Filters: business type switch, state, audience, city, subscription, Recommended, deletion requested; search by name. Export (`SALONS`: state, business type, audience, city, subscription, search).
**Not built yet:** business code and owner line in the list (SRV-164 → ADM-102).

**Details:** header with state and actions; side panel with owner, phone, subscription, trial end.
**Tabs:**
- **Overview:** type + audience, city, phone, description, rating, created at, completeness checklist (`missing[]`), offline information.
- **Branches:** one row per branch: name (Main badge), status (with the offline reason), ready to book (complete or missing items), area, staff, phone; "n open of `salon.maxBranches`" (20).
  - Add branch (no admin approval: a branch is bookable once ACTIVE and complete) and edit (names, city, area, address, coordinates, phone, WhatsApp).
  - Make main; take offline or bring online (reason, shown to the owner; the other branches stay bookable).
  - Close branch: refused while it has upcoming bookings (`BRANCH_HAS_UPCOMING_BOOKINGS`; a dialog lists them with links); the last branch cannot close (`LAST_BRANCH`); closing the main branch needs a new main branch first. Closed branches keep their history.
- **Insights:** KPIs and bookings per day for a date range.
- **Admin activity:** what the admin changed on this business.
- **Payout details:** one bank account per business; reading the full IBAN is an explicit click recorded in the audit log; replacing it needs a reason and a valid IBAN.
- **Members:** name, branch ("All branches" for the owner), phone, role, permissions, status; filter by branch.

**Actions (all with a reason, audited, owner notified):**
- **Edit on behalf** opens `/salons/:id/edit`, tabs Profile · Gallery · Hours and closures · Services · Staff · Policies. Hours, Services and Staff belong to one branch and show a branch picker; Profile, Gallery and Policies are business-wide. A change that hits existing bookings shows them (§5.12). A member can be moved to another branch; the move removes their services and runs the conflict check (§5.16).
- **Take offline / Put online** (admin only): Offline hides the whole business and blocks new bookings; upcoming bookings are kept.
- **Change audience** (SALON only; clinics and tattoo studios are always BOTH and never change, `AUDIENCE_CHANGE_NOT_ALLOWED`; `businessType` never changes). A drawer shows the current audience and offers the others:
  - **Widening** (to men & women) keeps every service, staff member and booking.
  - **Narrowing** switches off services that no longer fit (and bride options when brides are no longer allowed) and is refused while future bookings exist: `409 SCHEDULE_CONFLICT` shows the conflict list with links to the bookings (first 10, then a count).
  - The owner can only widen, from the merchant app; that raises `SALON_AUDIENCE_WIDENED` (A27).
- **Deletion request:** approve or reject.
- Recommended is managed in A20; push to members in A25 (audience `SALON_MEMBERS`).

**Not built yet:** Documents tab on the business page (today: license documents on the application review page, A14); Bookings, Reviews and Finance tabs (today: A15, A22 and A16–A18 filter by business and branch).

### A14 — Applications Queue
- List (oldest first): business name, owner, type + audience badges, submitted at, resubmission count, status. Filters: state, business type switch.
- Review page: owner, phone, type + audience, city, description, submitted at, resubmissions, last rejection reason, and the private documents in a document viewer (zoom, rotate, open or download):
  - **Salon:** trade license. Audience MALE, FEMALE or BOTH.
  - **Clinic:** trade license + **medical license** (`MEDICAL_LICENSE`), both needed before approval; the page says so when the medical license is missing. Audience BOTH.
  - **Tattoo studio:** trade license only. Audience BOTH.
- **Approve:** the free trial starts (`subscription.trialDays`, 90); state LIVE when complete, else APPROVED_INCOMPLETE. **Reject** (reason; the owner sees it and can fix and resubmit).

### A15 — Bookings
Rules: `BUSINESS_DOMAIN` §5.7, §5.20, §5.21, §5.23.

**List:** reference, customer, **Made by** (Customer app / The business), business with type, branch, appointment, persons, status, payment, total, requested at.
**Tabs:** All · Pending · Upcoming · Today · Past · **To close** (`TO_CLOSE`: APPROVED after its end, oldest first).
**Filters:** business type switch, status, payment, bride, day range, business + branch, customer, **source** (`CUSTOMER_APP`, `MERCHANT`); search by reference, customer name or phone. Export (`BOOKINGS`, with the source; the tab and bride switch are not export filters).
**Not built yet:** filters by refund status, city and payment method (not in the contract).

**Details:** customer, business, branch, type, appointment, requested at, respond by, staff, payment method and status, refund status, persons table, money (total, due online, paid online, still to pay at the business, paid at the business, refunded), rejection or cancellation reason, full **status history** (actor: customer/member/system/admin, reason).
- **Made by** and, for a business-made booking, **Created by** (the member's name).
- **Customer without an account:** a business-made booking for an unregistered number shows the name and "No WAB account" with no link (`customer.id` null, `customerContact`). The booking gets the customer when that number registers.
- **Design image:** a tattoo booking has a Design column in the persons table with a **View design image** link (`BOOKING_REFERENCE`, short-lived signed URL, new tab) when a person attached one.
**Not built yet:** related transactions and notifications sent on this page.

**Admin actions (all require a reason; notify as in §9):**
- **Change status:** to any status. A move outside the normal flow is allowed with a warning and recorded as irregular (§5.7). Completed and No-show close a "to close" booking.
- **Reassign staff:** APPROVED and not started; eligible staff list per person.
- **Cancel** (PENDING or APPROVED) as the customer (their policy), as the business (full refund) or as the admin.
- **Refund** (amount up to paid online minus refunded): shown only when something was paid online, so never while online payment is paused.

### A16 — Transactions
**Status: online payment is paused** (`PAYMENT_PROVIDER=disabled` in production, `fake` in dev; no gateway chosen; HyperPay is only a candidate). Transactions stay empty until a gateway is chosen; dev shows fake-provider rows only.
- Every payment attempt and capture: time, type (deposit/full), amount, gateway fee, attempt, branch, gateway code, status. Filters: business + branch, status, type, day range, customer, booking. Export (`TRANSACTIONS`).
- Details: amounts, fee, gateway code and message, provider reference, charged and refunded times, platform, booking link, attempts table, raw gateway answer.
- **Not built yet:** KPI row (count, success rate, collected, fees, refunded; SRV-163 → ADM-101).

### A17 — Refunds
Designed Phase 1: refunds are automatic. **Online payment is paused**, so this list stays empty until a gateway is chosen.
- List: time, amount, source, branch, attempts, next attempt, last error, status (pending/refunded/failed). Filters: business + branch, status.
- Actions: retry failed refund, **mark as refunded manually** (reference required). Manual refund from a booking: A15.
- Overdue highlight when pending longer than `refund.delayAlertHours` (48); alert in A27.

### A18 — Payouts
Designed Phase 1: the platform pays businesses manually. One bank account and one payout per business, covering all branches (§5.14). **Online payment is paused**, so balances stay at zero until a gateway is chosen.
- Balances per business: collected online, gateway fees, refunds, previous payouts, **due now**.
- Create payout: business and period → server preview → record **transfer day, amount, bank reference, note** → status Transferred (owner and `FINANCE_VIEW` members notified).
- Payout history with a status filter. Bank details: A13.

### A19 — Subscriptions
One subscription per business, covering all branches; 3 months free from approval; paid outside the app and recorded here, so the payment pause does not affect this page. Every business type.
- List: business, status (trial/active/expired), end date, days remaining, last payment. Filters: status, ending within N days. Expiry never takes a business offline by itself; the admin decides.
- Record payment: amount, date, period covered (from–to), method, reference, note → extends the period. Payment history per business.
- **Not built yet:** Offline/Online action on this page (today: A13).

### A20 — Recommended
Placements are bought per business (not per branch) and **ordered per business type** (`BUSINESS_DOMAIN` §5.13). Paid outside the app and recorded here.
- Switch Salons · Clinics · Tattoo studios (default Salons). List: order, business, type + audience, period (start–end), amount paid, status (scheduled/active/ended; from its dates, no expiry job).
- Add/edit (business of that type that customers can see, period, order, amount, note, reason); end now (reason); move up/down reorders within the type.
- The customer app shows one Home rail of the active placements of the chosen lens. Booking from a placement starts at the branch choice.

### A21 — Reconciliation
**Online payment is paused**, so this page reads "All clear" until a gateway is chosen.
- Lists for a person to check: stuck pending payments, paid without a booking, bookings with no ledger charge. Filters: business + branch.
- **Not built yet:** period summary (total collected, gateway fees, refunds, payouts transferred, balance owed).

### A22 — Reviews Moderation
Reviews are **business-wide**, or for one staff member; each carries a **branch label**. Published only after admin approval (§5.11). A booking without an account cannot be reviewed until it is claimed.
- List: target, business, branch, rating, comment, author with their other reviews count, submitted at, status. Status tabs: pending, approved, rejected, removed. Filters: business type switch, business + branch, target, rating.
- Actions: **Approve**, **Reject** (reason). Bulk approve/reject up to 100. **Remove** a published review (reason).

### A23 — Catalog
Catalog services carry `businessType` + `audience`. A business offers and requests only services of its own type that fit its audience (`BUSINESS_TYPE_MISMATCH`, §5.19, §5.23). A service such as piercing exists for a type only when the admin adds it to that type.
- **Services:** switch Salons · Clinics · Tattoo studios; salon services also filter by audience (All, Women, Men, Men & women). List: order, name, type + audience, image, status. Create: name (ar/en), description (ar/en), image, type, audience, active, order; clinic and tattoo services are fixed to BOTH. Edit: type and audience are read-only. Deactivation warns that businesses already offering it keep it.
- **Requests:** business type switch and status filter. List: business, name, description, status, requested at. **Approve** by creating a new service or by mapping to an active service that fits the business; **Reject** (reason). The business is notified.

### A24 — Content
- **Banners:** image (ar/en variants), action (none / open a business / external link), audience (Men / Women / Everyone), start–end schedule, order, active; preview.
- **Not built yet:** banner filter by business type (§5.19; the contract has none); banner title, artwork preview and business name on the cards (SRV-165 → ADM-103).
- **Legal pages:** Privacy, Terms, About (rich text ar/en), separately for customer and merchant apps.
- **FAQ:** questions/answers (ar/en), per app, ordering.
- **Contact info:** phone, WhatsApp, email (per app).
- **Recommended:** A20.

### A25 — Push Notifications
- Compose: title & body (ar/en), app (customer/merchant), audience: all / guests / registered / gender / city / business members / specific users, with the estimated size; optional link target; send now or schedule. Reason required.
- History: title, app, audience, send day, targeted, sent, delivered, opened, failed, status; cancel a scheduled campaign. Filters: status, app.
- Promotional notifications appear in customers' notification lists (type PROMOTION).
- **Not built yet:** audience or filter by business type (§5.19; the contract has none).

### A26 — Reports and Exports
**Reports** (daily by day, weekly by start day, monthly by month), on screen with charts:
- Bookings by status, amount collected, new customers, reviews submitted, payments and refunds, top businesses (bookings, completed, lost), right now (reviews and refunds pending, applications waiting, subscriptions by status); monthly adds payouts.
- App usage (installs, active users, funnels, retention) is in Firebase and not in these reports.
- **Not built yet:** export button on the report page (the contract has `REPORT_DAILY`, `REPORT_WEEKLY`, `REPORT_MONTHLY`); filter by business type (§5.19; report endpoints and report exports take only the period); scheduled report emails (MAY).

**Exports:** every file asked for from a list: what, format (XLSX, CSV, PDF), rows, status, short-lived download link; failures explained (too many rows: narrow the filters). Kinds with a business type filter: `BOOKINGS`, `SALONS`.

### A27 — Alerts
**Delivered by email** to the admin's alert recipients (A30) and listed in the Alerts page (bell icon). Thresholds are in Settings (`BUSINESS_DOMAIN` §10); the server evaluates them every 5 minutes (§9).
| Alert (`kind`) | Condition |
|---|---|
| New application (`SALON_APPLICATION`) | Each submission |
| Review pending (`REVIEW_PENDING`) | Each submission |
| Catalog request (`CATALOG_REQUEST`) | Each submission |
| Payment failures (`PAYMENT_FAILURE_SPIKE`) | ≥5 failures in 15 min or failure rate ≥20% in 1 hour |
| Refund failed / delayed (`REFUND_FAILED`, `REFUND_DELAYED`) | Failed immediately; pending > 48 h |
| Subscription ending / expired (`SUBSCRIPTION_ENDING`, `SUBSCRIPTION_EXPIRED`) | 7 days before the end; on expiry |
| Deletion request (`SALON_DELETION_REQUEST`) | An owner asks to delete the business |
| Audience widened (`SALON_AUDIENCE_WIDENED`) | An owner widens a salon to BOTH |
| Booking still open (`BOOKING_CLOSE_OVERDUE`) | A booking still APPROVED `booking.closeOverdueAlertHours` (24) after its end (§5.21) |
- Alerts page: severity, type, title in the panel's language, link to the entity, status (new/acknowledged), acknowledge. Filters: status, kind.
- **Not built yet:** server error spike alert (`alerts.api5xxRatePct` is a setting, no alert kind raises it) and crash spike alert (`alerts.crashesPerHour`; crash data stays in Firebase); email preview tab (SRV-166 → ADM-104).

### A28 — Settings
Every change needs a reason, applies to all apps at once and is written to the audit log. Keys and defaults: `BUSINESS_DOMAIN` §10.
- **General**, three tabs:
  - **Booking and verification:** discovery (nearby radius); booking rules (slot interval, days ahead, companions, minimum notice, hold while paying, auto-cancel after start, pending alert, reminders, **close-reminder interval `booking.closeReminderIntervalMinutes` (60 min)**, **overdue alert `booking.closeOverdueAlertHours` (24 h)**); OTP (code length returned to apps, resend wait, request limit and window, wrong attempts, block duration); reviews.
  - **Accounts and security:** admin sign-in (failed logins, lock, idle sign-out); token lifetimes; account deletion grace period; business subscriptions (trial, warning); branches (`salon.maxBranches`); refunds.
  - **Limits and alerts:** page sizes, uploads, alert thresholds.
  - Read-only: time zone, currency. The OTP channel is fixed: WhatsApp through ARQAM OTP, with no SMS.
- **Countries:** name, flag, dial code, phone regex, active. **Cities** and **Areas:** ar/en, active.
- **App versions** (per app & platform): latest version, minimum supported (force update), optional update flag, store URLs.
- **Maintenance** per app with message (ar/en).
- **Not built yet:** payout frequency note.

### A29 — Audit Log
- Every admin action: time, action, entity type/id (link), before/after values (diff), reason, IP, user agent.
- Filters: action, entity, admin, day range. Export (`AUDIT_LOGS`). Immutable.
- **Not built yet:** device column as browser / OS / device type (SRV-167 → ADM-105).

### A30 — Admin Profile
From the admin menu (`/profile`): change password, change email (with verification), alert email recipients.

### A31 — About
From the admin menu (`/about`): app version, build id, environment, variant, data source.

---

## 9. Admin Action → Notification Matrix
Events and recipients: `BUSINESS_DOMAIN` §8. Merchant recipients are the owner plus members of the booking's branch with the permission named there. A booking without an account notifies no customer.
| Admin action | Customer notified | Merchant notified |
|---|---|---|
| Booking status change / cancel / reassign | ✅ | ✅ |
| Manual refund | ✅ | ✅ in-app (`FINANCE_VIEW`) |
| Application approved/rejected | — | ✅ Owner |
| Business Online/Offline | — | ✅ Owner |
| Branch Offline/Online | — | ✅ Owner + branch managers |
| Audience changed by admin (`salon.audience_changed`) | — | ✅ Owner |
| Edit on behalf (`salon.edited_by_admin`) | — | ✅ Owner |
| Deletion request rejected | — | ✅ Owner |
| Review approved (published) | — | ✅ `REVIEWS_VIEW` / staff |
| Review rejected | — (silent) | — |
| Customer blocked | On next login message | — |
| Payout transferred | — | ✅ Owner + `FINANCE_VIEW` |
| Catalog request decision | — | ✅ `SERVICES_MANAGE` |

---

## 10. Validation
Same field rules as the mobile PRDs for any entity edited from the panel; plus:
- Banner schedule end after start; banner action value required for a business or link action.
- Recommended period end after start; amount as JOD with 3 decimals.
- Payout amount > 0; subscription period dates valid; IBAN valid.
- Refund amount above zero and not above paid online minus refunded.
- Catalog: type and audience required; audience fixed to BOTH for clinics and tattoo studios; mapping a request only to an active service that fits the business.
- Branch: names ar/en, city, area, address, valid coordinates, phone in international format.
- Applications: clinics need the medical license before approval.
- Settings: whole numbers within the bounds of each key; reminder lists without repeats.
- Reviews: bulk actions up to 100 at once.

---

## 11. Performance
- Analytics aggregation is done by the server from MongoDB (`GET /analytics/overview` is cached 60 s); event lists are paginated.
- Pages SHOULD load within 2 seconds for common ranges (≤30 days). Every route lazy-loaded; every list paginated on the server.

---

## 12. Backend Capabilities
Admin contract 1.16.0, 164 operations (`WAB-Server/docs/api/openapi.admin.json`):
- Auth (password + email OTP, refresh, logout); profile; global search.
- Customers (edit, block, delete, restore, force delete, push, reviews, notifications).
- Businesses (list, details, audience, offline/online, kpis, analytics, activity, deletion decision, payout details); applications; edit on behalf (profile, gallery, hours, closures with conflict preview, services, staff, member move, policy); branches (create, edit, main, offline/online, close).
- Bookings (list with `tab` and `source`, details, status, eligible staff, reassign, cancel, refund).
- Transactions, refunds, payouts, reconciliation, subscriptions.
- Reviews, catalog per type, requests, Recommended per type, banners, content, campaigns, locations, app config, settings, uploads.
- Analytics (`overview`, `events`), reports, exports (async jobs), alerts + email delivery, audit log.

Still to come on the server: SRV-162 (live snapshot), SRV-163 (transactions summary), SRV-164 (record codes), SRV-165 (banner title and preview), SRV-166 (alert email preview), SRV-167 (audit device), SRV-168 (analytics breakdowns A07–A10).

---

## 13. Out of Scope
Multiple admins/roles, ticketing, automated payouts, online subscription billing, merchant web dashboard, app usage analytics inside the panel (BigQuery and `@wab/analytics` dropped by the owner 2026-10-19).

---

## 14. Open Items & Assumptions

| # | Item | Assumption |
|---|---|---|
| 1 | Panel production hosting and platform domain | Owner decision (ADM-005, ADM-083) |
| 2 | Payment gateway | Not chosen; online payment paused; HyperPay only a candidate |
| 3 | Error tracking tool | Owner decision (ADM-082) |
| 4 | Alert thresholds | Defaults in `BUSINESS_DOMAIN` §10, configurable |
| 5 | Scheduled report emails | Optional |
| 6 | Empty pages A02–A06 and A11 | Stay in the sidebar with their empty state, as built. The dropped tasks' note says "hides or skips"; owner to confirm |
| 7 | Server error and crash spike alerts | Settings exist, no alert is raised; crash data stays in Firebase; owner to confirm whether the settings stay |
