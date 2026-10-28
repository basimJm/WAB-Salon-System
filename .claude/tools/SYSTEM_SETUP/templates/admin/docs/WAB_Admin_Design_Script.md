# WAB Wedding & Beauty — Admin Panel Design Script

> **Use:** Paste this whole document into the **same Claude Design project as the WAB Customer app**, and attach `WAB_Admin_PRD.md` and `WAB_Admin_BRD.md`.
> **Source of truth:** `WAB_Admin_PRD.md`. If anything here conflicts with the PRD, the PRD wins.

---

## 0. Instructions to the Designer (read first)

1. **Clone the design system and logo of the WAB Customer app in this project.** Same colors (light + dark), typography, radii, elevation, icon style. Adapt components to a **desktop web** context (denser tables, sidebar, data visualization) while keeping the brand identical. Do not introduce new brand colors; for charts, derive a categorical palette from the brand colors plus neutral tones, and use semantic colors (success/warning/error) consistent with the mobile apps.
2. **Logo:** WAB logo with an "Admin / لوحة التحكم" label.
3. **Desktop web, 1440×900** frames (responsive down to tablet 1024). React web app.
4. **Primary language: Arabic, RTL** (sidebar on the right). Provide English LTR + Dark mode for: Live Overview, Bookings list, Booking details, User Journey.
5. **Data-dense but calm:** clear hierarchy, generous whitespace around KPIs, tables with sticky headers.
6. **Realistic content:** Jordanian names, salons, money amounts, Amman areas, reference numbers "WAB-24817", dates in Asia/Amman, 12-hour times.
7. **States for every page:** skeleton loading, empty, error with retry, and real-time update indicator ("مباشر" dot).
8. Name frames with PRD IDs: `A15 Bookings / List / Loading`.

---

## 1. Global Layout & Components

### 1.1 App Shell
- **Sidebar (collapsible, RTL right side):** نظرة مباشرة، التحليلات (expandable: الزيارات والمستخدمون، الشاشات والأحداث، مسارات التحويل، البحث والاكتشاف، الاحتفاظ، الحجوزات، المدفوعات، الأخطاء والمشاكل، التجار)، رحلة المستخدم، العملاء، الصالونات (الكل، طلبات الانضمام)، الحجوزات، المالية (المعاملات، المبالغ المستردة، الدفعات، الاشتراكات، المطابقة)، التقييمات، الكتالوج (الخدمات، الطلبات)، المحتوى (البانرات، الموصى بها، الصفحات القانونية، الأسئلة الشائعة، معلومات التواصل)، الإشعارات، التقارير، التنبيهات، الإعدادات، سجل الأفعال. Counters on items with pending work (طلبات الانضمام 4، التقييمات 12، التنبيهات 3).
- **Top bar:** global search (results grouped: عملاء، صالونات، حجوزات، أعضاء), alerts bell with count, language toggle, theme toggle, admin menu.

### 1.2 Components
- **Data table:** sticky header, sort, column filters, column visibility, row hover, pagination (10/25/50/100), bulk select, **Export** menu (Excel / PDF), saved filters in URL, empty/loading/error rows.
- **Filter bar:** date range picker (presets: اليوم، أمس، آخر 7 أيام، آخر 30 يوم، هذا الشهر، الشهر الماضي، هذه السنة، مخصص + compare toggle), multi-select dropdowns, active filter chips with ×.
- **KPI card:** value, label, delta vs previous period (↑/↓ with color), sparkline.
- **Charts:** line, bar, stacked bar, donut, **funnel** (steps with % and drop-off), **cohort heatmap**, each with "عرض البيانات" and export.
- **Status badges:** all booking / payment / refund / salon / subscription / review / alert statuses.
- **Detail page template:** header (title, status, key actions), tabs, side info panel.
- **Action modal with mandatory reason** (destructive variant), confirmation modal, success toast.
- **Timeline** (status history and user journey): grouped by session, event rows with icon, time, screen, params, expandable JSON, highlighted errors/payments.
- **Document viewer:** zoom, rotate, download, page thumbnails.
- **Rich text editor** (ar/en tabs), **image uploader** (ar/en variants), **schedule picker** (start–end).
- **Live activity feed** item.
- **Alert row:** severity, title, entity link, time, acknowledge.

---

## 2. Pages & States

### A00 — Login & 2FA
Email + password → email OTP (dynamic boxes) → panel. Frames: default, wrong password, locked 15 min, OTP, new-device notice.

### A01 — Live Overview
KPI cards (active users now by type & platform, today's installs, registrations, bookings by status, pending requests + oldest wait, bride bookings, payments attempts/success/failed + top failure reason, amount collected, refunds pending/failed, errors last hour, pending applications, offline salons, trials ending ≤7 days), **live activity feed**, bookings per hour today vs last week chart. Frames: normal day, quiet day (zeros), error card state, loading, **dark + English**.

### A02 — Traffic & Users
KPIs (installs, DAU/WAU/MAU, sessions, avg duration, guest→registered), breakdown charts (app, platform, version, device, language, gender, city), table.

### A03 — Screens & Events
Screens ranking table (views, unique users, avg time, exits); **event explorer** (event picker → chart + breakdown by param + raw events table with JSON drawer, user link).

### A04 — Funnels
Funnel selector (Activation, Registration, Booking, Approval, Merchant onboarding); funnel chart with conversion/drop-off/median time; segment filters; click a drop-off → users list drawer → journey. **Custom funnel builder** frame.

### A05 — Search & Discovery
Top queries, **zero-result queries** table, filter usage, banner CTR, recommended clicks, location permission rates, salon views/calls/WhatsApp/maps, shares & deep links, favorites.

### A06 — Retention
Cohort heatmap (customers / merchants toggle), repeat booking rate, bookings-per-customer histogram.

### A07 — Bookings Analytics
Status over time, by gender/city/salon, bride bookings, persons per booking, response time, approval/rejection reasons, cancellations vs window, auto-cancels, no-shows, payment method mix, lead time.

### A08 — Payments Analytics
KPIs (success rate, failures by reason, by platform/version, collected, fees); **every attempt table** with gateway code/message, result badges; refunds KPIs.

### A09 — Errors & Issues
API errors by endpoint/status, p95 latency chart, failed requests drawer; client errors; crashes (crash-free %, by version, link to Firebase); OTP sends/failures/blocks; payment & refund failures; push failures.

### A10 — Merchants Analytics
Salons by state, approval time, completeness distribution, per-salon performance table, member activity, subscriptions summary.

### A11 — User Journey
Search (phone, name, IDs, installation ID, booking reference); identity header (type, devices, first/last seen, registration date, totals); **timeline** grouped by sessions with **Guest** marker before registration, highlighted errors and payment attempts, JSON drawer; filters; export.
Frames: customer with guest history, merchant member, empty search, **dark + English**.

### A12 — Customers
List table (name, phone, gender, city, registered, last active, bookings, status); details tabs: الملف (editable), الحجوزات، المدفوعات والاسترداد، التقييمات، الرحلة، الأجهزة، الإشعارات. Modals: block/unblock (reason), restore account, force delete (reason), send push.

### A13 — Salons
List (name, gender, city/area, state, subscription, rating, bookings 30d, recommended, created); details tabs: نظرة عامة (state, completeness checklist, subscription, KPIs, actions)، الملف، الوثائق، المعرض، ساعات العمل والعطل، الخدمات، الأعضاء والطاقم، السياسات، الحجوزات، التقييمات، المالية، التحليلات، النشاط. Modals: set Online/Offline (reason), mark recommended, deletion request.

### A14 — Applications Queue
Queue table (oldest first, resubmission count); review page: submitted data + **document viewer** → قبول / رفض (reason). Frames: queue, review, approve success, reject modal, empty queue.

### A15 — Bookings
List table with rich filters (status, payment, refund, created/appointment dates, salon, gender, city, bride, method) and export; details page: mobile-equivalent details + **status history timeline** (actor: عميل/عضو/النظام/الإدارة), related transactions/refunds, notifications sent, related events.
Admin action modals (reason required): approve, reject, cancel (3 modes), complete/paid, no-show, revert status (warning), reassign staff (eligible list), refund (full/partial).
Frames: list, list with real-time new row, details for Pending / Approved / Completed / Cancelled, each modal, **dark + English**.

### A16 — Transactions
Table of all attempts/captures; details drawer with gateway request/response log and status timeline.

### A17 — Refunds
Table (source, status, ages); actions: retry, mark refunded manually (reference), manual refund. Overdue highlight.

### A18 — Payouts
Per-salon balances table; **create payout** flow (select salons & period → computed breakdown → record transfer date, amount, reference, note); history; bank details panel.

### A19 — Subscriptions
Table (status, trial end, period end, days remaining, last payment); record payment modal; "ending ≤7 days" and "expired" views; set Offline/Online.

### A20 — Recommended Salons
Per-gender lists with period, order (drag), amount, status (scheduled/active/ended); add/edit modal.

### A21 — Reconciliation
Period summary cards and mismatch table.

### A22 — Reviews Moderation
Queue (salon/staff, author, rating, comment, author history); approve / reject; **bulk actions**; published reviews with remove.

### A23 — Catalog
Services (men/women tabs) table + create/edit modal (ar/en name & description, image, active, order); requests queue (approve → create/map, reject with note).

### A24 — Content
Banners (grid + editor: ar/en images, action, gender target, schedule, order, preview in a phone mock); legal pages (rich text ar/en, per app); FAQ (per app, reorder); contact info (per app).

### A25 — Push Notifications
Composer (ar/en title & body, app, audience builder with estimated size, link target, send now / schedule, **phone preview**); history table (sent, delivered, opened, failures).

### A26 — Reports
Report cards (يومي / أسبوعي / شهري) → report view with charts and tables → **Export Excel / PDF**; async export progress toast; date period selector.

### A27 — Alerts
Alerts list (severity, type, entity, time, status جديد/تمت المراجعة), acknowledge; email preview frame of an alert email (WAB branding).

### A28 — Settings
Sections: الاكتشاف، قواعد الحجز، OTP (code length, resend, limits)، المواقع (countries with regex, cities/areas)، إصدارات التطبيقات (per app & platform)، وضع الصيانة، فترة حذف الحساب، التنبيهات (recipients, thresholds)، الدفعات. Frames: each section, save success, validation error.

### A29 — Audit Log
Immutable table (time, action, entity link, reason, IP, device) + diff drawer (before/after).

---

## 3. Flows to Prototype
1. Login → 2FA → Live Overview.
2. Alert email → Alerts → Booking with payment failure → User Journey of that customer.
3. Applications queue → review documents → approve → salon details.
4. Bookings → filter pending bride bookings → details → admin cancel with full refund.
5. Funnels → booking drop-off at payment → users → journey.
6. Refunds → failed → retry → mark refunded.
7. Payouts → create payout → record transfer.
8. Subscriptions → expired → set salon Offline.
9. Reviews queue → bulk approve.
10. Push composer → audience → schedule.
11. Reports → monthly → export PDF.

---

## 4. Completion Checklist
- [ ] All pages A00–A29 with skeleton, empty and error states.
- [ ] Every admin action modal with mandatory reason.
- [ ] Tables with filters, export and pagination; charts with "view data".
- [ ] Real-time indicators on live pages.
- [ ] Arabic RTL everywhere; English LTR + Dark for key pages.
- [ ] Customer app design system and logo reused, adapted for desktop.
