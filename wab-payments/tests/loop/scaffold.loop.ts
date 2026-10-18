import { createPayments, FakeGateway } from '../../src';

const noSleep = { sleep: (): Promise<void> => Promise.resolve(), random: (): number => 0.5 };

describe('payment flow loop (fake gateway)', () => {
  it('charges once per key and never refunds more than was paid', async () => {
    const gateway = new FakeGateway();
    const payments = createPayments({
      environment: 'dev',
      provider: 'custom',
      gateway,
      retryDeps: noSleep,
    });
    for (let i = 0; i < 60; i += 1) {
      const request = {
        idempotencyKey: `loop:session:${String(i)}`,
        amountFils: 10_000,
        reference: `d-${String(i)}`,
      };
      const [a, b] = await Promise.all([
        payments.createSession(request),
        payments.createSession(request),
      ]);
      expect(a.sessionId).toBe(b.sessionId);
      await payments.refund({
        idempotencyKey: `loop:refund:${String(i)}:1`,
        sessionId: a.sessionId,
        amountFils: 6_000,
      });
      await expect(
        payments.refund({
          idempotencyKey: `loop:refund:${String(i)}:2`,
          sessionId: a.sessionId,
          amountFils: 4_001,
        }),
      ).rejects.toMatchObject({ code: 'PAYMENT_REFUND_EXCEEDS' });
    }
    expect(gateway.calls.createCheckout).toBe(60);
    expect(gateway.calls.refund).toBe(120);
  });
});
