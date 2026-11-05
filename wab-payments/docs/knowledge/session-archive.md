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

### PAY-003 — Port, facade, fake adapter, idempotency
- Branch: `feat/pay-003-port-fake`
- Status: IN REVIEW
- Acceptance: PaymentProvider port + PaymentGateway adapter port; facade with validation, idempotency (memory/Redis), bounded retries (never for refunds), webhook replay flag; scriptable FakeGateway; createPayments factory.
- Tests: npm run verify green (92 unit tests, gate 100/95/95, loop test, packed smoke)
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — QA fixed lint/type findings; refunds are never blind-retried (adapter must find an earlier refund by key).

### PAY-004 — Local mock gateway
- Branch: `feat/pay-004-mock-gateway`
- Status: IN REVIEW
- Acceptance: HTTP server emulating the HyperPay OPP wire format on localhost (checkouts, payment status, refunds RF, query by merchantTransactionId, hosted pay page, AES-GCM encrypted notifications, failure injection); published as subpath @wab/payments/mock-gateway and npm run mock-gateway.
- Tests: npm run verify green (123 tests; real localhost HTTP round trips)
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — Mock speaks OPP, so the HyperPay adapter runs unchanged against it in dev (mock-gateway provider = hyperpay adapter + local base URL).

### PAY-005 — HyperPay adapter: checkout + verify
- Branch: `feat/pay-005-hyperpay-session`
- Status: IN REVIEW
- Acceptance: HyperPay createCheckout (form POST /v1/checkouts, JOD decimals 2/3, merchantTransactionId, customer fields, integrity, test mode) and verify (GET /v1/checkouts/{id}/payment) with the full result-code table, HTTP status mapping, redacted raw, mock-gateway provider reusing the adapter; global fetch HTTP client with timeout.
- Tests: npm run verify green (187 tests; HTTP fixtures + real localhost round trips against the OPP mock)
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — Result-code regexes are from memory of the OPP docs (docs host unreachable here): UNVERIFIED against the live reference. PA (pre-auth) option removed: capture is not built.

### PAY-006 — HyperPay refunds
- Branch: `feat/pay-006-hyperpay-refund`
- Status: IN REVIEW
- Acceptance: refund (full/partial, paymentType=RF) with duplicate protection via merchantTransactionId lookup before sending, checkout->payment SessionDirectory (memory/Redis), over-refund and uncaptured mapping, getRefund with status normalization.
- Tests: npm run verify green (211 tests incl. restart-with-same-key against the OPP mock)
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — Refund is never blind-retried; a failed lookup aborts rather than risking a double refund. Real OPP behaviour of /v1/query and RF is unverified.

### PAY-007 — HyperPay webhooks
- Branch: `feat/pay-007-webhooks`
- Status: IN REVIEW
- Acceptance: AES-256-GCM notification decryption + authentication (IV/tag headers, hex or JSON-wrapped body), event normalization (PAYMENT, REFUND, IGNORED), checkout resolution via ndc/directory, replay protection by event id (facade), forged/corrupt notifications throw PAYMENT_WEBHOOK_INVALID and are never cached.
- Tests: npm run verify green (226 tests incl. end-to-end mock webhook delivery)
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — Assumed (unverified): body is the hex ciphertext or {encryptedBody}; payload carries ndc = checkout id. Replay dedupe now happens after authentication.

### PAY-008 — Phase 2 port readiness
- Branch: `feat/pay-008-phase2-port`
- Status: IN REVIEW
- Acceptance: Optional destinations on createSession and subMerchantId on refund, validated and refused with PAYMENT_FEATURE_UNSUPPORTED on gateways without splitPayments; provider.capabilities exposed; Phase 1 behaviour unchanged.
- Tests: npm run verify green (236 tests)
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — No HyperPay split implementation (needs marketplace product + KYC fields: owner decision); only the port and capability flags.

### PAY-009 — Quality: loop test, smoke, README, Integration
- Branch: `feat/pay-009-quality`
- Status: IN REVIEW
- Acceptance: Loop test (200 flows, 20 concurrent, duplicate keys, injected 503/502/429, over-refund, webhook redelivery) against the OPP mock; packed smoke incl. mock-gateway subpath; README; Integration.md section 14; stable webhook event id; read-only refund steps retried.
- Tests: npm run verify green (236 unit tests, coverage gate, loop test 8s)
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — Loop found timestamps in the payload broke replay detection: event id now hashes stable fields only.

### PAY-010 — KMP library scaffold and ports
- Branch: `feat/pay-010-kmp-port`
- Status: IN REVIEW
- Acceptance: kmp/ Gradle build with customer toolchain; PaymentLauncher port (CheckoutSession in, PaymentResult/PaymentError out), Delegating/Fake launchers, NativeCheckoutBridge shared launcher, ShopperResult URL parsing, card-number redaction; commonMain/commonTest only.
- Tests: commonMain+commonTest compiled (warnings as errors) and all KMP unit tests pass on a JVM-only harness; Android/iOS Gradle targets NOT built (Google Maven/Xcode unreachable)
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — Client result is never final: ClientCompleted means the UI returned, server verify decides. Gradle build files unverified.

### PAY-011 — KMP mock-gateway launcher
- Branch: `feat/pay-011-kmp-mock`
- Status: IN REVIEW
- Acceptance: MockGatewayLauncher + InAppBrowser port (common, tested); Android WebView activity browser and iOS ASWebAuthenticationSession browser.
- Tests: 24 KMP unit tests pass on the JVM harness (commonMain+commonTest, warnings as errors); androidMain/iosMain sources NOT compiled here
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — Browser results are never trusted: redirect only yields ClientCompleted, server verify decides. Platform browsers unverified.

### PAY-012 — Publish preparation and WAB-Server integration
- Branch: `feat/pay-012-publish-node`
- Status: IN REVIEW
- Acceptance: Registry-ready @wab/payments (GitHub Packages publishConfig, .npmrc, CHANGELOG, files, prepublishOnly, typesVersions for the mock subpath, pack dry-run) — NOT published (owner runs it); clientCheckout port method; WAB-Server PAYMENT_PROVIDER=real wiring (SRV-092).
- Tests: wab-payments npm run verify green (238 tests); WAB-Server full gate (see SRV-092 block)
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — Owner publishes with a registry token; until then both projects use the file: dependency.

### PAY-013 — KMP HyperPay launcher for Android
- Branch: `feat/pay-013-kmp-hyperpay-android`
- Status: IN REVIEW
- Acceptance: payments-hyperpay-android module: HyperPayAndroidBridge (OPP CheckoutActivity, TEST/LIVE, shopperResultUrl, language), ActivityResultRegistryHost, common sdkOutcome mapping (tested), manifest/intent-filter guide, no card data logged.
- Tests: 27 KMP unit tests pass on the JVM harness (common mapping included); the Android module itself is NOT compiled (Google Maven and the OPP SDK repository unreachable)
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — OPP class and constant names are from the vendor documentation: verify on a device with sandbox credentials (owner input).

### PAY-014 — KMP HyperPay launcher for iOS
- Branch: `feat/pay-014-kmp-hyperpay-ios`
- Status: IN REVIEW
- Acceptance: iosMain hyperPayIosLauncher + IosOutcomes (Swift-friendly), static framework WabPayments, Swift reference bridge over OPPWAMobile with 3-DS return handling, iOS guide; shared mapping reused.
- Tests: common KMP tests (27) unchanged and green on the JVM harness; iOS targets, Swift bridge and OPPWAMobile NOT built (no macOS/Xcode)
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — Swift file is a reference to copy: symbol names from the OPPWAMobile docs need a real build to confirm.

### PAY-015 — KMP Maven publication prepared
- Branch: `feat/pay-015-publish-kmp`
- Status: IN REVIEW
- Acceptance: maven-publish config for com.wab:payments (KMP, all targets) and payments-hyperpay-android (release), POM metadata, private repo via properties/env credentials, PUBLISHING.md with consuming snippet for the customer app, kmp README/CHANGELOG; NOT published.
- Tests: gradle files unverified (no Google Maven/OPP SDK); common KMP tests (27) still green on the JVM harness
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — Owner runs publish (registry URL + token + OPP SDK version/repository). The customer app has no in-repo payments module, so the switch is a dependency line (see PUBLISHING.md).

### PAY-015 — close-out (status DONE)
- Branch: `chore/pay-done`
- Status: DONE
- Acceptance: board/status only after PR #250 merged; all PAY-001..015 DONE.
- Tests: docs only (`python3 scripts/tasks.py next payments` reports no ready task)
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — status change only.

### DOCS-HYPERPAY — Full HyperPay integration flow (owner request 2026-10-26)
- Branch: `docs/hyperpay-integration-flow`
- Status: DONE
- Acceptance criteria:
  - [x] `docs/HYPERPAY_INTEGRATION_FLOW.md`: what exists (reuse), accounts/env/credentials, integration per surface, booking payment (Model A debit vs Model B pre-auth + capture), webhooks (all types, AES-GCM, 30 s, retries), status model (result-code groups → WAB states, every lifecycle state + detection), refunds/reversals/captures, tokenization, subscriptions + placements, settlement/fees/chargebacks, payouts (Phase 1 manual, HyperSplit Phase 2), mobile SDK (KMP), questions for HyperPay, implementation plan, sources
  - [x] Facts marked ✅ (HyperPay docs, linked) or ⚠️ (to confirm); owner decisions marked [DECIDE]
- Tests: docs only
- Loops: 1/1 — re-checked every section against the four research summaries (server-to-server, mobile SDK, recurring/refunds/settlement, current code)
- Review: PASSED (SE ✔, Mobile ✔, Architect ✔, QA ✔) — docs only; no code. Key open item: JOD 3-decimal amounts vs HyperPay 2-decimal format.
