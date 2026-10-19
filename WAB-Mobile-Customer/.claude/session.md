# WAB-Mobile-Customer — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next customer`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Will consume `/customer/v1` (51 ops) through DTOs generated from `WAB-Server/docs/api/openapi.customer.json` (CUS-009); mock source until the dev API exists (CUS-060 ← SRV-011).
- Done before the backlog: rules, variants + CI, policy checks, design system, base components, language/theme, permissions, refresh interceptor (CUS-001…003, 005, 007, 008, 014…017).
- Payments through the `wab-payments` KMP launcher (CUS-047 ← PAY-011); push via FCM facade (CUS-004); Firebase apps registered (dev + prod).

## Current task

- Batch 1 (CUS-032…036) shipped (PR #277). Batch 2 (CUS-037…041) shipped as one PR from `feat/cus-041-bookings-tab`. Owner rule (revised 2026-10-19): every five tasks unit tests only + one PR; detekt, full gate, emulator + simulator journey once after the whole backlog. Batch 3 (CUS-042…046) shipped (PR #287). Batch 4 (CUS-048/049/050/053/057) shipped (PR #293). Batch 5 (CUS-051/052/054/055/056) shipped (PR #296). Batch 6 = CUS-058 + CUS-059 (the last code tasks) → unit-test run green → PR. Batch 6 shipped (PR #301). `main` merged into `customer` (PR #314). CUS-064 + CUS-065 end-of-backlog pass shipped (PR #315). Backlog has no ready task: remaining rows are blocked/pending (`tasks.py next customer`).

### CUS-058 — Analytics events: every screen view and every action of PRD §14 with the common fields, verified by a test
- Branch: `feat/cus-058-analytics-events` (from `origin/customer`, batch 6 start)
- Status: DONE (batch 6, PR #301)
- Acceptance criteria (PRD §14; CUS-012 common fields already attached by `DefaultAnalyticsTracker`):
  - [x] core/mvi `UiActionObserver` tap: `BaseViewModel.onEvent` is now final (notifies the observer, then `handle(event)`); the 25 view models' reducers were renamed `onEvent` → `handle` (call sites and tests unchanged)
  - [x] App shell `AnalyticsCatalog`: `screenNameOf(Screen)` exhaustive over all 22 routes (consistent with the route-derived names of `TrackNavigationScreens`), `actionEventOf(action)` exhaustive per feature contract → `Named` (shell logs it with the owning view model), `ByViewModel` (richer event already logged with ids) or `Silent` (keystrokes, dismissals, lifecycle, paging); `ActionAnalytics.install(tracker)` wired in `App.kt`
  - [x] Shell event names cover the PRD suggested list not already logged by view models (salon/staff/service/gallery open, call/whatsapp from S15, booking steps date/slot/staff/companions/submit, filter chip remove, login open, legal open, location permission result, …)
  - [x] Tests: `AnalyticsCatalogTest` (4): every route → snake_case unique name equal to the route-derived one; every contract's actions classified; `eventFor` carries the owner and never duplicates view-model events; PRD §14 suggested events map to a constant; the tap fires before the reducer
- Tests: run with the batch-6 host-test run
- Loops: 1/1 — batch-6 full host-test run (`./gradlew testAndroidHostTest`, 297 tests across every module + `:androidApp:compileDevDebugKotlin`, exit 0) found: the core/mvi test view model still overrode `onEvent` (renamed to `handle`), `AllSalonsContract.UiAction.OnFiltersApplied` missing from the catalog (the exhaustive `when` caught it at compile time, as designed), and a typed-list inference in the tap test.
- Review: PASSED (SE ✔, Mobile N/A (no screen changed; `AppErrorState` keeps its defaults), Architect ✔, QA ✔) — the action tap lives in core/mvi with a single observer installed by the shell; the catalog is exhaustive per contract and never duplicates view-model events; error handling paths are a pure mapping over the contract codes, enforced by the new `error-codes` policy check in the gate; AR/EN parity; policy suite ok. NON-BLOCKING: screens still call `AppErrorState` with the default retry action (login / contact / update buttons wire up in the UI pass).
- Notes: payment events (`payment_start/success/failure`) and `push_open` arrive with CUS-047 (payments) and the push tap is logged when CUS-063 runs on devices (the shell routes taps today; the event constant lands with the gateway work). A new route or `UiAction` fails compilation until classified (compile-time guarantee, the unit test checks naming).

### CUS-059 — Error-code coverage: every code of BUSINESS_DOMAIN §11 and `openapi.customer.json` has AR + EN text and a handling path; contract test
- Branch: `feat/cus-059-error-coverage` (from `feat/cus-058-analytics-events`)
- Status: DONE (batch 6, PR #301)
- Acceptance criteria (BUSINESS_DOMAIN §11; `openapi.customer.json` error enums; CLAUDE.md §3 "never raw server text"):
  - [x] Policy check `error-codes` (`scripts/ci/policy/error_codes.py`, in `policy_checks.py all` and the gate): codes of §11 ∪ the snapshot's `code` enums must all be in `ErrorCode`, `ErrorCode` must not carry codes outside the contract (except `UNKNOWN`), every code needs `error_code_<code>` in EN and AR and a branch in `ErrorHandling.kt`; Python unit test `tests/test_error_codes.py`
  - [x] Handling path: `ErrorAction { RETRY, LOGIN, CONTACT, UPDATE, DISMISS }`, `errorActionOf(code)` exhaustive over the 42 codes (login for auth/account codes, contact for permission / internal / unknown, update for `UPDATE_REQUIRED`, retry for transient / availability codes, dismiss for validation-type business rules), `errorActionOf(AppError)` (transport → retry), `errorActionLabel` (retry / log in / contact us / update the app; AR/EN strings); `AppErrorState(action, onAction)` renders the matching button (retry by default, existing call sites unchanged)
  - [x] Current state: 41 contract codes + `UNKNOWN` all present with EN + AR strings (CUS-006) → check passes
  - [x] Tests: `ErrorTextTest` (+1), `test_error_codes.py` (1)
- Tests: run with the batch-6 host-test run
- Loops: 1/1 — batch-6 full host-test run (`./gradlew testAndroidHostTest`, 297 tests across every module + `:androidApp:compileDevDebugKotlin`, exit 0) found: the core/mvi test view model still overrode `onEvent` (renamed to `handle`), `AllSalonsContract.UiAction.OnFiltersApplied` missing from the catalog (the exhaustive `when` caught it at compile time, as designed), and a typed-list inference in the tap test.
- Review: PASSED (SE ✔, Mobile N/A (no screen changed; `AppErrorState` keeps its defaults), Architect ✔, QA ✔) — the action tap lives in core/mvi with a single observer installed by the shell; the catalog is exhaustive per contract and never duplicates view-model events; error handling paths are a pure mapping over the contract codes, enforced by the new `error-codes` policy check in the gate; AR/EN parity; policy suite ok. NON-BLOCKING: screens still call `AppErrorState` with the default retry action (login / contact / update buttons wire up in the UI pass).
- Notes: screens keep showing the code's text through `appErrorText`; the action mapping is now available for screens that want a login / contact / update button (`AppErrorState(action = errorActionOf(error))`). Wiring every screen to `onAction` is UI work for the end-of-backlog pass.

### T-126 — Merge `main` into `customer` (owner request 2026-10-19)
- Branch: `chore/merge-main-into-customer`
- Status: DONE (PR #314)
- Acceptance criteria:
  - [x] `origin/main` merged into a branch from `origin/customer`; only conflict = generated board in `INTEGRATION.md` (regenerated by `tasks.py board`)
  - [x] No customer-app source touched by the merge
- Tests: none needed (docs/board + server files already verified on `main`)
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — merge commit only; board regenerated from the backlogs.

### CUS-064 — Accessibility and RTL QA pass: TalkBack names, 48 dp targets, font scale 200 %, RTL mirroring, dark mode, landscape; fixes + screenshot evidence
- Branch: `feat/cus-064-a11y-rtl-qa` (from `origin/customer` after the `main` merge, PR #314)
- Status: DONE (PR #315)
- Acceptance criteria (PRD §12; CLAUDE.md §7; rules §3.13 end-of-backlog pass):
  - [x] detekt clean over the whole app after batches 1–6 (reducer splits in BookingFlow / Profile / Notifications, analytics catalog split into `AuthDiscoveryActionEvents` / `BookingAccountActionEvents`, error-action tables, line wraps, modifier/naming fixes)
  - [x] Kotlin/Native build + tests: kotlinx-datetime aligned to 0.7.1 (Ktor already pulled it on iOS → mixed klibs broke linking), `BusinessTime.nowInstant()` replaces `Clock.System` (name clash with core/common `Clock` on K/N), file-level deprecation suppressions until the datetime API migration, `toEpochDays()` Long, `import ComposeApp` in `iOSApp.swift`
  - [x] Emulator journey (Pixel-class AVD, mock data, 39 screenshots + uiautomator dumps in the session scratchpad): onboarding → S02 → Home AR/RTL light → Profile → theme Dark → language EN/LTR → landscape (rail) → font scale 2.0 (wraps, no clipping) → All salons → Salon details → auth gate → Login → OTP (mock) → Home registered → booking steps 0–5 (draft + summary) → verify placeholder → Bookings → Booking details → Notifications (popup, filter sheet) → Profile registered (photo sheet) → FAQ → Contact sheet → Edit profile (S22)
  - [x] Audit script (`a11y_dump.py`: clickable nodes without a label, targets under 48 dp at 440 dpi) → findings fixed: picker radio rows misaligned and only the radio tappable (now centered, whole row tappable); `AppTextButton` 16 dp tall (all buttons now ≥ 48 dp); button labels truncated in narrow cards ("WhatsA…" on S15; labels wrap to 2 lines); "Personal information" section header duplicated the row (now "Account"); unlabeled clickable containers were Compose wrappers whose child carries the text/content-desc (false positives)
  - [x] Final gate green (`scripts/ci/run_local_checks.sh` exit 0 on the final commit: policy tests, policy checks, contract, detekt, Gradle unit tests + 4 Android variants, 4 iOS configurations, K/N tests)
- Tests: `scripts/ci/run_local_checks.sh` exit 0 (2026-10-19, after `2277fc8`)
- Loops: 1/1 — re-checked every criterion against the journey screenshots + a11y dumps and the gate log; the AppButton min-height change re-verified on S15/S21 before the final gate
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — fixes are confined to the design system (`AppButton`, `RadioRow`) and one string; all strings AR+EN; no hardcoded values; gate green. DEVIATION: iOS simulator journey not run (placeholder Firebase keys, owner input); Android journey only, on one AVD.
- Notes: iOS simulator journey still blocked by the placeholder Firebase keys (`GoogleService-Info.plist`, owner input); the iOS build itself is green. Slot chips show the fixture's raw "09:00" (real server sends instants → 12-hour text).

### CUS-065 — Performance pass: cold start, R8 keep rules, release size budget, baseline profile, image sizing, no main-thread blocking; measurements recorded
- Branch: `feat/cus-064-a11y-rtl-qa` (same end-of-backlog branch)
- Status: DONE (PR #315)
- Acceptance criteria (CLAUDE.md §6; `config/budgets.json` 60 MiB per flavor):
  - [x] Cold start (dev debug, emulator, `am start -W` ×3 after force-stop): 1021 / 968 / 969 ms TotalTime; PSS after launch 176 MB (debug build, Compose + Koin)
  - [x] Release APK size: dev 10,307,971 B, prod 10,308,003 B (unsigned, R8) vs budget 62,914,560 B → `budget: ok`
  - [x] R8: release variants minified + shrunk by the convention plugin with the keep rules of CUS-001; the gate builds them
  - [x] Main thread: repositories/use cases run on IO through Ktor; mapping is small; no `runBlocking`/`Thread.sleep` (policy Q rules); lists use keys + content types (P001)
  - [x] Images: `AppImage` sized to its slot with Coil caches; avatar uploads compressed on device to ≤ 1024 px JPEG q85
  - [x] Baseline profile: not generated (needs a device run of the `baselineprofile` module → deferred to the release task CUS-066 with the owner's signing)
- Tests: measurements above; `policy_checks.py budget` ok; gate exit 0
- Loops: 1/1 — numbers re-read from the gate output; no code change specific to this task beyond the batch fixes
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — measurements recorded, budget enforced in the gate. DEVIATION: baseline profile deferred to CUS-066 (needs owner signing/device run); cold start measured on a debug build only.

### T-127 — Docs: CUS-064/065 DONE, board + session index
- Branch: `docs/cus-064-065-done`
- Status: IN REVIEW
- Acceptance criteria: statuses set through `tasks.py`; board regenerated; session/memory current
- Tests: none (docs only)
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — docs only, no source changed.

### CUS-069 — Design fidelity pass: app icon + logo, every component and screen matched to `design/WAB 0x *.dc.html`
- Branch: `feat/cus-069-design-fidelity`
- Status: IN PROGRESS
- Branched from `origin/customer` after PR #319.
- Acceptance criteria (owner request 2026-10-19; design files = reference, `CLAUDE.md` §3 precedence):
  - [x] App icon = `design/assets/wab-app-icon.png` (centre square, Lanczos to 1024): iOS `AppIcon.appiconset`, Android legacy + round + adaptive foreground (bg `#3B2B53` sampled from the icon) at 5 densities, Play Store 512; the GREENJO template icons are gone
  - [x] In-app logo = the same icon (`ic_app_logo_light.webp`, 512², theme-independent; dark copy deleted); new `brand/AppLogo` (radius = size/4, violet glow `rgba(109,40,217,.3)` = `elevation.logoShadowAlpha`) + `AppBrandHeader` (WAB Playfair wordmark + "WEDDING & BEAUTY" tagline) with `brand_name`/`brand_tagline` strings
  - [ ] Shared chrome matched to the design (tab bar, top bar, button height 52, sheets, dialogs)
  - [ ] Every screen of 01 Auth, 02 Discovery, 03 Salon, 04 Booking Flow, 05 Bookings, 06 Account matched (six parallel agents, one per design file; shared needs collected and applied in the design system)
  - [ ] Policy checks + detekt + full gate green; emulator check of the changed screens AR/EN light/dark
- Tests: existing unit tests + any contract additions; gate run
- Loops: 0/1
- Review: PENDING
- Notes: the `DesignSync` import of the claude.ai/design project could not run (needs an interactive `/design-login`); the repo copies under `design/` are identical to the `customer` master and were used as the reference.
