# wab-notifications — Task Backlog

> One task = one branch = one PR into `server` (the SDKs ship with the backend). Next task: `python3 scripts/tasks.py next notifications`. Rules: `.claude/Rules.md`; implementation status and API: `.claude/Integration.md`; requirements: `docs/WAB_Package_Notifications_BRD.md` (NOT-xx, NNF-xx). Statuses: `TODO` · `IN PROGRESS` · `IN REVIEW` · `DONE` · `PENDING` (owner) · `BLOCKED` (another project's task, in *Needs*).

| ID | Task | Branch | Needs | Status | Sources / notes |
|---|---|---|---|---|---|
| NOT-001 | Project scaffold: TS strict, eslint, prettier, jest, tsup (ESM + CJS + d.ts), `verify` script, loop-test config | `claude/busy-johnson-2rch94` | — | DONE | Rules §4.12 |
| NOT-002 | Shared kernel: errors, zod options with dev/prod rules, validation, retry/backoff, idempotency store (memory + Redis), redacting logger bridge | `claude/busy-johnson-2rch94` | NOT-001 | DONE | NOT-10…13 |
| NOT-003 | `Notifier` port (`sendPush`, `sendEmail`, `close`) + fake push/email channels + `custom` channel | `claude/busy-johnson-2rch94` | NOT-002 | DONE | NOT-01, NOT-14 |
| NOT-004 | FCM adapter: single, multicast (batched, partial retry), topic; visible / data-only / high priority / time-sensitive / actionable; every FCM code classified; `invalidTokens` | `claude/busy-johnson-2rch94` | NOT-003 | DONE | NOT-02…05; proxy needs `httpAgent` + `legacyHttpTransport` |
| NOT-005 | SMTP adapter (nodemailer): transport + reply codes mapped, recipient refusals, pooled connection | `claude/busy-johnson-2rch94` | NOT-003 | DONE | NOT-06, NOT-07 |
| NOT-006 | Email templates ar/en: ADMIN_2FA, ALERT, REPORT_READY; HTML-escaped; https-only links; sender name/address | `claude/busy-johnson-2rch94` | NOT-005 | DONE | NOT-08 |
| NOT-007 | Unit tests + coverage gate (100 % functions / 95 % lines / 95 % branches), loop test (500 flows, 20 concurrent) | `claude/busy-johnson-2rch94` | NOT-004, NOT-005 | DONE | Rules §4.11, §4.13 |
| NOT-008 | Package smoke (require + import of the built package), README quick start, `Integration.md` complete | `claude/busy-johnson-2rch94` | NOT-007 | DONE | Rules §4.14 |
| NOT-009 | Real-FCM dev smoke (`npm run smoke`): credentials check, malformed token → `INVALID_TOKEN`, topic dry-run against the dev Firebase project | `claude/busy-johnson-2rch94` | NOT-004 | DONE | Project `wab-dev-397ab`; key outside git |
| NOT-010 | Publish `@wab/notifications` to the package registry (GitHub Packages assumed, root `CLAUDE.md` §7) with version, changelog and `WAB-Server` dependency switched from `file:` to the registry | `feat/not-010-publish` | NOT-008 | IN PROGRESS | Owner runs the publish; unblocks SRV-112 |
| NOT-011 | Real SMTP send verification: Mailpit locally, then one Gmail App-Password send in dev; document the result in `Integration.md` | `feat/not-011-smtp-verify` | NOT-005 | PENDING | Gmail App Password from the owner (`SMTP_PASS`, env only) — **owner input** |
| NOT-012 | Optional email HTTP-API adapter (Brevo / Resend / SES) behind the same `EmailChannel` | `feat/not-012-email-http` | NOT-003 | TODO | Only if SMTP quotas become a problem; lowest priority |
