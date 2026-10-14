# WAB — Session Log

> Every task gets a block (template in `.claude/hooks.md` §3). Keep only the current and last few sessions here; move durable knowledge to `memory.md` and delete stale blocks.

## Current Session

- Started: 2026-10-12
- Goal: Set up repo-wide rules, roles, hooks, session and memory for Claude Code.

### Open / In Progress

- (none)

### Completed

> Older task blocks: `docs/history/session-archive.md` (not auto-loaded). Keep only the last 3 task blocks here.

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

### T-064 — ADM-028 List state in the URL

- Project: `WAB-Admin-Dashboard/` (`domain/shared/listState.ts`, `presentation/controllers/useListController.ts`, `constants/ui.ts`, `docs/HOW_TO_ADD_A_MODULE.md`)
- Branch: `feat/adm-028-url-list-state`
- Status: DONE
- Acceptance criteria (Admin Tasks ADM-028; PRD §3 saved filter in URL):
  - [x] Page, page size (10/25/50/100), search, sort and multi-value filters parsed from and written to the query string; invalid/unknown values fall back to defaults; defaults are left out; equal states give equal URLs
  - [x] `useListController(options)`: search debounced 500 ms and written with `replace`; page/sort/filter changes are history entries; any change except the page restarts at page 1; the box follows URL changes (back/forward, pasted link, clear all) without a stale debounce undoing them
- Tests: `sh scripts/gate.sh` all PASS (22 new unit tests incl. back navigation); no screen uses it yet, so no browser check
- Loops: 1/1 (user decision)
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — DEVIATION: no e2e/browser check (no UI mounted; user decision). Mapping state -> API query parameter names is left to each feature (server names differ).
- Notes: pass the options object as a module-level constant.

### Pending (next)

- T-003 — Per-project rules for the remaining folders (customer, merchant, admin, packages) — awaiting user input.
- SRV-026 — next server task after T-036 is merged (see `WAB-Server/docs/WAB_Server_Tasks.md`).
- INT-01 — Contracts v1 (`contracts/`) — first task of the roadmap.
