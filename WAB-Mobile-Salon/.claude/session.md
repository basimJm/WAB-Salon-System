# WAB-Mobile-Salon — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next merchant`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Scaffolded (MER-001) with `KMP_TEMPLATE` from the customer app: all modules, design system + Liquid Glass, sample feature; rules copied in MER-003 (until then `WAB-Mobile-Customer/CLAUDE.md` applies).
- Will consume `/merchant/v1` (71 ops); 6 server gaps (SRV-129…134) block MER-042/043/049/050; MER-004 Firebase registrations = owner.
- Real-time booking requests: socket + FCM data message, Android overlay / iOS time-sensitive actions (MER-012, MER-028…030).

## Current task

### MER-001 — Scaffold the KMP app from the customer template
- Branch: `feat/mer-001-scaffold`
- Status: DONE (PR into `merchant`)
- Acceptance criteria (backlog row MER-001; owner request 2026-10-22: "use the tool, project name merchant, package com.fab.wab.merchant, skip Firebase files"):
  - [x] Generated with `.claude/tools/KMP_TEMPLATE/KMP_TEMPLATE --merge` into this folder (docs/design/.claude kept): same `libs.versions.toml`, `build-logic`, every `core/*` module, `composeApp`, `androidApp` (flavors dev/prod), `iosApp` (schemes iosApp-Dev / iosApp-Prod), CI scripts/policies/detekt/workflow
  - [x] Package `com.fab.wab.merchant` (dev `com.fab.wab.merchant.dev`), project `Merchant`, display name "WAB Merchant" / "WAB للتجار"; API prefix `/merchant/v1`, Socket.IO namespace `/merchant`; dev API = WAB dev server, dev data source = mock
  - [x] Firebase skipped: placeholders in `androidApp/src/{dev,prod}` and `iosApp/Firebase/{dev,prod}` (MER-004 = owner files)
  - [x] ADR on sharing `core/*`: `docs/ADR-001-core-sharing.md` (copy now via the tool; included build / packages later)
  - [x] Local gate green (`scripts/ci/run_local_checks.sh` exit 0: policy tests + checks, detekt, unit tests, 4 Android variants + lint, 4 iOS configurations, K/N tests)
  - [x] Runs on the Android emulator (`com.fab.wab.merchant.dev`, sample list from mock data, glass cards) and the iOS simulator ("WAB Merchant Dev", same screen)
- Tests: generated unit tests (core + sample + shell) via the gate — all green
- Loops: 1/1 — re-checked every criterion against the gate log and both devices
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — generated code identical to the verified template; merchant-specific values only in config; no WAB customer business in the merchant core.
- Notes: DEVIATIONS from the backlog row (owner instructions win): package `com.fab.wab.merchant` instead of `com.wab.merchant`; `feature/sample` kept as the reference feature (removed when the first merchant feature lands) instead of removed.
