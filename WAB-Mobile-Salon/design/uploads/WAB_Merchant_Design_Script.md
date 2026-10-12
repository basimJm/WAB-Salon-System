# WAB Wedding & Beauty — Merchant App Design Script

> **Use:** Paste this whole document into the **same Claude Design project as the WAB Customer app**, and attach `WAB_Merchant_App_PRD.md` and `WAB_Merchant_BRD.md`.
> **Source of truth:** `WAB_Merchant_App_PRD.md`. If anything here conflicts with the PRD, the PRD wins.

---

## 0. Instructions to the Designer (read first)

1. **Clone the design system and logo of the WAB Customer app in this project.** Reuse exactly the same colors (light + dark), typography, spacing, radii, elevation, icon style, and components (buttons, cards, inputs, chips, tabs, badges, sheets, dialogs, shimmer, bottom nav). Do not introduce new colors or fonts. The merchant app must feel like the same brand.
2. **Merchant identity:** use the WAB logo with a small "Business / أعمال" label (e.g., "WAB Business") wherever the logo appears, so the merchant app is distinguishable from the customer app.
3. Design **every screen and every state** listed below. A screen is not complete until all its states exist.
4. **Primary language: Arabic, RTL.** Design all screens in Arabic RTL. Provide English LTR + Dark mode for: Login, Home, Booking Request sheet, Booking Details, Calendar.
5. **Device frame:** mobile 390×844, safe areas respected, shared Android/iOS UI (Compose Multiplatform).
6. **Realistic content:** Jordanian salons and names, JOD prices ("15 د.أ"), Amman areas, 12-hour times (ص / م), reference numbers like "WAB-24817".
7. **Loading = shimmer** shaped like the content. **Real-time** screens show a subtle "live" update (e.g., a new card animating in).
8. **Permissions:** pages a member has no permission for are **hidden** (not disabled). Show variants for Owner (full access) and Employee (limited).
9. Name frames with PRD IDs: `M07 Home / Owner / Loading`.

---

## 1. Global Patterns

### 1.1 Universal States
Loading (shimmer), pagination loading, no internet (+ إعادة المحاولة), server error (+ إعادة المحاولة), empty (+ action), pull-to-refresh (not on forms), toasts (success/error/info).

### 1.2 Merchant-specific Components (built from the customer design system)
- **Bottom Navigation** (5 items, each shown only if permitted): الرئيسية، الحجوزات، التقويم، الصالون، المزيد.
- **Offline banner** (persistent, all screens): "صالونك غير ظاهر للزبائن حالياً. تواصل مع WAB لإعادة التفعيل" + تواصل.
- **Salon state chip:** مباشر (Live) / غير متصل (Offline) / غير مكتمل (Incomplete) / قيد المراجعة / مرفوض.
- **Booking status badges** (same as customer app) + **Bride badge (عروس)** — highly visible.
- **Payment badges:** الدفع عند الوصول، تم دفع العربون، تم الدفع كاملاً، مدفوع. **Refund:** قيد الاسترجاع، تم الاسترجاع، فشل.
- **Merchant booking card:** reference, customer name, date/time, persons count, staff, status, payment, bride badge; pending variant with "منذ 5 دقائق" and auto-cancel countdown.
- **Request sheet** (Uber-style): large, attention-grabbing, queue indicator "1 من 3".
- **Action bar** (sticky): primary/secondary/destructive variants.
- **Reason picker sheet:** radio list (محجوز بالكامل، الموظف غير متاح، الخدمة غير متاحة، أخرى + نص).
- **Conflict dialog:** list of affected bookings + "إلغاء الحجوزات المتأثرة" / "رجوع" (and "إعادة توزيع" for staff changes).
- **Permission toggle row:** title + description + switch.
- **Calendar grid:** time column (15-min resolution), staff columns, booking blocks colored by status, shaded closed hours/leave.
- **Upload tile:** empty / uploading (progress) / uploaded / failed (retry).
- **OTP input:** dynamic number of boxes (currently **6**).
- **KPI tile, mini chart, ranking row** (statistics).
- **Checklist item:** done / pending with chevron.

---

## 2. Screens & States

### M01 — Splash
Logo "WAB Business" + loader.

### M02 — Welcome & Login
Background + logo; language & theme icons; headline "نمّي صالونك مع WAB"; country code + phone; **متابعة**; "صالون جديد؟ **سجّل صالونك**"; legal links.
Frames: empty, valid, invalid phone, loading, **"هذا الرقم غير مرتبط بأي صالون"** dialog (سجّل صالوناً جديداً / إلغاء), access removed message, blocked message. Dark + English variants.

### M03 — OTP
Same as customer OTP (6 dynamic boxes). Frames: countdown, filled/verifying, wrong code, resend active, expired popup, blocked 15 min. Header variants: تسجيل الدخول / تسجيل صالون / تغيير الرقم / تأكيد بيانات البنك.

### M04 — Salon Registration
Scrollable form: اسم الصالون، نوع الصالون (رجالي / نسائي + warning "لا يمكن تغييره لاحقاً")، الاسم الأول/الأخير للمالك، المدينة → المنطقة، **وثائق الترخيص** (1–5 upload tiles, image/PDF)، البريد (اختياري)، checkbox الشروط، **إرسال الطلب**.
Frames: empty, filled, uploading documents, upload failed, validation errors, submitting.

### M05 — Application Status
Frames: **Pending** (illustration, "طلبك قيد المراجعة", date, documents, CTA "جهّز ملف صالونك"), **Rejected** (reason + "تعديل وإعادة الإرسال"), **Approved** transition.

### M06 — Setup Checklist
Progress "4 من 6"; items: الملف والصور، الموقع والتواصل، ساعات العمل، الخدمات، الطاقم، السياسات (+ optional المعرض، صلاحيات الفريق). Frames: partial, all done → **"صالونك أصبح مباشراً!"** success.

### M07 — Home (Dashboard)
Header (salon name + image, bell with badge); state strip (+ subscription warning "تنتهي الفترة المجانية خلال 5 أيام"); **pending requests card** (count + list, bride badge, time since request); **اليوم**: counts + next booking; today's timeline; quick stats.
Frames: Owner full, Employee (only own timeline, no stats/requests), Offline banner variant, incomplete variant, loading (unified shimmer), no bookings today, error.

### M08 — Bookings List
Sticky search + filter; tabs **معلّقة | القادمة | اليوم | السابقة**; chips.
Frames: each tab with variety of cards (incl. bride, multiple persons), Employee scope (own only), filter sheet (date range, staff multi, status multi, عروس فقط toggle, payment), search results, empty per tab, loading, pagination, error, **real-time new card arriving**.

### M09 — Booking Details & Actions
Header (reference + copy, status, payment, refund, bride badge); customer (name, call, WhatsApp); persons (services, prices, durations, staff, times); payment (method, total, paid, **المتبقي للتحصيل**); policy snapshot; status history timeline; sticky action bar.
Frames by status:
- **Pending:** قبول / رفض.
- **Approved before start:** إلغاء / إعادة توزيع.
- **Approved after start:** "مكتمل ومدفوع" / "لم يحضر" / إعادة توزيع.
- **Completed, No-show, Rejected (reason), Cancelled (salon/customer/auto)** — read-only.
- Dialogs: reject reason sheet; cancel confirm ("سيحصل الزبون على استرداد كامل"); complete confirm ("أكّد أنك حصّلت 25 د.أ"); no-show confirm with policy outcome; reassign staff sheet (eligible staff list); **"تم التعامل مع هذا الحجز من قبل أحمد"** concurrency message.
- Women's bride booking with 3 persons.

### M10 — Real-time Booking Request
- **In-app sheet** over Home: title "طلب حجز جديد" (+ **عروس** badge), customer, persons, services, staff, date/time, total + payment method, "منذ دقيقة"; **قبول** / **رفض** / عرض التفاصيل. Variants: single, queue "1 من 3", bride, "تم التعامل معه بواسطة سارة".
- **Android overlay** over another app (full card with Accept/Reject).
- **Android locked-screen full-screen request.**
- **Notification (Android heads-up / iOS time-sensitive)** with قبول / رفض actions.
- **"Display over other apps" permission explainer screen** (Android).

### M11 — Calendar
Frames: **Day view** (staff columns, colored blocks, bride icon, shaded closed hours & leave), **Week view**, staff filter, Employee (single column), today with no bookings, loading.

### M12 — Salon Hub
Grid of management tiles with permission-based visibility and "ناقص" warnings. Frames: Owner (all), Manager (subset).

### M13 — Salon Profile Edit
Cover (16:9) + profile (1:1) upload/crop, name, description, **map picker** (pin + "استخدم موقعي"), location text, city/area, phone, WhatsApp (optional), salon type read-only, **معاينة كما يراه الزبون**, save.
Frames: default, editing, crop sheet, map picker, validation errors, unsaved-changes dialog, preview (customer salon details look).

### M14 — Gallery
Grid (images + videos with play icon), add (multi-select), upload progress, failed retry, reorder mode, select & delete confirm, empty "أضف أعمالك".

### M15 — Working Hours & Closures
Weekly list (السبت → الجمعة) with toggles + time pickers, "نسخ لكل الأيام"; closures list + add sheet (date range + reason).
Frames: default, time picker, invalid hours error, add closure, **conflict dialog** listing affected bookings, saved toast.

### M16 — Services
List (image, name, price, duration, "للعروس فقط" badge, active toggle), search, empty. **Catalog picker** (gender-only, already-added marked). **Service form** (price "شامل الضريبة والرسوم", duration, bride-only toggle (women only), description, media, active). **Catalog request** form + requests list (قيد المراجعة / مقبول / مرفوض + ملاحظة). Warning "لا يوجد موظف يقدم هذه الخدمة".
Frames: men's salon (no bride toggle), women's salon, empty, deactivate warning with affected bookings.

### M17 — Team & Staff
List (photo, name, role badge, "يقدم خدمات", active/inactive, "في إجازة اليوم"). **Member form** (owner): names, phone (mandatory), photo, role, active, يقدم خدمات toggle → staff section (bio, years, services multi-select, مؤهلة للعرائس, working days + custom hours, leaves list + add), صلاحيات → M18.
Frames: owner view, STAFF_MANAGE-only view (limited fields), add member, edit staff, leave add sheet, **conflict dialog** (إعادة توزيع / إلغاء / رجوع), owner row non-removable.

### M18 — Permissions Editor
Member header; "تطبيق قالب الدور"; grouped toggles with descriptions (الحجوزات، الصالون، الطاقم، المالية، التحليلات). Owner-only permissions shown locked with note "خاصة بالمالك". Frames: Manager template, Employee template, saving.

### M19 — Policies
Cancellation window (chips 1/2/3/6/12/24/48/custom), payment options (multi), deposit % with live example "على حجز 50 د.أ العربون 10 د.أ", refund rules, no-show rules, notes, **customer preview** of "قواعد الصالون". Frames: default, deposit disabled, validation error, preview sheet.

### M20 — Reviews
Tabs صالون | الطاقم (staff selector); header avg + count + star distribution; list; إبلاغ action. Frames: list, empty, loading.

### M21 — Statistics
Period selector; KPI tiles; charts (bookings/day, revenue/day); top services; top staff. Frames: week, month, empty period, loading.

### M22 — Finance
Balance card; tabs المعاملات | المبالغ المستردة | الدفعات; filters; **bank details** (owner) with OTP. Frames: each tab, empty, bank form, info note.

### M23 — Subscription & Status
Frames: Trial (days left), Active, Expired + Offline, "تواصل مع WAB", "اظهر ضمن الصالونات الموصى بها".

### M24 — Notifications
Same as customer: list (read/unread, types), filter sheet, empty, loading.

### M25 — More
Account (photo, name, phone, role), settings (language, theme, push, Android overlay status, test sound), support, legal, logout, delete (member: remove access; owner: deletion request). Frames: Owner, Employee, logout dialog, delete dialogs (2 variants).

### M26 — Force Update / Maintenance
Blocking screens + optional update dialog.

---

## 3. Flows to Prototype
1. New salon: Login → not linked → Register salon → OTP → Registration → Pending → Prepare profile → Checklist → Approved → Live.
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
12. Offline salon: banner across screens → Subscription → Contact WAB.

---

## 4. Completion Checklist
- [ ] All M01–M26 screens with loading / error / empty states.
- [ ] Owner vs Employee variants where access differs.
- [ ] Men's vs Women's salon variants (bride features only in women's).
- [ ] All booking, payment and refund statuses.
- [ ] Request sheet + Android overlay + notification variants.
- [ ] Arabic RTL everywhere; English LTR + Dark for key screens.
- [ ] Customer app design system and logo reused exactly.
