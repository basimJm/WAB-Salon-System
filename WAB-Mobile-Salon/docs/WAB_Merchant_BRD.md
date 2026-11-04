# WAB Wedding & Beauty — Business Requirements Document (BRD)
## Merchant (Business) Side

| Field | Value |
|---|---|
| Document | Business Requirements Document — Merchant |
| Product | WAB Wedding & Beauty — Merchant App |
| Version | 2.0 (salons, beauty clinics and tattoo studios; branches; bookings made by the business; closing finished bookings) |
| Date | 2026-11-04 |
| Precedence | PRD > BRD > Design Script > design files. Root `BUSINESS_DOMAIN.md` holds the data and rules; the merchant contract is the generated `WAB-Server/docs/api/openapi.merchant.json` |
| Related documents | Customer App PRD & BRD, Merchant App PRD, Admin PRD & BRD, Backend BRD |

---

## 1. Executive Summary

WAB Wedding & Beauty is a two-sided marketplace in **Jordan** connecting customers with **businesses of three types: salons (men, women or both), beauty clinics and tattoo studios**. "Business" below means any of the three; "salon" is used only where a rule is salon-only. This BRD defines the business needs of the **merchant side**: a dedicated **mobile app (Android + iOS)** that lets businesses join the platform, build and maintain their public profile, run one or more branches, manage services, staff, working hours and policies, **receive and decide on booking requests in real time**, create bookings for customers themselves, close finished bookings, track payments and payouts, and monitor performance.

Everything a customer sees in the customer app (profile, branches, hours, staff, services, prices, policies, availability) originates from data managed by the merchant in this app. Detailed functional behavior is defined in the Merchant PRD.

---

## 2. Business Background & Problem Statement

### 2.1 Business Problems
1. **Bookings are manual:** phone calls and messages interrupt work, are hard to track, and lead to double bookings and lost requests.
2. **Limited visibility:** businesses depend on word of mouth and social media to reach new customers.
3. **No-shows and late cancellations** cost time and revenue, with no deposit mechanism.
4. **Staff scheduling** (skills, days off, leaves) is managed informally.
5. **No performance data:** businesses lack insight into demand, popular services, staff performance and revenue.

### 2.2 Opportunity
Give businesses a simple, Arabic-first mobile tool that brings them new customers, organizes bookings by staff and time, protects them with deposits and cancellation policies, and shows their performance — in exchange for a monthly subscription after a free trial.

---

## 3. Business Objectives

| ID | Objective |
|---|---|
| OBJ-M1 | Onboard a critical mass of verified, licensed businesses (men's, women's and mixed salons, beauty clinics, tattoo studios) before and after launch. |
| OBJ-M2 | Ensure business profiles and branches are complete and accurate so customers can book with confidence. |
| OBJ-M3 | Minimize booking response time so customers get fast confirmations. |
| OBJ-M4 | Reduce no-shows and late cancellations through deposits and clear policies. |
| OBJ-M5 | Convert businesses from the **3-month free trial** to **paid monthly subscriptions**. |
| OBJ-M6 | Sell **paid "Recommended" placements** to businesses. |
| OBJ-M7 | Provide transparent payments and payouts to build business trust in the platform. |
| OBJ-M8 | Keep schedules and records accurate: phone and walk-in customers are booked in the app, and every finished booking is closed. |

---

## 4. Scope

### 4.1 In Scope
- Separate **merchant mobile app** (Android + iOS), Arabic default + English.
- Business registration with documents and admin approval: business type, audience for salons, trade license, medical license for clinics.
- **Branches:** one or more per business, managed by the owner.
- Team accounts: Owner, Manager, Employee, with **owner-controlled, per-page permissions**; managers and employees belong to one branch.
- Business profile and gallery (business-wide); location and contact details (phone, optional WhatsApp) per branch.
- Weekly working hours and exceptional closures per branch.
- Services selected from an **admin-managed catalog per business type**, with branch-specific price and duration, bride-only flag, description and media.
- Staff management: profiles, skills (services), bride qualification, schedules, leaves.
- Business policies: payment options, deposit, cancellation window, refund and no-show rules.
- Booking management: real-time requests, approve/reject, calendar, completion, no-show, cancellation by the business.
- **Bookings made by the business** for a customer, by mobile number, with or without a WAB account.
- **Closing finished bookings:** To close list and repeating reminders with actions.
- Real-time booking alerts (Uber/Careem-style).
- Reviews (read-only).
- Dashboard and statistics.
- Payments, refunds and payouts visibility. Online payment is designed but **paused today** (no gateway chosen); customers pay on arrival.
- Notifications.

### 4.2 Out of Scope
- Time blocking inside the app.
- In-app subscription payment (subscriptions are paid **outside the app** for now).
- In-app purchase of "Recommended" placement (handled offline with admin).
- In-app chat with customers.
- Point-of-sale, inventory, payroll or accounting features.
- Web dashboard for merchants.

---

## 5. Stakeholders

| Stakeholder | Interest |
|---|---|
| Business owner | Grow bookings and revenue, control team access and branches, get paid |
| Branch manager | Run daily bookings and schedules of one branch |
| Employee | See own schedule and bookings (as permitted) |
| Customers | Accurate information, fast confirmations, reliable appointments |
| Platform owner | Subscription and placement revenue, marketplace quality |
| Admin / operations | Verify businesses, manage catalog per type, moderate, suspend, handle payouts, follow overdue bookings |
| Payment gateway (not chosen yet) | Process payments and refunds |

---

## 6. Business Model (merchant-relevant view)

| Item | Decision |
|---|---|
| Subscription | **Monthly subscription per business** (all branches); **first 3 months free from approval**. Paid **outside the app** and recorded by admin. |
| Non-payment | Admin **manually suspends** the business → account becomes **Offline**: all data is kept, the business is hidden from customers and cannot receive new bookings. |
| Paid placement | Businesses can pay to appear in the **"Recommended"** section, per business, not per branch (arranged with admin outside the app). |
| Commission | None on bookings (subscription model). |
| Online payments | Designed: collected by the **platform** through one payment gateway (deposits and full payments). **Status today: paused**, no gateway chosen; customers pay on arrival. |
| Refunds | Processed automatically by the **platform**. |
| Gateway fees | **Borne by the business** (deducted from payouts). |
| Payouts | Platform transfers collected amounts (minus gateway fees and refunds) manually to the business: one bank account and one payout per business, all branches. Phase 2 = split payments. |

---

## 7. Merchant Roles & Permissions

| Role | Description |
|---|---|
| **Owner (مالك)** | Creates the business account. Full access to every branch. **The only role that can add team members, assign roles, grant/revoke permissions, manage branches and bank details, and request deletion.** |
| **Manager (مسؤول)** | Operates one branch within the permissions granted by the owner. |
| **Employee (عامل)** | Staff member of one branch; accesses only what the owner allows (e.g., own schedule and bookings). |

**Rules:**
- The owner adds each team member's **mobile number (mandatory)** and branch; the member logs into the merchant app with that number + **WhatsApp OTP**.
- Permissions are granted **per page/feature** by the owner (16 grantable keys, BUSINESS_DOMAIN §6). Pages without permission are **hidden** entirely from that user.
- Every permission of a manager or employee applies to their branch only. Finance, subscription and policies cannot be granted to them.
- Being a staff member in the merchant app is independent from using the customer app; in the customer app, a staff member is just a regular customer.

---

## 8. Merchant Journey

1. **Discover** → install the merchant app directly, or tap "Register your business" in the customer app (opens the merchant app, or the store if not installed).
2. **Register** → mobile number + WhatsApp OTP, business type (salon, clinic or tattoo studio), audience for salons, upload documents (trade license; clinics also a medical license).
3. **Wait for approval** → admin reviews the documents. Meanwhile, the owner can prepare the profile.
4. **Complete profile** → business items (images, description, policies) and branch items (location, contact, hours, services, staff). The business becomes **visible only when it is complete, has a bookable branch and admin has approved**.
5. **Build the team and branches** → add branches, add staff, assign roles and permissions.
6. **Operate** → receive booking requests in real time, approve/reject, book phone and walk-in customers, serve customers, close finished bookings as completed or no-show.
7. **Grow** → reviews, statistics, paid Recommended placement.
8. **Get paid** → track online payments, refunds and payouts once online payment is live.
9. **Subscribe** → after 3 free months, pay the monthly subscription (outside the app) to stay online.

---

## 9. Business Requirements

Priority: **M** = Must, **S** = Should, **C** = Could.

### 9.1 Registration & Verification
| ID | Requirement | Priority |
|---|---|---|
| MBR-01 | Businesses MUST be able to register from the merchant app or via a link from the customer app (opening the merchant app or the app store). | M |
| MBR-02 | Registration MUST require a mobile number verified by WhatsApp OTP, the business type, the audience for salons (men, women or both), and a **trade license document proving the business exists and is licensed** (image or PDF). Clinics MUST also upload a **medical license**; tattoo studios need the trade license only. | M |
| MBR-03 | Every new business MUST be **approved by admin** before it can go live; the merchant MUST see the approval status (pending / approved / rejected with reason). | M |
| MBR-04 | A business MUST NOT be visible to customers until admin approval is granted, the profile is complete **and** at least one branch is bookable (BUSINESS_DOMAIN §5.2). | M |
| MBR-05 | The app SHOULD guide the owner with a completion checklist showing what is missing, at business level and at branch level. | S |
| MBR-06 | The business type never changes. A salon's audience can only be widened to both by the owner, or narrowed through admin with a reason; clinics and tattoo studios always serve both. | S |

### 9.2 Team, Roles & Access
| ID | Requirement | Priority |
|---|---|---|
| MBR-10 | The owner MUST be able to add team members with a **mandatory mobile number**, assign a role (Manager or Employee) and a branch. | M |
| MBR-11 | The owner MUST be the **only** user able to grant or revoke permissions, per page/feature. | M |
| MBR-12 | Team members MUST log in with their registered number + OTP and see **only** the pages they are permitted to access. | M |
| MBR-13 | The owner MUST be able to deactivate a team member's access at any time. | M |
| MBR-14 | Every Manager and Employee MUST belong to exactly one branch, and each permission MUST apply to that branch only; finance, subscription and policies MUST NOT be grantable to them. | M |

### 9.3 Business Profile
| ID | Requirement | Priority |
|---|---|---|
| MBR-20 | Merchants MUST manage the business name, cover image, profile image and description (business-wide), and per branch the map location and location text, phone number, and **optional WhatsApp number**. | M |
| MBR-21 | Merchants MUST manage a business-wide **portfolio gallery** of images and videos (add, delete, reorder). | M |
| MBR-22 | Merchants SHOULD be able to preview the profile as customers see it. | S |

### 9.4 Working Hours
| ID | Requirement | Priority |
|---|---|---|
| MBR-30 | Merchants MUST define, per branch, a **weekly schedule** with different hours per day and days off. | M |
| MBR-31 | Merchants MUST define, per branch, **exceptional closures** (specific dates/periods with a reason, e.g., Eid), overriding the weekly schedule. | M |
| MBR-32 | If a new closure conflicts with approved bookings, the merchant MUST be warned; affected bookings must be cancelled by the business with a full refund to customers. | M |

### 9.5 Services
| ID | Requirement | Priority |
|---|---|---|
| MBR-40 | Services MUST be selected from an **admin-managed catalog per business type**; a business sees and requests only services of its own type that fit its audience. | M |
| MBR-41 | For each selected service, per branch, merchants MUST set **price (JOD, tax- and fee-inclusive)** and **duration**, and MAY add a description and media (images/videos). | M |
| MBR-42 | In salons serving women or both, merchants MUST be able to mark a service as **bride-only (VIP)**; bride does not exist at men's salons, clinics or tattoo studios. | M |
| MBR-43 | Merchants MUST be able to request a new service to be added to the catalog (admin approves). | S |
| MBR-44 | Price changes MUST NOT affect existing bookings (prices are locked at booking time). | M |
| MBR-45 | Merchants MUST be able to activate/deactivate services. | M |

### 9.6 Staff (service providers)
| ID | Requirement | Priority |
|---|---|---|
| MBR-50 | Merchants MUST manage staff profiles: photo, first name, role (owner/manager/employee), branch, bio, years of experience. | M |
| MBR-51 | Merchants MUST assign which **services** of the member's branch each staff member can perform. | M |
| MBR-52 | In salons serving women or both, merchants MUST mark staff as **bride-qualified**. | M |
| MBR-53 | Merchants MUST set each staff member's working days and **leave dates**. | M |
| MBR-54 | Merchants MUST be warned when a change (deactivation, leave, removed skill, move to another branch) conflicts with upcoming bookings. | M |

### 9.7 Business Policies
| ID | Requirement | Priority |
|---|---|---|
| MBR-60 | Merchants MUST set a **cancellation window** (mandatory): how long before the appointment customers can no longer cancel. | M |
| MBR-61 | Merchants MUST choose enabled **payment options**: pay on arrival, deposit, full online payment (one or more). Online options take effect once a gateway is live. | M |
| MBR-62 | If deposit is enabled, merchants MUST set the **deposit percentage**. | M |
| MBR-63 | Merchants MUST define refund rules for customer cancellations: whether the deposit is refundable, and whether a full payment is refunded fully or minus the deposit. | M |
| MBR-64 | Merchants MUST define the **no-show policy** (what happens to deposit/full payment). | M |
| MBR-65 | Policy changes apply only to new bookings (existing bookings keep their policy snapshot). | M |

### 9.8 Booking Management
| ID | Requirement | Priority |
|---|---|---|
| MBR-70 | The owner and members of the booking's branch MUST receive new booking requests **in real time**, including all persons, services, staff, times, payment method and amounts. | M |
| MBR-71 | **Bride bookings** MUST be clearly highlighted. | M |
| MBR-72 | Merchants MUST be able to **approve** or **reject** pending bookings; rejection REQUIRES a reason and triggers a full refund. | M |
| MBR-73 | Merchants MUST see a **calendar** of bookings by day and by staff member. | M |
| MBR-74 | Merchants MUST be able to mark an approved booking as **Completed (and paid)** or **No-show** at or after its start; the assigned staff may do so for their own booking. | M |
| MBR-75 | Merchants MUST be able to **cancel an approved booking** with a mandatory reason; the customer receives a **full refund**. | M |
| MBR-76 | Merchants MUST be informed that pending bookings are **auto-cancelled 60 minutes after the appointment start**, with a mandatory refund. | M |
| MBR-77 | Merchants SHOULD be able to reassign an approved booking to another eligible staff member (e.g., staff sickness). | S |
| MBR-78 | Merchants MUST be able to search and filter bookings (status, date, staff, reference number, bride, branch for the owner). | M |
| MBR-79 | Merchants MUST see each booking's payment status (paid online, deposit paid, remaining amount, refund status). | M |

### 9.9 Real-Time Alerts & Notifications
| ID | Requirement | Priority |
|---|---|---|
| MBR-80 | New booking requests MUST be presented like ride-hailing apps (Uber/Careem): an **attention-grabbing request sheet with Accept / Reject**, appearing from anywhere in the app and, where the OS allows, **outside the app**. | M |
| MBR-81 | Platform constraint: on **Android** the request can appear over other apps; on **iOS** (which does not allow overlays) it is delivered as a high-priority, time-sensitive notification with Accept/Reject actions, and as the in-app sheet when opened. | M |
| MBR-82 | Merchants MUST be notified of: new bookings, bride bookings, bookings still pending 30 minutes before the appointment, customer cancellations, auto-cancellations, finished bookings to close, newly published reviews, admin decisions (approval, suspension, catalog requests), payout updates. Booking notifications name the place "Business - Branch" when there are several branches. | M |
| MBR-83 | Notifications MUST respect each team member's permissions and branch (the owner and that branch's permitted members receive booking alerts). | M |

### 9.10 Reviews
| ID | Requirement | Priority |
|---|---|---|
| MBR-90 | Merchants MUST see published reviews of the business (all branches, each labelled with its branch) and of each staff member. | M |
| MBR-91 | Merchants MUST NOT be able to edit or delete reviews; abusive reviews are reported to admin. | M |

### 9.11 Dashboard & Statistics
| ID | Requirement | Priority |
|---|---|---|
| MBR-100 | Merchants MUST see today's bookings and pending requests at a glance. | M |
| MBR-101 | Merchants SHOULD see statistics by period: number of bookings, revenue, approval/cancellation/no-show rates, top services, top staff, ratings, profile views. | S |

### 9.12 Payments & Payouts
| ID | Requirement | Priority |
|---|---|---|
| MBR-110 | Merchants MUST see all online payments collected by the platform for their bookings (deposits and full payments), filterable by branch. Online payment is paused today, so there is little to show until a gateway is live. | M |
| MBR-111 | Merchants MUST see refunds issued and their status. | M |
| MBR-112 | Merchants MUST see payouts (one per business, all branches): amount due, gateway fees deducted, amounts transferred, and pending balance. | M |
| MBR-113 | The owner MUST provide one set of payout (bank) details per business, protected by WhatsApp OTP. | M |

### 9.13 Subscription & Account Status
| ID | Requirement | Priority |
|---|---|---|
| MBR-120 | Merchants MUST see their subscription status (free trial with days remaining, active, expired) and the account status (online/offline). | M |
| MBR-121 | When suspended (**Offline**), the business keeps all data, is hidden from customers and cannot receive new bookings; existing approved bookings remain manageable. | M |
| MBR-122 | Merchants SHOULD see how to contact the platform to pay the subscription or request a Recommended placement. | S |

### 9.14 General
| ID | Requirement | Priority |
|---|---|---|
| MBR-130 | Arabic (default, RTL) and English MUST be supported; light/dark/system themes SHOULD be supported. | M |
| MBR-131 | Merchant screens and actions MUST be tracked in Firebase Analytics, crashes in Crashlytics; the server records its own events and the admin reads those. The app never sends analytics to the backend. | M |
| MBR-132 | Merchants MUST have access to support (call/WhatsApp/email), FAQ and legal terms. | M |
| MBR-133 | Admin MUST be able to force/suggest app updates and enable maintenance mode. | M |
| MBR-134 | Booking screens (dashboard, bookings list, calendar, details) MUST update in real time. | M |
| MBR-135 | Login MUST use mobile number + WhatsApp OTP: the server generates the code and ARQAM OTP delivers it (BUSINESS_DOMAIN §3.1a); no SMS fallback; OTP length configurable (currently 6). | M |

### 9.15 Business Types & Audience (BUSINESS_DOMAIN §5.19, §5.23)
| ID | Requirement | Priority |
|---|---|---|
| MBR-140 | The app MUST support three business types (salon, beauty clinic, tattoo studio); a salon serves men, women or both; clinics and tattoo studios always serve both. | M |
| MBR-141 | The owner of a men's or women's salon MUST be able to widen it to both instantly; WAB is alerted. | M |
| MBR-142 | Wording, catalog and bride features MUST follow the type: bride only at salons serving women or both. | M |
| MBR-143 | Tattoo bookings MAY carry one optional design image per person, private to the customer and to members who can view that booking. | M |

### 9.16 Branches (BUSINESS_DOMAIN §5.16–§5.18)
| ID | Requirement | Priority |
|---|---|---|
| MBR-150 | A business MUST have one or more branches, up to the `salon.maxBranches` setting (20); only the owner creates, edits, closes or takes them offline (admin too for offline). | M |
| MBR-151 | Location, contacts, hours, closures, services, prices and staff MUST be per branch; name, audience, logo, cover, gallery, description, policy, subscription, payouts, rating and Recommended placement MUST be business-wide. | M |
| MBR-152 | New branches MUST NOT need admin approval; a branch is bookable as soon as it is active and complete. | M |
| MBR-153 | Closing a branch MUST be refused while it has upcoming bookings; the last open branch MUST NOT close; history MUST be kept. | M |
| MBR-154 | The owner MUST be able to filter bookings, calendar, team, reviews, statistics and finance by branch and to choose the branch when editing hours and services. | M |

### 9.17 Bookings Made by the Business (BUSINESS_DOMAIN §5.20)
| ID | Requirement | Priority |
|---|---|---|
| MBR-160 | The owner or a member with `BOOKINGS_CREATE` MUST be able to create a booking from the customer's mobile number, under the same persons, audience, service, staff and slot rules as the customer app. | M |
| MBR-161 | A registered number MUST link the booking to the account, and that customer MUST get every status notification naming "Booked by <Business - Branch>". | M |
| MBR-162 | An unregistered number MUST store contact details only: no account and **no WhatsApp or SMS**; the booking is claimed automatically when that number registers. | M |
| MBR-163 | These bookings MUST start approved, pay on arrival, and show that the business created them and who. Only registered customers review. | M |

### 9.18 Closing Finished Bookings (BUSINESS_DOMAIN §5.21)
| ID | Requirement | Priority |
|---|---|---|
| MBR-170 | An approved booking after its end MUST appear in a **To close** list, oldest first. | M |
| MBR-171 | Assigned staff, branch members with `BOOKINGS_OPERATE` and the owner MUST get a reminder every `booking.closeReminderIntervalMinutes` (60), with no cap, until the booking is completed or marked no-show. | M |
| MBR-172 | Reminders MUST offer **Completed** and **No-show** actions on the notification where the platform allows. | M |
| MBR-173 | After `booking.closeOverdueAlertHours` (24) the same people and the admin MUST be alerted (admin email + alerts list). | M |

---

## 10. Key Business Rules (summary)

| ID | Rule |
|---|---|
| MBRL-01 | A business has one type that never changes; a men's or women's salon takes only persons of its audience, while salons for both, clinics and tattoo studios take any mix. |
| MBRL-02 | A business goes live only after **admin approval + complete profile**, and is bookable through its bookable branches. |
| MBRL-03 | Only the **owner** manages team roles, permissions and branches. |
| MBRL-04 | Every team member must have a mobile number; login via WhatsApp OTP. |
| MBRL-05 | Services come from the admin catalog of the business's type; price and duration are per branch; prices are tax-inclusive and locked at booking. |
| MBRL-06 | Every customer-app booking requires approval by the business; pending bookings hold their slot. Bookings made by the business start approved. |
| MBRL-07 | Rejection or cancellation by the business always results in a **full refund** to the customer. |
| MBRL-08 | Pending bookings are auto-cancelled **60 minutes after** the appointment start with a mandatory refund. |
| MBRL-09 | Only the business (a member with `BOOKINGS_OPERATE` or the assigned staff) or admin marks bookings **Completed** or **No-show**. |
| MBRL-10 | Online payments and refunds go through the platform; gateway fees are deducted from payouts. Online payment is paused today. |
| MBRL-11 | Policy and price changes never affect existing bookings. |
| MBRL-12 | No time blocking in the app; walk-in and phone customers are booked through "New booking", which cannot overlap existing bookings. |
| MBRL-13 | Non-paying businesses are set **Offline** by admin (data retained). |
| MBRL-14 | Each manager and employee belongs to one branch; their permissions apply to it only. |
| MBRL-15 | Bride exists only at salons serving women or both. |
| MBRL-16 | A booking made by the business for an unregistered number sends that person nothing. |
| MBRL-17 | A finished approved booking keeps generating reminders until it is closed. |

---

## 11. Success Metrics (KPIs)

> Targets to be set by the business.

| Area | KPI |
|---|---|
| Acquisition | Registered and approved businesses by type; time from registration to approval |
| Activation | Profile completion rate; time to go live; businesses with a bookable branch; branches per business |
| Responsiveness | Average time to approve/reject; auto-cancellation rate; time to close finished bookings; overdue closes |
| Operations | Approval rate; cancellation rate by the business; no-show rate; share of bookings made by the business |
| Quality | Average business/staff rating; complaint rate |
| Monetization | Trial → paid conversion; active paid subscriptions; churn; Recommended placements sold |
| Payments | Online payment share; payout accuracy; refund processing time |
| Engagement | Daily active merchants; team members per business |

---

## 12. Assumptions, Constraints & Dependencies

**Assumptions**
- Businesses keep schedules, staff, services and policies accurate.
- Businesses respond to requests promptly using real-time alerts.
- Payout frequency is set by admin (e.g., weekly).

**Constraints**
- Jordan only; JOD only.
- Mobile app only (Kotlin Multiplatform + Compose Multiplatform).
- iOS does not permit overlays outside the app (see MBR-81).
- Subscriptions and Recommended placements are handled outside the app.

**Dependencies**
- Admin panel (approvals, catalog, suspensions, payouts, moderation).
- Payment gateway selection supporting platform collection, refunds and payouts (open; online payment paused until then).
- Firebase (push, analytics, Crashlytics); merchant Firebase registrations are an open owner input. Phone OTP goes through the backend and ARQAM OTP over WhatsApp.
- Cloudflare R2 storage through the backend's presigned uploads.

---

## 13. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Slow responses to booking requests | Customer frustration, lost bookings | Real-time alerts, pending reminders, response-time KPI, auto-cancellation |
| Double bookings from walk-ins | Customer arrives without a slot | Book walk-ins through "New booking" (same locks and overlap check as app bookings); onboarding guidance |
| Incomplete or inaccurate profiles | Low trust, wrong availability | Completion checklist; business hidden until complete; admin review |
| Low trial-to-paid conversion | Revenue risk | Demonstrate value via statistics; engagement during trial |
| Payout disputes | Loss of merchant trust | Transparent payment, fee and payout history |
| Unauthorized staff actions | Operational errors | Owner-only, per-page permissions; activity tracking |
| iOS overlay limitations | Missed requests on iPhone | Time-sensitive notifications with actions; distinct sound |
| Finished bookings left open | Wrong records, unpaid amounts not marked | To close list; hourly reminders with actions; admin alert after 24 hours |

---

## 14. Open Items

| # | Item |
|---|---|
| 1 | Payout frequency and minimum payout amount |
| 2 | Subscription price and payment methods (outside app) |
| 3 | Pricing and duration of Recommended placements |
| 4 | Default permission sets per role: in use from BUSINESS_DOMAIN §6, owner can edit per member |
| 5 | Payment gateway selection (must support collection, refunds, payouts); HyperPay is only a candidate |
| 6 | Rejected registrations can resubmit without limit (assumption in use, PRD §16) |
| 7 | KPI targets |
| 8 | Platform domain, production hosting, store accounts and signing, merchant Firebase registrations (root `CLAUDE.md` §6) |

---

## 15. Glossary

| Term | Meaning |
|---|---|
| Merchant | A business on the platform |
| Business | A salon, beauty clinic or tattoo studio |
| Audience | Who a business serves: men, women or both; clinics and tattoo studios always both |
| Branch | One location of a business, with its own contacts, hours, closures, services, prices and staff |
| Main branch | The first branch, or the one the owner sets as main |
| To close | An approved booking whose end has passed and is not yet completed or marked no-show |
| Design image | Optional picture per person in a tattoo booking |
| Owner / Manager / Employee | Merchant team roles (مالك / مسؤول / عامل) |
| Permission (feature flag) | Owner-granted access to a specific page/feature |
| Catalog | Admin-managed list of services, per business type and audience |
| Bride-only service | VIP service visible only for persons marked as bride |
| Bride-qualified staff | Staff allowed to serve brides |
| Exceptional closure | Specific date(s) when a branch is closed outside its weekly schedule |
| Offline | Business suspended by admin (hidden from customers, data retained), or branch taken offline by the owner or admin |
| Payout | Transfer from the platform to the business of collected online payments minus fees and refunds |
