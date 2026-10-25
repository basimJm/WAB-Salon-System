# wab-notifications — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next notifications`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Built and wired in the server (`NOTIFIER_PROVIDER=real`, T-122/T-123). Remaining: NOT-010 publish, NOT-011 real SMTP send (owner App Password). NOT-012 Brevo HTTP adapter done (0.2.0); the server still sends through SMTP until its config gains `EMAIL_PROVIDER=brevo` (server task).

## Current task

### NOT-012 — Brevo HTTP email adapter behind the same `EmailChannel`

- Branch: `feat/not-012-email-http`
- Status: IN REVIEW
- Acceptance criteria (BRD email channel; Rules.md §1–§4):
  - [x] `email.provider: 'brevo'` (`from`, `brevo {apiKey, baseUrl?, timeoutMs?}`, injectable `fetch`): POST `/smtp/email` with the `api-key` header, text + optional html; global `fetch`, no new dependency
  - [x] Every status mapped: 2xx sent (non-JSON body → `MALFORMED_RESPONSE`), 401/403 `AUTH_FAILED`, 402 `QUOTA_EXCEEDED`, 429 `RATE_LIMITED`, 400 `PAYLOAD_INVALID`, 5xx `VENDOR_ERROR`, fetch failure `NETWORK_ERROR`, timeout `TIMEOUT`, anything else `UNKNOWN` (logged); 429/5xx/network/timeout retried with the shared policy
  - [x] dev: any base URL (local mock); prod: https base URL and an API key required; config errors name keys only
  - [x] Loop test: 500 Brevo emails with 429/503/network failures injected and duplicate submissions → each delivered exactly once, memory stable
- Tests: `tests/brevo.test.ts`, `tests/httpErrors.test.ts`, options + notifier cases; `npm run verify` green (220 tests, coverage 100 % functions / 98 % branches, build, package smoke, loop 2/2)
- Loops: 1/1
- Review: PASSED (Backend ✔, Architect ✔ (new adapter + one config value, no consumer change), Integration ✔, Implementation ✔) — ASSUMED: Brevo's whole-message accept/refuse (no per-recipient result). NOT verified against the real Brevo API (no key here). Server wiring (`EMAIL_PROVIDER`, `BREVO_API_KEY`) is a separate server change.

### NOT-010 — Publish-ready `@wab/notifications`: package metadata, changelog, server dependency name
- Branch: `feat/not-010-publish`
- Status: IN REVIEW (prepared; the owner runs the publish)
- Acceptance criteria (SDK rules; root CLAUDE.md §7 registry assumption):
  - [x] name `@wab/notifications`, version 0.1.0, no `private`, `publishConfig` (GitHub Packages), `repository`, `files`, `CHANGELOG.md`, `.npmrc` scope mapping (no token), `prepublishOnly` = verify, `pack:check`
  - [x] WAB-Server depends on `@wab/notifications` (`file:` until published) and imports it by that name
- Tests: `npm run verify` green (200 tests, smoke by the new name); `npm pack --dry-run` lists 9 files; server notifier/providers/docker tests 96 pass, typecheck green, audit 0
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — NOT done: the publish itself and switching the server dependency from `file:` to the registry version (needs the registry choice: GitHub Packages requires the scope to equal the GitHub owner/org, so `@wab` needs an org named `wab` or a scope rename; plus a token). Task stays PENDING after merge.

## Last blocks

### T-122 — `wab-notifications` SDK: FCM push + SMTP email behind one interface
- Branch: `claude/busy-johnson-2rch94` (merged to `server`)
- Status: DONE
- Tests: `npm run verify` (typecheck, lint, prettier, 200 unit tests, build, package smoke, loop test); `npm run smoke` real FCM dry-run
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — NOT verified: real SMTP send, prod key, end-to-end push to a device.
