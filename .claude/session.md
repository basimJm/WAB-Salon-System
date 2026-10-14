# WAB — Session Log

> Every task gets a block (template in `.claude/hooks.md` §3). Keep only the current and last few sessions here; move durable knowledge to `memory.md` and delete stale blocks.

## Current Session

- Started: 2026-10-12
- Goal: Set up repo-wide rules, roles, hooks, session and memory for Claude Code.

### Open / In Progress

- (none)

### Completed

> Older task blocks: `docs/history/session-archive.md` (not auto-loaded). Keep only the last 3 task blocks here.

### T-060 — ADM-024 Typed API client (endpoint registry)

- Project: `WAB-Admin-Dashboard/` (`data/api/{endpoint,ApiClient,idempotency,queryKeys}.ts`, `HttpClient` headers + list query values, `Container.api`, `docs/HOW_TO_ADD_A_MODULE.md`, `tests/api-client.test.ts`)
- Branch: `feat/adm-024-endpoint-client`
- Status: DONE
- Acceptance criteria (Admin Tasks ADM-024):
  - [x] `defineEndpoint(OPERATIONS.x, {data, body?, query?})` ties a generated operation to its generated schemas and throws when they disagree with the contract flags; paths come only from the contract; `buildPath` fills and encodes `{params}`
  - [x] `ApiClient.execute/executePage`: body and query checked before sending (failure = `AppError` validation with `body.<field>` details, nothing fetched), list query values sent as repeated parameters, caller `signal` passed (unmount aborts), response validated, `executePage` = items + meta (missing meta = contract break)
  - [x] Server `details[]` and `traceId` reach the UI as before (`fieldErrorsFrom`, ErrorState shows the trace id); `queryKey(endpoint, args)` stable key factory; `idempotent` endpoints send a fresh `Idempotency-Key`
- Tests: `sh scripts/gate.sh` all PASS (23 new unit tests); no UI change so no browser/e2e run
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — OPEN ITEM for the server owner: the admin OpenAPI defines no `Idempotency-Key` header yet.

### T-061 — ADM-025 Session lifecycle (refresh, idle timeout)

- Project: `WAB-Admin-Dashboard/` (`app/sessionManager.ts`, `domain/auth/sessionRules.ts`, `HttpClient` refresh-once, `useIdleTimeout`, `IdleWarningDialog`, mock/remote auth `refresh`/`logout`)
- Branch: `feat/adm-025-session`
- Status: DONE
- Acceptance criteria (Admin Tasks ADM-025):
  - [x] Single-flight token refresh before expiry and once after a 401; failed refresh ends the session with reason `expired`
  - [x] Idle timeout 30 min with a 60 s warning (stay / sign out); sign-out revokes the refresh token; login shows why the session ended
  - [x] Gallery shows the idle dialog (coverage guard)
  - [x] e2e / browser check skipped on the user's instruction
- Tests: `sh scripts/gate.sh` all PASS (session 33, session-http 8, idle 11 new unit tests)
- Loops: 1/1 (user decision 2026-10-14: one loop is enough; e2e and full browser matrix skipped on request)
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — DEVIATION: no e2e, no in-browser check for this task (user stopped them); covered by 52 unit tests and the green gate.
- Notes: split `session.test.ts` (>300 lines) into `session-http.test.ts`; data-layer tests now pass a refresh token to `logout`.

### Pending (next)

- T-003 — Per-project rules for the remaining folders (customer, merchant, admin, packages) — awaiting user input.
- SRV-026 — next server task after T-036 is merged (see `WAB-Server/docs/WAB_Server_Tasks.md`).
- INT-01 — Contracts v1 (`contracts/`) — first task of the roadmap.
