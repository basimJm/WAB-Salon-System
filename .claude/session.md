# WAB — Session Log

> Every task gets a block (template in `.claude/hooks.md` §3). Keep only the current and last few sessions here; move durable knowledge to `memory.md` and delete stale blocks.

## Current Session

- Started: 2026-10-12
- Goal: Set up repo-wide rules, roles, hooks, session and memory for Claude Code.

### Open / In Progress

- (none)

### Completed

> Older task blocks: `docs/history/session-archive.md` (not auto-loaded). Keep only the last 3 task blocks here.

### T-067 — ADM-031 Settings page (discovery, booking rules, OTP)

- Project: `WAB-Admin-Dashboard/` (`domain/settings/*`, `data/settings/RemoteSettingsRepository.ts`, `presentation/settings/*`, stateful mock settings, `locales/*/settings.json`, `routes.tsx` FEATURE_PAGES, test helper on the mock stack)
- Branch: `feat/adm-031-settings`
- Status: DONE
- Acceptance criteria (Admin Tasks ADM-031; PRD A28; BUSINESS_DOMAIN §10):
  - [x] `GET /settings` + `PUT /settings/{key}` (value + mandatory reason) through the generated contract; page shows the 15 core keys in three groups with effective value, default, "Changed/Default" badge and "Use default"
  - [x] Validation as you type (whole numbers, bounds, lists comma separated/sorted/no repeats) blocks saving; save asks for a reason, sends only changed keys, reloads, toasts; failures show the localized error with retry
  - [x] AR+EN labels for every key (test), phone single column / desktop grid, no horizontal scroll
- Tests: `sh scripts/gate.sh` all PASS (17 new tests; the page tests run the full stack page -> repository -> ApiClient -> HttpClient -> mock server); browser check dev-debug: 3 groups, 15 fields, no console errors, phone width 324 px single column
- Loops: 1/1 (user decision)
- Review: PASSED (SE ✔, Mobile N/A (web responsive ✔), Architect ✔, QA ✔) — DEVIATIONS: no e2e (user decision); ranges are sanity bounds (server validates structure only); DECISION: total JS budget raised 200 -> 280 KB gzip (entry 40 and chunk 80 unchanged) because the lazy module chunks of the whole backlog count in it; prod-release stayed within 200 until this task.
- Notes: ADM-032 adds the remaining key groups (alerts objects, grace days, retention...) to the same registry; sections for the three groups use `CORE_SETTING_GROUPS`.

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

### Pending (next)

- T-003 — Per-project rules for the remaining folders (customer, merchant, admin, packages) — awaiting user input.
- SRV-026 — next server task after T-036 is merged (see `WAB-Server/docs/WAB_Server_Tasks.md`).
- INT-01 — Contracts v1 (`contracts/`) — first task of the roadmap.
