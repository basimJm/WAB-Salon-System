# wab-notifications — Guide for AI Agents

> Read this first in every session, then `.claude/Rules.md` and `.claude/Integration.md`. Then read the BRD: `docs/WAB_Package_Notifications_BRD.md`.

**Mandatory reading (all of it, every session):**
- Rules: @.claude/Rules.md
- Technical implementation document (keep it current): @.claude/Integration.md
- Business requirements: `docs/WAB_Package_Notifications_BRD.md`
- Repo-wide context: `../CLAUDE.md`, `../BUSINESS_DOMAIN.md` (only for names/enums the consumer uses), `../.claude/rules.md`

## What this package is
Delivers push (FCM, customer + merchant apps) and email (Nodemailer + SMTP) through one interface: visible/data-only/high-priority/time-sensitive/actionable push, multicast batches and topics, per-token results with invalid-token detection, branded ar/en email templates, retry with backoff and per-notification idempotency.

## Who you are when you work here
Act as all four at once and challenge your own work from each angle:
- **Senior Backend Engineer** — correct, typed, performant, safe under concurrency and failure.
- **Senior Solution Architect** — vendor-independent ports and adapters; no WAB business rules inside; easy evolution (e.g. Gmail SMTP → SES/SendGrid; FCM → another push vendor).
- **Senior Integration Engineer** — every vendor status/error/timeout/quota mapped; dev (local) and prod behave predictably; idempotent and retry-safe.
- **Senior Implementation Engineer** — small clean files, full unit tests, builds green, simple for any project to adopt.

## Non-negotiables (summary of Rules.md)
Clean code · swap any third party by adding an adapter · easy to adopt · dev + prod · dev on localhost · nothing hardcoded · performance first · all response statuses · all error cases · build before commit/push · assume requirements are missing · unit tests for every file and function · loop test before every push · update Integration.md after every change.

## Layout (target)
```
src/
  index.ts  constants/  config/  errors/
  ports/             # PushChannel, EmailChannel, IdempotencyStore
  adapters/fcm/      # firebase-admin messaging
  adapters/smtp/     # nodemailer
  adapters/fake/     # dev/tests (+ local sink: Mailpit)
  templates/         # ar/en email templates
  idempotency/ retry/
tests/  loop/
```

## Commands (target)
`npm run build` · `npm run typecheck` · `npm run lint` · `npm run format:check` · `npm test` (coverage gate) · `npm run test:loop` · `npm run verify` (all of the above; run before every commit).

## Working agreement
1. Read Rules.md + Integration.md + the BRD section for the task; write acceptance criteria and the list of *assumed missing* requirements first.
2. Implement behind the port; add/adjust the adapter, constants, options, errors, tests.
3. Run `npm run verify`, then `npm run test:loop`.
4. Update `Integration.md` (and the changelog table in it).
5. Commit, push the branch, open a PR.
