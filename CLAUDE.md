# WAB Wedding & Beauty — Monorepo Guide for AI Agents

> **MANDATORY, auto-loaded on every turn (never read these with a tool):**
> - Rules: @.claude/rules.md
> - Roles: @.claude/roles.md
> - Hooks & workflow (4-role review, task block template): @.claude/hooks.md
> - Session index (all projects): @.claude/session.md
> - Memory (cross-project facts): @.claude/memory.md
>
> Working inside a project folder also loads that project's `CLAUDE.md` + `.claude/{session,memory}.md`. Hooks in `.claude/settings.json` enforce branching, no-hardcode, unit tests, `Loops: 1/1` and the review; never disable or bypass them.

## 0. How a session works (token-minimal, mandatory)
1. Nothing is read up front beyond the auto-loaded files. **One project per session.**
2. `python3 scripts/tasks.py next <project>` (projects: `server`, `admin`, `customer`, `merchant`, `payments`, `otp`, `notifications`, `analytics`, `storage`) gives the one task to do: ID, branch, dependencies, PRD sections and API operations. Never open a backlog file whole.
3. Read only the PRD/BRD/`BUSINESS_DOMAIN.md` sections and OpenAPI operations the task row names (grep the heading, read the range). `INTEGRATION.md` §1–§5 once when a task touches two projects.
4. Branch from the project's master (`INTEGRATION.md` §1), `tasks.py set <ID> "IN PROGRESS"`, task block in the **project's** `.claude/session.md`, implement + tests, one verification loop, 4-role review, gate, PR into the master, merge, `tasks.py set <ID> DONE` (this unblocks dependents in other projects and rewrites the board), next task.

## 1. The business in one paragraph
**WAB** is a two-sided marketplace in **Jordan** connecting customers with **beauty businesses of three types: salons (men, women or both), beauty clinics and tattoo studios**. Customers (mobile app) discover every business together (type lens All · Salons · Clinics · Tattoo; gender is asked at setup and never filters discovery), view profiles (branches, hours, staff, services, reviews, gallery) and **book** for themselves + up to **5 companions**; women's and mixed salons support **bride bookings**; tattoo bookings can carry a design image. Businesses (merchant app) register with a license (clinics also a medical license), get approved by admin, complete their profile, manage branches, services (from an admin catalog per type), staff, schedules and policies, **accept/reject booking requests in real time**, book for customers with or without the app, and close finished bookings. Admin (web panel) has full visibility and control. Free for customers; businesses pay a monthly subscription (3 months free, paid outside the app) and can buy "Recommended" placement. **Money, Phase 1:** the platform collects online payments (deposit % or full) through one gateway, refunds automatically, pays businesses manually; **online payment is paused until a gateway is chosen, so today every booking is pay on arrival**; Phase 2 = sub-merchants/split payments (design so it is an extension). Arabic default (RTL) + English; **JOD only**, tax-inclusive, integer fils; store UTC, compute in **Asia/Amman**, display 12-hour.

## 2. Repository map (details, branches and backlogs: `INTEGRATION.md` §1)
| Path | Project | Status (2026-11-04) |
|---|---|---|
| `WAB-Server/` | Backend API (Node + Express + Mongoose + Redis + Socket.IO + BullMQ, TypeScript strict) | Built through SRV-188; SRV-162…168 (admin design gaps) ready; deployment and owner inputs pending |
| `WAB-Admin-Dashboard/` | Admin web panel (React 19 + TS + Vite) | Built through ADM-112; remaining rows blocked on SRV-162…168 / owner |
| `WAB-Mobile-Customer/` | Customer app (KMP + Compose Multiplatform) | Built through CUS-106; online payment, device OTP/push and stores wait on the owner |
| `WAB-Mobile-Salon/` | Merchant app (same stack, scaffolded from the customer template) | Built through MER-086; Firebase registrations (MER-004 → MER-012), stores wait on the owner |
| `wab-notifications/`, `wab-otp/`, `wab-storage/` | SDKs: FCM push + SMTP email; WhatsApp OTP through ARQAM; R2/S3 storage | Built, wired in the server as local packages (publish pending) |
| `wab-payments/`, `wab-analytics/` | SDKs (ports + adapters; `wab-payments` also KMP) | Built, **not used**: payments paused; server analytics = its own MongoDB events (owner 2026-10-19) |
| `.claude/tools/KMP_TEMPLATE/` | Tool: `KMP_TEMPLATE` creates a new KMP app with the customer app's setup (README inside) | Ready |

Each project: `docs/` (PRD = behaviour source of truth, BRD, Design Script, `*_Tasks.md` backlog), `design/` (apps: `*.dc.html` visual reference), `.claude/` (session, memory, Integration). Precedence: **PRD > BRD > Design Script > design files**; conflicts → stop and ask. `BUSINESS_DOMAIN.md` = the single source for schemas, enums, rules, state machine, permissions, jobs, settings and error codes (mandatory for server, contract and cross-project work).

## 3. Integration essentials (full map and live board: `INTEGRATION.md`)
- REST + JSON, three namespaces with separate token scopes: `/customer/v1`, `/merchant/v1`, `/admin/v1`; `Accept-Language: ar|en` on every request; envelope `{success,message,data,meta?}` / `{success:false,message,error:{code,details?,traceId}}`; clients branch on `code`. **Contract = the generated `WAB-Server/docs/api/openapi.*.json`** (+ Postman); clients regenerate DTOs from it.
- Auth: customers/members phone + WhatsApp OTP (server generates the code and ARQAM OTP delivers it over WhatsApp, AR/EN template by `Accept-Language`; `otp/request` gives `otpLength` = 6 today, `resendAfterSeconds` = 60, `expiresInSeconds`; `otp/verify` returns a single-use `otpToken`; login/register/change phone/booking/bank details take it; backend issues JWT access + rotating refresh). Limits 5 requests / 5 min and 5 wrong codes → 15 min block. Admin: email + password + email OTP. Merchant permissions: owner has all; 16 grantable keys enforced on every endpoint, socket event and notification; hidden-not-disabled in UI.
- Real-time: Socket.IO (Redis adapter), rooms per customer / branch (permission-filtered) / member / admin; new booking request = socket event + FCM high-priority data message to members with `BOOKINGS_RESPOND`, de-duplicated by booking id. Clients also refresh on FCM message and foreground.
- Push: FCM, one Firebase project per environment, 4 app registrations. Admin email alerts via Gmail SMTP. Jobs: reminders 1 h / 15 min, pending alert 30 min, **auto-cancel 1 h after start if still pending (full refund)**, close reminders every hour until a finished booking is closed + overdue alert after 24 h, subscription/trial checks, placement expiry, deletion after 30-day grace, alerts, reports.
- Files: presigned upload → device compression → direct upload (Cloudflare R2, AWS S3 as fallback) → confirm → public URL; private files via short-lived signed URLs. Analytics: apps track every screen/action in Firebase; server events in MongoDB (BigQuery dropped, owner 2026-10-19); apps never send analytics to the backend.

## 4. Core business rules (enforced on the server)
1. A salon serves men, women or both; clinics and tattoo studios serve both; a men's or women's salon takes only persons of its audience; max 5 companions. 2. Business visible only if approved + profile complete + ≥1 bookable branch + not Offline; gender never hides a business. 3. Slots every 15 min, up to 90 days; duration = sum of services. 4. Staff eligible only if of that branch, on duty, not on leave, skilled in **all** selected services, bride-qualified for brides, free for the full duration. 5. **No double booking** (Redis locks + atomic re-validation); PENDING holds the slot. 6. PENDING → APPROVED / REJECTED → COMPLETED / NO_SHOW; cancellations by customer, business, auto; bookings made by the business start APPROVED; full status history. 7. Business reject/cancel and auto-cancel → full refund; customer cancel follows the snapshotted policy. 8. Only the business (including the assigned staff) or admin marks Completed/No-show, at/after start. 9. Prices and policies snapshotted; no rescheduling, no partial cancellation. 10. A failed payment never creates a booking; idempotency keys + server verification. 11. Reviews published only after admin approval. 12. Admin actions always carry a reason, audit log and notification.

## 5. Engineering conventions
- Never commit secrets (`.env*` except `.env.example`, keystores, service-account JSON, xcconfig secrets); never edit `.env*` without permission.
- Backend: `WAB-Server/CLAUDE.md` (layers route → middleware → controller → service → repository → schema; customer/merchant/admin modules; AR+EN locales; constants, no magic numbers; tests for business rules; `npm run docs` every endpoint change).
- Mobile: `WAB-Mobile-Customer/CLAUDE.md` (also applies to the merchant app): Clean Architecture + MVI by delegate, no hardcoding, AR+EN resources, all variants build, 300-line files, portrait + landscape; Firebase, payments and maps behind interfaces; payments only through `wab-payments`.
- Admin: `WAB-Admin-Dashboard/CLAUDE.md` + its `.claude/rules.md` (local gate, browser check before every commit, RTL default, server pagination).
- SDKs: `<pkg>/.claude/Rules.md` (ports + adapters, dev on localhost, prod strict, `npm run verify` + loop test, `Integration.md` kept current). No business rules inside packages.
- Environments dev and prod; GitHub Actions only where still enabled (customer app); server/admin gates are local.

## 6. Open decisions (owner; do not invent answers)
Platform domain · payment gateway · DigitalOcean product and managed Redis · error-tracking tool · Atlas tier · package registry (GitHub Packages assumed) · merchant Firebase registrations · store accounts/signing · shared `core/*` between the two KMP apps. Each is a `PENDING` row; `python3 scripts/tasks.py blocked` lists them.
