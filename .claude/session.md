# WAB — Session Log

> Every task gets a block (template in `.claude/hooks.md` §3). Keep only the current and last few sessions here; move durable knowledge to `memory.md` and delete stale blocks.

## Current Session

- Started: 2026-10-12
- Goal: Set up repo-wide rules, roles, hooks, session and memory for Claude Code.

### Open / In Progress

- (none)

### Completed

> Older task blocks: `docs/history/session-archive.md` (not auto-loaded). Keep only the last 3 task blocks here.

### T-065 — ADM-029 API-consumption doc generator

- Project: `WAB-Admin-Dashboard/` (`scripts/{docs-api.ts,lib/apiDoc.ts,api-exemptions.json}`, `docs/API_CONSUMED.md`, `package.json` scripts, `verify`)
- Branch: `feat/adm-029-api-doc`
- Status: DONE
- Acceptance criteria (Admin Tasks ADM-029):
  - [x] `npm run docs:api` writes `docs/API_CONSUMED.md`: every contract operation with its id, planned task (Appendix A), implementing source files (`OPERATIONS.<id>` uses outside generated/mock code) and status
  - [x] `npm run docs:api:check` (part of `verify`) fails when the file is stale, when an operation has no task, no code consumer and no exemption, or when an exemption names no operation
- Tests: `sh scripts/gate.sh` all PASS (6 new unit tests); script/docs only, no UI
- Loops: 1/1 (user decision)
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — 116 operations, 0 implemented yet (login still uses hand-written endpoints until ADM-030). Rerun `npm run docs:api` after any task that consumes an operation, or `verify` fails as stale.

### T-066 — ADM-030 Auth module on the real contract

- Project: `WAB-Admin-Dashboard/` (`domain/auth`, `data/auth/RemoteAuthRepository.ts` on `ApiClient`, `Endpoint.noRefresh`, `useLoginController`, `OtpStep`, `.dependency-cruiser.cjs`, tests)
- Branch: `feat/adm-030-auth`
- Status: DONE
- Acceptance criteria (Admin Tasks ADM-030; PRD §4; SRV-030/031):
  - [x] Login/verify-otp/refresh/logout use the generated operations and DTOs through `ApiClient` (body and response validated); session-less calls never trigger a token refresh (`noRefresh`)
  - [x] Step 1 returns `{otpRequired, expiresAt, resendAfterSeconds}`; step 2 sends `{email, code}`; resend = repeating step 1 with the password kept in memory only while the code step is open (cleared on success/back); resend timer uses the server's seconds
  - [x] Old assumed contract removed (`challengeId`, `resend-otp`, `constants/endpoints.ts`); wrong code / lockout / rate limit show the localized error catalog messages
- Tests: `sh scripts/gate.sh` all PASS (login, data-layer, session, idle tests migrated); browser check dev-debug: code step shows Resend in 1:00, wrong code shows the validation alert, correct code signs in and shows Live
- Loops: 1/1 (user decision)
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — DEVIATION: no e2e (user decision); mock mode still uses `MockAuthRepository` (updated to the new shape) instead of auth fixtures on the transport mock — moving it is a small follow-up; `data/api` and `data/realtime` added to the shared data dirs of the layer rules.
- Notes: Admin display name is the email (the API has no name field).

### Pending (next)

- T-003 — Per-project rules for the remaining folders (customer, merchant, admin, packages) — awaiting user input.
- SRV-026 — next server task after T-036 is merged (see `WAB-Server/docs/WAB_Server_Tasks.md`).
- INT-01 — Contracts v1 (`contracts/`) — first task of the roadmap.
