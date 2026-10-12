# WAB — Memory (durable facts; keep short, replace instead of append)

## Repo
- Monorepo: `github.com/basimJm/WAB-Salon-System`, default branch `main` (protected by hooks: work on branches + PRs).
- Requirements live in `<project>/docs/` (PRD > BRD > Design Script); designs in `<project>/design/` (Claude Design export, `.dc.html` + `WAB Standalone/*.html`).
- `WAB-Server/` code was intentionally deleted (commit "delete last project"); only `BRD.md`, `.gitignore` and `docs/` remain → backend will be rebuilt from scratch in **TypeScript** per `WAB-Server/docs/WAB_Backend_BRD.md`.
- `WAB-Mobile-Salon/` and `WAB-Admin-Dashboard/` have docs + designs only; `wab-*` have BRDs only.
- Customer app is a KMP template (`WAB-Mobile-Customer/AGENTS.md`, `TECHSTACK.md`): Kotlin 1.10, Compose MP 1.10.3, Ktor 3.4.2, Koin 4.2.0.

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
