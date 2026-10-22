import { DisabledPaymentProvider, type PaymentProvider } from '../src/providers/payments';
import { normalizeError } from '../src/utils/errors/normalize';
import { ExternalServiceError, UnauthorizedError } from '../src/utils/errors';

const HTTP_UNAVAILABLE = 503;
const HTTP_UNAUTHORIZED = 401;

describe('DisabledPaymentProvider (payments are paused)', () => {
  const provider: PaymentProvider = new DisabledPaymentProvider();

  it('answers 503 on every gateway call so nothing is created behind it', async () => {
    const calls = [
      provider.createSession({ idempotencyKey: 'k', amountFils: 1000, reference: 'draft' }),
      provider.verify('session'),
      provider.refund({ idempotencyKey: 'k', sessionId: 'session', amountFils: 1000 }),
      provider.getRefund('refund'),
    ];
    for (const call of calls) {
      const failure: unknown = await call.catch((error: unknown) => error);
      expect(failure).toBeInstanceOf(ExternalServiceError);
      expect(normalizeError(failure).httpStatus).toBe(HTTP_UNAVAILABLE);
    }
  });

  it('never trusts a webhook', async () => {
    const failure: unknown = await provider
      .handleWebhook({ rawBody: '{}', signature: 'anything' })
      .catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(UnauthorizedError);
    expect(normalizeError(failure).httpStatus).toBe(HTTP_UNAUTHORIZED);
  });
});
