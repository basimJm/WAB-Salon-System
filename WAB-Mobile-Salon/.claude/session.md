# WAB-Mobile-Salon — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next merchant`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Scaffolded (MER-001) with `KMP_TEMPLATE` from the customer app: all modules, design system + Liquid Glass, sample feature; rules copied in MER-003 (until then `WAB-Mobile-Customer/CLAUDE.md` applies).
- Consumes `/merchant/v1` (merchant contract 1.5.0 since MER-070, WhatsApp OTP; 1.4.0 MER-068; 1.3.0 added dashboard, reviews, statistics, my account consumed by MER-050/042/043/049); MER-004 Firebase registrations = owner.
- Real-time booking requests: socket + FCM data message, Android overlay / iOS time-sensitive actions (MER-012, MER-028…030).

## Current task

### MER-073 — OTP screen fixes + every OTP flow tested on the local stack
- Branch: `fix/mer-073-otp-screen`
- Branched: (from `origin/merchant` + `origin/main`, already up to date)
- Status: IN PROGRESS
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
- Loops: 0/1
- Review: PENDING
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

### MER-070 — WhatsApp phone OTP (Firebase Phone Auth removed)
- Branch: `feat/mer-070-whatsapp-otp`
- Branched: (from local `feat/srv-153-whatsapp-otp` + `origin/merchant` merged; server branch not merged yet, lead ships SDK + server + apps together)
- Status: IN REVIEW
- Acceptance criteria (backlog MER-070; BUSINESS_DOMAIN §3.1a; contract `openapi.merchant.json` 1.5.0: `POST /auth/otp/request`, NEW `POST /auth/otp/verify`, `otpToken` in `/auth/login`, `/auth/change-phone`, `/salon/applications`, `PUT /salon/payout-details`; REMOVED `/auth/otp/wrong-attempt`; PRD M03/§4.4):
  - [x] `./gradlew apiSync` (31 files, 1.5.0); `api_sync --check` ok; `contract_gaps.py` 0 gaps (captured `PostAuthOtpRequest` + `expiresInSeconds`, new `PostAuthOtpVerify`, `PostAuthOtpWrongAttempt` removed; hand-edited from the server code, not re-captured)
  - [x] Firebase Phone Auth removed: `PhoneAuthGateway`/`FirebaseResult`/fakes, Android gateway + log, iOS Kotlin bridge + `SwiftPhoneAuthBridge`, `PhoneAuthLog.swift`, App Check (Android debug/release setup + deps, iOS factory, `FirebaseAuth`/`FirebaseAppCheck` SPM products, App Attest entitlement + xcconfig), reCAPTCHA URL scheme + `handleAuthURL`, `androidActivity` Koin property, `firebase-auth`; FCM / analytics / Crashlytics untouched
  - [x] OTP flow: request → code entry (`otpLength`, resend countdown, code lifetime `expiresInSeconds` with "expires in" line + expired popup, WhatsApp wording AR + EN) → verify → `otpToken` into sign-in / application / change phone / bank details (`OtpVerified.otpToken`, `PendingOtpVerification` hand-off kept)
  - [x] Errors: `OTP_DELIVERY_FAILED` (new `ErrorCode` + AR/EN `error_code_*` + `ErrorHandling` DISMISS) on request; `OTP_INVALID` shows the server's attempts-left line (generic text fallback), `OTP_EXPIRED` popup, `OTP_BLOCKED` ends the code; single use: a failed sign-in after verify needs a new code; a rejected REGISTER token sends M04 back to login
  - [x] Verify is a `publicRequest()` (core/network): no token, no refresh + retry on its 401 (a wrong code would otherwise count twice for a signed-in member)
  - [x] Mock mode: contract fixtures answer request + verify (any code)
  - [x] `capture_remote_fixtures.py` / `capture_flows.py` / `capture_edits.py` / `realtime_probe.mjs` use request → verify of the local stack's fixed code (`config/remote-capture.json` `otpFixedCode`; `OTP_PROVIDER=fake OTP_FIXED_CODE=123456`), `otpToken` redacted; not re-run (no local stack started)
  - [x] Docs: PRD §2/§4.4/M03, BRD, README, `CLAUDE.md` module map, `.claude/Integration.md`, memory
- Tests: `OtpViewModelTest` (7), `OtpVerifyErrorsTest` (6), `OtpUseCasesTest` (2), `AuthMappersTest` (+1), `RealAuthFixturesTest` (request + verify), `AuthRefreshInterceptorTest` (+1 public request), `RegistrationViewModelTest` (+1 rejected proof), `ErrorCodeTest`, `FirebaseFacadeTest` (phone-auth cases removed), `test_capture_otp.py` (4); `./gradlew testAndroidHostTest` 180 suites / 589 tests / 0 failures; `policy_checks.py all: ok`; script tests 105 OK; detekt clean (empty baseline); `:androidApp:assembleDevDebug` + `:composeApp:linkDebugFrameworkIosSimulatorArm64` green
- Loops: 1/1 — re-checked every criterion against the contract (operation list, DTOs), the server verify/consume order (`phoneOtp.service`, `phoneVerifier`) and the test reports; found and fixed in the loop: verify 401 would refresh + retry (double wrong count), a refused early resend cleared a live code, registration with an expired token had no way out, detekt line lengths, an unnecessary safe call (`-Werror`)
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — four-role reading of the diff: domain/data/presentation layering kept (verify use case, mapper in data, VM state only), no hardcoded text (AR + EN), timers from the server, Firebase now push/analytics/crash only, contract regenerated by the tool, error-code policy green. DEVIATIONS: no emulator/simulator run and no Xcode app build (Swift edits compiled only through the framework link, not `xcodebuild`); capture fixtures hand-edited, not re-captured (no local stack); proof lifetime 10 min may be short for a slow M04 form (falls back to login; owner/server may raise `otp.proofTtlSec`).
