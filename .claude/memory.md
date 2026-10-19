# WAB — Memory (cross-project facts only; keep short, replace instead of append)

> Loaded on every turn in every session. Project facts live in `<project>/.claude/memory.md` (loaded only when working in that folder). Updated 2026-10-18.

## Repo and flow
- Monorepo `github.com/basimJm/WAB-Salon-System`. Masters: `main` (owner merges into it), `server` (WAB-Server + all `wab-*`), `admin`, `customer`, `merchant`. Task branches `feat/<prefix>-NNN-<key>` from the fresh master; PRs target the master; I merge my own PRs after the local gate (owner grant 2026-10-14) and continue with the next ready task.
- Backlogs: one per project/SDK (`.claude/projects.json` lists them); read only through `python3 scripts/tasks.py next|show|set|board|blocked|check`. `set <ID> DONE` unblocks dependents in other projects and rewrites the board in `INTEGRATION.md` §7. Tests: `python3 -m unittest scripts/test_tasks.py`.
- Sessions/memory: root `.claude/session.md` = index of all projects (for an agent that needs the whole picture); the working session block lives in the project's `.claude/session.md`. Hooks read all of them (`_common.session_files()`); `Loops: 1/1` is the rule (3/3 in old blocks stays valid). Hook tests: `python3 .claude/hooks/test_hooks.py`.
- The sandbox cannot write `.claude/hooks/` or `.git/config`: patch hooks through the Terminal panel (`run_in_terminal`, outside the sandbox); create branches with `git branch --no-track <name> origin/<master>`. `gh` also needs the terminal panel. System `python3` is 3.9: no `X | None` without `from __future__ import annotations`.
- Requirements: `<project>/docs/` (PRD > BRD > Design Script > `design/*.dc.html`); the `design/uploads/*.md` copies were deleted (2026-10-18). `BUSINESS_DOMAIN.md` = schemas, enums, rules, state machine, permissions, jobs, settings, error codes (money = integer fils; UTC stored, Asia/Amman computed).
- Contract = the generated server OpenAPI in `WAB-Server/docs/api/openapi.{common,customer,merchant,admin}.json` (+ Postman). There is no `contracts/` folder; INT-01 was redefined to this (`INTEGRATION.md` §3). Admin regenerates DTOs with `npm run api:sync`; apps will use `./gradlew apiSync` (CUS-009 / MER-006).

## Key decisions (details in root `CLAUDE.md` and `INTEGRATION.md`)
- OTP: Firebase Phone Auth (SMS), `otpLength` from the backend (6), backend verifies the Firebase ID token (`wab-otp`). Admin: email + password + email OTP.
- Real-time Socket.IO + Redis; push FCM (one Firebase project per env: dev `wab-dev-397ab`, prod `wab-prod-9c58f`; keys outside git, `*firebase-adminsdk*.json` ignored); jobs BullMQ + cron; storage S3 + CDN presigned; email Gmail SMTP from `basim.abusnaimeh@gmail.com` (`EMAIL_FROM_ADDRESS`, `SMTP_USER`, `SMTP_PASS` env only); analytics Firebase → BigQuery + server events in Mongo.
- Payments Phase 1: platform collects, refunds automatic, payouts manual; Phase 2 sub-merchants (ports already carry optional `destinations`). Gateway candidate HyperPay, not decided.
- Owner decisions: every FIVE tasks run unit tests only + one PR; detekt, full gate, emulator + simulator end-to-end journey once after the whole backlog (2026-10-19, rules §3.13); one verification loop (2026-10-18); no admin/server GitHub CI, local gates only; no e2e runs unless asked; rules/roles read once per session; owner handles deployment and SDK integration tasks (they stay `PENDING`/`BLOCKED`, see `tasks.py blocked`).

## Open owner inputs (block integration)
- Platform domain, payment gateway + sandbox, DigitalOcean product + managed Redis, Atlas tier, error-tracking tool, package registry (GitHub Packages assumed), merchant Firebase registrations + APNs, store accounts/signing, shared `core/*` between the two KMP apps.
