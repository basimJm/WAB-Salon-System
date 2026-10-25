# WAB-Mobile-Salon — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next merchant`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Scaffolded (MER-001) with `KMP_TEMPLATE` from the customer app: all modules, design system + Liquid Glass, sample feature; rules copied in MER-003 (until then `WAB-Mobile-Customer/CLAUDE.md` applies).
- Will consume `/merchant/v1` (71 ops); 6 server gaps (SRV-129…134) block MER-042/043/049/050; MER-004 Firebase registrations = owner.
- Real-time booking requests: socket + FCM data message, Android overlay / iOS time-sensitive actions (MER-012, MER-028…030).

## Current task

### MER-061 — Branches contract, member scope, branch error codes
- Branch: `feat/mer-061-branches-contract`
- Branched: (batch 10 start, from `origin/merchant`)
- Status: IN REVIEW
- Acceptance criteria (BUSINESS_DOMAIN §3.3a, §6 branch scope, §11; `WAB-Server/.claude/Integration.md` "Salon branches contract" MER-061):
  - [x] `./gradlew apiSync` (`scripts/api_sync.py`) re-run: `SalonBranchesDtos`, per-branch hours / services, `branch` on bookings, `branchId` on team members and finance rows, `?branchId=` filters; `apiSyncCheck` ok; two positional DTO uses in tests fixed
  - [x] Session keeps the member's scope: `MemberProfile.branchId` (persisted `member_branch_id`, cleared on sign-out), `MemberProfile.scope` = `AllBranches` for the owner, `OneBranch(branchId)` for managers / employees; the refresh member reads an optional `branchId`
  - [x] `PermissionSet.isBranchMember`; `FINANCE_VIEW`, `SUBSCRIPTION_VIEW`, `POLICIES_MANAGE` never count for a branch member (`BranchPermissions.OWNER_SCOPE_ONLY`); MANAGER template = every grantable branch permission (§6); owner-only `BRANCHES_MANAGE` capability (locked row "Branches" in the permission editor)
  - [x] Error codes `BRANCH_NOT_FOUND`, `BRANCH_NOT_BOOKABLE`, `BRANCH_REQUIRED`, `BRANCH_LIMIT_REACHED`, `BRANCH_HAS_UPCOMING_BOOKINGS`, `LAST_BRANCH`, `BRANCH_SCOPE_DENIED` in `ErrorCode` + AR/EN text + handling action
- Tests: `BranchScopeTest` (4), `RefreshMemberTest` (+1), `DataStoreSessionStoreTest` (+1), `ErrorCodeTest` (updated), `PermissionsTest` / `MerchantTabsTest` (updated for the branch rule); all host tests green (`testAndroidHostTest`), policy ok
- Loops: 0/1
- Review: PENDING
- Notes: SERVER GAP — the contract's `MemberProfile` (login / refresh member) has no `branchId` yet (Integration.md says it should); the app parses it when present and otherwise relies on the server scoping every call to the member's branch (role ≠ OWNER = branch member). Gradle runs through the terminal panel (the sandbox cannot write `~/.gradle`).

### MER-030 — Real-time request outside the app, iOS
- Branch: `feat/mer-029-request-android`
- Branched: (shared with MER-029, owner request 2026-10-25 "and on iOS")
- Status: DONE (PR into `merchant`)
- Acceptance criteria (PRD M10 iOS; backlog MER-030):
  - [x] Notification category `BOOKING_REQUEST` registered from Kotlin in the app language (re-registered on language change): Accept (background, no app launch) and Reject (opens the app)
  - [x] Accept calls `POST /bookings/{id}/approve`; the outcome replaces the alert ("Booking accepted" / "handled by another team member" / "could not accept"); Reject and a tap open the booking (`/bookings/<id>` link) with the request sheet (reason picker); foreground pushes go to the in-app sheet (MER-028)
  - [x] Time-sensitive: `com.apple.developer.usernotifications.time-sensitive` entitlement (both entitlement files) + payload `interruption-level: time-sensitive`; sample payload `iosApp/PushSamples/booking_request.apns` + README (`xcrun simctl push booted com.fab.wab.merchant.dev …`)
  - [x] Simulator (iPhone 17 Pro): banner over the home screen, long-press shows قبول / رفض, Accept answered in the background ("تم قبول الحجز"), Reject opened the booking with the request sheet
- Tests: `BookingRequestPushTest` (2, shared payload helpers); iOS framework compile + Debug-Dev build green
- Loops: 1/1 — re-ran the simulator journey after the final build (push → actions → accept / reject)
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — Swift change limited to routing `didReceive` to Kotlin; payload keys shared with Android. DEVIATIONS: depends on MER-012 / MER-004 for real APNs delivery (tested with `simctl push` only); default sound (no custom request sound file yet); the Time Sensitive capability must be enabled on the App IDs (owner, store accounts); no notification service extension (not needed: the alert text comes from the server).

### MER-029 — Real-time request outside the app, Android
- Branch: `feat/mer-029-request-android`
- Branched: (from `origin/merchant`)
- Status: DONE (PR into `merchant`)
- Acceptance criteria (PRD M10 Android; backlog MER-029):
  - [x] One entry for every trigger (`OutsideBookingRequests.onPush` from FCM data messages, debug trigger): foreground → in-app sheet; background + still PENDING → overlay card over any app when "display over other apps" is granted, else heads-up notification
  - [x] Overlay (`TYPE_APPLICATION_OVERLAY` ComposeView with its own lifecycle, app theme / language): the M10 request card (shared `BookingRequestOverlayCard`), alert sound + vibration while shown, queue ("1 of 2") for requests arriving while open, Accept in place, Reject / View details open the booking (reason picker needs the app window), close = keep pending; `request_shown` channel `overlay`
  - [x] Heads-up: high-importance "booking requests" channel (ringtone, vibration), Accept (background broadcast → approve → outcome notification incl. "handled by another team member") and Reject / tap (booking link), full-screen intent for a locked phone (`USE_FULL_SCREEN_INTENT`); `request_shown` / `request_accept` channel `notification`
  - [x] Debug-only trigger (debug manifest): `adb shell am broadcast -a com.fab.wab.merchant.dev.DEBUG_BOOKING_REQUEST --es bookingId b1 -p com.fab.wab.merchant.dev`; mock mode marks the booking PENDING (`MockControls.markBookingPending`, inert on remote data)
  - [x] Emulator (Pixel 4): overlay over another app (AR RTL), Accept → "Booking accepted" card, Done closes; overlay permission denied → heads-up with قبول / رفض, Accept from the shade → "تم قبول الحجز"
- Tests: `BookingRequestPushTest` (2), `MockWorldTest` (+1 pending patch), `SwitchMockWorldUseCaseTest` (updated); batch run: policy ok, 472 host tests 0 failures, detekt 0, `assembleDevDebug` green
- Loops: 1/1 — re-checked each criterion on the emulator after the final build
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — platform code in `composeApp/androidMain` + `androidApp` wiring, card shared with the in-app sheet, no new dependency. DEVIATIONS: backlog dependency MER-012 (FCM token registration, ← MER-004 owner Firebase) not done — tested with the debug trigger, real FCM delivery is MER-056; Android 14+ may downgrade the full-screen intent to heads-up unless the user allows it; the overlay Reject opens the app instead of an in-overlay reason picker (a Compose bottom sheet cannot open in an overlay window).

### MER-058 — Performance pass (measurements)
- Branch: `feat/mer-058-performance`
- Branched: (from `origin/merchant` after PR #363 merged MER-002…057)
- Status: DONE (PR #364)
- Acceptance criteria (backlog MER-058; CLAUDE.md §6):
  - [x] R8 + size budget: `assembleDevRelease` / `assembleProdRelease` green; release APKs 10,557,606 / 10,557,570 bytes (≈ 10.1 MB) vs 62,914,560 budget (`policy_checks.py budget` ok); debug APK 37.6 MB for comparison
  - [x] Cold start (R8 dev release, debug-signed locally, Pixel 4 emulator, `am start -W -S`, 6 runs): 673 ms first after install, then 381 / 415 / 305 / 424 / 431 ms (median ≈ 415 ms); warm start 45 ms; the release build runs login → OTP → live bookings → details (no R8 serialization breakage)
  - [x] Frames while scrolling bookings + calendar (`dumpsys gfxinfo`, 101 frames): p50 17 ms, p90 19 ms, p99 34 ms, 0 slow UI-thread frames, legacy jank 3 % (emulator GPU)
  - [x] Image sizing: `AppImage` moved from `SubcomposeAsyncImage` (one subcomposition per image) to `AsyncImage` + state overlays (shimmer / fallback); decoding stays at the slot size from the constraints
  - [x] Lists: every lazy list has `key` + `contentType` (finance rows were missing `contentType`); `collectAsStateWithLifecycle` everywhere (no plain `collectAsState`); the calendar draws only the visible hour window (≤ 24 h × staff columns, no virtualisation needed)
- Tests: `ImagePhaseTest` (1); design-system + finance tests, design-system iOS compile, `assembleDevDebug` green; detekt 0; policy ok
- Loops: 1/1 — re-measured size and start on the final release build; re-ran the touched modules' tests and detekt after the image change
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — small change (AppImage loader, finance contentType) plus measurements; no new dependency. DEVIATIONS: measured on the emulator only (no physical device); no Macrobenchmark / baseline profile module (would add a new module and dependency, not in the backlog row); iOS start time not measured.
- Notes: the debug-signed release APK lives only in `/tmp` (no signing material committed).

### MER-057 — Accessibility and RTL QA pass (+ end-of-backlog gate)
- Branch: `feat/mer-057-a11y-rtl-qa`
- Branched: (from `feat/mer-053-deep-link-register`)
- Status: IN REVIEW (final batch verified; PR blocked on the gh `workflow` scope)
- Acceptance criteria (rules §3.13 end of backlog; backlog MER-057):
  - [x] Template `feature/sample` removed (module, Koin, navigation graph, `Screen.SampleDetails`, compose-app module list); CLAUDE.md reference = `feature/bookings`
  - [x] detekt clean with the empty baseline (was 435 findings across batches 2–9): long lines wrapped (string-aware script, then hand-fixed odd splits), every complex `handle` split into named sub-handlers (form / dialogs / …), shared mapper fields as private raw data classes, complex conditions extracted, Compose rules (modifier defaults and order, present-tense lambdas, single emitter, `rememberUpdatedState` in the load-more effect), `StaffSections.kt` split (< 300 lines)
  - [x] Full gate `scripts/ci/run_local_checks.sh` green on 106b09b8 (policy, detekt, unit tests, 4 Android variants + lint, 4 iOS configurations, K/N tests; SwiftLint not installed locally → skipped)
  - [x] Journey fixes (Pixel 4 emulator, AR/EN, light/dark, landscape, font 200 %): login crashed (navigation to the unregistered `Graph.Home`, now left to the launch router + new strict `navigation` policy); tab bar only on tab roots of the home route; headers below the status bar (`AppScreen` without top bar); bottom bars above the gesture bar; tab-bar inset on the four tab screens; Arabic hour labels cut (wider column); status-bar icons follow the app theme (`SystemBarsAppearance`); rail on the themed background; WhatsApp label / gallery add button wrapping; dev-only mock-world switcher (DEV chip: salon state + member preset, MER-007 UI entry)
  - [x] Emulator + simulator journey: Pixel 4 (AR + EN, light + dark, landscape rail, font 200 %) and iPhone 17 Pro (login → OTP → status → DEV switch → live bookings + tab bar); iOS double top inset fixed (status bar minus the cutout the root already pads); accessibility dump: no clickable target under 48 dp
  - [ ] TalkBack / VoiceOver run itself (not done: labels checked from the accessibility tree only)
- Tests: `PermissionCopyTest`, `SwitchMockWorldUseCaseTest`, `MerchantRootTabsTest` (+2), `test_navigation.py` (2); final run: policy ok, 86 policy-script tests, 468 host tests 0 failures, detekt 0, `assembleDevDebug` + iOS Debug-Dev build green; full gate green on 106b09b8
- Loops: 1/1 — re-checked every criterion after the journey fixes: detekt (2 new long lines in the switcher wrapped), host tests, policy, both platforms rebuilt and re-run on device
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — read the batch diff (205 files, mostly mechanical wrapping / handler splits, checked for behaviour change: bare-if entries before `else ->` wrapped, `return` → `return true` in sub-handlers); one justified `@Suppress`; mock switcher is inert outside mock builds (`MockControls.enabled`); navigation policy blocks the crash class found on device. Non-blocking: dev switcher labels are dev-only strings; the full gate was not re-run after the journey fixes (tests + detekt + both builds were).
- Notes: DEVIATIONS — TalkBack/VoiceOver not exercised (tree check only); no tablet AVD (landscape phone used for the rail); SwiftLint not installed locally; MER-058 (performance) not started.

### MER-053 — Deep link `/register` + App Links checklist
- Branch: `feat/mer-053-deep-link-register`
- Branched: (from `feat/mer-051-analytics-events`)
- Status: IN REVIEW (batch 9 verified; PR blocked on the gh `workflow` scope)
- Acceptance criteria (PRD §4.5, §16 #11; `DeepLinks`, Android `autoVerify` filter, iOS `applinks:` entitlement):
  - [x] The shell routes opened links (`DeepLinkEffect` in `MerchantShell`, store consumed once): `/register` for a guest → `Screen.Login(register = true)` (subtitle "Enter your mobile number to register your salon", Continue → registration OTP → M04); signed-in members ignore it (one phone = one salon); `/bookings/<id>` on the home route → M09 (notification links had no router before); other paths / hosts dropped
  - [x] `docs/DEEP_LINKS.md`: domain per environment (owner input), `assetlinks.json` (dev + prod packages, upload + Play signing fingerprints), `apple-app-site-association` (`/register`, `/bookings/*`), verification commands, customer CUS-056 fallback to the stores
- Tests: `MerchantDeepLinksTest` (2), `LoginViewModelTest` (+1); `/tmp/claude/quick.sh m53` auth + composeApp tests, `assembleDevDebug`, iOS framework link green; policy ok
- Loops: 1/1 — batch 9 run: policy ok, 84 policy-script tests (after fixing the import order of `test_analytics.py`), 465 host tests 0 failures, `assembleDevDebug` green
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch 9 code reading (MER-048/051/052/053; a batch of four: the remaining rows are blocked or end-of-backlog passes); checked: a refused `/auth/refresh` never re-triggers the permission refresh (it bypasses `safeApiCall`, 403 = sign-out). DEVIATION: UI check on emulator/simulator deferred to the end-of-backlog journey (rules §3.13).
- Notes: the merchant domain is still the template placeholder in prod (owner input); the hosted association files are owner/infra work.

### MER-051 — Analytics events of PRD §14
- Branch: `feat/mer-051-analytics-events`
- Branched: (from `feat/mer-052-error-codes`)
- Status: IN REVIEW (batch 9 verified; PR blocked on the gh `workflow` scope)
- Acceptance criteria (PRD §14):
  - [x] New strict policy `analytics` (`scripts/ci/policy/analytics.py`): every feature `*Screen` composable calls `TrackScreen` (screen_view, 29 screens), every `ACTION_*` event name is Firebase-safe (snake_case, ≤ 40), and the PRD events of the shipped features (`config/policy.json` `analytics.requiredEvents`, 16) are declared
  - [x] `request_shown` with `channel = in_app` (+ bride flag) once per request on the sheet; `request_accept` / `request_reject` carry `response_time_s` (sheet shown → answer) next to the reason
  - [x] `overlay_permission_result` (granted) once when the member returns from the system screen (More); `push_open` (server event, opens-a-screen flag) on a tapped system notification (`ShellAnalytics`)
- Tests: `test_analytics.py` (3; 84 policy-script tests OK), `BookingRequestsAnalyticsTest` (1), `MoreViewModelTest` (extended), `ShellAnalyticsTest` (1); `/tmp/claude/quick.sh m51` green; policy ok
- Loops: 1/1 — batch 9 run: policy ok, 84 policy-script tests (after fixing the import order of `test_analytics.py`), 465 host tests 0 failures, `assembleDevDebug` green
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch 9 code reading (MER-048/051/052/053; a batch of four: the remaining rows are blocked or end-of-backlog passes); checked: a refused `/auth/refresh` never re-triggers the permission refresh (it bypasses `safeApiCall`, 403 = sign-out). DEVIATION: UI check on emulator/simulator deferred to the end-of-backlog journey (rules §3.13).
- Notes: DEVIATION — "every UiAction maps to an event" is narrowed to every screen + the PRD event list: text-input actions carry no analytics value; `overlay` / `notification` request channels come with MER-029/030 (blocked on MER-004); `statistics_view`, `review_report`, `delete_request` belong to blocked tasks (MER-042/043/049).

### MER-052 — Error-code coverage + permission refusals
- Branch: `feat/mer-052-error-codes`
- Branched: (from `feat/mer-048-more`; backlog name `feat/mer-052-error-coverage`)
- Status: IN REVIEW (batch 9 verified; PR blocked on the gh `workflow` scope)
- Acceptance criteria (BUSINESS_DOMAIN §11; `openapi.merchant.json` error codes; PRD §3, §6 hidden-not-disabled):
  - [x] Every §11 code and every contract code is in `ErrorCode` with AR + EN `error_code_*` text and an `ErrorHandling` action (audited: 43 + UNKNOWN; enforced by the `error-codes` policy since MER-005)
  - [x] A `FORBIDDEN` / `PERMISSION_DENIED` answer from any call (`safeApiCall`) is reported to `PermissionDeniedSignals` (bursts collapse); the shell (`RealtimeAccountEvents`) re-fetches the permissions through `PermissionsSync`, so gated tabs, tiles and buttons hide; other codes and plain HTTP 403s do not trigger it
- Tests: `PermissionDeniedSignalsTest` (1), `SafeApiCallTest` (+1), `RealtimeAccountEventsTest` (+1); `/tmp/claude/quick.sh m52b` domain + network + composeApp tests + `assembleDevDebug` green; policy ok
- Loops: 1/1 — batch 9 run: policy ok, 84 policy-script tests (after fixing the import order of `test_analytics.py`), 465 host tests 0 failures, `assembleDevDebug` green
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch 9 code reading (MER-048/051/052/053; a batch of four: the remaining rows are blocked or end-of-backlog passes); checked: a refused `/auth/refresh` never re-triggers the permission refresh (it bypasses `safeApiCall`, 403 = sign-out). DEVIATION: UI check on emulator/simulator deferred to the end-of-backlog journey (rules §3.13).
- Notes: the refused screen itself shows the CONTACT error text; it disappears once the refreshed permissions remove its entry.

### MER-048 — More M25 part 1
- Branch: `feat/mer-048-more`
- Branched: (batch 9 start, from `feat/mer-047-notifications`)
- Status: IN REVIEW (batch 9 verified; PR blocked on the gh `workflow` scope)
- Acceptance criteria (PRD M25 part 1; `GET /content/pages/{slug}`, `GET /content/faqs`, config contact; design 08 `on.more`):
  - [x] New `feature/more` (More tab registered): account header (name, role badge), language toggle, dark mode, push toggle (stored preference), Android "Display over other apps" status + shortcut to the system screen (refreshed on resume; hidden on iOS), alert sound test (`RequestAlert`), notifications inbox entry
  - [x] Support & legal: Contact WAB (shared contact sheet), FAQ, Terms, Privacy, About; log out with confirmation (`LogoutUseCase`: server revoke, session cleared whatever it answers → login); app version + code
  - [x] `feature/content` ported from the customer app (content pages by slug, the config-driven contact page, FAQ) — `Screen.ContentPage` was navigated to from login without a destination before
  - [x] Core `OverlayPermission` port (Android `canDrawOverlays` + `ACTION_MANAGE_OVERLAY_PERMISSION` with an app-settings fallback; iOS `NoOverlayPermission`) and `SYSTEM_ALERT_WINDOW` in the manifest
- Tests: `MoreViewModelTest` (2) + ported content tests (6); `/tmp/claude/quick.sh m48` green; policy ok
- Loops: 1/1 — batch 9 run: policy ok, 84 policy-script tests (after fixing the import order of `test_analytics.py`), 465 host tests 0 failures, `assembleDevDebug` green
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch 9 code reading (MER-048/051/052/053; a batch of four: the remaining rows are blocked or end-of-backlog passes); checked: a refused `/auth/refresh` never re-triggers the permission refresh (it bypasses `safeApiCall`, 403 = sign-out). DEVIATION: UI check on emulator/simulator deferred to the end-of-backlog journey (rules §3.13).
- Notes: my-account photo / phone / change phone / delete account are MER-049 (blocked on SRV-129 / SRV-133); the push toggle is a local preference until the server toggle exists (SRV-133).

### MER-047 — Notifications M24
- Branch: `feat/mer-047-notifications`
- Branched: (from `feat/mer-046-subscription`)
- Status: IN REVIEW (batch 8 verified; PR blocked on the gh `workflow` scope)
- Acceptance criteria (PRD M24; operations `GET /notifications` (page, from, to, q), `GET /notifications/unread-count`, `POST /notifications/read`):
  - [x] `feature/notifications` ported from the customer app (same pattern, as the PRD asks): paginated list, title, body, relative time, read / unread with read-on-visible (once each, failures roll back), filter sheet (date range + search, chips), realtime refresh, popup on tap
  - [x] Merchant tap routing (`Notification.target()`): booking id → M09, `application.*` → M05, `catalog_request.*` → M16 requests, `payout.*` / `refund.*` → M22, `subscription.*` → M23; the popup shows "View booking" / "Open" only when there is a target
  - [x] `Screen.Notifications` registered (opened from More, MER-048); search hint made generic
- Tests: `NotificationTargetTest` (1) + ported `RelativeTimeTest` (2), `NotificationsApiTest` (3), `NotificationsViewModelTest` (6); `/tmp/claude/quick.sh m47` green; policy ok
- Loops: 1/1 — batch 8 run: policy ok, 81 policy-script tests, 449 host tests 0 failures, `assembleDevDebug` green
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch 8 code reading; no blocking finding. DEVIATION: UI check on emulator/simulator deferred to the end-of-backlog journey (rules §3.13).
- Notes: `review.*` opens nothing until the reviews screen (MER-042 ← SRV-131); the unread count badge has no host yet (Home MER-050 is blocked), More shows the entry.

### MER-046 — Subscription & status M23
- Branch: `feat/mer-046-subscription`
- Branched: (from `feat/mer-045-bank-details`)
- Status: IN REVIEW (batch 8 verified; PR blocked on the gh `workflow` scope)
- Acceptance criteria (PRD M23; operation `GET /subscription`, config contact; design 08 `on.sub`, `sh.contact`):
  - [x] Salon state card (Live / Offline / Incomplete with its meaning), subscription card (Free trial / Monthly plan active / Expired, badge, days left in AR plurals, ends / renews / expired date, "ending soon")
  - [x] "Subscriptions are paid outside the app" + CTA by status (activate / renew / contact), "Get featured in Recommended Salons" → Contact WAB with its note; contact channels (call / WhatsApp / email) from the server config, each hidden when missing; pull-to-refresh; hub tile SUBSCRIPTION registered
  - [x] Shared design-system `AppContactSheet` (reused by More, MER-048)
- Tests: `SubscriptionMappersTest` (1), `SubscriptionViewModelTest` (2); `/tmp/claude/quick.sh m46` green; policy ok
- Loops: 1/1 — batch 8 run: policy ok, 81 policy-script tests, 449 host tests 0 failures, `assembleDevDebug` green
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch 8 code reading; no blocking finding. DEVIATION: UI check on emulator/simulator deferred to the end-of-backlog journey (rules §3.13).
- Notes: the end date shown is the one that matches the status (trial end, period end or expiry).

### MER-045 — Bank details (owner)
- Branch: `feat/mer-045-bank-details`
- Branched: (from `feat/mer-044-finance`)
- Status: IN REVIEW (batch 8 verified; PR blocked on the gh `workflow` scope)
- Acceptance criteria (PRD M22 bank details; operations `GET/PUT /salon/payout-details`, `POST /auth/otp/request` purpose BANK_DETAILS; design 08 `on.bank`):
  - [x] Owner only (`PAYOUT_DETAILS_MANAGE`, entry on the finance screen): masked current account ("ending 0302"), bank name and holder ≤ 80, IBAN normalized (spaces, case) and checked (JO prefix, 30 characters, ISO 13616 mod-97)
  - [x] "Continue & verify": the owner's phone (`GET /team/members/{ownerId}`, split on the longest dial code) opens the existing OTP screen with purpose BANK_DETAILS; back on resume a BANK_DETAILS proof is consumed once and the PUT carries its `idToken`; no proof (user went back) saves nothing
- Tests: `BankDetailsTest` (2), `BankDetailsViewModelTest` (3); `/tmp/claude/quick.sh m45` green; policy ok
- Loops: 1/1 — batch 8 run: policy ok, 81 policy-script tests, 449 host tests 0 failures, `assembleDevDebug` green
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch 8 code reading; no blocking finding. DEVIATION: UI check on emulator/simulator deferred to the end-of-backlog journey (rules §3.13).
- Notes: the contract has no self-profile endpoint (SRV-129), so the owner's phone comes from the team member read; the finance presentation depends on `feature/auth/domain` for the OTP hand-off (same as `feature/application`).

### MER-044 — Finance M22
- Branch: `feat/mer-044-finance`
- Branched: (from `feat/mer-041-policies`)
- Status: IN REVIEW (batch 8 verified; PR blocked on the gh `workflow` scope)
- Acceptance criteria (PRD M22; operations `GET /finance/balance|transactions|refunds|payouts`; design 08 `on.finance`):
  - [x] New `feature/finance`; balance card (pending payout amount, last payout amount + date), WAB info text; hub tile FINANCE registered
  - [x] Tabs Transactions (reference, date, deposit / full, amount, gateway fee, net), Refunds (amount, booking, reason or source label, status Pending / Refunded / Failed, requested / refunded dates), Payouts (period, gross, fees, refunds deducted, adjustments, net, Pending / Transferred, transfer date + reference)
  - [x] Date presets This month / Last 3 months / This year / Custom (from / to pickers, `to` never before `from`), infinite scroll pages of 20, pull-to-refresh, empty "try another period", error + retry; rows open the booking (M09)
  - [x] Bank-details entry only for the owner (`PAYOUT_DETAILS_MANAGE`), shown once MER-045 ships
- Tests: `FinanceTest` (1), `FinanceMappersTest` (1), `FinanceViewModelTest` (2); `/tmp/claude/quick.sh m44b` green after rewording two KDoc lines (`/finance/*` opened a nested comment); policy ok
- Loops: 1/1 — batch 8 run: policy ok, 81 policy-script tests, 449 host tests 0 failures, `assembleDevDebug` green
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch 8 code reading; no blocking finding. DEVIATION: UI check on emulator/simulator deferred to the end-of-backlog journey (rules §3.13).
- Notes: amounts are the contract's JOD decimal strings shown through `jodText`.

### MER-041 — Policies M19
- Branch: `feat/mer-041-policies`
- Branched: (batch 8 start, from `feat/mer-040-permissions`)
- Status: IN REVIEW (batch 8 verified; PR blocked on the gh `workflow` scope)
- Acceptance criteria (PRD M19; operations `GET/PUT /salon/policy`; design 07 `on.policies`, `sh.preview`):
  - [x] Cancellation window chips 1/2/3/6/12/24/48 h + custom (1..720, contract limit), payment options ≥ 1 (pay on arrival / deposit / full online), deposit % 1..100 required with DEPOSIT and the live "On a 50 JOD booking the deposit is X" example (integer fils → JOD)
  - [x] Within-window cancellation (deposit refundable / non-refundable; full payment refund in full / minus deposit) and no-show outcomes (deposit keep / refund; full payment keep / minus deposit / full), each block only for the offered options; notes ≤ 1000; "changes apply to new bookings only"
  - [x] Customer "Salon rules" preview built from the draft (domain `customerRules`); a missing policy (null) starts from defaults; saving refreshes the shared salon (completeness `POLICY`); hub tile POLICIES registered; design-system `filsToDecimal` / `jodTextOfFils`
- Tests: `PolicyTest` (3), `PolicyMappersTest` (2), `PolicyViewModelTest` (2), `FormatsTest` +1; `/tmp/claude/quick.sh m41b` green after naming the window presets and removing duplicated constants; policy ok
- Loops: 1/1 — batch 8 run: policy ok, 81 policy-script tests, 449 host tests 0 failures, `assembleDevDebug` green
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch 8 code reading; no blocking finding. DEVIATION: UI check on emulator/simulator deferred to the end-of-backlog journey (rules §3.13).
- Notes: the design caps the custom window at 168 h; the contract allows 720 and the PRD names no limit, so 720 is used.

### MER-040 — Permissions editor M18
- Branch: `feat/mer-040-permissions`
- Branched: (from `feat/mer-039-staff-profile`)
- Status: IN REVIEW (batch 7 verified; PR blocked on the gh `workflow` scope)
- Acceptance criteria (PRD M18, §6.2–6.3; operation `PATCH /team/members/{id}` permissions; design 06 `on.perms`):
  - [x] Owner only (opened from the member form): member header (photo, name, role, "n permissions on" AR plurals), "Apply role template" (PRD §6.3 templates), toggles grouped Bookings / Salon / Staff / Finance / Insights with a description per key (every one of the 15 keys in exactly one group, tested)
  - [x] Owner-only capabilities (team & permissions, bank details, salon deletion) shown locked "Owner only"; the OWNER's own permissions are locked; save only when changed; the member's app refreshes on `PERMISSIONS_UPDATED` (MER-009)
- Tests: `PermissionGroupsTest` (2), `PermissionsViewModelTest` (2); `/tmp/claude/quick.sh m40b` green after escaping an `&` in one string; policy ok
- Loops: 1/1 — batch 7 run: policy ok, 81 policy-script tests, 417 host tests 0 failures, `assembleDevDebug` green
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch 7 code reading; no blocking finding (non-blocking: team screens sit at the root of the nav graph, so the tab bar hides there like other detail screens). DEVIATION: UI check on emulator/simulator deferred to the end-of-backlog journey (rules §3.13).
- Notes: the PATCH also re-sends name and role unchanged (the contract updates them together).

### MER-039 — Staff profile + leaves M17
- Branch: `feat/mer-039-staff-profile`
- Branched: (from `feat/mer-038-team`)
- Status: IN REVIEW (batch 7 verified; PR blocked on the gh `workflow` scope)
- Acceptance criteria (PRD M17 staff section; operations `GET/PUT /team/members/{id}/staff`, leaves `GET/POST/PATCH/DELETE`, `GET /salon/services`, `GET /salon/hours`; design 06 `on.staffForm`):
  - [x] Read-only rating, reviews count and customers served; provides-services toggle, bio ≤ 1000, years 0..80, skills multi-select from the salon services, bride-qualified on women's salons only
  - [x] Working days only on open salon days (Saturday → Friday), optional custom hours on 15-minute steps inside that day's salon hours (validated before saving)
  - [x] Leaves: list, add / edit (future only) with date range + note ≤ 300 (cleared note → null), remove with confirmation
  - [x] Save or add-leave `409 SCHEDULE_CONFLICT` → shared affected-bookings sheet (Reassign opens M09, Cancel affected = `STAFF_UNAVAILABLE` + reason, then re-send, Go back); saving refreshes the shared salon; opened from the team list (STAFF_MANAGE) and the member form
- Tests: `StaffTest` (2), `StaffMappersTest` (2), `StaffProfileViewModelTest` (4); `/tmp/claude/quick.sh m39` + `m39b` green; policy ok
- Loops: 1/1 — batch 7 run: policy ok, 81 policy-script tests, 417 host tests 0 failures, `assembleDevDebug` green
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch 7 code reading; no blocking finding (non-blocking: team screens sit at the root of the nav graph, so the tab bar hides there like other detail screens). DEVIATION: UI check on emulator/simulator deferred to the end-of-backlog journey (rules §3.13).
- Notes: the team data layer reads `/salon/services` and `/salon/hours` itself (a feature does not depend on another feature).

### MER-038 — Team list + member form M17
- Branch: `feat/mer-038-team`
- Branched: (from `feat/mer-037-catalog-requests`)
- Status: IN REVIEW (batch 7 verified; PR blocked on the gh `workflow` scope)
- Acceptance criteria (PRD M17; operations `GET/POST /team/members`, `GET/PATCH /team/members/{id}`, `POST …/deactivate|reactivate`, `POST /bookings/cancel-affected`; design 06 `on.team`, `on.memberForm`):
  - [x] New `feature/team`; list with photo, name, role, provides-services and inactive badges; the owner row cannot be edited or deactivated ("owner cannot be deactivated"); hub tile TEAM registered
  - [x] Owner (`TEAM_MANAGE`): add member (first / last name ≤ 50, phone with country picker + country regex, photo cropped 1:1 as `MEMBER_PHOTO`, role Manager / Employee), edit name / photo / role (phone read-only: the contract cannot change it), remove / restore access (confirmed)
  - [x] `STAFF_MANAGE` without `TEAM_MANAGE`: no add / edit / toggle; providers open their staff profile (MER-039)
  - [x] Deactivation `409 SCHEDULE_CONFLICT` → sheet: Reassign (opens the first affected booking, M09), Cancel affected bookings (`STAFF_UNAVAILABLE` + localized reason, full refunds) then deactivate again, Go back
  - [x] Shared `AffectedBookingsRepository` + `conflictBookingIds()` moved to core (hours use it too)
- Tests: `TeamTest` (2), `TeamMappersTest` (2), `TeamViewModelTest` (6), core `AffectedBookingsTest` (1); `/tmp/claude/quick.sh m38c` green; policy ok
- Loops: 1/1 — batch 7 run: policy ok, 81 policy-script tests, 417 host tests 0 failures, `assembleDevDebug` green
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch 7 code reading; no blocking finding (non-blocking: team screens sit at the root of the nav graph, so the tab bar hides there like other detail screens). DEVIATION: UI check on emulator/simulator deferred to the end-of-backlog journey (rules §3.13).
- Notes: "on leave today" is not in the members contract, so it is not shown; the permissions and staff-profile links appear when MER-039 / MER-040 land; a removed photo goes out as `photoKey: null`.

### MER-037 — Catalog requests M16
- Branch: `feat/mer-037-catalog-requests`
- Branched: (from `feat/mer-036-services`)
- Status: IN REVIEW (batch 7 verified; PR blocked on the gh `workflow` scope)
- Acceptance criteria (PRD M16 catalog requests; operations `GET/POST /catalog/requests`; design 06 `on.catReq`):
  - [x] List with status (Pending / Approved / Rejected), date and the WAB note; empty state
  - [x] "Request a service" sheet: name (1..100), description (1..500), optional picture uploaded as `CATALOG_IMAGE` (new core upload purpose; the server allows it for SERVICES_MANAGE); sent request appears on top; failures keep the form
  - [x] Reached from the catalog picker ("Can't find your service? Request it"); services destinations moved to `ServicesDestinations.kt` (navigation file under 300 lines)
- Tests: `CatalogRequestsViewModelTest` (2); `/tmp/claude/quick.sh m37` green; policy ok
- Loops: 1/1 — batch 7 run: policy ok, 81 policy-script tests, 417 host tests 0 failures, `assembleDevDebug` green
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch 7 code reading; no blocking finding (non-blocking: team screens sit at the root of the nav graph, so the tab bar hides there like other detail screens). DEVIATION: UI check on emulator/simulator deferred to the end-of-backlog journey (rules §3.13).
- Notes: only the first page of requests is shown (a salon has few).

### MER-036 — Services M16
- Branch: `feat/mer-036-services`
- Branched: (batch 7 start, from `feat/mer-035-hours`)
- Status: IN REVIEW (batch 7 verified; PR blocked on the gh `workflow` scope)
- Acceptance criteria (PRD M16; operations `GET/POST /salon/services`, `PATCH /salon/services/{id}`, `GET /catalog/services?gender=`; design 06 `on.services`, `on.catalog`, `on.svcForm`):
  - [x] List: image, name, price (JOD), duration, bride-only and inactive badges, active switch (deactivation confirmed: existing bookings stay valid), client-side search (no query parameter in the contract), empty state CTA, pull-to-refresh, live updates after a save
  - [x] Catalog picker for the salon's gender only, paged (50), searchable over loaded rows, "Added" marks → opens the existing service; new → form
  - [x] Form: catalog name / image read-only, price > 0 with ≤ 2 decimals (Arabic digits accepted) + "includes tax and fees", duration multiple of 5 within 5..1440, bride-only toggle on women's salons only, description ≤ 500 (cleared → explicit null), media ≤ 10 uploaded as `SERVICE_MEDIA`, active toggle, "price changes apply to new bookings" note; saving refreshes the shared salon (completeness `SERVICE`); hub tile SERVICES registered
- Tests: `ServicesTest` (3), `ServicesMappersTest` (2), `ServicesViewModelTest` (5); `/tmp/claude/quick.sh m36` green after naming two magic numbers; policy ok
- Loops: 1/1 — batch 7 run: policy ok, 81 policy-script tests, 417 host tests 0 failures, `assembleDevDebug` green
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch 7 code reading; no blocking finding (non-blocking: team screens sit at the root of the nav graph, so the tab bar hides there like other detail screens). DEVIATION: UI check on emulator/simulator deferred to the end-of-backlog journey (rules §3.13).
- Notes: DEVIATIONS — the contract has no upcoming-bookings list for a service, so deactivation shows a generic confirmation instead of the bookings; the "no staff provides this service" warning is not shown (it would need every member's staff profile); editing media replaces the whole set (existing media come back as URLs only, no keys), the form says so.

### MER-035 — Working hours & closures M15
- Branch: `feat/mer-035-hours`
- Branched: (from `feat/mer-034-gallery`)
- Status: IN REVIEW (batch 6 verified; PR blocked on the gh `workflow` scope)
- Acceptance criteria (PRD M15; operations `GET /salon/hours`, `PUT /salon/hours/weekly`, closures `POST/PATCH/DELETE`, `POST /bookings/cancel-affected`; design 05 `on.hours`, `closureAdd`, `closureConflict`):
  - [x] Weekly schedule Saturday → Friday: working toggle, open / close in 15-minute steps (close may be 24:00), "close after open" error, "Copy to all days" (days off stay off), save only when changed and valid; saving refreshes the shared salon (completeness)
  - [x] Closures: upcoming list, past collapsed, add / edit (future only, `editable`) with date range + reason (1..300, required by the contract), remove with confirmation
  - [x] 409 `SCHEDULE_CONFLICT` (booking ids in `details[].field`) → dialog with the count + full-refund note: "Cancel bookings & save" calls `cancel-affected` (closure → `EXCEPTIONAL_CLOSURE` + its reason; weekly → `OTHER` + localized "hours changed") then re-sends the change; "Go back" keeps the edit; hub tile HOURS registered
- Tests: `WorkingHoursTest` (3), `HoursMappersTest` (1), `HoursViewModelTest` (3); `/tmp/claude/quick.sh m35` green; policy ok
- Loops: 1/1 — batch 6 run: policy ok, 81 policy-script tests, 382 host tests 0 failures, `assembleDevDebug` green
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch 6 code reading; fixed: calendar column of a staff member missing from the team list showed the raw id (now untitled). DEVIATION: UI check on emulator/simulator deferred to the end-of-backlog journey (rules §3.13).
- Notes: the conflict dialog shows the number of affected bookings, not each booking (the 409 carries ids only); times use a 15-minute dropdown (no time-picker component in the design system); design marks the closure reason optional but the contract requires it.

### MER-034 — Gallery M14
- Branch: `feat/mer-034-gallery`
- Branched: (from `feat/mer-033-salon-profile`)
- Status: IN REVIEW (batch 6 verified; PR blocked on the gh `workflow` scope)
- Acceptance criteria (PRD M14; operations `GET/POST /salon/gallery`, `PUT /salon/gallery/order`, `DELETE /salon/gallery/{id}`; design 05 `on.gallery`):
  - [x] Grid of photos and videos (thumbnail falls back to url, video duration), hint with the limits, empty state "Add your work", tap → full-screen viewer
  - [x] Multi-select add within the free slots (50 photos / 10 videos, `acceptUploads` per kind: size, type, 60 s), each file uploaded (`GALLERY_IMAGE` / `GALLERY_VIDEO`) with progress then `POST /salon/gallery` (duration rounded up to seconds); failures stay as retry cells; refused files explained
  - [x] Reorder mode saved with `PUT /salon/gallery/order` on Done (restored on failure); select mode with "n selected" (AR plurals) → delete confirm → `DELETE` each, partial failures kept selected + reload; hub tile GALLERY registered
- Tests: `GalleryTest` (2), `GalleryViewModelTest` (5); `/tmp/claude/quick.sh m34` green; policy ok
- Loops: 1/1 — batch 6 run: policy ok, 81 policy-script tests, 382 host tests 0 failures, `assembleDevDebug` green
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch 6 code reading; fixed: calendar column of a staff member missing from the team list showed the raw id (now untitled). DEVIATION: UI check on emulator/simulator deferred to the end-of-backlog journey (rules §3.13).
- Notes: no video thumbnail is generated on the device (`thumbnailKey` optional; the server falls back to the url).

### MER-033 — Salon profile edit M13
- Branch: `feat/mer-033-salon-profile`
- Branched: (from `feat/mer-032-salon-hub`)
- Status: IN REVIEW (batch 6 verified; PR blocked on the gh `workflow` scope)
- Acceptance criteria (PRD M13; operations `GET /salon`, `PATCH /salon/profile`, uploads presign/confirm; design 05 `on.profile`, `sh.crop`, `on.map`, `on.preview`):
  - [x] Form from the shared salon: cover (16:9) and profile (1:1) images picked → cropped (`ImageCropper`) → uploaded (`SALON_COVER` / `SALON_PROFILE`) with progress and retry; name (≤ 80, required), description (≤ 1000 with counter), address text (≤ 300), city / area (areas reload per city), phone (required) and WhatsApp (optional) in E.164; salon type read-only
  - [x] Full-screen map picker: pin moves re-geocode (`ReverseGeocoder`), place search debounced 400 ms (`PlacesRepository`), "Use my location" through the location permission (blocked → settings), confirm fills location + address
  - [x] Save sends only changed fields; cleared description / address / WhatsApp go out as explicit `null` (the client drops nulls, so the body is built as JSON); success refreshes the shared salon (hub completeness, home); validation errors shown on save
  - [x] Unsaved-changes guard on the top-bar back and the system back (`NavigationBackHandler`): save & leave / discard; customer preview sheet; hub tile PROFILE registered
- Tests: `ProfileFormTest` (3), `ProfileBodyTest` (1), `SalonProfileViewModelTest` (7); `/tmp/claude/quick.sh m33c` green; policy ok
- Loops: 1/1 — batch 6 run: policy ok, 81 policy-script tests, 382 host tests 0 failures, `assembleDevDebug` green
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch 6 code reading; fixed: calendar column of a staff member missing from the team list showed the raw id (now untitled). DEVIATION: UI check on emulator/simulator deferred to the end-of-backlog journey (rules §3.13).
- Notes: new library `org.jetbrains.androidx.navigationevent:navigationevent-compose:1.0.1` (already a transitive dependency of navigation-compose; `BackHandler` is deprecated in Compose 1.10 and warnings fail the build). The preview is a simplified customer header (cover, logo, name, rating, description, address), not the full customer salon screen.

### MER-032 — Salon hub M12
- Branch: `feat/mer-032-salon-hub`
- Branched: (from `feat/mer-031-calendar`)
- Status: IN REVIEW (batch 6 verified; PR blocked on the gh `workflow` scope)
- Acceptance criteria (PRD M12, §6 hidden-not-disabled; `GET /salon` completeness; design 05 `on.hub`):
  - [x] New `feature/salon` (domain / data / presentation / di) wired in the shell; Salon tab registered (`Graph.Salon`, start = hub)
  - [x] `hubEntries(permissions, missing)`: tiles per permission (team also for owner `TEAM_MANAGE`), "Missing" when a tile fixes a completeness item (profile ← cover/profile image/name/description/location/phone, hours, services, staff, policies)
  - [x] Header: salon avatar, name, women/men type, state chip; "no permissions" text when nothing is granted; pull-to-refresh reloads `GET /salon`; adaptive grid columns
  - [x] A tile shows only once its screen is registered (`TILE_SCREENS`, filled by MER-033…046)
- Tests: `SalonHubTest` (3), `SalonHubViewModelTest` (2); `/tmp/claude/quick.sh m32` green; policy ok
- Loops: 1/1 — batch 6 run: policy ok, 81 policy-script tests, 382 host tests 0 failures, `assembleDevDebug` green
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch 6 code reading; fixed: calendar column of a staff member missing from the team list showed the raw id (now untitled). DEVIATION: UI check on emulator/simulator deferred to the end-of-backlog journey (rules §3.13).
- Notes: tile subtitles are static descriptions (no counts endpoint for gallery / services / team / reviews in one call).

### MER-031 — Calendar M11
- Branch: `feat/mer-031-calendar`
- Branched: (batch 6 start, from `feat/mer-028-request-in-app`)
- Status: IN REVIEW (batch 6 verified; PR blocked on the gh `workflow` scope)
- Acceptance criteria (PRD M11; operations `GET /bookings/calendar?from&to&staffId`, `GET /salon/hours`; design 04):
  - [x] `CalendarRepository` (entries ≤ 7 days, salon hours + closures) with mappers; Calendar tab registered (`Graph.Calendar`)
  - [x] Day view: one column per staff (filtered / all providers + anyone booked), blocks at 15-min resolution in Asia/Amman minutes, colored by status + bride icon, closed hours / day off / closure shaded, now line (1-minute tick), empty / closed states; Week view: Saturday-first compact day columns, tap → that day
  - [x] Header: month label (AR/EN month names), Today, date picker, Day/Week, previous/next + swipe, week strip (today, selected, has bookings, day off); staff filter sheet ("all staff" = none); `BOOKINGS_VIEW_OWN` → own column only, no filter; read-only; tap → M09; realtime booking events reload silently
- Tests: `CalendarLayoutTest` (5), `CalendarViewModelTest` (3), `CalendarMappersTest` (2); `/tmp/claude/quick.sh m31b` bookings data + presentation + composeApp tests + `assembleDevDebug` green; policy ok
- Loops: 1/1 — batch 6 run: policy ok, 81 policy-script tests, 382 host tests 0 failures, `assembleDevDebug` green
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch 6 code reading; fixed: calendar column of a staff member missing from the team list showed the raw id (now untitled). DEVIATION: UI check on emulator/simulator deferred to the end-of-backlog journey (rules §3.13).
- Notes: staff leaves are not in any merchant read contract the calendar can use per day, so only salon closures / off days are shaded; block subtitle shows the reference (calendar rows carry no service names).

### MER-028 — Real-time request M10 in-app
- Branch: `feat/mer-028-request-in-app`
- Branched: (from `feat/mer-027-booking-details`)
- Status: IN REVIEW (batch 5 verified; PR blocked on the gh `workflow` scope)
- Acceptance criteria (PRD M10 in-app; BUSINESS_DOMAIN §7 `booking.requested` / `booking.updated`; push data `event` + `bookingId`):
  - [x] Requests from the socket (`booking.requested`) and FCM data messages, de-duplicated by booking id (also across answers), details fetched, only PENDING queued; unanswered pending bookings queue on app open
  - [x] Sheet over any screen (shell, `HOME` route, `BOOKINGS_RESPOND` only): bride badge, customer, persons / services / staff / time, total (JOD), payment, time since request, "1 of 3"; distinct sound / vibration (`RequestAlert`) while shown, stopped on answer
  - [x] Accept in place → confirmation (next / view booking / done); Reject → reason sheet (shared with M09); View details → M09; swipe away = later (stays in Pending)
  - [x] `ALREADY_HANDLED` or a `booking.updated` that left PENDING → "handled by another team member" then dismiss after `HANDLED_DISMISS_MS`; conflicts leave the queue with an error; other errors keep the request pending; foreground FCM requests no longer show a banner
- Tests: `BookingRequestsViewModelTest` (7), `BookingSignalsTest` (2); `/tmp/claude/quick.sh m28d` bookings + notification + composeApp tests + `assembleDevDebug` green; policy ok
- Loops: 1/1 — batch 5 run: policy ok, 81 policy-script tests, 342 host tests 0 failures, `assembleDevDebug` green
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch 5 code reading; fixed: M09 history actor localized (CUSTOMER/MEMBER/ADMIN/SYSTEM), JOD formatting in M09, alert after "view booking". DEVIATION: UI check on emulator/simulator deferred to the end-of-backlog journey (rules §3.13).
- Notes: the contract names no member for "handled by", so the sheet says "another team member". Outside-the-app overlay / actionable notifications are MER-029/030. Also fixed: M09 money rows and the "collected X" dialog now format JOD.

### MER-027 — Booking details & actions M09
- Branch: `feat/mer-027-booking-details`
- Branched: (from `feat/mer-026-bookings-list`; code committed together with MER-026)
- Status: IN REVIEW (batch 5 verified; PR blocked on the gh `workflow` scope)
- Acceptance criteria (PRD M09, §10; operations `GET /bookings/{id}`, approve/reject/cancel/complete/no-show/reassign; design 03 `on.details`):
  - [x] Header (reference + copy, status / payment / refund / bride badges, date-time, pending auto-cancel countdown, refund note, reject/cancel reason), customer with Call / WhatsApp, persons (staff, time, services), payment rows (total, paid online, remaining, refunded), snapshotted policy, status history
  - [x] Sticky action bar = the server's `actions` for this member (hidden, not disabled); accept at once; reject / cancel need a reason (OTHER needs text ≤ 300) with the full-refund note on cancel; complete ("collected X") and no-show confirmations; reassign sheet (person + active provider)
  - [x] `ALREADY_HANDLED` → "already handled" dialog + refresh; schedule / transition conflicts close the sheet + refresh; other errors keep the sheet; never a blind retry; success banners; realtime booking events refresh
  - [x] `ExternalActions.copyText` (Android clipboard, iOS pasteboard) for the reference
- Tests: `BookingDetailsViewModelTest` (7); `/tmp/claude/quick.sh m26c` bookings + design-system + ui + composeApp tests + `assembleDevDebug` green; policy ok
- Loops: 1/1 — batch 5 run: policy ok, 81 policy-script tests, 342 host tests 0 failures, `assembleDevDebug` green
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch 5 code reading; fixed: M09 history actor localized (CUSTOMER/MEMBER/ADMIN/SYSTEM), JOD formatting in M09, alert after "view booking". DEVIATION: UI check on emulator/simulator deferred to the end-of-backlog journey (rules §3.13).
- Notes: reassign lists every active provider (no eligible-staff endpoint in the contract); the server validates and a `STAFF_NOT_ELIGIBLE` refreshes.

### MER-026 — Bookings list M08
- Branch: `feat/mer-026-bookings-list`
- Branched: (from `feat/mer-025-setup-checklist`)
- Status: IN REVIEW (batch 5 verified; PR blocked on the gh `workflow` scope)
- Acceptance criteria (PRD M08; operation `GET /bookings`; design 03 `on.list`):
  - [x] `feature/bookings` (domain models, repository, API + mappers, Koin); tabs Pending / Upcoming / Today / Past; search debounced 500 ms; filter sheet (dates, staff, status, bride, payment) with active chips; paging (10) with de-duplication
  - [x] Cards with status / payment badges and live pending countdown (1 s clock); shimmer / empty per tab / no-results / error + retry; pull-to-refresh; realtime `booking.requested|updated|assigned` reload the first page; scope by the server (`BOOKINGS_VIEW_OWN`)
  - [x] Bookings tab registered in the shell; `jodText` / `dateTimeText` formats (12-hour, Asia/Amman) in the design system
- Tests: `BookingRulesTest`, `BookingMappersTest`, `BookingsViewModelTest` (4), `FormatsTest`; green with MER-027 run
- Loops: 1/1 — batch 5 run: policy ok, 81 policy-script tests, 342 host tests 0 failures, `assembleDevDebug` green
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch 5 code reading; fixed: M09 history actor localized (CUSTOMER/MEMBER/ADMIN/SYSTEM), JOD formatting in M09, alert after "view booking". DEVIATION: UI check on emulator/simulator deferred to the end-of-backlog journey (rules §3.13).
- Notes: list rows carry no `createdAt`, so no request age is shown.

### MER-025 — Setup checklist M06
- Branch: `feat/mer-025-setup-checklist`
- Branched: (from `feat/mer-024-launch-router`)
- Status: IN REVIEW (batch 5 verified; PR blocked on the gh `workflow` scope)
- Acceptance criteria (PRD M06, §4.2 completeness; `GET /salon` completeness; design 01 `on.check`):
  - [x] Steps from the server's missing items (profile & images, location & contact, hours, services, staff, policies) + optional gallery / team; ✓ when complete; progress "n of 6" + bar + steps left (AR plurals)
  - [x] Pending-approval note; each step opens its screen (profile, hours, services, team, policies, gallery); pull-to-refresh; live → "Your salon is live!" → home
  - [x] `Graph.Setup` start for the APPROVED_INCOMPLETE route
- Tests: `SetupChecklistTest` (2), `SetupChecklistViewModelTest` (3); application tests + `assembleDevDebug` green; policy ok
- Loops: 1/1 — batch 5 run: policy ok, 81 policy-script tests, 342 host tests 0 failures, `assembleDevDebug` green
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch 5 code reading; fixed: M09 history actor localized (CUSTOMER/MEMBER/ADMIN/SYSTEM), JOD formatting in M09, alert after "view booking". DEVIATION: UI check on emulator/simulator deferred to the end-of-backlog journey (rules §3.13).
- Notes: optional steps have no completeness signal from the server, so they never show ✓.

### MER-024 — Launch router + offline banner
- Branch: `feat/mer-024-launch-router`
- Branched: (batch 5 start, from `feat/mer-023-application-status`)
- Status: IN REVIEW (batch 5 verified; PR blocked on the gh `workflow` scope)
- Acceptance criteria (PRD §4.2–4.3, §3 offline banner, §8.1; operation `GET /salon`):
  - [x] Core salon source: `SalonProfile` (state, completeness `missing` items from the server: COVER, PROFILE_IMAGE, NAME, DESCRIPTION, LOCATION, PHONE, WORKING_HOURS, SERVICE, STAFF, POLICY; location, contacts, rating) + `SalonRepository` (`current` + `refresh`, stores the salon state in the session); refreshed at launch and after every sign-in
  - [x] `launchRouteOf(session)`: guest → login; pending / rejected → application status; approved incomplete → setup checklist; live / offline (or unknown yet) → home; deactivated members are signed out by the permission refresh / `access.revoked` (MER-009/011) and see the login message
  - [x] Shell `MerchantShell`: NavHost restarts at the route's graph when the route changes; permission-gated bottom bar / rail (`visibleMerchantTabs` ∩ tabs shipped), shown on tab destinations only; the first visible tab is the home start
  - [x] Offline banner on every screen while the salon is OFFLINE ("Your salon is currently offline…", Contact → WAB WhatsApp from the config contact)
- Tests: `LaunchRouteTest` (2), `SalonMapperTest` (2), `MerchantRootTabsTest` (2), `MainViewModelTest` (+1 salon refresh on sign-in); domain / data / composeApp tests, `assembleDevDebug`, iOS framework link green; policy ok
- Loops: 1/1 — batch 5 run: policy ok, 81 policy-script tests, 342 host tests 0 failures, `assembleDevDebug` green
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch 5 code reading; fixed: M09 history actor localized (CUSTOMER/MEMBER/ADMIN/SYSTEM), JOD formatting in M09, alert after "view booking". DEVIATION: UI check on emulator/simulator deferred to the end-of-backlog journey (rules §3.13).
- Notes: tabs register themselves in `REGISTERED_TABS` as their features land (bookings, calendar, salon, more, home).

### MER-023 — Application status M05
- Branch: `feat/mer-023-application-status`
- Branched: (from `feat/mer-022-registration`; same `feature/application` module)
- Status: IN REVIEW (batch 4 PR)
- Acceptance criteria (PRD M05; operation `GET /salon/application`; design 01 `on.status`):
  - [x] Pending: "Your application is under review", submitted date, "Prepare your salon profile" → setup checklist (M06), refresh + pull-to-refresh
  - [x] Rejected: reason card + "Edit & resubmit" → M04 in resubmission mode (`POST /salon/application/resubmit`, back to pending)
  - [x] Approved (APPROVED_INCOMPLETE / LIVE / OFFLINE): "Your salon is approved!" + Continue → checklist or home; the cached salon state follows every load
  - [x] First-load error with retry; refresh errors as a banner; `Graph.Onboarding` navigation (status, registration, resubmission)
- Tests: `ApplicationStatusViewModelTest` (4), `ApplicationUseCasesTest` (3), `ApplicationMappersTest` (2)
- Loops: 1/1 — batch-4 run: policy `all: ok`, 81 policy-script tests OK, `testAndroidHostTest` (all modules, fresh results: 80 suites, 303 tests, 0 failures) + `:androidApp:assembleDevDebug` green
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch-4 code read: analytics fields, auth feature ported from the customer app and narrowed to the merchant contract (no register / change-phone / push switch), `feature/application` (registration, status, resubmit) on the shared upload pipeline; Clean Architecture + MVI by delegate, AR + EN from design 01, tokens only, files < 300 lines. Deviations: real SMS / analytics need the owner's Firebase files (MER-004); no email in the application contract; resubmission not prefilled (contract); detekt, full gate and device checks once after the backlog.
- Notes: DEVIATION: "opens M04 prefilled" — `GET /salon/application` returns no name / type / documents, so the resubmission form starts empty (name, type and documents only, as the resubmit operation accepts). The push on approval / rejection is MER-012/047.

### MER-022 — Salon registration M04
- Branch: `feat/mer-022-registration`
- Branched: (from `feat/mer-021-otp`)
- Status: IN REVIEW (batch 4 PR)
- Acceptance criteria (PRD M04, §12; operations `POST /uploads/license/presign|confirm`, `POST /salon/applications`, `GET /locations/cities|areas`; design 01 `on.register`):
  - [x] `feature/application` (domain / data / presentation / di): salon name, type Men / Women (choice cards + "cannot be changed later"), owner first / last name, city → area (area disabled until a city; cities of the phone's country), 1–5 license documents (`AppDocumentUploader`, `FilePicker` + `UploadFileUseCase` with the public license purpose, progress, remove, retry, refusal messages), terms checkbox + terms page link
  - [x] Pure validation (`registrationErrors`: required fields, lengths 80 / 50, 1–5 confirmed documents, nothing still uploading, terms); errors shown after the first submit; Submit with spinner
  - [x] Submit with the REGISTER proof → salon `APPLICATION_PENDING` + owner signed in (all permissions, salon state cached) → M05; missing proof → back to login
- Tests: `RegistrationRulesTest` (5), `RegistrationViewModelTest` (5: missing proof, cities/areas, valid submit signs in, upload failure + retry + refusal + remove, resubmission); application domain / data / presentation tests + `assembleDevDebug` green; policy ok
- Loops: 1/1 — batch-4 run: policy `all: ok`, 81 policy-script tests OK, `testAndroidHostTest` (all modules, fresh results: 80 suites, 303 tests, 0 failures) + `:androidApp:assembleDevDebug` green
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch-4 code read: analytics fields, auth feature ported from the customer app and narrowed to the merchant contract (no register / change-phone / push switch), `feature/application` (registration, status, resubmit) on the shared upload pipeline; Clean Architecture + MVI by delegate, AR + EN from design 01, tokens only, files < 300 lines. Deviations: real SMS / analytics need the owner's Firebase files (MER-004); no email in the application contract; resubmission not prefilled (contract); detekt, full gate and device checks once after the backlog.
- Notes: DEVIATION: PRD lists an optional email, but `POST /salon/applications` has no email field — not collected (server gap; add when the contract has it).

### MER-021 — OTP M03
- Branch: `feat/mer-021-otp`
- Branched: (from `feat/mer-020-login`; the OTP screen came with the auth port of MER-020)
- Status: IN REVIEW (batch 4 PR)
- Acceptance criteria (PRD M03 "same rules as the customer app"; operations `POST /auth/otp/request`, `/auth/otp/wrong-attempt`, `/auth/login`):
  - [x] Modes LOGIN / REGISTER / CHANGE_PHONE / BANK_DETAILS (`AuthPurpose`); OTP pre-check (`allowed`, `otpLength` boxes from the backend, `resendAfterSeconds`, `blockedUntil`), Firebase phone verification through the `PhoneAuthGateway` facade (fake in mock mode), wrong-attempt reporting with remaining attempts and the 15-minute block, resend countdown, expiry popup
  - [x] LOGIN → `POST /auth/login` with the ID token + installation (app-instance id, platform, versions, FCM token) → session stores tokens, member, role and permission keys → home; REGISTER → proof published → salon registration (M04); BANK_DETAILS / CHANGE_PHONE → proof published → back to the caller
- Tests: `OtpViewModelTest` (8: request + countdown, login stores the member, wrong code + block, expiry + server errors, register → registration, bank details → back, block remaining time, Firebase send failure), `AuthMappersTest` (3)
- Loops: 1/1 — batch-4 run: policy `all: ok`, 81 policy-script tests OK, `testAndroidHostTest` (all modules, fresh results: 80 suites, 303 tests, 0 failures) + `:androidApp:assembleDevDebug` green
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch-4 code read: analytics fields, auth feature ported from the customer app and narrowed to the merchant contract (no register / change-phone / push switch), `feature/application` (registration, status, resubmit) on the shared upload pipeline; Clean Architecture + MVI by delegate, AR + EN from design 01, tokens only, files < 300 lines. Deviations: real SMS / analytics need the owner's Firebase files (MER-004); no email in the application contract; resubmission not prefilled (contract); detekt, full gate and device checks once after the backlog.
- Notes: DEVIATION: needs MER-010 (code done) and the owner's Firebase files (MER-004) for a real SMS; mock mode verifies any code.

### MER-020 — Welcome & login M02
- Branch: `feat/mer-020-login`
- Branched: (from `feat/mer-010-analytics`)
- Status: IN REVIEW (batch 4 PR)
- Acceptance criteria (PRD M02, §4.4; operations `GET /locations/countries`, `POST /auth/check-phone`; design 01 `on.login`):
  - [x] `feature/auth` ported from the customer app (domain / data / presentation / di) and adapted to the merchant contract; core `locations` (countries, cities, areas; cache per language) ported and bound
  - [x] Country picker (server list, Jordan default) + phone field with the country regex; Continue → `check-phone`: active member → OTP; `PHONE_NOT_REGISTERED` → "not linked to any salon" dialog → Register a new salon (OTP REGISTER → M04); `MEMBER_INACTIVE` → "Your access was removed"; `ACCOUNT_BLOCKED` → blocked → contact WAB; "New salon? Register your salon" link (valid number → registration OTP)
  - [x] Language + theme toggles, legal links (privacy / terms / contact content pages), invalid / loading states; texts from design 01 in AR + EN
  - [x] Merchant navigation map (`Graph` auth / onboarding / tabs, `Screen` M02–M25); shell starts guests at login (launch router = MER-024); `InstallationInfoProvider` bound by the shell
- Tests: `LoginViewModelTest` (7: default country + regex, registered → OTP, not linked → register, deactivated popup, register link, blocked + errors, toggles, countries retry), `PhoneCheckMapperTest` (2), `SessionUseCasesTest` (2), `InstallationMapperTest`, `LocationsTest`; auth / domain / data / composeApp host tests + `assembleDevDebug` green; policy ok
- Loops: 1/1 — batch-4 run: policy `all: ok`, 81 policy-script tests OK, `testAndroidHostTest` (all modules, fresh results: 80 suites, 303 tests, 0 failures) + `:androidApp:assembleDevDebug` green
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch-4 code read: analytics fields, auth feature ported from the customer app and narrowed to the merchant contract (no register / change-phone / push switch), `feature/application` (registration, status, resubmit) on the shared upload pipeline; Clean Architecture + MVI by delegate, AR + EN from design 01, tokens only, files < 300 lines. Deviations: real SMS / analytics need the owner's Firebase files (MER-004); no email in the application contract; resubmission not prefilled (contract); detekt, full gate and device checks once after the backlog.
- Notes: customer register screen, change-phone and push switch dropped (no merchant operations); the form fields stay for the salon registration (MER-022).

### MER-010 — Analytics tracker + Crashlytics facade
- Branch: `feat/mer-010-analytics`
- Branched: (batch 4 start, from `feat/mer-019-splash-config`)
- Status: IN REVIEW (batch 4 PR)
- Acceptance criteria (PRD §14):
  - [x] Common fields on every event: user type, language, app version, platform, environment (template) + `app = MERCHANT`, and while signed in `member_id`, `salon_id`, `member_role` (`AnalyticsContext`, `AppAnalyticsContextProvider`)
  - [x] Firebase user id = member id on sign-in, cleared on sign-out, on analytics and Crashlytics; `salon_id` / `member_role` user properties set and cleared with it (`SessionAnalyticsSync`)
  - [x] App-instance id for the backend: `AppInstanceIdProvider` port (core/firebase, template) — sent by login (MER-020/021)
- Tests: `AppAnalyticsContextProviderTest` (+1), `SessionAnalyticsSyncTest` (extended); core/analytics + composeApp host tests green; policy ok
- Loops: 1/1 — batch-4 run: policy `all: ok`, 81 policy-script tests OK, `testAndroidHostTest` (all modules, fresh results: 80 suites, 303 tests, 0 failures) + `:androidApp:assembleDevDebug` green
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch-4 code read: analytics fields, auth feature ported from the customer app and narrowed to the merchant contract (no register / change-phone / push switch), `feature/application` (registration, status, resubmit) on the shared upload pipeline; Clean Architecture + MVI by delegate, AR + EN from design 01, tokens only, files < 300 lines. Deviations: real SMS / analytics need the owner's Firebase files (MER-004); no email in the application contract; resubmission not prefilled (contract); detekt, full gate and device checks once after the backlog.
- Notes: DEVIATION: depends on MER-004 (owner Firebase files, PENDING); the code path is complete and runs on the no-op bridges with the placeholder configs; real events and crash reports are verified once the owner adds the files.

### MER-019 — Splash + config + system screens
- Branch: `feat/mer-019-splash-config`
- Branched: (from `feat/mer-018-calendar-grid`; backlog name `feat/mer-019-config-system`)
- Status: IN REVIEW (batch 3 PR)
- Acceptance criteria (PRD M01, M26 "same as the customer app"; operation `GET /merchant/v1/config?platform&version`; design 01 `on.splash`, `on.sys`):
  - [x] Domain `core/domain/config` (from the customer app): `AppConfig` (update policy, maintenance, OTP length + resend, contact), `UpdateStatus` (unknown → OK), `ClientPlatform`, `LaunchGate` + `launchGateOf` (maintenance over force update over optional update)
  - [x] Data `core/data/config`: `AppConfigApi` (platform + installed version), mapper (blank texts → null, numbers → ints), `AppConfigRepositoryImpl` (`current` StateFlow for OTP / contact); bound in `dataModule`; `ClientPlatform` bound by the shell (`appPlatformModule`)
  - [x] Shell: `MainContract` (loading, gate, error, `OpenStore`), `MainViewModel` loads the config at start, retry, optional-update dismiss, store link; `LaunchGateContent`: splash until the gate is known, maintenance / force update blocking, optional update dialog over the app
  - [x] Splash (app icon 108 + WAB Business wordmark + tagline, loader, version, error + retry) and system screens (icon + wordmark row, circle icon, title, body, button) per design 01; AR + EN strings; previews
- Tests: `LaunchGateTest` (3), `AppConfigMapperTest` (2), `MainViewModelTest` (+4: gate ready, maintenance / force update, optional update → store / dismiss, error → retry); domain / data / composeApp host tests, `assembleDevDebug`, `linkDebugFrameworkIosSimulatorArm64` green; policy ok
- Loops: 1/1 — batch-3 run: policy `all: ok` (empty baseline), 81 policy-script tests OK, `testAndroidHostTest` (all modules, fresh results: 68 suites, 258 tests, 0 failures) + `:androidApp:assembleDevDebug` green; per task the iOS compile / framework link of the touched modules
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch-3 code read (98 files): request sheet, uploaders, map picker, calendar and config gate behind ports (`RequestAlert`, `FilePicker`, `ImageCropper`, `MapProvider`, `ReverseGeocoder`, `UploadsRepository`, `AppConfigRepository`) with Android + iOS implementations and fakes; pure logic tested; tokens only, AR + EN, files < 300 lines, one `@Suppress` with its reason. Deviations: detekt, the full gate and device checks run once after the backlog (rules §3.13); the components are not yet on screens, so nothing was exercised on the emulator / simulator.
- Notes: the post-gate launch router (session, salon state) is MER-024; mock mode answers the config with the generated fixture (status OK, maintenance off).

### MER-018 — Calendar grid component
- Branch: `feat/mer-018-calendar-grid`
- Branched: (from `feat/mer-017-map-picker`)
- Status: IN REVIEW (batch 3 PR)
- Acceptance criteria (PRD M11; Design Script M11; design 04 Calendar):
  - [x] Models + pure helpers: blocks / shades (closed, leave) / columns in local minutes, `TimeWindow.covering` (working hours widened to every block, snapped to whole hours), `spanIn` (15-minute resolution, clamped), `weekOf` (Saturday-first week), `pageDate` (day ±1, week ±7)
  - [x] `AppCalendarDayView`: staff header (avatar, name, leave tag), time column (pre-formatted 12-hour labels), hour grid, hatched closed hours and amber leave, status-coloured blocks (pending dashed on the card colour, completed faded, bride crown + rose outline; tap → details), now line, empty / closed card, horizontal swipe (mirrored in RTL)
  - [x] `AppCalendarWeekView` (compact day columns, tap a day) + `AppCalendarLegend`; `AppCalendarHeader` (title, month → date picker, Today, staff filter with count, Day / Week switch, previous / next, week strip with today outline, selection gradient and booking dots)
  - [x] Tokens (56 dp per hour, columns, hatch, now line), AR + EN strings, previews (day light/dark RTL, week LTR)
- Tests: `CalendarTest` (5); design-system host tests, `assembleDevDebug`, design-system iOS compile green; policy ok
- Loops: 1/1 — batch-3 run: policy `all: ok` (empty baseline), 81 policy-script tests OK, `testAndroidHostTest` (all modules, fresh results: 68 suites, 258 tests, 0 failures) + `:androidApp:assembleDevDebug` green; per task the iOS compile / framework link of the touched modules
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch-3 code read (98 files): request sheet, uploaders, map picker, calendar and config gate behind ports (`RequestAlert`, `FilePicker`, `ImageCropper`, `MapProvider`, `ReverseGeocoder`, `UploadsRepository`, `AppConfigRepository`) with Android + iOS implementations and fakes; pure logic tested; tokens only, AR + EN, files < 300 lines, one `@Suppress` with its reason. Deviations: detekt, the full gate and device checks run once after the backlog (rules §3.13); the components are not yet on screens, so nothing was exercised on the emulator / simulator.
- Notes: DEVIATION (PRD over design): the design colours blocks per staff member; PRD M11 says "colored by status", so blocks use the status hues and the legend shows statuses. Data, staff filter, employee single column and permissions are the calendar screen (MER-031). Only the visible window is drawn (no virtualisation needed: ≤ 24 h × staff columns).

### MER-017 — Map picker
- Branch: `feat/mer-017-map-picker`
- Branched: (from `feat/mer-016-uploaders`)
- Status: IN REVIEW (batch 3 PR)
- Acceptance criteria (PRD M13; design 05 Salon `on.map`; maps key env/CI only):
  - [x] `MapProvider` port (core/ui): Google Maps (maps-compose) on Android when `MAPS_API_KEY` is set (local.properties or CI env → manifest meta-data), MapKit on iOS (no key), `NoMapProvider` otherwise; camera follows `target`, reports the idle centre and moving state
  - [x] `ReverseGeocoder` port (core/domain) with platform `Geocoder` (Android 13+ listener, older blocking call on IO) and `CLGeocoder`, in the app language; `addressLineOf` (trim, de-duplicate, Arabic/Latin comma), `isSamePointAs` (≈ 1 m), Amman default centre
  - [x] `AppMapPicker(MapPickerUi, mapProvider, onAction)`: map under a fixed centre pin (lifts while moving), search field + suggestions, "Use my location" (spinner while locating), bottom card with pin hint, address / "Finding the address…", error, Confirm (off while resolving or locating); stylized design map (grid, roads, park; drag to move) when no platform map
  - [x] Tokens: map colours (light/dark from the design), pin/grid/road sizes; AR + EN strings; previews
- Tests: `ReverseGeocoderTest` (2), `MapPickerTest` (2); domain + design-system host tests, `assembleDevDebug`, iOS compile of core/ui (MapKit), core/data (CLGeocoder), design-system, core/di green; policy ok
- Loops: 1/1 — batch-3 run: policy `all: ok` (empty baseline), 81 policy-script tests OK, `testAndroidHostTest` (all modules, fresh results: 68 suites, 258 tests, 0 failures) + `:androidApp:assembleDevDebug` green; per task the iOS compile / framework link of the touched modules
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch-3 code read (98 files): request sheet, uploaders, map picker, calendar and config gate behind ports (`RequestAlert`, `FilePicker`, `ImageCropper`, `MapProvider`, `ReverseGeocoder`, `UploadsRepository`, `AppConfigRepository`) with Android + iOS implementations and fakes; pure logic tested; tokens only, AR + EN, files < 300 lines, one `@Suppress` with its reason. Deviations: detekt, the full gate and device checks run once after the backlog (rules §3.13); the components are not yet on screens, so nothing was exercised on the emulator / simulator.
- Notes: "use my location" permission + device position and the Places search wiring belong to the profile screen (MER-033), which owns the view model; the pin is "drag the map" (design hint), not a draggable marker.

### MER-016 — Uploaders
- Branch: `feat/mer-016-uploaders`
- Branched: (from `feat/mer-015-request-sheet`)
- Status: IN REVIEW (batch 3 PR)
- Acceptance criteria (PRD M04, M13, M14, §12; operations `POST /uploads/presign|confirm`, `POST /uploads/license/presign|confirm`; design 01 Onboarding documents, 05 Salon crop + gallery):
  - [x] Domain `core/domain/upload`: purposes, `LocalFile` (kind from MIME), limits (documents 1–5, image/PDF, ≤ 10 MB; images ≤ 10 MB; videos ≤ 50 MB and ≤ 60 s; gallery 50 photos / 10 videos), `validateUpload` / `acceptUploads` (refusals WRONG_TYPE / TOO_LARGE / TOO_LONG / TOO_MANY), `UploadsRepository`, `UploadFileUseCase` (presign → PUT with progress → confirm; failures stop the chain; retry = new run)
  - [x] Data `core/data/upload`: `UploadsApi` (WAB client + bare storage client, Ktor `onUpload` progress), `UploadsRepositoryImpl` (license purpose → public license endpoints; storage non-2xx / IO → errors), `uploadModule` in Koin; mock mode answers the storage PUT
  - [x] Platform pickers `core/ui/media`: `FilePicker` (documents: PDF + images; media: photos + videos, multi-select), `ImageCropper` (normalized region → JPEG ≤ 2048 px); Android (OpenMultipleDocuments, PickMultipleVisualMedia, MediaMetadataRetriever duration, sampled decode + crop) and iOS (UIDocumentPicker, PHPicker, AVURLAsset duration, orientation-safe CGImage crop); fakes for tests
  - [x] Design system `components/upload`: `AppUploadTile` (uploading % + bar / uploaded + size / failed + retry / remove), `AppUploadAddTile`, `AppDocumentUploader` (3 columns, n / max, hint, error), `uploadRejectionText`, `AppImageUploader` (16:9 / 1:1 slot, progress, retry, change), `AppImageCropper` (frame + thirds grid, drag, pinch, zoom slider, Cancel / Use image), `AppMediaGrid` (Normal "First" badge, Reorder numbers + long-press drag + tap-to-move-earlier, Select checks, video duration, progress / failed cells); `AppImage(bytes)` for local previews
  - [x] AR + EN strings; previews (light RTL, dark reorder, LTR select); localization policy now flags duplicate keys (found `media_position` clash)
- Tests: `UploadRulesTest` (5), `UploadFileUseCaseTest` (3), `UploadComponentsTest` (7), `UploadsMapperTest` (2), `test_localization.py` (+1); domain / data / ui / design-system host tests, `assembleDevDebug`, iOS compile of core/ui + core/data + design-system green; policy ok
- Loops: 1/1 — batch-3 run: policy `all: ok` (empty baseline), 81 policy-script tests OK, `testAndroidHostTest` (all modules, fresh results: 68 suites, 258 tests, 0 failures) + `:androidApp:assembleDevDebug` green; per task the iOS compile / framework link of the touched modules
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch-3 code read (98 files): request sheet, uploaders, map picker, calendar and config gate behind ports (`RequestAlert`, `FilePicker`, `ImageCropper`, `MapProvider`, `ReverseGeocoder`, `UploadsRepository`, `AppConfigRepository`) with Android + iOS implementations and fakes; pure logic tested; tokens only, AR + EN, files < 300 lines, one `@Suppress` with its reason. Deviations: detekt, the full gate and device checks run once after the backlog (rules §3.13); the components are not yet on screens, so nothing was exercised on the emulator / simulator.
- Notes: whole files are read into memory before upload (videos up to 50 MB); a streaming upload would need a file-source port (later if memory shows up). Screens (registration, profile, gallery, services) wire these in MER-022/033/034/036.

### MER-015 — Request sheet component
- Branch: `feat/mer-015-request-sheet`
- Branched: (batch 3 start, from `feat/mer-014-components`)
- Status: IN REVIEW (batch 3 PR)
- Acceptance criteria (PRD M10 in-app; Design Script M10; design 02 Home `sheetOn`):
  - [x] `AppBookingRequestSheetContent(RequestSheetUi, onAction)`: "New booking request" + age · reference, "1 of 3" queue chip (only with more than one), bride banner ("Bridal booking — high priority"), customer + persons + time/date, one card per person (services, staff · time, bride badge), total + payment badge, Reject (outlined rose) / Accept (green, check icon, spinner while accepting), View details
  - [x] "Handled by {member}" state: content dimmed, actions off, dark toast with the outcome line (approved / rejected / closing); `RequestSheetDefaults.HANDLED_DISMISS_MS` for the host
  - [x] Accepted state: check, "Booking accepted", reference, body, Next request (when queued) / View booking / Done
  - [x] Sound + vibration hook: `RequestAlert` port (`play(sound, vibrate)` / `stop()`), `RequestAlertSound` NOTIFICATION / ALARM / SILENT (configurable, stored by code), Android ringtone + `VibrationEffect` waveform (`VIBRATE` permission), iOS `AudioServicesPlaySystemSound` + vibrate, `SilentRequestAlert`; bound in Koin (`requestAlertModule` in `coreModule`)
  - [x] `ButtonKind.Success` (green accept) and an outlined Destructive button (design reject)
  - [x] AR + EN strings; previews (queued bride light RTL, handled dark, accepted LTR)
- Tests: `RequestSheetTest` (4), `RequestAlertTest` (2); `:core:ui` + `:core:design-system` host tests, `assembleDevDebug`, `:core:ui:compileKotlinIosSimulatorArm64` green; policy ok
- Loops: 1/1 — batch-3 run: policy `all: ok` (empty baseline), 81 policy-script tests OK, `testAndroidHostTest` (all modules, fresh results: 68 suites, 258 tests, 0 failures) + `:androidApp:assembleDevDebug` green; per task the iOS compile / framework link of the touched modules
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch-3 code read (98 files): request sheet, uploaders, map picker, calendar and config gate behind ports (`RequestAlert`, `FilePicker`, `ImageCropper`, `MapProvider`, `ReverseGeocoder`, `UploadsRepository`, `AppConfigRepository`) with Android + iOS implementations and fakes; pure logic tested; tokens only, AR + EN, files < 300 lines, one `@Suppress` with its reason. Deviations: detekt, the full gate and device checks run once after the backlog (rules §3.13); the components are not yet on screens, so nothing was exercised on the emulator / simulator.
- Notes: hosting, queue, de-duplication, reason picker and the Android overlay / iOS time-sensitive paths are MER-028/029/030; the design's pulsing "ring" animations are not drawn.

### MER-014 — Merchant components
- Branch: `feat/mer-014-components`
- Branched: (from `feat/mer-013-theme`; backlog name `feat/mer-014-merchant-components`)
- Status: IN REVIEW (batch 2 PR)
- Acceptance criteria (Design Script §1.2; PRD §8.1, M07–M09; BUSINESS_DOMAIN §2 enums, §5 `respondBy`; design 02 Home / 03 Bookings):
  - [x] Shared booking enums in core/domain `booking/` (`BookingStatus` 8, `PaymentStatus` 4, `RefundStatus` incl. NONE, tolerant `fromCode`) + `BookingTimers` (pending age, auto-cancel remaining from `respondBy`; pure, never negative)
  - [x] Badges: status (design hues: pending amber, approved green, completed violet, rejected/no-show rose, cancellations grey), payment (violet), refund (pending/refunded/failed), bride (crown on the rose gradient, new `brideStart/End` tokens)
  - [x] `AppBookingCard(BookingCardUi)`: customer + bride badge, `#reference` (LTR), status, date · time, persons (plural), staff, payment + refund badges, pending age, auto-cancel strip only while pending
  - [x] Pending age ("now", minutes, hours, days) and countdown ("6h 50m", minutes rounded up, "auto-cancelling now" when due) with AR plurals (zero/one/two/few/many/other)
  - [x] Home: `AppSalonStateStrip` (chip + dot + hint per salon state), `AppWarningBanner` (trial notice), `AppPendingRequestsCard` (count circle, view all, rows with bride badge / age / countdown), `AppKpiTile` / `AppStatTile` / `AppNextBookingTile`
  - [x] `AppStatusTimeline(StatusHistoryEntryUi)`: dots + connector, latest highlighted, optional reason note
  - [x] Permission-gated bottom nav: `MerchantTab` (5 tabs, PRD §8.1 rules; Salon = any management permission or owner), `visibleMerchantTabs`, `defaultMerchantTab` (first visible), `resolveMerchantTab` (falls back when a permission is revoked), `merchantNavItems` for `AppNavScaffold`; new design icons (bookings list, store, menu, crown)
  - [x] Glass: cards on `AppCard` / `glassBackground`; preview gallery `MerchantGalleryPreviews` (light/dark, RTL/LTR)
  - [x] Localization policy: plural placeholders compared as a set (Arabic spells out one/two); test added
- Tests: `BookingStatusTest` (4), `MerchantComponentsTest` (6), `MerchantTabsTest` (6), `test_localization.py` (+1); policy `all: ok`
- Loops: 1/1 — batch-2 run: policy `all: ok` (empty baseline), 80 policy-script tests OK, `testAndroidHostTest` (all modules: 102 suites, 393 tests, 0 failures) + `:androidApp:assembleDevDebug` green
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch-2 code read (77 files): session/permissions/realtime plumbing and design-system components only; no `!!`/`println`/`runBlocking`/unexplained suppressions, every file < 300 lines, AR+EN for every new key (plurals with all Arabic quantities), tokens only; permission gating pure and tested. Deviations: detekt, the full gate and device checks run once after the backlog (rules §3.13); components are not yet on a screen (no emulator check).
- Notes: the shell adopts the tabs when the first tab screens land (MER-024/025); pending-card "ring" pulse animation of the design not drawn (static count circle).

### MER-013 — Theme, tokens and base kit
- Branch: `feat/mer-013-theme`
- Branched: (from `feat/mer-011-realtime-client`)
- Status: IN REVIEW (batch 2 PR)
- Acceptance criteria (Design Script §0–§1.1; customer CUS-018/020):
  - [x] Same theme and tokens as the customer app (light + dark, typography, spacing, radii, elevation, Liquid Glass) — from the template, no new colors
  - [x] Merchant identity: `AppWordmark` = "WAB" + gradient "Business / أعمال" pill (LTR in both languages) in `AppBrandHeader`; app names "WAB Business" / "WAB أعمال" (dev "… Dev" / "… تجريبي"), iOS display names "WAB Business (Dev)"
  - [x] Universal states (`AppStateContent`, shimmer), pagination (`AppPagedList`, `AppAdaptiveGrid`), pull-to-refresh, form kit (`AppPhoneField` + `AppCountryPicker`, `AppOtpInput`, `AppDropdownField`, `FormValidators`) present from the template
- Tests: design-system tests (`UniversalStatesTest`, `FormKitTest`, `ComponentLogicTest`, …); policy (localization AR/EN) ok
- Loops: 1/1 — batch-2 run: policy `all: ok` (empty baseline), 80 policy-script tests OK, `testAndroidHostTest` (all modules: 102 suites, 393 tests, 0 failures) + `:androidApp:assembleDevDebug` green
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch-2 code read (77 files): session/permissions/realtime plumbing and design-system components only; no `!!`/`println`/`runBlocking`/unexplained suppressions, every file < 300 lines, AR+EN for every new key (plurals with all Arabic quantities), tokens only; permission gating pure and tested. Deviations: detekt, the full gate and device checks run once after the backlog (rules §3.13); components are not yet on a screen (no emulator check).
- Notes: display name changed from "WAB Merchant" (MER-001) to the design's "WAB Business".

### MER-011 — Realtime client
- Branch: `feat/mer-011-realtime-client`
- Branched: (from `feat/mer-009-permissions`)
- Status: IN REVIEW (batch 2 PR)
- Acceptance criteria (PRD §3 real-time; BUSINESS_DOMAIN §7):
  - [x] Socket.IO client on namespace `/merchant` (template) + `FakeRealtimeClient`; connect while resumed and signed in, reconnect on foreground (`RealtimeConnectionEffect`)
  - [x] Event constants: `booking.requested`, `booking.updated`, `booking.assigned`, `permissions.updated`, `access.revoked`, `notifications.unread`; `bookingId` payload key restored
  - [x] Permission filter mirroring the rooms (`isVisibleTo` / `visibleTo`): requests need BOOKINGS_RESPOND, booking updates need a view permission, account events always pass
  - [x] Shell `RealtimeAccountEvents`: `permissions.updated` → `PermissionsSync.refresh()`, `access.revoked` → sign-out + "Your access was removed by the salon owner" banner (AR/EN)
- Tests: `RealtimeEventFilterTest` (3), `RealtimeAccountEventsTest`, realtime protocol/client/refresh tests, `MainViewModelTest`; realtime + composeApp tests + `assembleDevDebug` green
- Loops: 1/1 — batch-2 run: policy `all: ok` (empty baseline), 80 policy-script tests OK, `testAndroidHostTest` (all modules: 102 suites, 393 tests, 0 failures) + `:androidApp:assembleDevDebug` green
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch-2 code read (77 files): session/permissions/realtime plumbing and design-system components only; no `!!`/`println`/`runBlocking`/unexplained suppressions, every file < 300 lines, AR+EN for every new key (plurals with all Arabic quantities), tokens only; permission gating pure and tested. Deviations: detekt, the full gate and device checks run once after the backlog (rules §3.13); components are not yet on a screen (no emulator check).

### MER-009 — Permissions model
- Branch: `feat/mer-009-permissions`
- Branched: (from `feat/mer-008-session-store`)
- Status: IN REVIEW (batch 2 PR)
- Acceptance criteria (PRD §3, §6; BUSINESS_DOMAIN §6):
  - [x] `Permission` (15 grantable keys), `OwnerCapability` (TEAM_MANAGE, PAYOUT_DETAILS_MANAGE, SALON_DELETE_REQUEST), `PermissionSet` with `has` / `anyOf` / `allOf` / `can` (owner has all), `SessionState.permissionSet()`, `PermissionTemplates` (PRD §6.3)
  - [x] `PermissionGated` (hidden-not-disabled) + `LocalPermissions` provided by the shell from the session
  - [x] Re-fetch: `PermissionsSync` rotates through the shared single-flight refresher (`SessionRefresher` = the `TokenRefreshCoordinator` now in Koin; the merchant refresh returns the member), stores member + keys; refused session → sign-out; called on app start (Home refresh, push and socket triggers call the same `refresh()`)
- Tests: `PermissionsTest` (4), `PermissionsSyncTest` (3), `RefreshMemberTest` (2), coordinator `refreshNow` test, `MainViewModelTest` start re-fetch; domain/network/data/design-system/composeApp tests + `assembleDevDebug` green
- Loops: 1/1 — batch-2 run: policy `all: ok` (empty baseline), 80 policy-script tests OK, `testAndroidHostTest` (all modules: 102 suites, 393 tests, 0 failures) + `:androidApp:assembleDevDebug` green
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch-2 code read (77 files): session/permissions/realtime plumbing and design-system components only; no `!!`/`println`/`runBlocking`/unexplained suppressions, every file < 300 lines, AR+EN for every new key (plurals with all Arabic quantities), tokens only; permission gating pure and tested. Deviations: detekt, the full gate and device checks run once after the backlog (rules §3.13); components are not yet on a screen (no emulator check).
- Notes: duplicate `createHttpClient` expect/actuals removed (identical); `BaseHttpClient` registered in Koin.

### MER-008 — Secure local storage of PRD §5 keys via one SessionStore
- Branch: `feat/mer-008-session-store`
- Branched: (batch 2 start, from `feat/mer-007-mock-source`)
- Status: IN REVIEW (batch 2 PR)
- Acceptance criteria (PRD §5):
  - [x] `SessionStore` holds tokens (secure store only), `member_id`, `salon_id`, member first name, `member_role`, `permissions` cache, `salon_state`, `push_enabled`, `overlay_permission_prompted`; language/theme stay in `AppSettings`
  - [x] `SessionState.SignedIn(member: MemberProfile, permissions, salonState)`; `MemberRole` / `SalonState` enums with tolerant `fromCode`
  - [x] Sign-out drops tokens + identity, keeps push / overlay flags; `clearAll` empties everything; incomplete identity = guest
- Tests: `DataStoreSessionStoreTest` (6), `AppSettingsImplTokensTest`, shell analytics tests; storage/composeApp/realtime host tests green
- Loops: 1/1 — batch-2 run: policy `all: ok` (empty baseline), 80 policy-script tests OK, `testAndroidHostTest` (all modules: 102 suites, 393 tests, 0 failures) + `:androidApp:assembleDevDebug` green
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch-2 code read (77 files): session/permissions/realtime plumbing and design-system components only; no `!!`/`println`/`runBlocking`/unexplained suppressions, every file < 300 lines, AR+EN for every new key (plurals with all Arabic quantities), tokens only; permission gating pure and tested. Deviations: detekt, the full gate and device checks run once after the backlog (rules §3.13); components are not yet on a screen (no emulator check).

### MER-007 — Mock data source
- Branch: `feat/mer-007-mock-source`
- Branched: (from `feat/mer-006-api-sync`)
- Status: DONE (batch 1 PR)
- Acceptance criteria (backlog MER-007; INTEGRATION.md §4):
  - [x] `DATA_SOURCE=mock|remote` (template); mock engine serves feature fixtures first, then one generated fixture per contract operation (`contractFixtures()`, 71 operations)
  - [x] Scenario switcher API: `MockScenarios` (transport scenario, salon state override, signed-in member override, `reset()`); UI entry lands with More (MER-048)
  - [x] Every salon state (`MockSalonState`: APPLICATION_PENDING / REJECTED, APPROVED_INCOMPLETE, LIVE, OFFLINE) and permission set (`MockPresets`: owner = all 15 keys, manager, employee, none) patched into any response (`patchFixture`: salon `state`, member `role` / `permissions`)
- Tests: `MockWorldTest` (5), `MockTransportTest`; `:core:data:testAndroidHostTest` green
- Loops: 1/1 — batch-1 run: policy `all: ok` (empty baseline), 78 policy-script tests, `testAndroidHostTest` (all modules) + `assembleDevDebug` green; per-task checks above (detekt clean in MER-003)
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch-1 code read: config/tooling and core plumbing only, no screens; contract + error catalog from the server spec; mock world covers every salon state and permission set.

### MER-006 — Contract tooling
- Branch: `feat/mer-006-api-sync`
- Branched: (from `feat/mer-005-network-kernel`)
- Status: DONE (batch 1 PR)
- Acceptance criteria (backlog MER-006; same generator as CUS-009):
  - [x] `python3 scripts/api_sync.py` / `./gradlew apiSync` generates DTOs + `MerchantOperations` (71 operations) + fixtures + snapshot from `../WAB-Server/docs/api/openapi.merchant.json` into `core/data/.../contract/generated`
  - [x] Stale check: `api_sync.py --check` (`./gradlew apiSyncCheck`) in the gate (always on now; the spec is in the monorepo)
  - [x] Operation registry helper `Operation.pathWith` (from the customer app) for repositories
- Tests: `OperationPathTest`, `test_api_sync.py`; core data/network/domain/design-system/notification host tests green; policy ok (error-codes now also checks the snapshot)
- Loops: 1/1 — batch-1 run: policy `all: ok` (empty baseline), 78 policy-script tests, `testAndroidHostTest` (all modules) + `assembleDevDebug` green; per-task checks above (detekt clean in MER-003)
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch-1 code read: config/tooling and core plumbing only, no screens; contract + error catalog from the server spec; mock world covers every salon state and permission set.

### MER-005 — Network kernel reused
- Branch: `feat/mer-005-network-kernel`
- Branched: (from `feat/mer-003-rules-gates`)
- Status: DONE (batch 1 PR)
- Acceptance criteria (backlog MER-005; same as CUS-006/007, merchant token scope):
  - [x] Ktor per environment (`ApiConfig` from `AppEnvironment`), `Accept-Language` on every request, base envelope + `safeApiCall` (from the template)
  - [x] Refresh interceptor on `POST /merchant/v1/auth/refresh` (request `refreshToken`, rotating pair in `data`; matches `openapi.merchant.json`)
  - [x] Error-code catalog = the 43 codes of BUSINESS_DOMAIN §11 / `openapi.merchant.json` + `UNKNOWN`, AR + EN `error_code_*`, handling actions; the error policy reads the root BUSINESS_DOMAIN (local generic copy removed)
- Tests: `AuthEndpointsTest`, `ErrorCodeTest`, `ErrorTextTest`, existing `SafeApiCallTest` / `AuthRefreshInterceptorTest` / `TokenRefreshCoordinatorTest`; policy `all: ok`
- Loops: 1/1 — batch-1 run: policy `all: ok` (empty baseline), 78 policy-script tests, `testAndroidHostTest` (all modules) + `assembleDevDebug` green; per-task checks above (detekt clean in MER-003)
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch-1 code read: config/tooling and core plumbing only, no screens; contract + error catalog from the server spec; mock world covers every salon state and permission set.

### MER-003 — Project rules and quality gates
- Branch: `feat/mer-003-rules-gates`
- Branched: (from `feat/mer-002-variants-ci`)
- Status: DONE (batch 1 PR)
- Acceptance criteria (backlog MER-003; root rules §3):
  - [x] `WAB-Mobile-Salon/CLAUDE.md`: the customer rules adapted to the merchant app (real module map, `/merchant/v1`, `merchant` master, merchant PRD/design paths, Liquid Glass usage) + merchant specifics (permission gating, conflict-safe booking actions, overlay permission, request sound)
  - [x] Policy baseline `{}` and detekt baseline without issues: the 53 policy findings and 49 detekt findings inherited from the template fixed in code (named constants, tokens, typed catches, `error()`, lifecycle-aware collection, Compose parameter order / effect lambdas, `NotificationTheme` supplied by the shell because `core/notification` sits below the design system); dead template code removed (`Utils`, `NumberFormatter`, `FeatureFlags` + old analytics stubs, `Encryptor`/`Algorithm`, `AppPagingDataSource`); `App()` without the unused platform parameter
  - [x] 300-line rule enforced by `policy_checks.py file-length` (unchanged)
  - [x] Tests: `test_baselines_empty.py` (baselines stay empty), `NotificationThemeTest`
- Tests: policy `all: ok` with empty baseline; detekt exit 0 with empty baseline; `testAndroidHostTest` + `assembleDevDebug` + iOS framework link green
- Loops: 1/1 — batch-1 run: policy `all: ok` (empty baseline), 78 policy-script tests, `testAndroidHostTest` (all modules) + `assembleDevDebug` green; per-task checks above (detekt clean in MER-003)
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch-1 code read: config/tooling and core plumbing only, no screens; contract + error catalog from the server spec; mock world covers every salon state and permission set.
- Notes: the fixes live in the merchant copy only; the customer core still carries them in its baselines (port later; KMP_TEMPLATE copies the customer core).

### MER-002 — Build variants + CI
- Branch: `feat/mer-002-variants-ci`
- Branched: (batch 1 start, from `origin/merchant`)
- Status: DONE (batch 1 PR)
- Acceptance criteria (backlog MER-002, mirror `customer-ci.yml`):
  - [x] Android dev/prod × debug/release and iOS Debug/Release-Dev/Prod (schemes iosApp-Dev/Prod) from the template; `variants` policy ok
  - [x] Root `.github/workflows/merchant-ci.yml` (paths `WAB-Mobile-Salon/**`): policy checks, detekt, secret scan, Android matrix (assemble + lint + unit tests + R8/APK budget `config/budgets.json`), iOS matrix; the in-folder copy removed (GitHub reads only the root)
  - [x] `config/policy.json` + policy tests + `run_ios_checks.sh` point at `merchant-ci.yml`
- Tests: `python3 -m unittest discover -s scripts/ci/tests` (77 OK); `policy_checks.py variants` ok
- Loops: 1/1 — batch-1 run: policy `all: ok` (empty baseline), 78 policy-script tests, `testAndroidHostTest` (all modules) + `assembleDevDebug` green; per-task checks above (detekt clean in MER-003)
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch-1 code read: config/tooling and core plumbing only, no screens; contract + error catalog from the server spec; mock world covers every salon state and permission set.

### MER-001 — Scaffold the KMP app from the customer template
- Branch: `feat/mer-001-scaffold`
- Status: DONE (PR into `merchant`)
- Acceptance criteria (backlog row MER-001; owner request 2026-10-22: "use the tool, project name merchant, package com.fab.wab.merchant, skip Firebase files"):
  - [x] Generated with `.claude/tools/KMP_TEMPLATE/KMP_TEMPLATE --merge` into this folder (docs/design/.claude kept): same `libs.versions.toml`, `build-logic`, every `core/*` module, `composeApp`, `androidApp` (flavors dev/prod), `iosApp` (schemes iosApp-Dev / iosApp-Prod), CI scripts/policies/detekt/workflow
  - [x] Package `com.fab.wab.merchant` (dev `com.fab.wab.merchant.dev`), project `Merchant`, display name "WAB Merchant" / "WAB للتجار"; API prefix `/merchant/v1`, Socket.IO namespace `/merchant`; dev API = WAB dev server, dev data source = mock
  - [x] Firebase skipped: placeholders in `androidApp/src/{dev,prod}` and `iosApp/Firebase/{dev,prod}` (MER-004 = owner files)
  - [x] ADR on sharing `core/*`: `docs/ADR-001-core-sharing.md` (copy now via the tool; included build / packages later)
  - [x] Local gate green (`scripts/ci/run_local_checks.sh` exit 0: policy tests + checks, detekt, unit tests, 4 Android variants + lint, 4 iOS configurations, K/N tests)
  - [x] Runs on the Android emulator (`com.fab.wab.merchant.dev`, sample list from mock data, glass cards) and the iOS simulator ("WAB Merchant Dev", same screen)
- Tests: generated unit tests (core + sample + shell) via the gate — all green
- Loops: 1/1 — re-checked every criterion against the gate log and both devices
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — generated code identical to the verified template; merchant-specific values only in config; no WAB customer business in the merchant core.
- Notes: DEVIATIONS from the backlog row (owner instructions win): package `com.fab.wab.merchant` instead of `com.wab.merchant`; `feature/sample` kept as the reference feature (removed when the first merchant feature lands) instead of removed.
