# WAB-Mobile-Salon — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next merchant`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Scaffolded (MER-001) with `KMP_TEMPLATE` from the customer app: all modules, design system + Liquid Glass, sample feature; rules copied in MER-003 (until then `WAB-Mobile-Customer/CLAUDE.md` applies).
- Consumes `/merchant/v1` (merchant contract 1.4.0 since MER-068; 1.3.0 added dashboard, reviews, statistics, my account consumed by MER-050/042/043/049); MER-004 Firebase registrations = owner.
- Real-time booking requests: socket + FCM data message, Android overlay / iOS time-sensitive actions (MER-012, MER-028…030).

## Current task

### MER-069 — Sign-in keeps the member's `branchId`
- Branch: `fix/mer-069-signin-branch`
- Branched: (from `origin/merchant`)
- Status: IN REVIEW
- Acceptance criteria (backlog MER-069; SRV-149 member `branchId`; BUSINESS_DOMAIN §6 branch scope; found reviewing MER-068):
  - [x] `MemberDto.toDomain()` (sign-in) maps `branchId` with the token-refresh rule: none for the owner, blank = none
  - [x] A manager / employee is `MemberScope.OneBranch(branchId)` from sign-in (was `OneBranch(null)` = every branch passed the client filters until a refresh)
- Tests: `AuthMappersTest` (+3: branch member scope, owner ignores a branch id, blank id); `./gradlew testAndroidHostTest` 178 suites / 581 tests / 0 failures; `policy_checks.py all: ok`
- Loops: 1/1 — re-checked both criteria against the refresh mapper (`RemoteTokenRefreshApi.toProfile`), the session store (persists `branchId`) and the fresh test report (new cases present)
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — data-layer mapper only, same rule as refresh, no new strings; the server already enforced branch scope, so this aligns the client filters. DEVIATIONS: not run on a device (needs a branch member sign-in: local stack only, real OTP is owner-gated); full gate follows in the end-of-backlog run.

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
