# wab-notifications — Integration (technical implementation document)

> Single source of truth for **how this package is built and how any project uses it**. Updated after every commit/push that changes the implementation (Rules.md §14). Status legend: ✅ done · 🚧 in progress · ⬜ not started.

| Field | Value |
|---|---|
| Package | `wab-notifications` |
| Type | Node.js package (TypeScript, ESM + CJS + `.d.ts`), server only |
| BRD | `docs/WAB_Package_Notifications_BRD.md` |
| Version | 0.2.0 |
| Node | >= 22, TypeScript strict |
| Server counterpart in WAB | `WAB-Server/src/providers/notifier` (same request/result shapes; `NOTIFIER_PROVIDER=real` delegates to this package, `fake` in dev/test) |

## 1. Purpose and boundaries
Delivers **push** (FCM, customer + merchant apps) and **email** (SMTP) behind one interface. The caller decides recipients, language and content; this package validates, de-duplicates, delivers, retries transient failures and tells the caller which device tokens are dead.

**Not in this package:** recipient selection, preferences, schedules, the in-app inbox, SMS, WhatsApp (phone OTP codes go through `wab-otp`: ARQAM OTP over WhatsApp), marketing email.

## 2. Architecture
```
consumer ──> createNotifier(options) ──> Notifier  (sendPush / sendEmail / close)
                  │  validate → idempotency store → channel → events
                  ├── PushChannel   : fake | fcm | custom
                  └── EmailChannel  : fake | smtp | brevo | custom
```
- **Swap any third party:** implement `PushChannel` or `EmailChannel` (one `send` method) and pass `{ provider: 'custom', channel }`. Nothing else changes.
- Source layout: `constants/` (all defaults, FCM/SMTP code lists) · `errors/` · `config/` (zod-validated options, service-account parsing, prod rules) · `validation.ts` · `retry/` · `idempotency/` (memory, Redis) · `adapters/push/{fcm,fcmMessage,fcmErrors,fake}` · `adapters/email/{smtp,smtpErrors,brevo,httpErrors,fake}` · `adapters/vendors.ts` (the only file that touches firebase-admin / nodemailer, loaded lazily) · `templates/` · `notifier.ts` (composition).
- `firebase-admin` is imported lazily on the first push, so projects that only send email never load it.

## 3. Public API
```ts
createNotifier(options: NotifierOptions): Notifier & { channels: { push; email } }

interface Notifier {
  sendPush(r: { target: { tokens: string[] } | { topic: string }; message: PushMessage; idempotencyKey: string }): Promise<PushResult>;
  sendEmail(r: { to: string[]; subject: string; text: string; html?: string; idempotencyKey: string }): Promise<EmailResult>;
  close(): Promise<void>;   // idempotent; closes pooled SMTP + firebase app
}
interface PushMessage { app: 'CUSTOMER'|'MERCHANT'; kind: 'VISIBLE'|'DATA_ONLY'; title?; body?; data?: Record<string,string>;
  priority?: 'NORMAL'|'HIGH'; interruption?: 'TIME_SENSITIVE'; actionCategory?; sound?; badge?; androidChannelId?;
  androidFullScreenIntent?; collapseKey? }
interface PushResult { tokens: { token; result: 'SENT'|'INVALID_TOKEN'|'FAILED' }[]; sent: number; invalidTokens: string[] }
interface EmailResult { accepted: string[]; rejected: string[] }

renderEmail({ template: 'ADMIN_2FA'|'ALERT'|'REPORT_READY', language: 'ar'|'en', params, brandName?, brandColor?, actionUrl? })
  → { subject, text, html }            // pure; ar is RTL; params are HTML-escaped; actionUrl must be https (http on localhost)
parseServiceAccount(json | object)      // validates a Firebase key; errors name fields only
```
`idempotencyKey` must match `[A-Za-z0-9:_.-]{8,128}`. Same key + same request → first result, nothing re-sent; same key + different request → `NOTIFY_IDEMPOTENCY_CONFLICT`; a failed send is forgotten so the caller can retry with the same key.

### Message mapping (what the apps receive)
| Message | Android | iOS (APNs) |
|---|---|---|
| `VISIBLE` | notification (+ `channelId`, `sound`), priority normal/high | alert, sound (default `default`), `category`, `interruption-level: time-sensitive`, `apns-priority: 10` |
| `DATA_ONLY` | data message only; title/body copied into `data.title/body`; priority high when `HIGH` | silent background (`content-available`), `apns-priority: 5` |
| `androidFullScreenIntent` | `data.fullScreenIntent = "true"` (FCM has no field; the app draws the overlay) | — |
| `collapseKey` (≤ 64 bytes) | `android.collapseKey` | `apns-collapse-id` |
| `HIGH` or `TIME_SENSITIVE` | `android.priority = high` | — |

## 4. Configuration
```ts
createNotifier({
  environment: 'dev' | 'prod',
  push:  { provider: 'fake' } | { provider: 'custom', channel }
       | { provider: 'fcm', credentials, projectId?, dryRun?, timeoutMs?, httpAgent?, legacyHttpTransport?, messaging? },
  email: { provider: 'fake' } | { provider: 'custom', channel }
       | { provider: 'smtp', from: { name, address }, smtp: { host, port?, secure?, user?, pass?, timeoutMs? }, transport? }
       | { provider: 'brevo', from: { name, address }, brevo: { apiKey, baseUrl?, timeoutMs? }, fetch? },
  retry?, limits?, idempotency?: { store?, ttlSec? }, logger?, onEvent?, retryDeps?,
})
```
| Option | Dev | Prod |
|---|---|---|
| `push` | `fake`, or `fcm` with the **dev** key and `dryRun: true` | `fcm` with the **prod** key; `fake` and `dryRun` refused |
| `email` | `fake`, or `smtp` to Mailpit (`localhost:1025`, no auth), or `brevo` with `baseUrl` pointing at a local mock | `smtp` with `user` + `pass` (STARTTLS required), or `brevo` (API key; `baseUrl` must be https); `fake` refused |
| `idempotency.store` | memory (default) | **required**: `RedisIdempotencyStore` (shared by all instances) |
| `push.projectId` | optional guard | recommended: must equal the key's project (catches a dev/prod key mix-up) |
| `retry` | defaults: 3 attempts, 200 ms base, 5 s cap, ±20 % jitter | same |
| `limits` | defaults: 500 tokens/push, 500/FCM batch, 50 recipients, 100 data entries | same |

Invalid options throw `NotificationError(NOTIFY_CONFIG_INVALID)` at creation, naming the bad keys only (never values). Secrets are injected by the consumer and never logged or stored.

**Firebase projects (owner decision):** two separate projects — dev `wab-dev-397ab`, prod `wab-prod-9c58f` — each with its own service-account key. Keys live in the consumer's secret store, **never in git** (`*firebase-adminsdk*.json` and `*service-account*.json` are git-ignored repo-wide).

**Email sender (owner decision):** WAB sends from `basim.abusnaimeh@gmail.com` (Gmail SMTP). It is consumer config (`EMAIL_FROM_ADDRESS`), never hardcoded in the SDK. On Gmail `SMTP_USER` must be this same account (Gmail rewrites any other From), and `SMTP_PASS` must be a Google **App Password** for it (2-Step Verification on; Google Account → Security → App passwords). Never put the password in git or in chat — set it as an environment variable or secret. Limits: 500 messages per rolling 24 h, 100 recipients per message.

**WAB-Server env keys** (`NOTIFIER_PROVIDER=real`): `FCM_SERVICE_ACCOUNT_JSON`, `FCM_PROJECT_ID`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM_NAME`, `EMAIL_FROM_ADDRESS`.

## 5. Status and result mapping (every vendor status handled)
**FCM per token** (`messaging/*`): success → `SENT` · `registration-token-not-registered`, `invalid-registration-token`, and `invalid-argument` whose message says "registration token" (what real FCM returns for a malformed token) → `INVALID_TOKEN` (returned in `invalidTokens`) · `internal-error`, `server-unavailable`, `unknown-error`, `message-rate-exceeded`, `device-message-rate-exceeded`, `topics-message-rate-exceeded`, `quota-exceeded` → retried per token with backoff, then `FAILED` · `invalid-argument` / `invalid-payload` / `payload-size-limit-exceeded` → `FAILED` for that token; if **every** token in a batch is refused for the payload → throws `NOTIFY_PAYLOAD_INVALID` · auth codes (`authentication-error`, `third-party-auth-error`, `mismatched-credential`, `invalid-apns-credentials`, `app/invalid-credential`) → throws `NOTIFY_AUTH_FAILED` immediately · any other code → `FAILED` and a warning is logged.
**FCM call-level** (whole request): retryable codes / no answer → retried; if nothing was delivered after the last attempt the last error is thrown, otherwise remaining tokens are `FAILED` · a response whose length differs from the batch → `NOTIFY_MALFORMED_RESPONSE` (retryable) · request timeout → `NOTIFY_TIMEOUT` (retryable).
**Brevo HTTP API (NOT-012):** 200/201/202 → sent (body must be JSON, else `MALFORMED_RESPONSE`) · 401/403 (bad key, or an IP not on Brevo's authorised list) → `AUTH_FAILED` · 402 (no credits) → `QUOTA_EXCEEDED` · 429 → `RATE_LIMITED` (retryable) · 400 → `PAYLOAD_INVALID` · 5xx → `VENDOR_ERROR` (retryable) · fetch failure → `NETWORK_ERROR` (retryable) · abort/timeout → `TIMEOUT` (retryable) · any other status → `UNKNOWN` (logged). Brevo accepts or refuses the whole message, so `accepted` = every recipient on success. Vendor `code` from the error body goes to `details.vendorCode`.

**SMTP:** `EAUTH`/535 → `AUTH_FAILED` · `550 5.4.5` / "sending limit" → `QUOTA_EXCEEDED` (not retried; Gmail personal accounts: 500 messages per rolling 24 h) · `ETIMEDOUT` → `TIMEOUT` · `ECONNECTION`/`ECONNREFUSED`/`ESOCKET`/`EDNS` → `NETWORK_ERROR` (retryable) · 421/450/451/452 → retryable `VENDOR_ERROR` · other 5xx → `VENDOR_ERROR` · `EENVELOPE` + 5xx (server refused all recipients) → **no throw**, every recipient is returned in `rejected` · partial refusals come back in `rejected` · unknown → `UNKNOWN`.
Unknown vendor values are never treated as success.

## 6. Error model
All failures are `NotificationError` with `code`, `retryable`, `cause`, `details` (no secrets, tokens or addresses).
| Code | When | Retryable |
|---|---|---|
| `NOTIFY_CONFIG_INVALID` | bad options / key, prod rule violated | no |
| `NOTIFY_VALIDATION_FAILED` | bad request (empty tokens, bad key, header injection, …) | no |
| `NOTIFY_AUTH_FAILED` | FCM or SMTP credentials rejected | no |
| `NOTIFY_NETWORK_ERROR` / `NOTIFY_TIMEOUT` | no answer / too slow | yes |
| `NOTIFY_RATE_LIMITED` | FCM rate limit | yes |
| `NOTIFY_QUOTA_EXCEEDED` | SMTP daily quota | no (retry later) |
| `NOTIFY_VENDOR_ERROR` | vendor 5xx / temporary failure | yes for 4xx-class temporary, no for permanent |
| `NOTIFY_PAYLOAD_INVALID` | vendor rejected the payload | no |
| `NOTIFY_MALFORMED_RESPONSE` | vendor answer unusable / corrupt idempotency record | yes (FCM) |
| `NOTIFY_DUPLICATE_IN_PROGRESS` | same key still running in another instance | yes |
| `NOTIFY_IDEMPOTENCY_CONFLICT` | same key, different content | no |
| `NOTIFY_UNKNOWN` | unclassified error | no |

## 7. Environments
- **dev (localhost):** `fake` channels; or SMTP → Mailpit `localhost:1025` (from `WAB-Server/docker-compose.yml`); or real FCM from the **dev** project with `dryRun: true` (Google validates credentials and message, nothing is delivered). `npm run smoke` does exactly this (see §9).
- **prod:** FCM prod project key, Gmail/other SMTP with auth, shared Redis idempotency store; fakes and `dryRun` are refused at start-up.
- **Behind an HTTP proxy** (cloud sandboxes, corporate networks): firebase-admin ignores `HTTPS_PROXY` and its default HTTP/2 transport cannot be proxied → pass `httpAgent` and `legacyHttpTransport: true`.

## 8. Performance notes
One firebase app and one pooled SMTP transport per notifier, created lazily; multicast batches of ≤ 500 with **partial retry** (only failed tokens are re-sent); templates are pure string functions; the in-memory store shares concurrent duplicates into one operation; no timers are left behind (timeouts are cleared).

## 9. Testing
- `npm test`: 200 unit tests, one test file per source file, coverage gate 100 % functions / ≥ 95 % lines & branches (currently 100 / 100 / 98 %). `adapters/vendors.ts` (thin glue over the real SDKs) is excluded and covered by the smoke script.
- `npm run test:loop`: 500 push + email flows, 20 concurrent, triple-submitted keys, ~10 % injected transient failures; asserts exactly-once delivery, correct `invalidTokens`, stable memory.
- `npm run test:smoke-package`: packs the built tarball, installs it in a temp project and calls it through both `require` and `import`.
- `npm run smoke` (manual, real vendor): `FIREBASE_CREDENTIALS_FILE=<path> FIREBASE_PROJECT_ID=<id> npm run smoke` — verified against the dev project `wab-dev-397ab`: auth works, a fake token returns `INVALID_TOKEN`, topic dry-run succeeds. Optional `SMTP_HOST`/`SMTP_PORT` to also test an SMTP sink.
- `npm run verify` runs everything (typecheck, lint, format, tests, build, package smoke, loop).

## 10. Adoption guide (any project)
```ts
import { createNotifier, renderEmail, RedisIdempotencyStore, parseServiceAccount } from 'wab-notifications';

const notifier = createNotifier({
  environment: 'prod',
  push: { provider: 'fcm', credentials: parseServiceAccount(process.env.FCM_SERVICE_ACCOUNT_JSON!), projectId: 'wab-prod-9c58f' },
  email: { provider: 'smtp', from: { name: 'WAB', address: 'no-reply@…' }, smtp: { host, port, user, pass } },
  idempotency: { store: new RedisIdempotencyStore(redis) },
  onEvent: (e) => metrics.count(e.type),
});
const { invalidTokens } = await notifier.sendPush({ target: { tokens }, message, idempotencyKey: `booking:${id}:requested` });
// remove invalidTokens from your database
```
**WAB-Server adoption (done, T-123):** its `Notifier` interface delegates to this package (same shapes) with `NOTIFIER_PROVIDER=real`; it maps `NotificationError` → `ExternalServiceError` and removes returned `invalidTokens` from `installations`.

## 11. Open questions / assumed-missing requirements
- **Opened/delivered receipts** come from the apps, not FCM — event contract with `wab-analytics` still to define (`onEvent` currently reports sent/failed counts only).
- **iOS time-sensitive / Accept-Reject actions** need device testing (category names are supplied by the caller; the apps must register the same ones).
- **Android overlay:** FCM has no full-screen-intent field; the SDK sends `data.fullScreenIntent` and the merchant app must draw the heads-up/overlay itself from the data message.
- **Email branding:** templates are plain (WAB violet button, ar RTL). Logo/colours pending design assets; `brandName`/`brandColor` are options.
- **Gmail limit** (500 messages / rolling 24 h personal, 2 000 Workspace; 100 recipients per message): alerts volume vs. limit → digest/batching is the caller's job; the SDK surfaces `NOTIFY_QUOTA_EXCEEDED`. A transactional provider (Brevo/Resend/SES) can replace SMTP by adding an email channel — no consumer change.
- **Pending idempotency records** in Redis from a crashed process block the same key until the TTL (default 24 h) with `DUPLICATE_IN_PROGRESS`; use a shorter TTL or a new key if that matters.
- **`enableLegacyHttpTransport`** is deprecated upstream; only used when `legacyHttpTransport: true` (proxied networks).
- **Real SMTP** was not exercised here (no Mailpit/Gmail in the sandbox): only the real nodemailer connection-failure path is tested. First dev run against Mailpit/Gmail should confirm.
- **Prod key** (`wab-prod-9c58f`) has been provided but was intentionally not used from the sandbox.
- **Secret hygiene:** both service-account keys were pasted into the chat session; rotate them if that session transcript is not private.

### BRD requirement coverage
NOT-01…07, NOT-10…14 ✅ (see §3–§6, §9). NOT-08 ✅ (sender name/address, plain-text alternative, single-line subjects; SPF/DKIM/DMARC guidance in the README). NOT-09 (digest, SHOULD) ◐: the SDK sends one email per call and provides the `ALERT` template; batching alerts into one digest is the caller's scheduled job (WAB-Server alerts engine, SRV-107). NNF-01 (push within 1 s) is not measurable offline: the SDK adds no queue or delay on the hot path, but latency depends on FCM and was not benchmarked. NNF-03 ✅ (logs carry counts and codes only, never tokens, addresses or credentials). NNF-04 ✅ (strict TS, provider mocks; templates are covered by content/placeholder-parity tests rather than snapshots).

## 12. Implementation status
| Item | Status |
|---|---|
| Project scaffold (TS strict, eslint, prettier, jest, tsup ESM+CJS+dts, scripts) | ✅ |
| Shared kernel (errors, config + prod rules, validation, retry/timeout, idempotency memory + Redis) | ✅ |
| Adapter: FCM push (single/multicast/topic, partial retry, error mapping, proxy options) | ✅ |
| Adapter: SMTP email (nodemailer, error mapping, refusals) | ✅ |
| Adapters: fake push / fake email / custom | ✅ |
| Templates ar/en: ADMIN_2FA, ALERT, REPORT_READY | ✅ |
| Unit tests + coverage gate, loop test, package smoke, real-FCM dev smoke | ✅ |
| README + Integration.md | ✅ |
| WAB-Server wiring (`NOTIFIER_PROVIDER=real`) | ✅ T-123 |
| Email HTTP-API adapter (Brevo/Resend/SES) | ⬜ (only if needed) |
| Mailpit / Gmail real-send verification | ⬜ (needs local sink / App Password) |

## 13. Changelog
| Date | Version | Change |
|---|---|---|
| 2026-10-14 | 0.0.0 | Design document created from the BRD. |
| 2026-10-14 | 0.1.0 | First implementation: notifier, FCM + SMTP + fake + custom channels, templates, idempotency (memory/Redis), retry, config with dev/prod rules, 200 tests, loop test, package smoke; verified against the dev Firebase project. |
| 2026-10-26 | 0.2.0 | NOT-012: Brevo transactional email over HTTPS (`provider: 'brevo'`) behind the same `EmailChannel`, for hosts that block SMTP ports (Render); global `fetch`, no new dependency; every status mapped; prod requires an https base URL; Brevo flow added to the loop test. |
