# WAB Wedding & Beauty — Business Requirements Document (BRD)
## Merchant (Salon) Side

| Field | Value |
|---|---|
| Document | Business Requirements Document — Merchant |
| Product | WAB Wedding & Beauty — Merchant App |
| Version | 1.1 (OTP via WhatsApp since 2026-10-26, was Firebase SMS; real-time booking screens, analytics via Firebase + BigQuery) |
| Date | October 2026 |
| Related documents | Customer App PRD & BRD, Merchant App PRD, Admin PRD & BRD, Backend BRD |

---

## 1. Executive Summary

WAB Wedding & Beauty is a two-sided marketplace in **Jordan** connecting customers with **men's and women's salons**. This BRD defines the business needs of the **merchant side**: a dedicated **mobile app (Android + iOS)** that lets salons join the platform, build and maintain their public profile, manage services, staff, working hours and policies, **receive and decide on booking requests in real time**, track payments and payouts, and monitor performance.

Everything a customer sees in the customer app (profile, hours, staff, services, prices, policies, availability) originates from data managed by the merchant in this app. Detailed functional behavior will be defined in the Merchant PRD.

---

## 2. Business Background & Problem Statement

### 2.1 Salon Problems
1. **Bookings are manual:** phone calls and messages interrupt work, are hard to track, and lead to double bookings and lost requests.
2. **Limited visibility:** salons depend on word of mouth and social media to reach new customers.
3. **No-shows and late cancellations** cost time and revenue, with no deposit mechanism.
4. **Staff scheduling** (skills, days off, leaves) is managed informally.
5. **No performance data:** salons lack insight into demand, popular services, staff performance and revenue.

### 2.2 Opportunity
Give salons a simple, Arabic-first mobile tool that brings them new customers, organizes bookings by staff and time, protects them with deposits and cancellation policies, and shows their performance — in exchange for a monthly subscription after a free trial.

---

## 3. Business Objectives

| ID | Objective |
|---|---|
| OBJ-M1 | Onboard a critical mass of verified, licensed salons (men's and women's) before and after launch. |
| OBJ-M2 | Ensure salon profiles are complete and accurate so customers can book with confidence. |
| OBJ-M3 | Minimize booking response time so customers get fast confirmations. |
| OBJ-M4 | Reduce no-shows and late cancellations through deposits and clear policies. |
| OBJ-M5 | Convert salons from the **3-month free trial** to **paid monthly subscriptions**. |
| OBJ-M6 | Sell **paid "Recommended" placements** to salons. |
| OBJ-M7 | Provide transparent payments and payouts to build salon trust in the platform. |

---

## 4. Scope

### 4.1 In Scope
- Separate **merchant mobile app** (Android + iOS), Arabic default + English.
- Salon registration with license document and admin approval.
- Team accounts: Owner, Manager, Employee, with **owner-controlled, per-page permissions**.
- Salon profile, gallery, location, contact details (phone, optional WhatsApp).
- Weekly working hours and exceptional closures.
- Services selected from an **admin-managed catalog** with salon-specific price, duration, bride-only flag, description and media.
- Staff management: profiles, skills (services), bride qualification, schedules, leaves.
- Salon policies: payment options, deposit, cancellation window, refund and no-show rules.
- Booking management: real-time requests, approve/reject, calendar, completion, no-show, salon cancellation.
- Real-time booking alerts (Uber/Careem-style).
- Reviews (read-only).
- Dashboard and statistics.
- Payments, refunds and payouts visibility.
- Notifications.

### 4.2 Out of Scope
- Manual / walk-in bookings and time blocking inside the app.
- In-app subscription payment (subscriptions are paid **outside the app** for now).
- In-app purchase of "Recommended" placement (handled offline with admin).
- In-app chat with customers.
- Point-of-sale, inventory, payroll or accounting features.
- Web dashboard for merchants.
- Multi-branch management under one account (each salon is a separate account).

---

## 5. Stakeholders

| Stakeholder | Interest |
|---|---|
| Salon owner | Grow bookings and revenue, control team access, get paid |
| Salon manager | Run daily bookings and schedules |
| Salon employee | See own schedule and bookings (as permitted) |
| Customers | Accurate information, fast confirmations, reliable appointments |
| Platform owner | Subscription and placement revenue, marketplace quality |
| Admin / operations | Verify salons, manage catalog, moderate, suspend, handle payouts |
| Payment gateway | Process payments and refunds |

---

## 6. Business Model (merchant-relevant view)

| Item | Decision |
|---|---|
| Subscription | **Monthly subscription per salon**; **first 3 months free**. Paid **outside the app** for now. Subscription status is managed by admin. |
| Non-payment | Admin **manually suspends** the salon → account becomes **Offline**: all data is kept, the salon is hidden from customers and cannot receive new bookings. |
| Paid placement | Salons can pay to appear in the **"Recommended Salons"** section (arranged with admin outside the app). |
| Commission | None on bookings (subscription model). |
| Online payments | Collected by the **platform** through one payment gateway (deposits and full payments). |
| Refunds | Processed by the **platform**. |
| Gateway fees | **Borne by the salon** (deducted from payouts). |
| Payouts | Platform transfers collected amounts (minus gateway fees and refunds) to the salon. |

---

## 7. Merchant Roles & Permissions

| Role | Description |
|---|---|
| **Owner (مالك)** | Creates the salon account. Full access. **The only role that can add team members, assign roles and grant/revoke permissions.** |
| **Manager (مسؤول)** | Operates the salon within the permissions granted by the owner. |
| **Employee (عامل)** | Staff member; accesses only what the owner allows (e.g., own schedule and bookings). |

**Rules:**
- The owner adds each team member's **mobile number (mandatory)**; the member logs into the merchant app with that number + **OTP**.
- Permissions are granted **per page/feature** by the owner (feature flags). Pages without permission are **hidden** entirely from that user.
- Being a staff member in the merchant app is independent from using the customer app; in the customer app, a staff member is just a regular customer.

---

## 8. Merchant Journey

1. **Discover** → install the merchant app directly, or tap "Register your salon" in the customer app (opens the merchant app, or the store if not installed).
2. **Register** → mobile number + OTP, salon gender type (men/women), upload license document.
3. **Wait for approval** → admin reviews the document. Meanwhile, the owner can prepare the profile.
4. **Complete profile** → images, description, location, contact, hours, services, staff, policies. The salon becomes **visible only when the profile is complete and admin has approved**.
5. **Build the team** → add staff, assign roles and permissions.
6. **Operate** → receive booking requests in real time, approve/reject, serve customers, mark completed or no-show.
7. **Grow** → reviews, statistics, paid Recommended placement.
8. **Get paid** → track online payments, refunds and payouts.
9. **Subscribe** → after 3 free months, pay the monthly subscription (outside the app) to stay online.

---

## 9. Business Requirements

Priority: **M** = Must, **S** = Should, **C** = Could.

### 9.1 Registration & Verification
| ID | Requirement | Priority |
|---|---|---|
| MBR-01 | Salons MUST be able to register from the merchant app or via a link from the customer app (opening the merchant app or the app store). | M |
| MBR-02 | Registration MUST require a mobile number verified by OTP, the salon's gender type (men **or** women), and a **document proving the salon exists and is licensed** (any document type, image or PDF). | M |
| MBR-03 | Every new salon MUST be **approved by admin** before it can go live; the merchant MUST see the approval status (pending / approved / rejected with reason). | M |
| MBR-04 | A salon MUST NOT be visible to customers until **both** admin approval is granted **and** the profile is complete. | M |
| MBR-05 | The app SHOULD guide the owner with a profile-completion checklist showing what is missing. | S |
| MBR-06 | A salon's gender type is fixed after approval (changes only through admin). | S |

### 9.2 Team, Roles & Access
| ID | Requirement | Priority |
|---|---|---|
| MBR-10 | The owner MUST be able to add team members with a **mandatory mobile number** and assign a role (Manager or Employee). | M |
| MBR-11 | The owner MUST be the **only** user able to grant or revoke permissions, per page/feature. | M |
| MBR-12 | Team members MUST log in with their registered number + OTP and see **only** the pages they are permitted to access. | M |
| MBR-13 | The owner MUST be able to deactivate a team member's access at any time. | M |

### 9.3 Salon Profile
| ID | Requirement | Priority |
|---|---|---|
| MBR-20 | Merchants MUST manage: salon name, cover image, profile image, description, map location and location text, phone number, and **optional WhatsApp number**. | M |
| MBR-21 | Merchants MUST manage a **portfolio gallery** of images and videos (add, delete, reorder). | M |
| MBR-22 | Merchants SHOULD be able to preview the profile as customers see it. | S |

### 9.4 Working Hours
| ID | Requirement | Priority |
|---|---|---|
| MBR-30 | Merchants MUST define a **weekly schedule** with different hours per day and days off. | M |
| MBR-31 | Merchants MUST define **exceptional closures** (specific dates/periods with a reason, e.g., Eid), overriding the weekly schedule. | M |
| MBR-32 | If a new closure conflicts with approved bookings, the merchant MUST be warned; affected bookings must be cancelled by the salon with a full refund to customers. | M |

### 9.5 Services
| ID | Requirement | Priority |
|---|---|---|
| MBR-40 | Services MUST be selected from an **admin-managed catalog**, separated into men's and women's services (salons see only their gender's catalog). | M |
| MBR-41 | For each selected service, merchants MUST set **price (JOD, tax- and fee-inclusive)** and **duration**, and MAY add a description and media (images/videos). | M |
| MBR-42 | In women's salons, merchants MUST be able to mark a service as **bride-only (VIP)**. | M |
| MBR-43 | Merchants MUST be able to request a new service to be added to the catalog (admin approves). | S |
| MBR-44 | Price changes MUST NOT affect existing bookings (prices are locked at booking time). | M |
| MBR-45 | Merchants MUST be able to activate/deactivate services. | M |

### 9.6 Staff (service providers)
| ID | Requirement | Priority |
|---|---|---|
| MBR-50 | Merchants MUST manage staff profiles: photo, first name, role (owner/manager/employee), bio, years of experience. | M |
| MBR-51 | Merchants MUST assign which **services** each staff member can perform. | M |
| MBR-52 | In women's salons, merchants MUST mark staff as **bride-qualified**. | M |
| MBR-53 | Merchants MUST set each staff member's working days and **leave dates**. | M |
| MBR-54 | Merchants MUST be warned when a change (deactivation, leave, removed skill) conflicts with upcoming bookings. | M |

### 9.7 Salon Policies
| ID | Requirement | Priority |
|---|---|---|
| MBR-60 | Merchants MUST set a **cancellation window** (mandatory): how long before the appointment customers can no longer cancel. | M |
| MBR-61 | Merchants MUST choose enabled **payment options**: pay on arrival, deposit, full online payment (one or more). | M |
| MBR-62 | If deposit is enabled, merchants MUST set the **deposit percentage**. | M |
| MBR-63 | Merchants MUST define refund rules for customer cancellations: whether the deposit is refundable, and whether a full payment is refunded fully or minus the deposit. | M |
| MBR-64 | Merchants MUST define the **no-show policy** (what happens to deposit/full payment). | M |
| MBR-65 | Policy changes apply only to new bookings (existing bookings keep their policy snapshot). | M |

### 9.8 Booking Management
| ID | Requirement | Priority |
|---|---|---|
| MBR-70 | Merchants MUST receive new booking requests **in real time**, including all persons, services, staff, times, payment method and amounts. | M |
| MBR-71 | **Bride bookings** MUST be clearly highlighted. | M |
| MBR-72 | Merchants MUST be able to **approve** or **reject** pending bookings; rejection REQUIRES a reason and triggers a full refund. | M |
| MBR-73 | Merchants MUST see a **calendar** of bookings by day and by staff member. | M |
| MBR-74 | Merchants MUST be able to mark an approved booking as **Completed (and paid)** or **No-show**. | M |
| MBR-75 | Merchants MUST be able to **cancel an approved booking** with a mandatory reason; the customer receives a **full refund**. | M |
| MBR-76 | Merchants MUST be informed that pending bookings are **auto-cancelled 1 hour after the appointment time**, with a mandatory refund. | M |
| MBR-77 | Merchants SHOULD be able to reassign an approved booking to another eligible staff member (e.g., staff sickness). | S |
| MBR-78 | Merchants MUST be able to search and filter bookings (status, date, staff, reference number, bride). | M |
| MBR-79 | Merchants MUST see each booking's payment status (paid online, deposit paid, remaining amount, refund status). | M |

### 9.9 Real-Time Alerts & Notifications
| ID | Requirement | Priority |
|---|---|---|
| MBR-80 | New booking requests MUST be presented like ride-hailing apps (Uber/Careem): an **attention-grabbing request sheet with Accept / Reject**, appearing from anywhere in the app and, where the OS allows, **outside the app**. | M |
| MBR-81 | Platform constraint: on **Android** the request can appear over other apps; on **iOS** (which does not allow overlays) it is delivered as a high-priority, time-sensitive notification with Accept/Reject actions, and as the in-app sheet when opened. | M |
| MBR-82 | Merchants MUST be notified of: new bookings, bride bookings, bookings still pending 30 minutes before the appointment, customer cancellations, auto-cancellations, newly published reviews, admin decisions (approval, suspension, catalog requests), payout updates. | M |
| MBR-83 | Notifications MUST respect each team member's permissions (only users with access to bookings receive booking alerts). | M |

### 9.10 Reviews
| ID | Requirement | Priority |
|---|---|---|
| MBR-90 | Merchants MUST see published reviews of the salon and of each staff member. | M |
| MBR-91 | Merchants MUST NOT be able to edit or delete reviews; abusive reviews are reported to admin. | M |

### 9.11 Dashboard & Statistics
| ID | Requirement | Priority |
|---|---|---|
| MBR-100 | Merchants MUST see today's bookings and pending requests at a glance. | M |
| MBR-101 | Merchants SHOULD see statistics by period: number of bookings, revenue, approval/cancellation/no-show rates, top services, top staff, ratings, profile views. | S |

### 9.12 Payments & Payouts
| ID | Requirement | Priority |
|---|---|---|
| MBR-110 | Merchants MUST see all online payments collected by the platform for their bookings (deposits and full payments). | M |
| MBR-111 | Merchants MUST see refunds issued and their status. | M |
| MBR-112 | Merchants MUST see payouts: amount due, gateway fees deducted, amounts transferred, and pending balance. | M |
| MBR-113 | Merchants MUST provide payout (bank) details. | M |

### 9.13 Subscription & Account Status
| ID | Requirement | Priority |
|---|---|---|
| MBR-120 | Merchants MUST see their subscription status (free trial with days remaining, active, expired) and the account status (online/offline). | M |
| MBR-121 | When suspended (**Offline**), the salon keeps all data, is hidden from customers and cannot receive new bookings; existing approved bookings remain manageable. | M |
| MBR-122 | Merchants SHOULD see how to contact the platform to pay the subscription or request a Recommended placement. | S |

### 9.14 General
| ID | Requirement | Priority |
|---|---|---|
| MBR-130 | Arabic (default, RTL) and English MUST be supported; light/dark/system themes SHOULD be supported. | M |
| MBR-131 | All merchant actions MUST be tracked in analytics (Firebase Analytics → BigQuery, permanent) and visible to admin. | M |
| MBR-132 | Merchants MUST have access to support (call/WhatsApp/email), FAQ and legal terms. | M |
| MBR-133 | Admin MUST be able to force/suggest app updates and enable maintenance mode. | M |
| MBR-134 | Booking screens (dashboard, bookings list, calendar, details) MUST update in real time. | M |
| MBR-135 | Login MUST use mobile number + WhatsApp OTP sent by the backend (BUSINESS_DOMAIN §3.1a); OTP length configurable (currently 6). | M |

---

## 10. Key Business Rules (summary)

| ID | Rule |
|---|---|
| MBRL-01 | Each salon serves **one gender** only (men or women). |
| MBRL-02 | Salon goes live only after **admin approval + complete profile**. |
| MBRL-03 | Only the **owner** manages team roles and permissions. |
| MBRL-04 | Every team member must have a mobile number; login via OTP. |
| MBRL-05 | Services come from the admin catalog; price and duration are salon-specific; prices are tax-inclusive and locked at booking. |
| MBRL-06 | Every booking requires salon approval; pending bookings hold their slot. |
| MBRL-07 | Salon rejection or cancellation always results in a **full refund** to the customer. |
| MBRL-08 | Pending bookings are auto-cancelled **1 hour after** the appointment time with a mandatory refund. |
| MBRL-09 | Only the salon marks bookings **Completed** or **No-show**. |
| MBRL-10 | Online payments and refunds go through the platform; gateway fees are deducted from salon payouts. |
| MBRL-11 | Policy and price changes never affect existing bookings. |
| MBRL-12 | No manual/walk-in booking or time blocking in the app; salons manage walk-ins without conflicting with app bookings. |
| MBRL-13 | Non-paying salons are set **Offline** by admin (data retained). |

---

## 11. Success Metrics (KPIs)

> Targets to be set by the business.

| Area | KPI |
|---|---|
| Acquisition | Registered salons; approved salons; time from registration to approval |
| Activation | Profile completion rate; time to go live; salons with ≥1 service and ≥1 staff |
| Responsiveness | Average time to approve/reject; auto-cancellation rate |
| Operations | Approval rate; salon cancellation rate; no-show rate |
| Quality | Average salon/staff rating; complaint rate |
| Monetization | Trial → paid conversion; active paid subscriptions; churn; Recommended placements sold |
| Payments | Online payment share; payout accuracy; refund processing time |
| Engagement | Daily active merchants; team members per salon |

---

## 12. Assumptions, Constraints & Dependencies

**Assumptions**
- Salons keep schedules, staff, services and policies accurate.
- Salons respond to requests promptly using real-time alerts.
- Payout frequency is set by admin (e.g., weekly).

**Constraints**
- Jordan only; JOD only.
- Mobile app only (Kotlin Multiplatform + Compose Multiplatform).
- iOS does not permit overlays outside the app (see MBR-81).
- Subscriptions and Recommended placements are handled outside the app.

**Dependencies**
- Admin panel (approvals, catalog, suspensions, payouts, moderation).
- Payment gateway selection supporting platform collection, refunds and payouts.
- Firebase (push, analytics, crashlytics) and BigQuery export; phone OTP over the WhatsApp Cloud API through the backend.

---

## 13. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Slow responses to booking requests | Customer frustration, lost bookings | Real-time alerts, pending reminders, response-time KPI, auto-cancellation |
| Double bookings from walk-ins | Customer arrives without a slot | Onboarding guidance; monitor; consider time blocking later |
| Incomplete or inaccurate profiles | Low trust, wrong availability | Completion checklist; salon hidden until complete; admin review |
| Low trial-to-paid conversion | Revenue risk | Demonstrate value via statistics; engagement during trial |
| Payout disputes | Loss of merchant trust | Transparent payment, fee and payout history |
| Unauthorized staff actions | Operational errors | Owner-only, per-page permissions; activity tracking |
| iOS overlay limitations | Missed requests on iPhone | Time-sensitive notifications with actions; distinct sound |

---

## 14. Open Items

| # | Item |
|---|---|
| 1 | Payout frequency and minimum payout amount |
| 2 | Subscription price and payment methods (outside app) |
| 3 | Pricing and duration of Recommended placements |
| 4 | Default permission sets per role (suggested defaults for Manager and Employee) |
| 5 | Payment gateway selection (must support collection, refunds, payouts) |
| 6 | Whether rejected registrations can re-apply and how |
| 7 | KPI targets |

---

## 15. Glossary

| Term | Meaning |
|---|---|
| Merchant | Salon business on the platform |
| Owner / Manager / Employee | Merchant team roles (مالك / مسؤول / عامل) |
| Permission (feature flag) | Owner-granted access to a specific page/feature |
| Catalog | Admin-managed list of services, split by gender |
| Bride-only service | VIP service visible only for persons marked as bride |
| Bride-qualified staff | Staff allowed to serve brides |
| Exceptional closure | Specific date(s) when the salon is closed outside its weekly schedule |
| Offline | Salon suspended by admin; hidden from customers, data retained |
| Payout | Transfer from the platform to the salon of collected online payments minus fees and refunds |
