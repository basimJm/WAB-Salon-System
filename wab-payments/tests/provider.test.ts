import type { PaymentGateway } from '../src';
import { createPayments, ERROR_CODES, fakeWebhook, FakeGateway, PaymentSdkError } from '../src';
import { capturingLogger, SESSION, withFake } from './helpers';

const transient = (): PaymentSdkError =>
  new PaymentSdkError(ERROR_CODES.GATEWAY_UNAVAILABLE, 'down', { retryable: true });

describe('createSession', () => {
  it('creates a session and is idempotent per key', async () => {
    const { payments, gateway } = withFake();
    const first = await payments.createSession(SESSION);
    const second = await payments.createSession(SESSION);
    expect(second).toEqual(first);
    expect(first).toMatchObject({ status: 'SUCCEEDED', amountFils: 12_500, currency: 'JOD' });
    expect(gateway.calls.createCheckout).toBe(1);
  });
  it('creates a new session for a new key', async () => {
    const { payments, gateway } = withFake();
    await payments.createSession(SESSION);
    await payments.createSession({ ...SESSION, idempotencyKey: 'draft-1:attempt-2' });
    expect(gateway.calls.createCheckout).toBe(2);
  });
  it('rejects the same key with a different amount', async () => {
    const { payments } = withFake();
    await payments.createSession(SESSION);
    await expect(payments.createSession({ ...SESSION, amountFils: 1 })).rejects.toMatchObject({
      code: ERROR_CODES.DUPLICATE,
    });
  });
  it.each([
    ['bad key', { idempotencyKey: 'short' }],
    ['zero amount', { amountFils: 0 }],
    ['fractional amount', { amountFils: 1.5 }],
    ['bad reference', { reference: 'has space' }],
    ['other currency', { currency: 'USD' as never }],
    ['bad customer', { customer: { email: 'nope' } }],
    ['unknown customer field', { customer: { nickname: 'x' } as never }],
  ])('validates input: %s', async (_name, patch) => {
    const { payments, gateway } = withFake();
    await expect(payments.createSession({ ...SESSION, ...patch })).rejects.toMatchObject({
      code: ERROR_CODES.VALIDATION_FAILED,
    });
    expect(gateway.calls.createCheckout).toBe(0);
  });
  it('accepts a full customer and the enabled method', async () => {
    const { payments } = withFake({ methods: ['CARD', 'WALLET'] });
    const session = await payments.createSession({
      ...SESSION,
      method: 'WALLET',
      currency: 'JOD',
      customer: {
        email: 'a@b.co',
        givenName: 'A',
        surname: 'B',
        phone: '+962791234567',
        ip: '10.0.0.1',
      },
    });
    expect(session.status).toBe('SUCCEEDED');
  });
  it('refuses a method that is not enabled', async () => {
    const { payments } = withFake();
    await expect(payments.createSession({ ...SESSION, method: 'WALLET' })).rejects.toMatchObject({
      code: ERROR_CODES.METHOD_UNSUPPORTED,
    });
  });
  it('retries transient gateway failures and then succeeds', async () => {
    const { payments, gateway } = withFake();
    gateway.injectFailures(transient(), transient());
    await expect(payments.createSession(SESSION)).resolves.toMatchObject({ status: 'SUCCEEDED' });
  });
  it('gives up after the retry budget and lets the key be reused', async () => {
    const { payments, gateway } = withFake();
    gateway.injectFailures(transient(), transient(), transient());
    await expect(payments.createSession(SESSION)).rejects.toMatchObject({
      code: ERROR_CODES.GATEWAY_UNAVAILABLE,
    });
    await expect(payments.createSession(SESSION)).resolves.toMatchObject({ status: 'SUCCEEDED' });
  });
  it('wraps unexpected adapter errors in a typed non-retryable error', async () => {
    const { payments } = withFake();
    const gateway = new FakeGateway();
    gateway.createCheckout = (): Promise<never> => Promise.reject(new TypeError('boom'));
    const broken = createPayments({ environment: 'dev', provider: 'custom', gateway });
    await expect(broken.createSession(SESSION)).rejects.toMatchObject({
      code: ERROR_CODES.UNKNOWN,
      retryable: false,
    });
    expect(payments).toBeDefined();
  });
  it('reports each scenario', async () => {
    const { payments, gateway } = withFake();
    const statuses: string[] = [];
    for (const scenario of ['fail', 'cancel', 'pending'] as const) {
      gateway.scenarioForNextSession(scenario);
      const session = await payments.createSession({
        ...SESSION,
        idempotencyKey: `draft-1:${scenario}-key`,
      });
      statuses.push(session.status);
    }
    expect(statuses).toEqual(['FAILED', 'CANCELLED', 'PENDING']);
  });
});

describe('verify', () => {
  it('returns the normalized payment', async () => {
    const { payments } = withFake();
    const { sessionId } = await payments.createSession(SESSION);
    await expect(payments.verify(sessionId)).resolves.toMatchObject({
      status: 'SUCCEEDED',
      amountFils: 12_500,
      gatewayCode: '000.100.110',
      paymentId: `fake-payment-${sessionId}`,
    });
  });
  it('validates the id and reports unknown sessions', async () => {
    const { payments } = withFake();
    await expect(payments.verify('bad id!')).rejects.toMatchObject({
      code: ERROR_CODES.VALIDATION_FAILED,
    });
    await expect(payments.verify('nope')).rejects.toMatchObject({
      code: ERROR_CODES.SESSION_NOT_FOUND,
    });
  });
  it('settles a pending session later and retries transient failures', async () => {
    const { payments, gateway } = withFake();
    gateway.scenarioForNextSession('pending');
    const { sessionId } = await payments.createSession(SESSION);
    expect((await payments.verify(sessionId)).status).toBe('PENDING');
    gateway.settle(sessionId, 'success');
    gateway.injectFailures(transient());
    expect((await payments.verify(sessionId)).status).toBe('SUCCEEDED');
  });
  it('logs unknown outcomes loudly', async () => {
    const { logger, lines } = capturingLogger();
    const { payments, gateway } = withFake({ logger });
    const { sessionId } = await payments.createSession(SESSION);
    gateway.fetchPayment = (): Promise<never> =>
      Promise.resolve({
        sessionId,
        status: 'UNKNOWN',
        amountFils: 1,
        gatewayCode: 'x',
        gatewayMessage: 'y',
        raw: { card: { number: '4111111111111111' } },
      } as never);
    await payments.verify(sessionId);
    const warn = lines.find((l) => l.level === 'warn');
    expect(JSON.stringify(warn?.fields)).not.toContain('4111');
  });
});

describe('refund', () => {
  const paid = async (): Promise<ReturnType<typeof withFake> & { sessionId: string }> => {
    const ctx = withFake();
    const { sessionId } = await ctx.payments.createSession(SESSION);
    return { ...ctx, sessionId };
  };
  it('refunds once per key', async () => {
    const { payments, gateway, sessionId } = await paid();
    const request = { idempotencyKey: 'refund-key-1', sessionId, amountFils: 5000 };
    const first = await payments.refund(request);
    const second = await payments.refund(request);
    expect(second).toEqual(first);
    expect(first.status).toBe('REFUNDED');
    expect(gateway.calls.refund).toBe(1);
  });
  it('supports several partial refunds up to the captured amount', async () => {
    const { payments, sessionId } = await paid();
    await payments.refund({ idempotencyKey: 'refund-key-1', sessionId, amountFils: 10_000 });
    await expect(
      payments.refund({ idempotencyKey: 'refund-key-2', sessionId, amountFils: 2_501 }),
    ).rejects.toMatchObject({ code: ERROR_CODES.REFUND_EXCEEDS });
    await expect(
      payments.refund({ idempotencyKey: 'refund-key-3', sessionId, amountFils: 2_500 }),
    ).resolves.toMatchObject({ status: 'REFUNDED' });
  });
  it('is never blindly retried on a transient failure', async () => {
    const { payments, gateway, sessionId } = await paid();
    gateway.injectFailures(transient());
    const request = { idempotencyKey: 'refund-key-1', sessionId, amountFils: 100 };
    await expect(payments.refund(request)).rejects.toMatchObject({ retryable: true });
    expect(gateway.calls.refund).toBe(0);
    await expect(payments.refund(request)).resolves.toMatchObject({ status: 'REFUNDED' });
  });
  it('reports pending and failed refunds and their later settlement', async () => {
    const { payments, gateway, sessionId } = await paid();
    gateway.scenarioForNextRefund('pending');
    const pending = await payments.refund({
      idempotencyKey: 'refund-key-1',
      sessionId,
      amountFils: 100,
    });
    expect(pending.status).toBe('REFUND_PENDING');
    gateway.settleRefund(pending.refundId, 'success');
    expect((await payments.getRefund(pending.refundId)).status).toBe('REFUNDED');
    gateway.scenarioForNextRefund('fail');
    const failed = await payments.refund({
      idempotencyKey: 'refund-key-2',
      sessionId,
      amountFils: 100,
    });
    expect(failed.status).toBe('REFUND_FAILED');
    expect(() => {
      gateway.settleRefund('missing', 'fail');
    }).toThrow(RangeError);
    gateway.scenarioForNextRefund('pending');
    const again = await payments.refund({
      idempotencyKey: 'refund-key-3',
      sessionId,
      amountFils: 100,
    });
    gateway.settleRefund(again.refundId, 'fail');
    expect((await payments.getRefund(again.refundId)).status).toBe('REFUND_FAILED');
  });
  it('only refunds a succeeded payment and validates input', async () => {
    const { payments, gateway } = withFake();
    gateway.scenarioForNextSession('fail');
    const { sessionId } = await payments.createSession(SESSION);
    await expect(
      payments.refund({ idempotencyKey: 'refund-key-1', sessionId, amountFils: 1 }),
    ).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION_FAILED });
    await expect(
      payments.refund({ idempotencyKey: 'x', sessionId, amountFils: 1 }),
    ).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION_FAILED });
    await expect(
      payments.refund({ idempotencyKey: 'refund-key-9', sessionId: 'a b', amountFils: 1 }),
    ).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION_FAILED });
    await expect(
      payments.refund({ idempotencyKey: 'refund-key-9', sessionId, amountFils: -1 }),
    ).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION_FAILED });
  });
  it('getRefund validates and reports unknown refunds', async () => {
    const { payments } = withFake();
    await expect(payments.getRefund('r r')).rejects.toMatchObject({
      code: ERROR_CODES.VALIDATION_FAILED,
    });
    await expect(payments.getRefund('nope')).rejects.toMatchObject({
      code: ERROR_CODES.REFUND_NOT_FOUND,
    });
  });
});

describe('webhooks and cancel', () => {
  const event = {
    sessionId: 'fake-session-1',
    status: 'SUCCEEDED' as const,
    gatewayCode: '000.100.110',
    gatewayMessage: 'ok',
  };
  it('verifies, normalizes and flags replays', async () => {
    const { payments } = withFake();
    const first = await payments.handleWebhook(fakeWebhook(event));
    const second = await payments.handleWebhook(fakeWebhook(event));
    expect(first).toMatchObject({ kind: 'PAYMENT', status: 'SUCCEEDED', replayed: false });
    expect(second).toMatchObject({ eventId: first.eventId, replayed: true });
  });
  it('rejects bad signatures, non-JSON and wrong shapes without caching them', async () => {
    const { payments } = withFake();
    const good = fakeWebhook(event);
    await expect(payments.handleWebhook({ ...good, signature: 'bad' })).rejects.toMatchObject({
      code: ERROR_CODES.WEBHOOK_INVALID,
    });
    await expect(
      payments.handleWebhook({ rawBody: '{', signature: good.signature }),
    ).rejects.toMatchObject({
      code: ERROR_CODES.WEBHOOK_INVALID,
    });
    await expect(
      payments.handleWebhook({ rawBody: '{"a":1}', signature: good.signature }),
    ).rejects.toMatchObject({ code: ERROR_CODES.WEBHOOK_INVALID });
    await expect(payments.handleWebhook(good)).resolves.toMatchObject({ replayed: false });
  });
  it('cancels a pending session', async () => {
    const { payments, gateway } = withFake();
    gateway.scenarioForNextSession('pending');
    const { sessionId } = await payments.createSession(SESSION);
    await payments.cancelSession?.(sessionId);
    expect((await payments.verify(sessionId)).status).toBe('CANCELLED');
    await payments.cancelSession?.(sessionId);
    await expect(payments.cancelSession?.('bad id')).rejects.toMatchObject({
      code: ERROR_CODES.VALIDATION_FAILED,
    });
  });
  it('omits cancel when the adapter cannot and closes cleanly', async () => {
    const fake = new FakeGateway();
    const minimal: PaymentGateway = {
      name: 'minimal',
      capabilities: fake.capabilities,
      createCheckout: (r) => fake.createCheckout(r),
      fetchPayment: (id) => fake.fetchPayment(id),
      refund: (r) => fake.refund(r),
      fetchRefund: (id) => fake.fetchRefund(id),
      parseWebhook: (i) => fake.parseWebhook(i),
    };
    const payments = createPayments({ environment: 'dev', provider: 'custom', gateway: minimal });
    expect(payments.cancelSession).toBeUndefined();
    await expect(payments.close()).resolves.toBeUndefined();
  });
});

describe('factory', () => {
  it('builds the fake provider and refuses unknown adapters and bad configs', () => {
    expect(createPayments({ environment: 'dev', provider: 'fake' }).createSession).toBeDefined();
    expect(() => createPayments({ environment: 'dev', provider: 'custom' })).toThrow(
      'invalid payments options',
    );
    expect(() =>
      createPayments({ environment: 'prod', provider: 'custom', gateway: new FakeGateway() }),
    ).toThrow('invalid payments options');
  });
  it('counts pending refunds against the captured amount and closes the fake', async () => {
    const { payments, gateway } = withFake();
    const { sessionId } = await payments.createSession(SESSION);
    gateway.scenarioForNextRefund('pending');
    await payments.refund({ idempotencyKey: 'refund-key-1', sessionId, amountFils: 12_000 });
    await expect(
      payments.refund({ idempotencyKey: 'refund-key-2', sessionId, amountFils: 501 }),
    ).rejects.toMatchObject({ code: ERROR_CODES.REFUND_EXCEEDS });
    await expect(gateway.close()).resolves.toBeUndefined();
  });
  it('closes the adapter', async () => {
    const gateway = new FakeGateway();
    let closed = false;
    gateway.close = (): Promise<void> => {
      closed = true;
      return Promise.resolve();
    };
    await createPayments({ environment: 'dev', provider: 'custom', gateway }).close();
    expect(closed).toBe(true);
  });
});
