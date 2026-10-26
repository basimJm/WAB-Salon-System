# WAB-Mobile-Salon — Rules for AI Agents (merchant app)

> These rules add to the root `CLAUDE.md` and `.claude/*.md`; they never relax them. If two rules conflict, the stricter one wins. If documents conflict, stop and ask (PRD > BRD > Design Script > design files).

**Auto-loaded with this file (never read them with a tool):**
- Session (current task, integration status): @.claude/session.md
- Memory (durable merchant-app facts): @.claude/memory.md

## 0. Per task (nothing else is read up front)
1. `python3 scripts/tasks.py next merchant` → the task row (ID, branch from `origin/merchant`, needs, PRD screens, operations).
2. Only the `docs/WAB_Merchant_App_PRD.md` screens/sections (M01–M26) and the `WAB-Server/docs/api/openapi.merchant.json` operations the row names (grep the heading, read that range); the `docs/WAB_Merchant_Design_Script.md` section and the matching `design/WAB Merchant 0x *.dc.html` for UI work (visual reference only; the PRD wins).
3. `.claude/Integration.md` when the task touches the API, Firebase, realtime, push or the mock; `BUSINESS_DOMAIN.md` (root) sections the row names (permissions, booking state machine, error codes §11).

## 1. Non-Negotiable Rules
1. **Clean Architecture + MVI by delegate.** Every screen follows §3. No business logic in composables, no Android/iOS types in `commonMain` domain code.
2. **Never hardcode.** No literal strings, colors, `dp`/`sp`, shapes, durations, alphas, URLs, hosts, keys, IDs, limits or magic numbers in feature or component code. Use string resources, design tokens (`core/design-system/.../theme`), named constants (`*Constants.kt` may hold dp/sp), or per-environment build config (§5). `python3 scripts/ci/policy_checks.py all` fails on violations. **The policy and detekt baselines are empty (MER-003) and stay empty**: fix the code, never add a baseline entry.
3. **Arabic and English for every resource.** Every string exists in `values/strings.xml` and `values-ar/strings.xml` with the same keys and placeholders; write the Arabic first, naturally.
4. **Performance first.** See §6.
5. **Every build variant must build:** Android `dev`/`prod` × `debug`/`release`; iOS `Debug-Dev`, `Release-Dev`, `Debug-Prod`, `Release-Prod` (schemes `iosApp-Dev`, `iosApp-Prod`).
6. **Gate:** `scripts/ci/run_local_checks.sh` (policy tests + checks, detekt, unit tests, 4 Android variants + lint, 4 iOS configurations, K/N tests); CI = root `.github/workflows/merchant-ci.yml`. Batched flow (root rules §3.13): per task unit tests + policy; every five tasks the host unit tests + one PR; the full gate once after the backlog.
7. **No warnings, no crash-prone code.** `allWarningsAsErrors`, Lint `warningsAsErrors`; no `!!`, unchecked casts, `@Suppress` without a one-line reason comment, empty `catch`, `GlobalScope`, `runBlocking`, `TODO()`, `println`. Failures are `AppResult`/`AppError`, never thrown to the UI.
8. **No source file longer than 300 lines.** Split by responsibility.
9. **Portrait and landscape, phone to tablet**, font scale 200 %, RTL and LTR, light and dark (§7).
10. **Branching:** `feat/mer-NNN-<key>` from the freshly fetched `origin/merchant`; PR into `merchant`; never commit or push to `main` or `merchant` directly.
11. Never commit secrets. Firebase files only in `androidApp/src/{dev,prod}/google-services.json` and `iosApp/Firebase/{dev,prod}/GoogleService-Info.plist` (placeholders until MER-004, owner files).
12. A new library or version goes through `gradle/libs.versions.toml` with the reason in the task block.

## 2. Module Map (real)
```
androidApp/            Android entry (MainActivity, Application, flavors dev/prod, FCM service)
iosApp/                iOS entry (SwiftUI host, Firebase bridges, xcconfig per environment, schemes)
composeApp/            App shell: App(), theme wiring, navigation host, DI aggregation, push/deep-link/realtime effects
core/common            Platform-free helpers (AppEnvironment, DeepLinks, FormValidators, TimeFormat)
core/domain            AppResult/AppError/ErrorCode, settings, session (SessionStore), shared models
core/data              Data plumbing, mock engine (MockFixture per feature), Places
core/network           Ktor client per environment, Accept-Language, envelope, auth refresh (`/merchant/v1/auth/refresh`)
core/realtime          Socket.IO v4 client (namespace `/merchant`) + fake
core/storage, security DataStore settings + session store, Keystore/Keychain secure store
core/navigation        Typed routes (Graph/Screen), Navigator
core/notification      In-app banners (NotificationTheme supplied by the shell) + push signals
core/mvi               MVI base (BaseViewModel, MVIDelegate, CollectSideEffect)
core/analytics         AnalyticsTracker port, TrackScreen
core/firebase          Push token, crash reporting, analytics behind ports (Swift bridges on iOS); phone OTP = WhatsApp via the backend
core/ui                Locale/dark-mode locals, permissions, external actions, image picker
core/design-system     Tokens, flat surfaces (AppSurface, cardBackground, barBackground), App* components, icons, strings
core/di                Koin aggregation
feature/<name>/{domain,data,presentation,di}   One folder per feature (reference: feature/bookings)
build-logic/convention Convention plugins
scripts/ci, config/    Policy checks (with tests), detekt, lint, budgets
```
Dependency direction: `presentation → domain ← data`; `di` wires them; `core/design-system` never imports a feature; `core/notification` sits below the design system (the shell passes its theme).

## 3. Clean Architecture + MVI by Delegate (the only way to build a screen)
- `domain`: models, repository interfaces, one use case per action returning `Flow<AppResult<T>>`.
- `data`: DTOs + Ktor service (`/merchant/v1/...`), repository implementation (DTO → model), `MockFixture`s for every endpoint the feature calls (bound in its data Koin module).
- `presentation`: `controller/contract/<Name>Contract.kt` (`UiState`, `UiAction`, `SideEffect`), `controller/vm/<Name>ViewModel.kt` (`BaseViewModel`; state via `updateState`, effects via `emitSideEffect`, reducer in `handle(event)`), `screen/<Name>Screen.kt` stateless `(state, onAction)` with previews (loading, content, empty, error; AR RTL + EN LTR), `navigation/`, `di/`.
- Analytics: `TrackScreen(<Feature>Analytics.SCREEN)`; view models call `trackAction` for user intents (PRD §14).
- Unit tests in `commonTest` for every view model, use case and mapper (fakes, not mocks).

## 4. Design System
Tokens via `AppTheme.colors|spacing|shapes|typography|sizes|elevation|alpha|motion|adaptive|surfaces`. **The merchant app follows `design/WAB Merchant 0x *.dc.html` as drawn, without Liquid Glass (owner decision 2026-10-26):** flat `var(--bg)` screens, `var(--card)` / `var(--surface)` / `var(--soft)` fills with the `1px var(--line)` edge (`cardBackground`, `AppSurface`, `AppCard`), 1.5 dp state borders for error / focus / selection, flat top bars (plain back chevron, centered title), the attached card tab bar with a top line (`AppBottomBar`, rail in landscape), gradient primary buttons and design chips (`chipS`). No blur, sheen, rim or press-scale; taps use the platform ripple (`appClickable`). Take values from the design file (comment the CSS next to feature-only constants in `*DesignConstants.kt`). Start/End, never Left/Right. The customer app keeps its own (glass) design system.

## 5. Environments
Android `gradle.properties` (`DEV_/PROD_API_BASE_URL`, `*_WEB_BASE_URL`, `*_DATA_SOURCE` = `mock|remote`, `DEV_APPLICATION_ID_SUFFIX=.dev`) → `BuildConfig`; iOS `iosApp/Configuration/{Dev,Prod}.xcconfig` (write URLs as `https:/$()/host`) → `Info.plist`; shared code reads `AppEnvironment`. Dev builds use `DATA_SOURCE=mock` until MER-054 switches them to the dev API.

## 6. Performance
Stable state types; lazy lists with `key` + `contentType`; `collectAsStateWithLifecycle`; fast-changing state read in draw/layout; no main-thread blocking; images sized to their slot; calendar grids render only visible ranges.

## 7. Adaptive Layout
`AppWindowSize` decides bottom bar vs rail and columns; no fixed content sizes; touch targets ≥ 48 dp; insets as content padding; text survives 200 % font scale.

## 8. Merchant specifics
1. **Permission-driven UI, hidden not disabled** (PRD §3, §6): every screen, tab, menu item, button and notification is gated through the permission helpers (MER-009); permissions refresh on app start, Home pull-to-refresh and the `PERMISSIONS_UPDATED` data push.
2. **Booking actions are conflict-safe:** approve/reject/cancel/complete/no-show/reassign handle "already handled by {member}" (`ALREADY_HANDLED`) and schedule conflicts by refreshing, never by retrying blindly.
3. **Real-time requests** (PRD M10): socket event + FCM data message de-duplicated by booking id; the Android overlay permission is requested with an explanation and never assumed; iOS uses time-sensitive actionable notifications; the request sound is configurable.
4. **Done:** acceptance criteria in `.claude/session.md`, unit tests, AR + EN, `Loops: 1/1`, four-role review, `tasks.py set MER-NNN DONE`, memory updated.
