# WAB — Business Domain Specification (single source for server schemas & business logic)

> **What this is:** the whole business consolidated into one implementable spec: entities and fields, enums, relations, indexes, state machines, algorithms, money rules, permissions, notifications, jobs, settings and error codes.
> **Who uses it:** WAB-Server (schemas, services, rules), the generated OpenAPI contract (`INTEGRATION.md` §3), and all clients for shared enums/rules.
> **Sources:** consolidated from the Customer, Merchant and Admin PRDs and BRDs, the Backend BRD, the package BRDs and `CLAUDE.md`. If this file conflicts with a PRD on **screen behavior**, the PRD wins. If it conflicts on **data/rules**, raise it and fix both.
> **Branches (owner decisions 2026-10-25):** a salon (the brand) has one or more **branches**; location, contacts, hours, closures, services/prices and staff belong to a branch; name, gender, logo/cover/gallery, description, policy, subscription, payouts, rating and Recommended placement stay salon-wide. See §3.3a, §5.2, §5.16–§5.18 and decision log §12.
> **Business types (owner decisions 2026-10-29):** a business is a **SALON** or a **CLINIC** (beauty clinic: botox, filler, laser…). Salons serve men, women or **both** (`audience`); clinics are always for everyone (`audience = BOTH`). Clinics work exactly like salons (branches, staff, services, booking flow, subscription, placements) but have their own catalog categories, home sections and a required medical license. See §3.3, §5.4, §5.17, §5.19 and decision log §12.10.
> **Conventions:** MongoDB + Mongoose; `_id` ObjectId; timestamps `createdAt`/`updatedAt` (UTC) on every collection; money stored as **integer fils** (1 JOD = 1000 fils) to avoid float errors and exposed in the API as a decimal string with 3 decimals; localized admin-managed text as `{ ar, en }`; files stored as **storage keys** (never full URLs); soft-delete via status fields, not physical deletes, unless stated.

---

## 1. Actors & Identities

| Actor | Collection | Login | Token scope |
|---|---|---|---|
| Guest | none (device only) | — | none (public endpoints) |
| Customer | `customers` | phone + WhatsApp OTP via ARQAM (§3.1a) | `customer` |
| Merchant member (Owner / Manager / Employee) | `members` | phone + WhatsApp OTP via ARQAM (§3.1a) | `merchant` (+ `salonId`, permissions) |
| Admin (single) | `admins` | email + password + email OTP | `admin` |
| System | — | — | used as `actor: SYSTEM` in histories |

A phone number belongs to at most one customer and, separately, at most one member (a person may be both; the accounts are unrelated).

---

## 2. Enums (shared by server, contracts and clients)

```
Gender                 = MALE | FEMALE                       // a person (customer, booking person)
BusinessType           = SALON | CLINIC                      // what the business is (immutable after the application)
Audience               = MALE | FEMALE | BOTH                // who a business serves; CLINIC is always BOTH
Language               = ar | en
AppKind                = CUSTOMER | MERCHANT
Platform               = ANDROID | IOS | WEB
CustomerStatus         = ACTIVE | BLOCKED | DELETION_PENDING | DELETED
SalonState             = APPLICATION_PENDING | APPLICATION_REJECTED | APPROVED_INCOMPLETE | LIVE | OFFLINE
MemberRole             = OWNER | MANAGER | EMPLOYEE
BranchStatus           = ACTIVE | OFFLINE | CLOSED      // CLOSED = deactivated, kept for history, never deleted
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
                       | SERVICE_MEDIA | LICENSE_DOCUMENT | MEDICAL_LICENSE | CATALOG_IMAGE | BANNER_IMAGE | EXPORT
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
otp:code:{purpose}:{e164}  HMAC of the sent code, TTL = settings.otp.codeTtlSec (300); deleted on success
otp:used:{jti}          flag, TTL = settings.otp.proofTtlSec (600) — an OTP proof is single-use
admin:otp:{adminId}     hashed code, TTL 300
```

**3.1a Phone OTP over WhatsApp through ARQAM OTP (owner decisions 2026-10-26; replaces Firebase Phone Auth; the direct Meta Cloud API channel is removed)**
1. The **server** generates the code (`settings.otp.length` digits, CSPRNG), stores only its HMAC (`otp:code:{purpose}:{e164}`), and hands it to **ARQAM OTP** (`POST https://otp.arqam.tech/api/sms/otp`, our code as `otpCode`), which delivers it over WhatsApp from ARQAM's approved sender with an approved **authentication template**; the template is chosen by the user's language (`ar` / `en`, from `Accept-Language`; one ARQAM template per language). ARQAM's own verify endpoint is not used: the server checks the code itself. The code and the ARQAM key are never logged or returned.
2. `POST /{customer|merchant}/v1/auth/otp/request {phone, purpose}`: the existing limits (§10 `otp.*`: 5 requests / 5 min, resend after 60 s, block 15 min) run first; then the code is sent. Answer = `{allowed, otpLength, resendAfterSeconds, expiresInSeconds, blockedUntil?}`.
3. `POST /{customer|merchant}/v1/auth/otp/verify {phone, purpose, code}`: wrong code → `OTP_INVALID` (counts toward `otp.maxWrong`, then `OTP_BLOCKED`); expired / no code → `OTP_EXPIRED`; right code → the code is deleted and the answer carries `otpToken` = a short-lived signed proof `{phone (E.164), purpose, jti}` valid `settings.otp.proofTtlSec`.
4. Every action that needs a verified phone (login, register, change phone, booking confirmation, bank details) takes `otpToken` instead of the former Firebase ID token; the server checks signature, expiry, phone, purpose and single use (`otp:used:{jti}`).
5. Delivery failure = ARQAM's synchronous answer only (ARQAM webhooks carry no OTP statuses; there is no delivery-status endpoint): `INVALID_PHONE` or `PROVIDER_ERROR` (WhatsApp refused the recipient) → `OTP_DELIVERY_FAILED` (422, no code stored, the request still counts); key, credits, sender, template or ARQAM rate limits/outages → 503 `ExternalServiceError` + a server `error` log for the owner (no admin alert kind: adding one would change the admin contract).
6. Development: `OTP_PROVIDER=fake` keeps working (codes recorded, optional fixed code, dev only, refused in production); the hosted dev API uses ARQAM with a **test** key (every code goes to the key's own test phone); production uses a **live** key. Admin email OTP is unchanged.

### 3.2 Reference data

**countries** `{ code, name{ar,en}, dialCode, flagKey, phoneRegex, active, sortOrder }` — unique `code`.
**cities** `{ name{ar,en}, countryCode, active, sortOrder }`.
**areas** `{ cityId → cities, name{ar,en}, active, sortOrder }` — index `cityId`.

**catalogServices**
```
name{ar,en}  description{ar,en}  imageKey  businessType: BusinessType  audience: Audience  active: Boolean  sortOrder: Number
// a catalog service (category) belongs to one business type; a SALON service has audience MALE|FEMALE|BOTH, a CLINIC service is BOTH;
// a business can only use catalog services of its own businessType whose audience fits its own audience (BOTH fits all)
```
Index: `{businessType, audience, active, sortOrder}`; text on names.

**catalogRequests** `{ salonId, requestedByMemberId, name, description, imageKey?, status: CatalogRequestStatus, adminNote?, catalogServiceId? (set on approve) }`.

### 3.3 Salons

**salons**
```
name: String (1–80)
businessType: BusinessType (chosen in the application; immutable)
audience: Audience (SALON: MALE | FEMALE | BOTH chosen in the application; CLINIC: always BOTH)
// `gender` (MALE|FEMALE) is migrated to `audience` with businessType = SALON (§5.19); audience changes: §5.19
state: SalonState
description?: String (≤1000)
coverKey?: String   profileKey?: String
// location, locationText, cityId, areaId, phone, whatsapp and weeklySchedule MOVED to branches (§3.3a)
mainBranchId?: → branches        // the salon's main branch (always one once the first branch exists)
branchCount: Int                 // non-CLOSED branches (denormalized for cards)
policy?: SalonPolicy (current, see below; salon-wide, applies to every branch)
application: { submittedAt, reviewedAt?, reviewedBy? → admins, rejectionReason?, resubmissionCount: Number, documentKeys: String[] (private, 1–5) }
offline?: { reason: String, at: Date, by → admins }
completeness: { missing: String[], isComplete: Boolean }   // salon-level items only (§5.2); recomputed on every relevant write
rating: { avg: Number (1 decimal), count: Number }          // APPROVED salon reviews of ALL branches together
payoutDetails?: { bankName, accountHolderName, ibanEncrypted, ibanLast4 }   // AES-GCM, key from secrets
deletionRequestedAt?: Date    deletionApprovedAt?: Date   (admin approved: salon OFFLINE, waits for the purge; a rejection clears deletionRequestedAt)
searchText: String (normalized Arabic/English salon name + branch names/areas; for Atlas Search)
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
Indexes: `{state, businessType, audience}`; Atlas Search index on `searchText` (ar + en analyzers). (Geo and city/area indexes are on `branches`.)

**branches** (§5.16)
```
salonId → salons
name: { ar, en } (1–60 each)          // e.g. { ar: "شارع مكة", en: "Mecca Street" }
isMain: Boolean                       // exactly one per salon
status: BranchStatus
location: { type: "Point", coordinates: [lng, lat] }    locationText: String
cityId → cities   areaId → areas
phone: E164 String   whatsapp?: E164 String
weeklySchedule: [ { day: DayOfWeek, isOff: Boolean, open: "HH:mm", close: "HH:mm" } ] (exactly 7)
offline?: { reason: String, at: Date, actorType: ADMIN | MEMBER, by }   // admin or owner
completeness: { missing: String[], isComplete: Boolean }   // branch-level items (§5.2)
closedAt?: Date   closedBy?
```
Indexes: `location` 2dsphere; `{salonId, status}`; `{cityId, areaId}`; partial unique `{salonId}` where `isMain = true`.

**salonClosures** `{ salonId, branchId → branches, from: Date (date, Amman), to: Date (inclusive), reason: String }` — index `{branchId, to}`. Closures are per branch.

**galleryItems** `{ salonId, type: IMAGE|VIDEO, key, thumbnailKey?, durationSec?, order }` — index `{salonId, order}`.

**salonServices** (per branch: each branch picks its own services, prices and durations)
```
salonId → salons   branchId → branches   catalogServiceId → catalogServices
price: Int (fils, >0)   durationMinutes: Int (≥5, multiple of 5)
brideOnly: Boolean (only allowed when businessType = SALON and audience ∈ {FEMALE, BOTH})
extraDescription?: String   mediaKeys: String[]
active: Boolean
```
Unique `{branchId, catalogServiceId}`; index `{catalogServiceId, active}` (search by service); `{salonId, active}`.

### 3.4 Team & staff

**members**
```
salonId → salons
branchId?: → branches       // required for MANAGER and EMPLOYEE (exactly one branch); absent for OWNER (all branches)
firstName, lastName: String
phone: E164 (unique across members)
photoKey?: String
role: MemberRole            // exactly one OWNER per salon
permissions: Permission[]   // ignored for OWNER (has all)
active: Boolean
pushEnabled: Boolean (default true)   // M25 toggle (SRV-129); push respects it (§8), in-app is always stored
providesServices: Boolean
staff?: {                    // required when providesServices
  bio?: String   yearsOfExperience?: Int
  serviceIds: → salonServices[]   // services of the member's own branch only
  brideQualified: Boolean (SALON with audience FEMALE or BOTH only)
  workingDays: [ { day: DayOfWeek, start?: "HH:mm", end?: "HH:mm" } ]   // subset of the branch's open days; custom hours within branch hours
  rating: { avg, count }     customersCount: Int   // distinct customers with COMPLETED bookings served
}
```
Indexes: `phone` unique; `{salonId, active}`; `{branchId, active}`; `{branchId, providesServices, "staff.serviceIds"}`.

**staffLeaves** `{ memberId, salonId, branchId, from: Date, to: Date (inclusive, Amman dates), note? }` — index `{memberId, to}`.

### 3.5 Bookings & payments

**bookingDrafts** (pre-booking; TTL) — exists only between Summary and booking creation.
```
customerId, salonId, branchId, persons: BookingPerson[] (as below, priced), totals: { total, dueOnline }
paymentMethod: PaymentOption   policySnapshot: SalonPolicy
otpVerifiedAt?: Date   transactionId?: → transactions
holdKeys: String[]   // Redis slot-hold keys
expiresAt: Date (now + settings.booking.paymentHoldMinutes)
```
TTL index on `expiresAt`.

**bookings**
```
referenceNumber: String (unique, human-friendly, e.g. "WAB-" + 6–8 base32 chars)
customerId → customers   salonId → salons   businessType: BusinessType   salonAudience: Audience   // snapshots (replace salonGender)
branchId → branches   branchSnapshot: { name: {ar,en}, locationText, phone }   // copied at creation
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
Indexes: `referenceNumber` unique; `{customerId, appointmentStart}`; `{salonId, appointmentStart}`; `{branchId, appointmentStart}`; `{branchId, status}`; `{salonId, status}`; `{"persons.staffId", "persons.start", status}` (overlap checks); `{status, respondBy}`.

**transactions** (every payment attempt)
```
bookingDraftId?  bookingId?  customerId  salonId  branchId   // branchId lets the owner filter finance by branch
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

**recommendedPlacements** `{ salonId, businessType, audience, startAt, endAt, order, amountPaid: Int, note? }` (businessType/audience copied from the salon) — active when `startAt ≤ now < endAt`.

### 3.6 Social & content

**reviews**
```
target: ReviewTarget   salonId   branchId? (from the booking, or chosen by the customer; shown as a label)   staffId? (if STAFF)   customerId   bookingId?
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
**alerts** `{ kind, severity, title{ar,en}, entityType?: SALON|REFUND|REVIEW|CATALOG_REQUEST, entityId?, data, status: NEW|ACKNOWLEDGED, emailedAt? }` — the title comes from the locale files of its `kind`; admin answers carry `title` in the request language plus `titles{ar,en}`; the live `alert.created` event uses the default language (ar) plus `titles`. `entityType` is always the uppercase value (SRV-150).
**exports** `{ kind, params, status: QUEUED|RUNNING|DONE|FAILED, fileKey?, requestedBy, finishedAt? }`.
**uploads** `{ key, purpose: UploadPurpose, ownerType, ownerId, contentType, maxBytes, status: PENDING|CONFIRMED|REJECTED, expiresAt }` — TTL for PENDING.

---

## 4. Relationships (summary)

```
country 1─* city 1─* area
salon 1─* branch (1 main) ; salon 1─1 member OWNER ; branch 1─* member (MANAGER/EMPLOYEE) ; member(providesServices) 1─* staffLeave
branch 1─* salonService *─1 catalogService ; member.staff.serviceIds *─* salonService (same branch)
branch 1─* salonClosure, booking ; salon 1─* galleryItem, review, ledgerEntry, payout ; salon 1─1 subscription
customer 1─* booking, review, favorite, installation, refreshToken
booking 1─* transaction, refund ; booking.persons[*].staffId → member
```

---

## 5. Computed Rules

### 5.1 Time
- All instants stored UTC. Business dates and hours are **Asia/Amman** (`settings.timezone`). Schedule strings `HH:mm` are Amman local time.
- Day boundaries for closures/leaves/slots use Amman dates.

### 5.2 Salon and branch completeness → state
Two levels:
- **Salon** `missing[]` (salon-wide items): `COVER`, `PROFILE_IMAGE`, `NAME`, `DESCRIPTION`, `POLICY` (present & valid), `BRANCH` (≥1 branch that is ACTIVE and complete).
- **Branch** `missing[]`: `LOCATION`, `PHONE`, `WORKING_HOURS` (≥1 open day), `SERVICE` (≥1 active salonService of the branch), `STAFF` (≥1 active member of the branch with providesServices, ≥1 service, ≥1 working day).
- The salon's `missing[]` names the **main branch's** gaps when no branch is bookable (so a single-branch salon's checklist reads as before: `LOCATION`, `SERVICE`…); `BRANCH` appears only when none applies (no main branch yet, or it is complete but offline).
- On admin approval: state = `LIVE` if the salon is complete else `APPROVED_INCOMPLETE`.
- On any write while `APPROVED_INCOMPLETE`: if complete → `LIVE` (notify owner "salon live").
- New branches need **no admin approval**: a branch becomes bookable as soon as it is ACTIVE and complete (notify owner "branch live").
- If a `LIVE` salon or a bookable branch becomes incomplete (e.g., the branch's last service deactivated): it stays visible but **new** bookings are refused with `SALON_NOT_BOOKABLE` / `BRANCH_NOT_BOOKABLE`; owner notified. (Assumption — keeps existing bookings safe.)
- Salon `OFFLINE` only by admin; back to `LIVE`/`APPROVED_INCOMPLETE` by admin. Branch `OFFLINE` by admin **or owner** (the other branches stay bookable); back to ACTIVE by the same roles. Upcoming bookings of an offline salon/branch are kept.
- **Customer-visible salon** ⇔ `state = LIVE`, salon complete, and ≥1 bookable branch.
- **Bookable branch** ⇔ salon customer-visible, branch `ACTIVE` and branch complete.

### 5.3 Open/closed & today's hours
For a branch and an Amman date D: closed if a `salonClosure` of that branch covers D or the branch's `weeklySchedule[day(D)].isOff`; otherwise open between `open`–`close`. `isOpenNow` = open today and now ∈ [open, close).

### 5.4 Availability (slots)
Input: salonId, **branchId**, date D, services per person (services of that branch), isBride, optional staffId.
1. Reject if the branch is not bookable (`BRANCH_NOT_BOOKABLE`), D < today or D > today + `booking.maxDaysAhead` (90), or the branch is closed on D.
2. `duration` = Σ service durations. Candidate starts = every `booking.slotMinutes` (15) from `open` while `start + duration ≤ close`; drop starts < now + `booking.minLeadMinutes` (0) for today.
3. Eligible staff for the person: member of **that branch**, active, providesServices, works on day(D) (custom hours ⊆ branch hours), no leave covering D, `serviceIds ⊇ selected services`, `brideQualified` if isBride, and if a service is `brideOnly` the person must be a bride.
4. Staff busy intervals = persons of bookings with status `PENDING|APPROVED` on D + active Redis payment holds + other persons in the same draft.
5. Slot is available if ≥1 eligible staff has `[start, start+duration)` free inside their working hours. Return per slot: `available`, `eligibleStaffIds`.
6. "Any available staff" → choose the eligible free staff with the fewest bookings that day (tie → lowest `_id`).

### 5.5 Pricing & amounts (fils)
- `person.subtotal` = Σ price snapshots; `total` = Σ subtotals.
- `deposit` = round_half_up(total × depositPercentage / 100) to 1 fils (assumption: rounding to whole fils).
- `dueOnline` = DEPOSIT → deposit; FULL_ONLINE → total; PAY_ON_ARRIVAL → 0.
- `remaining` = total − paidOnline (+ refunded adjustments shown separately). Stored once at creation and never rewritten (it is the at-salon part; statistics count it as collected when COMPLETED).
- Booking views (API, SRV-170): `money.remaining` = what is **still to pay at the salon now** = stored `remaining` while PENDING/APPROVED, **0 once the booking is final** (COMPLETED = settled at the salon, `paymentStatus` PAID per §5.7; REJECTED/CANCELLED_*/AUTO_CANCELLED/NO_SHOW are not collected at the salon). Booking details add `money.paidAtSalon` = stored `remaining` when COMPLETED, else 0.
- Customer booking views show each person's assigned staff as `{id, firstName, photoUrl}` only (no last name or contact data), and the list row carries `rejection` (S14). Customer salon services carry `brideOnly`; booking a bride-only service for a non-bride person is refused with `BRIDE_ONLY_SERVICE` (§5.4 step 3).

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
- Salon `rating` = average of APPROVED SALON reviews of **all branches together** (1 decimal) + count — there is no per-branch rating. Each staff `rating` = average of that staff's APPROVED reviews. Recompute on approve/reject/remove.
- A review keeps `branchId` (from its booking, or picked by the customer) only to show a label such as "Mecca Street branch".
- Any ACTIVE customer may review any LIVE salon or its staff (no booking required). Rate limit: `reviews.maxPerTargetPerCustomer` (assumption 1 active PENDING per target).

### 5.12 Conflicts on schedule/team changes
Before saving a branch's weekly hours or closures, leaves, staff deactivation, **moving a staff member to another branch**, closing or taking a branch offline (§5.16), removing `providesServices`, removing a service from staff or from a branch, or reducing working days: compute upcoming PENDING/APPROVED bookings that would violate §5.4. Return them (`409 SCHEDULE_CONFLICT` with list). Client chooses: cancel affected (PENDING→REJECTED, APPROVED→CANCELLED_BY_SALON, reason from change, full refunds) or reassign (per booking) or abort.

### 5.13 Subscriptions & placements
- On approval: create subscription TRIAL, `trialEndsAt` = approval + `subscription.trialDays` (90).
- Daily job: TRIAL past end with no period → EXPIRED; ACTIVE past `currentPeriodEnd` → EXPIRED; alert admin at T−7 days and on expiry. Admin decides OFFLINE (not automatic).
- Recording a payment sets ACTIVE and `currentPeriodEnd` = max(existing, periodTo).
- One subscription per **salon** covers all its branches (trial starts at salon approval).
- Recommended placements are bought per **salon/clinic** (not per branch); the Recommended salons section = active SALON placements whose audience fits the customer's gender (§5.19), the Recommended clinics section = active CLINIC placements; each ordered by `order`, businesses must be customer-visible; booking from it starts at branch choice.

### 5.14 Payouts (manual, Phase 1)
One bank account and one payout per **salon** (all branches); ledger, transactions and refunds carry `branchId` so the owner and admin can filter by branch. Net due = Σ ledger since last payout. Admin creates payout (period, computed gross/fees/refunds/net), records transfer → ledger `PAYOUT −net`, status TRANSFERRED, notify owner + FINANCE_VIEW members.

### 5.15 Account deletion
Customer: `DELETION_PENDING`, tokens revoked, `deletionScheduledAt` = +30 days; login within grace restores ACTIVE; job anonymizes after grace (keep bookings/transactions for accounting with anonymized customer). Member (non-owner): access removed (active=false). Owner: `salon.deletionRequestedAt` → admin handles.

### 5.16 Branches lifecycle
- The owner (and admin) creates branches; the first branch is the main one (`isMain`). Limit `salon.maxBranches` (setting) → `BRANCH_LIMIT_REACHED`.
- **Closing** a branch (status `CLOSED`) is refused with `409 BRANCH_HAS_UPCOMING_BOOKINGS` (list) while it has PENDING/APPROVED bookings; they must be cancelled, completed or the branch kept. Closed branches keep all history; nothing is hard-deleted. The last non-closed branch cannot be closed (`LAST_BRANCH`); closing the main branch requires choosing a new main branch first.
- Moving a staff member to another branch removes their services (they pick services of the new branch) and runs the §5.12 conflict check.
- **Migration** of existing salons: each salon gets one main branch built from its current location, contacts, hours, closures, services and non-owner members; every booking, draft, transaction, refund, ledger entry and review gets that `branchId`. Default branch name: the salon's area name `{ar, en}`, else `الفرع الرئيسي` / `Main branch`.

### 5.17 Discovery with branches (customer)
- **Search / lists by filter**: one card per customer-visible salon (never one per branch). Distance and area come from the **nearest bookable branch** to the customer's location (no location → main branch); the card shows the branch count when > 1. A salon matches a filter (city, area, service, open now, rating) if **any** bookable branch matches.
- **Nearest**: one entry per **bookable branch** inside `discovery.nearbyRadiusKm`, sorted by distance; a salon with several branches shows **"Salon name - Branch name"** (e.g. "Hifa Salon - Mecca Street"); a single-branch salon shows the salon name only.
- **Salon details**: salon-wide header (name, rating, gallery, description, policy); a branch selector/list with each branch's address, map, phone, hours and open/closed state; staff and services are shown **per branch**; reviews are salon-wide, each labelled with its branch.
- Favorites, banners (action SALON) and deep links point at the salon; a deep link may carry `branchId` to preselect a branch.

### 5.19 Business types and audience (owner decisions 2026-10-29)
- **Visibility:** a customer of gender G sees SALONs whose audience is G or BOTH, and every CLINIC. Lists, search, nearest, Recommended, favorites and deep links follow this rule; a guest without a gender sees what the onboarding gender selects (unchanged).
- **Booking persons:** for a SALON with audience MALE or FEMALE every person must match it (`GENDER_MISMATCH`, unchanged); for a SALON with audience BOTH and for every CLINIC the customer and up to `booking.maxCompanions` companions may be any gender in one booking.
- **Bride:** bride bookings, `brideOnly` services and `brideQualified` staff exist only for SALONs with audience FEMALE or BOTH; never for clinics (`BRIDE_NOT_ALLOWED`).
- **Catalog:** catalog services carry `businessType` + `audience`; admin manages them per business type; a business offers (and requests) only services of its own type that fit its audience (`BUSINESS_TYPE_MISMATCH`). Search by service and the home services sections are per type.
- **Application:** the merchant chooses SALON or CLINIC. SALON → audience MALE, FEMALE or BOTH; CLINIC → audience BOTH (not asked) and a **medical license** document (`UploadPurpose MEDICAL_LICENSE`) is required besides the trade license; admin sees both before approval.
- **Audience change after approval:** the OWNER can widen a SALON MALE→BOTH or FEMALE→BOTH instantly (audit + admin notification `salon.audience_widened`); narrowing BOTH→MALE/FEMALE only by admin with a reason (conflicting future bookings/services follow §5.12); a CLINIC's audience never changes; businessType never changes (`AUDIENCE_CHANGE_NOT_ALLOWED`).
- **Customer home:** sections in order — banners, services (salon services, then clinic services), Recommended salons, **Recommended clinics**, nearest salons, **nearest clinics**; "See more" of the clinic sections opens the same list screens filtered to CLINIC. Bookings list filter: all / salons / clinics.
- **Admin:** every business list, application queue, booking list, review list, placement list, catalog, banner, campaign, report and export can be filtered by businessType; catalog categories are managed per business type.
- **Migration:** existing salons get `businessType = SALON`, `audience = gender`; catalog services `businessType = SALON`, `audience = gender`; bookings `businessType = SALON`, `salonAudience = salonGender`; placements copy from their salon. API: `gender` on salon/catalog payloads is replaced by `businessType` + `audience` (contracts bumped; clients re-sync).

### 5.18 Booking with branches
- **Step 1 = choose branch** when the salon has more than one bookable branch (skipped and auto-selected when it has exactly one). Every later step (services, staff, slots) uses that branch only; a draft and its booking keep `branchId` + `branchSnapshot`.
- Booking requests go to the owner and to members **of that branch** with `BOOKINGS_RESPOND` (socket + FCM); jobs and reminders follow the same recipients.

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

**Branch scope (2026-10-25):** the OWNER sees and manages every branch and is the only one who creates, edits, closes or takes branches offline (OWNER only: `BRANCHES_MANAGE`), manages members/roles/permissions, sets the salon-wide profile (name, description, logo, cover), policy, finance, subscription and bank details. Every MANAGER/EMPLOYEE belongs to one branch and **each permission applies to that branch only** (its bookings, calendar, staff, hours, closures, services, branch location/contacts, reviews of its staff and branch, statistics). For branch members `FINANCE_VIEW`, `SUBSCRIPTION_VIEW` and `POLICIES_MANAGE` cannot be granted; `SALON_PROFILE_MANAGE` covers the branch's location/contacts; `GALLERY_MANAGE` stays salon-wide. A branch can have one or more managers.

Default templates: MANAGER = all grantable branch permissions (BOOKINGS_*, SALON_PROFILE_MANAGE (branch), GALLERY_MANAGE, WORKING_HOURS_MANAGE, SERVICES_MANAGE, STAFF_MANAGE, REVIEWS_VIEW, STATISTICS_VIEW, DASHBOARD_VIEW); EMPLOYEE = BOOKINGS_VIEW_OWN, REVIEWS_VIEW. Enforced on REST, socket rooms/events and notification recipients. Permission change → silent push + socket `permissions.updated`.

---

## 7. Real-time Events (Socket.IO)

| Room | Event | Payload | Recipients |
|---|---|---|---|
| `customer:{id}` | `booking.updated` | booking summary | booking customer |
| `customer:{id}` | `notifications.unread` | `{count}` | customer |
| `branch:{id}:respond` | `booking.requested` | request card | owner + members of the branch with BOOKINGS_RESPOND |
| `branch:{id}:all` | `booking.updated` | booking summary | owner + members of the branch with BOOKINGS_VIEW_ALL |
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
| salon.audience_widened (owner widened to BOTH, §5.19) | — | ✔ owner (confirmation) | ✔ |
| booking.completed (rate) / no_show | ✔ | — | — |
| booking.reassigned | ✔ | ✔ old/new staff | — |
| refund.pending / refunded | ✔ | in-app (FINANCE_VIEW) | refund failed/delayed |
| review.published | — | ✔ (REVIEWS_VIEW / staff) | review.created → pending |
| application.approved / rejected | — | ✔ owner | application.created |
| catalog_request.decided | — | ✔ (SERVICES_MANAGE) | catalog_request.created |
| payout.transferred | — | ✔ owner + FINANCE_VIEW | — |
| subscription.ending_7d / expired, salon.offline / live, branch.offline / live | — | ✔ owner (+ branch managers for branch events) | subscription ending/trial ended |
| payment.failed spike, 5xx/crash spike | — | — | ✔ |
| promotion | ✔ | — | — |

Merchant recipients are the owner plus members **of the booking's branch** with the permission shown. Push respects `pushEnabled`; in-app notification is always stored.
Booking notifications name the place like §5.17: **"Salon - Branch"** (branch name as booked, in the recipient's language) for every branch of a salon with more than one non-closed branch, the main branch included; the salon name alone for a single-branch salon (SRV-172).

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
discovery.nearbyRadiusKm = 10                salon.maxBranches = 20
booking.slotMinutes = 15                    booking.maxDaysAhead = 90
booking.maxCompanions = 5                   booking.minLeadMinutes = 0
booking.paymentHoldMinutes = 10             booking.autoCancelAfterStartMinutes = 60
booking.pendingAlertBeforeMinutes = 30      booking.reminderMinutes = [60, 15]
otp.length = 6                              otp.resendAfterSec = 60
otp.maxRequests = 5   otp.requestWindowSec = 300   otp.maxWrong = 5   otp.blockSec = 900
otp.codeTtlSec = 300   otp.proofTtlSec = 600   otp.channel = WHATSAPP
auth.accessTokenTtlSec = 900                auth.refreshTokenTtlDays = 90
admin.maxFailedLogins = 5   admin.lockSec = 900   admin.sessionIdleSec = 172800 (2 days, owner 2026-10-26)
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
OTP_BLOCKED  OTP_INVALID  OTP_EXPIRED  OTP_DELIVERY_FAILED  PHONE_NOT_REGISTERED  PHONE_ALREADY_REGISTERED  ACCOUNT_BLOCKED  MEMBER_INACTIVE  CURRENT_PASSWORD_INVALID  EMAIL_ALREADY_USED
SALON_NOT_FOUND  SALON_NOT_BOOKABLE  SALON_CLOSED  GENDER_MISMATCH  TOO_MANY_COMPANIONS  BUSINESS_TYPE_MISMATCH  AUDIENCE_CHANGE_NOT_ALLOWED  BRIDE_NOT_ALLOWED
BRANCH_NOT_FOUND  BRANCH_NOT_BOOKABLE  BRANCH_REQUIRED  BRANCH_LIMIT_REACHED  BRANCH_HAS_UPCOMING_BOOKINGS  LAST_BRANCH  BRANCH_SCOPE_DENIED
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
7. Branches (owner decisions 2026-10-25): per branch = location & contacts, hours & closures, services & prices, staff (one branch per member); salon-wide = name, gender, logo/cover/gallery, description, policy, subscription (3 free months per salon), payouts (one bank account), rating, Recommended placement. No admin approval for new branches (live when complete). Managers: one or more per branch, branch data only, no finance/subscription/policy; team members and permissions stay owner-only. Search card = nearest branch; nearest list = one entry per branch, "Salon - Branch". Closing a branch is blocked while it has upcoming bookings; branch or whole salon can go offline; existing salons migrate to one main branch; reviews show their branch; branch limit = setting `salon.maxBranches`.
8. Phone OTP (owner decisions 2026-10-26): server-generated codes delivered over WhatsApp by ARQAM OTP (AR + EN authentication templates; the direct Meta Cloud API channel, its delivery webhook and status polling were dropped) (§3.1a); Firebase Phone Auth removed from the server and both apps (Firebase stays for push, analytics, crash reporting). Users without WhatsApp cannot receive a code (no SMS fallback).
10. Business types (owner decisions 2026-10-29): SALON or CLINIC (immutable); salons serve MALE, FEMALE or BOTH, clinics always BOTH; BOTH salons and clinics are visible to everyone and take mixed-gender bookings; owner may widen a salon to BOTH, narrowing only by admin; clinics need a medical license; bride only for FEMALE/BOTH salons; catalog per business type; home adds Recommended clinics + nearest clinics; bookings filter salon/clinic; admin filters everything by business type (§5.19).
