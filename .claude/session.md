# WAB — Session Log

> Every task gets a block (template in `.claude/hooks.md` §3). Keep only the current and last few sessions here; move durable knowledge to `memory.md` and delete stale blocks.

## Current Session

- Started: 2026-10-12
- Goal: Set up repo-wide rules, roles, hooks, session and memory for Claude Code.

### Open / In Progress

- (none)

### Completed

> Older task blocks: `docs/history/session-archive.md` (not auto-loaded). Keep only the last 3 task blocks here.

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

### Pending (next)

- T-003 — Per-project rules for the remaining folders (customer, merchant, admin, packages) — awaiting user input.
- SRV-026 — next server task after T-036 is merged (see `WAB-Server/docs/WAB_Server_Tasks.md`).
- INT-01 — Contracts v1 (`contracts/`) — first task of the roadmap.
