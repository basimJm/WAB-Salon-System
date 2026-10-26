# WAB-Server — Build, environments and deployment

Three environments, one image. The image never contains configuration: everything comes from environment variables (the host's secret store), checked before boot with `npm run env:check`.

| Environment | Where | `NODE_ENV` | Providers | Firebase project (push) | Buckets / CDN |
|---|---|---|---|---|---|
| Local | your machine, `docker compose` for Mongo/Redis/MinIO/Mailpit | `development` | `fake` (or `real` against the emulators) | none (fake) | MinIO |
| Dev (hosted) | the shared dev server | `production` (the server has only `development`, `production`, `test`) | `real`, OTP `whatsapp`; payments `disabled` | `wab-dev-397ab` | dev public + private buckets, dev CDN |
| Prod | the live server | `production` | `real`, OTP `whatsapp`; payments `disabled` | `wab-prod-9c58f` | prod public + private buckets, prod CDN |

Production mode refuses fakes, an OTP fixed code, an http CDN and a missing `PAYOUT_ENCRYPTION_KEY` at startup. Payments are paused: `PAYMENT_PROVIDER=disabled` (checkout answers 503); there is no analytics provider (server events live in MongoDB).

## 1. Local build and run

```sh
cd WAB-Server
npm ci                       # builds the sibling SDKs first (scripts/ensure-sdks.cjs)
cp docker/compose.env.example .env      # fill the ports/credentials, git-ignored
docker compose up -d         # Mongo replica set, Redis, MinIO, Mailpit
cp docker/env.development.example .env.development
npm run build
npm run env:check -- .env.development   # PASS, or the invalid key names
npm run seed                 # indexes + reference data (insert-only)
ADMIN_EMAIL=… ADMIN_PASSWORD=… npm run seed:admin   # first admin (≥ 12 characters)
npm start                    # http://localhost:<PORT>/health  and  /ready
```

### Salon branches migration (every environment, once)

`npm run migrate:branches` reports what it would change; `npm run migrate:branches -- --apply` gives each salon without branches one main branch built from its current address, contacts, hours, services and staff, and sets `branchId` on its services, closures, members (not the owner), leaves, drafts, bookings (+ branch snapshot), transactions, refunds, ledger and reviews (BUSINESS_DOMAIN.md §5.16). Idempotent: run it again after a stop; linked salons are skipped. Run it on each database before deploying a release that reads branches. `seed:demo` runs it for the demo salons.

### Demo data (development databases only)

`npm run seed:demo` fills every collection of a **development** database with linked sample data (refused when `NODE_ENV=production`): 10 salons in Amman in every state (6 live, offline, incomplete, pending, rejected) with owners, staff, services, hours, gallery, closures, leaves, policies and subscriptions; 24 customers; bookings over the last 4 weeks and the next 10 days in every status, with payments, refunds, ledger and payouts; reviews, favorites, notifications, banners, content pages, FAQs, contact info, app versions, campaigns, alerts, audit logs, exports and 14 daily reports. It needs `npm run seed:admin` first, runs the reference seed itself, and is insert-only and deterministic: a second run adds nothing and never overwrites what an admin changed. Not seeded on purpose: settings (missing = default), refresh tokens and booking drafts (short-lived sessions).

Photos: put them in a folder with the sub-folders `covers`, `profiles`, `gallery`, `staff`, `customers`, `banners`, `catalog`, `licenses` (any `.jpg/.jpeg/.png/.webp/.heic`; a file named like the key, e.g. `catalog/haircut.jpg`, is used for that key, the others are shared in turn), then run `npm run seed:demo-images -- <folder>` with `STORAGE_PROVIDER=real`. Photos are re-encoded as JPEG (max 1600 px) and the list thumbnails are generated.

Branches: after the main-branch migration, Lamar Beauty Lounge gets two more branches (Khalda, Dabouq) and Al-Ostaz Barber Shop one (Shmeisani), each with its own hours, prices and staff (a branch manager and an employee), so the branch screens, the "Salon - Branch" nearest list and branch-scoped managers can be tried.

Demo phone numbers are invented Jordanian mobiles (`+96279900xxxx` customers, `+96278900xxxx` staff, `+96278901xxxx` branch staff). They cannot receive WhatsApp codes: sign in as one on a local stack with `OTP_PROVIDER=fake` and `OTP_FIXED_CODE`, or add a real test recipient to the Meta app (dev only).

The full local gate, run before every push: `npm run docs && npm run format:check && npm run lint && npm run typecheck && npm run build && npm test && npm audit --omit=dev`.

## 2. The image

Build context is the repository root (the server consumes `wab-notifications`, `wab-otp` and `wab-storage` through `file:` dependencies):

```sh
docker build -f WAB-Server/Dockerfile -t wab-server:<tag> .
```

It runs as the unprivileged `node` user, reads `PORT`, and has a health check on `/health`. Readiness (`/ready`) lists failed dependencies (Mongo, Redis) with 503. Not verified in this repository's runner (no Docker daemon): run the build once on the deployment host.

## 3. Configure an environment

Start from `docker/env.dev.example` (hosted dev) or `docker/env.prod.example` (production); every key has a comment saying what it is and where to get it, put the values in the host's secret store, then check the same variables with the real tool:

```sh
npm run env:check -- <env file>      # prints key names only, never values
```

| Keys | Where the value comes from |
|---|---|
| `MONGODB_URI` | Atlas connection string of this environment (`mongodb+srv://…`) |
| `REDIS_URL` | managed Redis (`rediss://…` in production) |
| `JWT_ACCESS_SECRET` | `openssl rand -base64 48`, one per environment |
| `PAYOUT_ENCRYPTION_KEY` | `openssl rand -base64 32`, one per environment, never rotated without re-encrypting stored IBANs |
| `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_TEMPLATE_NAME` (+ optional `WHATSAPP_API_VERSION`) | Meta WhatsApp Cloud API of this environment (`wab-otp/docs/WHATSAPP_SETUP.md`); the token is a secret |
| `OTP_CODE_SECRET`, `OTP_PROOF_SECRET` | `openssl rand -base64 48` twice (different), one pair per environment |
| `FCM_SERVICE_ACCOUNT_JSON` | Firebase console → Project settings → Service accounts → Generate key (one line) |
| `SMTP_*`, `EMAIL_FROM_*` | Gmail SMTP with an App Password (`SMTP_PASS`), sender `basim.abusnaimeh@gmail.com` |
| `S3_REGION`, `S3_PUBLIC_BUCKET`, `S3_PRIVATE_BUCKET`, `CDN_BASE_URL` | AWS (distinct buckets; `https` CDN); omit the access keys to use the platform's IAM role |
| `CORS_ALLOWED_ORIGINS`, `TRUST_PROXY_HOPS` | the admin panel origin(s); number of proxies in front of the API |

Never commit `.env*` files (only `.env.example` and the `docker/*.example` templates), keystores or service-account JSON.

## 4. Release checklist (per environment)

1. `docker build` succeeds from the repository root; the image starts with the environment's variables.
2. `npm run env:check` passes for exactly the variables the host will inject.
3. `npm run seed` once per database, then `seed:admin` once.
4. `/health` is 200 and `/ready` is 200 behind the load balancer; HTTPS terminates at the load balancer (`TRUST_PROXY_HOPS` matches).
5. Smoke test with the real providers: phone sign-in with a WhatsApp test recipient (dev Meta app only), an upload through a presigned URL, a push and an email.
6. Dev first; prod only after dev passes.

## 5. Run one environment on any Docker host

One file, one environment per run; the host can be your machine, a VM or any cloud:

```sh
cd WAB-Server
# local development (fake providers; infrastructure from docker-compose.yml)
docker compose --profile app up --build
# local, with the HOSTED-DEV values (real Firebase, S3, Atlas): proves the dev setup from your machine
ENV_NAME=hosted-dev ENV_FILE=.env.hosted-dev docker compose -f docker-compose.deploy.yml up -d --build
# a server (dev or prod): same command, other file; add --profile redis only if Redis is not managed
ENV_NAME=production ENV_FILE=.env.production IMAGE_TAG=<tag> docker compose -f docker-compose.deploy.yml up -d --build
```

`.env.development`, `.env.hosted-dev` and `.env.production` are git-ignored (only the templates in `docker/` are committed). The container always listens on 3000; `API_PORT` is the host port and `API_BIND` stays `127.0.0.1` until a reverse proxy or load balancer (HTTPS) is in front. One-time per database: `docker compose -f docker-compose.deploy.yml run --rm api node dist/seeds/run.js`, then the admin seed with `ADMIN_EMAIL`/`ADMIN_PASSWORD` in the environment.

## 6. Keys per environment

| Key group | Local dev | Hosted dev | Prod |
|---|---|---|---|
| `MONGODB_URI` | local container | Atlas cluster **dev** | Atlas cluster **prod** (own user, IP allow-list, backups on) |
| `REDIS_URL` | local container | managed Redis dev, or the `redis` profile | managed Redis prod (TLS, `rediss://`) |
| `JWT_ACCESS_SECRET`, `PAYOUT_ENCRYPTION_KEY` | dev placeholder | generate (different per environment) | generate (different per environment) |
| `OTP_PROVIDER` + `WHATSAPP_*`, `OTP_CODE_SECRET`, `OTP_PROOF_SECRET` | `fake` (+ `OTP_FIXED_CODE`) | `whatsapp`, dev Meta number + secrets | `whatsapp`, business number + secrets |
| `NOTIFIER_PROVIDER` + `FCM_SERVICE_ACCOUNT_JSON`, `SMTP_*`, `EMAIL_FROM_*` | `fake` (Mailpit) | `real`, dev service account | `real`, prod service account |
| `STORAGE_PROVIDER` + `S3_*`, `CDN_BASE_URL` | `fake` or MinIO | `real`, dev buckets + dev CDN | `real`, prod buckets + prod CDN |
| `PAYMENT_PROVIDER` | `fake` | `disabled` | `disabled` |
| `CORS_ALLOWED_ORIGINS`, `TRUST_PROXY_HOPS`, `LOG_LEVEL` | localhost | dev admin origin | prod admin origin |

MongoDB Atlas: create one cluster per environment, one database user per environment, allow the server's IP (or the VPC), and copy the `mongodb+srv://` string into `MONGODB_URI`. The server needs a replica set (Atlas has one) because bookings use transactions.

## 7. How Redis works here, and how to run it

Redis is an in-memory key-value store; WAB uses it for things that must be fast and shared between server instances: booking and slot **locks** (no double booking), **rate limits** and OTP blocks, the **job queue** (reminders, auto-cancel, exports), Socket.IO **real-time** between instances, and short-lived **caches** (settings, analytics). It holds no permanent data: MongoDB is the source of truth, so losing Redis loses locks and pending jobs (which the jobs reconcile from MongoDB on start) but no bookings.

- **Managed Redis (recommended for prod):** the provider runs, patches and backs it up (DigitalOcean Managed Redis, Upstash, AWS ElastiCache). You get a `rediss://` URL; keep it in the same region as the server.
- **A Redis container (fine for hosted dev):** `--profile redis` with `REDIS_PASSWORD` set; `REDIS_URL=redis://:<password>@redis:6379`. It is a single point of failure and has no managed backups.
- Use one Redis per environment (never share between dev and prod); set a password; do not expose the port publicly.

## 8. Still owner-side (see `python3 scripts/tasks.py blocked`)

Hosting product, platform domain and managed Redis (SRV-011/116), Atlas tier (SRV-059), error-tracking tool and DSN (SRV-115), Gmail App Password (`SMTP_PASS`), AWS resources and CDN domain, the 600 s phone sign-in age and the upload cache/lifecycle settings agreed in chat (cache headers and lifecycle rules are configured in AWS, not in this repository).
