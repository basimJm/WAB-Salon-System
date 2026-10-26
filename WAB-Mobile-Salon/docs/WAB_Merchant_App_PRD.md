# WAB Wedding & Beauty — Merchant (Salon) Mobile App PRD

> **Document type:** Product Requirements Document — Merchant app (mobile)
> **Audience:** AI coding agents and engineers implementing the merchant app.
> **Version:** 1.1 — updated with backend decisions: phone OTP with dynamic length (currently 6; WhatsApp since 2026-10-26), Socket.IO real-time, Firebase Analytics + BigQuery, presigned uploads + CDN.
> **Related documents:** Customer App PRD, Customer BRD, Merchant BRD, Admin BRD, Admin PRD, Backend PRD (upcoming).

---

## 0. How to Read This Document

- **MUST** = mandatory, **SHOULD** = strongly recommended, **MAY** = optional.
- Every screen section contains: purpose, entry, required permission, layout, behavior, states, acceptance criteria.
- "Start"/"End" are layout-direction aware (Arabic RTL: Start = right). Never hardcode left/right.
- Undecided items are in **Section 16 – Open Items & Assumptions**. Implement the stated assumption and keep it easy to change.
- All strings MUST be localized (Arabic + English).

---

## 1. Product Overview

The **WAB Merchant app** is a separate mobile app (Android + iOS) used by salons to:
- Register on the platform and get approved by admin.
- Build and maintain the public salon profile seen by customers.
- Manage working hours, exceptional closures, services, staff/team, and salon policies.
- **Receive booking requests in real time** (Uber/Careem-style) and approve/reject them.
- Operate bookings (calendar, completion, no-show, cancellation, staff reassignment).
- Read reviews, view statistics, track payments, refunds, payouts and subscription status.

Every piece of salon data shown in the customer app originates here (see Customer App PRD).

---

## 2. Platform & Technical Constraints

### 2.1 Confirmed
- **Kotlin Multiplatform + Compose Multiplatform**, shared UI and business logic for Android and iOS. Platform code only via `expect/actual` (push, overlays, location/map picker, image/video/document pickers, payments are NOT needed here).
- **Local persistence:** DataStore.
- **OTP (owner decision 2026-10-26, BUSINESS_DOMAIN §3.1a):** the backend sends the code over **WhatsApp** (`POST /auth/otp/request`), the app verifies it with the backend (`POST /auth/otp/verify`) and receives a short-lived single-use `otpToken` for login / registration / change phone / bank details. Firebase Phone Auth is removed (Firebase stays for push, analytics, crash reporting). Code length is dynamic (`otpLength` from backend, currently 6).
- **Push:** Firebase Cloud Messaging (Android + iOS), high-priority data messages for booking requests.
- **Real-time:** Socket.IO client while the app is in the foreground; FCM in background.
- **Crashlytics + Analytics:** Firebase; raw events exported to **BigQuery** (permanent) and read by the backend for the Admin panel.
- **Internal abstraction (mandatory):** OTP, push, analytics and crash reporting behind interfaces in the app's own code (single place to swap providers).
- **Files:** presigned upload URLs from the backend, direct upload to AWS S3, delivery via CDN; images and videos compressed on device before upload. License documents are stored privately (admin-only access).
- **Backend context:** Node.js + TypeScript + Express + Mongoose, MongoDB, Redis; merchant endpoints under a dedicated namespace (e.g., `/merchant/v1`).
- The merchant app does not process payments (no `wab-payments` dependency).
- Separate app from the customer app (separate package/bundle IDs, separate store listings).

### 2.2 Tech Stack
> **KMP libraries: TBD — provided later by the product owner as a template.** Integrations confirmed in 2.1 are fixed.

### 2.3 Environments
Dev / Staging / Production, separate base URLs.

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
- **Offline salon banner:** when the salon is suspended by admin (Offline), a persistent banner appears on all screens: "Your salon is currently offline and hidden from customers. Contact WAB to reactivate." with a Contact action.
- **Destructive actions** (reject, cancel, deactivate, delete) require a confirmation dialog; actions affecting customers require a **reason**.
- **Real-time:** Home (pending requests, today), Bookings list, Booking details, Calendar and the notifications badge MUST update instantly via Socket.IO (and refresh on FCM / app foreground).
- **Uploads:** presigned URL → compress on device → direct upload → confirm; progress + retry.

---

## 4. Accounts, Salon States & Launch Flow

### 4.1 Concepts
- **Salon account:** one salon = one account, created by its **Owner**. Each salon serves exactly **one gender** (MEN or WOMEN), fixed after approval (changes only by admin).
- **Member:** any person with access to the salon in the merchant app: Owner, Manager (مسؤول), Employee (عامل). Each member has a **mandatory mobile number** used for OTP login.
- **Service provider:** a member flagged `providesServices = true` is shown to customers as **Staff** (with profile, skills, schedule, reviews). A Manager may or may not provide services.
- A phone number can belong to **only one salon** as a member (assumption).
- Being a member is independent of the customer app (a member using the customer app is a regular customer there).

### 4.2 Salon Lifecycle States
| State | Meaning | Customer visibility |
|---|---|---|
| `APPLICATION_PENDING` | Registration submitted, waiting for admin review | Hidden |
| `APPLICATION_REJECTED` | Admin rejected (reason given); owner can fix and resubmit | Hidden |
| `APPROVED_INCOMPLETE` | Approved but profile not complete | Hidden |
| `LIVE` | Approved + profile complete + not suspended | **Visible & bookable** |
| `OFFLINE` | Suspended by admin (e.g., unpaid subscription). Data kept | Hidden, no new bookings; existing approved bookings remain |

**Profile completeness (required to go LIVE):**
- Cover image, profile image, salon name, description.
- Map location + location text, phone number.
- Weekly working hours (at least one working day).
- At least **1 active service** (with price and duration).
- At least **1 active service provider** with at least one assigned service and working days.
- Salon policies saved (cancellation window and at least one payment option).

> During `APPLICATION_PENDING`, the owner MAY already prepare the profile (all setup screens accessible), so the salon can go live immediately after approval.

### 4.3 Launch Flow
```
App start
 ├─ Version policy / maintenance check (blocking screens if needed)
 ├─ No token → Welcome / Login (M02)
 └─ Token →
     ├─ Member deactivated → message "Your access was removed by the salon owner" → logout
     ├─ Salon APPLICATION_PENDING / REJECTED → Application Status (M05) (+ setup access for owner)
     ├─ Salon APPROVED_INCOMPLETE → Setup Checklist (M06)
     └─ LIVE / OFFLINE → Home (M07)
```

### 4.4 Login Logic (phone + OTP)
- Phone found as an **active member** → OTP → app.
- Phone **not found** → dialog: "This number is not linked to any salon." with actions **Register a new salon** (→ M04 after OTP) and **Cancel**. (Team members must ask their owner to add their number.)
- Member deactivated → message as above.
- OTP rules identical to the customer app (Customer PRD S13): WhatsApp code from the backend, dynamic code length (currently 6), backend pre-check of limits, resend after 60 s, 5 requests / 5 min → 15 min block, 5 wrong codes → 15 min block, backend verifies the code and answers a single-use `otpToken`.

### 4.5 Entry From the Customer App
"Register your salon with us" in the customer app opens the merchant app via deep link (`<merchant-domain>/register`) if installed, otherwise the corresponding app store page.

---

## 5. Local Storage (DataStore)

| Key | Description |
|---|---|
| `access_token`, `refresh_token` | Auth tokens (secure storage where possible) |
| `member_id`, `salon_id` | Current identity |
| `member_role` | OWNER / MANAGER / EMPLOYEE |
| `permissions` | Cached permission keys (refreshed from server) |
| `salon_state` | Cached lifecycle state |
| `language`, `theme` | Preferences |
| `overlay_permission_prompted` | Android "display over other apps" prompt shown |
| `push_enabled` | Push preference |

---

## 6. Roles & Permissions

### 6.1 Rules
- The **Owner has all permissions** and is the **only** member who can manage the team, roles and permissions. These owner-only capabilities are **not grantable**.
- For Manager and Employee, the owner grants permissions **per feature** (toggle list). Role is a label + default template; the actual access is the permission set.
- Hidden-not-disabled rule (Section 3).
- Notifications are delivered only to members holding the related permission.

### 6.2 Permission Keys
| Key | Grants |
|---|---|
| `DASHBOARD_VIEW` | Home dashboard |
| `BOOKINGS_VIEW_ALL` | See all salon bookings + calendar for all staff |
| `BOOKINGS_VIEW_OWN` | See only bookings assigned to me + my calendar |
| `BOOKINGS_RESPOND` | Approve / reject pending bookings; receive real-time request alerts |
| `BOOKINGS_OPERATE` | Mark completed & paid, mark no-show, cancel approved bookings, reassign staff |
| `SALON_PROFILE_MANAGE` | Edit profile, images, location, contacts |
| `GALLERY_MANAGE` | Manage portfolio |
| `WORKING_HOURS_MANAGE` | Weekly schedule + exceptional closures |
| `SERVICES_MANAGE` | Salon services and catalog requests |
| `STAFF_MANAGE` | Service-provider profiles, skills, schedules, leaves (not access/permissions) |
| `POLICIES_MANAGE` | Payment options, deposit, cancellation, refund, no-show policy |
| `REVIEWS_VIEW` | Salon and staff reviews |
| `STATISTICS_VIEW` | Statistics |
| `FINANCE_VIEW` | Payments, refunds, payouts |
| `SUBSCRIPTION_VIEW` | Subscription & account status |
| **Owner-only (non-grantable):** `TEAM_MANAGE` (add/remove members, roles, permissions), `PAYOUT_DETAILS_MANAGE` (bank details), `SALON_DELETE_REQUEST` |

### 6.3 Suggested Default Templates (editable by owner)
- **Manager:** all grantable keys except `FINANCE_VIEW` and `POLICIES_MANAGE`.
- **Employee:** `BOOKINGS_VIEW_OWN`, `REVIEWS_VIEW`.

---

## 7. Domain Models (merchant-side)

> Indicative names; align with the Backend PRD.

**Salon**: `id`, `name`, `gender`, `state`, `coverImageUrl`, `profileImageUrl`, `description`, `latitude`, `longitude`, `locationText`, `cityId`, `areaId`, `phone`, `whatsapp?`, `licenseDocuments[]`, `rejectionReason?`, `completeness` (list of missing items), `subscription` (Subscription), `isRecommended`, `rating`, `reviewsCount`.

**Member**: `id`, `firstName`, `lastName`, `phone` (country code + number, mandatory), `photoUrl?`, `role` (OWNER/MANAGER/EMPLOYEE), `permissions[]`, `isActive`, `providesServices`, `staffProfile?`.

**StaffProfile** (when providesServices): `bio`, `yearsOfExperience`, `serviceIds[]`, `brideQualified` (women's salons), `workingDays[]` (subset of salon working days; hours = salon hours of that day unless `customHours` set), `leaves[]` (date ranges with optional note), `rating`, `reviewsCount`, `customersCount`.

**WeeklySchedule**: 7 entries `{dayOfWeek, isDayOff, openTime, closeTime}`.

**ExceptionalClosure**: `id`, `fromDate`, `toDate`, `reason` (ar/en free text).

**CatalogService** (admin-managed): `id`, `name`, `description`, `imageUrl`, `gender`.

**SalonService**: `id`, `catalogServiceId`, `price` (JOD, tax-inclusive), `durationMinutes` (multiple of 5), `brideOnly` (women only), `extraDescription?`, `media[]`, `isActive`.

**CatalogRequest**: `id`, `name`, `description`, `imageUrl?`, `status` (PENDING/APPROVED/REJECTED), `adminNote?`.

**SalonPolicy**: `cancellationWindowHours` (required), `paymentOptions[]` (PAY_ON_ARRIVAL, DEPOSIT, FULL_ONLINE; ≥1), `depositPercentage` (1–100, required if DEPOSIT), `depositRefundableOnCustomerCancel`, `fullPaymentRefundOnCustomerCancel` (FULL / MINUS_DEPOSIT), `noShowDeposit` (KEEP/REFUND), `noShowFullPayment` (KEEP/REFUND_MINUS_DEPOSIT/REFUND_FULL), `policyNotes?`.

**Booking**: same model as Customer PRD (reference number, status, payment status, refund status, persons with services/staff/times/bride flag, totals, paid/remaining, reasons, policy snapshot) + `customer` (name, phone), `statusHistory[]` (status, actor, time, reason), `requestedAt`, `respondBy` (appointment start + 1h auto-cancel).

**Review**: as Customer PRD + `target` (SALON/STAFF), `staffId?`.

**Transaction**: `id`, `bookingId`, `referenceNumber`, `type` (DEPOSIT/FULL), `amount`, `gatewayFee`, `status`, `createdAt`.
**Refund**: `id`, `bookingId`, `amount`, `status` (PENDING/REFUNDED/FAILED), `reason`, `createdAt`, `completedAt?`.
**Payout**: `id`, `periodFrom`, `periodTo`, `grossAmount`, `gatewayFees`, `refundsDeducted`, `netAmount`, `status` (PENDING/TRANSFERRED), `transferredAt?`, `transferReference?`.
**Balance**: `pendingAmount`, `lastPayout`.
**PayoutDetails**: `bankName`, `accountHolderName`, `iban`.

**Subscription**: `status` (TRIAL/ACTIVE/EXPIRED), `trialEndsAt`, `currentPeriodEnd?`, `daysRemaining`.

**MerchantNotification**: `id`, `type`, `title`, `body`, `createdAt`, `isRead`, `bookingId?`.

---

## 8. Navigation

### 8.1 Bottom Navigation (items shown only if permitted)
1. **Home** (Dashboard) — `DASHBOARD_VIEW`
2. **Bookings** — `BOOKINGS_VIEW_ALL` or `BOOKINGS_VIEW_OWN`
3. **Calendar** — `BOOKINGS_VIEW_ALL` or `BOOKINGS_VIEW_OWN`
4. **Salon** (management hub) — visible if the user has any management permission
5. **More** — always visible

If the user lacks `DASHBOARD_VIEW`, the first visible tab is the default.

### 8.2 Screens Index
| ID | Screen |
|---|---|
| M01 | Splash / version & maintenance check |
| M02 | Welcome & Login |
| M03 | OTP Verification |
| M04 | Salon Registration |
| M05 | Application Status |
| M06 | Setup Checklist |
| M07 | Home (Dashboard) |
| M08 | Bookings List |
| M09 | Booking Details & Actions |
| M10 | Real-time Booking Request (sheet / overlay / notification) |
| M11 | Calendar |
| M12 | Salon Hub |
| M13 | Salon Profile Edit |
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

---

## 9. Screen Specifications

### M01 — Splash
Checks version policy and maintenance (same as customer app), then follows the launch flow (4.3).

### M02 — Welcome & Login
**Layout:** background + WAB merchant logo; language & theme icons at top; headline ("Grow your salon with WAB"); card with country code picker (server list, default +962) + phone field (country regex); **Continue** button; "New salon? **Register your salon**" link; legal links (Privacy, Terms, Contact).
**Behavior:** Continue → server checks the phone → OTP (M03) or "not linked" dialog (4.4). Register link → phone + OTP → M04.
**States:** invalid phone, loading, blocked/deactivated messages.

### M03 — OTP Verification
Same component, flow and rules as the customer app (WhatsApp code, `otpLength` boxes, 60 s resend, limits, code lifetime + expiry popup; `OTP_DELIVERY_FAILED` when the number is not on WhatsApp). Modes: LOGIN, REGISTER, CHANGE_PHONE, BANK_DETAILS.

### M04 — Salon Registration (owner)
**Fields (all required unless stated):**
1. Salon name.
2. Salon type: **Men** / **Women** (radio; warning: "cannot be changed later").
3. Owner first name, last name.
4. City (dropdown, server) → Area (dropdown, disabled until city).
5. **License / proof document(s):** upload 1–5 files (image from camera/gallery or PDF), any document proving the salon exists and is licensed. Max 10 MB each. Show thumbnails, remove action.
6. Email (optional).
- Agree to Terms checkbox (required).
- **Submit** disabled until valid; upload progress per file.
**On submit:** salon created in `APPLICATION_PENDING`, owner member created → M05.

### M05 — Application Status
- **Pending:** illustration, "Your application is under review", submitted date, documents list. CTA **Prepare your salon profile** → M06 (owner). Pull-to-refresh.
- **Rejected:** reason from admin, **Edit & resubmit** (opens M04 prefilled incl. documents; resubmission returns to Pending).
- **Approved:** transitions automatically to M06 (if incomplete) or M07.
- Push notification on approval/rejection.

### M06 — Setup Checklist
- Progress indicator (e.g., 4/6 completed).
- Items (each → its screen, with ✓ when complete): Profile & images (M13), Location & contact (M13), Working hours (M15), Services (M16), Staff (M17), Policies (M19). Optional: Gallery (M14), Team access (M17).
- When all required items are complete and the salon is approved: success state "Your salon is now live!" → Home.
- Accessible later from Home while incomplete.

### M07 — Home (Dashboard)
**Layout (top → bottom):**
1. Header: salon name + profile image (Start); notifications bell with unread badge 1–99/"99+" (End).
2. Status strip: salon state (Live / Offline / Incomplete → link to checklist), subscription warning if trial/subscription ends in ≤7 days.
3. **Pending requests card** (if `BOOKINGS_RESPOND`): count + list of the newest pending requests (bride badge, time since request, appointment time). Tap → M09; "View all" → M08 (Pending tab).
4. **Today at a glance:** today's approved bookings count, completed, upcoming next booking (time, customer, staff).
5. **Today's timeline:** next bookings ordered by time (limited to own bookings for `BOOKINGS_VIEW_OWN`).
6. **Quick stats** (if `STATISTICS_VIEW`): this week's bookings, revenue (online + marked paid), rating.
**States:** unified shimmer, error, pull-to-refresh (also refreshes permissions).

### M08 — Bookings List
**Layout:** sticky search (customer name, phone, reference; debounced) + filter icon; tabs: **Pending** | **Upcoming** | **Today** | **Past**; active filter chips.
**Filter sheet:** date range, staff (multi), status (multi), bride only (toggle), payment status.
**Booking card:** reference number, customer name, appointment date/time, persons count, staff name(s), status badge, payment badge, **bride badge**, for Pending: time since request and auto-cancel countdown.
**Scope:** `BOOKINGS_VIEW_OWN` users see only bookings where they are the assigned staff for at least one person.
**States:** shimmer, empty per tab, error, pagination, pull-to-refresh.

### M09 — Booking Details & Actions
**Layout:**
1. Header: reference number (copy), status, payment status, refund status, bride badge.
2. Customer: name, phone (**Call** button), WhatsApp button.
3. Persons: for each — name, bride badge, services (price, duration), assigned staff, start–end time.
4. Payment: method, total, paid online (deposit/full), remaining to collect at salon, refund info.
5. Policy snapshot.
6. Status history timeline (status, actor, time, reason).
7. **Sticky action bar** (by status and permission):

| Status | Actions (permission) |
|---|---|
| PENDING | **Approve**, **Reject** (reason required) — `BOOKINGS_RESPOND` |
| APPROVED, before start time | **Cancel** (reason required; customer gets full refund), **Reassign staff** — `BOOKINGS_OPERATE` |
| APPROVED, at/after start time | **Mark completed & paid**, **Mark no-show**, Reassign staff — `BOOKINGS_OPERATE` |
| COMPLETED / NO_SHOW / REJECTED / CANCELLED_* | Read-only |

**Action rules:**
- **Approve:** server re-validates that slots/staff are still valid; on conflict show error and refresh.
- **Reject:** reason picker (Fully booked, Staff unavailable, Service unavailable, Other + free text) → full refund automatically if paid.
- **Cancel approved:** reason required; dialog states "The customer will receive a full refund."
- **Mark completed & paid:** confirmation shows remaining amount to collect ("Confirm you collected X JOD"); sets status COMPLETED and payment status PAID.
- **Mark no-show:** confirmation shows policy outcome (deposit kept/refunded etc.).
- **Reassign staff:** per person, list of eligible staff (skills, bride-qualified, free for the full duration, on duty). Customer is notified.
- Concurrency: if another member already acted, show "This booking was already {action} by {member}" and refresh.

### M10 — Real-time Booking Request
**Trigger:** new PENDING booking → Socket.IO event (app open) **and** FCM high-priority data message (background/closed) to all active members with `BOOKINGS_RESPOND`. The client de-duplicates by booking ID.

**In-app (any screen):** a modal bottom sheet over the current screen with a distinct sound/vibration:
- Title "New booking request" (+ **BRIDE** badge when applicable).
- Customer name, persons count, services summary, staff, date & time, total and payment method, time since request.
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

### M11 — Calendar
- Views: **Day** (columns per staff member, time grid at 15-min resolution within working hours) and **Week** (per day list or compact grid).
- Booking blocks colored by status (pending/approved/completed/no-show), bride icon; tap → M09.
- Non-working hours, closures and staff leaves shaded.
- Staff filter; `BOOKINGS_VIEW_OWN` users see only their own column.
- Date picker, "Today" shortcut, swipe to change day/week.
- Read-only (no creation of bookings; no time blocking).

### M12 — Salon Hub
Grid/list of management entries shown per permission: Profile, Gallery, Working Hours, Services, Team & Staff, Policies, Reviews, Statistics, Finance, Subscription. Shows completeness warnings on items missing for LIVE.

### M13 — Salon Profile Edit (`SALON_PROFILE_MANAGE`)
- Cover image (upload/replace, crop 16:9), profile image (upload/replace, crop 1:1).
- Salon name (editable; assumption: no admin approval needed), description (multiline, max 1000 chars).
- **Location:** map picker with draggable pin + "use my current location"; location text (auto-filled from reverse geocoding, editable); city/area dropdowns.
- Phone (required), WhatsApp number (optional).
- Salon type shown read-only.
- **Preview as customer** button (renders the customer salon details layout).
- Save with validation; unsaved-changes guard on back.

### M14 — Gallery (`GALLERY_MANAGE`)
- Grid of images/videos; add from camera/gallery (multi-select); videos max 60 s / 50 MB (assumption); images max 10 MB.
- Upload progress per item, retry on failure.
- Long-press to reorder (drag), select mode to delete (confirmation).
- Empty state with "Add your work" CTA.

### M15 — Working Hours & Exceptional Closures (`WORKING_HOURS_MANAGE`)
**Weekly schedule:** 7 rows (Saturday → Friday): toggle working/day off, open time, close time (15-min steps, close > open). "Copy to all days" helper.
**Exceptional closures:** list (upcoming first, past collapsed); add: date range + reason; edit/delete future closures.
**Conflict handling (schedule change, closure):**
- Before saving, the server returns affected **upcoming PENDING and APPROVED bookings**.
- Dialog lists them with two options: **Cancel affected bookings** (PENDING → rejected, APPROVED → cancelled by salon; reason auto-filled with the closure reason; full refunds) or **Go back**.
- No conflicts → save directly.

### M16 — Services (`SERVICES_MANAGE`)
**List:** salon services (image, name, price, duration, bride-only badge, active toggle). Search. Empty state CTA "Add services".
**Add from catalog:** searchable, paginated catalog list **for the salon's gender only**; services already added are marked. Select → service form.
**Service form:**
- Catalog name/image (read-only), price (JOD, > 0, 2 decimals, hint "including tax and fees"), duration (minutes, multiple of 5, ≥5), **Bride only** toggle (women's salons only), extra description (optional), media (images/videos, optional), active toggle.
- Price changes affect only new bookings (info note).
**Deactivate/remove service:** if upcoming bookings include it → warning listing them; bookings remain valid (service is only hidden for new bookings).
**Catalog requests:** "Can't find your service? Request it" → form (name, description, optional image) → list of requests with status (Pending/Approved/Rejected + admin note). Approved requests become available in the catalog (salon is notified).
**Rule:** removing a service from all staff makes it unbookable; warn if an active service has no qualified staff.

### M17 — Team & Staff
**List (`TEAM_MANAGE` or `STAFF_MANAGE`):** members with photo, name, role badge, "Provides services" badge, active/inactive, on leave today.
- Owner sees "Add member".
- `STAFF_MANAGE` without `TEAM_MANAGE` can only edit staff profiles of service providers (not phone, role, permissions, activation).

**Member form (owner, `TEAM_MANAGE`):**
- First name, last name, **phone (mandatory, country code + regex, unique)**, photo, role (Manager / Employee), active toggle.
- **Provides services** toggle → shows Staff profile section.
- **Permissions** → M18 (prefilled from role template).
- On save: the member can log in with that phone (optional: the server sends an SMS invite with the app link — assumption).

**Staff profile section (`STAFF_MANAGE`):**
- Bio, years of experience.
- **Services** (multi-select from salon services).
- **Bride-qualified** toggle (women's salons only).
- **Working days** (subset of salon working days); optional custom hours per day within salon hours.
- **Leaves:** list + add date range (+ note).
- Read-only: rating, reviews count, customers served via app.

**Conflict handling:** deactivating a member, removing `providesServices`, removing a skill, adding a leave, or reducing working days → server returns affected upcoming bookings → dialog: **Reassign** (go to each booking), **Cancel affected bookings** (full refunds), or **Go back**.

**Owner member** cannot be deactivated or deleted from this screen.

### M18 — Permissions Editor (owner only)
- Member header (name, role).
- "Apply role template" action.
- Toggle list grouped by area (Bookings, Salon, Staff, Finance, Insights) with a short description per permission (Section 6.2).
- Save → member's app updates permissions immediately (push `PERMISSIONS_UPDATED`).

### M19 — Policies (`POLICIES_MANAGE`)
- **Cancellation window** (required): number of hours before appointment (e.g., 1, 2, 3, 6, 12, 24, 48 or custom).
- **Payment options** (≥1): Pay on arrival / Deposit / Full online payment.
- **Deposit percentage** (1–100) — required when Deposit is enabled; live example "On a 50 JOD booking the deposit is 10 JOD".
- **Customer cancellation (within window):** deposit refundable? (yes/no); full payment → refund full / refund minus deposit.
- **No-show:** deposit → keep/refund; full payment → keep / refund minus deposit / refund full.
- Optional policy notes (shown to customers).
- **Customer preview** of the "Salon rules" block exactly as shown in the customer booking summary.
- Info note: changes apply to new bookings only.

### M20 — Reviews (`REVIEWS_VIEW`)
- Tabs: **Salon** | **Staff** (staff selector).
- Header: average rating + count + star distribution.
- Paginated list (published reviews only): user name, stars, comment, date.
- **Report** action per review → opens Contact WAB (WhatsApp/email) prefilled with review reference. No edit/delete.

### M21 — Statistics (`STATISTICS_VIEW`)
- Period selector: Today / This week / This month / Custom range.
- KPIs: bookings (by status), approval rate, cancellation rate, no-show rate, average response time to requests, revenue (online collected + marked paid), bride bookings, profile views, new reviews, average rating.
- Charts: bookings per day, revenue per day.
- Rankings: top services, top staff (bookings, rating).

### M22 — Finance (`FINANCE_VIEW`)
- **Balance card:** pending payout amount, last payout (amount, date).
- Tabs:
  1. **Transactions:** online payments (reference, date, type deposit/full, amount, gateway fee, net).
  2. **Refunds:** amount, booking, reason, status (Pending/Refunded/Failed), dates.
  3. **Payouts:** period, gross, fees, refunds deducted, net, status (Pending/Transferred), transfer date and reference.
- Filters by date range; pagination.
- **Bank details** (owner only, `PAYOUT_DETAILS_MANAGE`): bank name, account holder, IBAN (format validation). Changing details requires OTP to the owner's phone.
- Info: "Payments are collected by WAB. Gateway fees are deducted from your payouts. Payouts are transferred manually by WAB."

### M23 — Subscription & Account Status (`SUBSCRIPTION_VIEW`)
- Salon state (Live / Offline / Incomplete).
- Subscription: Trial (days remaining, end date) / Active (period end) / Expired.
- Text: subscriptions are paid outside the app; **Contact WAB** (WhatsApp/call/email from server).
- "Get featured in Recommended Salons" → Contact WAB.

### M24 — Notifications
Same pattern as the customer app: list (paginated), title, body, relative time, read/unread (marked read when visible), filter (date range + search), tap → related screen (booking → M09; review → M20; application → M05; catalog request → M16; payout → M22). Pushes opened from the OS tray open the related screen directly (booking requests open M10/M09).

### M25 — More
- My account: photo, name, phone (change phone → OTP to new number), role.
- Settings: language, theme, push notifications toggle, **Android: display over other apps** status + enable shortcut, notification sound test.
- Support: Contact WAB (call / WhatsApp / email), FAQ.
- Legal: Terms, Privacy, About.
- **Log out** (confirmation).
- **Delete my account:**
  - Non-owner member → removes their own access (confirmation) and logs out.
  - Owner → sends a **salon deletion request** to admin (confirmation explaining that admin will contact them; required by store policies).
- App version.

### M26 — Force Update / Maintenance
Same as the customer app (blocking screens / optional dialog).

---

## 10. Booking Rules (merchant perspective)

1. Every new customer booking arrives as **PENDING** and holds its slot until decided.
2. Only members with `BOOKINGS_RESPOND` can approve/reject; first action wins.
3. Rejection requires a reason; paid amounts are refunded fully by the platform.
4. Pending bookings are **auto-cancelled 1 hour after the appointment start time** with a mandatory full refund; the salon is notified.
5. Approved bookings can be cancelled by the salon before start time with a reason → **full refund**.
6. Completed & paid and No-show can be marked only **at or after** the appointment start time.
7. Completion sets payment status to PAID (remaining collected at the salon).
8. No-show outcome follows the booking's policy snapshot.
9. Staff reassignment only to eligible staff (skills, bride-qualified when needed, on duty, free for the full duration); customer notified.
10. Policy and price changes never affect existing bookings.
11. No manual bookings and no time blocking in the app.
12. Offline salons: no new bookings; existing approved bookings remain fully operable.

---

## 11. Notifications (merchant)

| Trigger | Recipients | Channel |
|---|---|---|
| New booking request (bride highlighted) | `BOOKINGS_RESPOND` | Real-time request (M10) + push |
| Booking still pending 30 min before appointment | `BOOKINGS_RESPOND` | Push |
| Booking auto-cancelled | `BOOKINGS_VIEW_ALL` + assigned staff | Push |
| Customer cancelled a booking | `BOOKINGS_VIEW_ALL` + assigned staff | Push |
| Booking assigned/reassigned to me | Assigned staff | Push |
| Upcoming booking reminder (1 hour before) | Assigned staff | Push |
| New published review (salon / me) | `REVIEWS_VIEW` / the staff member | Push |
| Application approved / rejected | Owner | Push |
| Catalog request approved / rejected | `SERVICES_MANAGE` | Push |
| Refund completed / failed (FYI) | `FINANCE_VIEW` | In-app |
| Payout transferred | Owner + `FINANCE_VIEW` | Push |
| Trial / subscription ending in 7 days, expired | Owner | Push |
| Salon set Offline / back Live | Owner | Push |
| Permissions changed / access removed | Affected member | Silent data push |

---

## 12. Validation Rules

| Field | Rule |
|---|---|
| Phone | Required; country regex; unique among members |
| Names, salon name | Required, trimmed, max 50 / 80 chars |
| Description | Max 1000 chars |
| Documents | 1–5 files; image or PDF; ≤10 MB each |
| Images | ≤10 MB; videos ≤50 MB and ≤60 s (assumption) |
| Price | > 0, max 2 decimals, JOD |
| Duration | ≥5 min, multiple of 5 |
| Hours | 15-min steps; close > open |
| Deposit % | 1–100 when deposit enabled |
| Cancellation window | Required, ≥0 hours |
| IBAN | Valid IBAN format (JO) |

---

## 13. Accessibility & Quality
Same as Customer PRD: 48dp touch targets, content descriptions, font scaling, alert sounds also with vibration and visual cues.

---

## 14. Analytics & Monitoring
- Firebase Crashlytics + Analytics, exported to **BigQuery** (permanent) and read by the backend for the Admin panel. The app sets the Firebase user ID to the member ID on login (cleared on logout).
- Common event fields: event name, timestamp, session ID, installation ID, member ID, salon ID, role, app = MERCHANT, platform, OS & app version, language, screen, params.
- Suggested events: `screen_view`, `login_*`, `otp_*`, `registration_submit`, `document_upload`, `application_resubmit`, `setup_item_complete`, `salon_live`, `request_shown` (channel: in-app/overlay/notification), `request_accept`, `request_reject` (reason, response time), `booking_cancel_by_salon`, `booking_complete`, `booking_no_show`, `booking_reassign`, `calendar_view`, `profile_update`, `gallery_upload`, `hours_update`, `closure_add`, `conflict_dialog_shown` (+ choice), `service_add`/`update`/`deactivate`, `catalog_request_submit`, `member_add`/`update`/`deactivate`, `permissions_update`, `policy_update`, `review_report`, `statistics_view`, `finance_view`, `bank_details_update`, `contact_wab`, `overlay_permission_result`, `push_open`, `logout`, `delete_request`.

---

## 15. Expected Backend Capabilities (indicative)
- Auth (phone/OTP, member lookup, register salon, refresh, logout), member profile, change phone.
- Salon: application (create/resubmit, documents upload), state & completeness, profile, gallery, location, contacts.
- Working hours, closures, conflict preview and bulk cancel.
- Catalog (by gender, paginated), salon services CRUD, catalog requests.
- Members CRUD, roles, permissions, staff profiles, leaves, conflict preview.
- Policies.
- Bookings: list/search/filter (scoped by permission), details, approve, reject, cancel, complete, no-show, reassign (eligible staff), status history; real-time push dispatch to permitted members.
- Calendar data.
- Reviews (published), statistics aggregates.
- Finance: transactions, refunds, payouts, balance, bank details (OTP-protected).
- Subscription status; notifications list/read; FCM token registration; Socket.IO real-time channels; presigned uploads; app config.

---

## 16. Open Items & Assumptions

| # | Item | Assumption |
|---|---|---|
| 1 | Tech stack | TBD (owner's template) |
| 2 | Default permission templates | Section 6.3 |
| 3 | Phone belongs to one salon only | Yes |
| 4 | Salon name change requires admin approval? | No |
| 5 | Invite SMS to new members | Yes, with app download link |
| 6 | Video limits | ≤60 s, ≤50 MB |
| 7 | Staff custom hours per day | Optional, within salon hours |
| 8 | Owner can prepare profile while application pending | Yes |
| 9 | Rejected applications can resubmit | Yes, unlimited |
| 10 | Payout frequency | Set by admin (e.g., weekly), manual transfer |
| 11 | Merchant deep link domain | TBD (to-do) |
| 12 | Salon deletion | Request handled by admin |
