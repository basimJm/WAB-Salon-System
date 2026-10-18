import { createPayments, ERROR_CODES, FakeGateway } from '../src';
import { noSleep, SESSION } from './helpers';
import { hyperpayPayments, reply, scripted } from './hyperpayHelpers';

const split = (): { gateway: FakeGateway; payments: ReturnType<typeof createPayments> } => {
  const gateway = new FakeGateway({ splitPayments: true });
  return {
    gateway,
    payments: createPayments({
      environment: 'dev',
      provider: 'custom',
      gateway,
      retryDeps: noSleep,
    }),
  };
};

describe('Phase 2 readiness: destinations and sub-merchants', () => {
  it('exposes the gateway capabilities (Phase 1: no splits)', () => {
    expect(hyperpayPayments(scripted(() => reply(200, {})).http).capabilities).toEqual({
      partialRefunds: true,
      splitPayments: false,
      webhooks: true,
      cancelSession: false,
    });
    expect(split().payments.capabilities.splitPayments).toBe(true);
  });
  it('is unchanged in Phase 1 when no destinations are given', async () => {
    const { payments } = split();
    await expect(payments.createSession(SESSION)).resolves.toMatchObject({ status: 'SUCCEEDED' });
  });
  it('refuses destinations and sub-merchant refunds on a Phase 1 gateway', async () => {
    const { http, requests } = scripted(() => reply(200, {}));
    const payments = hyperpayPayments(http);
    await expect(
      payments.createSession({
        ...SESSION,
        destinations: [{ subMerchantId: 'salon-1', amountFils: 100 }],
      }),
    ).rejects.toMatchObject({ code: ERROR_CODES.FEATURE_UNSUPPORTED });
    await expect(
      payments.refund({
        idempotencyKey: 'refund-key-1',
        sessionId: 'chk-1',
        amountFils: 100,
        subMerchantId: 'salon-1',
      }),
    ).rejects.toMatchObject({ code: ERROR_CODES.FEATURE_UNSUPPORTED });
    expect(requests).toHaveLength(0);
  });
  it('passes valid destinations to a split-capable gateway', async () => {
    const { gateway, payments } = split();
    const destinations = [
      { subMerchantId: 'salon-1', amountFils: 9_000 },
      { subMerchantId: 'salon-2', amountFils: 3_500 },
    ];
    const session = await payments.createSession({ ...SESSION, destinations });
    expect(gateway.destinations.get(session.sessionId)).toEqual(destinations);
  });
  it.each([
    ['empty list', []],
    [
      'too many',
      Array.from({ length: 11 }, (_, i) => ({ subMerchantId: `s${String(i)}`, amountFils: 1 })),
    ],
    ['bad id', [{ subMerchantId: 'bad id', amountFils: 1 }]],
    ['bad amount', [{ subMerchantId: 's1', amountFils: 0 }]],
    [
      'sum above amount',
      [
        { subMerchantId: 's1', amountFils: 12_000 },
        { subMerchantId: 's2', amountFils: 501 },
      ],
    ],
  ])('validates destinations: %s', async (_name, destinations) => {
    const { payments } = split();
    await expect(payments.createSession({ ...SESSION, destinations })).rejects.toMatchObject({
      code: ERROR_CODES.VALIDATION_FAILED,
    });
  });
  it('lets a split-capable gateway refund from a sub-merchant balance, and validates the id', async () => {
    const { gateway, payments } = split();
    const { sessionId } = await payments.createSession(SESSION);
    const refund = await payments.refund({
      idempotencyKey: 'refund-key-1',
      sessionId,
      amountFils: 100,
      subMerchantId: 'salon-1',
    });
    expect(gateway.refundSubMerchants.get(refund.refundId)).toBe('salon-1');
    await expect(
      payments.refund({
        idempotencyKey: 'refund-key-2',
        sessionId,
        amountFils: 100,
        subMerchantId: 'bad id',
      }),
    ).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION_FAILED });
    const plain = await payments.refund({
      idempotencyKey: 'refund-key-3',
      sessionId,
      amountFils: 100,
    });
    expect(gateway.refundSubMerchants.has(plain.refundId)).toBe(false);
  });
});
