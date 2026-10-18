# WAB — Session Log

> Every task gets a block (template in `.claude/hooks.md` §3). Keep only the current and last few sessions here; move durable knowledge to `memory.md` and delete stale blocks.

## Current Session

- Started: 2026-10-12
- Goal: Set up repo-wide rules, roles, hooks, session and memory for Claude Code.

### Open / In Progress

- (none)

### Completed

> Older task blocks: `docs/history/session-archive.md` (not auto-loaded). Keep only the last 3 task blocks here.

### T-000 — Merges into `admin` (standing record)

- Project: `WAB-Admin-Dashboard/`
- Branch: `admin`
- Status: DONE (standing block: every task PR is merged into `admin` after its own task block below passes the local gate; no code is committed on this branch)
- Acceptance criteria:
  - [x] Each task block records its gate, review and deviations; `admin` only receives merge commits
- Tests: see the task blocks
- Loops: 1/1 (user decision)
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — covered by the task blocks. DEVIATION: no e2e (user decision).

### T-096 — ADM-078 fixture tests

- Project: `WAB-Admin-Dashboard/`
- Branch: `feat/adm-078-fixture-tests`
- Status: DONE
- Acceptance criteria (Admin Tasks ADM-078):
  - [x] A test fails when an operation of the contract has no mock fixture and no written reason (the list of exemptions can only shrink), when a fixture names an operation the contract lacks, and when a readable fixture answers with anything its generated schema forbids; the mock answers 404 when a fixture cannot find a record
- Tests: 3 new tests; gate green
- Loops: 1/1 (user decision)
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — DEVIATION: no e2e (user decision). 

### T-097 — ADM-081 QA pass: accessibility and RTL

- Project: `WAB-Admin-Dashboard/`
- Branch: `feat/adm-081-qa-pass`
- Status: DONE
- Acceptance criteria (Admin Tasks ADM-081):
  - [x] axe finds no violations on any of the 29 module screens in Arabic (RTL) and English; chart titles no longer skip heading levels
- Tests: tests/pages-a11y.test.tsx (58 tests); gate PASS; no browser check (user decision)
- Loops: 1/1 (user decision)
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — DEVIATION: no e2e (user decision). DEVIATION: ADM-080 e2e flows skipped (user decision); performance is covered by check:size budgets only, no Lighthouse run.

### T-122 — `wab-notifications` SDK: FCM push + SMTP email behind one interface

- Project: `wab-notifications/` (new package) + repo `.gitignore` (Firebase service-account keys)
- Branch: `claude/busy-johnson-2rch94` (PR targets `server`, see T-121)
- Status: DONE (SDK built and verified; WAB-Server wiring is a separate task)
- Acceptance criteria (BRD NOT-01…14, NNF-03/04; owner rules in `wab-notifications/.claude/Rules.md`):
  - [x] `createNotifier` with validation, idempotency (memory / Redis), retry with backoff, push + email channels, `close()`; custom channels = swap any vendor
  - [x] FCM: single, multicast (batched, partial retry), topic; visible / data-only / high-priority / time-sensitive / actionable; per-token results + `invalidTokens`; every FCM code classified (incl. real-FCM malformed-token answer); auth/payload/rate/timeouts typed
  - [x] SMTP (nodemailer): all transport/reply codes mapped (auth, quota 5.4.5, timeouts, network, 4xx temporary, 5xx, recipient refusals); ar/en templates (2FA, alert, report ready), HTML-escaped, https-only links
  - [x] dev (fake / Mailpit / dev Firebase `dryRun`) and prod (real adapters, shared store, no fakes/dryRun, SMTP auth) rules enforced at start-up; nothing hardcoded (constants + options)
  - [x] Keys never in git: repo-wide ignore for `*firebase-adminsdk*.json` / `*service-account*.json`; secret scan of the tree clean
- Tests: `cd wab-notifications && npm run verify` green: typecheck, lint, prettier, 200 unit tests (coverage 100 % functions / 100 % lines / 98 % branches, gate 100/95/95), build (ESM + CJS + d.ts), package smoke (require + import), loop test (500 flows, 20 concurrent, failures injected). Real FCM check (`npm run smoke`) against the dev project `wab-dev-397ab`: credentials OK, fake token → `INVALID_TOKEN`, topic dry-run OK.
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) - FOUND AND FIXED: package smoke caught wrong `exports` file names; real FCM showed `invalid-argument` is also the answer for a malformed token (now `INVALID_TOKEN`, not a payload error) and that FCM's default HTTP/2 transport cannot use a proxy (`httpAgent` + `legacyHttpTransport` options). NOT verified: real SMTP send (no Mailpit/Gmail in the sandbox), the prod Firebase key (provided, deliberately not used), end-to-end push to a real device. NNF-01 latency not benchmarked. DIGEST (NOT-09) is left to the caller. Both service-account keys were pasted in chat: rotate if the transcript is not private.
- Next: wire the SDK into WAB-Server (`NOTIFIER_PROVIDER=real`), then the next SDK (suggested: `wab-storage`).

### T-123 — Wire `wab-notifications` into WAB-Server (`NOTIFIER_PROVIDER=real`)

- Project: `WAB-Server/` (`src/providers/notifier/real.ts`, `src/providers/index.ts`, `src/config/*`, `src/server.ts`, `scripts/ensure-sdks.cjs`, Dockerfile/compose)
- Branch: `claude/busy-johnson-2rch94` (PR #129)
- Status: IN REVIEW
- Acceptance criteria (BE-21 push, admin email alerts; server rules §2 externals behind interfaces, §5 no hardcoding, §8 provider errors):
  - [x] `file:../wab-notifications` dependency; `ensure-sdks` builds it when `dist` is missing (pre-build/typecheck/test)
  - [x] Env keys FCM_*/SMTP_*/EMAIL_FROM_*; `real` notifier without credentials fails at startup naming keys only; SMTP user/pass together; `.env.example` updated
  - [x] Adapter: ioredis -> idempotency store, pino bridge, SDK errors -> 502/503 `ExternalServiceError`, caller errors -> `RangeError`; closed on shutdown
  - [x] Docker image builds from repo root with both packages (not executable here)
- Tests: `npm test` 2420 (after fixing one older test env); lint/format/typecheck/build green; audit 0; `tests/notifierReal.test.ts` (16) + config/docker tests
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) - NOT verified: real SMTP send (App Password pending), Docker build (no daemon). API docs: no change.

### Pending (next)

- T-003 — Per-project rules for the remaining folders (customer, merchant, admin, packages) — awaiting user input.
- SRV-026 — next server task after T-036 is merged (see `WAB-Server/docs/WAB_Server_Tasks.md`).
- INT-01 — Contracts v1 (`contracts/`) — first task of the roadmap.
