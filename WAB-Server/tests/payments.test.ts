import { FAKE_GATEWAY_CODES, FAKE_WEBHOOK_SIGNATURE } from '../src/constants/providers';
import { FakePaymentProvider, fakeWebhookBody } from '../src/providers/payments';
import { PaymentError, UnauthorizedError } from '../src/utils/errors';
import { ERROR_CODES } from '../src/constants/errorCodes';

const session = (
  key = 'checkout:draft-1',
  amountFils = 12_500,
): { idempotencyKey: string; amountFils: number; reference: string } => ({
  idempotencyKey: key,
  amountFils,
  reference: 'draft-1',
});

describe('fake payment provider: sessions', () => {
  it('creates a session that succeeds by default and verifies with the gateway code', async () => {
    const gateway = new FakePaymentProvider();
    const created = await gateway.createSession(session());
    expect(created).toMatchObject({
      status: 'SUCCEEDED',
      amountFils: 12_500,
      reference: 'draft-1',
    });
    const verified = await gateway.verify(created.sessionId);
    expect(verified).toMatchObject({
      sessionId: created.sessionId,
      status: 'SUCCEEDED',
      amountFils: 12_500,
      gatewayCode: FAKE_GATEWAY_CODES.success,
    });
    expect(verified.gatewayMessage.length).toBeGreaterThan(0);
  });

  it.each([
    ['fail', 'FAILED', FAKE_GATEWAY_CODES.fail],
    ['cancel', 'CANCELLED', FAKE_GATEWAY_CODES.cancel],
    ['pending', 'PENDING', FAKE_GATEWAY_CODES.pending],
  ] as const)('scenario %s gives %s with its gateway code', async (scenario, status, code) => {
    const gateway = new FakePaymentProvider();
    gateway.scenarioForNextSession(scenario);
    const created = await gateway.createSession(session());
    expect(created.status).toBe(status);
    await expect(gateway.verify(created.sessionId)).resolves.toMatchObject({
      status,
      gatewayCode: code,
    });
  });

  it('keeps a pending session pending until it settles, then reports the final result', async () => {
    const gateway = new FakePaymentProvider();
    gateway.scenarioForNextSession('pending');
    const { sessionId } = await gateway.createSession(session());
    await expect(gateway.verify(sessionId)).resolves.toMatchObject({ status: 'PENDING' });
    gateway.settle(sessionId, 'success');
    await expect(gateway.verify(sessionId)).resolves.toMatchObject({ status: 'SUCCEEDED' });
  });

  it('is idempotent: the same key returns the same session and creates no second one', async () => {
    const gateway = new FakePaymentProvider();
    const first = await gateway.createSession(session());
    gateway.scenarioForNextSession('fail');
    const again = await gateway.createSession(session());
    expect(again).toBe(first);
    expect(again.status).toBe('SUCCEEDED');
    const other = await gateway.createSession(session('checkout:draft-2'));
    expect(other.sessionId).not.toBe(first.sessionId);
  });

  it('rejects reusing a key with a different amount', async () => {
    const gateway = new FakePaymentProvider();
    await gateway.createSession(session());
    await expect(gateway.createSession(session('checkout:draft-1', 9_000))).rejects.toBeInstanceOf(
      RangeError,
    );
  });

  it.each([
    { amountFils: 0 },
    { amountFils: -5 },
    { reference: 'bad reference!' },
    { idempotencyKey: 'x' },
  ])('rejects invalid input %j', async (override) => {
    await expect(
      new FakePaymentProvider().createSession({ ...session(), ...override }),
    ).rejects.toBeInstanceOf(RangeError);
  });

  it.each([10.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects the non-integer amount %s (money is whole fils)',
    async (amountFils) => {
      await expect(
        new FakePaymentProvider().createSession({ ...session(), amountFils }),
      ).rejects.toBeInstanceOf(TypeError);
    },
  );

  it('rejects an unknown session', async () => {
    await expect(new FakePaymentProvider().verify('nope')).rejects.toBeInstanceOf(RangeError);
  });
});

describe('fake payment provider: refunds', () => {
  const paid = async (): Promise<{ gateway: FakePaymentProvider; sessionId: string }> => {
    const gateway = new FakePaymentProvider();
    const { sessionId } = await gateway.createSession(session());
    return { gateway, sessionId };
  };
  const refund = (
    sessionId: string,
    amountFils: number,
    key = 'refund:1',
  ): { idempotencyKey: string; sessionId: string; amountFils: number } => ({
    idempotencyKey: key,
    sessionId,
    amountFils,
  });

  it('refunds fully and reports the refund by id', async () => {
    const { gateway, sessionId } = await paid();
    const result = await gateway.refund(refund(sessionId, 12_500));
    expect(result).toMatchObject({ status: 'REFUNDED', amountFils: 12_500, sessionId });
    await expect(gateway.getRefund(result.refundId)).resolves.toEqual(result);
  });

  it('allows several partial refunds up to the captured amount, not beyond', async () => {
    const { gateway, sessionId } = await paid();
    await gateway.refund(refund(sessionId, 5_000, 'refund:1'));
    await gateway.refund(refund(sessionId, 7_500, 'refund:2'));
    const failure = await gateway.refund(refund(sessionId, 1, 'refund:3')).catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(PaymentError);
  });

  it('counts a pending refund against the captured amount', async () => {
    const { gateway, sessionId } = await paid();
    gateway.scenarioForNextRefund('pending');
    const pending = await gateway.refund(refund(sessionId, 12_000, 'refund:1'));
    expect(pending.status).toBe('REFUND_PENDING');
    gateway.scenarioForNextRefund('success');
    await expect(gateway.refund(refund(sessionId, 600, 'refund:2'))).rejects.toBeInstanceOf(
      PaymentError,
    );
    gateway.settleRefund(pending.refundId, 'fail');
    await expect(gateway.getRefund(pending.refundId)).resolves.toMatchObject({
      status: 'REFUND_FAILED',
    });
    await expect(gateway.refund(refund(sessionId, 12_500, 'refund:3'))).resolves.toMatchObject({
      status: 'REFUNDED',
    });
  });

  it('settles a pending refund successfully', async () => {
    const { gateway, sessionId } = await paid();
    gateway.scenarioForNextRefund('pending');
    const pending = await gateway.refund(refund(sessionId, 1_000));
    gateway.settleRefund(pending.refundId, 'success');
    await expect(gateway.getRefund(pending.refundId)).resolves.toMatchObject({
      status: 'REFUNDED',
      gatewayCode: FAKE_GATEWAY_CODES.success,
    });
  });

  it('reports a failed refund with the gateway code and frees the amount', async () => {
    const { gateway, sessionId } = await paid();
    gateway.scenarioForNextRefund('fail');
    const failed = await gateway.refund(refund(sessionId, 12_500, 'refund:1'));
    expect(failed).toMatchObject({
      status: 'REFUND_FAILED',
      gatewayCode: FAKE_GATEWAY_CODES.refundFail,
    });
    gateway.scenarioForNextRefund('success');
    await expect(gateway.refund(refund(sessionId, 12_500, 'refund:2'))).resolves.toMatchObject({
      status: 'REFUNDED',
    });
  });

  it('is idempotent per key and does not refund twice', async () => {
    const { gateway, sessionId } = await paid();
    const first = await gateway.refund(refund(sessionId, 12_500));
    const again = await gateway.refund(refund(sessionId, 12_500));
    expect(again).toBe(first);
    await expect(gateway.refund(refund(sessionId, 100, 'refund:2'))).rejects.toBeInstanceOf(
      PaymentError,
    );
    await expect(gateway.refund(refund(sessionId, 100))).rejects.toBeInstanceOf(RangeError);
  });

  it.each(['fail', 'cancel', 'pending'] as const)(
    'refuses to refund a %s payment with PAYMENT_NOT_VERIFIED',
    async (scenario) => {
      const gateway = new FakePaymentProvider();
      gateway.scenarioForNextSession(scenario);
      const { sessionId } = await gateway.createSession(session());
      const failure = await gateway.refund(refund(sessionId, 100)).catch((e: unknown) => e);
      expect(failure).toBeInstanceOf(PaymentError);
      expect((failure as PaymentError).code).toBe(ERROR_CODES.PAYMENT_NOT_VERIFIED);
    },
  );

  it.each([0, -1])('rejects the refund amount %s', async (amountFils) => {
    const { gateway, sessionId } = await paid();
    await expect(gateway.refund(refund(sessionId, amountFils))).rejects.toBeInstanceOf(RangeError);
  });

  it('rejects a fractional refund amount (money is whole fils)', async () => {
    const { gateway, sessionId } = await paid();
    await expect(gateway.refund(refund(sessionId, 2.5))).rejects.toBeInstanceOf(TypeError);
  });

  it('rejects an unknown refund and an unknown session', async () => {
    const gateway = new FakePaymentProvider();
    await expect(gateway.getRefund('nope')).rejects.toBeInstanceOf(RangeError);
    await expect(gateway.refund(refund('nope', 100))).rejects.toBeInstanceOf(RangeError);
  });
});

describe('fake payment provider: webhooks', () => {
  const event = {
    sessionId: 'fake-session-1',
    status: 'SUCCEEDED' as const,
    gatewayCode: FAKE_GATEWAY_CODES.success,
    gatewayMessage: 'ok',
  };

  it('maps a correctly signed webhook to a normalized event', async () => {
    const gateway = new FakePaymentProvider();
    await expect(
      gateway.handleWebhook({ rawBody: fakeWebhookBody(event), signature: FAKE_WEBHOOK_SIGNATURE }),
    ).resolves.toEqual(event);
  });

  it.each([
    ['a wrong signature', fakeWebhookBody(event), 'wrong'],
    ['an empty signature', fakeWebhookBody(event), ''],
    ['a body that is not JSON', 'not json', FAKE_WEBHOOK_SIGNATURE],
    [
      'a body with an unknown status',
      JSON.stringify({ ...event, status: 'MAYBE' }),
      FAKE_WEBHOOK_SIGNATURE,
    ],
    [
      'a body without a session',
      JSON.stringify({ ...event, sessionId: '' }),
      FAKE_WEBHOOK_SIGNATURE,
    ],
  ])('rejects %s as unauthorized', async (_label, rawBody, signature) => {
    const failure = await new FakePaymentProvider()
      .handleWebhook({ rawBody, signature })
      .catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(UnauthorizedError);
  });
});
