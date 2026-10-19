# Testing the admin panel against the real server

Everything but `dev-debug` (`npm run dev`) calls the real API, so the panel is tested against a real WAB-Server before any deployment. This runs the real server on your machine: MongoDB (replica set), Redis, MinIO (S3) and WAB-Server with the fake OTP / notifier / payment providers and **real storage**. Local development only.

## One time

```bash
brew install mongodb-community redis minio/stable/minio minio/stable/mc   # mongod, mongosh, redis-server, minio, mc
cd WAB-Server && npm ci && npm run build
```

## Every time

```bash
sh WAB-Admin-Dashboard/qa/stack.sh                    # databases, storage, seeds, server on http://127.0.0.1:4000
cd WAB-Admin-Dashboard
node qa/seed.mjs                                      # 3 customers, 2 live salons, bookings, reviews (once)
VITE_API_BASE_URL=http://localhost:4000 VITE_SOCKET_URL=http://localhost:4000 npm run build:dev-release
npx vite preview --mode dev-release --outDir dist/dev-release --port 4173
```

Sign in at <http://localhost:4173> with `qa.admin@wab.example` / `QaAdminPass#2026`. The sign-in code is emailed by the server; with the fake notifier it is only in memory, so read it from Redis:

```bash
node -e 'import("./qa/lib.mjs").then(async (m) => console.log(m.adminOtp()))'
```

## Contract check (every real answer against the generated schemas)

```bash
QA_SALON_ID=<a salon id from /admin/v1/salons> node qa/contract-check.mjs   # writes qa-contract.txt
```

Every line must be `OK`; `BAD` means the server answers differently from the OpenAPI the panel was generated from.

## Known server limits met while testing (see `docs/SERVER_ISSUES.md`)

CSV and PDF exports fail on real storage; the bookings export fails for a job without params; `Idempotency-Key` is not an allowed CORS header; `null` dates are read as 1 Jan 1970; empty `data`/`params` objects are left out of some answers.
