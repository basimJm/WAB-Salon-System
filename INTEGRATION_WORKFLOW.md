# WAB — Shared Integration Workflow & Environments

> How the five tracks (SERVICE, SERVER, CUSTOMER, MERCHANT, ADMIN) stay independent while building, then integrate safely. Applies to every project. Phases/tasks: `ROADMAP.md`.

---

## 1. Principles
1. **Contract first, integration last.** All tracks code against the shared contract in `contracts/`; real wiring happens in Phase P5.
2. **Interfaces everywhere.** Every cross-project dependency (API, socket, push, payment, OTP, storage, analytics) sits behind an interface with a **real** and a **mock** implementation.
3. **Configuration, not code, decides.** Data source, base URLs, keys and feature flags come from environment config. No hardcoded values (`.claude/rules.md`).
4. **One source of truth per concern:** behavior = PRD; wire format = `contracts/`; business rules = server.

---

## 2. Shared Contracts (`contracts/` at repo root)

```
contracts/
├── openapi/
│   ├── customer.v1.yaml      # /customer/v1
│   ├── merchant.v1.yaml      # /merchant/v1
│   ├── admin.v1.yaml         # /admin/v1
│   └── common.yaml           # error format, pagination, shared schemas (enums, money, time)
├── events/
│   ├── socket.v1.md          # rooms, event names, payload schemas, permission filters
│   └── push.v1.md            # FCM data/notification payloads per trigger, deep-link targets
├── fixtures/                 # example responses: success, empty, error, edge cases (AR/EN)
│   ├── customer/  merchant/  admin/  events/
└── CHANGELOG.md              # every contract change, with date and affected tracks
```

**Rules**
- Version in the path (`/v1`). Additive changes only within a version; breaking changes → `/v2` or a deprecation window.
- Every change: small PR touching only `contracts/` + `CHANGELOG.md`, reviewed with the Solution Architect checklist (`.claude/hooks.md`).
- Server generates its Swagger from code and **must match** the contract (contract test in CI).
- Clients generate models/clients from the OpenAPI where tooling allows (admin: TypeScript client; mobile: Kotlin models), otherwise hand-written models validated by fixture-parsing tests.
- Common conventions: JSON camelCase; ISO-8601 UTC timestamps; money as decimal string JOD (3 decimals); IDs as strings; `Accept-Language: ar|en`; pagination `{ items, page, pageSize, total }`; error `{ code, message, details?, traceId }`.

---

## 3. Mocks While Dependencies Are Not Ready

| Consumer | Dependency | Mock strategy |
|---|---|---|
| Customer / Merchant (KMP) | Server REST | `FakeRemoteDataSource` reading `contracts/fixtures` (bundled for debug/dev builds only), simulated latency and errors |
| Customer / Merchant | Socket.IO | `FakeRealtimeClient` emitting fixture events on a timer / on user actions |
| Customer / Merchant | FCM | Local notification triggered from fixture push payloads in dev menu |
| Customer | Payments | `wab-payments` fake provider (success / fail / cancel selectable) |
| Admin (React) | Server REST/Socket | Mock Service Worker (MSW) handlers built from fixtures; fake socket emitter |
| Server | `wab-*` packages | In-repo stub implementing the same interface until the package is published |
| Server | Firebase / S3 / SMTP / gateway | Emulators or fakes in dev (Firebase emulator, MinIO, SMTP sink, fake gateway) |
| Packages | External providers | Unit tests with provider mocks; sandbox credentials in dev only |

Each mock covers: success, empty, validation error, auth error (401/403), not found, conflict (e.g., slot taken), server error, timeout, and Arabic + English content.

---

## 4. Environments

Only two environments: **dev** and **prod**. Plus a local developer profile that uses mocks.

| Setting | local (developer) | dev | prod |
|---|---|---|---|
| Purpose | Build features offline | Integration & QA | Customers |
| `DATA_SOURCE` (apps/admin) | `mock` | `remote` (mock allowed via debug toggle) | `remote` only (mock code excluded from release builds) |
| API base URL | — / local server | dev API (from config) | prod API (from config) |
| MongoDB | Docker | Atlas dev cluster | Atlas prod cluster |
| Redis | Docker | managed/dev instance | managed/prod instance |
| Firebase | emulator or dev project | dev project | prod project |
| Storage | MinIO | S3 dev bucket + CDN | S3 prod bucket + CDN |
| Payments | fake provider | gateway sandbox | gateway live |
| Email | SMTP sink | Gmail SMTP (dev sender) | Gmail SMTP (prod sender) |
| Logs / analytics | console | dev dashboards | prod dashboards |

**Per project**
- **Server:** `.env.example` (committed, keys only) → real `.env.development` / `.env.production` never committed; secrets via GitHub Actions secrets and the host's env.
- **Mobile (KMP):** build flavors / configurations `dev` and `prod` (Android `productFlavors`, iOS configurations/xcconfig) with separate app IDs (`.dev` suffix), Firebase config per flavor, base URL per flavor.
- **Admin:** `.env.development` / `.env.production` (public, non-secret values only), build per environment.
- **Packages:** no environments; configuration injected by the consumer. Published versions: `x.y.z-dev.N` (prerelease) and `x.y.z` (stable).

---

## 5. Branching, CI/CD & Promotion

```
feature branch ──PR──▶ main ──auto deploy──▶ dev ──release tag (vX.Y.Z) + approval──▶ prod
```

- Every task: branch from updated `main` → PR → CI green + 4-role review → merge (squash).
- **CI per project (path-filtered GitHub Actions):** lint, typecheck/compile, unit tests, contract tests (server vs `contracts/`, clients parse fixtures), build. Secret scan on every PR.
- **Dev:** merging to `main` deploys server/admin to dev and produces dev mobile builds (internal testing).
- **Prod:** a release tag on `main` + manual approval deploys server/admin to prod and produces store builds.
- Mobile store releases and server deploys are coordinated: server stays **backward compatible** with the previous app version (force-update policy only when unavoidable).

---

## 6. Integration Sequence (Phase P5)

1. Publish `wab-*` packages (`-dev` tags) → server replaces stubs → server CI + contract tests green on dev.
2. Seed dev data (catalog, cities/areas, demo salons, staff, policies).
3. Switch **admin** to `remote` on dev (approve demo salons, catalog) → fix gaps.
4. Switch **merchant** to `remote` on dev (setup checklist, live salon, real-time requests) → fix gaps.
5. Switch **customer** to `remote` on dev (discover → book → pay sandbox) → fix gaps.
6. Run end-to-end scenarios (`ROADMAP.md` INT-06) with all three clients against dev.
7. Every gap found = a contract or implementation fix PR in the owning track; update `contracts/CHANGELOG.md`.
8. Promote to prod only after the go-live checklist (`ROADMAP.md` P6).

---

## 7. Definition of "Integration Ready" (per track)
- Implements the current contract version; contract tests pass.
- Mock and real implementations both behind the same interface; switch is config-only.
- Handles every error code in `common.yaml` with user-facing localized messages.
- Real-time and push payloads parsed with fixture tests.
- No hardcoded URLs/keys; dev and prod configs present; secrets not in git.
