# WAB Wedding & Beauty — Business Requirements Document (BRD)
## Admin Panel

| Field | Value |
|---|---|
| Document | Business Requirements Document — Admin |
| Product | WAB Wedding & Beauty — Admin Panel (web) |
| Version | 1.1 (analytics via Firebase + BigQuery, real-time via Socket.IO, email via Gmail SMTP) |
| Date | October 2026 |
| Related documents | Customer App PRD & BRD, Merchant App PRD & BRD, Admin PRD, Backend PRD (upcoming) |

---

## 1. Executive Summary

The **Admin Panel** is a web application (React) used by the platform operator to run WAB Wedding & Beauty end to end. Its most important purpose is **complete visibility**: every screen any user visits, every action, every payment attempt, every booking state, every error and every customer and merchant journey must be observable, analyzable and exportable. Beyond analytics, the admin has **full control** over customers, salons, bookings, payments, refunds, payouts, subscriptions, reviews, the services catalog, content, notifications and platform settings.

---

## 2. Business Background & Problem

A marketplace only works if the operator can:
1. **See what is happening** — where customers drop off, why payments fail, which salons are slow to respond, what users search for and cannot find.
2. **Control quality** — verify salons, moderate reviews, keep the catalog clean, suspend non-paying or abusive accounts.
3. **Handle money correctly** — track every payment, refund and payout manually and accurately.
4. **Intervene** — fix any booking, refund any customer, edit any data when something goes wrong.
5. **Grow** — sell subscriptions and Recommended placements, run promotions, make data-driven decisions.

---

## 3. Business Objectives

| ID | Objective |
|---|---|
| OBJ-A1 | Provide **full, permanent visibility** of all user behavior (customers, guests, merchants) and system health. |
| OBJ-A2 | Enable fast, accurate salon verification and onboarding. |
| OBJ-A3 | Protect marketplace trust (review moderation, quality of Recommended salons, blocking abuse). |
| OBJ-A4 | Ensure financial accuracy: payments, refunds, payouts, subscriptions. |
| OBJ-A5 | Allow the admin to intervene on any entity at any time, with a full audit trail. |
| OBJ-A6 | Support growth: promotions, banners, push campaigns, paid placements. |
| OBJ-A7 | Deliver daily, weekly and monthly reports, exportable at any time. |

---

## 4. Scope

### 4.1 In Scope
- Web admin panel (React), Arabic + English.
- **Single admin account with full permissions.**
- Analytics: live overview, traffic, screens & events, funnels, search, retention, bookings, payments, errors, merchants, **per-user journey timeline** (including guest history linked to the account after registration).
- Management of customers, salons (applications, profiles, team, services, hours, policies), bookings, payments, refunds, payouts, subscriptions, reviews, services catalog, content (banners, recommended, legal, FAQ, contact), push notifications, settings.
- Email alerts to the admin.
- Reports (daily, weekly, monthly) exportable at any time (Excel / PDF).
- Audit log of admin actions.

### 4.2 Out of Scope
- Multiple admin users and admin roles (future).
- Support ticketing system (support happens directly via WhatsApp).
- Automated payouts via gateway API (manual for now).
- Online subscription billing (recorded manually).
- Merchant web dashboard.

---

## 5. Stakeholders

| Stakeholder | Interest |
|---|---|
| Platform owner / admin | Full visibility and control, revenue, quality |
| Customers | Fair treatment, refunds, trustworthy reviews |
| Salons | Fast approval, accurate payouts, fair moderation |
| Finance (handled by admin) | Accurate reconciliation |
| Development team / AI agents | Clear requirements |

---

## 6. Business Requirements

Priority: **M** = Must, **S** = Should, **C** = Could.

### 6.1 Access & Security
| ID | Requirement | Priority |
|---|---|---|
| ABR-01 | The panel MUST be accessible to a **single admin** with all permissions. | M |
| ABR-02 | Login MUST be secured (strong password + second factor). | M |
| ABR-03 | **Every admin action** MUST be recorded in an audit log (what, when, before/after, reason). | M |

### 6.2 Analytics & Visibility
| ID | Requirement | Priority |
|---|---|---|
| ABR-10 | The admin MUST see a **live overview**: active users now, bookings today, pending requests, payments success/failure today, current errors. | M |
| ABR-11 | **Every screen view and every action** in the customer and merchant apps (guests and registered) MUST be stored **forever** and be queryable. | M |
| ABR-12 | The admin MUST be able to open **any user's full journey** (chronological timeline of sessions, screens, actions, searches, bookings, payment attempts, errors, devices). | M |
| ABR-13 | Guest activity MUST be **linked to the account** once the guest registers, so the journey starts from first app open. | M |
| ABR-14 | The admin MUST see **funnels** with drop-off per step: activation, registration, booking (each step), payment, merchant onboarding. | M |
| ABR-15 | The admin MUST see **every payment attempt** with outcome and gateway failure reason, plus refunds and payouts. | M |
| ABR-16 | The admin MUST see **problems**: crashes, API errors, OTP failures/blocks, payment failures, refund failures, slow responses. | M |
| ABR-17 | The admin MUST see search analytics including **zero-result searches**, filter usage, banner clicks, location permission rates, deep link opens, calls/WhatsApp to salons. | M |
| ABR-18 | The admin MUST see booking analytics: status distribution, salon response times, auto-cancellations, cancellations, no-shows, bride bookings. | M |
| ABR-19 | The admin MUST see merchant analytics: profile completeness, response times, activity per salon and per member, subscriptions. | M |
| ABR-20 | The admin MUST see retention and engagement metrics (DAU/MAU, cohorts, repeat bookings). | M |
| ABR-21 | All analytics MUST be filterable by date range, app (customer/merchant), platform, app version, user type, gender scope, city, salon. | M |

### 6.3 Customers
| ID | Requirement | Priority |
|---|---|---|
| ABR-30 | View, search and edit any customer; see bookings, reviews, payments, journey and devices. | M |
| ABR-31 | Block / unblock customers with a reason. | M |
| ABR-32 | Handle account deletions (grace period visibility, restore, force delete). | M |

### 6.4 Salons
| ID | Requirement | Priority |
|---|---|---|
| ABR-40 | Review salon applications: view license documents, **approve or reject with reason**. | M |
| ABR-41 | View and **edit any salon data** (profile, gallery, hours, closures, services, staff, members, permissions, policies, gender type). | M |
| ABR-42 | Set a salon **Online / Offline** (suspension) with reason. | M |
| ABR-43 | Manage **Recommended** placements (salon, period, order, amount paid). | M |
| ABR-44 | Handle salon deletion requests. | M |

### 6.5 Bookings
| ID | Requirement | Priority |
|---|---|---|
| ABR-50 | View every booking with full details and status history. | M |
| ABR-51 | **Intervene on any booking**: change status, approve/reject, cancel, reassign staff, issue refunds — with mandatory reason; affected parties are notified. | M |

### 6.6 Money
| ID | Requirement | Priority |
|---|---|---|
| ABR-60 | View all payment transactions and attempts, with gateway responses. | M |
| ABR-61 | Manage refunds: view status, retry failed refunds, issue **manual refunds** (full or partial), mark as refunded. | M |
| ABR-62 | Manage **payouts manually**: per-salon balance (collected − gateway fees − refunds − paid out), record transfers (amount, date, reference), mark transferred. | M |
| ABR-63 | Manage **subscriptions manually**: trial dates, record payments (amount, date, period covered, reference), expiry tracking, suspend on non-payment. | M |
| ABR-64 | Reconciliation view of collected vs refunded vs paid out. | S |

### 6.7 Quality & Content
| ID | Requirement | Priority |
|---|---|---|
| ABR-70 | Moderate all reviews (salon & staff) before publication; remove published reviews. | M |
| ABR-71 | Manage the **services catalog** (men/women) and salon requests for new services. | M |
| ABR-72 | Manage banners (with schedule and targeting), legal pages, FAQ and contact information. | M |
| ABR-73 | Send **push notification campaigns** to targeted audiences and see delivery/open stats. | M |

### 6.8 Settings
| ID | Requirement | Priority |
|---|---|---|
| ABR-80 | Configure platform settings: nearby radius, booking rules, OTP limits, countries/regex, cities/areas, app versions (force/optional), maintenance mode per app. | M |

### 6.9 Alerts & Reports
| ID | Requirement | Priority |
|---|---|---|
| ABR-90 | Send **email alerts** to the admin for: new salon application, new review pending moderation, payment failure or spike in failures, refund failed or delayed, spike in crashes/server errors, salon subscription ending within 7 days or trial ended, new catalog service request. | M |
| ABR-91 | Provide **daily, weekly and monthly reports**, exportable at any time to Excel and PDF. | M |
| ABR-92 | Any table in the panel SHOULD be exportable. | S |

---

## 7. Business Rules

| ID | Rule |
|---|---|
| ABRL-01 | Analytics data is retained **forever**. |
| ABRL-02 | Guest history is merged into the user account at registration (by installation/device ID). |
| ABRL-03 | Admin actions on bookings, payments or accounts require a **reason** and notify affected parties. |
| ABRL-04 | All admin actions are written to the audit log. |
| ABRL-05 | Payouts and subscriptions are recorded manually by the admin. |
| ABRL-06 | Reviews are published only after admin approval. |
| ABRL-07 | Salons go live only after admin approval + complete profile; admin can set them Offline at any time. |
| ABRL-08 | Alerts are delivered by **email**. |

---

## 8. KPIs the Admin Panel Must Surface

- Installs, DAU/MAU, guest → registered conversion.
- Booking funnel conversion and drop-off per step.
- Bookings by status; approval rate; average salon response time; auto-cancel rate; no-show rate.
- Payment success rate; failure reasons; refund volume and time.
- GMV (online collected + marked paid), payouts due.
- Active salons; trial → paid conversion; subscriptions expiring; Offline salons.
- Average ratings; reviews pending; zero-result searches.
- Crash-free users; API error rate.

---

## 9. Assumptions, Constraints & Dependencies
- Web app built with **React**; tech stack details provided later.
- Analytics source: Firebase Analytics + Crashlytics with **BigQuery export** (permanent retention), plus server-side events in MongoDB; the backend serves the data to the panel.
- Email via Nodemailer + Gmail SMTP.
- Real-time updates via Socket.IO.

---

## 10. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Event volume grows large (retained forever) | BigQuery partitioned tables, scheduled aggregation queries, query cost monitoring |
| Single admin is a single point of failure | Design data model for future multi-admin roles |
| Manual payouts/subscriptions cause errors | Clear balances, mandatory references, audit log, reconciliation view |
| Privacy of tracked behavior | Privacy policy disclosure, access only via secured admin login |

---

## 11. Open Items

| # | Item |
|---|---|
| 1 | Admin panel tech stack details (React confirmed) |
| 2 | Alert thresholds (e.g., failure spike definitions) — configurable defaults proposed in PRD |
| 3 | Report scheduling by email (optional) |
| 4 | Admin panel language (Arabic + English assumed) |
