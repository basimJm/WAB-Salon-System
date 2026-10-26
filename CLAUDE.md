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
**WAB** is a two-sided marketplace in **Jordan** connecting customers with **men's and women's salons**. Customers (mobile app) discover salons by gender, view profiles (hours, staff, services, reviews, gallery) and **book** for themselves + up to **5 companions**; women's salons support **bride bookings**. Salons (merchant app) register with a license, get approved by admin, complete their profile, manage services (from an admin catalog), staff, schedules and policies, and **accept/reject booking requests in real time**. Admin (web panel) has full visibility and control. Free for customers; salons pay a monthly subscription (3 months free, paid outside the app) and can buy "Recommended" placement. **Money, Phase 1:** the platform collects online payments (deposit % or full) through one gateway, refunds automatically, pays salons manually; Phase 2 = sub-merchants/split payments (design so it is an extension). Arabic default (RTL) + English; **JOD only**, tax-inclusive, integer fils; store UTC, compute in **Asia/Amman**, display 12-hour.

## 2. Repository map (details, branches and backlogs: `INTEGRATION.md` §1)
| Path | Project | Status (2026-10-18) |
|---|---|---|
| `WAB-Server/` | Backend API (Node + Express + Mongoose + Redis + Socket.IO + BullMQ, TypeScript strict) | Stages A–M done (134 tasks); Stage N/O = admin + merchant gaps; deployment/SDK swaps owner-pending |
| `WAB-Admin-Dashboard/` | Admin web panel (React 19 + TS + Vite) | ADM-001…081 done; remaining rows blocked on server gaps / owner |
| `WAB-Mobile-Customer/` | Customer app (KMP + Compose Multiplatform) | Foundation done; features start at CUS-004 |
| `WAB-Mobile-Salon/` | Merchant app (same stack, scaffolded from the customer template) | Backlog only; MER-001 scaffold |
| `wab-notifications/` | SDK: FCM push + SMTP email | Built, wired in the server |
| `wab-payments/`, `wab-otp/`, `wab-analytics/`, `wab-storage/` | SDKs (ports + adapters; `wab-payments` also KMP) | Backlogs only |
| `.claude/tools/KMP_TEMPLATE/` | Tool: `KMP_TEMPLATE` creates a new KMP app with the customer app's setup (README inside) | Ready |

Each project: `docs/` (PRD = behaviour source of truth, BRD, Design Script, `*_Tasks.md` backlog), `design/` (apps: `*.dc.html` visual reference), `.claude/` (session, memory, Integration). Precedence: **PRD > BRD > Design Script > design files**; conflicts → stop and ask. `BUSINESS_DOMAIN.md` = the single source for schemas, enums, rules, state machine, permissions, jobs, settings and error codes (mandatory for server, contract and cross-project work).

## 3. Integration essentials (full map and live board: `INTEGRATION.md`)
- REST + JSON, three namespaces with separate token scopes: `/customer/v1`, `/merchant/v1`, `/admin/v1`; `Accept-Language: ar|en` on every request; envelope `{success,message,data,meta?}` / `{success:false,message,error:{code,details?,traceId}}`; clients branch on `code`. **Contract = the generated `WAB-Server/docs/api/openapi.*.json`** (+ Postman); clients regenerate DTOs from it.
- Auth: customers/members phone + WhatsApp OTP (server generates and sends the code over the WhatsApp Cloud API; `otp/request` gives `otpLength` = 6 today, `resendAfterSeconds` = 60, `expiresInSeconds`; `otp/verify` returns a single-use `otpToken`; login/register/change phone/booking/bank details take it; backend issues JWT access + rotating refresh). Limits 5 requests / 5 min and 5 wrong codes → 15 min block. Admin: email + password + email OTP. Merchant permissions: owner has all; 15 grantable keys enforced on every endpoint, socket event and notification; hidden-not-disabled in UI.
- Real-time: Socket.IO (Redis adapter), rooms per user / salon (permission-filtered) / admin; new booking request = socket event + FCM high-priority data message to members with `BOOKINGS_RESPOND`, de-duplicated by booking id. Clients also refresh on FCM message and foreground.
- Push: FCM, one Firebase project per environment, 4 app registrations. Admin email alerts via Gmail SMTP. Jobs: reminders 1 h / 15 min, pending alert 30 min, **auto-cancel 1 h after start if still pending (full refund)**, subscription/trial checks, placement expiry, deletion after 30-day grace, alerts, reports.
- Files: presigned upload → device compression → direct S3 upload → confirm → CDN URL; private files via short-lived signed URLs. Analytics: apps track every screen/action in Firebase (→ BigQuery); server events in MongoDB; apps never send analytics to the backend.

## 4. Core business rules (enforced on the server)
1. One gender per salon; companions match it; max 5 companions. 2. Salon visible only if approved + profile complete + not Offline. 3. Slots every 15 min, up to 90 days; duration = sum of services. 4. Staff eligible only if on duty, not on leave, skilled in **all** selected services, bride-qualified for brides, free for the full duration. 5. **No double booking** (Redis locks + atomic re-validation); PENDING holds the slot. 6. PENDING → APPROVED / REJECTED → COMPLETED / NO_SHOW; cancellations by customer, salon, auto; full status history. 7. Salon reject/cancel and auto-cancel → full refund; customer cancel follows the snapshotted policy. 8. Only salon or admin marks Completed/No-show, at/after start. 9. Prices and policies snapshotted; no rescheduling, no partial cancellation. 10. A failed payment never creates a booking; idempotency keys + server verification. 11. Reviews published only after admin approval. 12. Admin actions always carry a reason, audit log and notification.

## 5. Engineering conventions
- Never commit secrets (`.env*` except `.env.example`, keystores, service-account JSON, xcconfig secrets); never edit `.env*` without permission.
- Backend: `WAB-Server/CLAUDE.md` (layers route → middleware → controller → service → repository → schema; customer/merchant/admin modules; AR+EN locales; constants, no magic numbers; tests for business rules; `npm run docs` every endpoint change).
- Mobile: `WAB-Mobile-Customer/CLAUDE.md` (also applies to the merchant app): Clean Architecture + MVI by delegate, no hardcoding, AR+EN resources, all variants build, 300-line files, portrait + landscape; Firebase, payments and maps behind interfaces; payments only through `wab-payments`.
- Admin: `WAB-Admin-Dashboard/CLAUDE.md` + its `.claude/rules.md` (local gate, browser check before every commit, RTL default, server pagination).
- SDKs: `<pkg>/.claude/Rules.md` (ports + adapters, dev on localhost, prod strict, `npm run verify` + loop test, `Integration.md` kept current). No business rules inside packages.
- Environments dev and prod; GitHub Actions only where still enabled (customer app); server/admin gates are local.

## 6. Open decisions (owner; do not invent answers)
Platform domain · payment gateway · DigitalOcean product and managed Redis · error-tracking tool · Atlas tier · package registry (GitHub Packages assumed) · merchant Firebase registrations · store accounts/signing · shared `core/*` between the two KMP apps. Each is a `PENDING` row; `python3 scripts/tasks.py blocked` lists them.
