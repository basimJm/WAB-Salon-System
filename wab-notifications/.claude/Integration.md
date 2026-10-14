# wab-notifications — Integration (technical implementation document)

> Single source of truth for **how this package is built and how any project uses it**. Updated after every commit/push that changes the implementation (Rules.md §14). Status legend: ✅ done · 🚧 in progress · ⬜ not started.

| Field | Value |
|---|---|
| Package | `wab-notifications` |
| Type | Node.js package (TypeScript, npm), server only |
| BRD | `docs/WAB_Package_Notifications_BRD.md` |
| Version | 0.0.0 (design only — no code yet) |
| Node | >= 22, TypeScript strict, ESM + CJS builds |
| Server counterpart in WAB | `WAB-Server/src/providers/notifier` (interface already in WAB-Server, fake only today) |

## 1. Purpose and boundaries
Typed push and email sending with normalized results. The caller decides recipients, language and content; this package delivers, retries transient failures, de-duplicates by idempotency key, and reports which tokens are invalid so the caller can remove them.

**Not in this package:** Recipient selection, preferences, schedules, in-app inbox storage, SMS, WhatsApp, marketing email.

## 2. Architecture
Ports and adapters:
```
consumer ──> createNotifier(options) ──> Notifier (port, stable interface)
                                       ├── adapters/fake   (dev: local/fake)
                                       ├── adapters/fcm
                                       ├── adapters/smtp
                                       ├── adapters/idempotency-memory
                                       ├── adapters/idempotency-redis
```
- The factory picks the adapter from `options.provider` (+ `options.environment`). Unknown provider → `ConfigError`.
- Adapters never leak vendor types through the port; vendor responses are normalized (§5).
- Shared kernel: `errors/`, `config/` (zod-validated options), `http/` (timeouts, retry with backoff + jitter), `logger` (injected, redacting), `events` (optional hook for analytics).

## 3. Public API (port)
```ts
interface Notifier {
  sendPush(r:{target:{tokens:string[]}|{topic:string}; message:PushMessage; idempotencyKey:string}): Promise<{tokens:{token:string; result:"SENT"|"INVALID_TOKEN"|"FAILED"}[]; sent:number; invalidTokens:string[]}>;
  sendEmail(r:{to:string[]; subject:string; text:string; html?:string; idempotencyKey:string}): Promise<{accepted:string[]; rejected:string[]}>;
}
createNotifier(options): Notifier   // idempotencyKey must match [A-Za-z0-9:_.-]{8,128}
```

## 4. Configuration
| Option / env key | Dev | Prod | Notes |
|---|---|---|---|
| `push.provider` | `fake`/`fcm`(emulator-less) | `fcm` | |
| `email.provider` | `smtp`→Mailpit `localhost:1025` | `smtp` (Gmail) | |
| `environment` | `dev` | `prod` | prod refuses fake |
| `fcm.credentials` (service account) | optional | required (secret) | |
| `fcm.android.channelId`, `ios.categories` | consumer values | same | no hardcoding |
| `smtp.host/port/secure/user/pass/from` | localhost values | secrets | |
| `retry.maxAttempts/baseMs/maxMs` | small | defaults | jitter |
| `idempotency.ttlSec`, `store` | memory | redis | |
| `batch.size` | 500 | 500 | FCM limit |

Rules: values come from the consumer (options/env), defaults live in `constants/`, prod refuses the fake adapter and missing secrets (`ConfigError` naming the key only).

## 5. Status and result mapping (every vendor status handled)
| Vendor result | Normalized (per token) |
|---|---|
| FCM success | `SENT` |
| `messaging/registration-token-not-registered`, `invalid-argument` token | `INVALID_TOKEN` (returned in `invalidTokens`) |
| `unavailable`, `internal-error`, `quota-exceeded`, `message-rate-exceeded` | retried, then `FAILED` |
| `authentication-error` | throws `AUTH_FAILED` |
| SMTP 2xx accepted / rejected arrays | `accepted` / `rejected` |
| SMTP 4xx (transient) | retried; 5xx recipient errors → `rejected` |
| duplicate idempotency key | returns the first result, sends nothing |

Unknown vendor value → `UNKNOWN` + raw response logged (redacted), never success.

## 6. Error model
All failures extend `NotificationError` with `code`, `retryable`, `cause`, `details` (no secrets).
| Code | When | Retryable |
|---|---|---|
| `NOTIFY_PUSH_UNAVAILABLE` | FCM down/timeout | yes |
| `NOTIFY_EMAIL_UNAVAILABLE` | SMTP down/timeout | yes |
| `NOTIFY_AUTH_FAILED` | credentials rejected | no |
| `NOTIFY_PAYLOAD_INVALID` | empty target, payload too large, bad key | no |
| `NOTIFY_QUOTA_EXCEEDED` | Gmail daily limit | yes (later) |
Common codes for every package: `CONFIG_INVALID`, `VALIDATION_FAILED`, `AUTH_FAILED`, `NETWORK_ERROR`, `TIMEOUT`, `RATE_LIMITED`, `VENDOR_ERROR`, `MALFORMED_RESPONSE`, `UNKNOWN`.

## 7. Environments
- **dev (localhost):** `fake` push; SMTP to Mailpit on `localhost:1025`; memory idempotency.
- **prod:** FCM via service account; Gmail SMTP with App Password; Redis idempotency; fake refused.

## 8. Performance notes
One FCM app and one pooled SMTP transport reused; multicast in batches of 500; email digests supported for frequent alerts; templates compiled once.

## 9. Testing
- Unit tests: one test file per source file, every exported function: success, each error code, each status mapping, boundaries, idempotent replay. Vendor SDK/HTTP mocked. Coverage gate: 100 % functions, >= 95 % lines/branches.
- Loop test (`npm run test:loop`): 500 iterations of push (single/multicast/topic) and email with injected transient failures, duplicate keys and invalid tokens; asserts exactly-once per key, correct invalid-token list, no leaked connections.
- Consumer smoke test: install the built tarball into a temp project and call the factory.

## 10. Adoption guide (any project)
```ts
const notifier = createNotifier({ environment: "dev", push: { provider: "fake" }, email: { provider: "smtp", smtp: { host, port } } });
await notifier.sendPush({ target: { tokens }, message, idempotencyKey: "booking:123:requested" });
```
How WAB-Server adopts it: replace `WAB-Server/src/providers/notifier` real mode (`*_PROVIDER=real`) with this package; the interface is already compatible (see §3).

## 11. Open questions / assumed-missing requirements
- Opened/delivered receipts are reported by apps, not FCM — event contract with `wab-analytics`.
- iOS time-sensitive/APNs headers need device testing.
- HTML template branding assets (logo, colors) from design.
- Gmail daily sending limit vs alert volume (digest thresholds).
- Topic naming convention.

## 12. Implementation status
| Item | Status |
|---|---|
| Project scaffold (tsconfig strict, eslint, prettier, jest, build, scripts) | ⬜ |
| Shared kernel (errors, config, http/retry, logger) | ⬜ |
| Adapter: fake — records messages; configurable per-token outcomes | ⬜ |
| Adapter: fcm — Firebase Admin messaging: single, multicast (batches of 500), topic | ⬜ |
| Adapter: smtp — Nodemailer SMTP (Gmail App Password in prod, Mailpit on localhost in dev) | ⬜ |
| Adapter: idempotency-memory — in-process store | ⬜ |
| Adapter: idempotency-redis — prod store with TTL | ⬜ |
| Unit tests + coverage gate | ⬜ |
| Loop test | ⬜ |
| README + consumer smoke test | ⬜ |

## 13. Changelog
| Date | Version | Change |
|---|---|---|
| 2026-10-14 | 0.0.0 | Design document created from the BRD; no code yet. |
