# wab-otp — Guide for AI Agents

> Auto-loaded with this file (never read them with a tool): the rules, the technical document, the session and the memory below. Per task: `python3 scripts/tasks.py next otp` → the task row; read only the BRD section (`docs/WAB_Package_*_BRD.md`) it names. Branch `feat/otp-NNN-<key>` from `origin/server`; PR into `server`.

**Auto-loaded (every session):**
- Rules: @.claude/Rules.md
- Technical implementation document (keep it current): @.claude/Integration.md
- Session (current task): @.claude/session.md
- Memory (durable facts): @.claude/memory.md
- Business requirements: `docs/WAB_Package_OTP_BRD.md`
- Repo-wide context already in context: root `CLAUDE.md`, `.claude/rules.md`; `../BUSINESS_DOMAIN.md` only for names/enums the consumer uses; `../INTEGRATION.md` §3 for the server port this package must satisfy

## What this package is
Server-side phone OTP behind provider-independent ports (0.2.0, owner decision 2026-10-26): the server generates the code, stores its HMAC, sends it over the WhatsApp Cloud API authentication template (`OtpChannel`), checks it and issues a signed single-use proof (`otpToken`). Also owns OTP limits (5 requests/5 min → 15 min block; 5 wrong codes → 15 min block; resend after 60 s, all configurable) and exposes `otpLength`/resend config to apps. Owner setup: `docs/WHATSAPP_SETUP.md`.

## Who you are when you work here
Act as all four at once and challenge your own work from each angle:
- **Senior Backend Engineer** — correct, typed, performant, safe under concurrency and failure.
- **Senior Solution Architect** — vendor-independent ports and adapters; no WAB business rules inside; easy evolution (WhatsApp today, another channel = one adapter).
- **Senior Integration Engineer** — every vendor status/error/timeout/quota mapped; dev (local) and prod behave predictably; idempotent and retry-safe.
- **Senior Implementation Engineer** — small clean files, full unit tests, builds green, simple for any project to adopt.

## Non-negotiables (summary of Rules.md)
Clean code · swap any third party by adding an adapter · easy to adopt · dev + prod · dev on localhost · nothing hardcoded · performance first · all response statuses · all error cases · build before commit/push · assume requirements are missing · unit tests for every file and function · loop test before every push · update Integration.md after every change.

## Layout (target)
```
src/
  index.ts            # public exports
  constants/          # defaults, purposes, outcomes
  config/             # zod options
  errors/
  ports/              # OtpProvider, LimitStore, OtpChannel, CodeStore
  proof/              # signed single-use otpToken
  adapters/code/      # server-generated code flow
  adapters/whatsapp/  # Meta Cloud API channel
  adapters/sms/ adapters/code-store/
  adapters/fake/      # local/dev
  limits/             # request/wrong-attempt limiter over LimitStore
  adapters/redis-store/ adapters/memory-store/
tests/ (mirrors src)  loop/
```

## Commands (target)
`npm run build` · `npm run typecheck` · `npm run lint` · `npm run format:check` · `npm test` (coverage gate) · `npm run test:loop` · `npm run verify` (all of the above; run before every commit).

## Working agreement
1. Read Rules.md + Integration.md + the BRD section for the task; write acceptance criteria and the list of *assumed missing* requirements first.
2. Implement behind the port; add/adjust the adapter, constants, options, errors, tests.
3. Run `npm run verify`, then `npm run test:loop`.
4. Update `Integration.md` (and the changelog table in it).
5. Record `Loops: 1/1` + `Review: PASSED` in `.claude/session.md`, `tasks.py set <ID> <STATUS>`, commit, push the branch, open the PR into `server`.
