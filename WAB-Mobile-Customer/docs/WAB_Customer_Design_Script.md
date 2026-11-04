# WAB Wedding & Beauty — Customer App Design Script

> **Use:** Paste this whole document into Claude Design together with your existing theme / design system and logo.
> **Version:** 2026-11-04.
> **Source of truth:** `WAB_Customer_App_PRD.md`. Every screen, state and rule below matches it. Precedence: PRD > BRD > Design Script > design files; `BUSINESS_DOMAIN.md` holds the data and the rules.
> **Design files:** some `design/*.dc.html` files (`WAB 02 Discovery`, `WAB 03 Salon`, `WAB 04 Booking Flow`, `WAB 05 Bookings`) predate business types, the type lens, branches, "Booked by" and the design image. Where they differ from this script, the PRD wins.
> **Words:** "business" = salon, clinic or tattoo studio. Component and token names are the real ones in `core/design-system` and the feature modules.

---

## 0. Instructions to the Designer (read first)

1. **Keep only the existing theme and logo.** Use the existing colors, typography, spacing, radii, elevation and icon style, and the existing logo. Do not introduce new colors or fonts. Build every component from these theme tokens.
2. **Rebuild ALL screens from scratch.** Any previously built screens are for reference only (to see the theme applied); do not copy their layouts. Every screen must follow this script and the PRD exactly.
3. Design **every screen and every state** listed below. A screen is not complete until all its states exist.
4. **Primary language: Arabic, RTL.** Design every screen in Arabic RTL first. Then provide the English LTR version of the key screens (Home, Business Details, Filter, Booking Summary, Login) to validate mirroring. Never place elements as fixed "left/right"; think in Start/End (Start = right in Arabic).
5. **Light and Dark mode:** design Light for all screens; provide Dark for the key screens listed above (theme supports Light / Dark / System).
6. **Device frame:** mobile, 390×844 (iPhone 14/15 size). Respect safe areas, status bar and home indicator. Shared UI for Android and iOS (Compose Multiplatform), so avoid platform-exclusive patterns.
7. **Realistic content:** Jordanian context, Arabic names, all three business types (a salon, a beauty clinic, a tattoo studio), businesses with several branches, JOD prices (e.g., "10 د.أ"), Amman areas (عبدون، الجاردنز، أم أذينة، الصويفية، خلدا), 12-hour times (ص / م).
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
- **Business Card** (`DiscoverySalonCard` in home carousels, `DiscoverySalonRow` in lists; used in every business list): profile image, name, rating (stars + value), **type label + audience** (`BusinessTypeBadge`: "صالون" in its colour, then "نساء"), location text ("· 3 فروع" when several branches), short description truncated with "المزيد", open/closed badge + today's hours ("مفتوح · 8:00 ص – 4:00 م" / "مغلق اليوم"), favorite heart. Variants: horizontal (home carousels), vertical/full-width (lists), **Near you** (name "اسم العمل - اسم الفرع", distance pill on the image), shimmer.
- **Service Card**: image, name, short description. Variants: compact (home carousel), expandable (All Services, collapsed/expanded), shimmer.
- **Section Header**: title at Start, "عرض المزيد / عرض الكل" at End (variant without the action for ≤10 items).
- **Search Bar**: non-editable variant (Home) and editable variant with filter icon button + active-filter count (`SalonsSearchRow`, S04).
- **Filter Chip** (`AppFilterChip`): selectable chip (unselected/selected), active-filter chip with × remove.
- **Type Lens** (`BusinessTypeLens`, a row of `AppFilterChip`, scrolls sideways at large font scales): الكل · الصالونات · العيادات · الوشم. Default الكل. Used on Home, Search and Bookings. There are no gender tabs anywhere.
- **Type Badge** (`BusinessTypeBadge`): صالون / عيادة تجميل / استوديو وشم, `labelSmall` on a tinted container, colours in 1.4.
- **"Booked by" label** (`BookedByLine`): "حجز بواسطة {العمل} - {الفرع}", `bodySmall` semi-bold in `accent`, under the business name.
- **Branch line** (`BookedBranchLines`): "الفرع: {الفرع}" in `accent`, then the address in `muted`.
- **Status Badges**: booking status — قيد الانتظار (Pending), مقبول (Approved), مرفوض (Rejected), ملغي من العميل, ملغي من الصالون, ملغي تلقائياً, مكتمل (Completed), لم يحضر (No-show). Payment status — الدفع عند الوصول, تم دفع العربون, تم الدفع كاملاً, مدفوع. Refund — قيد الاسترجاع, تم الاسترجاع. Staff — مداوم اليوم, في إجازة. Business — مفتوح, مغلق. Bride badge — عروس.
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
- **OTP Input**: dynamic number of boxes (length from backend, currently **6**); states: empty, filling, filled, error.
- **Range Slider** (price, JOD).
- **Stepper / step indicator** for booking flow.
- **Time Slot Chip**: available, selected, full ("ممتلئ", disabled).
- **Calendar**: available day, selected day, disabled day (closed / beyond 90 days).
- **Sticky bottom action bar** (Book now, Cancel booking, Continue).

### 1.3 Global Dialogs
- **Auth required:** "يجب تسجيل الدخول للمتابعة" — تسجيل الدخول / إلغاء. (Triggered by Book, Add review, Favorite, Favorites tab for guests.)
- **Session expired:** "انتهت الجلسة، يرجى تسجيل الدخول مجدداً".
- **Optional update:** تحديث / لاحقاً.
- **Location explanation:** "فعّل خدمات الموقع لعرض الأماكن القريبة منك" — تفعيل / إلغاء. (Not built yet: the app's dialog still says "الصالونات".)
- **Location permanently denied:** go to settings — الإعدادات / إلغاء.

### 1.4 Type Colours (tokens already in the theme: `AppTheme.colors`; no other colours for types)
| Type | Label | Text token | Container token | Light | Dark |
|---|---|---|---|---|---|
| `SALON` | صالون / Salon | `salonType` | `salonTypeContainer` | #5B21B6 on violet #6D28D9 at 10 % | #C9AEF7 on the same at 14 % |
| `CLINIC` | عيادة تجميل / Beauty clinic | `clinicType` | `clinicTypeContainer` | #0F5F59 on teal #0D9488 at 12 % | #2DD4BF on the same at 14 % |
| `TATTOO` | استوديو وشم / Tattoo studio | `tattooType` | `tattooTypeContainer` | #7C3A0B on umber #B45309 at 12 % | #F2B872 on the same at 14 % |

Audience words: رجال · نساء · رجال ونساء. Card and profile line: "صالون · نساء", "عيادة تجميل · رجال ونساء" (`businessText`).

---

## 2. Screens & States

### S01 — Onboarding
- 4 pager pages (image + title + short text), page indicator, **تخطي** (Skip) visible on all pages, **التالي** / **ابدأ الآن** on the last page.
- Frames: Page 1, Page 2, Page 3, Page 4.

### S02 — Nickname & Gender
- Nickname field, gender selection (رجل / امرأة), Continue.
- States: empty (button disabled), nickname error, filled (button enabled).
- Gender here does not change which businesses appear; do not imply a men's or women's app.

### S03 — Home
Layout top→bottom: greeting row ("ماذا تودّ أن تحجز اليوم؟" over "مرحباً {الاسم}", bell at End) → non-editable search bar (hint: "ابحث عن صالون أو عيادة أو استوديو وشم أو خدمة") → **Type Lens** → banner carousel (auto-swipe, dots) → **استكشف** (Explore) → **موصى بها** (Recommended) → **احجز مجدداً** (Book again) → **بالقرب منك** (Near you, always last). Bottom nav. No top app bar. No gender control.
Frames:
- **Guest** — "مرحباً {الاسم المستعار}", no notification icon, no Book again.
- **Registered** — "مرحباً {الاسم الأول}", notification icon (End) with badge; variants: no badge, "3", "99+"; Book again with completed bookings, hidden without them.
- **Lens** — الكل (a mix of the three types), الصالونات, العيادات, الوشم. Switching keeps the sections on screen with a small `AppLoadingIndicator` next to the chips.
- **Explore tiles** (`ServiceTile`: 136 dp wide, 96 dp image): image, Type Badge, name, two-line description.
- **Unified loading** — one shimmer for the whole page on the first load, mirroring all sections.
- **Sections with more** ("عرض المزيد" / "عرض الكل") vs **without**; an empty section is left out, except Near you.
- **Near you — Locating**: the rest of Home is on screen; one shimmer row inside the section.
- **Near you — Places**: Business Cards (Near you variant) with distance.
- **Near you — Location off** (`NearestLocationPanel`: dashed `surface` panel, 54 dp soft pin circle, 13.5 sp `muted` message, 44 dp gradient button): "فعّل خدمات الموقع لعرض الأماكن القريبة منك" + "تفعيل خدمات الموقع".
- **Near you — Unavailable** (the same panel, location is on): "تعذّر تحديد موقعك الآن. حاول مرة أخرى لعرض الأماكن القريبة منك." + **حاول مرة أخرى**. Never the enable prompt.
- **Near you — location dialog** and **permanently denied dialog**.
- **Near you — Empty** (message inside section): no place within the radius.
- Error (no internet / server) full-page with retry.

### S04 — Search (all businesses)
Layout: sticky top bar (back Start, centered title "البحث", or "الصالونات" / "عيادات التجميل" / "استوديوهات الوشم" when one type is chosen) → sticky editable search bar (hint: "صالونات، عيادات، استوديوهات وشم أو خدمات") + filter button with count → **Type Lens** → **quick chips** (`SearchQuickChips`, sideways scroll): مفتوح الآن · الأقرب · 4★ فأعلى · السعر → suggestions, or recent searches → active filter chips row (FlowRow, each chip with ×) → vertical Business Cards, one per business.
Frames:
- From Home search: empty search, no chips, lens الكل.
- From Recommended "See all": chip "الموصى بها", Home lens.
- From Near you "See all": chip "الأقرب", Home lens.
- From an Explore tile: chip "{اسم الخدمة}", lens on that service's type.
- Multiple active chips (type + "نساء" + services + "10–15 د.أ" + "الأقرب" + "3★ فأعلى" + "مفتوح الآن").
- **Typed suggestions** (`SearchSuggestionList`, replaces the list while typing): group **الخدمات**, each row name + "12 مكاناً" + Type Badge; group **الأماكن**, each row name + Type Badge. An empty group has no header.
- **Recent searches** (`SearchRecent`, empty search text): title "عمليات البحث الأخيرة", **مسح** at End, the texts as chips.
- Business with several branches: one card, "· 3 فروع".
- Loading (shimmer cards), pagination loading, empty ("لا توجد أماكن تطابق بحثك" + "جرّب كلمات بحث أخرى أو عدّل الفلاتر."), no internet, server error.
- "Nearest" active without location → location dialog.

### S05 — Filter (full-screen bottom sheet)
Header: close (Start), "فلتر" centered, "إعادة تعيين" (End; disabled when nothing selected). Scrollable body. Sticky **تطبيق الفلتر** button.
Sections, in order: 1) **اعرض** — business type, multi-select chips (الكل، الصالونات، العيادات، الوشم); 2) **الجنس** — رجال / نساء, optional single choice; 3) **الخدمات** — multi-select chips (FlowRow), catalog of the chosen type, first 10 + "عرض المزيد"; 4) **نطاق السعر** — range slider, visible whenever the server returns bounds; 5) **فلاتر عامة** — single-select (الأقرب، الموصى بها); 6) **التقييم** — single-select 1★–5★ ("فأعلى").
Frames:
- Nothing selected (Reset disabled).
- One type selected (services of that type; bounds updated).
- Two types selected.
- Full selection example.
- Services "See more" loading (shimmer chips).
- Initial loading (shimmer) and error.

### S06 — All Services
Top bar (back, "جميع الخدمات"). Vertical list of expandable service cards, for the Home lens. Each card SHOULD carry the Type Badge (not built yet).
Frames: default list, card expanded, loading, pagination loading, empty, error.

### S07 — Business Details
Layout top→bottom: top bar (back Start, business name centered, share + favorite End) → cover image with circular profile image overlapping bottom center → name → **type + audience line** ("صالون · نساء", `labelMedium` in `accent`) → open/closed badge + today's hours + rating → tappable location text (map icon) → **الفروع** (`BranchSelector`: section title + a row of `AppFilterChip`, main first, "عبدون · الرئيسي"; only with several bookable branches) → Call + WhatsApp buttons → description (truncated, "عرض المزيد") → **أيام وساعات العمل** (expandable) → **الطاقم** (horizontal avatars + first name + availability) → **التقييمات** (header: title Start, "4.5 من 5 · 120 تقييم" End; first 3 reviews, each with a branch label "فرع {الاسم}" when it has one; "عرض الكل"; "أضف تقييم") → **الخدمات** (name, duration, price) → **معرض الأعمال** (Instagram-style 3-column grid, video tiles with play icon) → **sticky "احجز الآن" button** (always enabled).
Selecting a branch changes the address, maps, contacts, hours, staff and services; name, images, description, rating, reviews and gallery stay.
Frames:
- Default (branch open), for each type: salon (نساء / رجال / رجال ونساء), clinic, tattoo studio.
- One branch (no selector) and several branches (selector, each chip selected).
- Branch closed now (badge "مغلق" — **Book button still enabled**).
- Description expanded.
- Working hours expanded: per-day hours, a "عطلة" day, and an exceptional closure row ("مغلق 10–12 ذو الحجة – عيد الأضحى").
- No WhatsApp (call button only).
- Reviews empty: "لا يوجد تقييمات حالية" (not built yet: the app's text still says "لهذا الصالون").
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

### S08 — Business Reviews / S09 — Staff Reviews
Top bar, summary header (average + count), paginated reviews list (branch label on business reviews that have one), "أضف تقييم" button.
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
Title, "أرسلنا رمزاً عبر واتساب إلى {رقم الهاتف}", 6-box input (dynamic length), **تحقق**, resend with countdown. The code arrives on WhatsApp only.
Frames:
- Empty with countdown "إعادة الإرسال خلال 0:45".
- Filled, verifying (loading).
- Wrong code error.
- Countdown finished → "إعادة إرسال الرمز" active.
- Expired popup: "انتهت صلاحية الرمز، يرجى طلب رمز جديد".
- Blocked (too many attempts): "تم تجاوز عدد المحاولات، يرجى المحاولة بعد 15 دقيقة" with remaining time.
- This number has no WhatsApp: message + retry.
- Variant header for booking confirmation ("تأكيد الحجز").

### S14 — Bookings Tab
Frames:
- **Guest:** welcome header + center message "أنت غير مسجل بعد" + **تسجيل الدخول**.
- **Registered — list:** welcome header, sticky search bar, segments القادمة | السابقة, **Type Lens**, booking cards (business name, branch line, reference no., date, time, Type Badge, booking status badge, payment status badge, rejection reason line when rejected). Show a variety of statuses and all three types.
- **Booked by:** a card with "حجز بواسطة {العمل} - {الفرع}" under the name, and one without a branch: "حجز بواسطة {العمل}".
- **Completed card:** two buttons, **قيّم** and **احجز مجدداً**.

- **Empty:** "ليس لديك حجوزات" + **احجز الآن**.
- Search with results, search empty, loading, pagination loading, error.

### S15 — Booking Details
Layout: top bar → status block (booking status, payment status, refund status, reference number with copy) → rejection/cancellation reason → business block (branch line + address, "حجز بواسطة …" when the business made it) + Call/WhatsApp → persons list (name, bride badge, design image at tattoo studios, services + prices, staff, date/time) → payment breakdown (الإجمالي، المدفوع، **المتبقي عند الوصول**) → business policy → "قيّم تجربتك" (completed only) → **sticky cancel bar** with fixed message above.
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
- Booked by the business (pay on arrival, starts approved, cancel allowed under the policy).
- Tattoo studio: person with a design image.
- Payment variants: pay on arrival (remaining = total), deposit paid (paid + remaining), fully paid.
- **Cancel confirmation dialogs** (3 variants of money outcome): "سيتم استرداد المبلغ كاملاً" / "لن يتم استرداد العربون" / "سيتم خصم العربون من المبلغ المسترد".
- Loading, error.

### S16 — Booking Flow (step indicator on every step, no pull-to-refresh)
**Branch step (first, `BranchStep`):** title "اختر الفرع", hint "تختلف الخدمات والأسعار والموظفون والمواعيد حسب الفرع.", one `SelectionCard` per branch (main first): name, address, today's open/closed line in `success` / `danger`, `DesignRadio`. Continue disabled until a branch is chosen. Frames: none selected, one selected. Skipped with one bookable branch; when a branch came from S07 the flow opens on Step 0 and Back reaches this step.

**Step 0 — Person:** name field (main person prefilled with account name). Then by business:
- **Men's or women's salon:** no gender control. Companion subtitle: "أدخل اسم المرافق. يجب أن يكون من نفس جنس الصالون."
- **Salon for both, clinic, tattoo studio:** **الجنس** with two `AppChoiceCard` (رجل / امرأة), required per person; error "اختر جنس الشخص" under them; companion subtitle "أدخل اسم المرافق وجنسه."
- **Bride toggle "هذا الشخص عروس":** salon with audience FEMALE or BOTH only, and only when the person is a woman.
- **Design image (`ReferenceImageSection`, tattoo studio only):** label "صورة التصميم (اختياري)", hint "أضف التصميم الذي تفكر فيه، وسيراه الاستوديو مع حجزك.", `AppOutlinedButton` "إضافة صورة"; while uploading "جارٍ رفع الصورة…"; then a full-width preview (`AppLocalImage`) + `AppTextButton` "إزالة الصورة".
Frames: men's salon (name only), women's salon toggle off/on, salon for both (woman with toggle, man without), clinic (gender, no toggle), tattoo studio (no image, uploading, with image), upload failed.

**Step 1 — Services:** services of the chosen branch, multi-select list (name, duration, price, checkbox); sticky bottom bar with **total price + total duration** and **متابعة** (disabled until ≥1 selected). Frames: none selected, several selected, bride person showing **VIP / للعروس فقط** services highlighted, loading, error.

**Step 2 — Date & Time:** calendar (today → 90 days; closed days disabled) + 15-minute time slots grid. Frames: no date selected, date selected with slots (available / selected / "ممتلئ"), day fully booked ("لا توجد مواعيد متاحة في هذا اليوم"), exceptional closure day disabled, slots loading.

**Step 3 — Staff:** all staff of the branch listed; eligible selectable, others disabled (greyed with reason hint e.g. "غير متاح في هذا الوقت"); top option **"أي موظف متاح"**. Frames: selection made, bride case (only bride-qualified enabled), loading.

**Step 4 — Companions:** choice **"فقط لي"** / **"إضافة مرافق"**; list of added persons with remove action; counter "2 من 5 مرافقين". Frames: no companions, 2 companions, limit reached (add disabled, "الحد الأقصى 5 مرافقين"), mixed genders at a clinic.

**Step 5 — Summary:** branch line ("الفرع: {الفرع}"), per-person blocks (name, bride badge, services + prices, staff, date/time), grand total, **business rules** block (cancellation window, deposit %, refund rules, the booking needs the business's approval), payment method selector showing only the options the business enabled (الدفع عند الوصول / عربون 20% = 12 د.أ / الدفع كاملاً), **تأكيد الحجز**. Frames: all 3 options with online paused (الدفع عند الوصول selected; the two online options disabled with "الدفع الإلكتروني قريباً"), only pay on arrival, deposit selected (for when online payment returns).

**Step 6 — Verification & Payment:** OTP (S13 booking variant) → pay on arrival creates the booking. Online payment is paused; keep these frames for when it returns: payment gateway screen placeholder (generic, no gateway chosen) → processing, **payment failed** (back on Summary with error banner "فشلت عملية الدفع، لم يتم الحجز").

### S17 — Booking Success
Success illustration, "تم إرسال طلب الحجز وهو بانتظار الموافقة. سنرسل لك إشعاراً فور الموافقة.", reference number with copy, **عرض الحجز**, **العودة للرئيسية**.

### S18 — Rating Flow
Step 1: rate the business (stars + comment), with the booked branch shown. Step 2: rate each staff member who served (one card per staff). Skip option on each. Final: "شكراً لك! سيظهر تقييمك بعد الموافقة".
Frames: business step, staff step (2 staff), success.

### S19 — Notifications (registered)
Top bar: back, "الإشعارات" centered, filter icon (End). Active filter chips row. List items: title, short body, relative time ("الآن"، "قبل دقيقتين"، "أمس"، "قبل يومين"، then full date), unread vs read styling.
Frames: mixed read/unread list (booking + promotion types; one naming "اسم العمل - اسم الفرع", one naming "حجز بواسطة …"), loading, pagination loading, empty ("لا توجد إشعارات"), error.
**Filter sheet:** date range (من – إلى) + search field + apply/reset.
**Notification popup:** full body; booking type includes **عرض الحجز** button.

### S20 — Favorites Tab
Frames: guest (message + تسجيل الدخول), list of business cards of the three types with type + audience (heart active), empty (message + explore action; not built yet: the app's text says "صالونات"), loading, error.

### S21 — Profile Tab
**Guest:** header (مرحباً {nickname} + edit), sections: الإعدادات (اللغة، المظهر، الإشعارات toggle), الدعم (تواصل معنا، الأسئلة الشائعة، قيّم التطبيق، شارك التطبيق), للأعمال ("سجّل صالونك معنا"; not built yet: wording for every business type), قانوني (سياسة الخصوصية، الشروط والأحكام، من نحن), **تسجيل الدخول** button, app version.
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
- **Not available** (deep link to a business that is not visible): toast/snackbar on Home.

---

## 3. Flows to Prototype (link frames in this order)

1. **First launch (guest):** Onboarding → Nickname & Gender → Home (Guest).
2. **Discovery:** Home → lens → search bar → Search → typed suggestion or Filter → apply → results with chips → Business Details.
3. **See all shortcuts:** Recommended "See all" → Search (Recommended chip); Near you "See all" → Search (Nearest chip); Explore tile → Search (service chip); Explore "See more" → All Services → service → Search.
4. **Location:** Near you (Location off) → explanation dialog → permission → Near you list; Near you (Unavailable) → Try again → Near you list.
5. **Business exploration:** Business Details → branch chip → Staff sheet → Staff Reviews; → Service sheet → Media viewer; → Gallery → Media viewer; → Reviews → All Reviews → Add review → success.
6. **Guest → Login:** Business Details → Book → auth dialog → Login → OTP → Home (Registered).
7. **Unregistered number:** Login → "number not registered" popup → Register (phone prefilled) → OTP → Home.
8. **Booking (men's salon):** Business Details → Book → Person → Services → Date & Time → Staff → "Just me" → Summary (pay on arrival) → OTP → Success → Booking Details (Pending).
9. **Booking (women's salon, bride + companions):** Person (bride on) → VIP services → Date & Time → bride-qualified staff → Add companion → repeat → Summary → pay on arrival → OTP → Success.
10. **Payment failure (for when online payment returns):** Summary → OTP → Payment failed → back to Summary with error.
11. **Cancel booking:** Bookings → Booking Details (Approved) → Cancel → policy dialog → Cancelled.
12. **Rating:** Notification "booking completed" → Rating flow → success; or completed card → قيّم.
13. **Notifications:** Home bell (badge) → Notifications → filter → tap → popup → View booking.
14. **Profile:** edit personal info with phone change → OTP → success; logout; delete account.
15. **Deep link:** share business → open link → Home → Business Details → back → Home.
16. **Booking with several branches:** Branch step → Person → … → Summary (branch line).
17. **Booking (clinic, mixed persons):** Person (gender) → Services → … → Add companion (other gender) → Summary.
18. **Booking (tattoo studio):** Person (add design image → preview) → Services → … → Summary → Booking Details shows the image.
19. **Booked by the business:** Bookings shows the "Booked by" card (approved, pay on arrival) → Booking Details → completed → قيّم / احجز مجدداً.

---

## 4. Checklist for Completion
- [ ] Every screen has: default, loading (shimmer), error (no internet + server), empty (where lists exist).
- [ ] Guest and Registered variants where behavior differs (Home, Bookings, Favorites, Profile, Business Details actions).
- [ ] All three business types shown on cards, Business Details and booking; Home, Search and Bookings with each lens chip; no gender tabs.
- [ ] Booking variants: men's salon, women's salon (bride), salon for both, clinic, tattoo studio (design image), several branches.
- [ ] Near you: Locating, Places, Empty, Location off, Unavailable.
- [ ] All booking statuses, payment statuses and refund statuses represented.
- [ ] All dialogs and popups from Section 1.3 and per-screen lists.
- [ ] Arabic RTL for all; English LTR + Dark for key screens.
- [ ] All screens rebuilt from this script (no layouts copied from old screens).
- [ ] Only existing theme tokens and the existing logo used.
