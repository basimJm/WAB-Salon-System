# WAB-Server — Session

> Loaded on every turn while working in this folder. Keep the current task block + the last 2 blocks; move older blocks nowhere (git history keeps them). Next task: `python3 scripts/tasks.py next server`. Status changes: `tasks.py set <ID> <STATUS>`. Cross-project view: root `.claude/session.md` and `INTEGRATION.md`.

## Integration status (one glance)

- Serves `/customer/v1` (51 ops), `/merchant/v1` (71), `/admin/v1` (116) + Socket.IO; contract = `docs/api/openapi.*.json` regenerated with `npm run docs` every task.
- Providers: notifier **real** (`wab-notifications`); otp **real** (`wab-otp`, SRV-034, needs `FIREBASE_PROJECT_ID`); payments **real** (`@wab/payments`, HyperPay, SRV-092); storage / analytics on in-repo fakes until SRV-112 / SRV-110 (BLOCKED on the SDK publish tasks; owner integrates).
- Open work: SRV-111 contract guard, Stage N (SRV-117…128, admin gaps), Stage O (SRV-129…134, merchant gaps). Deployment SRV-011/116 and SRV-059/115: owner (PENDING).

## Current task

- (none) — run `python3 scripts/tasks.py next server`; task branches start from `origin/server`.

## Last blocks

### SRV-092 — Real payment provider through `@wab/payments` (HyperPay)

- Branch: `feat/pay-012-publish-node` (shared PR with PAY-012)
- Status: DONE
- Acceptance criteria: `@wab/payments` `file:` dependency + `ensure-sdks` + Docker (KMP folder excluded); env `HYPERPAY_*` / `PAYMENT_GATEWAY` validated at start-up (webhook key required and mock/test mode refused in production); `providers/payments/real.ts` maps SDK statuses (UNKNOWN never success) and errors (webhook -> 401, over-refund -> PaymentError, outage -> 502/503, caller bug -> RangeError); webhook route passes the HyperPay tag/IV headers; REFUND/IGNORED notifications settle nothing; `PaymentView.checkout` gives the app what it opens the gateway UI with
- Tests: `tests/paymentsReal.test.ts` (21, includes the real SDK against the local OPP mock and Redis), config (new HyperPay block), paymentsService (checkout block, webhook headers/kinds); full gate green
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile ✔ (checkout block contract for CUS-047/CUS-062), Architect ✔, QA ✔) — NOT verified: real HyperPay (entity, token, webhook key, JOD enabled), Docker build (no daemon). API docs: updated (`checkout` on the payment, webhook headers).

### SRV-034 — Real Firebase ID-token verification via `wab-otp`

- Branch: `feat/otp-010-publish` (shared PR with OTP-010)
- Status: DONE
- Acceptance criteria: `@wab/otp` `file:` dependency + `ensure-sdks` + Docker; env `FIREBASE_PROJECT_ID` (required for `OTP_PROVIDER=real`), `FIREBASE_AUTH_EMULATOR_HOST` (dev only, refused in production); `providers/otp/real.ts` maps SDK outcomes (anything unexpected is an invalid proof, never success) and errors (outage -> `ExternalServiceError`, caller bug -> `RangeError`); closed on shutdown
- Tests: `tests/otpReal.test.ts` (9, includes the real SDK on emulator-shaped tokens) + config tests; full gate green
- Loops: 1/1
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — NOT verified: real Firebase ID tokens from the dev/prod projects, Docker build (no daemon). API docs: no change.

### T-123 — Wire `wab-notifications` into WAB-Server (`NOTIFIER_PROVIDER=real`)

- Branch: `claude/busy-johnson-2rch94` (PR #129, merged to `server`)
- Status: DONE
- Acceptance criteria: `file:../wab-notifications` dependency + `ensure-sdks`; env keys FCM__/SMTP__/EMAIL_FROM_*; adapter maps SDK errors → `ExternalServiceError`; closed on shutdown; Docker image builds from the repo root
- Tests: `npm test` 2420; lint/format/typecheck/build green; `tests/notifierReal.test.ts` (16)
- Loops: 3/3
- Review: PASSED (SE ✔, Mobile N/A, Architect ✔, QA ✔) — NOT verified: real SMTP send (App Password pending), Docker build (no daemon). API docs: no change.
