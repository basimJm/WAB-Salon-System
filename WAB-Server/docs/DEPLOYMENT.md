# WAB-Server — Build, environments and deployment

Three environments, one image. The image never contains configuration: everything comes from environment variables (the host's secret store), checked before boot with `npm run env:check`.

| Environment | Where | `NODE_ENV` | Providers | Firebase project | Buckets / CDN |
|---|---|---|---|---|---|
| Local | your machine, `docker compose` for Mongo/Redis/MinIO/Mailpit | `development` | `fake` (or `real` against the emulators) | none (fake) | MinIO |
| Dev (hosted) | the shared dev server | `production` (the server has only `development`, `production`, `test`) | `real`; payments `disabled` | `wab-dev-397ab` | dev public + private buckets, dev CDN |
| Prod | the live server | `production` | `real`; payments `disabled` | `wab-prod-9c58f` | prod public + private buckets, prod CDN |

Production mode refuses fakes, an emulator host, an http CDN and a missing `PAYOUT_ENCRYPTION_KEY` at startup. Payments are paused: `PAYMENT_PROVIDER=disabled` (checkout answers 503); there is no analytics provider (server events live in MongoDB).

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

The full local gate, run before every push: `npm run docs && npm run format:check && npm run lint && npm run typecheck && npm run build && npm test && npm audit --omit=dev`.

## 2. The image

Build context is the repository root (the server consumes `wab-notifications`, `wab-otp` and `wab-storage` through `file:` dependencies):

```sh
docker build -f WAB-Server/Dockerfile -t wab-server:<tag> .
```

It runs as the unprivileged `node` user, reads `PORT`, and has a health check on `/health`. Readiness (`/ready`) lists failed dependencies (Mongo, Redis) with 503. Not verified in this repository's runner (no Docker daemon): run the build once on the deployment host.

## 3. Configure an environment

Start from `docker/env.production.example` (used for dev-hosted and prod; only the values differ), put the values in the host's secret store, then check the same variables with the real tool:

```sh
npm run env:check -- <env file>      # prints key names only, never values
```

| Keys | Where the value comes from |
|---|---|
| `MONGODB_URI` | Atlas connection string of this environment (`mongodb+srv://…`) |
| `REDIS_URL` | managed Redis (`rediss://…` in production) |
| `JWT_ACCESS_SECRET` | `openssl rand -base64 48`, one per environment |
| `PAYOUT_ENCRYPTION_KEY` | `openssl rand -base64 32`, one per environment, never rotated without re-encrypting stored IBANs |
| `FIREBASE_PROJECT_ID` | Firebase project of this environment (sign-in tokens are verified against it; no secret needed) |
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
5. Smoke test with the real providers: phone sign-in with the Firebase test number (dev project only), an upload through a presigned URL, a push and an email.
6. Dev first; prod only after dev passes.

## 5. Still owner-side (see `python3 scripts/tasks.py blocked`)

Hosting product, platform domain and managed Redis (SRV-011/116), Atlas tier (SRV-059), error-tracking tool and DSN (SRV-115), Gmail App Password (`SMTP_PASS`), AWS resources and CDN domain, the 600 s phone sign-in age and the upload cache/lifecycle settings agreed in chat (cache headers and lifecycle rules are configured in AWS, not in this repository).
