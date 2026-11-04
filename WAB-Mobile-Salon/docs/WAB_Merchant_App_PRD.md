# WAB Wedding & Beauty — Merchant (Business) Mobile App PRD

> **Document type:** Product Requirements Document — Merchant app (mobile)
> **Audience:** AI coding agents and engineers implementing the merchant app.
> **Version:** 2.0 — 2026-11-04. Covers salons, beauty clinics and tattoo studios, branches, bookings made by the business, closing finished bookings and WhatsApp OTP.
> **Precedence:** PRD > BRD > Design Script > design files. Root `BUSINESS_DOMAIN.md` holds the data, enums, rules, state machine, permissions, jobs, settings and error codes; this PRD cites its sections. Wire format: the generated `WAB-Server/docs/api/openapi.merchant.json` (merchant contract 1.13.0, 106 operations).
> **Related documents:** Customer App PRD, Customer BRD, Merchant BRD, Admin BRD, Admin PRD, Backend PRD.

---

## 0. How to Read This Document

- **MUST** = mandatory, **SHOULD** = strongly recommended, **MAY** = optional.
- Every screen section contains: purpose, entry, required permission, layout, behavior, states, acceptance criteria.
- "Start"/"End" are layout-direction aware (Arabic RTL: Start = right). Never hardcode left/right.
- Undecided items are in **Section 16 – Open Items & Assumptions**. Implement the stated assumption and keep it easy to change.
- All strings MUST be localized (Arabic + English).
- **"Business"** = a salon, a beauty clinic or a tattoo studio. "Salon" is used only where a rule is really salon-only. API and field names stay as they are in the contract (`salon`, `salonId`, `SALON_PROFILE_MANAGE`…).
- **"Not built yet:"** marks a business rule the app does not follow today. The rule stands; the note says what is missing.

---

## 1. Product Overview

The **WAB Merchant app** is a separate mobile app (Android + iOS) used by **businesses of three types: salons (men, women or both), beauty clinics and tattoo studios** to:
- Register on the platform with their documents and get approved by admin.
- Build and maintain the public business profile seen by customers.
- Run one or more **branches** (up to `salon.maxBranches` = 20), each with its own location, contacts, hours, closures, services, prices and staff; manage the team and the business policies.
- **Receive booking requests in real time** (Uber/Careem-style) and approve/reject them.
- **Create bookings for customers** by mobile number, with or without a WAB account (M29).
- Operate bookings (calendar, completion, no-show, cancellation, staff reassignment) and **close finished bookings** (To close tab, reminders with actions).
- Read reviews, view statistics, track payments, refunds, payouts and subscription status.

Every piece of business data shown in the customer app originates here (see Customer App PRD).

---

## 2. Platform & Technical Constraints

### 2.1 Confirmed
- **Kotlin Multiplatform + Compose Multiplatform**, shared UI and business logic for Android and iOS. Platform code only via `expect/actual` (push, overlays, location/map picker, image/video/document pickers). The merchant app has no payment screens.
- **Local persistence:** DataStore.
- **OTP (BUSINESS_DOMAIN §3.1a):** the server generates the code and **ARQAM OTP delivers it over WhatsApp** (AR/EN template by `Accept-Language`). `POST /merchant/v1/auth/otp/request` answers `otpLength` (6 today), `resendAfterSeconds` (60) and `expiresInSeconds`; `POST /merchant/v1/auth/otp/verify` answers a short-lived single-use `otpToken`, used by login, registration, change phone and bank details. No Firebase Phone Auth, no SMS fallback, no direct Meta Cloud API. Dev/QA: `OTP_PROVIDER=fake` + fixed code.
- **Push:** Firebase Cloud Messaging (Android + iOS), one Firebase project per environment; high-priority data messages for booking requests. Firebase is used for push, analytics and crash reporting only. The merchant Firebase registrations are an open owner input (Section 16).
- **Real-time:** Socket.IO client (namespace `/merchant`) while the app is in the foreground; FCM in background.
- **Analytics and crashes:** screens and actions go to Firebase Analytics, crashes to Crashlytics. The server records its own events in MongoDB (`serverEvents`) and the admin panel reads those. The app never sends analytics to the backend.
- **Internal abstraction (mandatory):** push, analytics and crash reporting behind interfaces in the app's own code (single place to swap providers). OTP goes through the backend only.
- **Files:** presigned upload URLs from the backend, device compression, direct upload to **Cloudflare R2** (`STORAGE_PROVIDER=cloudflare-r2`, public + private bucket; AWS S3 + CDN is only a fallback), confirm, public URL. Private files (license documents, tattoo design images) through short-lived signed URLs. Single-image fields are file slots (same key, `key?v=n`).
- **Backend context:** Node.js + TypeScript + Express + Mongoose, MongoDB, Redis; merchant endpoints under `/merchant/v1`.
- **Money:** JOD only, tax-inclusive, integer fils on the wire. Designed Phase 1: the platform collects (pay on arrival, deposit or full online), refunds automatically and pays businesses manually; Phase 2 = split payments. **Status today: online payment is PAUSED** (`PAYMENT_PROVIDER=disabled` in production, `fake` in dev; no gateway chosen). Customers pay on arrival; deposit, online-payment and refund texts in this PRD describe the designed behaviour and apply once a gateway is live.
- The merchant app does not process payments (no `wab-payments` dependency).
- Separate app from the customer app (separate package/bundle IDs, separate store listings).

### 2.2 Tech Stack
Kotlin Multiplatform, Compose Multiplatform, Ktor, Koin, DataStore, Socket.IO client. Module map: `WAB-Mobile-Salon/CLAUDE.md` §2; versions: `gradle/libs.versions.toml`.

### 2.3 Environments
Dev and prod, separate base URLs (`DEV_/PROD_API_BASE_URL`, iOS xcconfig). The hosted dev API runs on Render (`wab-server-dev.onrender.com`). Dev builds use `DATA_SOURCE=remote`; `mock` serves contract fixtures. Production hosting and the platform domain are open owner decisions (Section 16).

---

## 3. Global Rules

Identical to the Customer App PRD (Section 3) unless stated otherwise:
- Arabic default (RTL) + English; numerals follow language; **12-hour time** (ص / م); **JOD**.
- Theme Light / Dark / System (default System).
- **Shimmer** loading shaped like content; **pagination 10** with infinite scroll; **search debounce 500 ms**.
- **Pull-to-refresh** on all screens except forms (Login, OTP, Registration, all edit/create forms).
- Error states: no internet, server error, empty — each with Retry where applicable.
- Server-driven: countries + phone regex, cities/areas, services catalog, app version policy, maintenance, support contacts, legal content, OTP length and resend timing.
- Every request sends the current language.
- **Permission-driven UI:** any screen, tab, menu item, button or notification the current user has no permission for MUST be **hidden** (not disabled). Permissions are re-fetched on app start, on pull-to-refresh of Home, and whenever the backend signals a change (push data message `PERMISSIONS_UPDATED`).
- **Offline business banner:** when the business is suspended by admin (Offline), a persistent banner appears on all screens: "Your business is currently offline and hidden from customers. Contact WAB to reactivate." with a Contact action.
- **Branch filter chips:** the owner of a business with more than one branch sees chips "All branches" + one per branch (closed branches marked) on M08, M11, M17, M20, M21 and M22, and the same chips without "All branches" on M15 and M16, which edit one branch. It is one choice shared across the app. Managers and employees never see the chips: the server scopes their calls to their branch.
- **Words by type:** forms and notes follow the business type (Salon / Clinic / Studio name; "Men's salon", "Beauty clinic · men and women", "Tattoo studio · men and women"). Not built yet: several texts still say "salon" for every type (bottom tab, hub title, offline banner, M05, M06, M20, M23).
- **Destructive actions** (reject, cancel, deactivate, delete) require a confirmation dialog; actions affecting customers require a **reason**.
- **Real-time:** Home (pending requests, today), Bookings list, Booking details, Calendar and the notifications badge MUST update instantly via Socket.IO (branch and member rooms, BUSINESS_DOMAIN §7) and refresh on FCM / app foreground.
- **Uploads:** presigned URL → compress on device → direct upload → confirm; progress + retry.

---

## 4. Accounts, Business States & Launch Flow

### 4.1 Concepts
- **Business account:** one business = one account, created by its **Owner**. `businessType` (`SALON | CLINIC | TATTOO`) is chosen at registration and never changes. `audience` (`MALE | FEMALE | BOTH`): a salon chooses it; clinics and tattoo studios are always `BOTH`. The owner may widen a men's or women's salon to `BOTH` instantly (M30); narrowing happens only by admin with a reason (BUSINESS_DOMAIN §5.19).
- **Branch:** a business has one or more branches (limit `salon.maxBranches` = 20); the first is the main branch. **Per branch:** location, contacts, hours, closures, services and prices, staff (one branch per member). **Business-wide:** name, audience, logo, cover, gallery, description, policy, subscription, payouts (one bank account), rating, Recommended placement. New branches need no admin approval (BUSINESS_DOMAIN §5.16).
- **Member:** any person with access to the business in the merchant app: Owner, Manager (مسؤول), Employee (عامل). Each member has a **mandatory mobile number** used for OTP login. Managers and employees belong to exactly one branch; the owner covers all branches.
- **Service provider:** a member flagged `providesServices = true` is shown to customers as **Staff** (with profile, skills, schedule, reviews). A Manager may or may not provide services.
- A phone number can belong to **only one business** as a member (assumption).
- Being a member is independent of the customer app (a member using the customer app is a regular customer there).

### 4.2 Lifecycle States
**Business:**
| State | Meaning | Customer visibility |
|---|---|---|
| `APPLICATION_PENDING` | Registration submitted, waiting for admin review | Hidden |
| `APPLICATION_REJECTED` | Admin rejected (reason given); owner can fix and resubmit | Hidden |
| `APPROVED_INCOMPLETE` | Approved but profile not complete | Hidden |
| `LIVE` | Approved + profile complete + not suspended | **Visible**; bookable through its bookable branches |
| `OFFLINE` | Suspended by admin only (e.g., unpaid subscription). Data kept | Hidden, no new bookings; existing approved bookings remain |

**Branch:**
| Status | Meaning |
|---|---|
| `ACTIVE` | Open; bookable once the business is customer-visible and the branch is complete |
| `OFFLINE` | Taken offline by the owner or admin; no new bookings there, upcoming bookings kept, other branches stay bookable; back to `ACTIVE` by the same roles |
| `CLOSED` | History kept, nothing hard-deleted, gone for customers. Refused while it has upcoming bookings (`BRANCH_HAS_UPCOMING_BOOKINGS`); the last open branch cannot close (`LAST_BRANCH`); the main branch needs a new main first |

**Completeness has two levels (BUSINESS_DOMAIN §5.2):**
- **Business `missing[]`:** `COVER`, `PROFILE_IMAGE`, `NAME`, `DESCRIPTION`, `POLICY` (cancellation window and at least one payment option), `BRANCH` (at least one branch that is `ACTIVE` and complete).
- **Branch `missing[]`:** `LOCATION`, `PHONE`, `WORKING_HOURS` (at least one open day), `SERVICE` (at least one active service of the branch), `STAFF` (at least one active service provider of the branch with at least one service and one working day).
- While no branch is bookable, the business `missing[]` names the **main branch's** gaps, so a single-branch business reads one list; `BRANCH` appears only when none applies (no main branch yet, or it is complete but offline).
- **Customer-visible business** = `LIVE`, complete, at least one bookable branch. **Bookable branch** = business customer-visible, branch `ACTIVE` and complete.
- A `LIVE` business or bookable branch that becomes incomplete stays visible but new bookings are refused (`SALON_NOT_BOOKABLE` / `BRANCH_NOT_BOOKABLE`) and the owner is notified.

> During `APPLICATION_PENDING`, the owner MAY already prepare the profile (all setup screens accessible), so the business can go live immediately after approval.

### 4.3 Launch Flow
```
App start
 ├─ Version policy / maintenance check (blocking screens if needed)
 ├─ No token → Welcome / Login (M02)
 └─ Token →
     ├─ Member deactivated → message "Your access was removed by the owner" → logout
     ├─ Business APPLICATION_PENDING / REJECTED → Application Status (M05) (+ setup access for owner)
     ├─ Business APPROVED_INCOMPLETE → Setup Checklist (M06)
     └─ LIVE / OFFLINE → Home (M07)
```

### 4.4 Login Logic (phone + OTP)
- Phone found as an **active member** → OTP → app.
- Phone **not found** → dialog: "This number is not linked to any business." with actions **Register a new business** (→ M04 after OTP) and **Cancel**. (Team members must ask their owner to add their number.)
- Member deactivated → message as above.
- OTP rules (BUSINESS_DOMAIN §3.1a): WhatsApp code generated by the server and delivered by ARQAM OTP, dynamic code length (`otpLength`, 6 today), backend pre-check of limits, resend after 60 s, 5 requests / 5 min → 15 min block, 5 wrong codes → 15 min block, backend verifies the code and answers a single-use `otpToken`. A failed sign-in after verify needs a new code. Admin sign-in is separate (email + password + email OTP) and is not part of this app.

### 4.5 Entry From the Customer App
"Register your business with us" in the customer app opens the merchant app via deep link (`<merchant-domain>/register`) if installed, otherwise the corresponding app store page.

---

## 5. Local Storage (DataStore)

| Key | Description |
|---|---|
| `access_token`, `refresh_token` | Auth tokens (secure storage where possible) |
| `member_id`, `salon_id` | Current identity; the member's `branchId` comes with the profile (none for the owner). The owner's branch chip choice is kept in memory only |
| `member_role` | OWNER / MANAGER / EMPLOYEE |
| `permissions` | Cached permission keys (refreshed from server) |
| `salon_state` | Cached business lifecycle state |
| `language`, `theme` | Preferences |
| `overlay_permission_prompted` | Android "display over other apps" prompt shown |
| `push_enabled` | Push preference |

---

## 6. Roles & Permissions

Source: BUSINESS_DOMAIN §6. Enforced by the server on REST, socket rooms and notification recipients.

### 6.1 Rules
- The **Owner has all permissions** on every branch and is the **only** member who can manage the team, roles and permissions, bank details, the deletion request and branches. These owner-only capabilities are **not grantable**. The owner also sets the business-wide profile (name, description, logo, cover), policy, finance and subscription.
- For Manager and Employee, the owner grants permissions **per feature** (toggle list). Role is a label + default template; the actual access is the permission set.
- **Branch scope:** every Manager and Employee belongs to one branch and **each permission applies to that branch only** (its bookings, calendar, staff, hours, closures, services, branch location and contacts, reviews of its staff and branch, statistics). Another branch answers `BRANCH_SCOPE_DENIED`, an empty list or 404.
- **Branch members cannot get** `FINANCE_VIEW`, `SUBSCRIPTION_VIEW` or `POLICIES_MANAGE`: M18 does not offer them and the app ignores them if sent. `SALON_PROFILE_MANAGE` covers the branch's location and contacts only; `GALLERY_MANAGE` stays business-wide. A branch can have one or more managers.
- Hidden-not-disabled rule (Section 3).
- Notifications are delivered only to the owner and to members of the related branch holding the related permission.

### 6.2 Permission Keys (16 grantable)
| Key | Grants |
|---|---|
| `DASHBOARD_VIEW` | Home dashboard |
| `BOOKINGS_VIEW_ALL` | See all bookings + calendar for all staff of the branch |
| `BOOKINGS_VIEW_OWN` | See only bookings assigned to me + my calendar |
| `BOOKINGS_RESPOND` | Approve / reject pending bookings; receive real-time request alerts |
| `BOOKINGS_OPERATE` | Mark completed & paid, mark no-show, cancel approved bookings, reassign staff (assigned staff may complete / no-show their own booking without this key) |
| `BOOKINGS_CREATE` | Create a booking for a customer, with or without an account (M29) |
| `SALON_PROFILE_MANAGE` | Owner: profile, images, location, contacts. Branch member: the branch's location and contacts |
| `GALLERY_MANAGE` | Manage portfolio (business-wide) |
| `WORKING_HOURS_MANAGE` | Weekly schedule + exceptional closures of the branch |
| `SERVICES_MANAGE` | Branch services and catalog requests |
| `STAFF_MANAGE` | Service-provider profiles, skills, schedules, leaves (not access/permissions) |
| `POLICIES_MANAGE` | Payment options, deposit, cancellation, refund, no-show policy (never for branch members) |
| `REVIEWS_VIEW` | Business and staff reviews |
| `STATISTICS_VIEW` | Statistics |
| `FINANCE_VIEW` | Payments, refunds, payouts (never for branch members) |
| `SUBSCRIPTION_VIEW` | Subscription & account status (never for branch members) |
| **Owner-only (non-grantable):** `TEAM_MANAGE` (add/remove members, roles, permissions), `PAYOUT_DETAILS_MANAGE` (bank details), `SALON_DELETE_REQUEST`, `BRANCHES_MANAGE` (create, edit, close, take offline, set main) |

### 6.3 Default Templates (editable by owner)
- **Manager:** all 13 keys a branch member can hold.
- **Employee:** `BOOKINGS_VIEW_OWN`, `REVIEWS_VIEW`.

---

## 7. Domain Models (merchant-side)

> Summary only. Fields and enums: BUSINESS_DOMAIN §2–§3 and the merchant contract (the contract wins on names).

**Salon (the business)**: `id`, `name`, `businessType` (SALON/CLINIC/TATTOO), `audience` (MALE/FEMALE/BOTH), `state`, `coverUrl`, `profileUrl`, `description`, `location`, `locationText`, `cityId`, `areaId`, `phone`, `whatsapp?` (address and contacts mirror the main branch), `completeness` (`missing[]`), `rating`. Application: `documentKeys[]`, `medicalLicenseKeys[]` (clinics), `rejectionReason?`, `resubmissionCount`.

**Branch**: `id`, `name {ar, en}`, `isMain`, `status` (ACTIVE/OFFLINE/CLOSED), `location`, `locationText`, `cityId`, `areaId`, `phone`, `whatsapp?`, `weeklySchedule[]`, `offline` (reason), `completeness` (`missing[]`).

**Member**: `id`, `firstName`, `lastName`, `phone` (country code + number, mandatory), `photoUrl?`, `role` (OWNER/MANAGER/EMPLOYEE), `branchId` (none for the owner), `permissions[]`, `isActive`, `providesServices`, `staffProfile?`.

**StaffProfile** (when providesServices): `bio`, `yearsOfExperience`, `serviceIds[]` (services of the member's branch), `brideQualified` (FEMALE or BOTH salons only), `workingDays[]` (subset of the branch's working days; hours = branch hours of that day unless `customHours` set), `leaves[]` (date ranges with optional note), `rating`, `reviewsCount`, `customersCount`.

**WeeklySchedule** (per branch): 7 entries `{dayOfWeek, isDayOff, openTime, closeTime}`.

**ExceptionalClosure** (per branch): `id`, `fromDate`, `toDate`, `reason` (ar/en free text).

**CatalogService** (admin-managed): `id`, `name`, `description`, `imageUrl`, `businessType`, `audience`.

**SalonService** (per branch): `id`, `branchId`, `catalogServiceId`, `price` (JOD, tax-inclusive, integer fils on the wire), `durationMinutes` (multiple of 5), `brideOnly` (FEMALE or BOTH salons only), `extraDescription?`, `media[]`, `isActive`.

**CatalogRequest**: `id`, `name`, `description`, `imageUrl?`, `status` (PENDING/APPROVED/REJECTED), `adminNote?`.

**SalonPolicy** (business-wide): `cancellationWindowHours` (required), `paymentOptions[]` (PAY_ON_ARRIVAL, DEPOSIT, FULL_ONLINE; ≥1), `depositPercentage` (1–100, required if DEPOSIT), `depositRefundableOnCustomerCancel`, `fullPaymentRefundOnCustomerCancel` (FULL / MINUS_DEPOSIT), `noShowDeposit` (KEEP/REFUND), `noShowFullPayment` (KEEP/REFUND_MINUS_DEPOSIT/REFUND_FULL), `policyNotes?`.

**Booking**: same model as Customer PRD (reference number, status, payment status, refund status, persons with services/staff/times/bride flag, totals, paid/remaining, reasons, policy snapshot) + `businessType`, `salonAudience`, `branch`, `customer` (name, phone, `id` empty when there is no account), `source` (CUSTOMER_APP/MERCHANT), `createdBy` (member, for MERCHANT), person `referenceImageUrl` (tattoo design, signed URL), `statusHistory[]` (status, actor, time, reason), `requestedAt`, `respondBy` (appointment start + 60 min auto-cancel), `actions[]` (APPROVE, REJECT, CANCEL, REASSIGN, COMPLETE, NO_SHOW: what this member may do now).

**Review**: as Customer PRD + `target` (SALON/STAFF), `staffId?`, `branchName`.

**Transaction**: `id`, `bookingId`, `branchId`, `referenceNumber`, `type` (DEPOSIT/FULL), `amount`, `gatewayFee`, `status`, `createdAt`.
**Refund**: `id`, `bookingId`, `branchId`, `amount`, `status` (PENDING/REFUNDED/FAILED), `reason`, `createdAt`, `completedAt?`.
**Payout** (one per business, all branches): `id`, `periodFrom`, `periodTo`, `grossAmount`, `gatewayFees`, `refundsDeducted`, `netAmount`, `status` (PENDING/TRANSFERRED), `transferredAt?`, `transferReference?`.
**Balance**: `pendingAmount`, `lastPayout`.
**PayoutDetails** (one bank account per business): `bankName`, `accountHolderName`, `iban`.

**Subscription** (one per business, all branches): `status` (TRIAL/ACTIVE/EXPIRED), `trialEndsAt`, `currentPeriodEnd?`, `daysRemaining`, `endingSoon`.

**MerchantNotification**: `id`, `type`, `title`, `body`, `createdAt`, `isRead`, `bookingId?`.

---

## 8. Navigation

### 8.1 Bottom Navigation (items shown only if permitted)
1. **Home** (Dashboard) — `DASHBOARD_VIEW`
2. **Bookings** — `BOOKINGS_VIEW_ALL` or `BOOKINGS_VIEW_OWN`
3. **Calendar** — `BOOKINGS_VIEW_ALL` or `BOOKINGS_VIEW_OWN`
4. **Salon** (the business management hub, M12) — visible if the user has any management permission or is the owner
5. **More** — always visible

If the user lacks `DASHBOARD_VIEW`, the first visible tab is the default.

### 8.2 Screens Index
| ID | Screen |
|---|---|
| M01 | Splash / version & maintenance check |
| M02 | Welcome & Login |
| M03 | OTP Verification |
| M04 | Business Registration |
| M05 | Application Status |
| M06 | Setup Checklist |
| M07 | Home (Dashboard) |
| M08 | Bookings List |
| M09 | Booking Details & Actions |
| M10 | Real-time Booking Request (sheet / overlay / notification) |
| M11 | Calendar |
| M12 | Business Hub |
| M13 | Business Profile Edit |
| M14 | Gallery Management |
| M15 | Working Hours & Exceptional Closures |
| M16 | Services (list, add from catalog, edit, catalog requests) |
| M17 | Team & Staff (list, member form, staff profile) |
| M18 | Permissions Editor (owner only) |
| M19 | Policies |
| M20 | Reviews |
| M21 | Statistics |
| M22 | Finance (transactions, refunds, payouts, bank details) |
| M23 | Subscription & Account Status |
| M24 | Notifications |
| M25 | More (my account, settings, support, legal, logout) |
| M26 | Force Update / Maintenance |
| M27 | Branches (list and actions, owner only) |
| M28 | Branch Form (add / edit, owner only) |
| M29 | New Booking for a Customer |
| M30 | Audience Change (owner, from M13) |
| M31 | Content Page (terms, privacy, about) |
| M32 | FAQ |

M21, M22 and M23 are reachable in the app today: each is a hub tile in M12, shown by its permission; M21 also opens from the Home quick stats, M23 from the Home subscription warning, and M22 and M23 from notifications.

---

## 9. Screen Specifications

### M01 — Splash
Checks version policy and maintenance (same as customer app), then follows the launch flow (4.3).

### M02 — Welcome & Login
**Layout:** background + WAB merchant logo; language & theme icons at top; headline ("Grow your business with WAB"); card with country code picker (server list, default +962) + phone field (country regex); **Continue** button; "New business? **Register your business**" link; legal links (Privacy, Terms, Contact).
**Behavior:** Continue → server checks the phone → OTP (M03) or "not linked" dialog (4.4). Register link → phone + OTP → M04.
**States:** invalid phone, loading, blocked/deactivated messages.

### M03 — OTP Verification
Same component, flow and rules as the customer app (WhatsApp code from the server through ARQAM OTP, `otpLength` boxes, 60 s resend, limits, code lifetime + expiry popup; `OTP_DELIVERY_FAILED` when the number is not on WhatsApp). Modes: LOGIN, REGISTER, CHANGE_PHONE, BANK_DETAILS.

### M04 — Business Registration (owner)
**Fields (all required):**
1. **What are you registering?** Cards: **Salon** / **Beauty clinic** / **Tattoo studio** (`businessType`). Warning: the type cannot be changed later; a men's or women's salon can later choose to serve both.
2. **Who does the salon serve?** Salons only: **Men** / **Women** / **Both** (`audience`). Clinics and tattoo studios are not asked: a note says they serve both.
3. Business name (label and hint follow the type: Salon / Clinic / Studio name).
4. Owner first name, last name.
5. City (dropdown, server) → Area (dropdown, disabled until city).
6. **License documents:** upload 1–5 files (image from camera/gallery or PDF), proving the business exists and is licensed. Max 10 MB each. Show thumbnails, remove action. This is the trade license for every type; a tattoo studio needs nothing else.
7. **Medical license** (clinics only): upload 1–5 files, same limits (`MEDICAL_LICENSE`). Admin sees both before approval.
- A **Review your choices** card repeats type, audience and, for clinics, the medical license state.
- Agree to Terms checkbox (required; link → M31).
- **Submit** disabled until valid; upload progress per file.
**On submit:** `POST /salon/applications` with the `otpToken`: business created in `APPLICATION_PENDING`, owner member created → M05. A rejected `otpToken` (it lives 10 minutes) sends the user back to login.

### M05 — Application Status
- **Pending:** illustration, "Your application is under review", submitted date. CTA **Prepare your profile** → M06 (owner). Pull-to-refresh.
- **Rejected:** reason from admin, resubmission count, **Edit & resubmit** (opens M04 prefilled; the type stays locked; files on record stay unless new ones are added; resubmission returns to Pending).
- **Approved:** transitions automatically to M06 (if incomplete) or M07.
- Push notification on approval/rejection.

### M06 — Setup Checklist
The checklist has two levels (Section 4.2): what the business needs and what a branch needs.
- Progress indicator (e.g., 4/6 completed).
- **Business items** (each → its screen, with ✓ when complete): Profile & images (M13), Policies (M19). **Branch items**, from the main branch's gaps while no branch is bookable: Location & contact (M13), Working hours (M15), Services (M16), Staff (M17). Optional: Gallery (M14), Team access (M17).
- A later branch is completed from M27/M28 and needs no admin approval; the business stays live meanwhile.
- When all required items are complete and the business is approved: success state "Your business is now live!" → Home.
- Accessible later from Home while incomplete.
- Not built yet: the checklist ignores the `BRANCH` item (main branch complete but offline, or no main branch), so it can look finished while the business is not bookable; the items are one flat list without the two-level grouping.

### M07 — Home (Dashboard)
**Layout (top → bottom):**
1. Header: business name + profile image (Start); notifications bell with unread badge 1–99/"99+" (End).
2. Status strip: business state (Live / Offline / Incomplete → link to checklist), subscription warning if trial/subscription ends in ≤7 days.
3. **Pending requests card** (if `BOOKINGS_RESPOND`): count + list of the newest pending requests (bride badge, time since request, appointment time). Tap → M09; "View all" → M08 (Pending tab).
4. **Today at a glance:** today's approved bookings count, completed, upcoming next booking (time, customer, staff).
5. **Today's timeline:** next bookings ordered by time (limited to own bookings for `BOOKINGS_VIEW_OWN`).
6. **Quick stats** (if `STATISTICS_VIEW`): this week's bookings, revenue (online + marked paid), rating.
**Scope:** one `GET /dashboard`: the owner sees all branches together, a branch member their branch; there are no branch chips here. Finished bookings to close are handled in M08 (To close), not on Home.
**States:** unified shimmer, error, pull-to-refresh (also refreshes permissions).

### M08 — Bookings List
**Layout:** title + **New booking** button (only with `BOOKINGS_CREATE`, → M29); branch chips (owner with several branches); sticky search (customer name, phone, reference; debounced) + filter icon; tabs: **Pending** | **Upcoming** | **Today** | **To close** | **Past**; active filter chips.
**To close** (`tab=TO_CLOSE`, BUSINESS_DOMAIN §5.21): APPROVED bookings whose end has passed, oldest first, permission-scoped like the rest of the list; own empty state.
**Filter sheet:** date range, staff (multi), status (multi), bride only (toggle), payment status. The bride toggle is for FEMALE and BOTH salons. Not built yet: the toggle also shows at men's salons, clinics and tattoo studios.
**Booking card:** reference number, customer name, appointment date/time, persons count, staff name(s), status badge, payment badge, **bride badge**, branch name (when the owner views several branches), "Created by the business" on `source = MERCHANT`; for Pending: time since request and auto-cancel countdown.
**Scope:** branch members see their branch only. `BOOKINGS_VIEW_OWN` users see only bookings where they are the assigned staff for at least one person.
**States:** shimmer, empty per tab, error, pagination, pull-to-refresh.

### M09 — Booking Details & Actions
**Layout:**
1. Header: reference number (copy), status, payment status, refund status, bride badge.
2. Branch name. Source: "Created by the business · <member>" when `source = MERCHANT`.
3. Customer: name, phone (**Call** button), WhatsApp button; "No WAB account" when the booking has no linked account (the phone is always there).
4. Persons: for each — name, bride badge, services (price, duration), assigned staff, start–end time; tattoo studios: **Design image** when attached (private, short-lived signed URL).
5. Payment: method, total, paid online (deposit/full), paid at the business, remaining to collect at the business, refund info.
6. Policy snapshot.
7. Status history timeline (status, actor, time, reason).
8. **Sticky action bar**: shows the actions the server sends in `actions[]`, already filtered by status, time and permission:

| Status | Actions (who) |
|---|---|
| PENDING | **Approve**, **Reject** (reason required) — `BOOKINGS_RESPOND` |
| APPROVED, before start time | **Cancel** (reason required; customer gets full refund), **Reassign staff** — `BOOKINGS_OPERATE` |
| APPROVED, at/after start time (including To close) | **Mark completed & paid**, **Mark no-show** — `BOOKINGS_OPERATE` **or the assigned staff of the booking**; **Reassign staff** — `BOOKINGS_OPERATE` |
| COMPLETED / NO_SHOW / REJECTED / CANCELLED_* / AUTO_CANCELLED | Read-only |

**Action rules:**
- **Approve:** server re-validates that slots/staff are still valid; on conflict show error and refresh.
- **Reject:** reason picker (Fully booked, Staff unavailable, Service unavailable, Other + free text; the customer sees the reason) → full refund automatically if paid.
- **Cancel approved:** reason picker (Business emergency `SALON_EMERGENCY`, Staff unavailable, Exceptional closure, Other + free text); dialog states "The customer will receive a full refund."
- **Mark completed & paid:** only at or after the start (`TOO_EARLY_TO_COMPLETE` before it); confirmation shows remaining amount to collect ("Confirm you collected X JOD"); sets status COMPLETED and payment status PAID.
- **Mark no-show:** only at or after the start; confirmation shows policy outcome (deposit kept/refunded etc.).
- **Reassign staff:** per person, list of eligible staff of the booking's branch (`GET /bookings/{id}/eligible-staff`: skills, bride-qualified, free for the full duration, on duty). Customer and old/new staff are notified.
- Concurrency: if another member already acted, show "This booking was already {action} by {member}" and refresh (`ALREADY_HANDLED`).

### M10 — Real-time Booking Request
**Trigger:** new PENDING booking from the customer app → Socket.IO event `booking.requested` (room `branch:{id}:respond`, app open) **and** FCM high-priority data message (background/closed) to the owner and the active members **of the booking's branch** with `BOOKINGS_RESPOND`. The client de-duplicates by booking ID. Bookings made by the business (M29) start APPROVED and raise no request.

**In-app (any screen):** a modal bottom sheet over the current screen with a distinct sound/vibration:
- Title "New booking request" (+ **BRIDE** badge when applicable).
- Customer name, persons count, services summary, staff, date & time, total and payment method, time since request.
- The branch of the request.
- Buttons: **Accept**, **Reject** (opens reason picker), **View details** (→ M09).
- Multiple requests are queued (sheet shows "1 of 3").
- If another member handles it first, the sheet updates to "Handled by {member}" and dismisses.

**Outside the app — Android:**
- Request **"Display over other apps"** permission during onboarding / first login with an explanatory screen (can be enabled later from More → Settings).
- With permission: show a full-screen/overlay request card (same content, Accept / Reject / Open) over other apps, with alert sound; also post a high-priority notification (full-screen intent when the device is locked).
- Without permission: high-priority heads-up notification with **Accept** and **Reject** actions.

**Outside the app — iOS:**
- Overlays are not allowed. Send a **time-sensitive** notification with a custom sound and actionable category: **Accept** (executes in background) and **Reject** (opens the app to select a reason).
- Opening the app shows the in-app sheet for unanswered requests.

**Accept from notification/overlay:** performs the approval via API; on failure shows an error notification and the request remains pending.

**Close pushes (BUSINESS_DOMAIN §5.21):** `booking.close_reminder` and `booking.close_overdue` carry **Completed** and **No-show** actions.
- Android: a data message; the app draws a notification on the channel "Bookings to close" with both actions; tap → M09.
- iOS: a time-sensitive alert with the `BOOKING_CLOSE` category; the actions answer in the background.
- The action reads the booking's `actions[]` first: not allowed → open M09; already final, `ALREADY_HANDLED` or `INVALID_TRANSITION` → "This booking is already closed"; another failure → "Could not update the booking. Tap to open it." It never retries blindly. The outcome replaces the notification.
- In the foreground the usual in-app banner shows.

### M11 — Calendar
- Views: **Day** (columns per staff member, time grid at 15-min resolution within working hours) and **Week** (per day list or compact grid).
- Booking blocks colored by status (pending/approved/completed/no-show), bride icon; tap → M09.
- Non-working hours, closures and staff leaves shaded.
- Branch chips (owner with several branches: the calendar narrows to that branch's staff); staff filter; branch members see their branch; `BOOKINGS_VIEW_OWN` users see only their own column.
- Date picker, "Today" shortcut, swipe to change day/week.
- Read-only: bookings for customers are created from M08 → M29; there is no time blocking.

### M12 — Business Hub
Business name and type label ("Men's salon", "Beauty clinic · men and women", "Tattoo studio · men and women"…). Grid/list of management entries shown per permission: Profile, Gallery, Working Hours, Services, Team & Staff, Branches (owner only), Policies, Reviews, Statistics, Finance, Subscription. Shows completeness warnings on items missing for LIVE. Branch members get no Policies, Finance, Subscription or Branches tile.

### M13 — Business Profile Edit (`SALON_PROFILE_MANAGE`)
**Business-wide (owner only):**
- Cover image (upload/replace, crop 16:9), profile image (upload/replace, crop 1:1).
- Business name (editable; assumption: no admin approval needed), description (multiline, max 1000 chars).
- Business type and audience read-only; the owner of a men's or women's salon also gets **Serve both men and women** (M30).

**Branch-level (location and contacts):**
- **Location:** map picker with draggable pin + "use my current location"; location text (auto-filled from reverse geocoding, editable); city/area dropdowns.
- Phone (required), WhatsApp number (optional).
- The owner edits the **main branch** here (the same values are mirrored on the business); other branches are edited in M28.
- A branch member edits **their own branch's** address and contacts only; the server refuses business-wide fields from them (`OWNER_REQUIRED`).
- Not built yet: M13 is not branch-aware: a branch member still sees the business-wide fields and the business-level address.

**Preview as customer** button (renders the customer business details layout). Save with validation; unsaved-changes guard on back.

### M14 — Gallery (`GALLERY_MANAGE`)
Business-wide, for owner and branch members alike.
- Grid of images/videos; add from camera/gallery (multi-select); videos max 60 s / 50 MB (assumption); images max 10 MB.
- Upload progress per item, retry on failure.
- Long-press to reorder (drag), select mode to delete (confirmation).
- Empty state with "Add your work" CTA.

### M15 — Working Hours & Exceptional Closures (`WORKING_HOURS_MANAGE`)
**Per branch.** The owner picks the branch with the chips (main branch by default); a branch member edits their own branch.
**Weekly schedule:** 7 rows (Saturday → Friday): toggle working/day off, open time, close time (15-min steps, close > open). "Copy to all days" helper.
**Exceptional closures:** list (upcoming first, past collapsed); add: date range + reason; edit/delete future closures.
**Conflict handling (schedule change, closure):**
- Before saving, the server returns affected **upcoming PENDING and APPROVED bookings** of that branch.
- Dialog lists them with two options: **Cancel affected bookings** (PENDING → rejected, APPROVED → cancelled by the business; reason auto-filled with the closure reason; full refunds) or **Go back**.
- No conflicts → save directly.

### M16 — Services (`SERVICES_MANAGE`)
**Per branch:** each branch has its own services and prices. The owner picks the branch with the chips (main branch by default); a branch member manages their own branch.
**List:** branch services (image, name, price, duration, bride-only badge, active toggle). Search. Empty state CTA "Add services".
**Add from catalog:** searchable, paginated catalog list **of the business's own type that fits its audience** (`BUSINESS_TYPE_MISMATCH` otherwise; a service such as piercing exists for a type only when admin adds it to that type's catalog); services already added are marked. Select → service form.
**Service form:**
- Catalog name/image (read-only), price (JOD, > 0, 2 decimals, hint "including tax and fees"), duration (minutes, multiple of 5, ≥5), **Bride only** toggle (FEMALE and BOTH salons only; never clinics or tattoo studios), extra description (optional), media (images/videos, optional), active toggle.
- Price changes affect only new bookings (info note).
**Deactivate/remove service:** if upcoming bookings include it → warning listing them; bookings remain valid (service is only hidden for new bookings).
**Catalog requests:** "Can't find your service? Request it" → form (name, description, optional image) → list of requests with status (Pending/Approved/Rejected + admin note). Approved requests become available in the catalog of the business's type (the business is notified).
**Rule:** removing a service from all staff makes it unbookable; warn if an active service has no qualified staff.

### M17 — Team & Staff
**List (`TEAM_MANAGE` or `STAFF_MANAGE`):** members with photo, name, role badge, branch name, "Provides services" badge, active/inactive, on leave today. The owner filters with the branch chips; branch members see their branch.
- Owner sees "Add member".
- `STAFF_MANAGE` without `TEAM_MANAGE` can only edit staff profiles of service providers (not phone, role, permissions, activation).

**Member form (owner, `TEAM_MANAGE`):**
- First name, last name, **phone (mandatory, country code + regex, unique)**, photo, role (Manager / Employee), **branch** (exactly one), active toggle.
- Moving a member to another branch removes their services (they pick services of the new branch) and runs the conflict check; the form says so.
- **Provides services** toggle → shows Staff profile section.
- **Permissions** → M18 (prefilled from role template).
- On save: the member can log in with that phone. No invite message is sent; the owner tells them to install the app.

**Staff profile section (`STAFF_MANAGE`):**
- Bio, years of experience.
- **Services** (multi-select from the services of the member's branch).
- **Bride-qualified** toggle (FEMALE and BOTH salons only).
- **Working days** (subset of the branch's working days); optional custom hours per day within branch hours.
- **Leaves:** list + add date range (+ note).
- Read-only: rating, reviews count, customers served via app.

**Conflict handling:** deactivating a member, removing `providesServices`, removing a skill, adding a leave, reducing working days or moving branch → server returns affected upcoming bookings → dialog: **Reassign** (go to each booking), **Cancel affected bookings** (full refunds), or **Go back**.

**Owner member** cannot be deactivated or deleted from this screen and belongs to no single branch.

### M18 — Permissions Editor (owner only)
- Member header (name, role).
- "Apply role template" action.
- Toggle list grouped by area (Bookings, Salon, Staff, Finance, Insights) with a short description per permission (Section 6.2), including `BOOKINGS_CREATE`. `FINANCE_VIEW`, `SUBSCRIPTION_VIEW` and `POLICIES_MANAGE` are not offered for a branch member.
- Save → member's app updates permissions immediately (push `PERMISSIONS_UPDATED`).

### M19 — Policies (`POLICIES_MANAGE`)
Business-wide, all branches; the key cannot be granted to branch members, so this is the owner's screen.
- **Cancellation window** (required): number of hours before appointment (e.g., 1, 2, 3, 6, 12, 24, 48 or custom).
- **Payment options** (≥1): Pay on arrival / Deposit / Full online payment.
- **Deposit percentage** (1–100) — required when Deposit is enabled; live example "On a 50 JOD booking the deposit is 10 JOD".
- **Customer cancellation (within window):** deposit refundable? (yes/no); full payment → refund full / refund minus deposit.
- **No-show:** deposit → keep/refund; full payment → keep / refund minus deposit / refund full.
- Optional policy notes (shown to customers).
- **Customer preview** of the rules block exactly as shown in the customer booking summary.
- Info note: changes apply to new bookings only.
- Online payment is paused (Section 2.1): customers pay on arrival. Not built yet: M19 still lets the owner enable Deposit and Full online with no "coming soon" state.

### M20 — Reviews (`REVIEWS_VIEW`)
Reviews and rating are business-wide, covering all branches; each review is labelled with its branch. Published only after admin approval (BUSINESS_DOMAIN §5.11).
- Branch chips (owner with several branches). Branch members see the reviews of their branch and its staff.
- Tabs: **Business** | **Staff** (staff selector).
- Header: average rating + count + star distribution.
- Paginated list (published reviews only): user name, stars, comment, date, branch, staff.
- **Report** action per review → opens Contact WAB (WhatsApp/email) prefilled with review reference. No edit/delete.

### M21 — Statistics (`STATISTICS_VIEW`)
**Reachable** from the Statistics tile in M12 and the Home quick stats.
- Branch chips (owner: all branches or one). Branch members see their branch only.
- Period selector: Today / This week / This month / Custom range (limited length).
- KPIs: bookings (by status), approval rate, cancellation rate, no-show rate, average response time to requests, revenue (online collected + marked paid), bride bookings, profile views, new reviews, average rating.
- Charts: bookings per day, revenue per day.
- Rankings: top services, top staff (bookings, rating).

### M22 — Finance (`FINANCE_VIEW`)
**Reachable** from the Finance tile in M12 and from payout/refund notifications. Owner's screen: branch members cannot hold the key. While online payment is paused (Section 2.1) nothing is collected online, so there is little to show here.
- **Balance card:** pending payout amount, last payout (amount, date). One balance per business.
- Branch chips filter transactions and refunds (`branchId`); payouts are one per business, all branches.
- Tabs:
  1. **Transactions:** online payments (reference, date, type deposit/full, amount, gateway fee, net).
  2. **Refunds:** amount, booking, reason, status (Pending/Refunded/Failed), dates.
  3. **Payouts:** period, gross, fees, refunds deducted, net, status (Pending/Transferred), transfer date and reference.
- Filters by date range; pagination.
- **Bank details** (sub-screen, owner only, `PAYOUT_DETAILS_MANAGE`): one account per business: bank name, account holder, IBAN (format validation). Changing details requires a WhatsApp OTP to the owner's phone.
- Info: "Payments are collected by WAB. Gateway fees are deducted from your payouts. Payouts are transferred manually by WAB."

### M23 — Subscription & Account Status (`SUBSCRIPTION_VIEW`)
**Reachable** from the Subscription tile in M12, the Home subscription warning and subscription notifications. Owner's screen: branch members cannot hold the key.
- Business state (Live / Offline / Incomplete).
- Subscription (one per business, all branches; 3 months free from approval): Trial (days remaining, end date) / Active (period end) / Expired.
- Text: subscriptions are paid outside the app and recorded by admin; **Contact WAB** (WhatsApp/call/email from server).
- "Get featured in Recommended" → Contact WAB. Placement is bought per business, not per branch.

### M24 — Notifications
Same pattern as the customer app: list (paginated), title, body, relative time, read/unread (marked read when visible), filter (date range + search), tap → related screen (booking → M09; review → M20; application → M05; catalog request → M16; payout/refund → M22; subscription → M23). Pushes opened from the OS tray open the related screen directly (booking requests open M10/M09; close pushes open M09).

### M25 — More
- My account: photo, name, phone (change phone → WhatsApp OTP to new number), role.
- Settings: language, theme, push notifications toggle, **Android: display over other apps** status + enable shortcut, notification sound test.
- Support: Contact WAB (call / WhatsApp / email), FAQ.
- Notifications → M24. Legal: Terms, Privacy, About → M31. FAQ → M32.
- **Log out** (confirmation).
- **Delete my account:**
  - Non-owner member → removes their own access (confirmation) and logs out.
  - Owner → sends a **business deletion request** to admin with an optional note (confirmation explaining that admin will contact them; required by store policies).
- App version.

### M26 — Force Update / Maintenance
Same as the customer app (blocking screens / optional dialog).

### M27 — Branches (owner only, `BRANCHES_MANAGE`)
**Entry:** Branches tile in M12. Rules: BUSINESS_DOMAIN §5.16.
- Hint: only the owner manages branches; each branch has its own location, hours, services and staff.
- List, main first: name, **Main** badge, status (Active / Offline / Closed), **Incomplete** badge, offline reason. **Add branch** → M28; refused at `salon.maxBranches` = 20 (`BRANCH_LIMIT_REACHED`).
- Branch actions by status: **Edit** (→ M28), **Set as main** (not closed, not already main), **Take offline** (reason required), **Back online**, **Close branch** (confirmation).
- Closing is refused while the branch has upcoming bookings (`BRANCH_HAS_UPCOMING_BOOKINGS`): the app lists them to cancel or complete first. The last open branch cannot close (`LAST_BRANCH`); the main branch needs a new main first. History stays.
- Admin can also take a branch offline or back online; the owner is notified.
- Not built yet: the list shows only the Incomplete badge, not which items the branch still misses (branch `missing[]`, Section 4.2).

### M28 — Branch Form (owner only)
- Branch name in Arabic and English (e.g. "Mecca Street"); location on the map (pin required); address; city and area; phone number in international format; WhatsApp (optional).
- **Create branch** / **Save**. After creating: "Branch added. Add its hours, services and staff to make it bookable." (M15, M16, M17 with that branch chosen).
- No admin approval: the branch becomes bookable as soon as it is `ACTIVE` and complete, and the owner is notified.
- Customers then see it: one search card per business (nearest bookable branch), one Near you entry per bookable branch named "Business - Branch", and branch choice as booking step 1.

### M29 — New Booking for a Customer (`BOOKINGS_CREATE`)
**Entry:** **New booking** button on M08; hidden without the key; every business type. Rules: BUSINESS_DOMAIN §5.20. A booking for the member's own branch; the owner books the branch chosen in the chips (`BRANCH_REQUIRED` when none is chosen and the business has several).
**Customer:** mobile number with country picker → **Check** → `GET /customers/lookup`:
- **Registered:** first name shown, nothing else asked. The booking is linked to the account; the customer gets every status notification naming "Booked by <Business - Branch>", sees the booking in their app and can cancel it under the snapshotted policy.
- **Not registered:** name (≤ 50) and gender (Men / Women) required, stored as `customerContact`. **No account is created and no WhatsApp or SMS is sent.** When that number registers later, the booking is claimed automatically (history is not re-notified).
- **Blocked account:** the create call answers `ACCOUNT_BLOCKED`.
- A changed number needs a new check.

**Booking:** services (active, multi-select, with total duration and JOD total), staff ("Any available" or one provider), date (today to +90 days), start time (every 15 minutes; today only future times; Asia/Amman, sent as UTC). There is no merchant availability call: the server refuses closed or busy times (`SLOT_UNAVAILABLE`, `SLOT_TAKEN`). Tattoo studios: optional **design image** per person (`BOOKING_REFERENCE`).
**Rules:** same persons (main + ≤ `booking.maxCompanions`), audience (`GENDER_MISMATCH`), bride, services, staff eligibility (`STAFF_NOT_ELIGIBLE`) and slot rules as the customer app; created in one step, no draft, no OTP, no online payment. `paymentMethod = PAY_ON_ARRIVAL`, status starts **APPROVED**, `source = MERCHANT`, `createdBy` = member. Reminders and close jobs are scheduled. Reviews: only registered customers; a booking without an account gets no rating prompt until claimed.
**Success:** form closes, M09 opens with the new booking, banner "Booking created". Errors by code.
Not built yet: companions and the bride flag (the form books the main person only); the design image comes from the gallery only (no camera); the services list comes from the salon-level `GET /salon/services`, which is the main branch's list for the owner even when another branch is chosen.

### M30 — Audience Change (owner)
**Entry:** **Serve both men and women** button in M13, shown only to the owner of a SALON with audience MALE or FEMALE. Rules: BUSINESS_DOMAIN §5.19.
- Confirmation dialog: both men and women can book right away; only WAB can change this back. **Serve both** / **Not now**.
- `PATCH /salon/audience {audience: BOTH}`: instant, no approval; audit log, owner confirmation and admin alert `salon.audience_widened`.
- Narrowing BOTH → MALE/FEMALE only by admin with a reason. A clinic's or tattoo studio's audience and any `businessType` never change (`AUDIENCE_CHANGE_NOT_ALLOWED`).

### M31 — Content Page
Server content (`GET /content/pages/{slug}`): Terms, Privacy, About, opened from M02, M04 and M25. Shimmer, error + Retry.

### M32 — FAQ
Server list (`GET /content/faqs`), opened from M25. Shimmer, empty, error + Retry.

---

## 10. Booking Rules (merchant perspective)

Source: BUSINESS_DOMAIN §5.4–§5.7, §5.18–§5.21.

1. Every booking made in the customer app arrives as **PENDING** and holds its slot until decided. A booking made by the business (M29) starts **APPROVED**, pay on arrival.
2. Only the owner and members of the booking's branch with `BOOKINGS_RESPOND` can approve/reject; first action wins.
3. Rejection requires a reason; paid amounts are refunded fully by the platform.
4. Pending bookings are **auto-cancelled 60 minutes after the appointment start time** (`booking.autoCancelAfterStartMinutes`) with a mandatory full refund; the business is notified.
5. Approved bookings can be cancelled by the business before start time with a reason → **full refund**.
6. Completed & paid and No-show can be marked only **at or after** the appointment start time, by a member with `BOOKINGS_OPERATE` or the assigned staff of the booking.
7. Completion sets payment status to PAID (remaining collected at the business).
8. No-show outcome follows the booking's policy snapshot.
9. Staff reassignment only to eligible staff of the booking's branch (skills in all services, bride-qualified when needed, on duty, not on leave, free for the full duration); customer notified.
10. Policy and price changes never affect existing bookings.
11. No time blocking in the app. There is no rescheduling and no partial cancellation.
12. Offline business or offline branch: no new bookings; existing approved bookings remain fully operable.
13. Slots every 15 minutes, up to 90 days ahead; a customer plus up to 5 companions. At a men's or women's salon every person must match its audience (`GENDER_MISMATCH`); BOTH salons, clinics and tattoo studios take any mix.
14. Bride bookings, `brideOnly` services and `brideQualified` staff exist only at FEMALE or BOTH salons (`BRIDE_NOT_ALLOWED`).
15. A booking belongs to one branch (`branchId` + snapshot): its services, staff and slots come from that branch.
16. An APPROVED booking after its end is **to close**: reminders every `booking.closeReminderIntervalMinutes` (60) until it is COMPLETED or NO_SHOW, no cap; after `booking.closeOverdueAlertHours` (24) an overdue alert also reaches the admin, and reminders continue.
17. Tattoo: one optional design image per person (`BOOKING_REFERENCE`, private); any other type → `BUSINESS_TYPE_MISMATCH`; no age check.

---

## 11. Notifications (merchant)

Source: BUSINESS_DOMAIN §8. Recipients are the owner plus members **of the booking's branch** with the permission shown. In-app notification is always stored; push respects `pushEnabled`. Booking notifications name the place **"Business - Branch"** (branch name as booked, in the recipient's language) when the business has more than one non-closed branch, the main branch included; the business name alone for a single-branch business.

| Trigger (event) | Recipients | Channel |
|---|---|---|
| New booking request, bride highlighted (`booking.created`) | `BOOKINGS_RESPOND` | Real-time request (M10) + push |
| Booking still pending 30 min before appointment (`booking.pending_30m`) | `BOOKINGS_RESPOND` | Push |
| Booking auto-cancelled (`booking.auto_cancelled`) | `BOOKINGS_VIEW_ALL` + assigned staff | Push |
| Customer cancelled a booking (`booking.cancelled_by_customer`) | `BOOKINGS_VIEW_ALL` + assigned staff | Push |
| Booking reassigned (`booking.reassigned`) | Old and new staff | Push |
| Upcoming booking reminder, 1 hour before (`booking.reminder_1h`) | Assigned staff | Push |
| Finished booking not closed, every `booking.closeReminderIntervalMinutes` (`booking.close_reminder`) | Assigned staff + `BOOKINGS_OPERATE` | Push with **Completed / No-show** actions + socket |
| Still not closed after `booking.closeOverdueAlertHours` (`booking.close_overdue`) | Assigned staff + `BOOKINGS_OPERATE`; also admin email + alert | Push with **Completed / No-show** actions |
| New published review, business / me (`review.published`) | `REVIEWS_VIEW` / the staff member | Push |
| Application approved / rejected | Owner | Push |
| Catalog request approved / rejected | `SERVICES_MANAGE` | Push |
| Audience widened (`salon.audience_widened`) | Owner (confirmation); also admin email | Push |
| Refund pending / refunded (FYI) | `FINANCE_VIEW` | In-app |
| Payout transferred | Owner + `FINANCE_VIEW` | Push |
| Trial / subscription ending in 7 days, expired | Owner | Push |
| Business set Offline / back Live | Owner | Push |
| Branch set Offline / back Live | Owner + branch managers | Push |
| Permissions changed / access removed | Affected member | Silent data push + socket |

---

## 12. Validation Rules

| Field | Rule |
|---|---|
| Phone | Required; country regex; unique among members |
| Names, business name | Required, trimmed, max 50 / 80 chars |
| Description | Max 1000 chars |
| License documents | 1–5 files; image or PDF; ≤10 MB each |
| Medical license (clinics) | Required; 1–5 files; image or PDF; ≤10 MB each |
| Audience | Salons only: MALE, FEMALE or BOTH; clinics and tattoo studios are BOTH, not asked |
| Images | ≤10 MB; videos ≤50 MB and ≤60 s (assumption) |
| Price | > 0, max 2 decimals, JOD |
| Duration | ≥5 min, multiple of 5 |
| Hours | 15-min steps; close > open |
| Deposit % | 1–100 when deposit enabled |
| Cancellation window | Required, ≥0 hours |
| IBAN | Valid IBAN format (JO) |
| Branch | Arabic and English names, map pin, address, city and area required; phone in international format; WhatsApp optional |
| New booking customer | Valid mobile number, checked; if not registered: name ≤50 and gender required |
| New booking | ≥1 service; date today to +90 days; start on a 15-min step; design image only at tattoo studios |
| Offline reason (branch) | Required |

---

## 13. Accessibility & Quality
Same as Customer PRD: 48dp touch targets, content descriptions, font scaling, alert sounds also with vibration and visual cues.

---

## 14. Analytics & Monitoring
- Firebase Analytics for screens and actions, Crashlytics for crashes. The app sets the Firebase user ID to the member ID on login (cleared on logout). The app never sends analytics to the backend; the server records its own events in MongoDB (`serverEvents`) and the admin panel reads those.
- Common event fields: event name, timestamp, session ID, installation ID, member ID, salon ID, role, app = MERCHANT, platform, OS & app version, language, screen, params.
- Suggested events: `screen_view`, `login_*`, `otp_*`, `registration_submit`, `document_upload`, `application_resubmit`, `setup_item_complete`, `salon_live`, `request_shown` (channel: in-app/overlay/notification), `request_accept`, `request_reject` (reason, response time), `booking_cancel_by_salon`, `booking_complete`, `booking_no_show`, `booking_reassign`, `booking_create_by_business`, `calendar_view`, `profile_update`, `gallery_upload`, `hours_update`, `closure_add`, `conflict_dialog_shown` (+ choice), `service_add`/`update`/`deactivate`, `catalog_request_submit`, `member_add`/`update`/`deactivate`, `permissions_update`, `policy_update`, `branch_save`, `branch_set_main`, `branch_offline`, `branch_online`, `branch_close`, `salon_audience_widen`, `review_report`, `statistics_view`, `finance_view`, `bank_details_update`, `contact_wab`, `overlay_permission_result`, `push_open`, `logout`, `delete_request`.

---

## 15. Backend Capabilities (merchant contract 1.13.0, 106 operations)
- Auth (`otp/request`, `otp/verify`, `check-phone`, login, refresh, logout, change phone), member profile, push toggle, leave.
- Business: application (create/resubmit, trade and medical license uploads), state & completeness, profile, gallery, audience, deletion request.
- Branches: list, create, edit, close, offline/online, set main, per-branch hours and services.
- Working hours, closures, conflict preview and bulk cancel.
- Catalog (per business type and audience, paginated), branch services CRUD, catalog requests.
- Members CRUD, roles, permissions, staff profiles, leaves, conflict preview.
- Policies.
- Bookings: list/search/filter including `tab=TO_CLOSE` and `branchId` (scoped by permission and branch), details, approve, reject, cancel, complete, no-show, reassign (eligible staff), status history; create for a customer (`POST /bookings`, `GET /customers/lookup`); real-time push dispatch to permitted members.
- Calendar data.
- Dashboard; reviews (published), statistics aggregates (per branch).
- Finance: transactions and refunds (per branch), payouts, balance, bank details (OTP-protected).
- Subscription status; notifications list/read; FCM token registration; Socket.IO real-time channels; presigned uploads; app config; content pages and FAQ.

---

## 16. Open Items & Assumptions

| # | Item | Assumption / state |
|---|---|---|
| 1 | Tech stack | Settled (Section 2.2) |
| 2 | Default permission templates | Section 6.3 |
| 3 | Phone belongs to one business only | Yes |
| 4 | Business name change requires admin approval? | No |
| 5 | Invite message to new members | None: no SMS or WhatsApp invite; the owner tells the member to install the app and sign in |
| 6 | Video limits | ≤60 s, ≤50 MB |
| 7 | Staff custom hours per day | Optional, within branch hours |
| 8 | Owner can prepare profile while application pending | Yes |
| 9 | Rejected applications can resubmit | Yes, unlimited |
| 10 | Payout frequency | Set by admin (e.g., weekly), manual transfer |
| 11 | Merchant deep link domain | Open owner decision (platform domain) |
| 12 | Business deletion | Request handled by admin |
| 13 | Payment gateway | Open owner decision; online payment is paused until then (Section 2.1) |
| 14 | Merchant Firebase registrations + APNs | Open owner input; push on real devices waits for them |
| 15 | Production hosting, Atlas tier, error tracking, package registry, store accounts and signing | Open owner decisions (root `CLAUDE.md` §6) |
| 16 | Shared `core/*` between the two KMP apps | Open owner decision |
