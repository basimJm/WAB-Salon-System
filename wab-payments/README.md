# @wab/payments

Gateway-independent payments for WAB projects. **HyperPay (ACI OPP / COPYandPAY)** is the first gateway; any other gateway is one adapter behind the same port. Money is always integer fils (1 JOD = 1000 fils). No business rules live here.

## Quick start

```ts
import { createPayments } from '@wab/payments';

const payments = createPayments({
  environment: 'prod', // 'dev' | 'prod' (prod is strict)
  provider: 'hyperpay',
  idempotency: { store: new RedisIdempotencyStore(redis) }, // shared store required in prod
  directory: new RedisSessionDirectory(redis), // checkout -> payment id, needed for late refunds
  hyperpay: {
    entityId, // from the HyperPay portal
    accessToken, // secret, injected by you
    webhookDecryptionKey, // 64 hex chars from the portal
    shopperResultUrl, // https URL or the app's custom scheme
  },
});

const session = await payments.createSession({
  idempotencyKey,
  amountFils: 12_500,
  reference: draftId,
});
// hand session.client (checkoutId, brands, shopperResultUrl...) to the app, then on the server:
const result = await payments.verify(session.sessionId); // never trust the client result
const refund = await payments.refund({
  idempotencyKey,
  sessionId: session.sessionId,
  amountFils: 5_000,
});
const event = await payments.handleWebhook({ rawBody, signature, headers }); // throws PAYMENT_WEBHOOK_INVALID
```

## Providers and environments

| provider       | use                                                                | notes                                                                                                       |
| -------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `fake`         | unit tests                                                         | in memory, no network                                                                                       |
| `mock-gateway` | dev on localhost                                                   | the HyperPay adapter against the OPP-compatible mock (`@wab/payments/mock-gateway`, `npm run mock-gateway`) |
| `hyperpay`     | dev (test host `eu-test.oppwa.com`) and prod (`eu-prod.oppwa.com`) | prod refuses test hosts, `testMode`, missing webhook key, memory stores                                     |
| `custom`       | any other gateway                                                  | pass `gateway: PaymentGateway`                                                                              |

## Behaviour you can rely on

- A declined payment is a normal result (`status: 'FAILED'`, with `gatewayCode`/`gatewayMessage`); an unknown code is `UNKNOWN`, never success.
- `createSession` and `refund` are idempotent per key; reusing a key with other parameters throws `PAYMENT_DUPLICATE`. Refunds are never blindly retried; a refund with a known key is looked up at the gateway first.
- Webhooks are authenticated by AES-256-GCM decryption; `event.replayed` tells you to skip side effects. Always call `verify` before creating a booking.
- Every failure is a `PaymentSdkError` with `code`, `retryable`, `details` (no secrets, no card data).

See `.claude/Integration.md` for the full technical reference.

## Scripts

`npm run verify` (typecheck, lint, format, tests with coverage gate, build, packed-tarball smoke, loop test) · `npm run mock-gateway`.
