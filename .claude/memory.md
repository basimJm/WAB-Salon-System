# WAB — Memory (durable facts; keep short, replace instead of append)

## Repo
- Monorepo: `github.com/basimJm/WAB-Salon-System`, default branch `main` (protected by hooks: work on branches + PRs).
- Requirements live in `<project>/docs/` (PRD > BRD > Design Script); designs in `<project>/design/` (Claude Design export, `.dc.html` + `WAB Standalone/*.html`).
- `WAB-Server/` code was intentionally deleted (commit "delete last project"); only `BRD.md`, `.gitignore` and `docs/` remain → backend will be rebuilt from scratch in **TypeScript** per `WAB-Server/docs/WAB_Backend_BRD.md`.
- `WAB-Mobile-Salon/` and `WAB-Admin-Dashboard/` have docs + designs only; `wab-*` have BRDs only.
- Customer app is a KMP template (`WAB-Mobile-Customer/AGENTS.md`, `TECHSTACK.md`): Kotlin 1.10, Compose MP 1.10.3, Ktor 3.4.2, Koin 4.2.0.

## Server backlog
- `WAB-Server/docs/WAB_Server_Tasks.md` = ordered small tasks SRV-001…116 (status TODO/PENDING/IN REVIEW/DONE). One task = one branch `feat/srv-NNN-<key>`; next task starts only after previous is merged to `main`; PENDING (owner info / missing SDK) tasks are skipped, not blocking.
- `WAB-Server/BRD.md` is legacy and superseded (4-digit OTP, Cloudinary, old paths) — do not implement.
- Cloud runner: Node 22, `redis-server` present, no `mongod`/docker daemon → unit tests use fakes; externals sit behind interfaces with fake providers.

- SRV-001 done: `WAB-Server` has package.json (TS 5.9, jest 30/ts-jest 29, eslint 9 + typescript-eslint 8, prettier), `npm run typecheck|lint|format:check|build|test`; layout list in `src/constants/layout.ts`. TypeScript 7 exists on npm but tooling peers need <6.1 → stay on 5.9.
- SRV-002 done: `loadConfig()` in `src/config` (zod 4 schema in `env.schema.ts`; names/defaults in `src/constants/env.ts`); add new env keys to schema AND `.env.example` (test enforces). Real env overrides `.env.<NODE_ENV>`.
- SRV-003 done: `createLogger()` (pino, redacting via `utils/logger/redact.ts`; names in `constants/logging.ts`); `requestId(logger)` middleware sets `req.id`/`req.log` (types in `src/types/express.d.ts`); `req.id` is the `traceId` for error responses. Deps: pino 9, express 5.
- SRV-004 done: typed errors in `src/utils/errors` (BaseError + subclasses; throw with domain `code`, e.g. `new ConflictError({code: ERROR_CODES.SLOT_TAKEN})`), codes in `constants/errorCodes.ts`, messages ONLY in `src/locales/{ar,en}.json` as flat keys (`errors.<CODE>`; tests enforce parity), `translate()` in `utils/i18n`, `language` middleware sets `req.language`/`req.t`. Open: ExternalServiceError uses code INTERNAL (no domain code); PaymentError = 402.
- SRV-004a done: mount order = `requestId` → `language` → body parsers → routes → `notFound` → `errorHandler(logger)`; wrap async handlers with `asyncHandler`; `buildErrorBody` in `utils/response/errorResponse.ts`; library errors mapped in `utils/errors/normalize.ts` by name/shape (add new mappings there + constants/errorMapping.ts). Process/shutdown: `createShutdown(closables)` + `registerProcessHandlers(process, logger, shutdown)` (wired in server.ts later). Tests use supertest.
- SRV-005 done: `createApp({logger, router?})` in `src/app.ts`; namespace routers in `src/modules/<ns>/index.ts` (add feature routers there); `validate({body,params,query,headers})` + `validated<typeof schemas>(req)` (zod; header keys lower-case); `startServer(config, logger, proc?)` in `src/server.ts` (`npm start` runs `dist/server.js`; add DB/Redis/Socket closers to its shutdown list). Express 5: `app.listen` reports listen errors via callback → use `http.createServer`. User asked me to merge my own PRs from SRV-005 on (merge commit, checks green, no conflicts/unresolved comments).
- SRV-005a done: controllers answer with `sendSuccess/sendCreated/sendPaginated(req,res,...)` (never `res.json`); list endpoints validate `paginationQuery(pageSize)` then `toSkipLimit`; success message keys in `constants/messages.ts`. User said "complete": merge my own PRs (open them non-draft; merge commit) and keep working the backlog in order.
- SRV-006 done: `/health` (liveness) and `/ready` (503 listing failed checks) mounted at root; add dependency probes via `createApp({readinessChecks:[{name,check}]})`; shared `withTimeout` in `utils/async/timeout.ts`.
- SRV-007 done: `createApp({security:{corsAllowedOrigins,rateLimit?}, trustProxyHops})`; middleware order requestId → language → helmet/cors/global rate limit → json → `sanitizeRequest`; use `createRateLimiter({windowMs,max,store?})` per route for OTP/login/payments; env `TRUST_PROXY_HOPS` (LB = 1). HTTPS-only is enforced by the platform/LB (undecided), not the app.
- SRV-008 done + NEW RULE (`WAB-Server/CLAUDE.md` §11): every task PR updates its `<feature>.openapi.ts`, registers it in `src/docs/index.ts`, runs `npm run docs` and commits `docs/api/**` (OpenAPI per namespace + Postman collections/env); no API change → note `API docs: no change`. Mount feature routers with `mount()` (`src/routes/mount.ts`). `tests/docs.test.ts` enforces it. Swagger UI at `/docs` outside production. zod schemas need `import { z } from '../docs/zod'` in `*.openapi.ts`.
- SRV-009 done: `docker-compose.yml` (mongo replica set, redis, minio, mailpit; `--profile app` adds the API), `docker/compose.env.example` → copy to `.env`; image built from `Dockerfile`. Host connection to Mongo needs `?directConnection=true`. Docker daemon is NOT available on the cloud runner (config/runtime simulated only).

## Business spec
- `BUSINESS_DOMAIN.md` = single source for schemas, enums, rules, state machine, permissions, jobs, settings, error codes. Money = integer fils (1 JOD = 1000 fils). Booking draft → OTP → payment → booking (Redis holds 10 min).

## Server rules
- `WAB-Server/CLAUDE.md`: layers route→middleware→controller→service→repository→schema; `modules/customer|merchant|admin`, shared logic `domain/`, helpers `utils/`; base envelope `{success,message,data,meta?}` / `{success:false,message,error:{code,details?,traceId}}`; AR+EN locales required.

## Delivery
- Plan: `ROADMAP.md` (P0–P6, tracks SERVICE/SERVER/CUSTOMER/MERCHANT/ADMIN/INT; integration last in P5).
- Unready dependency → code against `contracts/` fixtures behind an interface, mock switched by `DATA_SOURCE=mock|remote` config (`INTEGRATION_WORKFLOW.md`).
- First task for any track: INT-01 contracts v1 (not created yet).

## Key decisions (see CLAUDE.md for full list)
- OTP: Firebase Phone Auth (SMS); length from backend (6 now); backend verifies Firebase ID token.
- Real-time: Socket.IO + Redis; push: FCM; jobs: BullMQ + cron.
- Analytics: Firebase Analytics/Crashlytics → BigQuery; server events in MongoDB.
- Storage: AWS S3 + CDN with presigned uploads; email: Nodemailer + Gmail SMTP (admin only).
- Payments Phase 1: platform collects, refunds automatic, payouts manual; Phase 2: sub-merchant split payments.
- Packages (`wab-payments` Node+KMP; `wab-otp`, `wab-notifications`, `wab-analytics`, `wab-storage` Node only) — interfaces + provider implementations, no business rules.

## Gotchas
- Tracked Firebase/iOS config files exist in `WAB-Mobile-Customer` (`google-services.json`, `GoogleService-Info.plist`, `Config.xcconfig`); review before making the repo public.
- Hooks need `python3` on PATH.
