# WAB — Session Log

> Every task gets a block (template in `.claude/hooks.md` §3). Keep only the current and last few sessions here; move durable knowledge to `memory.md` and delete stale blocks.

## Current Session

- Started: 2026-10-12
- Goal: Set up repo-wide rules, roles, hooks, session and memory for Claude Code.

### Open / In Progress

- (none)

### Completed

> Older task blocks: `docs/history/session-archive.md` (not auto-loaded). Keep only the last 3 task blocks here.

### T-068 — ADM-032 Settings: every remaining key group

- Project: `WAB-Admin-Dashboard/` (`domain/settings/registry.ts`, `useSettingsDraft`, `SettingsPage` tabs, `constants/settings.ts`, settings locales, mock defaults)
- Branch: `feat/adm-032-settings-other`
- Status: DONE
- Acceptance criteria (Admin Tasks ADM-032; PRD A28; BUSINESS_DOMAIN §10):
  - [x] All editable §10 keys: admin sign-in lock, token lifetimes, account-deletion grace, subscription trial/warning, refund retries/alert delay, reviews, page sizes, uploads limits, alert thresholds (payment-failure object edited member by member and saved as one value that keeps the other members), tabs "Booking and verification / Accounts and security / Limits and alerts"; time zone and currency shown read-only
  - [x] A test keeps the registry equal to the server defaults list, row ids unique, every group in a tab with AR+EN labels
- Tests: `sh scripts/gate.sh` all PASS (20 settings tests); browser check dev-debug: 3 tabs with 16 / 10 / 13 fields (39 rows), no horizontal scroll
- Loops: 1/1 (user decision)
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — DEVIATIONS: no e2e (user decision). NOT BUILT because the server has no setting for them: alert RECIPIENTS and the payout frequency NOTE (Admin PRD A28) — open items for the server owner (new keys or endpoints needed); app versions and maintenance belong to ADM-034.
- Notes: the "Changed/Default" badge now compares with the default value (it is per row; object settings have one flag for the whole key).

### T-069 — ADM-033 Locations: countries, cities, areas

- Project: `WAB-Admin-Dashboard/` (`domain/locations`, `data/locations/RemoteLocationsRepository.ts`, `presentation/locations/*`, mock `locationsRoutes`, nav children under Settings, locales)
- Branch: `feat/adm-033-locations`
- Status: DONE
- Acceptance criteria (Admin Tasks ADM-033; PRD A28 locations):
  - [x] Three pages (`/settings/countries|cities|areas`) with server-paginated lists, parent filter (country for cities, city for areas), create/edit in a side panel (names ar+en, sort order, active switch, mandatory reason); no delete (switch off with `active=false`); country code/dial code/flag/phone regex; parent chosen at creation only
  - [x] Typed through the generated contract; AR+EN; list state in the URL (ADM-028)
- Tests: `sh scripts/gate.sh` all PASS (7 page tests through the full mock stack); browser check dev-debug: all three pages load their rows, no horizontal scroll
- Loops: 1/1 (user decision)
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — DEVIATION: no e2e (user decision). SERVER DEFECT to report: the OpenAPI pattern for area `cityId` is `"^[a-f0-9]{24}$/i"` (flag inside the string) so no real id matches; the repository overrides that one schema with a correct id pattern.
- Notes: `ChildLocationPage` carries an inline `hardcoded-ok` marker (a TypeScript generic is read as JSX text by the scanner).

### Pending (next)

- T-003 — Per-project rules for the remaining folders (customer, merchant, admin, packages) — awaiting user input.
- SRV-026 — next server task after T-036 is merged (see `WAB-Server/docs/WAB_Server_Tasks.md`).
- INT-01 — Contracts v1 (`contracts/`) — first task of the roadmap.
