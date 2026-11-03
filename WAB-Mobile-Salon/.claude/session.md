# WAB-Mobile-Salon — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next merchant`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Scaffolded (MER-001) with `KMP_TEMPLATE` from the customer app: all modules, design system (flat, design files as drawn since MER-074), sample feature; rules copied in MER-003 (until then `WAB-Mobile-Customer/CLAUDE.md` applies).
- Consumes `/merchant/v1` (merchant contract 1.9.0 since MER-080, salons + clinics `businessType` / `audience`; 1.6.0 MER-075, staff photos + paid at salon; 1.5.0 MER-070, WhatsApp OTP; 1.4.0 MER-068; 1.3.0 added dashboard, reviews, statistics, my account consumed by MER-050/042/043/049); MER-004 Firebase registrations = owner.
- Real-time booking requests: socket + FCM data message, Android overlay / iOS time-sensitive actions (MER-012, MER-028…030).

## Current task

### MER-084 — Tattoo studios in the merchant app (owner 2026-11-03)

- Branch: `feat/mer-084-tattoo` (batch MER-084…086; commit per task, next branches from this one)
- Status: IN REVIEW (committed, not pushed)
- Acceptance criteria (BUSINESS_DOMAIN §5.23, §5.19; SRV-183; merchant contract 1.13.0):
  - [x] `./gradlew apiSync` → merchant 1.13.0 (TATTOO, `referenceImageUrl`, `source`/`createdBy`, new endpoints)
  - [x] `BusinessType.TATTOO`; `BusinessKind.of(TATTOO, …)` = BOTH, `isTattoo`, no bride, no widening, no catalog gender
  - [x] Registration: Salon / Clinic / Tattoo studio cards (icon per type), tattoo = no audience question ("serve both" note), trade license only (no medical license rule, not sent); resubmission keeps the type; audience sent for salons only
  - [x] Wording: hub label + title, profile name label, type note, catalog note for tattoo studios (AR + EN); mock world preset "Tattoo studio"
  - [x] Booking details: per person "Design image" (signed URL, `AppImage` fitted, card image height, medium shape)
  - [x] Mock fixtures (`core/data/fixtures/remote` + dashboard mock) carry `source`/`createdBy`/`referenceImageUrl` (the contract marks them required)
- Tests: `BusinessKindTest` (+1 tattoo), `RegistrationRulesTest` (+1 tattoo), `BookingMappersTest` (design URL mapped; DTO fixtures updated); `./gradlew testAndroidHostTest` green (all modules)
- Loops: 0/1 (batch rule §3.13: loop + review after the batch)
- Review: PENDING
- Notes: detekt, device run deferred to the batch / end of backlog (rules §3.13).

## Last blocks

### MER-083 — Clinic regression + salon-or-clinic wording
- Branch: `fix/mer-083-clinic-regression`
- Status: DONE (PR #604)
- Acceptance criteria (owner 2026-10-30 "fix customer and merchant ... make loop test for customer merchant and admin test full flow regression"; BUSINESS_DOMAIN §5.19; operations `POST /merchant/v1/auth/*`, merchant bookings approve):
  - [x] Regression on the local stack (server with SRV-179): clinic owner (Glow Aesthetic Clinic, demo `+962789020001`, fake OTP) signs in; the customer's clinic booking WAB-C5EC9K (CUS-101 journey) arrives as a new request sheet (person, Botox, Ahmad, 31/10 11:00, 120 JOD, pay on arrival) and Accept shows "booking accepted"
  - [x] Texts seen before sign-in or by any member no longer say "salon" only: login welcome/subtitle, register entry, OTP register mode, not-registered dialog, inactive, access removed, notifications permission (AR + EN)
- Tests: full gate (Terminal panel): policy_checks all ok, run_detekt.sh 0 findings, `./gradlew testAndroidHostTest :androidApp:assembleDevDebug :composeApp:linkDebugFrameworkIosSimulatorArm64` green; device (emulator-5554, dev debug against the local stack, AR): login screen shows the new texts
- Loops: 1/1 — re-ran the device journey after the text change (login → OTP → home with the request); string-only change, no logic to unit-test (DEVIATION: no new unit test; policy I-checks cover AR/EN key parity)
- Review: PASSED (SE ✔ (strings only), Mobile ✔ (AR natural wording, RTL unchanged), Architect ✔ (no contract change), QA ✔ (gate green; cross-app journey customer → merchant))
- Notes: KNOWN (not fixed): on the first cold start right after install the splash took ~10 s and the logo slot stayed empty for several seconds (debug build, fresh install); later starts are normal. DEVICE SETUP (local only, never committed): `local.properties` `DEV_API_BASE_URL=http://10.0.2.2:4000`, untracked `androidApp/src/devDebug/AndroidManifest.xml`.

### MER-082 — Animated brand logo on the launch/config screen
- Branch: `feat/mer-082-animated-logo`
- Status: DONE (PR #604)
- Acceptance criteria (owner 2026-10-29 "do the same for merchant", same as CUS-100; PRD M01 splash; no API change):
  - [x] Native splash untouched; only the logo of the config screen (`SplashScreen`) becomes the owner's Lottie `files/wab_logo_splash.json` (unmodified), tile 108 dp as the design
  - [x] Played once in `AppTheme.motion.logoReveal` (2000 ms, same as customer) and held on its last frame
  - [x] `LaunchGateContent` leaves the splash only when config is known AND the logo finished (`UiState.logoShown`, `OnLogoAnimationFinished`); static logo until parsed; parse failure finishes at once
  - [x] Compottie 2.1.0 (Compose 1.10.3 / Kotlin 2.3.20, same as customer)
  - [x] Tests: `AnimatedLogoTest` (speed), `MainViewModelTest` (splash waits for logo; logo alone does not leave before config)
- Tests: policy_checks all ok; run_detekt.sh clean (after wrapping one KDoc line); `./gradlew testAndroidHostTest :androidApp:assembleDevDebug :composeApp:linkDebugFrameworkIosSimulatorArm64` green; device: emulator-5554 dev debug cold start → navy tile, W stroke tracing, then Login (~2 s); no crash
- Loops: 1/1 — re-checked every criterion; found and fixed: detekt MaxLineLength on the LaunchGateContent KDoc, wrong backlog dependency (MER-008 → MER-019)
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — port of CUS-100 into the merchant design system (own package, token, test); no literals; brand mark not mirrored in RTL; content description kept; no contract change
- Notes: DEVIATIONS: iOS checked by the framework link only (no simulator run); one cold-start frame showed the logo slot empty for a moment before even the static fallback drew; dark mode not captured separately.
