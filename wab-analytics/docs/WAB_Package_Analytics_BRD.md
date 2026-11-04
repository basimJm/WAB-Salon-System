# WAB — Business Requirements Document (BRD)
## Package: `wab-analytics`

| Field | Value |
|---|---|
| Document | BRD — `wab-analytics` package |
| Version | 1.1 (status: built, not used) |
| Date | 2026-11-04 |
| Repository | Monorepo folder `wab-analytics/` |
| Deliverable | **Node.js package (TypeScript, npm)** — server only |
| Consumers | None today (WAB-Server does not use it); future projects |
| Related | Backend BRD, Admin BRD & PRD (A01–A11, A26, A27), Customer/Merchant PRDs (§14). Root `BUSINESS_DOMAIN.md` holds the rules; this package holds none of the business rules |
| Status | **Built, not used** (see below) |

---

## 1. Executive Summary
**Status (2026-11-04): built but not used.** WAB-Server does not depend on this package: it records its own events in MongoDB (`serverEvents`) and has no analytics provider. BigQuery was dropped by the owner on 2026-10-19 (SRV-110, SRV-127 and ADM-074…077 stay PENDING as dropped). The apps send screens and actions to Firebase Analytics and crashes to Crashlytics. The code and this document are kept for a later decision. The requirements below describe the package as built.

`wab-analytics` gives a backend one **interface** to (1) record **server-side events** and (2) **query analytics** for the admin panel. Data sources:
- **App events** — tracked by **Firebase Analytics** in the customer and merchant apps, exported by Firebase to **BigQuery** and kept **forever**.
- **Crashes** — **Firebase Crashlytics**, exported to BigQuery.
- **Server events** — produced by the backend (OTP, payments, refunds, jobs, API errors, admin actions), stored in **MongoDB**.

The package turns these sources into admin features: live overview, funnels, cohorts, search analytics, payment attempts, errors, merchant analytics, **per-user journeys** (including guest history linked after registration), and daily/weekly/monthly reports.

---

## 2. Business Context
The package was built for **complete visibility**: every screen any user visits, every action, every payment attempt, every error and every customer/merchant journey — retained permanently and exportable. WAB's admin today reads the server's own MongoDB events instead (Backend BRD BE-61).

---

## 3. Goals
| ID | Goal |
|---|---|
| AG-1 | Provide all analytics needed by the admin panel through one interface. |
| AG-2 | Show any user's full journey across devices, including pre-registration guest activity. |
| AG-3 | Keep query costs and latency under control as data grows forever. |
| AG-4 | Allow changing the analytics backend (e.g., another warehouse) without changing admin APIs. |

---

## 4. Scope

### 4.1 In Scope
**Recording (server events):**
- `track(event)` for server events with a common schema (name, timestamp, actor type/ID, salonId, bookingId, params) written to MongoDB (time-series collection).
- Built-in event families: OTP, payment attempts (with gateway codes), refunds, booking status changes, jobs (reminders, auto-cancel), API errors/latency, push results, admin actions (audit is separate but linked).

**Identity:**
- Maintain the link **installation (Firebase app instance ID) ↔ user/member ID**, sent by the apps at login/registration; journeys merge all linked installations, including guest events.

**Querying (for admin APIs):**
- Live overview metrics (active users now, today's KPIs).
- Traffic & users (installs, DAU/WAU/MAU, sessions, breakdowns).
- Screens & events explorer (counts, unique users, breakdowns by parameter, raw events with pagination).
- **Funnels** (predefined: activation, registration, booking, approval, merchant onboarding; plus custom ordered steps with time window), with drop-off user lists.
- **Cohorts/retention** (customers and merchants).
- Search & discovery (top queries, **zero-result queries**, filter usage, banner CTR, location permission rates).
- Bookings, payments (every attempt), errors (API, client, crashes, OTP, push) and merchant analytics.
- **User journey timeline** (sessions, screens, events, errors, payments) across BigQuery + MongoDB.
- **Reports** data for daily, weekly, monthly reports (export handled by backend).
- Alert evaluations support (e.g., payment failure spike, 5xx rate, crash spike) via query functions.

**Performance & cost:**
- Use partitioned BigQuery tables and **scheduled aggregation tables** for dashboards.
- Cache common query results (Redis, injected).
- Query cost guards (max bytes billed, date-range limits for raw queries).

### 4.2 Out of Scope
- Client-side event tracking (apps use Firebase SDK directly behind their own interfaces).
- Rendering charts or exporting files (admin panel/backend).
- Alert delivery (backend + `wab-notifications`).

---

## 5. Business Requirements
| ID | Requirement | Priority |
|---|---|---|
| ANA-01 | Stable interface: `track`, `linkIdentity`, and typed query functions per analytics area. | M |
| ANA-02 | Server events stored with a common schema and retained permanently. | M |
| ANA-03 | Read Firebase Analytics and Crashlytics exports from BigQuery (retained permanently). | M |
| ANA-04 | Identity linking: installation ↔ user/member; journeys include guest history after registration. | M |
| ANA-05 | User journey timeline merging app events, server events and crashes, ordered by time, grouped by session, paginated. | M |
| ANA-06 | Predefined funnels with conversion, drop-off and median time between steps; drop-off user lists. | M |
| ANA-07 | Custom funnel queries (ordered events + time window). | S |
| ANA-08 | Cohort/retention queries for customers and merchants. | M |
| ANA-09 | Search analytics including zero-result queries. | M |
| ANA-10 | Payment attempt analytics with gateway response codes/messages. | M |
| ANA-11 | Error analytics: API errors by endpoint/status/latency, crash-free users, OTP and push failures. | M |
| ANA-12 | All queries filterable by date range, app, platform, app version, user type, gender scope, city, business. | M |
| ANA-13 | Report datasets for daily/weekly/monthly reports. | M |
| ANA-14 | Scheduled aggregations and caching so common dashboards load fast. | M |
| ANA-15 | Cost guards on BigQuery queries. | M |
| ANA-16 | Provide the event naming/parameter contract (shared with app teams) in the README. | M |

---

## 6. Non-Functional Requirements
| ID | Area | Requirement |
|---|---|---|
| ANF-01 | Performance | Dashboard queries (≤30 days) return in ≤2 s using aggregates/cache. |
| ANF-02 | Cost | Raw-event queries limited by date range and max bytes billed. |
| ANF-03 | Privacy | No sensitive personal data in event params (IDs only); access only through admin APIs. |
| ANF-04 | Retention | Permanent retention in BigQuery and MongoDB; archival strategy documented. |
| ANF-05 | Quality | TypeScript strict; tests with fixture datasets; SQL queries versioned. |
| ANF-06 | Versioning | Semantic versioning; private npm registry; changelog. |

---

## 7. Success Metrics
- Admin can open any user's complete journey in ≤3 s.
- Dashboards load in ≤2 s for common ranges.
- Monthly BigQuery cost within budget (if a project adopts the warehouse).
- No gaps between app events and server events in journeys.

---

## 8. Risks & Mitigations
| Risk | Mitigation |
|---|---|
| BigQuery cost growth (data kept forever) | Partitioning, aggregates, caching, cost guards |
| Firebase export delay (daily vs streaming) | Enable streaming export for live views; label data freshness |
| Event naming drift between apps | Shared event contract + validation in CI for apps |
| Identity link missing (app didn't send instance ID) | Fallback by user ID set in Firebase; monitoring of unlinked installs |

---

## 9. Open Items
| # | Item |
|---|---|
| 1 | Whether WAB ever adopts this package. BigQuery export setup is dropped by the owner (2026-10-19) |
| 2 | BigQuery monthly budget: not applicable while BigQuery is dropped |
| 3 | Final event list per app (from PRDs §14) |
