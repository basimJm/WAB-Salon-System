# WAB-Server

Backend API for the WAB customer app, merchant app and admin panel. Rules: [`CLAUDE.md`](CLAUDE.md). Task list: [`docs/WAB_Server_Tasks.md`](docs/WAB_Server_Tasks.md).

## Scripts

| Command                                       | What it does                                                                                                                           |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck` / `lint` / `format:check` | Static checks                                                                                                                          |
| `npm test`                                    | Unit and integration tests (no external services needed)                                                                               |
| `npm run build`                               | Compile to `dist/`                                                                                                                     |
| `npm start`                                   | Run the built server (`dist/server.js`)                                                                                                |
| `npm run docs`                                | Regenerate Swagger (`docs/api/openapi.*.json`) and Postman (`docs/api/postman/`) files. Required after every task, see `CLAUDE.md` §11 |

## Local environment

```bash
cp .env.example .env.development      # fill in the application settings
cp docker/compose.env.example .env    # fill in the values docker compose needs
docker compose up -d                  # MongoDB (replica set), Redis, MinIO, Mailpit
npm run build && npm start            # API on the PORT from .env.development
```

- Run the API in a container too: `docker compose --profile app up --build`.
- MongoDB runs as a single-node replica set because bookings use transactions. From the host, connect with `mongodb://127.0.0.1:<MONGO_PORT>/wab?directConnection=true`.
- Mailpit shows captured emails at `http://127.0.0.1:<MAILPIT_UI_PORT>`; MinIO's console is on `MINIO_CONSOLE_PORT`.
- Swagger UI is at `/docs` when `NODE_ENV` is not `production`.
- `.env*` files are never committed.

## External providers

OTP, file storage, push/email, payments and analytics sit behind interfaces in `src/providers`. `STORAGE_PROVIDER` and `NOTIFIER_PROVIDER` choose `fake` (in-repo stand-in, the default outside production) or `real` (the `wab-*` SDKs); production must set them to `real`. `OTP_PROVIDER` is `whatsapp` (production) or `fake`. Payments are paused: `PAYMENT_PROVIDER` is `fake` (dev/test) or `disabled` (production; every gateway call answers 503). Server analytics run on the server's own MongoDB events; there is no analytics provider.

### Phone OTP (WhatsApp through ARQAM OTP, BUSINESS_DOMAIN §3.1a)

The server generates the code, hands it to ARQAM OTP (`@wab/otp` ARQAM channel), which delivers it over WhatsApp with the Arabic or English authentication template of the request language; the server checks it at `POST /{customer,merchant}/v1/auth/otp/verify` and answers a signed single-use `otpToken`; login, register, change phone, booking confirmation and bank details take that `otpToken`.

| Variable                                 | Meaning                                                                                                        |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `OTP_PROVIDER`                           | `arqam` (required in production) or `fake` (dev/test: codes are recorded, not sent); `whatsapp`/`real` refused |
| `ARQAM_API_KEY`                          | ARQAM project API key (secret; TEST key on hosted dev, LIVE key in production; arqam only)                     |
| `ARQAM_TEMPLATE_AR`, `ARQAM_TEMPLATE_EN` | Arabic / English authentication template names exactly as ARQAM shows them (arqam only)                        |
| `ARQAM_SENDER_ID`                        | Optional: approved sender id, only when ARQAM answers `SENDER_REQUIRED`                                        |
| `ARQAM_SEND_IP`                          | Optional `true`/`false` (default false): send the client IP (trust-proxy aware) when the project limits per IP |
| `ARQAM_BASE_URL`                         | Optional, default `https://otp.arqam.tech/api` (https required in production)                                  |
| `OTP_CODE_SECRET`, `OTP_PROOF_SECRET`    | HMAC secrets (≥ 32 characters, different); required for arqam, generated per process for fake when unset       |
| `OTP_FIXED_CODE`                         | Development only (refused in production): every code is this value                                             |

`npm run otp:arqam-check` (after `npm run build`, with the same environment as the server) prints the ARQAM account mode (`LIVE`/`TEST`) and balance; `npm run otp:arqam-check -- --send +9627XXXXXXXX --lang ar|en` also sends one test code. It never prints the key. At startup the server logs the account mode once (a `warn` when a TEST key runs with `NODE_ENV=production`: expected on the hosted dev service, wrong on prod); ARQAM outages never block startup or `/ready`.

Local QA sign-in: run with `OTP_PROVIDER=fake OTP_FIXED_CODE=123456`, call `POST …/auth/otp/request {phone, purpose}`, then `POST …/auth/otp/verify {phone, purpose, code: "123456"}` and send the returned `otpToken` (`WAB-Admin-Dashboard/qa/lib.mjs` `proof()` does this).

## Authentication

Access tokens are HS256 JWTs signed with `JWT_ACCESS_SECRET` (required, at least 32 characters, never committed; set it in `.env.development`). Each token is valid for one namespace only (`customer`, `merchant` or `admin`); a token of another namespace gets `403`. Protect a route with `requireAuth(scope, secret)`.

`PAYOUT_ENCRYPTION_KEY` (base64 of 32 random bytes, e.g. `openssl rand -base64 32`; required in production, optional in development) encrypts salons' bank details at rest with AES-256-GCM. Without it the bank-details endpoints answer 503. Rotating the key needs a re-encryption of the stored values (they carry a `v1:` version prefix).

## Real-time (Socket.IO)

One namespace per token scope: `/customer`, `/merchant`, `/admin` (path `/socket.io`). Connect with the access token:
`io(baseUrl + '/customer', { auth: { token } })` (or an `Authorization: Bearer` header). A missing, invalid or
expired token is refused with `connect_error` `data.code = UNAUTHORIZED`; a token of another scope with `FORBIDDEN`.
Each account is placed in its own room (`customer:{id}`, `member:{id}`, `admin`); events are emitted through
`SocketHub` (`src/sockets/socketServer.ts`) and reach every instance through the Redis adapter.

## Load test

`npm run build && npm run loadtest` drives the read endpoints of a running server (home, search, salon details, availability) from several workers and fails (exit code 1) when a target's p95 is above 300 ms (BRD NFR-03) or more than 1 % of requests fail. It needs a deployed or local server with real data:

| Variable                  | Meaning                                         |
| ------------------------- | ----------------------------------------------- |
| `LOADTEST_BASE_URL`       | Server root, e.g. `https://api.example.test`    |
| `LOADTEST_CUSTOMER_TOKEN` | A customer access token                         |
| `LOADTEST_SALON_ID`       | A LIVE salon                                    |
| `LOADTEST_SERVICE_ID`     | One of that salon's service ids                 |
| `LOADTEST_DATE`           | Salon-local day to ask slots for (`YYYY-MM-DD`) |
| `LOADTEST_GENDER`         | `FEMALE` (default) or `MALE`                    |
| `LOADTEST_CONCURRENCY`    | Workers (default 20)                            |
| `LOADTEST_DURATION_SEC`   | Run time (default 30)                           |

The no-double-booking guarantee under concurrency is covered by `tests/bookings.test.ts` ("under load": 40 customers on one slot, 5 slots × 8 contenders, overlapping neighbours, 24 parallel different slots) against a real Redis lock.
