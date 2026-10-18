# WAB-Mobile-Customer — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next customer`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Will consume `/customer/v1` (51 ops) through DTOs generated from `WAB-Server/docs/api/openapi.customer.json` (CUS-009); mock source until the dev API exists (CUS-060 ← SRV-011).
- Done before the backlog: rules, variants + CI, policy checks, design system, base components, language/theme, permissions, refresh interceptor (CUS-001…003, 005, 007, 008, 014…017).
- Payments through the `wab-payments` KMP launcher (CUS-047 ← PAY-011); push via FCM facade (CUS-004); Firebase apps registered (dev + prod).

## Current task

- CUS-005b next (`core/analytics`); task branches start from `origin/customer`.

### CUS-005a — Standalone `core/mvi` module + core convention plugins
- Branch: `feat/cus-005a-core-mvi`
- Status: DONE
- Acceptance criteria (owner request 2026-10-18; CLAUDE.md §2, §3):
  - [x] `MVI`, `MVIDelegate`, `BaseViewModel`, `CollectSideEffect` live in `core/mvi` (package `com.fab.wab.customer.core.mvi`); no `core.ui.mvi` import remains; `core/ui` keeps locale + permissions
  - [x] Convention plugins `com.fab.wab.customer.core.library` and `core.compose`: namespace derived from the module path, SDK levels from `AndroidSdk.kt` (also used by the Android app plugin), coroutines/lifecycle/test deps; `core/mvi` uses them; the feature-presentation, compose-app and android-app plugins add `:core:mvi`
  - [x] Unit tests: `MVIDelegateTest` (6), `BaseViewModelTest` (3) green on the JVM host
  - [x] Policy checks + detekt green; `assembleDevDebug/DevRelease/ProdDebug/ProdRelease` + lint green; `linkDebugFrameworkIosSimulatorArm64` green (owner's Mac, Gradle 9.3.1, JBR 21)
- Tests: `scripts/ci/run_local_checks.sh` → GATE-EXIT=0 (68 policy tests, policy all ok, detekt 0 issues, BUILD SUCCESSFUL 4m53s); `./gradlew :composeApp:linkDebugFrameworkIosSimulatorArm64` ok
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — core/mvi depends only on Compose runtime + lifecycle; no literals in the new build files (SDK levels in `AndroidSdk.kt`); plugin behaviour proven by the full build rather than plugin unit tests.
- Notes: outside the nominal scope but required for the local gate on this Mac: `from __future__ import annotations` in 4 policy scripts (system Python 3.9), detekt `SwallowedException` in `RemoteTokenRefreshApi` fixed by naming the intentionally ignored exceptions `ignored`, the 5000 ms subscription timeout named (`STATE_SUBSCRIPTION_TIMEOUT_MS`) and its baseline entry removed. No UI change → no browser/simulator UI check.
