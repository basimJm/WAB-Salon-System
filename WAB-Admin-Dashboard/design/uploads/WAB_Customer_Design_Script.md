# WAB Wedding & Beauty — Customer App Design Script

> **Use:** Paste this whole document into Claude Design together with your existing theme / design system and logo.
> **Source of truth:** `WAB_Customer_App_PRD.md`. Every screen, state and rule below matches it. If anything here conflicts with the PRD, the PRD wins.

---

## 0. Instructions to the Designer (read first)

1. **Keep only the existing theme and logo.** Use the existing colors, typography, spacing, radii, elevation and icon style, and the existing logo. Do not introduce new colors or fonts. Build every component from these theme tokens.
2. **Rebuild ALL screens from scratch.** Any previously built screens are for reference only (to see the theme applied); do not copy their layouts. Every screen must follow this script and the PRD exactly.
3. Design **every screen and every state** listed below. A screen is not complete until all its states exist.
4. **Primary language: Arabic, RTL.** Design every screen in Arabic RTL first. Then provide the English LTR version of the key screens (Home, Salon Details, Filter, Booking Summary, Login) to validate mirroring. Never place elements as fixed "left/right"; think in Start/End (Start = right in Arabic).
5. **Light and Dark mode:** design Light for all screens; provide Dark for the key screens listed above (theme supports Light / Dark / System).
6. **Device frame:** mobile, 390×844 (iPhone 14/15 size). Respect safe areas, status bar and home indicator. Shared UI for Android and iOS (Compose Multiplatform), so avoid platform-exclusive patterns.
7. **Realistic content:** Jordanian context, Arabic names, JOD prices (e.g., "10 د.أ"), Amman areas (عبدون، الجاردنز، أم أذينة، الصويفية، خلدا), 12-hour times (ص / م).
8. **Loading = shimmer** shaped exactly like the real content (never a lone spinner for content screens).
9. Name frames as `S03 Home / Registered / Loading` etc., using the IDs below, so developers can map them to the PRD.

---

## 1. Global Patterns (design once, reuse everywhere)

### 1.1 Universal States (create a reusable template for each)
| State | Content |
|---|---|
| **Loading** | Shimmer placeholders matching the layout of the screen |
| **Pagination loading** | Shimmer item(s) at the bottom of a list |
| **No internet** | Illustration + "لا يوجد اتصال بالإنترنت" + **إعادة المحاولة** button |
| **Server error** | Illustration + "حدث خطأ ما" + **إعادة المحاولة** |
| **Empty** | Illustration + contextual message (+ action if defined per screen) |
| **Pull to refresh** | Refresh indicator at top (all screens except forms: Login, Register, OTP, Edit Profile, Booking Flow) |
| **Toast / snackbar** | Success, error and info variants |

### 1.2 Core Components
- **Bottom Navigation Bar** — 4 items: الرئيسية (Home), المفضلة (Favorites), الحجوزات (Bookings), الملف الشخصي (Profile). Home selected by default.
- **Salon Card** (used in every salon list): profile image, salon name, rating (stars + value), location text, short description truncated with "المزيد", open/closed badge + today's hours ("مفتوح · 8:00 ص – 4:00 م" / "مغلق اليوم"), favorite heart. Variants: horizontal (home carousels), vertical/full-width (lists), shimmer.
- **Service Card**: image, name, short description. Variants: compact (home carousel), expandable (All Services, collapsed/expanded), shimmer.
- **Section Header**: title at Start, "عرض المزيد / عرض الكل" at End (variant without the action for ≤10 items).
- **Search Bar**: non-editable variant (Home) and editable variant with filter icon button (All Salons).
- **Filter Chip**: selectable chip (unselected/selected), active-filter chip with × remove.
- **Gender Tabs**: رجال | نساء (two states).
- **Status Badges**: booking status — قيد الانتظار (Pending), مقبول (Approved), مرفوض (Rejected), ملغي من العميل, ملغي من الصالون, ملغي تلقائياً, مكتمل (Completed), لم يحضر (No-show). Payment status — الدفع عند الوصول, تم دفع العربون, تم الدفع كاملاً, مدفوع. Refund — قيد الاسترجاع, تم الاسترجاع. Staff — مداوم اليوم, في إجازة. Salon — مفتوح, مغلق. Bride badge — عروس.
- **Notification Badge**: numbers 1–99 and "99+".
- **Rating Stars**: display (with decimal) and input (1–5).
- **Review Item**: user name, stars, comment truncated with "عرض المزيد", date.
- **Staff Avatar Item**: circular photo + first name + availability dot/badge.
- **Full-screen Bottom Sheet**: header with close (Start), centered title, optional action (End).
- **Dialogs**: confirmation (2 buttons), info (1 button), auth-required.
- **Primary Button** states: enabled, disabled, loading.
- **Text Field** states: default, focused, filled, error (message under field), disabled.
- **Dropdown**: default, open list, selected, disabled, error.
- **Country code picker** (flag + dial code) + phone field.
- **OTP Input**: 4 boxes; states: empty, filling, filled, error.
- **Range Slider** (price, JOD).
- **Stepper / step indicator** for booking flow.
- **Time Slot Chip**: available, selected, full ("ممتلئ", disabled).
- **Calendar**: available day, selected day, disabled day (closed / beyond 90 days).
- **Sticky bottom action bar** (Book now, Cancel booking, Continue).

### 1.3 Global Dialogs
- **Auth required:** "يجب تسجيل الدخول للمتابعة" — تسجيل الدخول / إلغاء. (Triggered by Book, Add review, Favorite, Favorites tab for guests.)
- **Session expired:** "انتهت الجلسة، يرجى تسجيل الدخول مجدداً".
- **Optional update:** تحديث / لاحقاً.
- **Location explanation:** "فعّل خدمات الموقع لعرض الصالونات القريبة منك" — تفعيل / إلغاء.
- **Location permanently denied:** go to settings — الإعدادات / إلغاء.

---

## 2. Screens & States

### S01 — Onboarding
- 4 pager pages (image + title + short text), page indicator, **تخطي** (Skip) visible on all pages, **التالي** / **ابدأ الآن** on the last page.
- Frames: Page 1, Page 2, Page 3, Page 4.

### S02 — Nickname & Gender
- Nickname field, gender selection (رجل / امرأة), Continue.
- States: empty (button disabled), nickname error, filled (button enabled).

### S03 — Home
Layout top→bottom: welcome row → banner carousel (auto-swipe, dots) → non-editable search bar (hint: "ابحث عن اسم الصالون، الخدمة أو الفئة") → gender tabs → Services section → Recommended Salons → Nearest Salons. Bottom nav. No top app bar.
Frames:
- **Guest** — "مرحباً {الاسم المستعار}", no notification icon.
- **Registered** — "مرحباً {الاسم الأول}", notification icon (End) with badge; variants: no badge, "3", "99+".
- **Men tab** and **Women tab** (different services/salons content).
- **Unified loading** — one shimmer for the whole page, mirroring all sections.
- **Sections with ≤10 items** (no "See more") vs **>10** (with "See more").
- **Nearest — location enabled** (salon cards).
- **Nearest — location disabled** (message + "تفعيل خدمات الموقع" button).
- **Nearest — location dialog** and **permanently denied dialog**.
- **Nearest — no salons within radius** (empty message inside section).
- Error (no internet / server) full-page with retry.

### S04 — All Salons
Layout: sticky top bar (back Start, "جميع الصالونات" centered) → sticky editable search bar + filter icon → active filter chips row (FlowRow, each chip with ×) → vertical salon cards list.
Frames:
- From Home search: empty search, no chips.
- From Recommended "See all": chip "الموصى بها".
- From Nearest "See all": chip "الأقرب".
- From service tap: chip "{اسم الخدمة}".
- Multiple active chips (services + price range "10–15 د.أ" + "الأقرب" + "3★ فأعلى").
- Typing search text with results.
- Loading (shimmer cards), pagination loading, empty ("لا توجد صالونات مطابقة"), no internet, server error.
- "Nearest" active without location → location dialog.

### S05 — Filter (full-screen bottom sheet)
Header: close (Start), "فلتر" centered, "إعادة تعيين" (End; disabled when nothing selected). Scrollable body. Sticky **تطبيق الفلتر** button.
Sections: 1) الخدمات — multi-select chips (FlowRow), first 10 + "عرض المزيد"; 2) نطاق السعر — range slider, **only visible after selecting ≥1 service**; 3) فلاتر عامة — single-select (الأقرب، الموصى بها); 4) التقييم — single-select 1★–5★ ("فأعلى").
Frames:
- Nothing selected (Reset disabled, no price section).
- One service selected (price range appears).
- Full selection example.
- Services "See more" loading (shimmer chips).
- Initial loading (shimmer) and error.

### S06 — All Services
Top bar (back, "جميع الخدمات"). Vertical list of expandable service cards.
Frames: default list, card expanded, loading, pagination loading, empty, error.

### S07 — Salon Details
Layout top→bottom: top bar (back Start, salon name centered, share + favorite End) → cover image with circular profile image overlapping bottom center → open/closed badge + today's hours → tappable location text (map icon) → Call + WhatsApp buttons → description (truncated, "عرض المزيد") → **أيام وساعات العمل** (expandable) → **الطاقم** (horizontal avatars + first name + availability) → **التقييمات** (header: title Start, "4.5 من 5 · 120 تقييم" End; first 3 reviews; "عرض الكل"; "أضف تقييم") → **الخدمات** (name, duration, price) → **معرض الأعمال** (Instagram-style 3-column grid, video tiles with play icon) → **sticky "احجز الآن" button** (always enabled).
Frames:
- Default (salon open).
- Salon closed now (badge "مغلق" — **Book button still enabled**).
- Description expanded.
- Working hours expanded: per-day hours, a "عطلة" day, and an exceptional closure row ("مغلق 10–12 ذو الحجة – عيد الأضحى").
- No WhatsApp (call button only).
- Reviews empty: "لا يوجد تقييمات حالية لهذا الصالون".
- Favorite on / off.
- Loading (shimmer of whole page), error.
- Guest taps Book → auth dialog.
- Location tap → maps app chooser (system sheet representation).
- Share → native share sheet representation.

**S07a — Staff Sheet (full-screen)**
Photo, first name, role badge (مالك / مدير / موظف), rating, bio, years of experience, customers served via the app, status (مداوم اليوم / في إجازة), working days & days off, services provided, reviews (first 3 + "عرض الكل" + "أضف تقييم").
Frames: on duty, on leave, no reviews, loading.

**S07b — Service Sheet**
Service name, full description, duration, price, media (images/videos). Frames: with media, without media.

### S08 — Salon Reviews / S09 — Staff Reviews
Top bar, summary header (average + count), paginated reviews list, "أضف تقييم" button.
Frames: list, loading, pagination loading, empty, error.
**Add Review sheet:** star input (1–5) + comment field + submit. States: empty (disabled), filled, submitting, **success message: "شكراً لك! سيظهر تقييمك بعد الموافقة"**.

### S10 — Media Viewer
Full-screen, swipe between items. Frames: image (zoom hint), video (play/pause/seek controls), loading.

### S11 — Login
Background + logo; top icons: language (ع/EN) and theme. Center card: country code picker + phone field + **تسجيل الدخول**. Below: "ليس لديك حساب؟ **سجّل الآن**". Links: سياسة الخصوصية · الشروط والأحكام · تواصل معنا.
Frames:
- Empty (button disabled), valid number (enabled), invalid number (error under field), loading (button spinner).
- Country picker open (list with flags + search).
- Popup: "هذا الرقم غير مسجل" → go to register.
- Blocked account message: "تم إيقاف حسابك، يرجى التواصل معنا" + contact action.
- Dark mode + English LTR versions.

### S12 — Register
Same style as Login + back button. Scrollable form: الاسم الأول (prefilled from nickname), الاسم الأخير, البريد الإلكتروني, الجنس (dropdown, prefilled), المدينة (dropdown), المنطقة (dropdown, disabled until city chosen), country code + phone. **تسجيل** button. "لدي حساب، **تسجيل الدخول**". Legal links.
Frames: prefilled initial, area disabled, city selected + area list open, validation errors on all fields, all valid (button enabled), submitting.

### S13 — OTP Verification (shared: login, register, phone change, booking confirmation)
Title, "أرسلنا رمزاً إلى {رقم الهاتف}", 4-box input, **تحقق**, resend with countdown.
Frames:
- Empty with countdown "إعادة الإرسال خلال 0:45".
- Filled, verifying (loading).
- Wrong code error.
- Countdown finished → "إعادة إرسال الرمز" active.
- Expired popup: "انتهت صلاحية الرمز، يرجى طلب رمز جديد".
- Blocked (too many attempts): "تم تجاوز عدد المحاولات، يرجى المحاولة بعد 15 دقيقة" with remaining time.
- Variant header for booking confirmation ("تأكيد الحجز").

### S14 — Bookings Tab
Frames:
- **Guest:** welcome header + center message "أنت غير مسجل بعد" + **تسجيل الدخول**.
- **Registered — list:** welcome header, sticky search bar, tabs القادمة | السابقة, booking cards (salon name, reference no., date, time, booking status badge, payment status badge, rejection reason line when rejected). Show a variety of statuses.
- **Empty:** "ليس لديك حجوزات" + **احجز الآن**.
- Search with results, search empty, loading, pagination loading, error.

### S15 — Booking Details
Layout: top bar → status block (booking status, payment status, refund status, reference number with copy) → rejection/cancellation reason → salon block + Call/WhatsApp → persons list (name, bride badge, services + prices, staff, date/time) → payment breakdown (الإجمالي، المدفوع، **المتبقي عند الوصول**) → salon policy → "قيّم تجربتك" (completed only) → **sticky cancel bar** with fixed message above.
Frames (one per status):
- **Pending** — cancel allowed any time, message "يمكنك إلغاء الحجز في أي وقت".
- **Approved, cancel allowed** — "يمكنك الإلغاء حتى {الموعد}".
- **Approved, cancel not allowed** — disabled cancel + "لا يمكن الإلغاء قبل الموعد بأقل من 3 ساعات".
- **Rejected** — reason shown, refund status.
- **Cancelled by salon** — reason, full refund pending/refunded.
- **Auto-cancelled** — explanation + refund.
- **Cancelled by customer**.
- **Completed** — "قيّم تجربتك" button, payment "مدفوع".
- **No-show**.
- With companions (3 persons, one bride) — women's salon.
- Payment variants: pay on arrival (remaining = total), deposit paid (paid + remaining), fully paid.
- **Cancel confirmation dialogs** (3 variants of money outcome): "سيتم استرداد المبلغ كاملاً" / "لن يتم استرداد العربون" / "سيتم خصم العربون من المبلغ المسترد".
- Loading, error.

### S16 — Booking Flow (step indicator on every step, no pull-to-refresh)
**Step 0 — Person:** name field (main person prefilled with account name). Women's salons: toggle **"هذا الشخص عروس"**. Frames: men's salon (no toggle), women's salon toggle off/on.

**Step 1 — Services:** multi-select list (name, duration, price, checkbox); sticky bottom bar with **total price + total duration** and **متابعة** (disabled until ≥1 selected). Frames: none selected, several selected, bride person showing **VIP / للعروس فقط** services highlighted, loading, error.

**Step 2 — Date & Time:** calendar (today → 90 days; closed days disabled) + 15-minute time slots grid. Frames: no date selected, date selected with slots (available / selected / "ممتلئ"), day fully booked ("لا توجد مواعيد متاحة في هذا اليوم"), exceptional closure day disabled, slots loading.

**Step 3 — Staff:** all staff listed; eligible selectable, others disabled (greyed with reason hint e.g. "غير متاح في هذا الوقت"); top option **"أي موظف متاح"**. Frames: selection made, bride case (only bride-qualified enabled), loading.

**Step 4 — Companions:** choice **"فقط لي"** / **"إضافة مرافق"**; list of added persons with remove action; counter "2 من 5 مرافقين". Frames: no companions, 2 companions, limit reached (add disabled, "الحد الأقصى 5 مرافقين").

**Step 5 — Summary:** per-person blocks (name, bride badge, services + prices, staff, date/time), grand total, **قواعد الصالون** block (cancellation window, deposit %, refund rules, "الحجز بحاجة لموافقة الصالون"), payment method selector showing only salon-enabled options (الدفع عند الوصول / عربون 20% = 12 د.أ / الدفع كاملاً), **تأكيد الحجز**. Frames: all 3 options available, only pay on arrival, deposit selected.

**Step 6 — Verification & Payment:** OTP (S13 booking variant) → payment gateway screen placeholder (generic, gateway TBD) → frames: processing, **payment failed** (back on Summary with error banner "فشلت عملية الدفع، لم يتم الحجز").

### S17 — Booking Success
Success illustration, "تم إرسال طلب الحجز وبانتظار موافقة الصالون", reference number with copy, **عرض الحجز**, **العودة للرئيسية**.

### S18 — Rating Flow
Step 1: rate salon (stars + comment). Step 2: rate each staff member who served (one card per staff). Skip option on each. Final: "شكراً لك! سيظهر تقييمك بعد الموافقة".
Frames: salon step, staff step (2 staff), success.

### S19 — Notifications (registered)
Top bar: back, "الإشعارات" centered, filter icon (End). Active filter chips row. List items: title, short body, relative time ("الآن"، "قبل دقيقتين"، "أمس"، "قبل يومين"، then full date), unread vs read styling.
Frames: mixed read/unread list (booking + promotion types), loading, pagination loading, empty ("لا توجد إشعارات"), error.
**Filter sheet:** date range (من – إلى) + search field + apply/reset.
**Notification popup:** full body; booking type includes **عرض الحجز** button.

### S20 — Favorites Tab
Frames: guest (message + تسجيل الدخول), list of salon cards (heart active), empty ("لا توجد صالونات مفضلة" + **استكشف الصالونات**), loading, error.

### S21 — Profile Tab
**Guest:** header (مرحباً {nickname} + edit), sections: الإعدادات (اللغة، المظهر، الإشعارات toggle), الدعم (تواصل معنا، الأسئلة الشائعة، قيّم التطبيق، شارك التطبيق), للأعمال ("سجّل صالونك معنا"), قانوني (سياسة الخصوصية، الشروط والأحكام، من نحن), **تسجيل الدخول** button, app version.
**Registered:** header with profile photo (default vector avatar / real photo), full name, email; extra item **المعلومات الشخصية**; **تسجيل الخروج**; **حذف الحساب**.
Frames & sheets:
- Guest, Registered (no photo), Registered (with photo).
- Edit nickname & gender sheet (guest).
- Photo options sheet: الكاميرا / المعرض / حذف الصورة.
- Language selector, Theme selector (فاتح / داكن / حسب النظام).
- Logout confirmation dialog.
- Delete account confirmation dialog explaining the **30-day grace period** ("سيتم تعطيل حسابك لمدة 30 يوماً، ويمكنك استعادته بتسجيل الدخول خلال هذه الفترة، بعدها يُحذف نهائياً").
- Contact Us sheet (اتصال، واتساب، بريد إلكتروني).

### S22 — Edit Personal Information
Same fields as Register, prefilled. **حفظ** button.
Frames: default, edited (save enabled), validation errors, phone changed → info note "سيتم إرسال رمز تحقق إلى الرقم الجديد" → OTP, saving, success toast.

### S23 — Legal & Support Pages
Rich-text page template (Privacy, Terms, About); FAQ with expandable questions; loading and error.

### S24 — System Screens
- **Force update:** blocking screen, **تحديث الآن**.
- **Optional update:** dialog.
- **Maintenance:** blocking screen with server message + retry.
- **Salon not available** (deep link to inactive salon): toast/snackbar on Home.

---

## 3. Flows to Prototype (link frames in this order)

1. **First launch (guest):** Onboarding → Nickname & Gender → Home (Guest).
2. **Discovery:** Home → search bar → All Salons → Filter → apply → results with chips → Salon Details.
3. **See all shortcuts:** Recommended "See all" → All Salons (Recommended chip); Nearest "See all" → All Salons (Nearest chip); service tap → All Salons (service chip); Services "See more" → All Services → service → All Salons.
4. **Location:** Home Nearest (disabled) → explanation dialog → permission → Nearest list.
5. **Salon exploration:** Salon Details → Staff sheet → Staff Reviews; → Service sheet → Media viewer; → Gallery → Media viewer; → Reviews → All Reviews → Add review → success.
6. **Guest → Login:** Salon Details → Book → auth dialog → Login → OTP → Home (Registered).
7. **Unregistered number:** Login → "number not registered" popup → Register (phone prefilled) → OTP → Home.
8. **Booking (men):** Salon Details → Book → Person → Services → Date & Time → Staff → "Just me" → Summary (deposit) → OTP → Payment → Success → Booking Details (Pending).
9. **Booking (women, bride + companions):** Person (bride on) → VIP services → Date & Time → bride-qualified staff → Add companion → repeat → Summary → pay on arrival → OTP → Success.
10. **Payment failure:** Summary → OTP → Payment failed → back to Summary with error.
11. **Cancel booking:** Bookings → Booking Details (Approved) → Cancel → policy dialog → Cancelled.
12. **Rating:** Notification "booking completed" → Rating flow → success.
13. **Notifications:** Home bell (badge) → Notifications → filter → tap → popup → View booking.
14. **Profile:** edit personal info with phone change → OTP → success; logout; delete account.
15. **Deep link:** share salon → open link → Home → Salon Details → back → Home.

---

## 4. Checklist for Completion
- [ ] Every screen has: default, loading (shimmer), error (no internet + server), empty (where lists exist).
- [ ] Guest and Registered variants where behavior differs (Home, Bookings, Favorites, Profile, Salon Details actions).
- [ ] Men and Women variants for Home and booking (bride only in women's).
- [ ] All booking statuses, payment statuses and refund statuses represented.
- [ ] All dialogs and popups from Section 1.3 and per-screen lists.
- [ ] Arabic RTL for all; English LTR + Dark for key screens.
- [ ] All screens rebuilt from this script (no layouts copied from old screens).
- [ ] Only existing theme tokens and the existing logo used.
