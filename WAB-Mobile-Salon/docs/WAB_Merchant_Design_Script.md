# WAB Wedding & Beauty — Merchant App Design Script

> **Version:** 2026-11-04.
> **Use:** Paste this whole document into the **same Claude Design project as the WAB Customer app**, and attach `WAB_Merchant_App_PRD.md` and `WAB_Merchant_BRD.md`.
> **Source of truth:** PRD > BRD > this script > design files; root `BUSINESS_DOMAIN.md` holds the data and rules. If anything here conflicts with the PRD, the PRD wins.
> **Design files:** some `design/*.dc.html` files predate business types, branches, business-made bookings and To close; for those the PRD and this script win.

---

## 0. Instructions to the Designer (read first)

1. **Same brand, flat surfaces.** Use the WAB brand and the tokens of `AppTheme` (`colors`, `spacing`, `shapes`, `typography`, `sizes`, `surfaces`). The merchant app has **no Liquid Glass** (owner decision): flat screens, `cardBackground` / `AppSurface` / `AppCard` fills with a 1 px line edge, flat top bars, the attached `AppBottomBar`, gradient primary buttons, platform ripple. Do not introduce new colors or fonts.
2. **Merchant identity:** use the WAB logo with a small "Business / أعمال" label (e.g., "WAB Business") wherever the logo appears, so the merchant app is distinguishable from the customer app.
3. Design **every screen and every state** listed below. A screen is not complete until all its states exist.
4. **Primary language: Arabic, RTL.** Design all screens in Arabic RTL. Provide English LTR + Dark mode for: Login, Home, Booking Request sheet, Booking Details, Calendar.
5. **Device frame:** mobile 390×844, safe areas respected, shared Android/iOS UI (Compose Multiplatform).
6. **Realistic content:** Jordanian salons, clinics and tattoo studios and names, JOD prices ("15 د.أ"), Amman areas, 12-hour times (ص / م), reference numbers like "WAB-24817".
7. **Loading = shimmer** shaped like the content. **Real-time** screens show a subtle "live" update (e.g., a new card animating in).
8. **Permissions:** pages a member has no permission for are **hidden** (not disabled). Show variants for Owner (full access) and Employee (limited).
9. Name frames with PRD IDs: `M07 Home / Owner / Loading`.

---

## 1. Global Patterns

### 1.1 Universal States
Loading (shimmer), pagination loading, no internet (+ إعادة المحاولة), server error (+ إعادة المحاولة), empty (+ action), pull-to-refresh (not on forms), toasts (success/error/info).

### 1.2 Merchant-specific Components (built from the customer design system)
- **Bottom Navigation** (`AppBottomBar`; 5 items, each shown only if permitted): الرئيسية، الحجوزات، التقويم، الصالون، المزيد.
- **Offline banner** (persistent, all screens, `AppOfflineSalonBanner`): "صالونك غير ظاهر للزبائن حالياً. تواصل مع WAB لإعادة التفعيل" + تواصل.
- **Branch filter chips** (`AppBranchSwitcher`: a row of `AppFilterChip`): "كل الفروع" + one chip per branch, closed branches marked. Owner with several branches only, on M08, M11, M17, M20, M21, M22; without "كل الفروع" on M15, M16. Managers and employees never see them.
- **Type and audience label:** صالون رجالي / صالون نسائي / صالون للرجال والنساء / عيادة تجميل · للرجال والنساء / استوديو وشم · للرجال والنساء.
- **Business state chip:** مباشر (Live) / غير متصل (Offline) / غير مكتمل (Incomplete) / قيد المراجعة / مرفوض.
- **Booking status badges** (`AppBookingStatusBadge`) + **Bride badge (عروس, `AppBrideBadge`)** — highly visible; only at salons serving women or both.
- **Payment badges:** الدفع عند الوصول، تم دفع العربون، تم الدفع كاملاً، مدفوع. **Refund:** قيد الاسترجاع، تم الاسترجاع، فشل.
- **Merchant booking card** (`AppBookingCard`): reference, customer name, date/time, persons count, staff, status, payment, bride badge, branch name (owner viewing several branches), "أُنشئ من المكان" on bookings made by the business; pending variant with "منذ 5 دقائق" and auto-cancel countdown.
- **Request sheet** (Uber-style): large, attention-grabbing, queue indicator "1 من 3".
- **Action bar** (sticky): primary/secondary/destructive variants.
- **Reason picker sheet:** radio list. Reject: محجوز بالكامل، الموظف غير متاح، الخدمة غير متاحة، أخرى + نص. Cancel: ظرف طارئ، الموظف غير متاح، إغلاق استثنائي، أخرى + نص.
- **Close notification:** title "أغلق هذا الحجز", actions **مكتمل** / **لم يحضر**; replaced by the outcome line.
- **Conflict dialog:** list of affected bookings + "إلغاء الحجوزات المتأثرة" / "رجوع" (and "إعادة توزيع" for staff changes).
- **Permission toggle row:** title + description + switch.
- **Calendar grid:** time column (15-min resolution), staff columns, booking blocks colored by status, shaded closed hours/leave.
- **Upload tile:** empty / uploading (progress) / uploaded / failed (retry).
- **OTP input:** dynamic number of boxes (currently **6**).
- **KPI tile, mini chart, ranking row** (statistics).
- **Checklist item:** done / pending with chevron.
- **Tabs:** `AppSegmentedTabs`; the bookings list has five tabs, so check long labels at large font scale.

---

## 2. Screens & States

### M01 — Splash
Logo "WAB Business" + loader.

### M02 — Welcome & Login
Background + logo; language & theme icons; headline for any business type; country code + phone; **متابعة**; a link to register a new business; legal links.
Frames: empty, valid, invalid phone, loading, **number not linked to any business** dialog (register / إلغاء), access removed message, blocked message. Dark + English variants.

### M03 — OTP
Same as customer OTP (6 dynamic boxes). Frames: countdown, filled/verifying, wrong code, resend active, expired popup, blocked 15 min. Code arrives on WhatsApp. Header variants: تسجيل الدخول / تسجيل نشاط تجاري / تغيير الرقم / تأكيد بيانات البنك.

### M04 — Business Registration
Scrollable form: **ماذا تريد أن تسجّل؟** cards with an icon per type (صالون / عيادة تجميل / استوديو وشم + warning that the type cannot change later); **من يخدم الصالون؟** (رجال / نساء / الجنسين) for salons only, a "serve both" note for clinics and tattoo studios; business name (label follows the type); owner first/last name; city → area; **license documents** (1–5 upload tiles, image/PDF); **الترخيص الطبي** (1–5 upload tiles) for clinics only; review-your-choices card; terms checkbox; **إرسال الطلب**.
Frames per type (salon, clinic, tattoo): empty, filled, uploading documents, upload failed, validation errors, submitting.

### M05 — Application Status
Frames: **Pending** (illustration, "طلبك قيد المراجعة", date, CTA to prepare the profile), **Rejected** (reason, resubmission count, "تعديل وإعادة الإرسال"; type locked), **Approved** transition.

### M06 — Setup Checklist
Progress "4 من 6". Two groups: **business** (الملف والصور، السياسات) and **branch** (الموقع والتواصل، ساعات العمل، الخدمات، الطاقم), + optional المعرض، صلاحيات الفريق. Frames: partial, all done → live success, waiting for approval.

### M07 — Home (Dashboard)
Header (business name + image, bell with badge); state strip (+ subscription warning "تنتهي الفترة المجانية خلال 5 أيام"); **pending requests card** (count + list, bride badge, time since request); **اليوم**: counts + next booking; today's timeline; quick stats. No branch chips: the owner sees all branches, a branch member their own.
Frames: Owner full, Employee (only own timeline, no stats/requests), Offline banner variant, incomplete variant, loading (unified shimmer), no bookings today, error.

### M08 — Bookings List
Title + **حجز جديد** (secondary `AppButton` with the Add icon, only with `BOOKINGS_CREATE`); branch chips (owner); sticky search + filter; tabs **معلّقة | القادمة | اليوم | للإغلاق | السابقة**; chips.
Frames: each tab with variety of cards (incl. bride, multiple persons, branch name, "أُنشئ من المكان"), **للإغلاق** with finished bookings oldest first and its empty state "لا توجد حجوزات للإغلاق", Employee scope (own only), filter sheet (date range, staff multi, status multi, عروس فقط toggle only at salons serving women or both, payment), search results, empty per tab, loading, pagination, error, **real-time new card arriving**.

### M09 — Booking Details & Actions
Header (reference + copy, status, payment, refund, bride badge); branch; source "أُنشئ من المكان · <member>"; customer (name, call, WhatsApp, "ليس لديه حساب WAB" when there is no account); persons (services, prices, durations, staff, times; **صورة التصميم** per person at tattoo studios); payment (method, total, paid, **المتبقي للتحصيل**); policy snapshot; status history timeline; sticky action bar.
Frames by status:
- **Pending:** قبول / رفض.
- **Approved before start:** إلغاء / إعادة توزيع.
- **Approved after start, including To close:** "مكتمل ومدفوع" / "لم يحضر" / إعادة توزيع. Variant: assigned staff without `BOOKINGS_OPERATE` sees only مكتمل and لم يحضر.
- **Completed, No-show, Rejected (reason), Cancelled (business/customer/auto)** — read-only.
- Dialogs: reject reason sheet; cancel confirm ("سيحصل الزبون على استرداد كامل"); complete confirm ("أكّد أنك حصّلت 25 د.أ"); no-show confirm with policy outcome; reassign staff sheet (eligible staff list); **"تم التعامل مع هذا الحجز من قبل أحمد"** concurrency message.
- Bride booking with 3 persons (salon serving women or both).
- Tattoo booking with a design image; booking made by the business for a customer with no account.

### M10 — Real-time Booking Request
- **In-app sheet** over Home: title "طلب حجز جديد" (+ **عروس** badge), customer, persons, services, staff, date/time, total + payment method, "منذ دقيقة"; **قبول** / **رفض** / عرض التفاصيل. Variants: single, queue "1 من 3", bride, "تم التعامل معه بواسطة سارة".
- **Android overlay** over another app (full card with Accept/Reject).
- **Android locked-screen full-screen request.**
- **Notification (Android heads-up / iOS time-sensitive)** with قبول / رفض actions.
- **"Display over other apps" permission explainer screen** (Android).
- **Close push:** Android notification on channel "حجوزات للإغلاق" and iOS time-sensitive alert, with **مكتمل** / **لم يحضر**; outcome variants: marked completed, marked no-show, already closed, could not update (tap to open).

### M11 — Calendar
Frames: **Day view** (staff columns, colored blocks, bride icon, shaded closed hours & leave), **Week view**, branch chips (owner), staff filter, Employee (single column), today with no bookings, loading.

### M12 — Business Hub
Type and audience label; grid of management tiles (including الفروع for the owner) with permission-based visibility and "ناقص" warnings. Frames: Owner (all, each business type), Manager (subset: no policies, finance, subscription or branches).

### M13 — Business Profile Edit
Cover (16:9) + profile (1:1) upload/crop, name, description, **map picker** (pin + "استخدم موقعي"), location text, city/area, phone, WhatsApp (optional), type and audience read-only with **خدمة الرجال والنساء** (M30) for the owner of a men's or women's salon, **معاينة كما يراه الزبون**, save.
Frames: default, editing, branch member (branch location and contacts only), crop sheet, map picker, validation errors, unsaved-changes dialog, preview (customer salon details look).

### M14 — Gallery
Grid (images + videos with play icon), add (multi-select), upload progress, failed retry, reorder mode, select & delete confirm, empty "أضف أعمالك".

### M15 — Working Hours & Closures
Branch chips (owner). Weekly list (السبت → الجمعة) with toggles + time pickers, "نسخ لكل الأيام"; closures list + add sheet (date range + reason).
Frames: default, time picker, invalid hours error, add closure, **conflict dialog** listing affected bookings, saved toast.

### M16 — Services
Branch chips (owner). List (image, name, price, duration, "للعروس فقط" badge, active toggle), search, empty. **Catalog picker** (the business's type and audience, already-added marked). **Service form** (price "شامل الضريبة والرسوم", duration, bride-only toggle (salons serving women or both), description, media, active). **Catalog request** form + requests list (قيد المراجعة / مقبول / مرفوض + ملاحظة). Warning "لا يوجد موظف يقدم هذه الخدمة".
Frames: men's salon, clinic and tattoo studio (no bride toggle), women's salon, empty, deactivate warning with affected bookings.

### M17 — Team & Staff
Branch chips (owner). List (photo, name, role badge, branch, "يقدم خدمات", active/inactive, "في إجازة اليوم"). **Member form** (owner): names, phone (mandatory), photo, role, **branch** (with a note that moving removes services), active, يقدم خدمات toggle → staff section (bio, years, services multi-select, مؤهلة للعرائس, working days + custom hours, leaves list + add), صلاحيات → M18.
No invite message exists. Frames: owner view, STAFF_MANAGE-only view (limited fields), add member, edit staff, leave add sheet, **conflict dialog** (إعادة توزيع / إلغاء / رجوع), owner row non-removable.

### M18 — Permissions Editor
Member header; "تطبيق قالب الدور"; grouped toggles with descriptions (الحجوزات، الصالون، الطاقم، المالية، التحليلات). Includes creating bookings for customers. Finance, subscription and policies are not offered to branch members. Owner-only permissions shown locked with note "خاصة بالمالك". Frames: Manager template, Employee template, saving.

### M19 — Policies
Cancellation window (chips 1/2/3/6/12/24/48/custom), payment options (multi), deposit % with live example "على حجز 50 د.أ العربون 10 د.أ", refund rules, no-show rules, notes, **customer preview** of the rules block. Owner only. Online options need a "coming soon" state while online payment is paused. Frames: default, deposit disabled, validation error, preview sheet.

### M20 — Reviews
Branch chips (owner). Tabs for the business | الطاقم (staff selector); header avg + count + star distribution; list with each review's branch; إبلاغ action. Frames: list, empty, loading.

### M21 — Statistics
Reached from the hub tile and Home quick stats. Branch chips (owner). Period selector; KPI tiles; charts (bookings/day, revenue/day); top services; top staff. Frames: week, month, empty period, loading.

### M22 — Finance
Reached from the hub tile and notifications; owner only. Balance card (business-wide); branch chips for transactions and refunds; tabs المعاملات | المبالغ المستردة | الدفعات; filters; **bank details** (owner) with WhatsApp OTP. Frames: each tab, empty (the usual state while online payment is paused), bank form, info note.

### M23 — Subscription & Status
Reached from the hub tile, the Home warning and notifications; owner only. Frames: Trial (days left), Active, Expired + Offline, "تواصل مع WAB", the Recommended placement offer.

### M24 — Notifications
Same as customer: list (read/unread, types), filter sheet, empty, loading.

### M25 — More
Account (photo, name, phone, role), settings (language, theme, push, Android overlay status, test sound), support, legal, logout, delete (member: remove access; owner: business deletion request with optional note). Frames: Owner, Employee, logout dialog, delete dialogs (2 variants).

### M26 — Force Update / Maintenance
Blocking screens + optional update dialog.

### M27 — Branches (owner)
Hint line; list, main first: name, **الفرع الرئيسي**, status (نشط / متوقف مؤقتاً / مغلق via `AppStatusBadge`), **غير مكتمل** warning badge, offline reason; **إضافة فرع**; actions: تعديل, تعيين كفرع رئيسي, إيقاف مؤقت (with reason), إعادة التشغيل, إغلاق الفرع.
Frames: one branch, several, empty, take-offline dialog, close confirm, close refused with the list of upcoming bookings, limit reached.

### M28 — Branch Form (owner)
Name (Arabic), name (English, e.g. "Mecca Street"), map pin (same map picker as M13), address, city, area, phone in international format, WhatsApp (optional); إنشاء / حفظ. Frames: new, edit, map picker, validation errors, created confirmation with the next steps (hours, services, staff).

### M29 — New Booking for a Customer
**Customer:** `AppPhoneField` + **تحقق**. Registered: "عميل في WAB: <name>" with a note that they get the notifications. Not registered: note "ليس لديه حساب WAB: أدخل اسم العميل وجنسه. لن تُرسل له أي رسالة." + name + gender (`AppFilterChip`). **Booking:** services multi-select with total duration and JOD total, staff (`AppDropdownField`, "أي موظف متاح"), date, start time, design image (tattoo only), note "يُقبل الحجز مباشرة ويُدفع في المكان."; **تأكيد الحجز**.
Frames: empty, checking, registered, not registered, invalid number, services chosen, time taken error, blocked account error, tattoo with design image, submitting.

### M30 — Audience Change (owner)
**خدمة الرجال والنساء** button in M13 → confirm dialog (both can book right away; only WAB can change this back). Frames: dialog, done message.

### M31 — Content Page / M32 — FAQ
Server content with shimmer and error + retry; FAQ list with an empty state.

---

## 3. Flows to Prototype
1. New business: Login → not linked → Register → OTP → Registration (salon / clinic with medical license / tattoo) → Pending → Prepare profile → Checklist → Approved → Live.
2. Team member login: Login → OTP → Home (Employee view).
3. **Real-time request:** Home → request sheet (bride) → Accept → Booking Details (Approved).
4. Reject with reason → refund note.
5. Day of appointment: Booking Details → Mark completed & paid → confirm amount.
6. No-show flow.
7. Add closure → conflict dialog → cancel affected → success.
8. Add member → permissions → save.
9. Add service from catalog → price/duration → bride-only.
10. Policies edit → customer preview.
11. Finance → payouts → bank details with OTP.
12. Offline business: banner across screens → Subscription → Contact WAB.
13. New booking: Bookings → حجز جديد → number check (registered / not registered) → services, staff, time → Booking Details.
14. Close from a push: reminder → مكتمل / لم يحضر → outcome; and from Bookings → للإغلاق → Booking Details.
15. Add a branch: Hub → الفروع → form → hours, services, staff → branch bookable; branch chips appear.
16. Widen a men's or women's salon to both: Profile → خدمة الرجال والنساء → confirm.

---

## 4. Completion Checklist
- [ ] All M01–M32 screens with loading / error / empty states.
- [ ] Owner vs Employee variants where access differs.
- [ ] Business variants: men's, women's and both salons, clinic, tattoo studio (bride features only at salons serving women or both; design image only at tattoo studios).
- [ ] Single-branch vs several branches (branch chips and branch names only with several).
- [ ] All booking, payment and refund statuses.
- [ ] Request sheet + Android overlay + notification variants.
- [ ] Arabic RTL everywhere; English LTR + Dark for key screens.
- [ ] WAB brand and `AppTheme` tokens reused; no Liquid Glass.
