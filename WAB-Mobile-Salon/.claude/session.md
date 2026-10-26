# WAB-Mobile-Salon — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next merchant`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Scaffolded (MER-001) with `KMP_TEMPLATE` from the customer app: all modules, design system (flat, design files as drawn since MER-074), sample feature; rules copied in MER-003 (until then `WAB-Mobile-Customer/CLAUDE.md` applies).
- Consumes `/merchant/v1` (merchant contract 1.5.0 since MER-070, WhatsApp OTP; 1.4.0 MER-068; 1.3.0 added dashboard, reviews, statistics, my account consumed by MER-050/042/043/049); MER-004 Firebase registrations = owner.
- Real-time booking requests: socket + FCM data message, Android overlay / iOS time-sensitive actions (MER-012, MER-028…030).

## Current task

### MER-075 — Merchant contract 1.6.0 (SRV-170) + end-to-end pass on the local stack
- Branch: `feat/mer-075-contract-1-6`
- Status: IN PROGRESS
- Acceptance criteria (SRV-170, BUSINESS_DOMAIN §5.5; `GET /bookings`, `GET /bookings/{id}`, `GET /dashboard`; PRD M07–M09; design 03 `on.details`):
  - [x] `apiSync` to merchant contract 1.6.0; `api_sync --check` ok; `contract_gaps.py` 0 gaps after re-capturing `GetBookings`, `GetBookingsById` (a COMPLETED booking) and `GetDashboard` from the local stack (read-only owner capture, no full capture: it would cancel leftover bookings of the shared stack)
  - [x] Staff per person `{id, name, firstName, photoUrl}`: `StaffRef.photoUrl` mapped on list rows, details staff and persons; details person footer = design 03 26 dp staff circle (photo, else first letter) + name + start – end
  - [x] `money.remaining` = still owed (0 once final), `money.paidAtSalon` new: "Paid at the salon" row (AR + EN) when non-zero; "Refunded" only when non-zero (was shown as 0 on every booking)
  - [x] `rejection` on list rows decoded (contract tests); NOT drawn on list cards: PRD M08 card and design 03 list card have no reason (details already shows it, design `hasReason`)
  - [x] Hand dashboard mock fixture carries the new required `firstName`
  - [ ] End-to-end pass (owner, branch manager, employee; Android + iOS) → `docs/E2E_RESULTS.md`
- Tests: `BookingMappersTest` (+2), `RealBookingsFixturesTest` (+1 completed booking), `BookingMoneyTest` (2, new); contract decoders on the new captures
- Loops: 0/1
- Review: PENDING

### MER-074 — Design as drawn, no Liquid Glass
- Branch: `feat/mer-074-flat-design`
- Branched: (from `fix/mer-073-otp-screen`)
- Status: IN REVIEW
- Acceptance criteria (owner 2026-10-26 "ignore liquid glass effect and implement the design as is"; `design/WAB Merchant 01…08 *.dc.html`, `tv()` colours):
  - [x] Glass removed from the merchant design system: `components/glass` (AppGlassSurface, liquidGlass, glassBackground, press-scale, Haze backdrop), `GlassTokens`, glass previews + tests, `haze` dependency; `AppTheme.glass` → `AppTheme.surfaces` (`SurfaceTokens`: `--card/--surface/--soft` + `--line` 1 dp, state border 1.5 dp)
  - [x] One flat primitive set (`components/surface`): `cardBackground(tone, stateBorder)` (card fill gets the line edge, tinted fills none), `barBackground(edge)`, `AppSurface`, `appClickable` (ripple); all 30 call sites in core + features moved
  - [x] Colours = design `tv()`: `--surface` #F8F7FB / #1F2340, `--soft` #F3EEFB / #2C2553 (were translucent violet)
  - [x] Tab bar = design: attached `var(--card)` bar with `border-top` line, items `padding:6px 0;gap:3px`, 22 dp icon, 11 sp 700/500 accent/faint, no pill; content sits above it (no floating inset); rail in landscape with the same flat items and a content-side edge
  - [x] Top bar = design: plain 22 dp back chevron (no circle), `padding:0 10px`, centered title; icon buttons = 46 dp `radius:14` card + line (Home bell, filter, calendar arrows)
  - [x] Buttons: gradient primary + violet shadow, disabled = `var(--soft)` + faint text (not dimmed); secondary/outlined = card + line; chips = `chipS` (36 dp, radius 11, soft + 1.5 dp #A855F7 selected, card + line otherwise, 12.5/600 ink); segmented tabs = `segS` (surface track, 4 dp gap, radius 11, gradient selected, muted others, 12.5/600); fields = card + 1.5 dp line / accent focus / danger error; toast, dialog, OTP boxes flat
  - [x] Screens checked against the design: Home (greeting above the Playfair 19 name, pending card 1.5 dp #D8B4FE border + soft shadow, KPI tiles on `--surface`/`--soft`), Salon hub (salon card radius 20, 2-column tiles radius 18 with 40 dp soft icon box, 14/700 title, 11.5 sub, `padding:8px 20px`, gap 10), Finance (gradient payout card 30/700 + divider, info on `--surface`), notifications (unread = `--soft` without edge), bookings, calendar, more, profile, services, team, policies, bank details
  - [x] M10 request sheet keyed by request id: Back no longer leaves an invisible scrim that swallows the next tap (found while touring)
  - [x] `CLAUDE.md` module map + §4 rule rewritten (design files as drawn, no Liquid Glass, owner 2026-10-26); README, detekt allowed locals, catalog comment
- Tests: `SurfaceTokensTest` (2: design colours per tone light/dark; opaque fills, 1 dp line < 1.5 dp state border); `GlassTokensTest` removed with the glass code; `./gradlew testAndroidHostTest` 181 suites / 589 tests / 0 failures; `policy_checks.py all` ok; detekt ok (empty baseline); `:androidApp:assembleDevDebug` ok; `:composeApp:linkDebugFrameworkIosSimulatorArm64` ok
- Loops: 1/1 — re-checked each criterion on the emulator (Pixel 8 Pro, local stack; Lamar owner, Khalda employee, Rose owner): AR RTL light + dark, landscape rail, employee 4-tab bar; found and fixed in the loop: invisible request-sheet scrim, hub tiles in one column (design: 2), flat finance card (design: gradient), detekt line lengths
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — change made once in the design system (tokens + one primitive file), screens follow; customer app untouched; no hardcoded values (constants files carry the design CSS). DEVIATIONS: EN LTR checked on auth/OTP only (tab screens toured in Arabic); only Home, Salon hub, Finance, Bookings, Calendar, More compared with the design file side by side (profile/services/team/policies/bank looked at, not measured); previews not re-rendered in the IDE; no iOS simulator run (framework link only).

### MER-073 — OTP screen fixes + every OTP flow tested on the local stack
- Branch: `fix/mer-073-otp-screen`
- Branched: (from `origin/merchant` + `origin/main`, already up to date)
- Status: IN REVIEW
- Acceptance criteria (owner 2026-10-26 "fix merchant OTP screen and test all flows"; PRD M03 + Customer PRD S13; BUSINESS_DOMAIN §3.1a; `POST /auth/otp/request`, `POST /auth/otp/verify`, `otpToken` in login / application / change phone / payout details; design `WAB Merchant 01 Onboarding.dc.html` `on.otp`):
  - [x] Layout = merchant design (was the customer S13 copy): `padding:54px 22px 30px` measured from the screen top (status bar included, also login), back pill + centered mode title (`t.modes`: Log in / Register salon / Change number / Confirm bank details), icon per mode (phone / house / bank), title "Enter verification code", bank note (bank details), boxes 56 dp / radius 14 / gap 8 / digit 22 / `margin:28px 0 10px`, flat card cells with the 4 dp focus ring drawn outside (the current cell no longer shrinks), resend `margin-top:18px`; phone shown `+962 7 9123 4567`; content keeps the phone width (≤ 560 dp) in landscape / tablets
  - [x] Keyboard: the field takes focus + keyboard when a code is waiting, after a wrong code and after each new code; `ImeAction.Done` verifies; autofill `ContentType.SmsOtpCode`
  - [x] Input: Arabic-Indic / Eastern Arabic-Indic digits accepted; a pasted whole code (WhatsApp "copy code" or a message) replaces the typed digits; after a refused code the next digit starts a new code (was: a full wrong code ignored every key until 6 backspaces)
  - [x] `OTP_BLOCKED` on verify (5th wrong code) shows the blocked banner with the remaining time (one `otp/request` answers `blockedUntil`, nothing is sent while blocked); was a toast + a resend link that could not work
  - [x] One code request per OTP screen: `onStart` re-ran on every re-subscription (back from WhatsApp after > 5 s) and, past the 60 s cooldown, sent a NEW code that replaced the one the member had just read
  - [x] Bank details: the form loads once; coming back from the OTP screen re-ran the load and replaced the typed bank name / holder with the saved ones, so the save failed with `VALIDATION_ERROR` after a spent code
  - [x] Change-phone sheet: phone field box is LTR (`+962` before the number, as in the design), label/error keep the screen direction (`AppTextField(fieldDirection)`)
  - [x] All flows on the emulator (Pixel 8 Pro, `emulator-5570`) against the local stack (`OTP_PROVIDER=fake`, code 123456) — results in Notes
- Tests: `ComponentLogicTest` (+3: Arabic digits, paste, restart after a refused code), `PhoneDisplayTest` (2), `OtpVerifyErrorsTest` (blocked banner + blocked without status), `OtpViewModelTest` (+1 no second request on re-subscription, codes counter), `BankDetailsViewModelTest` (+1 typed details survive the OTP round trip); `:feature:auth:presentation`, `:feature:finance:presentation`, `:feature:more:presentation`, `:core:design-system` host tests green; `policy_checks.py all` ok; detekt ok; `:androidApp:assembleDevDebug` ok
- Loops: 1/1 — re-checked every criterion on the emulator against the local stack after the last change (sign-in, wrong code, blocked, expiry + resend, register, change phone, bank details, leave + return); found and fixed in the loop: digits ignored after a refused full code, no keyboard after a resend, second code request on re-subscription, bank fields reset by the reload
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — VM state only (no logic in composables), no new contract, texts AR + EN, constants in `AuthDesignConstants`, policy + detekt clean. DEVIATIONS in Notes.
- Notes: device results (local stack, dev build with a LOCAL `local.properties` `DEV_API_BASE_URL=http://10.0.2.2:4000` + `DEV_DATA_SOURCE=remote`, and an UNCOMMITTED `android:usesCleartextTraffic="true"` in the debug manifest for http to the host — reverted before commit): sign-in owner Lamar ✔ (wrong code → server "attempts left: 4" line, then right code → Home), sign-in Khalda manager after expiry popup + resend ✔, wrong code ×5 (Khalda employee) → blocked banner 15:02 ✔, resend after 60 s ✔ (new countdown + lifetime), code lifetime 5:00 → expired popup → resend ✔, registration (new number 789777001) → not-linked dialog → REGISTER OTP → M04 form ✔ (application not submitted: needs document uploads), change phone owner → 789555001 ✔ and back to 789000001 ✔, bank details ✔ (saved with the proof after 10 s on the OTP screen), leave to the launcher 70 s and come back keeps the typed digits and sends no new code ✔; AR RTL + EN LTR, landscape with keyboard, font scale 200 % checked. Not exercised on device: paste and Arabic-Indic digits (adb `input text` is ASCII only, no clipboard command) — unit tests only; `OTP_DELIVERY_FAILED` (fake provider never fails). Found outside OTP (task chip): Back on the M10 request sheet leaves an invisible scrim that swallows the next tap.

### MER-071 — Crash fix: decoding failures become `AppError.ParseError`
- Branch: `fix/mer-071-decode-crash`
- Status: IN REVIEW
- Acceptance criteria (customer crash report 2026-10-26, same transport code; rules "failures are AppResult/AppError, never thrown"):
  - [x] `safeApiCall` catches Ktor's `ContentConvertException` (`JsonConvertException` is not a kotlinx `SerializationException`) → `AppError.ParseError`
  - [x] Regression test: 200 body missing a required field → `ParseError` (the customer twin was proven red without the fix)
- Tests: `SafeApiCallTest` (+1, 8 total); `./gradlew :core:network:testAndroidHostTest` green
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — one catch in the transport layer, valid responses unchanged.
