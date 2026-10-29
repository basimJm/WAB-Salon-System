# WAB-Mobile-Salon — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next merchant`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Scaffolded (MER-001) with `KMP_TEMPLATE` from the customer app: all modules, design system (flat, design files as drawn since MER-074), sample feature; rules copied in MER-003 (until then `WAB-Mobile-Customer/CLAUDE.md` applies).
- Consumes `/merchant/v1` (merchant contract 1.9.0 since MER-080, salons + clinics `businessType` / `audience`; 1.6.0 MER-075, staff photos + paid at salon; 1.5.0 MER-070, WhatsApp OTP; 1.4.0 MER-068; 1.3.0 added dashboard, reviews, statistics, my account consumed by MER-050/042/043/049); MER-004 Firebase registrations = owner.
- Real-time booking requests: socket + FCM data message, Android overlay / iOS time-sensitive actions (MER-012, MER-028…030).

## Current task

### MER-081 — Clinic and audience in the merchant app
- Branch: `feat/mer-081-clinic-audience`
- Status: IN REVIEW
- Acceptance criteria (BUSINESS_DOMAIN §5.19, §6; operations `PATCH /salon/audience`, `GET /catalog/services`):
  - [x] Salon profile shows type + audience ("Women's salon", "Men's salon", "Salon for men and women", "Beauty clinic · men and women"); hub header label and title ("Manage clinic") follow the type
  - [x] Owner-only "Serve both men and women" (confirm dialog → `PATCH /salon/audience` BOTH → shared salon reloaded, success banner); hidden for clinics, BOTH salons and non-owners; `AUDIENCE_CHANGE_NOT_ALLOWED` shows the error and reloads the salon
  - [x] Services + catalog: catalog of the business's own type (+ `gender` for MALE/FEMALE salons), catalog note per kind (women / men / both / clinic)
  - [x] Bride options (brideOnly service, bride-qualified staff) only for salons serving women (`brideAllowed`, FEMALE or BOTH); refused in the VMs otherwise
  - [x] Clinic wording: hub title, profile name label, type note, catalog note; AR + EN
  - [x] Mock: DEV switcher "Business type" (women / men / both salon, clinic) patches `businessType` / `audience` / `salonAudience` of every fixture; mock `PATCH /salon/audience` widens to BOTH
- Tests: `SalonProfileViewModelTest` (+3: owner widens after confirm, hidden for member/clinic/BOTH, refused → error + reload), `ServicesViewModelTest` (+2: clinic catalog + no bride, men/both bride), `StaffProfileViewModelTest` (+1: men salon hides bride-qualified), `MockWorldTest` (+1), `BusinessKindTest`
- Loops: 1/1 — Batch gate (rules §3.13, both tasks on `feat/mer-081-clinic-audience`): `policy_checks.py all` ok, `scripts/ci/tests` 116 OK, `run_detekt.sh` ok (empty baseline), `./gradlew testAndroidHostTest :androidApp:assembleDevDebug :composeApp:linkDebugFrameworkIosSimulatorArm64` green (190 suites / 653 tests / 0 failures, no `w:`), `api_sync --check` ok, `contract_gaps` 0; device (own Pixel 8 Pro emulator, mock, AR): clinic hub/profile/catalog ("Beauty clinic catalog"), new clinic service and men-salon service without the bride switch, BOTH salon with it, owner widening Men → Both (dialog, banner, hub label, button gone), manager has no profile tile
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — read the diff: widening in its own `AudienceWidening` (VM stays < 300 lines), owner from the session permission set, shared salon refreshed after widening, no hardcoded text; mock overrides only in mock builds
- Notes: DEVIATIONS — wording "salon" stays where the type is unknown or generic (login/registration entry, bookings, team, finance, design-system error texts, services empty state); widening not run on iOS; services already saved as brideOnly keep their badge (data). Temporary `local.properties` (`DEV_DATA_SOURCE=mock`) removed after the device run.

### MER-080 — Register as salon or clinic (contract 1.9.0)
- Branch: `feat/mer-080-business-type-register`
- Status: IN REVIEW
- Acceptance criteria (owner 2026-10-29; BUSINESS_DOMAIN §5.19, §2, §3.3, §12.10; INTEGRATION §5a; operations `POST /salon/applications`, `POST /salon/application/resubmit`, `POST /uploads/license/presign` purpose `MEDICAL_LICENSE`, `GET /catalog/services?businessType=&gender=`):
  - [x] `apiSync` to merchant contract 1.9.0 (`api_sync --check` ok); generator fixed: a `$ref` to a scalar enum component (`BusinessType`, `Audience`) is inlined as `String` with its enum doc (it emitted undefined Kotlin types); captured remote fixtures migrated per §5.19 Migration (salon/catalog `gender` → `businessType` SALON + `audience`; bookings `businessType` + `salonAudience` + person `gender`) → `contract_gaps` 0
  - [x] core: `BusinessType`, `Audience`, `BusinessKind` (brideAllowed, canWidenAudience, catalogGender, clinic = BOTH), `SalonProfile.businessType/audience/kind`, `SalonRepository.currentKind()`; `UploadPurpose.MEDICAL_LICENSE` through the public license routes (`purpose` sent)
  - [x] M04 first step Salon / Clinic; Salon → audience Men / Women / Both; Clinic → no audience question (unisex note) + required medical license (1–5 files, camera / photo / files picker of MER-076, own list, retry/remove); name label Salon/Clinic name; review card with type, audience and medical license; type warning
  - [x] Resubmission: type read from `GET /salon` and locked; salon audience editable; clinic medical license optional (kept on file unless replaced, server rule)
  - [x] Error codes `BUSINESS_TYPE_MISMATCH`, `AUDIENCE_CHANGE_NOT_ALLOWED`, `BRIDE_NOT_ALLOWED` (ErrorCode + AR/EN + ErrorHandling)
  - [x] Contract compile fallout: catalog by `businessType` (+ `gender` for MALE/FEMALE salons), bride flags from `brideAllowed` (UI follow-up in MER-081)
  - [x] AR + EN strings; mock: generated fixtures serve 1.9.0 (captured salon = FEMALE SALON)
- Tests: `BusinessKindTest` (5), `SalonMapperTest` (+1), `RegistrationRulesTest` (+3), `ApplicationMappersTest` (+1), `RegistrationViewModelTest` (+2: clinic medical license, locked resubmission type), `ServicesMappersTest`, `test_api_sync.py` (+1, 11 OK); `policy_checks.py all` ok
- Loops: 1/1 — Batch gate (rules §3.13, both tasks on `feat/mer-081-clinic-audience`): `policy_checks.py all` ok, `scripts/ci/tests` 116 OK, `run_detekt.sh` ok (empty baseline), `./gradlew testAndroidHostTest :androidApp:assembleDevDebug :composeApp:linkDebugFrameworkIosSimulatorArm64` green (190 suites / 653 tests / 0 failures, no `w:`), `api_sync --check` ok, `contract_gaps` 0; device (own Pixel 8 Pro emulator, mock): AR clinic registration (type, unisex note, medical license via camera → "Uploaded" in review), EN salon registration (Men → Both, review "Men and women")
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — read the diff: rules in core `BusinessKind` (no UI logic), clinic audience never sent, medical license through the public license routes with `purpose`, resubmission type locked; detekt complexity fix of `allErrors` landed in the MER-081 commit
- Notes: PRD M04 is still the single-screen form (no PRD section for clinics yet): "first step" = the first card of the form, "review step" = a review card above Submit. DEVIATION: captured fixtures were migrated by script, not re-captured (needs the local stack with SRV-174…178). Not done on device: a full submit (keyboard covered the lower fields in the scripted run; submit is covered by `RegistrationViewModelTest`); iOS simulator not run (framework link only).

### MER-079 — Measured performance pass with the Android skills + deferred device checks of MER-076…078
- Branch: `perf/mer-079-measured-performance`
- Status: IN PROGRESS
- Acceptance criteria (owner 2026-10-27 "complete working and run skill to optimize performance"; CLAUDE.md §6; skills android-profiler, r8-analyzer, jetpack-compose-performance, anr-audit-and-fix):
  - [ ] Baseline: devRelease on the emulator against the local stack; cold start ×5 median; Perfetto startup + Home + bookings scroll + calendar day/week + request sheet (jank %, frame percentiles, main-thread hotspots); release smoke end to end
  - [ ] r8-analyzer: broad keep rules (Ktor, core.data/network/domain) narrowed, proved by the release smoke test
  - [ ] jetpack-compose-performance on the hot screens (compiler reports, stability, lazy keys, deferred reads, calendar grid); anr-audit-and-fix
  - [ ] Baseline Profile + Startup Profile if feasible
  - [ ] After: same measurements; before/after table here and in `docs/PERFORMANCE.md`
  - [ ] MER-076 device checks on Android + iOS simulator; Release-Dev iOS launch + scroll; iOS builds without `Local.xcconfig`
- Tests: `MerchantRootTabsTest`, `LocationFallbackTest`, `MapPickerLocateTest`, `test_performance_config.py` (policy forbids package-wide keep rules); gate: policy + detekt + host unit tests + devDebug/devRelease/prodRelease + all four iOS simulator configurations green
- Loops: 1/1 — re-checked once: gate above green; release smoke test on the emulator (sign-in, dashboard, request accept, calendar, salon hub, upload) after the R8 narrowing; measurements in `docs/PERFORMANCE.md`. DEFERRED (owner 2026-10-28: skip): the remaining device checks of MER-076 on iOS, macrobenchmark/startup profile module
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — read the diff: tab routes by serial name (release bottom bar), package-wide keep rules removed with a policy guard, tone off the main thread, stability config reaches every Compose module, calendar `drawWithCache`, geocoder/location bounded with fallbacks; temporary local manifests removed, none committed.
- Notes: results — main-thread binder time −54 %, recomposition −19 %, request-sheet long frames 6.3 → 4.8, APK −6.9 %, R8 scores 83 % → 98.5 %; cold start and whole-journey jank unchanged within the noise of a shared host.
