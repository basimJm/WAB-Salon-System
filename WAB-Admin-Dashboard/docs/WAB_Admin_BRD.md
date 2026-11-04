# WAB Wedding & Beauty — Business Requirements Document (BRD)
## Admin Panel

| Field | Value |
|---|---|
| Document | Business Requirements Document — Admin |
| Product | WAB Wedding & Beauty — Admin Panel (web) |
| Version | 1.2 |
| Date | 2026-11-04 |
| Related documents | `BUSINESS_DOMAIN.md` (data and rules), Admin PRD (behaviour, wins over this document), Admin Design Script, Customer and Merchant PRD & BRD |

---

## 1. Executive Summary

WAB is a marketplace in Jordan connecting customers with businesses of three types: salons (men, women or both), beauty clinics and tattoo studios. The **Admin Panel** is a web application (React) used by the platform operator to run it end to end. Its most important purpose is **full control** over customers, businesses and their branches, bookings, payments, refunds, payouts, subscriptions, reviews, the per-type services catalog, content, notifications and platform settings, with an audit trail. It also gives **visibility of what the server records**: booking, payment, refund, error and OTP events and the operational lists. App behaviour (screens, actions, crashes) is tracked in Firebase and read in the Firebase console; the owner dropped the BigQuery copy on 2026-10-19.

---

## 2. Business Background & Problem

A marketplace only works if the operator can:
1. **See what is happening** — why payments fail, which businesses are slow to respond, which finished bookings nobody closed.
2. **Control quality** — verify businesses and their documents, moderate reviews, keep the catalog clean per business type, suspend non-paying or abusive accounts.
3. **Handle money correctly** — track every payment, refund and payout manually and accurately.
4. **Intervene** — fix any booking, refund any customer, edit any data on behalf of a business when something goes wrong.
5. **Grow** — sell subscriptions and Recommended placements, run promotions, make data-driven decisions.

---

## 3. Business Objectives

| ID | Objective |
|---|---|
| OBJ-A1 | Provide **full visibility** of what the server records (bookings, money, errors, OTP, operational lists); app behaviour is read in Firebase. |
| OBJ-A2 | Enable fast, accurate verification and onboarding of salons, clinics and tattoo studios. |
| OBJ-A3 | Protect marketplace trust (review moderation, quality of Recommended businesses, blocking abuse). |
| OBJ-A4 | Ensure financial accuracy: payments, refunds, payouts, subscriptions. |
| OBJ-A5 | Allow the admin to intervene on any entity at any time, with a full audit trail. |
| OBJ-A6 | Support growth: promotions, banners, push campaigns, paid placements. |
| OBJ-A7 | Deliver daily, weekly and monthly reports, exportable at any time. |

---

## 4. Scope

### 4.1 In Scope
- Web admin panel (React), Arabic + English.
- **Single admin account with full permissions.**
- Analytics from the server's own events (MongoDB `serverEvents`) and list totals: live overview, bookings, payments, errors, merchants. Boards for traffic, screens, funnels, search, retention and the user journey exist and stay empty (the data is in Firebase only).
- Management of customers; businesses of every type (applications, documents, type + audience, branches, team, services, hours, policies, edit on behalf); bookings, including business-made ones and the "to close" list; payments, refunds, payouts, subscriptions; reviews; the per-type services catalog; content (banners, Recommended, legal, FAQ, contact); push notifications; settings.
- Email alerts to the admin.
- Reports (daily, weekly, monthly).
- Audit log of admin actions.

**Status of online payment:** paused (`PAYMENT_PROVIDER=disabled` in production, `fake` in dev; no gateway chosen; HyperPay is only a candidate). The apps offer pay on arrival. Transactions, refunds, payouts and reconciliation stay empty until a gateway is chosen; subscriptions and placements are paid outside the app and recorded by the admin, so they work today.

### 4.2 Out of Scope
- Multiple admin users and admin roles (future).
- Support ticketing system (support happens directly via WhatsApp).
- Automated payouts via gateway API (manual for now).
- Online subscription billing (recorded manually).
- Merchant web dashboard.
- App usage analytics inside the panel (BigQuery and `@wab/analytics` in the server dropped by the owner 2026-10-19).

---

## 5. Stakeholders

| Stakeholder | Interest |
|---|---|
| Platform owner / admin | Full control and visibility, revenue, quality |
| Customers | Fair treatment, refunds, trustworthy reviews |
| Businesses (salons, clinics, tattoo studios) | Fast approval, accurate payouts, fair moderation |
| Finance (handled by admin) | Accurate reconciliation |
| Development team / AI agents | Clear requirements |

---

## 6. Business Requirements

Priority: **M** = Must, **S** = Should, **C** = Could. **Dropped** = dropped by the owner on 2026-10-19 with BigQuery; the page stays in the panel with an empty state.

### 6.1 Access & Security
| ID | Requirement | Priority |
|---|---|---|
| ABR-01 | The panel MUST be accessible to a **single admin** with all permissions. | M |
| ABR-02 | Login MUST be secured: strong password + a second factor by email, 15-minute lock after 5 failures, idle sign-out after 2 days. | M |
| ABR-03 | **Every admin action** MUST be recorded in an audit log (what, when, before/after, reason). | M |

### 6.2 Analytics & Visibility
| ID | Requirement | Priority |
|---|---|---|
| ABR-10 | The admin MUST see a **live overview** from server events: bookings, payments, refunds and errors with their breakdown, and alerts. Bookings today by status, pending requests and offline businesses arrive with SRV-162 → ADM-100. | M |
| ABR-11 | Every screen view and action in the customer and merchant apps is tracked in **Firebase Analytics** and read in the Firebase console; apps never send analytics to the backend. The server records its own events in MongoDB. | M |
| ABR-12 | Per-user journey timeline in the panel. | Dropped |
| ABR-13 | Guest activity linked to the account inside the panel. | Dropped |
| ABR-14 | Funnels with drop-off per step in the panel. | Dropped |
| ABR-15 | The admin MUST see **every payment attempt** with outcome and gateway failure reason, plus refunds and payouts (empty while online payment is paused). | M |
| ABR-16 | The admin MUST see **problems the server records**: API errors, OTP failures/blocks, payment failures, refund failures. Crashes are read in the Firebase console. | M |
| ABR-17 | Search analytics, banner clicks, location permission rates, deep link opens and calls/WhatsApp to businesses in the panel. | Dropped |
| ABR-18 | The admin MUST see booking analytics: status distribution, acceptance, auto-cancellations, no-shows. Response times, cancellations and bride bookings arrive with SRV-168 → ADM-106. | M |
| ABR-19 | The admin MUST see merchant analytics: businesses by state and subscriptions. Profile completeness, response times and activity per business and per member arrive with SRV-168 → ADM-106. | M |
| ABR-20 | Retention and engagement metrics (DAU/MAU, cohorts) in the panel. | Dropped |
| ABR-21 | Analytics from server events MUST be filterable by date range, with comparison to the previous period. | M |

### 6.3 Customers
| ID | Requirement | Priority |
|---|---|---|
| ABR-30 | View, search and edit any customer; see bookings, reviews, payments and devices. | M |
| ABR-31 | Block / unblock customers with a reason. | M |
| ABR-32 | Handle account deletions (grace period visibility, restore, force delete). | M |

### 6.4 Businesses
| ID | Requirement | Priority |
|---|---|---|
| ABR-40 | Review applications of salons, clinics and tattoo studios: view the documents (trade license; plus medical license for a clinic), **approve or reject with reason**. | M |
| ABR-41 | View and **edit any business data on its behalf** (profile, gallery, hours, closures, services, staff, members, policies), each with a reason, audited, owner notified. | M |
| ABR-42 | Set a business **Online / Offline** (suspension) with reason. | M |
| ABR-43 | Manage **Recommended** placements per business type (business, period, order, amount paid). | M |
| ABR-44 | Handle business deletion requests. | M |
| ABR-45 | See every business with its type (salon, clinic, tattoo studio) and audience, and filter every list by type (`BUSINESS_DOMAIN` §5.19). | M |
| ABR-46 | Change a salon's audience with a reason: widening keeps everything; narrowing is refused while future bookings exist and shows the conflict list. Clinics and tattoo studios are always for both; a business type never changes. | M |
| ABR-47 | Manage the branches of any business: add, edit, make main, take offline or bring online with a reason, close (refused with upcoming bookings; the last branch cannot close). | M |

### 6.5 Bookings
| ID | Requirement | Priority |
|---|---|---|
| ABR-50 | View every booking with full details and status history. | M |
| ABR-51 | **Intervene on any booking**: change status (irregular moves allowed with a warning and recorded), approve/reject, cancel, reassign staff, issue refunds — with mandatory reason; affected parties are notified. | M |
| ABR-52 | See who made a booking (customer app or the business, with the member's name), filter and export by source, and recognise a customer without an account. | M |
| ABR-53 | See the bookings **to close** (still APPROVED after their end), close them, and be alerted when one stays open past `booking.closeOverdueAlertHours`. | M |
| ABR-54 | Open a tattoo booking's optional design image through a short-lived signed link. | M |

### 6.6 Money
| ID | Requirement | Priority |
|---|---|---|
| ABR-60 | View all payment transactions and attempts, with gateway responses. | M |
| ABR-61 | Manage refunds: view status, retry failed refunds, issue **manual refunds** (full or partial), mark as refunded. | M |
| ABR-62 | Manage **payouts manually**: per-business balance (collected − gateway fees − refunds − paid out), record transfers (amount, date, reference), mark transferred. One bank account and one payout per business. | M |
| ABR-63 | Manage **subscriptions manually**: trial dates (3 months free from approval), record payments (amount, date, period covered, reference), expiry tracking, suspend on non-payment. One subscription per business. | M |
| ABR-64 | Reconciliation view of what needs a person to check: stuck payments, paid without a booking, missing ledger charges. Period totals of collected, refunded and paid out. | S |

### 6.7 Quality & Content
| ID | Requirement | Priority |
|---|---|---|
| ABR-70 | Moderate all reviews (business-wide and staff, labelled with the branch) before publication; remove published reviews. | M |
| ABR-71 | Manage the **services catalog per business type and audience**, and business requests for new services. | M |
| ABR-72 | Manage banners (with schedule and targeting), legal pages, FAQ and contact information. | M |
| ABR-73 | Send **push notification campaigns** to targeted audiences and see delivery/open stats. | M |

### 6.8 Settings
| ID | Requirement | Priority |
|---|---|---|
| ABR-80 | Configure platform settings: nearby radius, booking rules including the close reminder and overdue alert, OTP limits, branch limit, countries/regex, cities/areas, app versions (force/optional), maintenance mode per app. | M |

### 6.9 Alerts & Reports
| ID | Requirement | Priority |
|---|---|---|
| ABR-90 | Send **email alerts** to the admin for: new application, new review pending moderation, spike in payment failures, refund failed or delayed, subscription ending within 7 days or expired, new catalog service request, business deletion request, salon audience widened, booking still open after the overdue time, spike in crashes or server errors. | M |
| ABR-91 | Provide **daily, weekly and monthly reports**, exportable at any time to Excel and PDF. | M |
| ABR-92 | Any table in the panel SHOULD be exportable. | S |

**Not built yet:** the crash and server error spike alerts of ABR-90; the report export button of ABR-91 (PRD A26).

---

## 7. Business Rules

Data and rules: `BUSINESS_DOMAIN.md`.

| ID | Rule |
|---|---|
| ABRL-01 | Server events are stored in MongoDB. App events stay in Firebase; there is no permanent copy. |
| ABRL-02 | Installations link the Firebase app instance ID to the account; the panel does not merge guest history (it holds none). |
| ABRL-03 | Admin actions on bookings, payments or accounts require a **reason** and notify affected parties. |
| ABRL-04 | All admin actions are written to the audit log. |
| ABRL-05 | Payouts and subscriptions are recorded manually by the admin. |
| ABRL-06 | Reviews are published only after admin approval. |
| ABRL-07 | Businesses go live only after admin approval + complete profile; only the admin sets a business Offline. A branch goes Offline by the owner or the admin. New branches need no admin approval. |
| ABRL-08 | Alerts are delivered by **email**. |
| ABRL-09 | `businessType` never changes. Clinics and tattoo studios are always for both. Only the admin narrows a salon's audience. |
| ABRL-10 | A booking made by the business for an unregistered number stores a contact only: no account, no WhatsApp or SMS, no review until the number registers and claims it. |

---

## 8. KPIs the Admin Panel Must Surface

- Bookings by status; acceptance rate; auto-cancel rate; no-show rate; bookings to close.
- Payment success rate; failure reasons; refund volume and time (once online payment runs).
- GMV (online collected + marked paid), payouts due (once online payment runs).
- Businesses by state and by type; trial → paid; subscriptions expiring; Offline businesses.
- Average ratings; reviews pending.
- OTP blocks; API errors.

In the Firebase console, not in the panel: installs, DAU/MAU, guest → registered conversion, booking funnel, zero-result searches, crash-free users.

---

## 9. Assumptions, Constraints & Dependencies
- Web app built with **React 19 + TypeScript + Vite**.
- Analytics source: the server's own events in MongoDB; apps send to Firebase Analytics + Crashlytics, read in the Firebase console.
- Email via Gmail SMTP through `wab-notifications`.
- Real-time updates via Socket.IO.
- Files on Cloudflare R2 (AWS S3 is only a fallback); private documents through short-lived signed URLs.
- Hosted dev API on Render. Production hosting, platform domain, error tracking and payment gateway are open owner decisions.

---

## 10. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| The operator cannot see app behaviour in the panel | Firebase console access; the boards stay in the panel with an honest empty state |
| Single admin is a single point of failure | Design data model for future multi-admin roles |
| Manual payouts/subscriptions cause errors | Clear balances, mandatory references, audit log, reconciliation view |
| Finished bookings are left open | Reminders to the business, To close tab, overdue alert to the admin |
| Privacy of documents and design images | Private bucket, short-lived signed URLs, access only via secured admin login |

---

## 11. Open Items

| # | Item |
|---|---|
| 1 | Panel production hosting and platform domain |
| 2 | Payment gateway (online payment paused) |
| 3 | Error tracking tool |
| 4 | Alert thresholds — configurable defaults in `BUSINESS_DOMAIN` §10 |
| 5 | Report scheduling by email (optional) |
| 6 | Empty analytics pages stay visible, as built (owner to confirm) |
