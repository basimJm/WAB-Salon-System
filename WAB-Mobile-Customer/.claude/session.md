# WAB-Mobile-Customer — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next customer`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Consumes `/customer/v1` (51 ops) through DTOs generated from `WAB-Server/docs/api/openapi.customer.json` (CUS-009); dev builds use `DATA_SOURCE=remote` against the hosted dev API (CUS-060); gap list `docs/REMOTE_DEV_GAPS.md`.
- Done before the backlog: rules, variants + CI, policy checks, design system, base components, language/theme, permissions, refresh interceptor (CUS-001…003, 005, 007, 008, 014…017).
- Payments through the `wab-payments` KMP launcher (CUS-047 ← PAY-011); push via FCM facade (CUS-004); Firebase apps registered (dev + prod).

## Current task

### CUS-102 — Merged home: type lens, Explore / Near you / Recommended / Book again, tattoo type
- Branch: `feat/cus-102-merged-home`
- Status: IN REVIEW (committed, not pushed)
- Acceptance criteria (BUSINESS_DOMAIN §5.22, §5.23; contract customer 1.13.0: `GET /home?businessType=` keys `explore`, `nearYou`, `recommendedAll`, `bookAgain`):
  - [x] `apiSync` (1.13.0); captured fixtures `GetHome` / `GetBookings` / `GetBookingsById` given the new keys by script (explore = salon + clinic services, nearYou = both nearest lists by distance, recommendedAll = both rails, bookAgain null; bookings `source` CUSTOMER_APP) so mock mode and `ContractFixturesTest` decode
  - [x] `BusinessType.TATTOO` everywhere the type is matched (labels "Tattoo studio" / "استوديو وشم", lens "Tattoo" / "الوشم", list title "Tattoo studios" / "استوديوهات الوشم"); `BusinessRules`: only salons lock the gender, bride only at salons, `allowsReferenceImage` only for TATTOO
  - [x] Type colors as theme tokens (light + dark): salon violet, clinic teal, tattoo amber-brown (`salonType…tattooTypeContainer`), contrast ≥ 4.5:1 tested; `BusinessTypeBadge` on every Home card (Explore tiles, salon cards = badge + audience) and `BusinessTypeLens` chips in the design system
  - [x] Home: no gender toggle (stored gender follows the session and only picks the banners); lens All · Salons · Clinics · Tattoo (default All) sends `businessType` and reloads every section; order banners → Explore → Near you → Recommended → Book again (`UiState.blocks`); Book again only for signed-in customers
  - [x] "See all"/"See more" keep the lens (S04 / S06 with the lens type; S06 with lens All lists every type's catalog); an Explore tile opens S04 with that service and its type
- Tests: `HomeMappersTest` (explore types incl. tattoo, recommended rail, nearYou null/branch entries, bookAgain), `RealHomeFixtureTest`, `HomeViewModelTest` (lens reload with the param, refresh keeps the lens, sections order, book-again null for guests, see-all keeps the lens), `HomeStateUpdatesTest`, `BusinessTypeTextsTest` + `ColorTokensTest` (type labels/colors), `BusinessTypeTest`; `./gradlew testAndroidHostTest` green (Terminal panel); `policy_checks.py all` ok; `api_sync.py --check` ok
- Loops: 0/1
- Review: PENDING
- Notes: DEVIATIONS: Book again opens the business only (the booking flow has no service preselection yet; `salonServiceIds` are mapped but unused); no "location" line in the Home header (no reverse geocoding exists); S04/S06 routes still carry the stored gender (made optional in CUS-103); captured fixtures were migrated by script, not re-captured on a 1.13.0 stack; no tattoo sample in the captures; no device/simulator run, no detekt, no assemble in this task (batch rule §3.13).

### CUS-101 — Search + filter by business type; clinic details/booking regression
- Branch: `fix/cus-101-clinics-search-filter`
- Status: DONE (PR #603)
- Acceptance criteria (owner 2026-10-30: "i cannot find clinics and search look ugly and filtering should be when open filter select salon or clinic then categories filter changes based on filter business type and booking and details for the clinic not work"; BUSINESS_DOMAIN §5.19; operations `GET /salons`, `GET /catalog/services?businessType`, `GET /salons/{id}`, booking drafts):
  - [x] S04: the All/Salons/Clinics tabs are gone; title follows the type ("Salons & clinics" / "Salons" / "Beauty clinics"); hint "Search salons and clinics"; the type is a removable chip like every other filter (removing it keeps the other filters)
  - [x] S05: "Show" All/Salons/Clinics is the first section; choosing a type reloads the service categories from that type's catalog and drops picks of the other type; Reset clears the type; Apply returns it in `SalonFilters.businessType`
  - [x] Home clinic entries (See all / See more) still open S04 filtered to clinics (entry type → filter)
  - [x] Clinic details + booking: the 500 was the server (SRV-179, invalid demo staff photo keys); with the fixed server a clinic opens and a full booking reaches the reference (WAB-C5EC9K, local stack)
  - [x] Booking texts that named "the salon" (any-staff hint, rules title/approval, pay on arrival, success, verify label) are neutral for salons and clinics (AR + EN)
  - [x] Tests: `FilterSheetViewModelTest` (+2: type first + categories follow + picks dropped + applied; reset clears the type), `AllSalonsViewModelTest` (type from the entry, applied via the sheet, chip removal keeps other filters, paging keeps the type)
- Tests: full gate (Terminal panel): policy_checks all ok, run_detekt.sh 0 findings, `./gradlew testAndroidHostTest :androidApp:assembleDevDebug :composeApp:linkDebugFrameworkIosSimulatorArm64` green; first run `:feature:salons:presentation`, `:feature:home:presentation`, `:core:domain`, `:composeApp` host tests + `assembleDevDebug` green. Device (own Pixel_8_Pro AVD, emulator-5554, dev debug against the local stack, AR): search → filter → Clinics (only clinic services) → Apply (title "عيادات التجميل", chip, 2 clinics) → Glow Aesthetic Clinic details → sign in (demo customer, fake OTP) → person (gender) → services → 31 Oct 11:00 → Ahmad → companions → summary (pay on arrival) → OTP → success WAB-C5EC9K
- Loops: 1/1 — re-checked every criterion on the device against the local stack (AR) and in the tests; found and fixed: the composeApp analytics map still named the removed S04 action (compile error), removing the type chip first also cleared services (now only the type), the booking texts named the salon at a clinic
- Review: PASSED (SE ✔ (type in `SalonFilters`, one source; the sheet cancels a stale catalog load on a type switch), Mobile ✔ (AR + EN, RTL chips, design-system chips in the sheet), Architect ✔ (no contract change; server fix SRV-179 on its own branch), QA ✔ (sheet + S04 tests; full gate green; device journey to a clinic booking))
- Notes: found on the way (not app code): hosted dev demo images answer 403 (the `demo/` objects were never uploaded to the dev bucket; owner runs the image seed with storage credentials); after sign-in from a salon page the app lands on Home, not back on the salon page. DEVICE SETUP (local only, never committed): `local.properties` `DEV_API_BASE_URL=http://10.0.2.2:4000`, untracked `androidApp/src/devDebug/AndroidManifest.xml` (cleartext).

### CUS-100 — Animated brand logo on the launch/config screen
- Branch: `feat/cus-100-animated-logo`
- Status: DONE (PR #603)
- Acceptance criteria (owner 2026-10-29: "use in the initial screen that call app configuration api not native splash", "use this for logo just", "faster in 1 sec"; PRD §4.2 splash; no API change):
  - [x] Native splash untouched (earlier native-splash attempt rolled back); only the logo of the config screen (`SplashScreen`) becomes the owner's Lottie `files/wab_logo_splash.json` (unmodified)
  - [x] Played once in `AppTheme.motion.logoReveal` (speed = file length / token; token now 2000 ms, owner edit after the 1 s request) and held on its last frame; same tile size/shape as `AppLogo`
  - [x] Screen leaves only when config is known AND the logo finished (`UiState.logoShown`, `OnLogoAnimationFinished`); static logo until the composition is parsed; parse failure finishes at once (never stuck)
  - [x] Compottie 2.1.0 (2.2+/2.3 need Compose 1.11/1.12 + Kotlin 2.4)
  - [x] Tests: `AnimatedLogoTest` (speed), `MainViewModelTest` (splash waits for logo; logo alone does not leave before config)
- Tests: policy_checks all ok; run_detekt.sh 0 findings; `./gradlew testAndroidHostTest :composeApp:linkDebugFrameworkIosSimulatorArm64` green; device: Pixel AVD emulator-5554 dev debug, cold start → navy tile, stroke trace, filled WAB logo, held, then Home; no crash
- Loops: 1/1 — re-checked every criterion; found and fixed: the first build showed the animation was never visible (config < 1 s) → hold added; the speed test hardcoded 1 s while the token was changed to 2 s → test reads the token
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — design-system component with a token, no literals; logo not mirrored in RTL (brand mark); content description kept; parsing off the main thread by Compottie; fallback on failure; no contract change
- Notes: DEVIATIONS: iOS checked by the framework link only, no simulator run (the simulator app crashes on placeholder Firebase keys, see memory); dark mode not separately captured (the tile is the file's own navy in both themes); `composeApp/build` + `feature/booking/presentation/build` deleted once (corrupt jars from an interrupted build).

### CUS-099 — Booking + bookings by business type
- Branch: `feat/cus-099-clinics-booking`
- Status: IN REVIEW
- Acceptance criteria (BUSINESS_DOMAIN §5.4, §5.19; contract 1.10.0: `POST /bookings/drafts` + `POST /salons/{id}/availability` `persons[].gender` / `person.gender`, `GET /bookings?businessType`):
  - [x] Gender lock only for MALE/FEMALE salons (every person = the salon's gender, no choice); BOTH salons and clinics ask each person's gender (main person prefilled with the customer's gender, companions must choose; Continue shows an error until chosen)
  - [x] Each person's gender sent with the draft and with the availability request
  - [x] Bride option only at FEMALE/BOTH salons and only for a woman; hidden for clinics and men's salons; switching a person to man drops the bride and bride-only picks
  - [x] Rest of the flow unchanged (branch, services, slot, staff, companions, summary)
  - [x] Bookings list filter All / Salons / Clinics (`businessType` query, kept while paging); `BookingSummary.businessType`
  - [x] AR+EN strings; analytics actions `booking_person_gender`, `bookings_business_type`
  - [x] Tests: `BookingFlowBusinessTypeTest` (clinic mixed genders → draft genders, BOTH bride rule, men's lock), `PersonGenderBodiesTest`, `BookingsViewModelTest` (type filter), `BookingFlowViewModelTest` (bride gate)
- Tests: policy_checks all ok; run_detekt.sh 0 findings; `./gradlew testAndroidHostTest :androidApp:assembleDevDebug :composeApp:linkDebugFrameworkIosSimulatorArm64` green (final run after the device fixes). Device (own Pixel_8_Pro AVD, emulator-5556, dev debug in mock mode, AR + EN): clinic booking with a mixed-gender companion (main person Man prefilled, companion Woman chosen, Continue disabled until a gender is picked, no bride option) reached the summary; bookings All / Salons / Clinics filter switches (mock ignores the query); companion texts fixed after the run (they still said "same gender as the salon" at a clinic) and re-checked in EN
- Loops: 1/1 — re-checked every criterion against §5.19 after the device run; found and fixed: companion texts for BOTH salons/clinics, detekt function count (gender change moved to `DraftPerson.withGender`)
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch code reading of both branches; gender sent only from the person (locked salons send their own gender), bride rule in one domain place (`BusinessRules`), no contract drift
- Notes: batch flow with CUS-098 (branch chained from it). DEVIATIONS: booking cards/details and the summary's "salon rules" title do not name clinics; the men's-salon lock and the BOTH-salon bride rule were verified by unit tests only, not on the device; no iOS simulator run (Android only, as asked).

### CUS-098 — Business types in discovery: salons and beauty clinics
- Branch: `feat/cus-098-clinics-discovery`
- Status: IN REVIEW
- Acceptance criteria (BUSINESS_DOMAIN §2, §5.19, §12.10; INTEGRATION §5a; contract 1.10.0: `GET /home`, `GET /salons`, `GET /catalog/services`, `GET /favorites`, `GET /salons/{id}`):
  - [x] Contract re-synced (`api_sync.py`, `--check` ok, `contract_gaps` 0); generator emits the shared string enums (`BusinessType`, `Audience`) as typealiases; mock samples rotate audiences and make the clinic home sections clinics; pre-1.10.0 captured fixtures migrated with the §5.19 rule (gender → SALON + audience), no clinics invented in captures
  - [x] Domain `BusinessType`/`Audience`/`BusinessRules` (core/domain); `SalonSummary` + `SalonDetails` carry type + audience (unknown type = SALON, the migration default); new error codes BUSINESS_TYPE_MISMATCH, AUDIENCE_CHANGE_NOT_ALLOWED, BRIDE_NOT_ALLOWED (AR+EN)
  - [x] Home order: banners, salon services, clinic services, Recommended salons, Recommended clinics, nearest salons, nearest clinics; clinic sections hidden when empty, nearest clinics never repeats the location prompt
  - [x] "See more"/"See all" of clinic sections open the same S04/S06 screens filtered to CLINIC (`Screen.AllSalons/AllServices.businessType`); search opens S04 for every type
  - [x] S04 All / Salons / Clinics tabs (`businessType` query, kept while paging, other filters kept); S06 per type
  - [x] Cards (Home, S04 rows, favorites) and S07 header show "Salon · Women" / "Beauty clinic · Men & women"; AR+EN
  - [x] Tests: `BusinessTypeTest`, `BusinessTypeTextsTest`, `HomeMappersTest`, `HomeStateUpdatesTest`, `HomeViewModelTest` (clinic see-more), `AllSalonsViewModelTest` (type tabs), `AllServicesViewModelTest` (clinic catalog), `SalonSearchApiTest`, `SalonCardMapperTest`, `RealSalonFixturesTest`
- Tests: policy_checks all ok; run_detekt.sh 0 findings; `./gradlew testAndroidHostTest :androidApp:assembleDevDebug :composeApp:linkDebugFrameworkIosSimulatorArm64` green (final run after the device fixes). Device (own Pixel_8_Pro AVD, emulator-5556, dev debug in mock mode, AR + EN): Home shows banners, salon services, clinic services, Recommended salons, Recommended clinics, nearest salons, nearest clinics in that order with "Salon · Men/Women" and "Beauty clinic · Men & women" labels; clinic See all / See more open S04 with Clinics preselected (+ the section's chip); search opens All; S07 header shows the type line
- Loops: 1/1 — re-checked every criterion after the device run; found and fixed: S04 type tabs inset twice (design-system `glassBackground` re-applies the incoming modifier chain; `BusinessTypeTabs` now keeps the caller's padding outside the track; root fix spun off as a separate task)
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — batch code reading; contract re-synced, legacy home aliases no longer read, enums parsed leniently (unknown type = SALON), strings AR+EN
- Notes: batch flow (rules §3.13) with CUS-099. The S05 filter sheet still lists the gender's catalog without a type filter (unchanged behaviour). Captured fixtures (`core/data/fixtures/remote`) were migrated by script, not re-captured from a 1.10.0 server: re-capture when the local stack runs SRV-174…178. DEVICE-RUN SETUP (temporary, reverted, never committed): mock Home from the schema sample (the migrated capture has no clinics), salon details fixture set to CLINIC/BOTH, sample `hasMore` true, `DEV_DATA_SOURCE=mock` in local.properties; the mock serves one list for every filter, so the list content itself does not change per tab.
