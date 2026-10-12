# WAB Wedding & Beauty — Business Requirements Document (BRD)
## Customer Side

| Field | Value |
|---|---|
| Document | Business Requirements Document — Customer |
| Product | WAB Wedding & Beauty |
| Version | 1.1 (OTP via Firebase SMS with configurable length, real-time bookings, analytics via Firebase + BigQuery) |
| Date | October 2026 |
| Related documents | Customer App PRD (`WAB_Customer_App_PRD.md`), Customer Design Script, Merchant PRD (upcoming), Admin PRD (upcoming), Backend PRD (upcoming) |

---

## 1. Executive Summary

WAB Wedding & Beauty is a two-sided marketplace in **Jordan** that connects customers with **men's and women's salons**. Customers discover salons, compare services, prices, staff, reviews and portfolios, and **book appointments online** for themselves and their companions, including **bride bookings** in women's salons. Salons manage their profiles, services, staff and bookings through a dedicated merchant app, and the platform is operated by an admin team.

This BRD defines **what the business needs from the customer side** of the platform: objectives, scope, customer segments, business requirements, business rules, and success metrics. The detailed functional behavior is defined in the Customer App PRD.

---

## 2. Business Background & Problem Statement

### 2.1 Customer Problems
1. **Discovery is fragmented:** customers rely on word of mouth and social media to find salons; there is no single place to compare salons by service, price, rating and distance.
2. **No price transparency:** prices are usually unknown until the customer calls or arrives.
3. **Booking is manual:** booking requires phone calls during working hours, with no visibility of available times or staff.
4. **No trusted reviews:** customers cannot see verified feedback about salons or individual staff members.
5. **Group and bridal bookings are hard:** coordinating a bride and her companions across several services and staff members is complex.

### 2.2 Opportunity
Provide a single bilingual (Arabic-first) mobile app where customers can find the right salon and staff, see prices and availability, book in minutes, pay online if they wish, and receive reminders — reducing friction for customers and increasing bookings for salons.

---

## 3. Business Objectives

| ID | Objective |
|---|---|
| OBJ-1 | Become the go-to app in Jordan for discovering and booking men's and women's salons. |
| OBJ-2 | Convert browsing visitors into registered customers and registered customers into bookings. |
| OBJ-3 | Build trust through transparent prices, working hours, staff profiles and moderated reviews. |
| OBJ-4 | Capture the high-value **wedding segment** (brides and their companions). |
| OBJ-5 | Drive repeat usage through reminders, favorites, and a smooth rebooking experience. |
| OBJ-6 | Generate data (analytics) that supports salon acquisition, paid placements and product decisions. |

---

## 4. Scope

### 4.1 In Scope (Customer Side)
- Customer mobile app on **Android and iOS**.
- Guest browsing without an account.
- Account registration and login via mobile number + OTP.
- Salon discovery: home feed, search, filters, nearby salons, recommended salons, services catalog.
- Salon profile: details, working hours, staff, services, reviews, portfolio gallery, contact (call/WhatsApp), location, sharing.
- Booking for self and up to 5 companions, including bride bookings in women's salons.
- Online payment (deposit or full) and pay-on-arrival, according to each salon's settings.
- Cancellation and refunds according to salon policy and platform rules.
- Reviews and ratings for salons and staff, moderated by admin.
- Notifications (push + in-app), favorites, profile management, support and legal content.
- Arabic (default) and English, light/dark themes.

### 4.2 Out of Scope (Customer Side)
- Coupons, promo codes, loyalty points.
- In-app chat with salons (communication via phone/WhatsApp).
- Rescheduling and partial cancellation of bookings.
- Email verification.
- Web version of the customer app.
- Home-service bookings (salon staff visiting the customer).

---

## 5. Stakeholders

| Stakeholder | Interest |
|---|---|
| Customers (guests & registered) | Find, compare and book salons easily and reliably |
| Salons (merchants) | Receive bookings, showcase work, get paid |
| Platform owner / business | Revenue (subscriptions, paid placements), growth, reputation |
| Admin / operations team | Moderate reviews, manage content, onboard salons, handle issues |
| Payment gateway provider | Process payments and refunds |
| Development team / AI agents | Clear requirements to build the product |

---

## 6. Business Model (customer-relevant view)

| Item | Decision |
|---|---|
| Customer fees | **Free for customers.** No booking fee or service fee is added. |
| Prices | Set by salons, in **JOD**, **inclusive of taxes and fees**. Locked at booking time. |
| Platform revenue | **Monthly subscription** paid by salons (first **3 months free**), plus **paid placement** in the "Recommended Salons" section. Subscriptions are collected **outside the app** for now. |
| Payment flow | Online payments (deposits and full payments) are **collected by the platform** through one payment gateway; the platform then pays out to salons. **Refunds are processed by the platform.** Gateway fees are deducted from the salon's payout. |
| Payment gateway | Not selected yet (HyperPay is a candidate). |

**Implication for customers:** the "Recommended" section is a paid placement curated by admin. The business SHOULD ensure recommended salons still meet quality standards (e.g., complete profile, acceptable rating) to protect customer trust.

---

## 7. Customer Segments & Personas

| Segment | Description | Key needs |
|---|---|---|
| **Men — regular grooming** | Haircut, beard, skin care; frequent, short visits | Nearby salon, available time now/today, price, favorite barber |
| **Women — beauty services** | Hair, skin, nails, makeup; longer, higher-value visits | Trusted staff, portfolio, reviews, privacy, price clarity |
| **Brides & wedding parties** | Bride plus family/friends on the wedding day | VIP services, bride-qualified staff, booking several people at once, certainty of confirmation |
| **Booker on behalf of others** | e.g., a mother booking for her daughter (bride) | Book without receiving a service personally |
| **Browsers (guests)** | Exploring prices and salons before committing | Browse without registration |

---

## 8. High-Level Customer Journey

1. **Install & first open** → onboarding → choose nickname and gender (guest).
2. **Discover** → home feed by gender, search, filters, nearby, recommended, services.
3. **Evaluate** → salon profile: hours, staff, services, prices, reviews, portfolio, location.
4. **Decide** → tap Book → register/log in if guest.
5. **Book** → choose services → date & time → staff → companions → summary with salon rules → OTP → payment (or pay on arrival).
6. **Wait for confirmation** → salon approves or rejects; notifications keep the customer informed.
7. **Attend** → reminders 1 hour and 15 minutes before.
8. **After visit** → salon marks completed → customer rates salon and staff.
9. **Return** → favorites, notifications, rebook.

---

## 9. Business Requirements

Priority: **M** = Must, **S** = Should, **C** = Could.

### 9.1 Access & Onboarding
| ID | Requirement | Priority |
|---|---|---|
| BR-01 | Customers MUST be able to browse the app as guests without registering. | M |
| BR-02 | First-time users MUST see a short onboarding explaining the service. | M |
| BR-03 | Guests MUST provide a nickname and gender before browsing (stored only on the device). | M |
| BR-04 | Registration and login MUST use mobile number + OTP sent by SMS (Firebase), no passwords. The OTP length is configurable by the platform (currently 6 digits). | M |
| BR-05 | Registration MUST collect first name, last name, email, gender, city, area and mobile number. | M |
| BR-06 | Booking, reviewing and favorites MUST require a registered account. | M |
| BR-07 | OTP abuse MUST be limited (send and wrong-attempt limits with temporary blocks). | M |

### 9.2 Discovery
| ID | Requirement | Priority |
|---|---|---|
| BR-10 | Content MUST be separated by **men** and **women**; each salon belongs to exactly one gender. | M |
| BR-11 | Customers MUST be able to search salons by name and filter by services, price range (for selected services), general filters (nearest, recommended) and minimum rating. | M |
| BR-12 | Customers MUST be able to see salons near them (admin-configurable radius, default 10 km) when location is enabled, including guests. | M |
| BR-13 | The home feed MUST show promotional banners, services, recommended salons and nearby salons. | M |
| BR-14 | Recommended salons and banners MUST be controlled by admin (recommended placement is a paid product for salons). | M |
| BR-15 | Customers MUST be able to browse the services catalog and see which salons offer a service. | M |

### 9.3 Salon Information & Trust
| ID | Requirement | Priority |
|---|---|---|
| BR-20 | Salon profiles MUST show cover/profile images, description, location (open in maps), phone, WhatsApp (if provided), working days & hours, exceptional closures, open/closed status, staff, services with prices and durations, reviews and a portfolio gallery. | M |
| BR-21 | Staff profiles MUST show role, rating, bio, years of experience, customers served via the app, working days, current availability and their reviews. | M |
| BR-22 | Salon ratings and staff ratings MUST be independent. | M |
| BR-23 | Only salons with a **complete profile**, **approved by admin**, and **online** (active subscription) MUST be visible to customers. | M |
| BR-24 | Customers MUST be able to share a salon via a link that opens the salon in the app. | S |
| BR-25 | Customers MUST be able to save favorite salons. | S |

### 9.4 Booking
| ID | Requirement | Priority |
|---|---|---|
| BR-30 | Customers MUST be able to book one or more services at a salon, choosing date, time and staff (or "any available staff"). | M |
| BR-31 | Availability MUST reflect working hours, exceptional closures, staff schedules, staff skills and existing bookings. | M |
| BR-32 | Customers MUST be able to add up to **5 companions** in one booking. | M |
| BR-33 | In women's salons, any person in a booking MAY be marked as a **bride**; brides see bride-only (VIP) services and only bride-qualified staff, and the salon is clearly informed that a bride is coming. | M |
| BR-34 | Every booking MUST be confirmed with OTP and receive a **reference number**. | M |
| BR-35 | Every booking MUST require **salon approval**; while pending, the time slot is held for the customer. | M |
| BR-36 | Before confirming, the customer MUST see the salon's rules (cancellation window, deposit, refund and no-show policies). | M |
| BR-37 | Bookings MUST be possible up to **90 days** ahead. | M |
| BR-38 | Prices MUST be locked at booking time. | M |

### 9.5 Payments, Cancellations & Refunds
| ID | Requirement | Priority |
|---|---|---|
| BR-40 | Customers MUST be able to pay **on arrival**, pay a **deposit** (salon-defined percentage) or pay the **full amount online**, limited to the options enabled by each salon. | M |
| BR-41 | Online payments and refunds MUST be processed by the platform through a single payment gateway. | M |
| BR-42 | A failed payment MUST NOT create a booking. | M |
| BR-43 | Customers MUST be able to cancel a **pending** booking at any time with a full refund. | M |
| BR-44 | Customers MUST be able to cancel an **approved** booking only within the salon's cancellation window; the refund follows the salon's policy. | M |
| BR-45 | If the salon rejects or cancels a booking, the customer MUST receive a **full refund** and see the reason. | M |
| BR-46 | A booking still pending **1 hour after** its appointment time MUST be cancelled automatically with a mandatory full refund. | M |
| BR-47 | Customers MUST see payment status (paid, deposit, remaining amount) and refund status (pending, refunded). | M |

### 9.6 Reviews
| ID | Requirement | Priority |
|---|---|---|
| BR-50 | Any registered customer MAY review a salon or a staff member (no previous booking required). | M |
| BR-51 | All reviews MUST be approved by admin before being published. | M |
| BR-52 | After a completed booking, the customer SHOULD be invited to rate the salon and the staff who served them. | S |
| BR-53 | Abuse reports (reviews or salons) are handled through **Contact Us**. | M |

### 9.7 Notifications & Communication
| ID | Requirement | Priority |
|---|---|---|
| BR-60 | Customers MUST be notified of every booking status change and refund update. | M |
| BR-61 | Customers MUST receive reminders **1 hour** and **15 minutes** before approved appointments, and an alert if a booking is still pending 30 minutes before the appointment. | M |
| BR-62 | The business MUST be able to send promotional notifications. | M |
| BR-63 | Customers MUST be able to turn push notifications on/off (in-app notification list remains available). | M |
| BR-64 | Customers MUST be able to call or WhatsApp a salon directly from the salon profile and booking details. | M |
| BR-65 | Booking statuses, payments, refunds and the unread notifications count MUST update in real time in the app. | M |

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
| BR-90 | Every screen view and user action (guest and registered) MUST be tracked in Firebase Analytics, exported to BigQuery (retained permanently), and be visible in the admin panel, including guest history linked to the account after registration. | M |
| BR-91 | Crashes MUST be tracked (Firebase Crashlytics). | M |

---

## 10. Key Business Rules (summary)

| ID | Rule |
|---|---|
| BRL-01 | Each salon serves one gender only; companions must match the salon's gender. |
| BRL-02 | Booking statuses: Pending → Approved / Rejected → Completed / No-show / Cancelled (by customer, by salon, automatically). |
| BRL-03 | Only the salon marks a booking as **Completed** (and paid) or **No-show**. |
| BRL-04 | Pending bookings hold their slot until the salon decides or the booking is auto-cancelled. |
| BRL-05 | Salon rejection/cancellation and auto-cancellation always trigger a **full refund**. |
| BRL-06 | Customer cancellation of an approved booking follows the salon's cancellation window and refund policy. |
| BRL-07 | No partial cancellation and no rescheduling. |
| BRL-08 | Prices are tax-inclusive, set by the salon, locked at booking. |
| BRL-09 | Reviews are published only after admin approval. |
| BRL-10 | Suspended (offline) salons are hidden and cannot receive new bookings; existing approved bookings remain. |

---

## 11. Success Metrics (KPIs)

> Targets to be set by the business before launch.

| Area | KPI |
|---|---|
| Acquisition | App installs; installs by platform |
| Activation | Onboarding completion rate; guest → registered conversion rate |
| Engagement | Monthly active users; salon profile views per session; search & filter usage |
| Conversion | Salon view → booking start; booking start → booking submitted (funnel per step) |
| Fulfilment | Salon approval rate; average salon response time; auto-cancellation rate |
| Quality | Customer cancellation rate; no-show rate; average salon rating; review approval rate |
| Retention | Repeat booking rate (30/90 days); favorites per user |
| Payments | Share of online payments vs pay on arrival; payment failure rate; refund volume and time |
| Wedding segment | Number of bride bookings; average persons per bride booking |

---

## 12. Assumptions, Constraints & Dependencies

**Assumptions**
- Salons keep their schedules, staff and services up to date in the merchant app.
- Salons respond to booking requests promptly.
- Walk-in and phone customers are managed by salons without conflicting with app bookings (no manual booking feature).

**Constraints**
- Jordan market only; JOD only.
- Mobile apps only (Android + iOS), built with Kotlin Multiplatform + Compose Multiplatform.
- App store policies (e.g., in-app account deletion).

**Dependencies**
- Payment gateway selection and merchant agreement.
- Firebase (phone OTP via SMS, push, analytics, crashlytics) and BigQuery export.
- `wab-payments` library (server + mobile) for the payment gateway.
- Merchant app and admin panel for content, approvals and booking decisions.

---

## 13. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Salons respond slowly to booking requests | Poor customer experience, held slots | Pending reminders to salons, 30-minute pending alert, auto-cancellation with refund, response-time KPI |
| Double booking due to walk-ins / phone bookings | Customer arrives with no slot | Salon onboarding guidance; monitor complaints; revisit manual booking later |
| Fake or abusive reviews | Loss of trust | Admin approval of all reviews; reporting through Contact Us |
| Paid "Recommended" placement perceived as misleading | Loss of trust | Quality criteria for recommended salons |
| No-shows | Salon revenue loss | Deposits, cancellation windows, no-show policies per salon |
| Refund delays | Complaints | Visible refund status; clear messaging that refunds take time |
| Payment gateway not yet selected | Launch delay | Payment abstraction; pay-on-arrival can launch first |
| Low salon supply at launch | Empty results | Salon acquisition before customer marketing; 3 free months |

---

## 14. Compliance & Policies
- Personal data handling in line with applicable Jordanian data protection regulations; privacy policy published in the app.
- Guest nickname/gender stays on the device.
- Payment card data handled only by the PCI-compliant payment gateway.
- In-app account deletion as required by Apple App Store and Google Play.
- Terms & conditions covering bookings, cancellations, refunds and reviews.

---

## 15. Open Items

| # | Item |
|---|---|
| 1 | Payment gateway selection |
| 2 | KPI targets |
| 3 | Quality criteria for paid "Recommended" placement |
| 4 | Payout frequency to salons (merchant-side, affects refund handling) |
| 5 | Deep link domain |

---

## 16. Glossary

| Term | Meaning |
|---|---|
| Guest | User browsing without an account |
| Registered customer | User with a verified account |
| Merchant / Salon | Business offering services on the platform |
| Staff | Salon employee who performs services |
| Bride booking | Booking where at least one person is marked as a bride (women's salons) |
| Companion | Additional person in a booking (max 5) |
| Deposit | Salon-defined percentage of the total paid online in advance |
| Cancellation window | Minimum time before the appointment after which the customer cannot cancel |
| Offline salon | Salon suspended by admin; hidden from customers |
| OTP | One-time password sent by SMS for verification |
