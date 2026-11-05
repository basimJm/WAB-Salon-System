# wab-payments — Memory (durable facts; keep short, replace instead of append)

> Code complete 2026-10-18 (Node + KMP), unpublished. Loaded on every turn while working in this folder: keep it to facts that save a future session an investigation (decisions, paths, commands, gotchas). Nothing that the code, git history or the backlog already records.

## Facts

- Backlog written 2026-10-18; first task via `python3 scripts/tasks.py next <project>`. Copy the `wab-notifications` tooling (SDKs) or the customer template (merchant app).
- Gateway = HyperPay (owner decision 2026-10-18). Node: `npm run verify` (238 tests + loop + packed smoke), `npm run mock-gateway`; real HyperPay never called (all behaviour from docs/fixtures). `provider: 'mock-gateway'` = HyperPay adapter against the OPP mock. Server wiring: `WAB-Server/src/providers/payments/real.ts`.
- Refunds need the checkout->payment id: `SessionDirectory` (Redis in prod). A refund re-sent with the same idempotency key is found at the gateway by `merchantTransactionId = RF:<key>` and never repeated.
- KMP (`kmp/`): verify common code on a JVM-only Gradle project (`kotlin("jvm")` with `srcDir` to `payments/src/commonMain|commonTest`, plugin/deps from the Maven Central mirror, Gradle 8.14.3); Android/iOS targets cannot be built in the sandbox. Gotcha: the worktree guard refuses shell commands that mix a directory change with source-control commands or heredocs: use separate calls, and commit and push in separate calls too.
