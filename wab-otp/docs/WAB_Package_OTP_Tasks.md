# wab-otp — Task Backlog

> One task = one branch = one PR into `server`. Next task: `python3 scripts/tasks.py next otp`. Rules: `.claude/Rules.md`; target architecture and API: `.claude/Integration.md`; requirements: `docs/WAB_Package_OTP_BRD.md`. Server counterpart: `WAB-Server/src/providers/otp` (fake today; `SRV-034` swaps in this package). Statuses: `TODO` · `IN PROGRESS` · `IN REVIEW` · `DONE` · `PENDING` (owner) · `BLOCKED`.

| ID | Task | Branch | Needs | Status | Sources / notes |
|---|---|---|---|---|---|
| OTP-001 | Project scaffold: TS strict, eslint, prettier, jest, tsup (ESM + CJS + d.ts), `verify`, loop-test config (copy the `wab-notifications` setup) | `feat/otp-001-scaffold` | — | DONE | Rules §4.12; reuse `wab-notifications` configs |
| OTP-002 | Shared kernel: typed errors, zod options (`environment`, `provider`, limits, store), prod rules (fake refused, credentials required), redacting logger bridge, constants (purposes, outcomes, defaults) | `feat/otp-002-kernel` | OTP-001 | DONE | Rules §2, §3; BUSINESS_DOMAIN OTP limits as defaults only |
| OTP-003 | `OtpProvider` port (`precheck`, `verify`, `reportFailure`, `getConfig`) + `LimitStore` port + fake adapter + memory store | `feat/otp-003-port-fake` | OTP-002 | DONE | Integration.md §3; outcomes `VERIFIED/INVALID_PROOF/PHONE_MISMATCH/EXPIRED/PURPOSE_MISMATCH/BLOCKED` |
| OTP-004 | Limits engine over `LimitStore`: request window (5 / 5 min → 15 min block), wrong attempts (5 → 15 min block), `blockedUntil`, `resendAfterSeconds`, all values from options | `feat/otp-004-limits` | OTP-003 | DONE | Must match `WAB-Server` `domain/otp` gate semantics (SRV-027) so the server can delegate |
| OTP-005 | Redis `LimitStore` adapter (single Lua script per hit, TTLs), works with an injected ioredis client | `feat/otp-005-redis-store` | OTP-004 | DONE | Same pattern as `wab-notifications` idempotency store |
| OTP-006 | Firebase adapter: verify ID token with firebase-admin (signature, expiry, project, `phone_number` match, auth time window), map every firebase-admin error code to an outcome, lazy vendor import, proxy options | `feat/otp-006-firebase` | OTP-003 | DONE | Phase 1 provider; dev uses the dev Firebase project or the Auth emulator |
| OTP-007 | Firebase Auth emulator dev mode (localhost) + fixtures of real token shapes; `environment: dev` may use it, prod refuses it | `feat/otp-007-emulator` | OTP-006 | DONE | Rules §2.6 |
| OTP-008 | Unit tests per file + coverage gate, loop test (≥ 50 iterations with concurrency on limits), package smoke, README, `Integration.md` status + open questions | `feat/otp-008-quality` | OTP-005, OTP-007 | DONE | Rules §4.11–14 |
| OTP-009 | Server-verified SMS adapter skeleton (send code + check code through an SMS vendor port) kept behind the same `OtpProvider`; fake vendor only | `feat/otp-009-sms-skeleton` | OTP-008 | DONE | Future provider; no vendor chosen (owner decision later) |
| OTP-010 | Publish `@wab/otp` to the registry; `WAB-Server` dependency switched from the in-repo fake to the package (`OTP_PROVIDER=real`) | `feat/otp-010-publish` | OTP-008 | IN REVIEW | Owner runs the publish; unblocks SRV-034 and SRV-112 |
