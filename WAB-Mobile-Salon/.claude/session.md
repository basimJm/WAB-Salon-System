# WAB-Mobile-Salon — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next merchant`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Scaffolded (MER-001) with `KMP_TEMPLATE` from the customer app: all modules, design system + Liquid Glass, sample feature; rules copied in MER-003 (until then `WAB-Mobile-Customer/CLAUDE.md` applies).
- Consumes `/merchant/v1` (merchant contract 1.4.0 since MER-068; 1.3.0 added dashboard, reviews, statistics, my account consumed by MER-050/042/043/049); MER-004 Firebase registrations = owner.
- Real-time booking requests: socket + FCM data message, Android overlay / iOS time-sensitive actions (MER-012, MER-028…030).

## Current task

### MER-068 — Re-sync the merchant contract 1.4.0 after SRV-151
- Branch: `feat/mer-068-contract-sync`
- Branched: (from `origin/merchant`)
- Status: IN REVIEW
- Acceptance criteria (backlog MER-068; contract `openapi.merchant.json` 1.4.0 (SRV-151); `POST /salon/applications`, branch status operations; BUSINESS_DOMAIN §11 `INVALID_TRANSITION`; REMOTE_DEV_GAPS #9–#11):
  - [x] `./gradlew apiSync` regenerated the contract (31 files): version 1.4.0, 144 id patterns `^[a-fA-F0-9]{24}$`, `PostSalonApplicationsData.member` = shared `MemberProfile` (`PostSalonApplicationsDataMember` gone); `api_sync --check` ok; `contract_gaps.py` 0 gaps (was 6 undeclared fields)
  - [x] Fallout fixed: `ApplicationSession` carries the domain `MemberProfile` + permission keys from the answer; `SubmitApplicationUseCase` signs the owner in with them (no local "every permission" / form first name); unknown role → EMPLOYEE like sign-in; `branchId` mapped
  - [x] Branch status refusals (`INVALID_TRANSITION`, now with branch messages on the server): the app still branches on the code and never shows raw server text, so the branch screens get their own AR + EN text (`branchErrorText`, `branch_error_invalid_status`) instead of the shared booking wording; other codes unchanged
  - [x] Captured `core/data/fixtures/remote/PostSalonApplications.json` already carries every declared `MemberProfile` field (no re-capture needed); contract / fixture tests assert it
  - [x] `docs/REMOTE_DEV_GAPS.md` #9, #10, #11 → Fixed (SRV-151 + MER-068); summary line updated
  - [x] Availability / draft person date-times: not in the merchant contract (customer-only operations), nothing to change here
- Tests: `BranchErrorTextTest` (2), `ApplicationMappersTest` (+1), `RealApplicationFixturesTest` (member + permissions), `ApplicationUseCasesTest` (+1 server answer wins), `test_api_sync.CommittedContractTest` (2: plain anchored id patterns, application member `$ref`); `./gradlew testAndroidHostTest` all modules 178 suites / 578 tests / 0 failures; `policy_checks.py all: ok`; script tests 101 OK; `api_sync.py --check` ok
- Loops: 1/1 — re-checked every criterion against the regenerated snapshot (version, member `$ref`, pattern count), the captured fixture, `contract_gaps` (0) and the host-test reports (new suites present, 0 failures); nothing found to fix after the run
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — four-role reading of the diff: generated files only from the tool; mapper in the data layer, domain keeps no DTOs; no hardcoded text (AR + EN resources), branch text scoped to the branches feature; contract regression guarded by a script test; session now follows the server (single source of truth for permissions). DEVIATIONS: host unit tests + policy + script tests only (no detekt, Android/iOS builds, emulator/simulator: batched rule §3.13, lead runs the full gate); UI string not viewed on a device; auth sign-in mapper (`feature/auth`) still drops `branchId` (out of scope, not touched).
- Notes: contract re-sync = `./gradlew apiSync` then `contract_gaps.py`; patterns are not used by the generator.

### MER-067 — iOS launch crash in `IosBookingRequests.registerCategory`
- Branch: `fix/mer-067-ios-category-crash`
- Branched: (from `origin/merchant`)
- Status: IN REVIEW
- Acceptance criteria (backlog MER-067; PRD M10 iOS actionable request alert, MER-030):
  - [x] Root cause from evidence: crash reports (x2 / x21 = the `identifier` argument with a garbage isa) + disassembly of `registerCategory`'s coroutine: K/N converted `BookingRequestCategory.ACCEPT` to an NSString (`Kotlin_Interop_refToObjC`) before the suspending `getString`, spilled the raw pointer into the continuation and passed it after resuming, when the autorelease pool of the earlier dispatch had freed it
  - [x] Fix: titles loaded first (`BookingRequestTitles`), Objective-C objects built in the non-suspend `bookingRequestCategory(titles)`; AR/EN titles from resources; re-registration on language change unchanged
  - [x] Regression test (iosTest, runs on the simulator): category identifiers / titles / options, titles produced across real suspensions and thread hops
  - [x] Debug-Dev app launches on the iPhone 17 Pro simulator and stays up: maintenance screen in Arabic, relaunched with the stored language `en` → English maintenance screen, back to Arabic; no new crash report, process alive, booking request push delivered as time-sensitive
- Tests: `:composeApp:iosSimulatorArm64Test` (32 tests, 0 failures, incl. `BookingRequestCategoryTest` 2) · `:composeApp:testAndroidHostTest` green · `:composeApp:linkDebugFrameworkIosSimulatorArm64` + `xcodebuild` iosApp-Dev Debug-Dev (simulator) OK · `policy_checks.py all: ok`
- Loops: 1/1 — re-checked each criterion against the rebuilt dylib (new `bookingRequestCategory` symbol present), three simulator launches (AR, EN, AR) and the crash-report folder (last report 22:25, before the fix)
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — minimal change in the iOS shell layer only; no new strings/constants in app code; Android untouched; no other iosMain call passes a suspend result inside an Objective-C argument list (only `getString` user in iosMain). DEVIATIONS: no detekt / full gate (batched rule, lead runs it); the language switch was done by writing the stored preference (the maintenance screen has no language toggle), so the live in-process re-registration on a language change was not exercised; the notification's Accept / Reject buttons were not opened (simulated long-press did not expand the alert); the unit test cannot reproduce the native use-after-free itself, the simulator launch is the proof.
- Notes: K/N gotcha — never call a suspend function inside the argument list of an Objective-C call; load values first.

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
