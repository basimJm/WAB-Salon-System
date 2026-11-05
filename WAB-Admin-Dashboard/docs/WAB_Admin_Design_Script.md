# WAB Wedding & Beauty — Admin Panel Design Script

> **Use:** Paste this whole document into the **same Claude Design project as the WAB Customer app**, and attach `WAB_Admin_PRD.md` and `WAB_Admin_BRD.md`.
> **Version:** 2026-11-04.
> **Source of truth:** `WAB_Admin_PRD.md` for behaviour, `BUSINESS_DOMAIN.md` for data and rules. Precedence: PRD > BRD > this script > design files.
> **Design files:** some `design/*.dc.html` files predate business types, branches, business-made bookings and closing finished bookings. They stay a visual reference; where they differ, the PRD wins.

---

## 0. Instructions to the Designer (read first)

1. **Clone the design system and logo of the WAB Customer app in this project.** Same colors (light + dark), typography, radii, elevation, icon style. Adapt components to a **desktop web** context (denser tables, sidebar, data visualization) while keeping the brand identical. Do not introduce new brand colors; for charts, derive a categorical palette from the brand colors plus neutral tones, and use semantic colors (success/warning/error) consistent with the mobile apps.
2. **Logo:** WAB logo with an "Admin / لوحة التحكم" label.
3. **Desktop web, 1440×900** frames (responsive down to phone). React web app.
4. **Primary language: Arabic, RTL** (sidebar on the right). Provide English LTR + Dark mode for: Live Overview, Bookings list, Booking details, User Journey.
5. **Data-dense but calm:** clear hierarchy, generous whitespace around KPIs, tables with sticky headers.
6. **Realistic content:** Jordanian names, salons, clinics and tattoo studios, JOD amounts, Amman areas, reference numbers "WAB-24817", dates in Asia/Amman, 12-hour times.
7. **States for every page:** skeleton loading, empty, error with retry, and real-time update indicator ("مباشر" dot).
8. Name frames with PRD IDs: `A15 Bookings / List / Loading`.

---

## 1. Global Layout & Components

### 1.1 App Shell
- **Sidebar (collapsible, RTL right side):** نظرة مباشرة، التحليلات (expandable: الزيارات والمستخدمون، الشاشات والأحداث، مسارات التحويل، البحث والاكتشاف، الاحتفاظ، الحجوزات، المدفوعات، الأخطاء والمشاكل، التجار)، رحلة المستخدم، العملاء، الصالونات (كل الصالونات، الطلبات; holds every business type)، الحجوزات، المالية (المعاملات، المبالغ المستردة، التحويلات للصالونات، الاشتراكات، المطابقة)، التقييمات، الكتالوج (الخدمات، الطلبات)، المحتوى (البانرات، المميّزة، الصفحات القانونية، الأسئلة الشائعة، معلومات التواصل)، الإشعارات، التقارير (التقارير، عمليات التصدير)، التنبيهات، الإعدادات (عام، الدول، المدن، المناطق، إصدارات التطبيق، الصيانة)، سجل الأفعال. Counters on items with pending work (الطلبات 4، التقييمات 12، التنبيهات 3).
- **Top bar:** global search (results grouped: عملاء، صالونات، حجوزات، أعضاء), alerts bell with count, language toggle, theme toggle, admin menu (ملفي الشخصي A30, حول هذا الإصدار A31, sign out).

### 1.2 Components
- **Data table** (`DataTable`, `ListPage`): sticky header, row hover, pagination, bulk select, **Export** menu (`ExportMenu`) on lists with an export kind, filters kept in the URL, empty/loading/error rows.
- **Business type switch** (`BusinessTypeFilter`, a `SegmentedControl`): الكل · الصالونات · العيادات · استوديوهات الوشم, in the header of every business list (A13, A14, A15, A22, requests of A23). A20 and the services of A23 use the three types without الكل.
- **Business badges** (`BusinessBadges`): type badge (صالون، عيادة، استوديو وشم) + audience badge (رجال، نساء، رجال ونساء), on every business row and details page.
- **Filter bar:** date range picker (presets: اليوم، أمس، آخر 7 أيام، آخر 30 يوم، هذا الشهر، الشهر الماضي، هذه السنة، مخصص + compare toggle), multi-select dropdowns, active filter chips with ×.
- **KPI card:** value, label, delta vs previous period (↑/↓ with color), sparkline.
- **Charts:** line, bar, stacked bar, donut, **funnel** (steps with % and drop-off), **cohort heatmap**, each with "عرض البيانات" and export.
- **Status badges** (`StatusBadge`): all booking / payment / refund / business / branch / subscription / review / alert statuses.
- **Empty board card** ("No data yet" on the analytics boards, `AnalyticsBoard`): an honest empty state, never invented numbers.
- **Detail page template:** header (title, status, key actions), tabs, side info panel.
- **Action modal with mandatory reason** (destructive variant), confirmation modal, success toast.
- **Timeline** (status history and user journey): grouped by session, event rows with icon, time, screen, params, expandable JSON, highlighted errors/payments.
- **Document viewer** (`DocumentViewer`): zoom and rotate images, open or download PDFs.
- **Rich text editor** (ar/en tabs), **image uploader** (ar/en variants), **schedule picker** (start–end).
- **Live activity feed** item.
- **Alert row:** severity, title, entity link, time, acknowledge.

---

## 2. Pages & States

### A00 — Login & 2FA
Email + password → email OTP (dynamic boxes) → panel. Frames: default, wrong password, locked 15 min, OTP, new-device notice.

### A01 — Live Overview
Live pill (`LiveIndicator`) and today in Amman in the header, shortcuts to today's report and Alerts; date range with compare; four KPI cards with event breakdown (payments, refunds, bookings, errors from server events); events-per-day chart. Frames: normal day, quiet day (zeros), error card state, loading, **dark + English**. The live KPI row with sparklines arrives with SRV-162 → ADM-100.

### A02–A06 — Traffic & Users, Screens & Events, Funnels, Search & Discovery, Retention
The boards of `design/WAB Admin 03 Analytics`, in one state only: **every KPI and card "No data yet"**, because this data lives in Firebase (PRD §5).

### A07 — Bookings Analytics
Real: bookings created, acceptance, auto-cancelled, no-show, status per day (stacked bars). Every other KPI and card "No data yet" until SRV-168 → ADM-106.

### A08 — Payments Analytics
Real: success rate, attempts, refunds, refunds failed, events per day, button to Transactions. All zero while online payment is paused. Every other KPI and card "No data yet".

### A09 — Errors & Issues
Real: OTP blocked, failure counts card, error events per day. Latency, endpoints, push failures "No data yet"; crashes "No data yet" (Firebase console).

### A10 — Merchants Analytics
Real: subscription counts, businesses-by-state donut. Performance, completeness and member activity "No data yet".

### A11 — User Journey
"Find a user" card, then an empty state with **Open customers** for a search: the server holds no journey data. Frames: before search, after search, **dark + English**.

### A12 — Customers
List table (name, phone, gender, city, registered, last active, bookings, status); details tabs: الملف (fields + devices)، التقييمات، الإشعارات. Drawers and modals: edit, block/unblock (reason), delete, restore account, force delete (reason), send push.

### A13 — Businesses (sidebar: الصالونات)
List: **type switch** in the header; columns name (deletion badge), **type + audience badges**, city, state, rating, subscription, recommended, bookings 30d, created.
Details: header actions; side panel (owner, phone, subscription, trial end); tabs نظرة عامة (type + audience, completeness checklist)، **الفروع**، insights، admin activity، payout details، الأعضاء (branch column + branch filter).
**Branches tab:** table with the Main badge, status + offline reason, ready to book or missing items, area, staff, phone; "n open of 20"; add/edit drawer; row actions جعله الفرع الرئيسي، إيقاف الظهور، إعادة الظهور (reason)، إغلاق الفرع; the blocked-close dialog (`CloseBlockedDialog`) lists upcoming bookings with links.
**Audience drawer** (`AudienceDrawer`, salons only; no button on clinics and tattoo studios): current audience, the other audiences, one line explaining widening or narrowing, mandatory reason. Narrowing with future bookings shows the **conflict list** (`AudienceConflicts`): booking links, first 10, then a count.
**Edit on behalf** (`/salons/:id/edit`): tabs Profile, Gallery, Hours and closures, Services, Staff, Policies; a **branch picker** (`BranchPicker`) above Hours, Services, Staff; every save asks for a reason; affected bookings shown (`BrokenBookings`).
Frames: list on All and on Clinics, clinic details (no audience button), branches tab, blocked close, audience drawer widening, narrowing with conflicts.

### A14 — Applications Queue
Queue table (oldest first, type switch, type + audience badges, resubmission count); review page: submitted data + **document viewer** → قبول / رفض (reason). The clinic review shows a second section for the **medical license**, with a warning when it is missing; a tattoo studio shows the trade license only. Frames: queue, salon review, clinic review, approve success, reject modal, empty queue.

### A15 — Bookings
List: tabs الكل، قيد الانتظار، القادمة، اليوم، السابقة، **بحاجة إلى إغلاق** (To close); type switch; columns reference, customer, **أنشأه (Made by: تطبيق العميل / النشاط التجاري)**, business with type, branch, appointment, persons, status, payment, total, requested; filters status, payment, bride, day range, business + branch, customer, **source**; export.
Details: mobile-equivalent details + **status history timeline** (actor: عميل/عضو/النظام/الإدارة). Rows **Made by** and **أنشأه الموظف (Created by)** for a business-made booking. A customer without an account is plain text with **بدون حساب في WAB** and no link. Tattoo bookings add a Design column in the persons table with the link **عرض صورة التصميم** (signed URL, new tab).
Admin action modals (reason required): change status (warning line for moves outside the normal flow), cancel (3 modes: customer, business, admin), reassign staff (eligible list, only approved and not started), refund (amount; only when something was paid online).
Frames: list, list with real-time new row, To close tab, details for Pending / Approved / Completed / Cancelled, business-made booking without an account, tattoo booking with a design link, each modal, **dark + English**.

### A16 — Transactions
Table of all attempts/captures; details page with gateway code and message, attempts table and raw gateway answer. Online payment is paused: the empty state is the normal frame.

### A17 — Refunds
Table (source, branch, attempts, next attempt, last error, status); actions: retry, mark refunded manually (reference). Overdue highlight. Empty while online payment is paused.

### A18 — Payouts
Per-business balances table; **create payout** flow (select business & period → computed breakdown → record transfer date, amount, reference, note); history. Bank details live on the business page (A13). Zero balances while online payment is paused.

### A19 — Subscriptions
Table (business, status, end date, days remaining, last payment); record payment drawer; "ending ≤7 days" and "expired" filters; payment history.

### A20 — Recommended
**Per business type** (الصالونات، العيادات، استوديوهات الوشم switch): list with order (move up/down), business, type + audience badges, period, amount, status (scheduled/active/ended); add/edit drawer; end now (reason).

### A21 — Reconciliation
Status badge (all clear / n to review), business + branch filter, three cards: stuck pending, paid without a booking, missing ledger charge.

### A22 — Reviews Moderation
Status tabs, type switch, business + branch filters; table (target, business, **branch label**, rating, comment, author with their other reviews count); approve / reject; **bulk actions**; published reviews with remove.

### A23 — Catalog
Services: **per business type** (three-type switch; salons also filter by audience) table with type + audience badges + create/edit drawer (ar/en name & description, image, active, order; audience disabled and fixed to BOTH for clinics and tattoo studios; type and audience read-only on edit). Requests queue with type switch (approve → create or map to a fitting service, reject with reason).

### A24 — Content
Banners (grid + editor: ar/en images, action, audience (رجال، نساء، الجميع), schedule, order, preview in a phone mock); legal pages (rich text ar/en, per app); FAQ (per app, reorder); contact info (per app).

### A25 — Push Notifications
Composer (ar/en title & body, app, audience builder with estimated size, link target, send now / schedule, **phone preview**); history table (sent, delivered, opened, failures).

### A26 — Reports
Tabs يومي / أسبوعي / شهري with a period selector → report view with KPI cards, charts and tables. **Exports page** (عمليات التصدير): table of requested files (what, format, rows, status, short-lived download).

### A27 — Alerts
Alerts list (severity, type, entity, time, status جديد/تمت المراجعة), acknowledge, including **حجز ما زال مفتوحاً** (`BOOKING_CLOSE_OVERDUE`, links to the booking) and **توسيع فئة صالون** (`SALON_AUDIENCE_WIDENED`); email preview of an alert email (WAB branding) arrives with SRV-166 → ADM-104.

### A28 — Settings
General page with three tabs: الحجز والتحقق (discovery, booking rules with the **close-reminder interval** and **overdue alert**, OTP, reviews)، الحسابات والأمان (admin sign-in, sessions, account deletion, subscriptions, فروع الصالونات, refunds)، الحدود والتنبيهات (page sizes, uploads, alert thresholds). Separate pages: الدول (with regex)، المدن، المناطق، إصدارات التطبيق (per app & platform)، الصيانة. Save asks for a reason. Frames: each tab, save success, validation error.

### A29 — Audit Log
Immutable table (time, action, entity link, reason, IP, user agent) + diff drawer (before/after).

### A30 — Admin Profile
Cards: change password, change email (with verification), alert email recipients.

### A31 — About
Key-value list: version, build id, environment, variant, data source.

---

## 3. Flows to Prototype
1. Login → 2FA → Live Overview.
2. Alert email → Alerts → the entity it links to.
3. Applications queue → clinic review with the medical license → approve → business details.
4. Bookings → filter pending bride bookings → details → admin cancel with full refund.
5. Alert "booking still open" → Bookings, To close → details → mark Completed.
6. Refunds → failed → retry → mark refunded.
7. Payouts → create payout → record transfer.
8. Subscriptions → expired → business details → set Offline.
9. Reviews queue → bulk approve.
10. Push composer → audience → schedule.
11. Reports → monthly → export PDF.

---

## 4. Completion Checklist
- [ ] All pages A00–A31 with skeleton, empty and error states.
- [ ] Type switch and type + audience badges on every business list.
- [ ] Every admin action modal with mandatory reason.
- [ ] Tables with filters, export and pagination; charts with "view data".
- [ ] Real-time indicators on live pages.
- [ ] Arabic RTL everywhere; English LTR + Dark for key pages.
- [ ] Customer app design system and logo reused, adapted for desktop.
