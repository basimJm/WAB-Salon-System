# WAB — Session Log

> Every task gets a block (template in `.claude/hooks.md` §3). Keep only the current and last few sessions here; move durable knowledge to `memory.md` and delete stale blocks.

## Current Session

- Started: 2026-10-12
- Goal: Set up repo-wide rules, roles, hooks, session and memory for Claude Code.

### Open / In Progress

- (none)

### Completed

> Older task blocks: `docs/history/session-archive.md` (not auto-loaded). Keep only the last 3 task blocks here.

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

### T-062 — ADM-026 Transport-level mock with scenario switcher

- Project: `WAB-Admin-Dashboard/` (`data/mock/{mockTransport,mockRoute,fixtures,scenarios,messages}.ts`, `constants/mock.ts`, `ScenarioSwitcher`, container wiring)
- Branch: `feat/adm-026-transport-mock`
- Status: DONE
- Acceptance criteria (Admin Tasks ADM-026):
  - [x] Mock is a `fetch` replacement under the real `HttpClient`: same URLs, envelopes, error shapes, Accept-Language-localized messages (AR+EN)
  - [x] Fixtures built with `mockRoute(endpoint, ...)`, typed by the generated contract; test checks every route exists in the contract and validates through `ApiClient`
  - [x] Scenarios success / empty / validation / 401 / 403 / 404 / 409 / 422 / 500 / timeout / slow, switchable at runtime by a dev-only select
  - [x] Compiled out of prod: `__ALLOW_MOCK__` gate, dev-only locale strings; prod bundles contain no mock code or text (checked)
- Tests: `sh scripts/gate.sh` all PASS (18 new unit tests); browser check on dev-debug: switcher present with 11 options, no horizontal scroll
- Loops: 1/1 (user decision)
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — DEVIATION: no e2e (user decision). `MockAuthRepository` still exists; moving login onto transport fixtures belongs to ADM-030 (auth module).
- Notes: Branch name differs from the backlog row (`feat/adm-026-mock-transport`).

### Pending (next)

- T-003 — Per-project rules for the remaining folders (customer, merchant, admin, packages) — awaiting user input.
- SRV-026 — next server task after T-036 is merged (see `WAB-Server/docs/WAB_Server_Tasks.md`).
- INT-01 — Contracts v1 (`contracts/`) — first task of the roadmap.
