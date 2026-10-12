# WAB Wedding & Beauty — Customer Mobile App PRD

> **Document type:** Product Requirements Document (PRD) — Customer app (frontend / mobile)
> **Audience:** AI coding agents and engineers who will implement the customer app.
> **Version:** 1.1 — updated with backend decisions: Firebase phone OTP with dynamic code length (currently 6), Socket.IO real-time, Firebase Analytics + BigQuery, `wab-payments` KMP library, presigned uploads + CDN.
> **Related documents (separate PRDs, not covered here):** Merchant (Salon) App PRD, Admin Panel PRD, Backend PRD.

---

## 0. How to Read This Document

- **MUST** = mandatory requirement. **SHOULD** = strongly recommended. **MAY** = optional.
- Every screen section contains: purpose, entry points, layout (top to bottom), behavior, states, and acceptance criteria.
- Anything not decided is listed in **Section 17 – Open Items & Assumptions**. Do NOT invent behavior for open items; implement the stated assumption and keep it easy to change.
- "Start" / "End" refer to layout direction: in Arabic (RTL) Start = right, End = left; in English (LTR) Start = left, End = right. **Never hardcode left/right.**
- All user-visible strings MUST be localized (Arabic + English). No hardcoded text.

---

## 1. Product Overview

### 1.1 Summary
**WAB Wedding & Beauty** is a marketplace mobile app (Android + iOS) that lets customers in **Jordan** discover men's and women's salons, browse their services, staff, reviews, working hours and portfolio, and **book appointments** (for themselves and up to 5 companions), with optional online payment (deposit or full) or pay-on-arrival. Women's salons support **bride bookings** with VIP services and bride-qualified staff.

### 1.2 Actors in the Whole System
| Actor | Description | Covered here |
|---|---|---|
| Customer (Guest) | Uses the app without an account | ✅ |
| Customer (Registered) | Has an account, can book, review, favorite | ✅ |
| Merchant (Salon) | Manages salon profile, services, staff, bookings | ❌ (Merchant PRD) |
| Admin | Manages platform, content, approvals | ❌ (Admin PRD) |

### 1.3 Market Constraints
- Country: Jordan (phone input still supports a server-provided country list).
- Currency: **Jordanian Dinar (JOD) only**. All prices are **tax- and fee-inclusive** (the salon includes them when entering prices). The app never adds taxes or fees.
- Languages: **Arabic (default)** and English.

---

## 2. Platform & Technical Constraints

### 2.1 Confirmed
- **Kotlin Multiplatform (KMP) + Compose Multiplatform.** Shared UI **and** shared business logic for **Android and iOS**. Platform-specific code only via `expect/actual` where unavoidable (location, payments SDK, video player, image picker, push, deep links).
- **Local persistence:** DataStore (key-value). See Section 5.
- **OTP:** Firebase Authentication (Phone / SMS) via the Firebase SDK. The backend verifies the resulting Firebase ID token (see S13).
- **Push notifications:** Firebase Cloud Messaging (Android + iOS).
- **Real-time:** Socket.IO client connected to the backend while the app is in the foreground (registered users); FCM covers background/closed app.
- **Crash reporting & analytics:** Firebase Crashlytics + Firebase Analytics. Firebase exports raw events to **BigQuery** (retained permanently); the backend reads BigQuery for the Admin panel (see Section 14).
- **Internal abstraction (mandatory):** all Firebase usages (OTP, push, analytics, crash reporting) MUST sit behind interfaces in the app's own code (e.g., `OtpProvider`, `PushProvider`, `AnalyticsTracker`, `CrashReporter`) so a provider change touches one place only. No separate repositories for these on mobile.
- **Payments:** the **`wab-payments` KMP library** (separate repository, published package). The app depends only on its interface; the first implementation wraps the chosen gateway's native SDKs (HyperPay candidate; gateway not final). Changing the gateway MUST NOT require app code changes beyond the library version.
- **Files:** uploads use **presigned upload URLs** issued by the backend (upload goes directly to AWS S3); media is served through a **CDN**. Images and videos MUST be **compressed on the device** before upload.
- **Backend (context only):** Node.js + TypeScript + Express + Mongoose, MongoDB, Redis. REST JSON APIs, versioned (`/v1`), customer endpoints under a dedicated customer namespace (e.g., `/customer/v1`). Swagger and a Postman collection are maintained in the backend repository.

### 2.2 Tech Stack
> **KMP libraries: TBD — will be provided by the product owner as a template.** Integrations confirmed in 2.1 are fixed.

### 2.3 Environments
- The app SHOULD support separate environments (e.g., Dev / Staging / Production), each with its own base URL, configured at build time.

---

## 3. Global Rules (apply to every screen)

### 3.1 Localization & Direction
- Default language: **Arabic**. Supported: Arabic, English.
- Full **RTL** layout in Arabic; mirrored **LTR** in English (icons with direction, e.g., back arrows, MUST mirror).
- Numerals follow the active language.
- Time format: **12-hour** with AM/PM (Arabic: ص / م).
- Language can be changed from: Profile screen, Login screen, Register screen. Change applies immediately and is persisted locally.
- Every API request MUST send the current language (e.g., `Accept-Language: ar|en`) so the server returns localized content.

### 3.2 Theme
- Options: Light / Dark / System. **Default: System.**
- Can be changed from Profile, Login and Register screens. Persisted locally.

### 3.3 Loading
- All loading states use **shimmer placeholders shaped like the real content** (cards, sections, list items).
- **Home screen uses one unified loading state**: the whole home (all sections) loads together with one shimmer layout that mirrors all sections.

### 3.4 Pagination
- All lists that come from the server are **paginated, page size = 10**, with infinite scroll (load next page when reaching the end) and a bottom loading indicator (shimmer item).
- Applies to: All Salons, All Services, Reviews (salon/staff), Notifications, Bookings, Favorites, filter services list ("See more" loads next 10).

### 3.5 Search Debounce
- Every search input MUST debounce: send the request only after the user stops typing for **500 ms**. Never request per keystroke.

### 3.6 Pull to Refresh
- **Every screen supports pull-to-refresh EXCEPT form screens**: Login, Register, OTP, Edit Personal Information, and all Booking Flow steps.

### 3.7 Error & Empty States
Every data screen MUST handle:
| State | UI |
|---|---|
| No internet | Illustration + message + **Retry** button |
| Server / unknown error | Illustration + message + **Retry** button |
| Empty result | Illustration + contextual message (+ action when defined) |

### 3.8 Horizontal Sections & "See more / See all"
- Home horizontal sections show a title at Start and a **"See more"/"See all"** action at End.
- The action is shown **only if the section has more than 10 items** (server returns total count or a flag).

### 3.9 Truncated Text
- Long descriptions (service, salon, reviews, staff bio) are truncated with a **"more"** action that expands or navigates as specified per screen.

### 3.10 Gender Scoping
- The app has two content scopes: **Men** and **Women**. Each salon is **either** a men's salon **or** a women's salon (never both).
- Every content request (home, services, salons, filters, search) MUST include the currently selected gender.

### 3.11 Server-Driven Content
The following are **never hardcoded**; they come from the server:
- Countries list (flag, name, dial code, phone regex).
- Cities and areas.
- Filter options (services, general filters, rating options, price range bounds).
- Banners, recommended salons, nearby radius.
- Legal and support content: Privacy Policy, Terms & Conditions, About Us, FAQ, Contact information (phone, WhatsApp, email).
- App version policy (force/optional update) and maintenance mode.
- OTP code length and resend timing.

### 3.12 Auth-Gated Actions
When a **Guest** triggers an action requiring an account, show a dialog: "You need to log in to continue" with **Log in** (→ Login screen) and **Cancel**. Auth-gated actions:
- Book (salon details "Book" button).
- Add review (salon or staff).
- Add/remove favorite.
- Open Favorites tab content.
- Notifications (icon is not shown for guests).

### 3.13 Relative Time Format
- "Now", "X minutes ago", "X hours ago", "Yesterday / 1 day ago", "2 days ago"; **older than 2 days → full date**.

### 3.14 Images
- All images are loaded from URLs (CDN) with caching and placeholders. Missing profile images show a default vector avatar.

### 3.15 Real-time
- For registered users, the app keeps an authenticated **Socket.IO** connection while in the foreground and reconnects automatically.
- Real-time updates MUST be applied to: Bookings list (S14), Booking Details (S15), unread notifications badge (S03) and Notifications list (S19).
- When the app returns to the foreground or receives an FCM message, it refreshes the affected data.

### 3.16 Uploads
- Flow: request presigned URL from backend (file type + size) → compress on device → upload directly to storage → confirm upload to backend → backend returns the final CDN URL.
- Show upload progress and allow retry on failure.

---

## 4. App Launch & User State Machine

### 4.1 User States
| State | Condition |
|---|---|
| New device | No `onboarding_seen` flag |
| Guest (incomplete) | No access token AND guest nickname/gender not saved |
| Guest (complete) | No access token AND guest nickname + gender saved |
| Registered | Valid access token saved |

### 4.2 Launch Decision Flow
```
App start
 ├─ Check app version policy / maintenance (server)
 │    ├─ Maintenance → Maintenance screen (blocking)
 │    ├─ Force update → Force Update screen (blocking)
 │    └─ Optional update → show dismissible update dialog, continue
 ├─ onboarding_seen == false → Onboarding (set onboarding_seen = true as soon as it is shown)
 ├─ Has access token → Home (Registered)
 ├─ Guest nickname + gender saved → Home (Guest)
 └─ Else → Nickname & Gender screen (mandatory) → Home (Guest)
```

### 4.3 Rules
- **Onboarding** is shown **only on the very first launch after install**. Once displayed, it is considered seen even if the user exits mid-way. Reinstalling the app shows it again.
- **Nickname & Gender screen** is shown on **every launch** until the user completes it. The user cannot reach Home without saving both.
- Registered users **never** see the Nickname & Gender screen.
- After registration/login, the guest nickname and gender are **kept** locally (not deleted).
- **Session:** access token + refresh token. Refresh MUST be automatic and transparent. Only if refresh fails: show "Session expired" message, clear registered-user data (tokens, first name, gender), and continue as Guest (if guest nickname/gender are missing → Nickname & Gender screen; user can log in again from anywhere).

### 4.4 Deep Links
- Salon share link format (domain TBD): `https://<domain>/salon/{salonId}` (Android App Links + iOS Universal Links).
- On open:
  1. If the user must pass onboarding / nickname & gender → complete those first.
  2. Open Home, then automatically push **Salon Details** for `salonId`.
  3. Back from Salon Details returns to Home.
- If the salon does not exist or is inactive → open Home and show a message "Salon not available".

---

## 5. Local Storage (DataStore)

| Key | Type | Description |
|---|---|---|
| `onboarding_seen` | Boolean | Onboarding already shown |
| `guest_nickname` | String | Guest nickname (local only, never sent to server) |
| `guest_gender` | Enum (MALE/FEMALE) | Guest gender (local only) |
| `access_token` | String | Auth access token |
| `refresh_token` | String | Auth refresh token |
| `user_first_name` | String | Registered user's first name (for welcome message) |
| `user_gender` | Enum | Registered user's gender (default Home tab) |
| `language` | Enum (AR/EN) | Default AR |
| `theme` | Enum (LIGHT/DARK/SYSTEM) | Default SYSTEM |
| `push_enabled` | Boolean | Push notifications toggle (also synced to server for registered users) |

- Tokens SHOULD be stored securely (encrypted storage where the platform allows).

---

## 6. Domain Models (client-side)

> Field names are indicative; align with the Backend PRD. All IDs are strings.

**Gender**: `MALE`, `FEMALE`

**Banner**: `id`, `imageUrl`, `actionType` (`NONE` | `SALON` | `EXTERNAL_URL`), `actionValue`

**Service**: `id`, `name`, `description`, `imageUrl`, `gender`, `durationMinutes`, `brideOnly` (Boolean)
- In a salon context also: `price` (JOD), `media[]` (images/videos).

**SalonCard** (used in all salon lists): `id`, `name`, `profileImageUrl`, `rating` (0–5, one decimal), `reviewsCount`, `locationText` (e.g., "Amman, Gardens, Street 36"), `shortDescription`, `isOpenNow`, `todayHours` (e.g., 08:00–16:00 or closed), `isFavorite`.

**SalonDetails**: SalonCard fields + `coverImageUrl`, `fullDescription`, `latitude`, `longitude`, `phone`, `whatsappNumber?`, `weeklySchedule[]`, `exceptionalClosures[]`, `staffPreview[]`, `reviewsPreview[]` (first 3), `services[]`, `gallery[]`, `policy` (SalonPolicy), `shareUrl`.

**WeeklySchedule item**: `dayOfWeek`, `isDayOff`, `openTime`, `closeTime`

**ExceptionalClosure**: `date` (or `fromDate`/`toDate`), `reason` (e.g., "Eid Al-Adha")

**Staff**: `id`, `firstName`, `imageUrl`, `role` (`OWNER` | `MANAGER` | `EMPLOYEE`), `rating`, `reviewsCount`, `bio`, `yearsOfExperience`, `customersCount` (customers served via the app), `services[]`, `workingDays[]`, `daysOff[]`, `isOnDutyToday` (Boolean), `isOnLeave` (Boolean), `brideQualified` (Boolean), `reviewsPreview[]`.

**Review**: `id`, `userName`, `rating` (1–5), `comment`, `createdAt`

**GalleryItem**: `id`, `type` (`IMAGE` | `VIDEO`), `url`, `thumbnailUrl`

**SalonPolicy**:
- `cancellationWindowHours` (mandatory, set by salon; e.g., cannot cancel less than X hours before appointment)
- `paymentOptions[]`: subset of `PAY_ON_ARRIVAL`, `DEPOSIT`, `FULL_ONLINE`
- `depositPercentage` (if DEPOSIT enabled)
- `depositRefundableOnCustomerCancel` (Boolean)
- `fullPaymentRefundOnCustomerCancel`: `FULL` | `MINUS_DEPOSIT`
- `noShowPolicy`: what happens to deposit/full payment on no-show (text + flags)

**Booking**: `id`, `referenceNumber`, `salon` (SalonCard), `status`, `paymentStatus`, `refundStatus`, `persons[]` (BookingPerson), `totalPrice`, `paidAmount`, `remainingAmount`, `paymentMethod`, `rejectionReason?`, `cancellationReason?`, `canCancel` (Boolean), `cancelBlockedReason?`, `policySnapshot` (SalonPolicy at booking time), `createdAt`, `canRate` (Boolean).

**BookingPerson**: `name`, `isMainPerson`, `isBride`, `services[]` (with price snapshot), `staff` (or "any available" → assigned staff), `startDateTime`, `endDateTime`, `subtotal`.

**Booking status enum**: `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED_BY_CUSTOMER`, `CANCELLED_BY_SALON`, `AUTO_CANCELLED`, `COMPLETED`, `NO_SHOW`

**Payment status enum**: `PAY_ON_ARRIVAL`, `DEPOSIT_PAID`, `FULLY_PAID`, `PAID` (set when salon marks the booking completed & paid)

**Refund status enum**: `NONE`, `REFUND_PENDING`, `REFUNDED`

**Notification**: `id`, `type` (`BOOKING` | `PROMOTION`), `title`, `body`, `createdAt`, `isRead`, `bookingId?`

**UserProfile**: `firstName`, `lastName`, `email`, `gender`, `cityId`, `areaId`, `countryCode`, `phone`, `profileImageUrl?`

**Country**: `code`, `name`, `flagUrl`, `dialCode` (e.g., +962), `phoneRegex`
**City**: `id`, `name` · **Area**: `id`, `name`, `cityId`

---

## 7. Navigation Map

### 7.1 Bottom Navigation Bar (4 items)
1. **Home** (selected by default)
2. **Favorites**
3. **Bookings**
4. **Profile**

- There is **no global top app bar** on bottom-nav root screens; each root screen has its own header (welcome message).

### 7.2 Screens Index
| ID | Screen |
|---|---|
| S01 | Onboarding |
| S02 | Nickname & Gender |
| S03 | Home |
| S04 | All Salons |
| S05 | Filter (full-screen bottom sheet) |
| S06 | All Services |
| S07 | Salon Details (+ Staff sheet, Service sheet) |
| S08 | Salon Reviews |
| S09 | Staff Reviews |
| S10 | Media Viewer |
| S11 | Login |
| S12 | Register |
| S13 | OTP Verification (shared) |
| S14 | Bookings (tab) |
| S15 | Booking Details |
| S16 | Booking Flow (multi-step) |
| S17 | Booking Success |
| S18 | Rating Flow |
| S19 | Notifications |
| S20 | Favorites (tab) |
| S21 | Profile (tab) |
| S22 | Edit Personal Information |
| S23 | Legal / Support content pages (Privacy, Terms, About, FAQ, Contact Us) |
| S24 | Force Update / Maintenance |

---

## 8. Screen Specifications

### S01 — Onboarding
**Purpose:** Explain what the app does, the business, and the services offered.
**Entry:** First launch only.
**Layout:**
- Horizontal pager with **4 pages**, each with an image + short text (static content bundled in the app, defined by the design).
- Page indicator.
- **Skip** button (always visible).
- Next / Get Started button on the last page.
**Behavior:**
- Swipe between pages.
- Skip or finishing → S02 (or Home if already completed).
- `onboarding_seen = true` is saved **as soon as the onboarding is displayed**.
**Acceptance criteria:**
- [ ] Shown on first launch after install only.
- [ ] Not shown again after app restart even if the user quit mid-onboarding.
- [ ] Shown again after uninstall + reinstall.

---

### S02 — Nickname & Gender
**Purpose:** Personalize the guest experience.
**Entry:** After onboarding, and on every launch until completed.
**Layout:**
- Nickname text field (required).
- Gender selection: Man / Woman (required).
- Continue button (disabled until both are valid).
**Behavior:**
- Saves `guest_nickname` and `guest_gender` **locally only** (never sent to server).
- On continue → Home (Guest).
**Acceptance criteria:**
- [ ] User cannot reach Home without both values saved.
- [ ] If the app is closed before completing, this screen appears again on next launch.

---

### S03 — Home
**Purpose:** Discovery entry point.
**Entry:** Bottom nav "Home" (default tab).
**Data loading:** One request returns all home sections for the selected gender (+ unread notifications count for registered users). Unified shimmer.

**Layout (top → bottom):**
1. **Header row**
   - Start: Welcome message — Guest: "Hello, {guest_nickname}"; Registered: "Hello, {user_first_name}" (first name only).
   - End (registered only): **Notifications icon** with unread badge. Badge shows 1–99, then "99+". Hidden when 0. Updates in real time. Tap → S19.
2. **Banner carousel** — auto-swiping images (ads/promotions/upcoming features). Tap behavior by `actionType`: `SALON` → S07, `EXTERNAL_URL` → open in browser, `NONE` → nothing. Managed by Admin.
3. **Search bar (non-editable)** — hint: "Search for a salon name, service, or category". Tap → S04 with **no filters** and empty search.
4. **Gender tabs:** Men | Women.
   - Default selection: Guest → `guest_gender`; Registered → `user_gender`.
   - Switching tabs reloads content for that gender. It does **not** change the saved gender.
5. **Services section** — title "Services" (Start), "See more" (End, only if > 10).
   - Horizontal list of service cards: image, name, short description (truncated).
   - Tap service → S04 pre-filtered by that service.
   - "See more" → S06.
6. **Recommended Salons section** — title + "See all" (only if > 10).
   - Horizontal list of **Salon cards** (see 8.0).
   - Tap card → S07. "See all" → S04 with **Recommended** filter preselected.
   - List is curated by Admin.
7. **Nearest Salons section** — title + "See all" (only if > 10).
   - **Location permission granted & enabled:** app sends current coordinates; server returns salons within the admin-configured radius (**default 10 km**). Horizontal Salon cards. "See all" → S04 with **Nearest** filter preselected.
   - **Permission not granted / location off:** section shows an explanatory message and an **"Enable location services"** button:
     - Tap → explanatory dialog ("Enable location to see salons near you") → system permission request.
     - If permission is permanently denied → open device settings.
     - After enabling → section loads automatically.
   - Available to guests.

**8.0 Salon Card (shared component, used everywhere):**
- Profile image, salon name, rating (stars + value), location text, short description (truncated + "more"), **Open/Closed status** + today's working hours (e.g., "Open · 8:00 AM – 4:00 PM" / "Closed today").
- Favorite (heart) toggle SHOULD appear on the card (auth-gated).

**States:** unified shimmer, no internet/error with retry, pull-to-refresh.
**Acceptance criteria:**
- [ ] Home loads as one unit with one shimmer layout.
- [ ] Content reflects the selected gender tab.
- [ ] Notification icon appears only for registered users; badge caps at "99+".
- [ ] Nearest section works for guests and handles all permission states.

---

### S04 — All Salons
**Purpose:** Browse, search and filter all salons of the selected gender.
**Entry points & initial state:**
| From | Search text | Preselected filters |
|---|---|---|
| Home search bar | empty | none |
| Recommended "See all" | empty | General = Recommended |
| Nearest "See all" | empty | General = Nearest |
| Service tap (Home or S06) | empty | Services = [that service] |

**Layout:**
1. **Top bar (sticky):** Back button (Start), title "All Salons" (centered).
2. **Search bar (sticky):** real editable input + **Filter icon** button next to it.
3. **Active filter chips row** (FlowRow) under the search bar — one chip per active filter (each selected service, price range, general filter, rating). Each chip has an **×** to remove it.
4. **Salon list:** vertical list of Salon cards (8.0), paginated (10).

**Behavior:**
- Search by salon name with 500 ms debounce.
- **Search and filters are combined** in a single server query (results must match search text AND all active filters).
- Removing a chip removes the filter (also unselected in S05) and reloads results.
- If "Nearest" is active and location is not available → request location using the same flow as Home; if not granted, remove the Nearest filter and inform the user.
- Tap card → S07.
**States:** shimmer (card-shaped), empty result ("No salons match your search"), error/no internet with retry, pull-to-refresh.
**Acceptance criteria:**
- [ ] Each entry point opens with the correct preset filters visible as chips and selected in S05.
- [ ] Top bar and search bar stay sticky while scrolling.
- [ ] No request is sent per keystroke.

---

### S05 — Filter (full-screen bottom sheet)
**Entry:** Filter icon in S04.
**Layout:**
- **Header:** Close (Start), title "Filter" (center), **Reset** (End) — disabled when no filters are selected.
- **Scrollable content (all options come from the server):**
  1. **Services** — multi-select chips in a FlowRow. Shows the first 10; "See more" loads the next 10 (paginated), repeatedly.
  2. **Price range** — shown **only after at least one service is selected**. Range slider (min–max JOD). Bounds come from the server.
  3. **General filters** — **single-select**: Nearest, Recommended (list from server).
  4. **Rating** — **single-select**: 1★ … 5★, meaning **"X stars and above"**.
- **Apply ("Filter") button** at the bottom.
**Filtering rules (server-side, described for clarity):**
- Salon MUST offer **all** selected services.
- The **sum of the salon's prices for the selected services** MUST be within the selected price range.
- Rating ≥ selected value.
- Nearest → sorted by distance to the user (requires location). Recommended → only recommended salons.
**Behavior:**
- Apply → close sheet, update chips, reload S04 results (page 1).
- Close without applying → discard changes.
- Reset → clears all selections in the sheet.
**Acceptance criteria:**
- [ ] Services multi-select; General and Rating single-select.
- [ ] Price range hidden until a service is selected.
- [ ] Sheet reflects currently active filters when reopened.

---

### S06 — All Services
**Entry:** Home Services "See more".
**Layout:** Top bar (Back, title "All Services"). Vertical paginated list (10) of **expandable service cards**: image, name, description (collapsed with "more"; tapping "more" expands the card in place).
**Behavior:** Gender = currently selected Home tab. Tap card (outside "more") → S04 pre-filtered by that service.
**States:** shimmer, empty, error, pull-to-refresh.

---

### S07 — Salon Details
**Entry:** Salon card tap (anywhere), deep link, banner.
**Layout (top → bottom):**
1. **Top bar:** Back (Start), salon name (center), actions (End): **Share**, **Favorite** (auth-gated).
2. **Cover image** with the **circular profile image** overlapping its bottom center (Facebook-style).
3. **Open/Closed status** + today's hours.
4. **Location text** (tappable) → opens the location in Google Maps / any maps app (chooser).
5. **Contact:** Call button (opens dialer with salon phone); WhatsApp button (only if salon has WhatsApp) → opens WhatsApp chat.
6. **Description** — truncated with "See more" to expand fully.
7. **Working Days & Hours** — expandable section. When expanded: each day of the week with its hours, or "Day off". Also lists **upcoming exceptional closures** (e.g., "Closed 10–12 Dhul Hijjah – Eid Al-Adha").
8. **Staff** — horizontal list: circular small photo + **first name** + availability indicator (**On duty today** / **On leave**). Tap → **Staff sheet**.
9. **Reviews (salon)** —
   - Header: title (Start); average rating (e.g., 4.5/5) and total reviews count (End).
   - First **3** reviews: user name, star rating, comment (truncated + "See more").
   - **See all** button → S08.
   - **Add review** action (auth-gated) → review form (rating 1–5 + comment).
   - If no reviews: "There are no reviews for this salon yet."
10. **Services** — list of the salon's services (image, name, duration, price). Tap → **Service sheet**.
11. **Gallery (portfolio)** — Instagram-style grid of images and videos (video tiles show a play icon). Tap → S10.
12. **Sticky "Book now" button** at the bottom — **always enabled**, even when the salon is currently closed (bookings are for upcoming available slots). Guest → auth dialog; Registered → S16.

**Staff sheet (full-screen bottom sheet):**
- Photo, first name, **role** (Owner / Manager / Employee), rating, bio, years of experience, number of customers served via the app, current status (on duty / on leave), working days and days off, services this staff member provides.
- **Staff reviews:** first 3 + **See all** → S09; **Add review** (auth-gated).

**Service sheet:** service name, full description, duration, price, and media (images/videos, if added by the salon) → tap media → S10.

**Acceptance criteria:**
- [ ] Book button is sticky and always enabled.
- [ ] Salon rating and staff ratings are **independent** (salon rating is not an average of staff ratings).
- [ ] Share uses the native share sheet with the salon deep link.

---

### S08 — Salon Reviews / S09 — Staff Reviews
**Layout:** Top bar (Back, title). Summary header (average + count). Paginated list (10) of reviews: user name, stars, comment (truncated + "See more"). **Add review** button (auth-gated).
**Review submission rules:**
- Any **registered** user can review a salon or a staff member (a previous booking is **not** required).
- Every submitted review is **PENDING until Admin approval**; show confirmation: "Thank you! Your review will appear after approval."
- Only approved reviews are shown.

---

### S10 — Media Viewer
- Full-screen viewer, swipe between items.
- Images: pinch-to-zoom.
- Videos: player with play/pause/seek.

---

### S11 — Login
**Layout:**
- Attractive background + app logo.
- Top: **Language** icon (AR/EN) and **Theme** icon.
- Center card:
  - Country selector (flag + dial code, list from server, default Jordan +962).
  - Mobile number field, validated with the selected country's **regex**.
  - **Log in** button.
- Below: "Don't have an account? **Register**" (tappable) → S12.
- Links: Privacy Policy, Terms & Conditions, Contact Us → S23.
**Behavior:**
- Log in → server check:
  - Registered number → send OTP → S13 (mode = LOGIN).
  - **Not registered** → popup "This number is not registered" → S12 with country + number **prefilled**.
  - **Blocked by admin** → message: account suspended, please contact us (with link to Contact Us).
  - **Account in deletion grace period (≤30 days)** → login reactivates the account normally.
**Acceptance criteria:**
- [ ] Invalid number shows an inline validation error; button disabled until valid.

---

### S12 — Register
**Layout:** Same visual style as Login (background, logo, language/theme icons), **Back** button → Login. Scrollable form.
**Fields (ALL required):**
1. First name — prefilled from `guest_nickname` (editable).
2. Last name.
3. Email (format validation; stored only, **no email verification**).
4. Gender — dropdown (Man / Woman), prefilled from `guest_gender` (editable).
5. City — dropdown (from server).
6. Area — dropdown, **disabled until a city is selected**, then loaded from server for that city.
7. Country code + mobile number (same component and regex as Login).
- Inline validation message under each invalid field.
- **Register** button disabled until all fields are valid.
- "I already have an account – **Log in**" link.
- Links: Privacy Policy, Terms & Conditions, Contact Us.
**Behavior:** Register → S13 (mode = REGISTER). On success → store tokens, `user_first_name`, `user_gender` → Home (Registered).

---

### S13 — OTP Verification (shared)
**Used by modes:** LOGIN, REGISTER, CHANGE_PHONE, BOOKING_CONFIRMATION.
**Layout:** Title, message "We sent a code to {phone}", **code input with N boxes** where **N = `otpLength` returned by the backend (currently 6)** — never hardcoded, **Verify** button, resend control with countdown.

**Flow (Firebase Phone Auth):**
1. App calls backend **OTP request** (phone, purpose). Backend checks platform limits and returns `{ allowed, otpLength, resendAfterSeconds, blockedUntil? }`.
2. If allowed → app triggers Firebase phone verification (SMS sent by Firebase).
3. User enters the code → app confirms it with Firebase → obtains a **Firebase ID token**.
4. App sends the ID token to the backend (login / register / change phone / booking confirmation). Backend verifies the token and the phone number match, then proceeds (e.g., issues the app's own access + refresh tokens).
5. Wrong-code results from Firebase are reported to the backend (counted toward the wrong-attempts limit).

**Rules:**
- Channel: **SMS via Firebase**.
- Resend becomes available after `resendAfterSeconds` (**60 s**), countdown shown.
- Expired/invalid session from Firebase → popup "This code has expired, please request a new one."
- **Send limit (platform, on top of Firebase limits):** 5 requests within 5 minutes → blocked for **15 minutes** (show remaining time).
- **Wrong attempts:** 5 wrong codes → blocked for **15 minutes**.
- Firebase's own throttling errors are shown as "Too many attempts, please try again later."
**On success:**
- LOGIN / REGISTER → save tokens + user first name + gender → Home (no Nickname screen).
- CHANGE_PHONE → save profile changes → back to Profile.
- BOOKING_CONFIRMATION → continue booking flow (see S16).

---

### S14 — Bookings (tab)
**Guest:** Header with welcome message; center message "You are not registered yet" + **Log in** button → S11.

**Registered:**
- Header with welcome message.
- **Sticky search bar** (search bookings by salon name or reference number, debounced).
- Tabs: **Upcoming** | **Past**.
- Paginated list (10) of booking cards: salon name, **reference number**, date, time, **booking status**, **payment status**, rejection reason (if rejected).
- **Real-time:** status, payment and refund changes update the cards instantly.
- Tap → S15.
- **Empty state:** "You don't have any bookings" + **Book now** button → Home.

---

### S15 — Booking Details
**Real-time:** the screen updates instantly when the booking changes (status, payment, refund, staff reassignment).
**Layout:**
1. Top bar: Back, title "Booking Details".
2. Status block: booking status, payment status, refund status (if any), reference number.
3. Rejection / cancellation reason (if any).
4. Salon block (name, image) + **Call** and **WhatsApp** buttons.
5. **Persons:** for each person (main + companions): name, bride badge (if bride), services with prices, staff, date & time.
6. **Payment breakdown:** total, paid amount (e.g., deposit), **remaining amount to pay at the salon**.
7. **Salon policy** (snapshot at booking time): cancellation window, deposit/refund rules.
8. **Rate** button — visible when status = `COMPLETED` → S18.
9. **Sticky Cancel button** at the bottom with a **fixed message above it**:
   - Allowed: "You can cancel this booking until {deadline}."
   - Not allowed: reason, e.g., "Cancellation is not allowed less than {X} hours before the appointment."
**Cancel behavior:**
- Confirmation dialog explaining the money outcome according to the policy (e.g., "Your deposit will not be refunded" / "You will receive a full refund" / "The deposit will be deducted").
- On confirm → status `CANCELLED_BY_CUSTOMER`, refund status updated if applicable.
- **No partial cancellation** (the whole booking is cancelled). **No rescheduling** (cancel and book again).

---

### S16 — Booking Flow (multi-step, registered users only)
No pull-to-refresh. Show a step indicator. Back returns to the previous step preserving selections.

**Step 0 — Person setup (per person)**
- Main person name defaults to the account holder's name (editable). Companions require a name.
- **Women's salons only:** toggle **"This person is a bride"**. More than one bride per booking is allowed. The account holder may book for a bride without receiving a service herself (e.g., a mother booking for her daughter — the main person simply represents the bride).

**Step 1 — Select services**
- List of this salon's services (salon gender).
- **Multi-select.** Shows each service's price and duration, and the running **total price** and **total duration**.
- Services flagged **bride-only (VIP)** appear **only for persons marked as bride**.
- Continue enabled when ≥1 service selected.

**Step 2 — Select date & time**
- Calendar from today up to **90 days** ahead.
- Days fully closed (weekly day off or exceptional closure) are disabled.
- After selecting a date, show time slots at **15-minute intervals** within working hours.
- A slot is **available** if at least one staff member: is on duty that day, is qualified for **all** selected services (and **bride-qualified** if the person is a bride), and is free for the **entire total duration** starting at that slot (considering existing PENDING and APPROVED bookings).
- Unavailable slots are shown disabled with label **"Full"**.
- Slots already chosen for other persons in the same draft booking MUST be treated as occupied for that staff member (the server re-validates on submission).

**Step 3 — Select staff**
- Show **all** staff of the salon; eligible ones (per rules above for the chosen slot) are selectable, others shown **disabled**.
- Option **"Any available staff"** (the server assigns one).

**Step 4 — Companions**
- Prompt: **"Just me"** or **"Add companion"**.
- Up to **5 companions** (main + 5 = max 6 persons).
- Companions must be the **same gender as the salon**.
- Each companion repeats Steps 0–3. Same staff at an overlapping time is not allowed; choose another time or another staff member.
- Persons can be removed from the draft before submission.

**Step 5 — Summary**
- For each person: name, bride badge, services + prices, staff, date/time.
- Grand total.
- **Salon rules** block: cancellation window, deposit percentage, refund rules, the fact that the booking needs salon approval.
- **Payment method selection** among the options enabled by the salon: Pay on arrival / Deposit (shows deposit amount = total × percentage) / Full online payment.
- **Confirm** button.

**Step 6 — Verification & payment**
1. Confirm → OTP (S13, mode BOOKING_CONFIRMATION) to the user's phone.
2. If an online method was chosen → open the payment gateway (via the payment abstraction).
   - **Success** → booking is created with status **PENDING** → S17.
   - **Failure / cancelled** → booking is **not** created; return to Summary with an error message.
3. Pay on arrival → booking is created with status **PENDING** → S17.

**Business rules after creation** (see Section 9).

---

### S17 — Booking Success
- Success illustration, message: "Your booking request was sent and is waiting for the salon's approval."
- **Reference number** (copyable).
- Buttons: **View booking** → S15, **Back to Home**.
- No "add to calendar" (reminders are sent by notifications).

---

### S18 — Rating Flow
**Entry:** Booking Details "Rate" (status COMPLETED) or tapping the "booking completed" notification.
**Steps:**
1. Rate the **salon**: 1–5 stars + comment.
2. Rate **each staff member who served** in this booking: 1–5 stars + comment.
- Each step can be skipped.
- Submitted reviews are **PENDING admin approval**; show the approval message.

---

### S19 — Notifications (registered only)
**Layout:** Top bar: Back, title "Notifications" (center), **Filter** icon (End).
**Filter sheet:** date range (from – to) + search text (e.g., salon name, debounced) + Apply / Reset; active filters shown as removable chips.
**List (paginated 10):** title, short body, relative time, read/unread visual distinction.
**Behavior:**
- Each notification that becomes **visible on screen** is reported to the backend as **read** in the background (no tap needed).
- Tap → popup showing the full body; if it is a booking notification, the popup SHOULD offer **"View booking"** → S15 (or S18 for completed bookings).
**States:** shimmer, empty ("No notifications"), error, pull-to-refresh.

---

### S20 — Favorites (tab)
- Guest → message + Log in button.
- Registered → paginated list of favorite Salon cards; tapping the heart removes it; tap card → S07.
- Empty: "No favorite salons yet" + **Explore salons** → Home.

---

### S21 — Profile (tab)
**Guest layout (top → bottom):**
1. Header: welcome message with nickname + **Edit** (nickname & gender, saved locally).
2. **Settings:** Language (Arabic / English), Theme (Light / Dark / System), Notifications toggle (push on/off).
3. **Support:** Contact Us (call / WhatsApp / email), FAQ, Rate the app (opens store page), Share the app (store link via share sheet).
4. **For business:** "Register your salon with us" (entry point for merchants — destination defined in Merchant PRD; until then opens a server-provided page/form link).
5. **Legal:** Privacy Policy, Terms & Conditions, About Us.
6. **Log in** button.
7. App version.

**Registered layout differences:**
- Header: **profile photo** (default vector avatar if none), **full name**, **email**. Photo can be added/changed from **camera or gallery**, and deleted (returns to default avatar). Photo is uploaded to the backend.
- New item: **Personal Information** → S22.
- Bottom: **Log out** (confirmation dialog) instead of Log in.
- **Delete account** (confirmation dialog explaining): the account is deactivated for a **30-day grace period**; logging in during this period restores it; after 30 days it is permanently deleted. On confirm → clear registered data → continue as Guest.

**Notifications toggle:** one switch for all push notifications. When off, no push is delivered, but notifications still appear in S19.

---

### S22 — Edit Personal Information
- Same fields and validation as Register (S12), prefilled with current data.
- Save:
  - If the **phone number did not change** → save directly.
  - If the **phone number changed** → OTP (S13, mode CHANGE_PHONE) sent to the **new** number; save only after verification.
- Update locally stored `user_first_name` and `user_gender` after saving.

---

### S23 — Legal & Support Pages
- Privacy Policy, Terms & Conditions, About Us, FAQ: content from server (managed by Admin), rendered as rich text.
- Contact Us: phone (dialer), WhatsApp, email (mail app) — from server. Also used for reporting abusive salons/reviews (no separate report feature).

---

### S24 — Force Update / Maintenance
- **Force update:** blocking screen with **Update** button (opens store).
- **Optional update:** dismissible dialog (Update / Later).
- **Maintenance:** blocking screen with message from server + Retry.

---

## 9. Booking Business Rules (consolidated)

1. Only registered users can book.
2. Total duration of a person's appointment = sum of selected services' durations. Slots every 15 minutes.
3. Staff eligibility: on duty that day, not on leave, qualified for all selected services, bride-qualified if the person is a bride, free for the whole duration.
4. Weekly schedule can differ per day; **exceptional closures** override the weekly schedule.
5. Max booking horizon: **90 days**.
6. Max persons: main + **5 companions**; same gender as salon.
7. **Prices are locked at booking time** (later price changes do not affect existing bookings).
8. Every booking gets a **reference number** at creation.
9. A new booking is **PENDING** until the salon approves or rejects it. While PENDING, its slot/staff time is **held** — no other customer can book it.
10. Salon rejects → `REJECTED` with a reason; if paid → **full refund**.
11. Salon cancels an approved booking → `CANCELLED_BY_SALON` with a reason; **full refund** of anything paid (deposit or full).
12. **Auto-cancel:** if a booking is still PENDING **1 hour after the appointment start time**, it becomes `AUTO_CANCELLED`; any payment is **refunded mandatorily**.
13. Customer cancellation:
    - PENDING booking → can cancel any time, **full refund**.
    - APPROVED booking → only before the salon's cancellation window; refund per salon policy (deposit refundable or not; full payment refunded fully or minus deposit).
14. **No-show:** salon marks `NO_SHOW`; deposit/payment handled per salon policy.
15. **Completion:** only the salon marks `COMPLETED` (and paid). This enables rating.
16. Refunds are not instant: show `REFUND_PENDING` then `REFUNDED`; money returns to the original payment method.
17. Deposit = salon-defined **percentage** of the total.
18. The payment options available are those enabled by the salon; the customer picks one.

---

## 10. Notifications

### 10.1 Types & Triggers (customer receives)
| Trigger | Type |
|---|---|
| Booking created (pending approval) | BOOKING |
| Booking approved | BOOKING |
| Booking rejected (with reason) | BOOKING |
| Booking cancelled by salon (with reason) | BOOKING |
| Booking auto-cancelled | BOOKING |
| Booking cancelled by customer (confirmation) | BOOKING |
| Refund pending / refunded | BOOKING |
| Reminder: **1 hour** before an approved appointment | BOOKING |
| Reminder: **15 minutes** before an approved appointment | BOOKING |
| Booking still PENDING **30 minutes** before appointment | BOOKING |
| Booking completed (invites rating) | BOOKING |
| No-show marked | BOOKING |
| Promotions / announcements (from Admin) | PROMOTION |

### 10.2 Push Behavior
- Delivered whether the app is open or closed (unless push is disabled in Profile).
- Foreground: show an in-app banner and refresh the badge.
- **Tapping a system push notification** opens the app on **S19 Notifications** (registered users). For guests (promotions only) → Home.
- The device FCM token MUST be registered with the backend (and updated on login/logout/token refresh).

---

## 11. Validation Rules

| Field | Rule |
|---|---|
| Phone | Required; matches selected country regex (server-provided) |
| First / last name | Required; non-empty after trim |
| Email | Required; valid email format |
| Gender, City, Area | Required selections |
| Nickname | Required; non-empty |
| OTP | Exactly `otpLength` digits (from backend; currently 6) |
| Review | Rating 1–5 required; comment optional (TBD, see open items) |

---

## 12. Accessibility & Quality
- Minimum touch target 48dp.
- Content descriptions for icons/images.
- Support system font scaling without breaking layouts.
- Smooth scrolling for long lists; images sized appropriately.

---

## 13. Expected Backend Capabilities (indicative)
> The exact API contract is defined in the Backend PRD. The app needs endpoints for:
- App config (version policy, maintenance, countries, nearby radius, contact info, legal content).
- Home aggregate (by gender, optional location; includes unread notifications count when authenticated).
- Services list (paginated, by gender).
- Salons search (text + filters + location + gender, paginated); filter options (services paginated, general filters, rating options, price bounds).
- Salon details, salon reviews (paginated), staff reviews (paginated), submit review.
- Available slots (salon, services, date, bride flag) and eligible staff per slot.
- Create booking (with OTP verification), payment session initiation/confirmation, cancel booking, bookings list (upcoming/past, search, paginated), booking details.
- Auth: OTP request (limits + `otpLength`), verify Firebase ID token for login/register/phone change/booking confirmation, report wrong attempts, refresh token, logout, delete account.
- Profile: get/update, upload/delete profile photo, cities, areas.
- Favorites: list/add/remove.
- Notifications: list (filters, paginated), mark as read, register FCM token, push toggle.
- File uploads: issue presigned upload URLs and confirm uploads.
- Real-time: Socket.IO channel for booking changes and unread notifications count.

---

## 14. Analytics & Monitoring
- **Firebase Crashlytics** for crashes and non-fatal errors.
- **Firebase Analytics**: track **every screen view and every user action** for both guests and registered users.
- Firebase exports all events to **BigQuery** (retained permanently); the backend reads them to power the Admin panel (journeys, funnels, reports). The app does NOT send analytics events to the backend directly.
- On login/registration the app MUST set the Firebase **user ID** (and clear it on logout) and send its Firebase **app instance ID** to the backend, so guest history is linked to the account.
- Each event includes: event name, screen, timestamp, user type (guest/registered), user ID (if registered), gender scope, language, app version, platform, and relevant parameters (salonId, serviceId, bookingId, filter values, etc.).
- Suggested events (non-exhaustive): `screen_view`, `onboarding_skip`, `onboarding_complete`, `nickname_saved`, `gender_tab_switch`, `banner_click`, `search_query`, `filter_apply`, `filter_chip_remove`, `salon_open`, `salon_share`, `favorite_add`, `favorite_remove`, `staff_open`, `service_open`, `gallery_open`, `call_salon`, `whatsapp_salon`, `open_maps`, `location_permission_result`, `book_click`, `booking_step_*`, `booking_submit`, `payment_start`, `payment_success`, `payment_failure`, `booking_cancel`, `review_submit`, `login_start`, `otp_request`, `otp_verify_success`, `otp_verify_fail`, `register_complete`, `logout`, `delete_account`, `notification_open`, `push_open`, `language_change`, `theme_change`.

---

## 15. Security & Privacy
- Guest nickname/gender never leave the device.
- Tokens stored securely; never logged.
- No personal data in URLs or analytics parameters beyond IDs.
- Location is sent only when needed (Nearest features) and only if permission is granted.

---

## 16. Out of Scope (for this PRD)
- Merchant (salon) app features, Admin panel, backend implementation.
- In-app chat (communication is via phone/WhatsApp).
- Coupons / promo codes (banners are promotional content only).
- Rescheduling and partial cancellation.
- Email verification.

---

## 17. Open Items & Assumptions

| # | Item | Current assumption |
|---|---|---|
| 1 | KMP libraries (beyond confirmed integrations) | **TBD** — owner will provide a template |
| 2 | Payment gateway | TBD (HyperPay candidate); use abstraction |
| 3 | Deep link domain | Placeholder `<domain>` |
| 4 | Fonts & visual design | From the design files |
| 5 | Booking step order | Summary → OTP → online payment → PENDING booking |
| 6 | Slot hold during online payment | Backend holds the slot briefly during the payment session (defined in Backend PRD) |
| 7 | Multiple reviews per user per salon/staff | Allowed; all require admin approval (confirm) |
| 8 | Review comment required? | Optional (confirm) |
| 9 | Bookings search scope | Salon name + reference number |
| 10 | Favorites heart on salon cards | Yes, in addition to Salon Details |
| 11 | "Register your salon" destination | Defined in Merchant PRD |
| 12 | Guest promotion pushes | Allowed; tap opens Home |
| 13 | Platform domain (API, deep links) | TBD (to-do) |
