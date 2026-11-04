# WAB Wedding & Beauty — Business Requirements Document (BRD)
## Customer Side

| Field | Value |
|---|---|
| Document | Business Requirements Document — Customer |
| Product | WAB Wedding & Beauty |
| Version | 1.2 |
| Date | 2026-11-04 |
| Precedence | PRD > BRD > Design Script > design files. `BUSINESS_DOMAIN.md` (repo root) holds the data and the rules |
| Related documents | Customer App PRD (`WAB_Customer_App_PRD.md`), Customer Design Script, Merchant PRD (`WAB-Mobile-Salon/docs`), Admin PRD (`WAB-Admin-Dashboard/docs`), Backend BRD (`WAB-Server/docs`) |

In this document "business" means a salon, clinic or tattoo studio; "salon" is used only where a rule is really salon-only. A line starting "Not built yet:" marks a place where today's app differs from the requirement.

---

## 1. Executive Summary

WAB Wedding & Beauty is a two-sided marketplace in **Jordan** that connects customers with **businesses of three types: salons (men, women or both), beauty clinics and tattoo studios**. Customers discover businesses, compare services, prices, staff, reviews and portfolios, and **book appointments online** for themselves and up to 5 companions, including **bride bookings** at salons serving women. Businesses register with documents, get approved by admin, complete their profile, manage branches, services, staff and bookings through a dedicated merchant app, and accept or reject booking requests in real time. The platform is operated by an admin team.

This BRD defines **what the business needs from the customer side** of the platform: objectives, scope, customer segments, business requirements, business rules, and success metrics. The detailed functional behavior is defined in the Customer App PRD.

---

## 2. Business Background & Problem Statement

### 2.1 Customer Problems
1. **Discovery is fragmented:** customers rely on word of mouth and social media to find salons, clinics and tattoo studios; there is no single place to compare them by service, price, rating and distance.
2. **No price transparency:** prices are usually unknown until the customer calls or arrives.
3. **Booking is manual:** booking requires phone calls during working hours, with no visibility of available times or staff.
4. **No trusted reviews:** customers cannot see verified feedback about businesses or individual staff members.
5. **Group and bridal bookings are hard:** coordinating a bride and her companions across several services and staff members is complex.

### 2.2 Opportunity
Provide a single bilingual (Arabic-first) mobile app where customers can find the right business, branch and staff, see prices and availability, book in minutes, and receive reminders — reducing friction for customers and increasing bookings for businesses.

---

## 3. Business Objectives

| ID | Objective |
|---|---|
| OBJ-1 | Become the go-to app in Jordan for discovering and booking salons, beauty clinics and tattoo studios. |
| OBJ-2 | Convert browsing visitors into registered customers and registered customers into bookings. |
| OBJ-3 | Build trust through transparent prices, working hours, staff profiles and moderated reviews. |
| OBJ-4 | Capture the high-value **wedding segment** (brides and their companions). |
| OBJ-5 | Drive repeat usage through reminders, favorites, and Book again. |
| OBJ-6 | Generate data (analytics) that supports business acquisition, paid placements and product decisions. |

---

## 4. Scope

### 4.1 In Scope (Customer Side)
- Customer mobile app on **Android and iOS**.
- Guest browsing without an account.
- Account registration and login via mobile number + WhatsApp OTP.
- Discovery across every business type, with no gender filter: home feed, type lens, search with suggestions, filters, Near you, Recommended, Book again, services catalog.
- Business profile: type and audience, branches, details, working hours, staff, services, reviews, portfolio gallery, contact (call/WhatsApp), location, sharing.
- Booking for self and up to 5 companions at a chosen branch, including bride bookings at salons serving women and an optional design image at tattoo studios.
- Bookings a business makes for a registered customer, visible in the app with a "Booked by" label.
- Payment: pay on arrival, deposit or full online according to each business's settings (designed). **Status today: online payment is paused; the app offers pay on arrival.**
- Cancellation and refunds according to business policy and platform rules.
- Reviews and ratings for businesses and staff, moderated by admin.
- Notifications (push + in-app), favorites, profile management, support and legal content.
- Arabic (default) and English, light/dark themes.

### 4.2 Out of Scope (Customer Side)
- Coupons, promo codes, loyalty points.
- In-app chat with businesses (communication via phone/WhatsApp).
- Rescheduling and partial cancellation of bookings.
- Email verification.
- Web version of the customer app.
- Home-service bookings (business staff visiting the customer).
- Age checks for tattoo bookings (owner decision: none).

---

## 5. Stakeholders

| Stakeholder | Interest |
|---|---|
| Customers (guests & registered) | Find, compare and book businesses easily and reliably |
| Businesses (merchants: salons, clinics, tattoo studios) | Receive bookings, showcase work, get paid |
| Platform owner / business | Revenue (subscriptions, paid placements), growth, reputation |
| Admin / operations team | Moderate reviews, manage content, onboard businesses, handle issues |
| Payment gateway provider | Process payments and refunds (gateway not chosen yet) |
| ARQAM OTP | Delivers phone codes on WhatsApp |
| Development team / AI agents | Clear requirements to build the product |

---

## 6. Business Model (customer-relevant view)

| Item | Decision |
|---|---|
| Customer fees | **Free for customers.** No booking fee or service fee is added. |
| Prices | Set by businesses per branch, in **JOD**, **inclusive of taxes and fees**, stored as integer fils. Locked at booking time. |
| Platform revenue | **Monthly subscription** paid by businesses (**3 months free per business from approval**, covers all its branches), plus **paid Recommended placement** per business. Subscriptions are paid **outside the app** and recorded by admin. |
| Payment flow (designed, Phase 1) | Online payments (deposits and full payments) are **collected by the platform** through one payment gateway; refunds are automatic and processed by the platform; businesses are paid manually, with gateway fees deducted from the payout. Phase 2 = split payments. |
| Payment status today | **Online payment is paused.** No gateway is chosen (HyperPay is only a candidate). The app offers pay on arrival and shows online payment as "coming soon". |

**Implication for customers:** the Recommended section is a paid placement curated by admin. The business SHOULD ensure recommended businesses still meet quality standards (e.g., complete profile, acceptable rating) to protect customer trust.

---

## 7. Customer Segments & Personas

| Segment | Description | Key needs |
|---|---|---|
| **Men — regular grooming** | Haircut, beard, skin care; frequent, short visits | Nearby salon, available time now/today, price, favorite barber |
| **Women — beauty services** | Hair, skin, nails, makeup; longer, higher-value visits | Trusted staff, portfolio, reviews, privacy, price clarity |
| **Brides & wedding parties** | Bride plus family/friends on the wedding day | VIP services, bride-qualified staff, booking several people at once, certainty of confirmation |
| **Beauty clinic customers** | Botox, filler, laser and similar services, men and women | Trusted clinic and staff, reviews, price clarity, nearby branch |
| **Tattoo customers** | Tattoo studio visits, men and women | Studio portfolio, chosen artist, sharing a design image with the booking |
| **Booker on behalf of others** | e.g., a mother booking for her daughter (bride) | Book without receiving a service personally |
| **Browsers (guests)** | Exploring prices and businesses before committing | Browse without registration |

---

## 8. High-Level Customer Journey

1. **Install & first open** → onboarding → choose nickname and gender (guest).
2. **Discover** → home feed with the type lens (banners, Explore, Recommended, Book again, Near you), search, filters.
3. **Evaluate** → business profile: type and audience, branches, hours, staff, services, prices, reviews, portfolio, location.
4. **Decide** → tap Book → register/log in if guest.
5. **Book** → choose branch → person details → services → date & time → staff → companions → summary with business rules → OTP → pay on arrival (online payment when it returns).
6. **Wait for confirmation** → business approves or rejects; notifications keep the customer informed.
7. **Attend** → reminders 1 hour and 15 minutes before.
8. **After visit** → business marks completed → customer rates business and staff.
9. **Return** → favorites, notifications, Book again.

---

## 9. Business Requirements

Priority: **M** = Must, **S** = Should, **C** = Could.

### 9.1 Access & Onboarding
| ID | Requirement | Priority |
|---|---|---|
| BR-01 | Customers MUST be able to browse the app as guests without registering. | M |
| BR-02 | First-time users MUST see a short onboarding explaining the service. | M |
| BR-03 | Guests MUST provide a nickname and gender before browsing (stored on the device; gender only selects banners and never filters discovery). | M |
| BR-04 | Registration and login MUST use mobile number + OTP, no passwords. The server generates the code and ARQAM OTP delivers it **over WhatsApp** (AR/EN template). No Firebase Phone Auth, no SMS fallback. The OTP length comes from the backend (currently 6 digits). | M |
| BR-05 | Registration MUST collect first name, last name, email, gender, city, area and mobile number. | M |
| BR-06 | Booking, reviewing and favorites MUST require a registered account. | M |
| BR-07 | OTP abuse MUST be limited (5 requests in 5 minutes; 5 wrong codes; a 15-minute block). | M |

### 9.2 Discovery
| ID | Requirement | Priority |
|---|---|---|
| BR-10 | Discovery MUST NOT be filtered by gender. Every customer-visible business of every type and audience is listed for everyone; cards show type + audience. Gender is asked only in guest setup and registration. | M |
| BR-11 | Customers MUST be able to search businesses by name with typed suggestions (services with place counts, then places) and recent searches on the device, use quick chips (Open now, Nearest, 4★, Price), and filter by business type (several), services, gender (Men = audience MALE or BOTH, Women = FEMALE or BOTH), price and minimum rating. Not built yet: Open now filters loaded pages on the device. | M |
| BR-12 | Customers MUST be able to see businesses near them (admin-configurable radius, default 10 km) when location is enabled, including guests: one entry per bookable branch, ranked by distance. | M |
| BR-13 | The home feed MUST show, in order: banners, Explore (most-booked services), Recommended, Book again (registered customers with completed bookings), Near you (last). | M |
| BR-14 | Recommended businesses and banners MUST be controlled by admin (Recommended placement is a paid product for businesses). | M |
| BR-15 | Customers MUST be able to browse the services catalog and see which businesses offer a service. | M |
| BR-16 | A type lens **All · Salons · Clinics · Tattoo** MUST be available on Home, Search and Bookings; on Home it filters every section at once. | M |
| BR-17 | Home MUST appear without waiting for location. Near you fills from the device's cached position, else a fresh fix. Location off → "enable location"; location on but no position in time → "could not get your location" + Try again, never the enable prompt. | M |
| BR-18 | Registered customers MUST be able to book a business again from Home and from completed bookings, with the same services preselected. Not built yet: Book again opens the business without preselecting services. | S |

### 9.3 Business Information & Trust
| ID | Requirement | Priority |
|---|---|---|
| BR-20 | Business profiles MUST show type and audience, cover/profile images, description, branches, and per branch location (open in maps), phone, WhatsApp (if provided), working days & hours, exceptional closures, open/closed status, staff, services with prices and durations; plus reviews and a portfolio gallery. | M |
| BR-21 | Staff profiles MUST show role, rating, bio, years of experience, customers served via the app, working days, current availability and their reviews. | M |
| BR-22 | Business ratings and staff ratings MUST be independent. The business rating covers all branches. | M |
| BR-23 | Only businesses **approved by admin**, with a **complete profile**, **not offline**, and with **at least one bookable branch** MUST be visible to customers. | M |
| BR-24 | Customers MUST be able to share a business via a link that opens it in the app. | S |
| BR-25 | Customers MUST be able to save favorite businesses. | S |
| BR-26 | A business with several bookable branches MUST let the customer choose a branch on its profile; search lists it once (nearest bookable branch), Near you once per branch ("Business - Branch"). | M |

### 9.4 Booking
| ID | Requirement | Priority |
|---|---|---|
| BR-30 | Customers MUST be able to book one or more services at a branch of a business, choosing date, time and staff (or "any available staff"). | M |
| BR-31 | Availability MUST reflect the branch's working hours and exceptional closures, staff schedules, staff skills and existing bookings. | M |
| BR-32 | Customers MUST be able to add up to **5 companions** in one booking. | M |
| BR-33 | At a salon with audience FEMALE or BOTH, a woman in a booking MAY be marked as a **bride**; brides see bride-only (VIP) services and only bride-qualified staff, and the salon is clearly informed that a bride is coming. Never at clinics or tattoo studios. | M |
| BR-34 | Every booking made in the app MUST be confirmed with OTP and receive a **reference number**. | M |
| BR-35 | Every booking made in the app MUST require **the business's approval**; while pending, the time slot is held for the customer. | M |
| BR-36 | Before confirming, the customer MUST see the business's rules (cancellation window, deposit, refund and no-show policies). | M |
| BR-37 | Bookings MUST be possible up to **90 days** ahead, in 15-minute slots. | M |
| BR-38 | Prices MUST be locked at booking time. | M |
| BR-39 | When a business has more than one bookable branch, the customer MUST choose the branch first; services, staff and slots are that branch's. A branch already chosen on the business profile counts as the choice. | M |

### 9.5 Payments, Cancellations & Refunds
| ID | Requirement | Priority |
|---|---|---|
| BR-40 | Customers MUST be able to pay **on arrival**, pay a **deposit** (business-defined percentage) or pay the **full amount online**, limited to the options enabled by each business (designed; see BR-48). | M |
| BR-41 | Online payments and refunds MUST be processed by the platform through a single payment gateway. | M |
| BR-42 | A failed payment MUST NOT create a booking. | M |
| BR-43 | Customers MUST be able to cancel a **pending** booking at any time with a full refund. | M |
| BR-44 | Customers MUST be able to cancel an **approved** booking only within the business's cancellation window; the refund follows the snapshotted policy. | M |
| BR-45 | If the business rejects or cancels a booking, the customer MUST receive a **full refund** and see the reason. | M |
| BR-46 | A booking still pending **60 minutes after** its appointment start MUST be cancelled automatically with a mandatory full refund. | M |
| BR-47 | Customers MUST see payment status (paid, deposit, remaining amount) and refund status (pending, refunded). | M |
| BR-48 | While online payment is paused, the app MUST offer pay on arrival and show deposit and full online as "coming soon", not selectable. | M |

### 9.6 Reviews
| ID | Requirement | Priority |
|---|---|---|
| BR-50 | Any active registered customer MAY review any live business or its staff (no previous booking required). | M |
| BR-51 | All reviews MUST be approved by admin before being published. | M |
| BR-52 | After a completed booking, the customer SHOULD be invited to rate the business and the staff who served them. | S |
| BR-53 | Abuse reports (reviews or businesses) are handled through **Contact Us**. | M |
| BR-54 | Reviews MUST be business-wide; a review shows its branch as a label only. | M |
| BR-55 | Only registered customers review. A booking the business made for a number without an account MUST NOT be reviewable until that number registers and claims it. | M |

### 9.7 Notifications & Communication
| ID | Requirement | Priority |
|---|---|---|
| BR-60 | Customers MUST be notified of every booking status change and refund update. | M |
| BR-61 | Customers MUST receive reminders **1 hour** and **15 minutes** before approved appointments, and an alert if a booking is still pending 30 minutes before the appointment. | M |
| BR-62 | The business MUST be able to send promotional notifications. | M |
| BR-63 | Customers MUST be able to turn push notifications on/off (in-app notification list remains available). | M |
| BR-64 | Customers MUST be able to call or WhatsApp a business branch directly from its profile and booking details. | M |
| BR-65 | Booking statuses, payments, refunds and the unread notifications count MUST update in real time in the app. | M |
| BR-66 | Booking notifications MUST name the place "Business - Branch" when the business has several branches, and "Booked by …" for a booking the business made. | M |

### 9.8 Account, Support & Compliance
| ID | Requirement | Priority |
|---|---|---|
| BR-70 | Customers MUST be able to edit personal information; changing the phone number requires OTP to the new number. | M |
| BR-71 | Customers MUST be able to delete their account (30-day grace period, then permanent deletion) — required by app store policies. | M |
| BR-72 | Admin MUST be able to block customer accounts. | M |
| BR-73 | Legal content (privacy policy, terms, about) and support channels MUST be managed by admin. | M |
| BR-74 | The business MUST be able to force or suggest app updates and enable maintenance mode. | M |

### 9.9 Localization & Experience
| ID | Requirement | Priority |
|---|---|---|
| BR-80 | Arabic (default, RTL) and English MUST be supported. | M |
| BR-81 | Light, dark and system themes MUST be supported. | S |
| BR-82 | Currency is JOD only; time in 12-hour format. | M |

### 9.10 Data & Analytics
| ID | Requirement | Priority |
|---|---|---|
| BR-90 | Every screen view and user action (guest and registered) MUST be tracked in Firebase Analytics. The app never sends analytics to the backend. The server records its own events in MongoDB and the admin panel reads them. There is no BigQuery export (owner decision). | M |
| BR-91 | Crashes MUST be tracked (Firebase Crashlytics). | M |

### 9.11 Business Types, Tattoo Studios and Bookings Made by the Business
| ID | Requirement | Priority |
|---|---|---|
| BR-100 | Every business MUST be a SALON, CLINIC or TATTOO studio (never changes) with an audience MALE, FEMALE or BOTH; clinics and tattoo studios are always BOTH. | M |
| BR-101 | At a salon with audience MALE or FEMALE every person in a booking MUST match it. At a BOTH salon, clinic or tattoo studio each person has their own gender and one booking may mix them. Not built yet: the app does not compare a men's or women's salon with the account holder's gender. | M |
| BR-102 | At a tattoo studio each person MAY attach **one optional design image**; it stays private and is visible only to the customer and to members who can view that booking. There is no age check. Not built yet: gallery only, no camera. | M |
| BR-103 | A booking the business makes for a registered number MUST appear in the customer's app with a **"Booked by …"** label, and every status notification MUST name it. The customer can cancel it under the snapshotted policy. | M |
| BR-104 | A booking the business makes for a number without an account MUST create no account and send **no WhatsApp or SMS**; it is claimed automatically when that number registers. | M |

---

## 10. Key Business Rules (summary)

| ID | Rule |
|---|---|
| BRL-01 | A salon serves men, women or both; clinics and tattoo studios serve both. At a men's or women's salon every person must match its audience. |
| BRL-02 | Booking statuses: Pending → Approved / Rejected → Completed / No-show / Cancelled (by customer, by business, automatically). A booking the business makes starts Approved. |
| BRL-03 | Only the business (assigned staff, a member with `BOOKINGS_OPERATE`, the owner) or admin marks a booking **Completed** (and paid) or **No-show**, at or after its start. |
| BRL-04 | Pending bookings hold their slot until the business decides or the booking is auto-cancelled. |
| BRL-05 | Business rejection/cancellation and auto-cancellation always trigger a **full refund**. |
| BRL-06 | Customer cancellation of an approved booking follows the business's cancellation window and refund policy. |
| BRL-07 | No partial cancellation and no rescheduling. |
| BRL-08 | Prices are tax-inclusive, set by the business per branch, locked at booking. |
| BRL-09 | Reviews are published only after admin approval. |
| BRL-10 | Offline businesses and branches are hidden and cannot receive new bookings; existing bookings remain. A business goes offline only by admin; a branch by admin or owner. |
| BRL-11 | Gender never filters discovery. |
| BRL-12 | Per branch: location, contacts, hours, closures, services and prices, staff. Business-wide: name, audience, images, description, policy, subscription, payouts, rating, Recommended placement. |
| BRL-13 | Bride bookings exist only at salons with audience FEMALE or BOTH. |

Full rules: `BUSINESS_DOMAIN.md` §5, state machine §5.7, notifications §8, settings §10, error codes §11.

---

## 11. Success Metrics (KPIs)

> Targets to be set by the business before launch.

| Area | KPI |
|---|---|
| Acquisition | App installs; installs by platform |
| Activation | Onboarding completion rate; guest → registered conversion rate |
| Engagement | Monthly active users; business profile views per session; search & filter usage; type lens usage |
| Conversion | Business view → booking start; booking start → booking submitted (funnel per step) |
| Fulfilment | Business approval rate; average business response time; auto-cancellation rate |
| Quality | Customer cancellation rate; no-show rate; average business rating; review approval rate |
| Retention | Repeat booking rate (30/90 days); favorites per user; Book again usage |
| Mix | Bookings by business type; bookings by source (app, business) |
| Payments | Share of online payments vs pay on arrival (once online payment returns); payment failure rate; refund volume and time |
| Wedding segment | Number of bride bookings; average persons per bride booking |

---

## 12. Assumptions, Constraints & Dependencies

**Assumptions**
- Businesses keep their branches, schedules, staff and services up to date in the merchant app.
- Businesses respond to booking requests promptly.
- Businesses enter walk-in and phone customers as their own bookings so they do not conflict with app bookings.

**Constraints**
- Jordan market only; JOD only.
- Mobile apps only (Android + iOS), built with Kotlin Multiplatform + Compose Multiplatform.
- App store policies (e.g., in-app account deletion).
- Phone sign-in needs WhatsApp: there is no SMS fallback.

**Dependencies**
- ARQAM OTP (WhatsApp delivery of codes).
- Firebase (push, analytics, crashlytics only).
- Cloudflare R2 for files (public + private bucket).
- Payment gateway selection and merchant agreement, and the `wab-payments` library (server + mobile), for online payment.
- Merchant app and admin panel for content, approvals and booking decisions.
- Open owner decisions: production hosting, platform domain, Atlas tier, error tracking, package registry, store accounts and signing (root `CLAUDE.md` §6). The hosted dev API is on Render.

---

## 13. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Businesses respond slowly to booking requests | Poor customer experience, held slots | Pending reminders to businesses, 30-minute pending alert, auto-cancellation with refund, response-time KPI |
| Double booking due to walk-ins / phone bookings | Customer arrives with no slot | Businesses enter these as their own bookings under the same staff locks; monitor complaints |
| Fake or abusive reviews | Loss of trust | Admin approval of all reviews; reporting through Contact Us |
| Paid Recommended placement perceived as misleading | Loss of trust | Quality criteria for recommended businesses |
| No-shows | Business revenue loss | Deposits, cancellation windows, no-show policies per business |
| Refund delays | Complaints | Visible refund status; clear messaging that refunds take time |
| Payment gateway not yet selected | Online payment stays paused | Payment abstraction; the app runs on pay on arrival until a gateway is chosen |
| Customer reaches a men's or women's salon that cannot serve them | Confusion, refused booking | Type + audience on every card and profile; gender filter in search; `GENDER_MISMATCH` refusal |
| Customer's number has no WhatsApp | Cannot sign in or confirm a booking | Clear message on the OTP screen; owner decision: no SMS fallback |
| Low business supply at launch | Empty results | Business acquisition before customer marketing; 3 free months |

---

## 14. Compliance & Policies
- Personal data handling in line with applicable Jordanian data protection regulations; privacy policy published in the app.
- The guest nickname stays on the device. The stored gender is sent only as the `gender` parameter of `GET /home` (selects banners) and as an analytics field; a guest's value creates no account or profile.
- Tattoo design images are private: signed URLs, visible only to the customer and to members who can view that booking.
- A booking the business makes for a number without an account sends no message to that number.
- Payment card data handled only by the PCI-compliant payment gateway.
- In-app account deletion as required by Apple App Store and Google Play.
- Terms & conditions covering bookings, cancellations, refunds and reviews.

---

## 15. Open Items

| # | Item |
|---|---|
| 1 | Payment gateway selection (online payment paused until then) |
| 2 | KPI targets |
| 3 | Quality criteria for paid Recommended placement |
| 4 | Payout frequency to businesses (merchant-side, affects refund handling) |
| 5 | Deep link domain (platform domain) |
| 6 | Production hosting, Atlas tier, error tracking, package registry, store accounts and signing |
| 7 | Whether sending the stored gender on `GET /home` and in analytics is acceptable for guests (§14) |
| 8 | Enforcing "cannot book for themselves" at a men's or women's salon (BR-101, BUSINESS_DOMAIN §12 point 11) |
| 9 | A business without pay on arrival cannot be booked while online payment is paused |

---

## 16. Glossary

| Term | Meaning |
|---|---|
| Guest | User browsing without an account |
| Registered customer | User with a verified account |
| Business / Merchant | A salon, beauty clinic or tattoo studio on the platform |
| Business type | `SALON`, `CLINIC` or `TATTOO`; never changes |
| Audience | Who a business serves: `MALE`, `FEMALE` or `BOTH`; clinics and tattoo studios are always `BOTH` |
| Branch | One location of a business, with its own contacts, hours, closures, services, prices and staff |
| Type lens | The chips All · Salons · Clinics · Tattoo on Home, Search and Bookings |
| Staff | Business employee who performs services; belongs to one branch |
| Bride booking | Booking where at least one person is marked as a bride (salons with audience FEMALE or BOTH) |
| Companion | Additional person in a booking (max 5) |
| Deposit | Business-defined percentage of the total paid online in advance |
| Cancellation window | Minimum time before the appointment after which the customer cannot cancel |
| Offline business | Business suspended by admin; hidden from customers |
| Booked by | Label on a booking the business made for the customer (`source = MERCHANT`) |
| Claim | A number that registers (or a phone change) takes over bookings the business made for it |
| OTP | One-time code generated by the server and delivered on WhatsApp by ARQAM OTP |
