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
