# WAB-Server Architecture

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js (v26) |
| Framework | Express 5 |
| Database | MongoDB (Mongoose ODM) |
| Auth | JWT + bcryptjs |
| Realtime | Socket.IO 4 |
| Push Notifications | Firebase Cloud Messaging (firebase-admin) |
| Env Config | dotenv (per-environment files) |
| Dev Tooling | nodemon |

## Project Structure

```
WAB-Server/
├── src/
│   ├── config/
│   │   ├── db.js                  # MongoDB connection
│   │   └── cloudinary.js          # Cloudinary config
│   ├── middleware/                # Express middleware
│   │   └── *.middleware.js
│   ├── models/                    # Mongoose schemas/models
│   │   └── *.model.js
│   ├── modules/                   # Per-user-type packages
│   │   ├── customer/              #   customer package
│   │   │   ├── index.js           #     exports module
│   │   │   ├── controllers/       #     request handlers
│   │   │   ├── routes/            #     route definitions (+ index.js aggregator)
│   │   │   ├── services/          #     business logic
│   │   │   └── validators/        #     request validation
│   │   ├── merchant/              #   merchant package (placeholder)
│   │   │   ├── index.js
│   │   │   └── routes/
│   │   ├── admin/                 #   admin package (placeholder)
│   │   │   ├── index.js
│   │   │   └── routes/
│   │   └── shared/                #   cross-module endpoints (e.g. device-token)
│   │       ├── index.js
│   │       ├── controllers/
│   │       ├── routes/
│   │       ├── services/
│   │       └── validators/
│   ├── core/                      # Global infrastructure (module-agnostic)
│   │   ├── realtime/              #   WebSocket layer
│   │   │   ├── index.js           #     exports initRealtime(httpServer)
│   │   │   ├── realtime.service.js#     io singleton + emitToUser/Role/Room/All
│   │   │   └── socketAuth.middleware.js  # JWT auth for socket handshake
│   │   └── notifications/         #   Firebase push layer
│   │       ├── index.js           #     exports initNotifications()
│   │       ├── firebase.config.js #     credential loading + fallback
│   │       └── notification.service.js   # sendToDevice/User/Role/Topic
│   ├── routes/
│   │   └── index.js               # Mounts module routes (/v1/{customer,merchant,admin,notifications})
│   ├── utils/                     # Shared helpers/constants
│   │   └── *.js
│   ├── app.js                     # Express app setup
│   └── server.js                  # Entry point (env + DB + realtime + notifications + listen)
├── config/                        # Local credentials (gitignored)
│   └── firebase-service-account.json  # FCM service account key
├── AGENTS.md                      # Agent rules and roles
├── ARCHITECTURE.md                # Architecture doc
├── session.md                     # Session tracker
├── .env.development               # Dev environment variables
├── .env.production                # Prod environment variables
├── .env.example                   # Template
├── .gitignore
└── package.json
```

## Realtime Infrastructure (`src/core/realtime`)

- **Socket.IO** attached to the same HTTP server in `src/server.js` via `initRealtime(server)`.
- Every socket connection is authenticated with the same JWT used by HTTP (`socketAuth.middleware.js`); unauthorized connections are rejected.
- On connect, the socket auto-joins two rooms:
  - `user:<userId>` — receives events targeted at one user
  - `role:<role>` — receives events targeted at a role (customer/merchant/admin)
- Any module can emit without coupling to Socket.IO internals:

| Method | Target |
|---|---|
| `emitToUser(userId, event, data)` | one user (all their devices) |
| `emitToRole(role, event, data)` | all users of a role |
| `emitToRoom(room, event, data)` | arbitrary room |
| `emitToAll(event, data)` | everyone connected |

Emit helpers no-op safely if realtime is not initialized — modules can call them without init-order concerns. Events/rooms live in `src/utils/constants.js` (`REALTIME_EVENTS`, `REALTIME_ROOMS`).

## Push Notifications (`src/core/notifications`)

- **firebase-admin** initialized in `src/server.js` via `initNotifications()`.
- Credentials: the service-account JSON downloaded from the Firebase Console is placed at `config/firebase-service-account.json` (gitignored). Optional `FIREBASE_SERVICE_ACCOUNT_PATH` env var overrides the path.
- If the file is missing, the server still starts in **fallback mode** — sends are skipped with a warning log instead of crashing.

| Method | Target |
|---|---|
| `sendToDevice({ token, notification, data })` | one device token |
| `sendToUser({ userId, notification, data })` | all active tokens of a user (inactive tokens auto-deactivated on FCM error) |
| `sendToRole({ role, notification, data })` | all active tokens of users with a role |
| `sendToTopic({ topic, notification, data })` | FCM topic |

## Device Tokens

- Stored in the `DeviceToken` model (`user`, `token` unique, `platform`, `isActive`, `lastUsedAt`).
- Registered by any module via the shared endpoint `POST /api/v1/notifications/device-token` (JWT-protected, upserts by token).

## Architecture Pattern: Modular Layered (Clean Architecture)

```
Client Request
    │
    ▼
  Routes (index.js)  →  mount /v1/{customer|merchant|admin} → module routes
    │
    ▼
  Middleware          →  auth, validation, error handling
    │
    ▼
  Controllers         →  parse request, call service, send response
    │
    ▼
  Services            →  business logic, orchestration
    │
    ▼
  Models              →  Mongoose schemas, DB interaction
```

## Module Packages

Each user type (customer, merchant, admin) lives in its own package under `src/modules/<type>/`, keeping its controllers, routes, services, and validators together. A module exposes its routes via `index.js`, and `src/routes/index.js` mounts each package under its API prefix:

| Prefix | Module |
|---|---|
| `/api/v1/customer` | `src/modules/customer` |
| `/api/v1/merchant` | `src/modules/merchant` |
| `/api/v1/admin` | `src/modules/admin` |
| `/api/v1/notifications` | `src/modules/shared` |

Shared middleware, models, utils, and config stay at the `src/` root level.

## Data Flow Rules

- **Controllers** never contain business logic — they parse the request, call a service, and send the response.
- **Services** contain all business logic — they are testable in isolation.
- **Models** define schemas, indexes, and instance methods only.
- **Validators** validate input before it reaches controllers.
- **No hardcoding** — all configurable values come from env vars, constants, or DB.

## Database — MongoDB

- **Connection:** Via Mongoose in `src/config/db.js`
- **Per-environment databases:**
  - Development → `wab-dev`
  - Production → `wab-prod`
- **Relations:** TBD — will be documented once business entities are defined.

## Environment Variables

| Variable | Description |
|---|---|
| `PORT` | Server port (default: 5000) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | JWT signing secret |
| `JWT_EXPIRES_IN` | Token expiry duration |
| `NODE_ENV` | `development` or `production` |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | (optional) Path to FCM service-account JSON; defaults to `config/firebase-service-account.json` |

---

*Business entities and DB relations to be added when business requirements are provided.*
