# WAB — Session Log

> Every task gets a block (template in `.claude/hooks.md` §3). Keep only the current and last few sessions here; move durable knowledge to `memory.md` and delete stale blocks.

## Current Session

- Started: 2026-10-12
- Goal: Set up repo-wide rules, roles, hooks, session and memory for Claude Code.

### Open / In Progress

- (none)

### Completed

> Older task blocks: `docs/history/session-archive.md` (not auto-loaded). Keep only the last 3 task blocks here.

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

### T-063 — ADM-027 Realtime client, invalidation bus, live indicator

- Project: `WAB-Admin-Dashboard/` (`domain/realtime`, `data/realtime/*`, `constants/realtime.ts`, `useRealtime*` hooks, `LiveIndicator`, container, `scripts/lib/budget.ts`)
- Branch: `feat/adm-027-realtime`
- Status: DONE
- Acceptance criteria (Admin Tasks ADM-027):
  - [x] `RealtimeClient` interface; Socket.IO implementation on `/admin` with the token in `auth.token`, re-read on every reconnect; `UNAUTHORIZED`/`FORBIDDEN` connect errors stop retrying and report `denied`; backoff with jitter from constants
  - [x] Fake emitter for mock mode (compiled out of prod); real client is a lazy chunk (`socket.io-client` added)
  - [x] Invalidation bus: each server event marks the matching cached queries stale (rules in constants, test checks every rule names a real operation)
  - [x] `useRealtime(event, handler)`, `useRealtimeStatus`, connection follows sign-in/out; "مباشر/Live" indicator in the top bar (AR+EN)
  - [x] Budget script excludes mock-only chunks from the size budget and bans them from prod builds
- Tests: `sh scripts/gate.sh` all PASS (17 new unit tests incl. a mocked socket.io client); browser check dev-debug: after sign-in the top bar shows Live (green), no horizontal scroll
- Loops: 1/1 (user decision)
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — DEVIATION: no e2e (user decision); not run against a real server socket. Only `booking.updated` and `alert.created` are emitted by the server today (G10).
- Notes: Dependency added: `socket.io-client` 4.8.

### Pending (next)

- T-003 — Per-project rules for the remaining folders (customer, merchant, admin, packages) — awaiting user input.
- SRV-026 — next server task after T-036 is merged (see `WAB-Server/docs/WAB_Server_Tasks.md`).
- INT-01 — Contracts v1 (`contracts/`) — first task of the roadmap.
