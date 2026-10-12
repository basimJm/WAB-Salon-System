# WAB — End-to-End Delivery Roadmap (parallel tracks)

> **Purpose:** split the whole system into phases and tasks per track so several Claude Code sessions can work **in parallel**, each on its own track, and integrate **last**.
> **Read with:** `BUSINESS_DOMAIN.md` (schemas + business rules — mandatory for SERVER and INT tasks), `CLAUDE.md` (business + integration), `INTEGRATION_WORKFLOW.md` (contracts, mocks, environments), each project's `docs/` (PRD = source of truth).
> **Rules:** every task follows `.claude/rules.md` + `.claude/hooks.md` (branch per task, unit tests, no hardcoding, 3 verification loops, 4-role review, PR).

---

## 1. Tracks

| Track | Folder | Starts with | Depends on (at integration time) |
|---|---|---|---|
| **SERVICE** | `wab-payments`, `wab-otp`, `wab-notifications`, `wab-analytics`, `wab-storage` | Nothing — fully independent | — |
| **SERVER** | `WAB-Server` | Contracts (P0) | SERVICE packages (uses in-repo stubs until published) |
| **CUSTOMER** | `WAB-Mobile-Customer` | Contracts (P0) + existing KMP template | SERVER APIs, `wab-payments` KMP |
| **MERCHANT** | `WAB-Mobile-Salon` | Contracts (P0) + customer KMP template | SERVER APIs |
| **ADMIN** | `WAB-Admin-Dashboard` | Contracts (P0) | SERVER APIs |

Task IDs: `SVC-*`, `SRV-*`, `CUS-*`, `MER-*`, `ADM-*`, `INT-*`. One task = one branch = one PR.

---

## 2. Working Without Dependencies (mandatory)

When a task needs something from another track that is **not ready**:
1. **Never wait.** Build against the **contract** (`contracts/` — see `INTEGRATION_WORKFLOW.md` §2): the OpenAPI spec, socket event schemas, push payloads and fixtures describe the *potential response*.
2. Put the dependency **behind an interface** (repository / client / provider) and ship a **mock implementation** that returns contract fixtures, including error, empty, slow and edge-case responses.
3. Select real vs mock only through **configuration** (`DATA_SOURCE=mock|remote` per environment) — never by editing code.
4. Write unit tests against the interface so swapping the mock for the real implementation does not change tests.
5. Record what is mocked in the task's `session.md` block (`Mocked: ...`) and add an `INT-*` follow-up if missing.
6. If the contract lacks something you need, **propose a contract change** in a `contracts/` PR first (small, reviewed), then continue with the mock.

---

## 3. Phases

```
P0 Foundations & Contracts ─▶ P1 Core Domain ─▶ P2 Booking Engine ─▶ P3 Money & Messaging ─▶ P4 Operations & Insights ─▶ P5 Integration ─▶ P6 Hardening & Release
   (all tracks in parallel within each phase; tracks never block each other before P5)
```

### P0 — Foundations & Contracts
| ID | Track | Task | Output | If dependency not ready |
|---|---|---|---|---|
| INT-01 | All | **Contracts v1**: OpenAPI for `/customer/v1`, `/merchant/v1`, `/admin/v1` (auth, catalog, salons, search, availability, bookings, reviews, notifications, uploads, config), error format, pagination, socket events, FCM payloads, fixtures | `contracts/` | — (first task; derive from PRDs) |
| SRV-01 | SERVER | TypeScript + Express skeleton, Clean Architecture modules, config/env loader (dev/prod), logger, error format, health check, Swagger from code, Postman collection, lint/format/test setup, Docker, GitHub Actions CI | `WAB-Server/` | — |
| SRV-02 | SERVER | MongoDB (Mongoose) + Redis connections, base repository, migrations/seed scripts (countries, cities/areas, catalog, settings) | DB layer | Local Docker Mongo/Redis |
| SVC-01 | SERVICE | Package template (TS strict, tests, build, semantic release, README) applied to all 5 packages | 5 package skeletons | — |
| CUS-01 | CUSTOMER | Align template to PRD: env flavors (dev/prod), `DATA_SOURCE` switch, network layer with contract models, mock repositories from `contracts/fixtures`, design system tokens (theme, RTL, AR/EN) | App foundation | Mocks |
| MER-01 | MERCHANT | Create KMP project from the customer template, env flavors, `DATA_SOURCE` switch, design system, permission-driven navigation shell | App foundation | Mocks |
| ADM-01 | ADMIN | React app skeleton (RTL/LTR, theme from design, routing, auth shell, API client generated from contracts, mock API layer, table/chart components), env (dev/prod), CI | Panel foundation | Mock API |

### P1 — Core Domain
| ID | Track | Task | If not ready |
|---|---|---|---|
| SVC-02 | SERVICE | `wab-otp`: Firebase ID-token verification, limits/blocks (Redis), `otpLength` config | Firebase emulator / fake verifier |
| SVC-03 | SERVICE | `wab-storage`: presigned upload, confirm, signed URLs, CDN URLs, variants hook | S3 mock (local MinIO) |
| SRV-03 | SERVER | Auth for 3 scopes: OTP pre-check, Firebase token login/register, JWT + rotating refresh, admin email+password+2FA, blocking, account deletion grace | In-repo `OtpProvider` stub until `wab-otp` published |
| SRV-04 | SERVER | Config & reference data APIs (app config, countries, cities/areas, legal/FAQ/contact, version policy, maintenance) | — |
| SRV-05 | SERVER | Catalog, salon application & lifecycle, salon profile, gallery, hours & closures, members/roles/permissions, staff profiles, policies, completeness | Storage stub until `wab-storage` |
| CUS-02 | CUSTOMER | Onboarding, nickname/gender, auth (Login/Register/OTP with Firebase), profile & settings (S01–S02, S11–S13, S21–S23) | Mock auth repo |
| MER-02 | MERCHANT | Login/OTP, salon registration + documents, application status, setup checklist, profile/gallery/hours/services/team/permissions/policies (M02–M06, M12–M19) | Mock repos |
| ADM-02 | ADMIN | Login + 2FA, customers, salons, applications queue + document viewer, catalog, content, settings, audit log (A00, A12–A14, A23–A24, A28–A29) | Mock API |

### P2 — Booking Engine & Discovery
| ID | Track | Task | If not ready |
|---|---|---|---|
| SRV-06 | SERVER | Home aggregate, search (Atlas Search) + filters + nearest (2dsphere), salon details, reviews (pending/approval), favorites | Text-index fallback in dev |
| SRV-07 | SERVER | Availability engine (15-min slots, 90 days, staff eligibility, closures, leaves), booking creation with companions/bride, Redis locks, state machine + history, cancellation/refund rules, policy & price snapshots | — |
| SRV-08 | SERVER | Socket.IO (Redis adapter): rooms per user/salon/admin, permission-filtered booking events, unread counts | — |
| CUS-03 | CUSTOMER | Home, All Salons + filter, All Services, Salon Details, reviews, gallery, favorites (S03–S10, S20) | Mocks |
| CUS-04 | CUSTOMER | Booking flow, success, bookings list/details, cancel, rating (S14–S18) with real-time hooks | Mock socket emitter |
| MER-03 | MERCHANT | Dashboard, bookings list/details/actions, real-time request sheet + Android overlay + iOS actionable notification, calendar (M07–M11) | Mock socket + local fake push |
| ADM-03 | ADMIN | Bookings list/details + admin action modals, reviews moderation (A15, A22) | Mock API |

### P3 — Money & Messaging
| ID | Track | Task | If not ready |
|---|---|---|---|
| SVC-04 | SERVICE | `wab-payments` server: session, verify, webhook verification, refunds, idempotency; provider = sandbox/fake until gateway chosen | Fake provider |
| SVC-05 | SERVICE | `wab-payments` KMP: payment UI interface + fake provider (real SDK when gateway chosen) | Fake provider |
| SVC-06 | SERVICE | `wab-notifications`: FCM (single/multicast/topic, high-priority, time-sensitive, actions), email (Nodemailer + Gmail SMTP), templates, invalid-token cleanup | FCM dry-run / SMTP sink |
| SRV-09 | SERVER | Payments flow (deposit/full, attempts log, verify, refunds), payouts ledger & manual payouts, subscriptions (manual) | Payments stub |
| SRV-10 | SERVER | Notifications service + BullMQ jobs (reminders 1h/15m, pending alert 30m, auto-cancel +1h, subscription/trial, deletion grace, recommended expiry) | Notifications stub |
| CUS-05 | CUSTOMER | Payment step via `wab-payments` KMP, push handling (FCM), notifications screen (S16 step 6, S19) | Fake payment provider |
| MER-04 | MERCHANT | Finance, subscription, notifications, more/settings (M22–M25) | Mocks |
| ADM-04 | ADMIN | Finance: transactions, refunds, payouts, subscriptions, recommended, reconciliation; push composer (A16–A21, A25) | Mock API |

### P4 — Operations & Insights
| ID | Track | Task | If not ready |
|---|---|---|---|
| SVC-07 | SERVICE | `wab-analytics`: server event tracking, identity linking, BigQuery + Mongo queries (overview, funnels, cohorts, journeys, search, payments, errors, merchants), aggregates, cost guards | BigQuery fixtures dataset |
| SRV-11 | SERVER | Admin analytics APIs, reports (daily/weekly/monthly) + async Excel/PDF export, alerts engine + email | Analytics stub |
| CUS-06 | CUSTOMER | Analytics events (Firebase) for every screen/action, Crashlytics, identity linking call | — |
| MER-05 | MERCHANT | Statistics, reviews, analytics events, Crashlytics (M20–M21) | Mocks |
| ADM-05 | ADMIN | Live overview, analytics pages, user journey, reports, alerts (A01–A11, A26–A27) | Mock API |

### P5 — Integration (last)
| ID | Track | Task |
|---|---|---|
| INT-02 | SERVICE→SERVER | Publish packages (dev tags), replace server stubs with real packages |
| INT-03 | SERVER↔CUSTOMER | Switch customer to `DATA_SOURCE=remote` on dev; run contract tests; fix gaps |
| INT-04 | SERVER↔MERCHANT | Same for merchant incl. sockets, FCM high-priority, permissions |
| INT-05 | SERVER↔ADMIN | Same for admin incl. sockets, exports, alerts |
| INT-06 | ALL | End-to-end scenarios on dev: guest→register→book (bride + companions)→merchant accept→reminders→complete→rate; reject/auto-cancel refunds; admin interventions |
| INT-07 | ALL | Firebase (Auth, FCM, Analytics→BigQuery), S3/CDN, payment sandbox wired on dev |

### P6 — Hardening & Release
| ID | Track | Task |
|---|---|---|
| REL-01 | ALL | Security review (rules list in Backend BRD), load test on booking/availability, accessibility, RTL QA |
| REL-02 | ALL | Prod environment provisioning, secrets, monitoring/alerts, backups |
| REL-03 | ALL | Store submissions (customer + merchant), admin prod deploy, go-live checklist |

---

## 4. Parallel Session Plan (suggested)

| Session | Runs | Order |
|---|---|---|
| A | INT-01 (contracts) | First — small, unblocks everyone |
| B | SERVER | SRV-01 → SRV-11 |
| C | SERVICE | SVC-01 → SVC-07 |
| D | CUSTOMER | CUS-01 → CUS-06 |
| E | MERCHANT | MER-01 → MER-05 |
| F | ADMIN | ADM-01 → ADM-05 |
| G (later) | Integration | INT-02 → INT-07, then REL-* |

Each session: pick the next task of its track, update its block in `.claude/session.md`, open a PR. Contract changes always go through a separate small `contracts/` PR so all tracks see them.

---

## 5. Status Board

Track progress in `.claude/session.md` (one block per task). Update this table when a phase completes.

| Phase | SERVICE | SERVER | CUSTOMER | MERCHANT | ADMIN | INT |
|---|---|---|---|---|---|---|
| P0 | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| P1 | ☐ | ☐ | ☐ | ☐ | ☐ | — |
| P2 | — | ☐ | ☐ | ☐ | ☐ | — |
| P3 | ☐ | ☐ | ☐ | ☐ | ☐ | — |
| P4 | ☐ | ☐ | ☐ | ☐ | ☐ | — |
| P5 | — | — | — | — | — | ☐ |
| P6 | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
