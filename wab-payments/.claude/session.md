# wab-payments — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next payments`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)
- Node package (PaymentProvider port) for the server (SRV-092 ← PAY-012) + KMP launcher for the customer app (CUS-047 ← PAY-011, CUS-062 ← PAY-015). Gateway candidate HyperPay; adapters swap by config.

## Current task

### PAY-001 — Node scaffold
- Branch: `feat/pay-001-scaffold`
- Status: IN REVIEW
- Acceptance: strict TS, eslint, prettier, jest (gate 100/95/95), tsup ESM+CJS+d.ts, `verify`, loop config, package smoke; name `@wab/payments`.
- Tests: `npm run verify` green (scaffold test + loop test + packed-tarball smoke in CJS and ESM).
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — tooling only, copied from wab-notifications.
- Decision (owner grant 2026-10-18): gateway = HyperPay (OPP/COPYandPAY).

### PAY-002 — Shared kernel
- Branch: `feat/pay-002-kernel`
- Status: IN REVIEW
- Acceptance: PaymentSdkError + codes; zod options with prod rules; redacting logger; fils to decimal money; retry/timeout helpers; constants.
- Tests: npm run verify green (45 unit tests, gate 100/95/95)
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — QA found card regex swallowing a trailing space and duplicate config field names (fixed).
