# WAB-Mobile-Salon — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next merchant`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Scaffolded (MER-001) with `KMP_TEMPLATE` from the customer app: all modules, design system + Liquid Glass, sample feature; rules copied in MER-003 (until then `WAB-Mobile-Customer/CLAUDE.md` applies).
- Consumes `/merchant/v1` (merchant contract 1.3.0: dashboard, reviews, statistics, my account consumed by MER-050/042/043/049); MER-004 Firebase registrations = owner.
- Real-time booking requests: socket + FCM data message, Android overlay / iOS time-sensitive actions (MER-012, MER-028…030).

## Current task

### MER-054 — Dev builds on the remote dev API: gap list, socket events, permission filtering
- Branch: `feat/mer-054-remote-dev`
- Branched: (from `origin/merchant`)
- Status: IN PROGRESS
- Acceptance criteria (backlog MER-054; contract `openapi.merchant.json` 1.3.0; BUSINESS_DOMAIN §6 permissions / branch scope, §7 rooms + events, §11 codes; customer CUS-060 pattern):
  - [x] Dev builds `remote` on Android (`DEV_DATA_SOURCE`) and iOS (`Dev.xcconfig` `DATA_SOURCE`), same host (`test_dev_remote_config.py`); prod stays remote
  - [x] Real responses for 87 / 94 operations the app calls (+ 9 related) in `core/data/fixtures/remote` (`capture_remote_fixtures.py` + `capture_flows.py` + `capture_edits.py`: public GETs from the hosted dev API, the rest from the local stack on throwaway records; tokens / signed URLs redacted); the 7 not capturable are listed (gap #12)
  - [x] `contract_gaps.py` (allOf merged): 0 breaking gaps, 6 undeclared fields; `api_sync.py` embeds captures in `MockFixtures` (+ `captured`) and generates `ContractDecoders` (nullable `data` → `T?`); `ContractFixturesTest` + per-feature `Real*Fixture(s)Test`
  - [x] Socket events and permission filtering verified on the local stack (owner / Khalda manager / Khalda employee / other salon; 26 REST probes all as expected, `realtime_probe.mjs`)
  - [x] Client gaps fixed: M09 policy snapshot shown as rules (`PolicyTerms` + `policyRuleText`, strings moved to the design system), duplicate socket deliveries (`withoutEchoes`), mock config fixture not in maintenance
  - [x] `docs/REMOTE_DEV_GAPS.md` (15 rows: fixed / verified / server-side / open)
- Tests: `ContractFixturesTest` (4), `RealCoreFixturesTest` (2), `Real{Bookings 4, Team, Salon, Finance, Insights, Notifications, Application, Auth, Dashboard, Account 2}`, `PolicyTermsTest` (3), `RealtimeEchoesTest` (3), `BookingSignalsTest` (+1), `test_contract_gaps.py` (7), `test_api_sync.py` (+3), `test_dev_remote_config.py` (3); `./gradlew testAndroidHostTest` all modules 177 suites / 574 tests / 0 failures; policy `all: ok`; policy-script tests 99 OK; `api_sync --check` ok
- Loops: 1/1 — re-checked every criterion against the capture reports (full run: 177 calls; checks-only run: 113 calls, 26/26 probes), the socket log and the host-test run; found and fixed during the loop: wrong probe expectations (ALREADY_HANDLED is 422, a manager's other-branch list is an empty 200, a main-branch booking is 404 for the manager, the branch request was booked on the wrong branch), nullable `data` decoders, two lines over 140
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — four-role reading of the diff: capture tools refuse non-local hosts for proofs and never send tokens to the hosted API; no hardcoded URL in app code (config only); the policy refactor moves enums / rules to core/domain and the text to the design system without behaviour change for M19 (salon tests green); echo filter per collection with a 1 s window (reassignment later still refreshes); AR + EN for the moved strings. DEVIATIONS: only host unit tests + policy ran (no detekt, no Android / iOS builds, no emulator / simulator: the lead runs the full gate, disk is tight); the hosted dev API was only read unauthenticated (authenticated flows verified on the local stack with the same server code); 7 operations not captured (gap #12); throwaway records left on the local QA stack (gap #14).
- Notes: server-side items for the owner: merchant `maintenance.enabled = true` on the hosted dev API (#8), spec of `POST /salon/applications` member (#9), branch-close message (#10), ObjectId patterns (#11).

### MER-049 — More M25 part 2: my account, push switch, delete my account
- Branch: `feat/mer-049-my-account`
- Branched: (from `feat/mer-043-statistics`)
- Status: IN REVIEW
- Acceptance criteria (PRD M25, §14 `delete_request`; operations `GET/PATCH /me`, `POST /auth/change-phone`, `PATCH /installations/push-enabled`, `POST /me/leave`, `POST /salon/deletion-request`):
  - [x] `feature/more` gets its domain (`MyAccount`, `PhotoChange`, `AccountRepository`, name rules 1..50) and data (`AccountApi`, PATCH body built as JSON so `photoKey: null` removes the photo; hand fixtures for `/me` and change-phone because the generated one is `data: null`)
  - [x] More header shows the member's photo and opens My account (`Screen.MyAccount`): photo (pick → 1:1 crop → MEMBER_PHOTO upload, remove), first / last name, phone (read-only) + "Change phone" sheet (country + number validated by the server regex) → OTP to the new number (purpose CHANGE_PHONE) → back on resume the proof is used once for `POST /auth/change-phone` (409 `PHONE_ALREADY_REGISTERED` shown localized), role badge; save only when changed; the session's first name follows the server
  - [x] Push switch is now the server's (`PATCH /installations/push-enabled`, optimistic, rolled back with an error banner); More reads `/me` on open and aligns the local switch
  - [x] Delete my account: members confirm "Remove my access" → `POST /me/leave` → everything cleared (`SessionStore.clearAll`) → login; the owner gets a sheet explaining WAB will contact them, optional note (≤ 500) → `POST /salon/deletion-request` → "Request sent on {date}"; `delete_request` (kind) tracked and added to the required PRD events
- Tests: `AccountTest` (1), `AccountMapperTest` (2), `MyAccountViewModelTest` (2), `MoreViewModelTest` (+2 push rollback, deletion / leave); more + composeApp host tests green; policy ok
- Loops: 1/1 — batch 12 run (MER-050, 042, 043, 049): policy ok, `testAndroidHostTest` all modules 163 suites / 547 tests / 0 failures (after fixing `BookingMappersTest` for the new required `requestedAt`); full gate `scripts/ci/run_local_checks.sh`: policy tests (86) + checks, contract, detekt (0 after wrapping 17 long lines and the `MoreDependencies` parameter count), unit tests + 4 Android variants + lint green, iOS Debug-Dev / Release-Dev green; the machine's disk filled during Debug-Prod, so Debug-Prod, Release-Prod and the Kotlin/Native tests were re-run one by one after removing this worktree's build outputs: all green; criteria re-checked against the diff
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch 12 code reading of the four commits: one call per screen, permission-gated blocks hidden (not disabled), owner-only branch filters, AR + EN for every key, tokens only, files < 300 lines, mock fixtures for every new endpoint; fixed during review: contract regeneration broke a bookings mapper test, detekt findings. DEVIATION: UI not exercised on emulator / simulator (rules §3.13 end-of-backlog journey); no screen previews (feature modules have none).
- Notes: the owner never calls `/me/leave` (the button sends the deletion request instead), so `LAST_OWNER` cannot come from the UI.

### MER-043 — Statistics M21
- Branch: `feat/mer-043-statistics`
- Branched: (from `feat/mer-042-reviews`)
- Status: IN REVIEW
- Acceptance criteria (PRD M21, §14 `statistics_view`; operation `GET /statistics?from&to&branchId` (STATISTICS_VIEW, civil days, max 92); design 07 `on.stats`):
  - [x] `Screen.Statistics` in `feature/insights`; salon hub tile STATISTICS registered; Home quick stats "View all" opens it (STATISTICS_VIEW only)
  - [x] Period selector Today / Week (Saturday-first) / Month / Custom (from / to pickers, ordered, at most 92 days, never after today, Asia/Amman dates); owner branch switcher (`?branchId=`)
  - [x] KPIs: bookings, approval / cancellation / no-show rates (percent, one decimal, "—" when null), average response minutes, bride bookings, profile views, new reviews, average rating; revenue card (total, online, at salon, JOD); bookings by status
  - [x] Charts: bookings per day / revenue per day (switch), one bar per day scaled to the busiest day, day numbers up to 14 days, a11y description per bar; rankings: top services (bookings), top staff (bookings, rating)
  - [x] Shimmer, "No data for this period" empty state, error + retry, pull-to-refresh (a failed refresh keeps the figures); `statistics_view` (period, days) per load, `statistics_chart`; mock fixture with a full week
- Tests: `StatisticsTest` (3), `StatisticsMapperTest` (2), `StatisticsViewModelTest` (2), `HomeViewModelTest` (updated: statistics link + permission); insights + home + salon + composeApp host tests green; policy ok
- Loops: 1/1 — batch 12 run (MER-050, 042, 043, 049): policy ok, `testAndroidHostTest` all modules 163 suites / 547 tests / 0 failures (after fixing `BookingMappersTest` for the new required `requestedAt`); full gate `scripts/ci/run_local_checks.sh`: policy tests (86) + checks, contract, detekt (0 after wrapping 17 long lines and the `MoreDependencies` parameter count), unit tests + 4 Android variants + lint green, iOS Debug-Dev / Release-Dev green; the machine's disk filled during Debug-Prod, so Debug-Prod, Release-Prod and the Kotlin/Native tests were re-run one by one after removing this worktree's build outputs: all green; criteria re-checked against the diff
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch 12 code reading of the four commits: one call per screen, permission-gated blocks hidden (not disabled), owner-only branch filters, AR + EN for every key, tokens only, files < 300 lines, mock fixtures for every new endpoint; fixed during review: contract regeneration broke a bookings mapper test, detekt findings. DEVIATION: UI not exercised on emulator / simulator (rules §3.13 end-of-backlog journey); no screen previews (feature modules have none).
- Notes: the bars are drawn with plain boxes (no chart library added); in RTL the days run right to left like the rest of the layout.
