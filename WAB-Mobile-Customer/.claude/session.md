# WAB-Mobile-Customer — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next customer`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Consumes `/customer/v1` (51 ops) through DTOs generated from `WAB-Server/docs/api/openapi.customer.json` (CUS-009); dev builds use `DATA_SOURCE=remote` against the hosted dev API (CUS-060); gap list `docs/REMOTE_DEV_GAPS.md`.
- Done before the backlog: rules, variants + CI, policy checks, design system, base components, language/theme, permissions, refresh interceptor (CUS-001…003, 005, 007, 008, 014…017).
- Payments through the `wab-payments` KMP launcher (CUS-047 ← PAY-011); push via FCM facade (CUS-004); Firebase apps registered (dev + prod).

## Current task

### CUS-090 — Crash fix: decoding failures become `AppError.ParseError`
- Branch: `fix/cus-090-decode-crash`
- Status: IN REVIEW
- Acceptance criteria (owner crash report 2026-10-26; rules §1.7 "failures are AppResult/AppError, never thrown"):
  - [x] Root cause: Ktor wraps body decoding failures in `io.ktor.serialization.JsonConvertException` (a `ContentConvertException`, not a kotlinx `SerializationException`), so `safeApiCall` let it escape → FATAL on `OTP request` when the hosted dev API (old server) omitted `expiresInSeconds`
  - [x] `safeApiCall` catches `ContentConvertException` → `AppError.ParseError` (the screen shows its error state instead of crashing)
  - [x] Regression test: a 200 body missing a required field → `ParseError`; proven to fail without the fix (`JsonConvertException`)
- Tests: `SafeApiCallTest` (+1, 7 total); `./gradlew :core:network:testAndroidHostTest` green; red without the fix
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — one catch in the transport layer, no behaviour change for valid responses. NOTE: the OTP screen will still show an error against the hosted dev API until it runs the new server (main sync after the owner sets the Render env, SRV-154).

### CUS-089 — WhatsApp OTP: Firebase Phone Auth removed; request → code → verify → `otpToken` into login / register / change phone / booking
- Branch: `feat/cus-089-whatsapp-otp` (from `feat/srv-153-whatsapp-otp` + `origin/customer`; ships with SRV-153 / OTP-011)
- Status: IN REVIEW
- Acceptance criteria (BUSINESS_DOMAIN §3.1a, §11; PRD S13; `openapi.customer.json` 1.4.0: `POST /auth/otp/request`, NEW `POST /auth/otp/verify`, `otpToken` in `/auth/login`, `/auth/register`, `/auth/change-phone`, `/bookings/drafts/{id}/verify-otp`; REMOVED `/auth/otp/wrong-attempt`):
  - [x] Contract re-synced (`api_sync.py`, snapshot 0ea82ecb); `api_sync --check` ok; `contract_gaps.py` 0 gaps
  - [x] Firebase Phone Auth removed: `PhoneAuthGateway`/`PhoneVerification`/`FirebaseResult`/`FirebaseFailure` + `authFailureForCode`, `AndroidPhoneAuthGateway`, `PhoneAuthLog` (Kotlin + Swift), `IosPhoneAuthGateway`, `PhoneAuthBridge` + `SwiftPhoneAuthBridge`, `FakePhoneAuthGateway`, `CurrentActivityProvider` + `androidActivity` Koin property, reCAPTCHA URL scheme (`firebase_config.sh`) + `handleAuthURL`, App Check (Android debug/release `AppCheckSetup`, `AppCheckSetup.swift`, App Attest entitlement + `APP_ATTEST_ENVIRONMENT`), catalog `firebase-auth` / `firebase-appcheck-*`, SPM `FirebaseAuth` / `FirebaseAppCheck` products; FCM, Analytics, Crashlytics, app-instance id unchanged
  - [x] Wrong-attempt call removed (API, repository, use case, DI, fixtures); `VerifyOtpUseCase` + `AuthRepository.verifyOtp`; `LoginWithOtpTokenUseCase`; `OtpVerified.otpToken`, `RegisterRequest.otpToken`, change phone + booking draft verify send `otpToken`
  - [x] S13: code boxes = `otpLength`, resend countdown = `resendAfterSeconds`, expiry countdown = `expiresInSeconds` (line under the boxes; at 0 → Expired popup, Verify off), "We sent a code on WhatsApp to" (AR + EN); not allowed without block → earlier code still typeable
  - [x] Errors through `otpFailureOf` (domain, code-driven): `OTP_INVALID` → server attempts-left text from `details[]` on `body.code` (own text otherwise); `OTP_EXPIRED` / refused token → Expired popup; `OTP_BLOCKED` → code cleared, next request shows `blockedUntil`; `OTP_DELIVERY_FAILED` → request error "number has no WhatsApp" + retry; any failed sign-in after verify needs a new code (single-use token)
  - [x] `OTP_DELIVERY_FAILED` in `ErrorCode` + `error_code_otp_delivery_failed` AR/EN + error table (DISMISS); `error_code_otp_blocked` now "Too many attempts"
  - [x] Mock: generated `PostAuthOtpRequest` (`expiresInSeconds` hint 300) / `PostAuthOtpVerify` fixtures, so dev mock still signs in; stale `PostAuthOtpRequest.json` / `PostAuthOtpWrongAttempt.json` captures deleted
  - [x] Capture tool: `fake-otp:` proofs replaced by `scripts/capture_otp.py` (request + verify with `fakeOtpCode` / `--otp-code`, waits out a resend countdown); `otpToken` redacted
  - [x] Docs: `docs/FIREBASE_SETUP.md` (push/analytics/crash only), PRD §2.1 + S13 + §13 auth line, `CLAUDE.md` module map, `.claude/Integration.md`, `.claude/memory.md`
- Tests: new `OtpViewModelTest` (10: request + resend/expiry countdowns, expiry popup, verify → login, server attempts text, blocked on verify → `blockedUntil`, expired + refused token, failed sign-in needs a new code, booking purpose publishes the token, not-allowed keeps code, no-WhatsApp error + retry), `OtpFailureAndUseCasesTest` (3), `AuthRepositoryOtpTest` (4, MockEngine wire bodies + envelopes), `AuthMappersTest` (+1), `RealAuthFixturesTest` (mock OTP fixtures), `ContractFixturesTest`, `FirebaseFacadeTest` trimmed, `ErrorCodeTest`; Python `test_capture_otp.py` (3). Terminal panel: `./gradlew testAndroidHostTest --continue` BUILD SUCCESSFUL, 438 host tests, 0 failures; `:androidApp:assembleDevDebug` ok; `:composeApp:linkDebugFrameworkIosSimulatorArm64` ok; `run_detekt.sh` ok after one MaxLineLength fix; `policy_checks.py all` ok; `scripts/ci/tests` 92 OK; `api_sync.py --check` ok; `contract_gaps.py` 0
- Loops: 1/1 — re-checked every criterion on the final tree against §3.1a and the 1.4.0 operations (request/verify bodies, all four `otpToken` callers, error codes and statuses); found and fixed: detekt MaxLineLength in `ErrorHandling.kt`, capture script over 300 lines (OTP helper split out), `ContractFixturesTest` still listing the removed operation
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — branch diff read once per role: no Firebase type left in auth; OTP errors mapped by code in domain, texts from resources or the server's localized detail; token never logged/stored beyond the hand-off; contract from the generated DTOs; AR+EN strings; iOS pbxproj only loses the two SPM product refs
- Notes: DEVIATIONS — OTP request/verify not re-captured (no local stack running; hosted Render not used): synthetic fixtures, `ContractFixturesTest` lists them as not captured until the next capture; no emulator/simulator run and no Xcode scheme build (only the K/N framework link); `Package.resolved` still pins Firebase Auth/App Check transitive packages (Xcode drops them on the next resolve); `OTP_BLOCKED` on verify has no `blockedUntil`, so the remaining time appears after the next request. Pre-existing, not from this task: `KMP_TEMPLATE` end-to-end test fails on WAB terms in `core/realtime` / `core/domain` salon tests (same on `origin/customer`).
