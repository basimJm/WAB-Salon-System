# WAB — Session Log

> Every task gets a block (template in `.claude/hooks.md` §3). Keep only the current and last few sessions here; move durable knowledge to `memory.md` and delete stale blocks.

## Current Session

- Started: 2026-10-12
- Goal: Set up repo-wide rules, roles, hooks, session and memory for Claude Code.

### Open / In Progress

- (none)

### Completed

> Older task blocks: `docs/history/session-archive.md` (not auto-loaded). Keep only the last 3 task blocks here.

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

### Pending (next)

- T-003 — Per-project rules for the remaining folders (customer, merchant, admin, packages) — awaiting user input.
- SRV-026 — next server task after T-036 is merged (see `WAB-Server/docs/WAB_Server_Tasks.md`).
- INT-01 — Contracts v1 (`contracts/`) — first task of the roadmap.
