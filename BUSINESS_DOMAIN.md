# WAB — Business Domain Specification (single source for server schemas & business logic)

> **What this is:** the whole business consolidated into one implementable spec: entities and fields, enums, relations, indexes, state machines, algorithms, money rules, permissions, notifications, jobs, settings and error codes.
> **Who uses it:** WAB-Server (schemas, services, rules), the generated OpenAPI contract (`INTEGRATION.md` §3), and all clients for shared enums/rules.
> **Sources:** consolidated from the Customer, Merchant and Admin PRDs and BRDs, the Backend BRD, the package BRDs and `CLAUDE.md`. If this file conflicts with a PRD on **screen behavior**, the PRD wins. If it conflicts on **data/rules**, raise it and fix both.
> **Conventions:** MongoDB + Mongoose; `_id` ObjectId; timestamps `createdAt`/`updatedAt` (UTC) on every collection; money stored as **integer fils** (1 JOD = 1000 fils) to avoid float errors and exposed in the API as a decimal string with 3 decimals; localized admin-managed text as `{ ar, en }`; files stored as **storage keys** (never full URLs); soft-delete via status fields, not physical deletes, unless stated.

---

## 1. Actors & Identities

| Actor | Collection | Login | Token scope |
|---|---|---|---|
| Guest | none (device only) | — | none (public endpoints) |
| Customer | `customers` | phone + Firebase OTP | `customer` |
| Merchant member (Owner / Manager / Employee) | `members` | phone + Firebase OTP | `merchant` (+ `salonId`, permissions) |
| Admin (single) | `admins` | email + password + email OTP | `admin` |
| System | — | — | used as `actor: SYSTEM` in histories |

A phone number belongs to at most one customer and, separately, at most one member (a person may be both; the accounts are unrelated).

---

## 2. Enums (shared by server, contracts and clients)

```
Gender                 = MALE | FEMALE                       // also salon audience: MALE=men's salon, FEMALE=women's salon
Language               = ar | en
AppKind                = CUSTOMER | MERCHANT
Platform               = ANDROID | IOS | WEB
CustomerStatus         = ACTIVE | BLOCKED | DELETION_PENDING | DELETED
SalonState             = APPLICATION_PENDING | APPLICATION_REJECTED | APPROVED_INCOMPLETE | LIVE | OFFLINE
MemberRole             = OWNER | MANAGER | EMPLOYEE
Permission             = DASHBOARD_VIEW | BOOKINGS_VIEW_ALL | BOOKINGS_VIEW_OWN | BOOKINGS_RESPOND | BOOKINGS_OPERATE
                       | SALON_PROFILE_MANAGE | GALLERY_MANAGE | WORKING_HOURS_MANAGE | SERVICES_MANAGE | STAFF_MANAGE
                       | POLICIES_MANAGE | REVIEWS_VIEW | STATISTICS_VIEW | FINANCE_VIEW | SUBSCRIPTION_VIEW
OwnerOnlyCapability    = TEAM_MANAGE | PAYOUT_DETAILS_MANAGE | SALON_DELETE_REQUEST   // never stored in permissions[]
PaymentOption          = PAY_ON_ARRIVAL | DEPOSIT | FULL_ONLINE
BookingStatus          = PENDING | APPROVED | REJECTED | CANCELLED_BY_CUSTOMER | CANCELLED_BY_SALON
                       | AUTO_CANCELLED | COMPLETED | NO_SHOW
PaymentStatus          = PAY_ON_ARRIVAL | DEPOSIT_PAID | FULLY_PAID | PAID
RefundStatus           = NONE | REFUND_PENDING | REFUNDED | REFUND_FAILED
ActorType              = CUSTOMER | MEMBER | ADMIN | SYSTEM
TransactionType        = DEPOSIT | FULL
TransactionStatus      = PENDING | SUCCEEDED | FAILED | CANCELLED
RefundSource           = SALON_REJECT | SALON_CANCEL | AUTO_CANCEL | CUSTOMER_CANCEL | NO_SHOW_POLICY | ADMIN
ReviewTarget           = SALON | STAFF
ReviewStatus           = PENDING | APPROVED | REJECTED | REMOVED
NotificationType       = BOOKING | PROMOTION | SYSTEM
SubscriptionStatus     = TRIAL | ACTIVE | EXPIRED
PayoutStatus           = PENDING | TRANSFERRED
CatalogRequestStatus   = PENDING | APPROVED | REJECTED
UploadPurpose          = CUSTOMER_AVATAR | MEMBER_PHOTO | SALON_COVER | SALON_PROFILE | GALLERY_IMAGE | GALLERY_VIDEO
                       | SERVICE_MEDIA | LICENSE_DOCUMENT | CATALOG_IMAGE | BANNER_IMAGE | EXPORT
BannerAction           = NONE | SALON | EXTERNAL_URL
FullPaymentRefundRule  = FULL | MINUS_DEPOSIT
NoShowDepositRule      = KEEP | REFUND
NoShowFullPaymentRule  = KEEP | REFUND_MINUS_DEPOSIT | REFUND_FULL
DayOfWeek              = SAT | SUN | MON | TUE | WED | THU | FRI
```

---

## 3. Collections

Notation: `field: Type (rules)`; `?` = optional; `[]` = array; `→ coll` = reference.

### 3.1 Identity & sessions

**customers**
```
firstName: String (1–50, trimmed)        lastName: String (1–50)
email: String (valid, lowercase; not verified)
gender: Gender
phone: { countryCode: String (e.g. "JO"), dialCode: String ("+962"), number: String (national, digits), e164: String (unique) }
cityId → cities          areaId → areas
avatarKey?: String
language: Language (default ar)          pushEnabled: Boolean (default true)
status: CustomerStatus (default ACTIVE)
blockedReason?: String   blockedAt?: Date
deletionRequestedAt?: Date               deletionScheduledAt?: Date  (= requested + settings.accountDeletionGraceDays)
lastActiveAt?: Date
```
Indexes: `phone.e164` unique; `status`; `createdAt`; text index on names/phone for admin search.

**installations** (device/app instance; also identity link for analytics and push)
```
installationId: String (Firebase app instance ID; unique per app)
app: AppKind   platform: Platform   appVersion: String   osVersion?: String   deviceModel?: String
language: Language
fcmToken?: String   fcmTokenUpdatedAt?: Date
customerId?: → customers    memberId?: → members      // set on login, cleared on logout
lastSeenAt: Date
```
Indexes: `{app, installationId}` unique; `customerId`; `memberId`; `fcmToken`.

**refreshTokens**
```
subjectType: CUSTOMER | MEMBER | ADMIN   subjectId: ObjectId
installationId?: String
tokenHash: String (SHA-256; raw token never stored)
familyId: String (rotation chain)   replacedBy?: ObjectId
expiresAt: Date   revokedAt?: Date   revokedReason?: String
```
Rules: rotate on every refresh; reuse of a revoked token revokes the whole family. Revoke all on logout-all, block, member deactivation, account deletion.
Indexes: `tokenHash` unique; `{subjectType, subjectId}`; TTL on `expiresAt`.

**admins**
```
email: String (unique)   passwordHash: String (bcrypt)
failedLoginCount: Number   lockedUntil?: Date
alertEmails: String[]    lastLoginAt?: Date   lastLoginIp?: String
```

**OTP state (Redis, not Mongo)** — keys with TTL:
```
otp:req:{e164}          counter, TTL = settings.otp.requestWindowSec (300)
otp:wrong:{e164}        counter, TTL = settings.otp.blockSec
otp:block:{e164}        flag, TTL = settings.otp.blockSec (900)
otp:resend:{e164}       flag, TTL = settings.otp.resendAfterSec (60)
admin:otp:{adminId}     hashed code, TTL 300
```

### 3.2 Reference data

**countries** `{ code, name{ar,en}, dialCode, flagKey, phoneRegex, active, sortOrder }` — unique `code`.
**cities** `{ name{ar,en}, countryCode, active, sortOrder }`.
**areas** `{ cityId → cities, name{ar,en}, active, sortOrder }` — index `cityId`.

**catalogServices**
```
name{ar,en}  description{ar,en}  imageKey  gender: Gender  active: Boolean  sortOrder: Number
```
Index: `{gender, active, sortOrder}`; text on names.

**catalogRequests** `{ salonId, requestedByMemberId, name, description, imageKey?, status: CatalogRequestStatus, adminNote?, catalogServiceId? (set on approve) }`.

### 3.3 Salons

**salons**
```
name: String (1–80)   gender: Gender (immutable after approval except by admin)
state: SalonState
description?: String (≤1000)
coverKey?: String   profileKey?: String
location?: { type: "Point", coordinates: [lng, lat] }    locationText?: String
cityId?: → cities   areaId?: → areas
phone?: E164 String   whatsapp?: E164 String
weeklySchedule: [ { day: DayOfWeek, isOff: Boolean, open: "HH:mm", close: "HH:mm" } ] (exactly 7)
policy?: SalonPolicy (current, see below)
application: { submittedAt, reviewedAt?, reviewedBy? → admins, rejectionReason?, resubmissionCount: Number, documentKeys: String[] (private, 1–5) }
offline?: { reason: String, at: Date, by → admins }
completeness: { missing: String[], isComplete: Boolean }   // recomputed on every relevant write
rating: { avg: Number (1 decimal), count: Number }          // APPROVED salon reviews only
payoutDetails?: { bankName, accountHolderName, ibanEncrypted, ibanLast4 }   // AES-GCM, key from secrets
deletionRequestedAt?: Date
searchText: String (normalized Arabic/English name + area; for Atlas Search)
```
**SalonPolicy** (embedded; copied as snapshot into every booking)
```
cancellationWindowHours: Number (≥0, required)
paymentOptions: PaymentOption[] (≥1)
depositPercentage?: Number (1–100; required if DEPOSIT in options)
depositRefundableOnCustomerCancel: Boolean
fullPaymentRefundOnCustomerCancel: FullPaymentRefundRule
noShowDeposit: NoShowDepositRule
noShowFullPayment: NoShowFullPaymentRule
notes?: String
```
Indexes: `location` 2dsphere; `{state, gender}`; `{cityId, areaId}`; Atlas Search index on `searchText` (ar + en analyzers).

**salonClosures** `{ salonId, from: Date (date, Amman), to: Date (inclusive), reason: String }` — index `{salonId, to}`.

**galleryItems** `{ salonId, type: IMAGE|VIDEO, key, thumbnailKey?, durationSec?, order }` — index `{salonId, order}`.

**salonServices**
```
salonId → salons   catalogServiceId → catalogServices
price: Int (fils, >0)   durationMinutes: Int (≥5, multiple of 5)
brideOnly: Boolean (only allowed when salon.gender = FEMALE)
extraDescription?: String   mediaKeys: String[]
active: Boolean
```
Unique `{salonId, catalogServiceId}`; index `{catalogServiceId, active}` (search by service).

### 3.4 Team & staff

**members**
```
salonId → salons
firstName, lastName: String
phone: E164 (unique across members)
photoKey?: String
role: MemberRole            // exactly one OWNER per salon
permissions: Permission[]   // ignored for OWNER (has all)
active: Boolean
providesServices: Boolean
staff?: {                    // required when providesServices
  bio?: String   yearsOfExperience?: Int
  serviceIds: → salonServices[]
  brideQualified: Boolean (FEMALE salons only)
  workingDays: [ { day: DayOfWeek, start?: "HH:mm", end?: "HH:mm" } ]   // subset of salon open days; custom hours within salon hours
  rating: { avg, count }     customersCount: Int   // distinct customers with COMPLETED bookings served
}
```
Indexes: `phone` unique; `{salonId, active}`; `{salonId, providesServices, "staff.serviceIds"}`.

**staffLeaves** `{ memberId, salonId, from: Date, to: Date (inclusive, Amman dates), note? }` — index `{memberId, to}`.

### 3.5 Bookings & payments

**bookingDrafts** (pre-booking; TTL) — exists only between Summary and booking creation.
```
customerId, salonId, persons: BookingPerson[] (as below, priced), totals: { total, dueOnline }
paymentMethod: PaymentOption   policySnapshot: SalonPolicy
otpVerifiedAt?: Date   transactionId?: → transactions
holdKeys: String[]   // Redis slot-hold keys
expiresAt: Date (now + settings.booking.paymentHoldMinutes)
```
TTL index on `expiresAt`.

**bookings**
```
referenceNumber: String (unique, human-friendly, e.g. "WAB-" + 6–8 base32 chars)
customerId → customers   salonId → salons   salonGender: Gender
persons: [ BookingPerson ]  (1 main + ≤ settings.booking.maxCompanions)
appointmentStart: Date (min person start)   appointmentEnd: Date (max person end)
hasBride: Boolean
status: BookingStatus
statusHistory: [ { status, actorType: ActorType, actorId?, reason?, at } ]
paymentMethod: PaymentOption
money: { total: Int, dueOnline: Int, paidOnline: Int, remaining: Int, refunded: Int }   // fils
paymentStatus: PaymentStatus   refundStatus: RefundStatus
policySnapshot: SalonPolicy
rejection?: { reasonCode, reasonText?, at, by }   cancellation?: { by: ActorType, actorId?, reasonCode?, reasonText?, at }
respondBy: Date (appointmentStart + settings.booking.autoCancelAfterStartMinutes)
completedAt?: Date   noShowAt?: Date
ratingPromptSent: Boolean
```
**BookingPerson**
```
name: String   isMain: Boolean   isBride: Boolean
services: [ { salonServiceId, catalogServiceId, name{ar,en} (snapshot), price: Int (snapshot), durationMinutes (snapshot) } ]
staffId → members   staffSelection: SPECIFIC | ANY
start: Date   end: Date (start + Σ durations)   subtotal: Int
```
Indexes: `referenceNumber` unique; `{customerId, appointmentStart}`; `{salonId, appointmentStart}`; `{salonId, status}`; `{"persons.staffId", "persons.start", status}` (overlap checks); `{status, respondBy}`.

**transactions** (every payment attempt)
```
bookingDraftId?  bookingId?  customerId  salonId
type: TransactionType   amount: Int   currency: "JOD"
idempotencyKey: String (unique)   provider: String   providerRef?: String
status: TransactionStatus
gatewayCode?: String   gatewayMessage?: String   raw?: Object (redacted)
gatewayFee?: Int   platform: Platform   appVersion: String
```
Indexes: `idempotencyKey` unique; `{bookingId}`; `{status, createdAt}`; `{salonId, createdAt}`.

**refunds**
```
bookingId  transactionId  salonId  customerId
amount: Int   source: RefundSource   reason?: String
status: REFUND_PENDING | REFUNDED | REFUND_FAILED
idempotencyKey (unique)   providerRef?   attempts: Int   lastError?   completedAt?
manual?: { by → admins, reference: String }
```

**ledgerEntries** (salon balance; append-only)
```
salonId  type: CHARGE | GATEWAY_FEE | REFUND | PAYOUT | ADJUSTMENT
amount: Int (signed: CHARGE +, GATEWAY_FEE −, REFUND −, PAYOUT −)
bookingId?  transactionId?  refundId?  payoutId?  note?
```
Balance(salon) = Σ amount. Index `{salonId, createdAt}`.

**payouts** `{ salonId, periodFrom, periodTo, gross, fees, refunds, net, status: PayoutStatus, transferredAt?, transferReference?, note?, createdBy → admins }`.

**subscriptions** (1 per salon)
```
salonId (unique)   status: SubscriptionStatus
trialEndsAt: Date (approval date + settings.subscription.trialDays)
currentPeriodEnd?: Date
payments: [ { amount: Int, paidAt, periodFrom, periodTo, method, reference, note?, recordedBy → admins } ]
```

**recommendedPlacements** `{ salonId, gender, startAt, endAt, order, amountPaid: Int, note? }` — active when `startAt ≤ now < endAt`.

### 3.6 Social & content

**reviews**
```
target: ReviewTarget   salonId   staffId? (if STAFF)   customerId   bookingId?
rating: Int (1–5)   comment?: String (≤1000)
status: ReviewStatus   moderation?: { by → admins, at, reason? }
```
Index `{salonId, target, status, createdAt}`; `{staffId, status, createdAt}`; `{status, createdAt}` (admin queue).

**favorites** `{ customerId, salonId }` unique pair.

**notifications** (in-app list; one doc per recipient)
```
recipientType: CUSTOMER | MEMBER | ADMIN   recipientId
type: NotificationType   event: String (e.g. "booking.approved")
title{ar,en}  body{ar,en}  data: { bookingId?, salonId?, deepLink? }
readAt?: Date   pushSent: Boolean   pushResult?: String
```
Index `{recipientType, recipientId, createdAt}`; `{recipientType, recipientId, readAt}`.

**pushCampaigns** `{ title{ar,en}, body{ar,en}, app, audience: { kind, gender?, cityIds?, salonId?, customerIds? }, link?, scheduledAt?, sentAt?, stats: { targeted, sent, delivered, opened, failed }, createdBy }`.

**banners** `{ imageKey{ar,en}, action: BannerAction, actionValue?, gender: MALE|FEMALE|BOTH, startAt, endAt, order, active }`.
**contentPages** `{ app: AppKind, kind: PRIVACY|TERMS|ABOUT, body{ar,en} }` · **faqs** `{ app, question{ar,en}, answer{ar,en}, order }` · **contactInfo** `{ app, phone, whatsapp, email }`.
**appVersions** `{ app, platform, latest, minSupported, optionalUpdate: Boolean, storeUrl }` · **maintenance** `{ app, enabled, message{ar,en} }`.

### 3.7 Operations

**settings** (key/value; cached in Redis; defaults below in §10).
**auditLogs** `{ adminId, action, entityType, entityId, before?, after?, reason, ip, userAgent }` — append-only, never updated.
**serverEvents** (time-series) `{ ts, name, actorType, actorId?, salonId?, bookingId?, params, platform?, appVersion? }`.
**alerts** `{ kind, severity, title, entityType?, entityId?, data, status: NEW|ACKNOWLEDGED, emailedAt? }`.
**exports** `{ kind, params, status: QUEUED|RUNNING|DONE|FAILED, fileKey?, requestedBy, finishedAt? }`.
**uploads** `{ key, purpose: UploadPurpose, ownerType, ownerId, contentType, maxBytes, status: PENDING|CONFIRMED|REJECTED, expiresAt }` — TTL for PENDING.

---

## 4. Relationships (summary)

```
country 1─* city 1─* area
salon 1─* member (1 OWNER) ; member(providesServices) 1─* staffLeave
salon 1─* salonService *─1 catalogService ; member.staff.serviceIds *─* salonService
salon 1─* salonClosure, galleryItem, booking, review, ledgerEntry, payout ; salon 1─1 subscription
customer 1─* booking, review, favorite, installation, refreshToken
booking 1─* transaction, refund ; booking.persons[*].staffId → member
```

---

## 5. Computed Rules

### 5.1 Time
- All instants stored UTC. Business dates and hours are **Asia/Amman** (`settings.timezone`). Schedule strings `HH:mm` are Amman local time.
- Day boundaries for closures/leaves/slots use Amman dates.

### 5.2 Salon completeness → state
`missing[]` contains any of: `COVER`, `PROFILE_IMAGE`, `NAME`, `DESCRIPTION`, `LOCATION`, `PHONE`, `WORKING_HOURS` (≥1 open day), `SERVICE` (≥1 active salonService), `STAFF` (≥1 active member with providesServices, ≥1 service, ≥1 working day), `POLICY` (policy present & valid).
- On admin approval: state = `LIVE` if complete else `APPROVED_INCOMPLETE`.
- On any write while `APPROVED_INCOMPLETE`: if complete → `LIVE` (notify owner "salon live").
- If a `LIVE` salon becomes incomplete (e.g., last service deactivated): stays `LIVE` but blocked from **new** bookings with error `SALON_NOT_BOOKABLE`; owner notified. (Assumption — keeps existing bookings safe.)
- `OFFLINE` only by admin; back to `LIVE`/`APPROVED_INCOMPLETE` by admin.
- **Customer-visible** ⇔ `state = LIVE` and complete.

### 5.3 Open/closed & today's hours
For an Amman date D: closed if a `salonClosure` covers D or `weeklySchedule[day(D)].isOff`; otherwise open between `open`–`close`. `isOpenNow` = open today and now ∈ [open, close).

### 5.4 Availability (slots)
Input: salonId, date D, services per person, isBride, optional staffId.
1. Reject if D < today or D > today + `booking.maxDaysAhead` (90), or salon closed on D.
2. `duration` = Σ service durations. Candidate starts = every `booking.slotMinutes` (15) from `open` while `start + duration ≤ close`; drop starts < now + `booking.minLeadMinutes` (0) for today.
3. Eligible staff for the person: active, providesServices, works on day(D) (custom hours ⊆ salon hours), no leave covering D, `serviceIds ⊇ selected services`, `brideQualified` if isBride, and if a service is `brideOnly` the person must be a bride.
4. Staff busy intervals = persons of bookings with status `PENDING|APPROVED` on D + active Redis payment holds + other persons in the same draft.
5. Slot is available if ≥1 eligible staff has `[start, start+duration)` free inside their working hours. Return per slot: `available`, `eligibleStaffIds`.
6. "Any available staff" → choose the eligible free staff with the fewest bookings that day (tie → lowest `_id`).

### 5.5 Pricing & amounts (fils)
- `person.subtotal` = Σ price snapshots; `total` = Σ subtotals.
- `deposit` = round_half_up(total × depositPercentage / 100) to 1 fils (assumption: rounding to whole fils).
- `dueOnline` = DEPOSIT → deposit; FULL_ONLINE → total; PAY_ON_ARRIVAL → 0.
- `remaining` = total − paidOnline (+ refunded adjustments shown separately).

### 5.6 Booking creation (atomic)
1. `POST draft` → validate gender, companions ≤ max, services active and belong to salon, bride rules, availability per person; price snapshot; policy snapshot; create **Redis holds** `hold:{staffId}:{start}` with TTL `booking.paymentHoldMinutes` (10) → `bookingDrafts`.
2. OTP (purpose `BOOKING_CONFIRMATION`) → `otpVerifiedAt`.
3. If `dueOnline > 0`: create transaction (idempotency key = draftId + attempt) → client pays → server **verifies** with gateway (webhook or status query). Failure/cancel → transaction FAILED, draft stays until expiry, client returns to Summary.
4. Create booking inside a **Mongo transaction + Redis lock per staffId**: re-check overlaps; insert booking `PENDING` with `statusHistory[0]`; mark transaction SUCCEEDED + `bookingId`; ledger `CHARGE` (+ `GATEWAY_FEE` when known); set `paymentStatus` (DEPOSIT_PAID / FULLY_PAID / PAY_ON_ARRIVAL); release holds; delete draft.
5. If step 4 fails after a successful payment (slot taken) → immediate full refund (`source: SALON_REJECT` with reason `SLOT_UNAVAILABLE`) and error `SLOT_TAKEN`.
6. Side effects: notifications (customer "pending", merchant request), socket events, schedule jobs (§9).

### 5.7 Booking state machine

| From | To | Actor (permission) | Preconditions | Side effects |
|---|---|---|---|---|
| — | PENDING | CUSTOMER | §5.6 | notify customer + members(BOOKINGS_RESPOND); jobs |
| PENDING | APPROVED | MEMBER (BOOKINGS_RESPOND) / ADMIN | re-check staff free | notify customer; schedule reminders |
| PENDING | REJECTED | MEMBER (BOOKINGS_RESPOND) / ADMIN | reasonCode required | full refund of paidOnline; notify |
| PENDING | CANCELLED_BY_CUSTOMER | CUSTOMER | any time | full refund; notify salon |
| PENDING | AUTO_CANCELLED | SYSTEM | now ≥ respondBy | full refund; notify both |
| APPROVED | CANCELLED_BY_CUSTOMER | CUSTOMER | now < appointmentStart − cancellationWindowHours | refund per §5.8; notify salon |
| APPROVED | CANCELLED_BY_SALON | MEMBER (BOOKINGS_OPERATE) / ADMIN | now < appointmentStart; reason required | full refund; notify customer |
| APPROVED | COMPLETED | MEMBER (BOOKINGS_OPERATE) / ADMIN | now ≥ appointmentStart | paymentStatus = PAID; increment staff customersCount; prompt rating |
| APPROVED | NO_SHOW | MEMBER (BOOKINGS_OPERATE) / ADMIN | now ≥ appointmentStart | refund per §5.9; notify customer |
| any | any | ADMIN | reason required; warning if irregular | audit log; notify both |

Every transition appends to `statusHistory`, emits socket `booking.updated`, writes a server event, and cancels/reschedules jobs. Reassign staff (APPROVED, MEMBER BOOKINGS_OPERATE/ADMIN): new staff must pass §5.4 for that person; notify customer + old/new staff.

### 5.8 Customer cancellation refund (APPROVED, within window)
- DEPOSIT paid: refund = deposit if `depositRefundableOnCustomerCancel` else 0.
- FULL paid: refund = total if `FULL`, else total − deposit(policy %) (if no deposit % defined → total).
- PAY_ON_ARRIVAL: nothing.
Outside window → error `CANCELLATION_WINDOW_PASSED`.

### 5.9 No-show refund
- DEPOSIT: KEEP → 0; REFUND → deposit.
- FULL: KEEP → 0; REFUND_MINUS_DEPOSIT → total − deposit; REFUND_FULL → total.

### 5.10 Refund processing
Create `refunds` (REFUND_PENDING) → `wab-payments.refund` (idempotent) → REFUNDED (ledger `REFUND −amount`, booking `money.refunded`, `refundStatus`) or REFUND_FAILED (retry with backoff ×`refund.maxRetries`, then admin alert). Pending > `refund.delayAlertHours` (48) → alert.

### 5.11 Ratings
- Salon `rating` and each staff `rating` = average of APPROVED reviews of that target (1 decimal) + count; recompute on approve/reject/remove.
- Any ACTIVE customer may review any LIVE salon or its staff (no booking required). Rate limit: `reviews.maxPerTargetPerCustomer` (assumption 1 active PENDING per target).

### 5.12 Conflicts on schedule/team changes
Before saving weekly hours, closures, leaves, staff deactivation, removing `providesServices`, removing a service from staff, or reducing working days: compute upcoming PENDING/APPROVED bookings that would violate §5.4. Return them (`409 SCHEDULE_CONFLICT` with list). Client chooses: cancel affected (PENDING→REJECTED, APPROVED→CANCELLED_BY_SALON, reason from change, full refunds) or reassign (per booking) or abort.

### 5.13 Subscriptions & placements
- On approval: create subscription TRIAL, `trialEndsAt` = approval + `subscription.trialDays` (90).
- Daily job: TRIAL past end with no period → EXPIRED; ACTIVE past `currentPeriodEnd` → EXPIRED; alert admin at T−7 days and on expiry. Admin decides OFFLINE (not automatic).
- Recording a payment sets ACTIVE and `currentPeriodEnd` = max(existing, periodTo).
- Recommended section = active placements for the gender, ordered by `order`, salons must be customer-visible.

### 5.14 Payouts (manual, Phase 1)
Net due = Σ ledger since last payout. Admin creates payout (period, computed gross/fees/refunds/net), records transfer → ledger `PAYOUT −net`, status TRANSFERRED, notify owner + FINANCE_VIEW members.

### 5.15 Account deletion
Customer: `DELETION_PENDING`, tokens revoked, `deletionScheduledAt` = +30 days; login within grace restores ACTIVE; job anonymizes after grace (keep bookings/transactions for accounting with anonymized customer). Member (non-owner): access removed (active=false). Owner: `salon.deletionRequestedAt` → admin handles.

---

## 6. Permissions Matrix (merchant)

| Capability / endpoint group | Permission |
|---|---|
| Dashboard | DASHBOARD_VIEW |
| List/view all bookings, full calendar | BOOKINGS_VIEW_ALL |
| List/view own bookings, own calendar column | BOOKINGS_VIEW_OWN |
| Approve/reject + receive request alerts | BOOKINGS_RESPOND |
| Complete, no-show, salon cancel, reassign | BOOKINGS_OPERATE |
| Profile, location, contacts | SALON_PROFILE_MANAGE |
| Gallery | GALLERY_MANAGE |
| Weekly hours, closures | WORKING_HOURS_MANAGE |
| Services, catalog requests | SERVICES_MANAGE |
| Staff profiles, skills, schedules, leaves | STAFF_MANAGE |
| Policies | POLICIES_MANAGE |
| Reviews | REVIEWS_VIEW |
| Statistics | STATISTICS_VIEW |
| Transactions, refunds, payouts, balance | FINANCE_VIEW |
| Subscription & state | SUBSCRIPTION_VIEW |
| Members, roles, permissions | OWNER only (TEAM_MANAGE) |
| Bank details | OWNER only (PAYOUT_DETAILS_MANAGE) + OTP |
| Salon deletion request | OWNER only |

Default templates: MANAGER = all grantable except FINANCE_VIEW, POLICIES_MANAGE; EMPLOYEE = BOOKINGS_VIEW_OWN, REVIEWS_VIEW. Enforced on REST, socket rooms/events and notification recipients. Permission change → silent push + socket `permissions.updated`.

---

## 7. Real-time Events (Socket.IO)

| Room | Event | Payload | Recipients |
|---|---|---|---|
| `customer:{id}` | `booking.updated` | booking summary | booking customer |
| `customer:{id}` | `notifications.unread` | `{count}` | customer |
| `salon:{id}:respond` | `booking.requested` | request card | members with BOOKINGS_RESPOND |
| `salon:{id}:all` | `booking.updated` | booking summary | members with BOOKINGS_VIEW_ALL |
| `member:{id}` | `booking.updated` / `booking.assigned` | booking summary | assigned staff (VIEW_OWN) |
| `member:{id}` | `permissions.updated` / `access.revoked` | `{}` | member |
| `admin` | `booking.updated`, `application.created`, `review.created`, `refund.updated`, `alert.created`, `overview.tick` | summaries | admin |

---

## 8. Notifications (events → recipients)

| Event | Customer | Merchant (permission) | Admin email |
|---|---|---|---|
| booking.created (pending) | ✔ | ✔ request (RESPOND) | — |
| booking.approved / rejected / cancelled_by_salon / auto_cancelled | ✔ | ✔ (VIEW_ALL + assigned) for auto-cancel | — |
| booking.cancelled_by_customer | ✔ confirmation | ✔ (VIEW_ALL + assigned) | — |
| booking.reminder_1h / reminder_15m | ✔ | ✔ assigned staff (1h) | — |
| booking.pending_30m | ✔ | ✔ (RESPOND) | — |
| booking.completed (rate) / no_show | ✔ | — | — |
| booking.reassigned | ✔ | ✔ old/new staff | — |
| refund.pending / refunded | ✔ | in-app (FINANCE_VIEW) | refund failed/delayed |
| review.published | — | ✔ (REVIEWS_VIEW / staff) | review.created → pending |
| application.approved / rejected | — | ✔ owner | application.created |
| catalog_request.decided | — | ✔ (SERVICES_MANAGE) | catalog_request.created |
| payout.transferred | — | ✔ owner + FINANCE_VIEW | — |
| subscription.ending_7d / expired, salon.offline / live | — | ✔ owner | subscription ending/trial ended |
| payment.failed spike, 5xx/crash spike | — | — | ✔ |
| promotion | ✔ | — | — |

Push respects `pushEnabled`; in-app notification is always stored.

---

## 9. Scheduled Jobs (BullMQ; job IDs deterministic so they can be removed)

| Job | When | Action |
|---|---|---|
| `booking:reminder:{id}:60` | start − 60 min (APPROVED) | notify customer + staff |
| `booking:reminder:{id}:15` | start − 15 min (APPROVED) | notify customer |
| `booking:pending-alert:{id}` | start − 30 min (if PENDING) | notify customer + RESPOND members |
| `booking:auto-cancel:{id}` | respondBy (if PENDING) | AUTO_CANCELLED + full refund |
| `draft:expire` | TTL | release holds |
| `refund:retry:{id}` | backoff | retry refund |
| daily `subscriptions:check` | 09:00 Amman | trial/expiry transitions + alerts |
| daily `placements:expire` | 00:05 Amman | hide expired recommended |
| daily `accounts:purge` | 03:00 Amman | anonymize customers past grace |
| every 5 min `alerts:evaluate` | — | thresholds (§10) |
| nightly `reports:aggregate` | 02:00 Amman | daily aggregates |

On any status change: remove jobs that no longer apply; schedule new ones.

---

## 10. Settings (keys & defaults; admin-editable)

```
timezone = "Asia/Amman"                     currency = "JOD"
discovery.nearbyRadiusKm = 10
booking.slotMinutes = 15                    booking.maxDaysAhead = 90
booking.maxCompanions = 5                   booking.minLeadMinutes = 0
booking.paymentHoldMinutes = 10             booking.autoCancelAfterStartMinutes = 60
booking.pendingAlertBeforeMinutes = 30      booking.reminderMinutes = [60, 15]
otp.length = 6                              otp.resendAfterSec = 60
otp.maxRequests = 5   otp.requestWindowSec = 300   otp.maxWrong = 5   otp.blockSec = 900
auth.accessTokenTtlSec = 900                auth.refreshTokenTtlDays = 90
admin.maxFailedLogins = 5   admin.lockSec = 900   admin.sessionIdleSec = 1800
account.deletionGraceDays = 30
subscription.trialDays = 90                 subscription.warnDaysBefore = 7
refund.maxRetries = 5                       refund.delayAlertHours = 48
reviews.maxPendingPerTargetPerCustomer = 1
pagination.appPageSize = 10   pagination.adminPageSize = 25
uploads.imageMaxMb = 10   uploads.videoMaxMb = 50   uploads.videoMaxSec = 60   uploads.docMaxMb = 10   uploads.docMaxFiles = 5
alerts.paymentFailures = { count: 5, windowMin: 15, ratePct: 20, rateWindowMin: 60 }
alerts.api5xxRatePct = 2 (window 10 min)    alerts.crashesPerHour = 10
```

---

## 11. Error Codes (API `code` field)

```
VALIDATION_ERROR  UNAUTHORIZED  FORBIDDEN  PERMISSION_DENIED  NOT_FOUND  CONFLICT  RATE_LIMITED  INTERNAL
OTP_BLOCKED  OTP_INVALID  OTP_EXPIRED  PHONE_NOT_REGISTERED  PHONE_ALREADY_REGISTERED  ACCOUNT_BLOCKED  MEMBER_INACTIVE
SALON_NOT_FOUND  SALON_NOT_BOOKABLE  SALON_CLOSED  GENDER_MISMATCH  TOO_MANY_COMPANIONS
SERVICE_UNAVAILABLE  BRIDE_ONLY_SERVICE  STAFF_NOT_ELIGIBLE  SLOT_UNAVAILABLE  SLOT_TAKEN  DATE_OUT_OF_RANGE
PAYMENT_FAILED  PAYMENT_NOT_VERIFIED  PAYMENT_OPTION_NOT_ALLOWED  DRAFT_EXPIRED
INVALID_TRANSITION  CANCELLATION_WINDOW_PASSED  TOO_EARLY_TO_COMPLETE  ALREADY_HANDLED
SCHEDULE_CONFLICT  OWNER_REQUIRED  LAST_OWNER  UPLOAD_INVALID  UPLOAD_TOO_LARGE
MAINTENANCE  UPDATE_REQUIRED
```

---

## 12. Open Points (assumptions in use — confirm or change)
1. Money in integer fils; deposit rounded half-up to 1 fils.
2. LIVE salon that becomes incomplete stays visible but cannot take new bookings.
3. One pending review per customer per target at a time.
4. "Any available staff" picks the least-loaded eligible staff that day.
5. Payment hold during checkout: 10 minutes.
6. Reference number format `WAB-XXXXXX` (base32, no ambiguous chars).
