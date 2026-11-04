# WAB-Mobile-Customer — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next customer`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Consumes `/customer/v1` (52 ops) through DTOs generated from `WAB-Server/docs/api/openapi.customer.json` (CUS-009); dev builds use `DATA_SOURCE=remote` against the hosted dev API (CUS-060); gap list `docs/REMOTE_DEV_GAPS.md`.
- Done before the backlog: rules, variants + CI, policy checks, design system, base components, language/theme, permissions, refresh interceptor (CUS-001…003, 005, 007, 008, 014…017).
- Payments through the `wab-payments` KMP launcher (CUS-047 ← PAY-011); push via FCM facade (CUS-004); Firebase apps registered (dev + prod).

## Current task

### CUS-106 — Fix: Near you with GPS on; Near you last (owner 2026-11-03)
- Branch: `fix/cus-106-home-nearest`
- Status: IN REVIEW
- Acceptance criteria (BUSINESS_DOMAIN §5.22; PRD S03 item 7; no contract change):
  - [x] Cause: Android provider asked a fresh BALANCED fix before the cached position; with no network position it waited the 10 s Home timeout, returned null and Home showed "enable location" with GPS on
  - [x] Provider answers from the cached position first (Android fused last location → platform last known → fresh HIGH_ACCURACY fix; iOS any cached `manager.location` → `requestLocation`)
  - [x] Location on but no fix → `NearestUi.Unavailable` ("Could not get your location…" + Try again, AR + EN, `retry_location_click`); only a location turned off meanwhile → LocationOff; resume from settings retries both
  - [x] Home order banners → Explore → Recommended → Book again → Near you (`HomeBlock`, §5.22 updated)
  - [x] Local demo images: plain beige seed placeholders replaced by the repo's Unsplash photos (local stack only, `seed:dev <folder>`; no code change)
- Tests: new `HomeNearYouTest` (slow fix never holds Home back; no fix with location on → Unavailable, Try again fills Near you; turned off while locating → LocationOff), `HomeViewModelTest` + `HomeStateUpdatesTest` (new order); `:feature:home:presentation`, `:composeApp`, `:core:data` host tests green; `:core:data:compileKotlinIosSimulatorArm64` green; detekt 0; policy all ok; `installDevDebug`
- Loops: 1/1 — emulator (Pixel 8 Pro, local stack): the second `/home` with coordinates 0.36 s after the first (14:40:40.285 → .647; before: still placeholder after 8 s); Near you last with real places at 1.3 km in Amman; found and fixed in the loop: suspend call inside `updateState`, missing resource imports, test setup (fallback fix), 300-line limits (location tests split into `HomeNearYouTest`)
- Review: PASSED (SE ✔ (cache-first provider, no new timeout), Mobile ✔ (AR + EN strings, retry state, iOS cache-first), Architect ✔ (no contract change; §5.22 updated), PM/UX ✔ (no wrong prompt, Near you last as asked), QA ✔ (three location cases tested; device timing)) — DEVIATIONS: iOS checked by compile only (no simulator run); the Unavailable state was not reproduced on the device (unit tests only); full app test suite not re-run (home, shell, core/data modules)

### CUS-105 — Fix: Home no longer waits for a GPS fix (owner 2026-11-03)
- Branch: `fix/cus-105-home-location-wait`
- Status: DONE (PR #646)
- Acceptance criteria (BUSINESS_DOMAIN §5.22 Near you; PRD S03):
  - [x] Root cause measured on the emulator (logcat): `/config` + `/installations` answered at 15.0 s, then nothing until `/home` at 25.3 s (answered in 80 ms) = `GetCurrentLocationUseCase` timeout 10 s before the request; server `/home` 15–23 ms
  - [x] Home calls `/home` at once (last fix of the screen or none); Near you = `NearestUi.Locating` shimmer, filled by a second `/home` with the first fix; no fix → `LocationOff`; refresh / lens send the last fix immediately
  - [x] After: cold start → `/home` answered 0.75 s after the first frame (14:20:59.356 → 14:21:00.110)
- Tests: `HomeViewModelTest` (+2: slow GPS never holds Home back, no fix ends with location off; updated: two calls null → fix, refresh sends the last fix); `:feature:home:presentation:testAndroidHostTest` green, detekt clean
- Loops: 1/1 — measured before/after on the same emulator and server; found and fixed while checking: demo images 404 on the local stack (stack seeds records only; `seed:dev` images step run) — local stack only, no code change
- Review: PASSED (SE ✔ (one load path, no new timeout), Mobile ✔ (placeholder instead of an empty section; location-off unchanged), Architect ✔ (no contract change), QA ✔ (slow/none/refresh cases tested; device timing)) — DEVIATION: full app test suite not re-run (home module only); iOS not run

### CUS-104 — Bookings: Upcoming/Past + lens, "Booked by", Rate + Book again; tattoo design image
- Branch: `feat/cus-104-bookings-tattoo` (from `feat/cus-103-search-filters`)
- Status: IN REVIEW (committed, not pushed)
- Acceptance criteria (BUSINESS_DOMAIN §5.20, §5.22, §5.23; contract 1.13.0: bookings `source`/`createdBy`, details `persons[].referenceImageUrl`, drafts `persons[].referenceImageKey`, uploads `BOOKING_REFERENCE`):
  - [x] Bookings list: Upcoming / Past (existing) + the type lens chips All · Salons · Clinics · Tattoo (`businessType` query, kept while paging); every card shows the type badge
  - [x] `BookingSource` (CUSTOMER_APP | MERCHANT) on list rows and details; MERCHANT bookings show "Booked by <place>" / "Booked by <place> - <branch>" on the card and the details salon block (AR + EN)
  - [x] Completed cards: Rate (registered customers → `Screen.RateBooking`) + Book again (opens the business at the booked branch; the booking flow has no service preselection)
  - [x] Uploads moved from feature/profile to core (`core/domain/upload`: `PresignedUpload`, `UploadPurpose` + `BOOKING_REFERENCE`, `UploadsRepository`, `uploadConfirmed`; `core/data/upload`: `UploadsApi`, `UploadsRepositoryImpl`, storage client bound in `dataModule`); the avatar uses the same path
  - [x] Tattoo booking flow (TATTOO only, `BusinessRules.allowsReferenceImage`): step 0 per person "Design image (optional)" — gallery pick (the existing picker compresses to JPEG ≤ 1024 px), upload BOOKING_REFERENCE, preview (`AppLocalImage`, bytes), remove; the key goes in `persons[].referenceImageKey` of the draft
  - [x] Booking details show each person's design image from the signed URL
- Tests: `BookingFlowTattooTest` (upload purpose + key in the draft, remove, cancelled pick, failed pick/upload, other types never offer it), `ReferenceImageBodiesTest`, `BusinessMadeBookingMappersTest` (source, type, image URL), `BookingCardRulesTest` (Rate/Book again rules, Booked by), `BookingsViewModelTest` (+ rate / book again effects, tattoo lens), profile upload tests on the moved core types; `./gradlew testAndroidHostTest` green (560 tests in the XML reports, 0 failures); `:androidApp:assembleDevDebug` green (dev debug APK built); `policy_checks.py all` ok
- Loops: 1/1 — batch loop (CUS-102…104): re-read §5.20/§5.22/§5.23 against the bookings lens + Upcoming/Past, "Booked by", Rate/Book again, tattoo design image (pick/compress/preview/remove/upload `BOOKING_REFERENCE`, draft key, details URL); `testAndroidHostTest` green (561), detekt clean (found and fixed in the loop: 9 detekt issues + the Home lens-switch skeleton flash), `assembleDevDebug` built
- Review: PASSED (SE ✔ (upload code moved to core instead of a cross-feature import; coordinators keep VMs under limits), Mobile ✔ (AR/EN, RTL chips, light/dark tokens with contrast test), Architect ✔ (customer 1.13.0; no contract change), QA ✔) — DEVIATIONS: Book again opens the business without preselected services; "Open now" filtered on the device; no camera for the design image; no device run yet (rules §3.13, end of backlog); mock fixtures migrated by script, not re-captured
- Notes: DEVIATIONS: design image from the gallery only (no camera option); Book again does not preselect services (no preselection in the booking flow); notifications already carry "Booked by" in their text, nothing changed there; no MERCHANT/tattoo sample in the mock fixtures (captured data only); no device run, no detekt, no iOS build (batch rule §3.13).
