import { createPayments, ERROR_CODES, PaymentSdkError, type PaymentProvider } from '../src';
import { MemorySessionDirectory, RedisSessionDirectory } from '../src/directory';
import type { RedisLike } from '../src/idempotency';
import { refundReference } from '../src/hyperpay/refunds';
import { startMockGateway, type MockGateway } from '../src/mock-gateway';
import { SESSION } from './helpers';
import { ENTITY, TOKEN, hyperpayPayments, paymentBody, reply, scripted } from './hyperpayHelpers';

const REFUND_REQ = { idempotencyKey: 'refund-key-1', sessionId: 'chk-1', amountFils: 5000 };
const rfBody = (over: Record<string, unknown> = {}): Record<string, unknown> =>
  paymentBody({
    id: 'rf-1',
    paymentType: 'RF',
    referencedId: 'pay-1',
    amount: '5.000',
    merchantTransactionId: 'RF:refund-key-1',
    ...over,
  });
const NOT_FOUND = reply(404, {
  result: { code: '700.400.580', description: 'cannot find transaction' },
});

const codeOf = async (run: () => Promise<unknown>): Promise<string | undefined> => {
  try {
    await run();
  } catch (error) {
    return error instanceof PaymentSdkError ? error.code : 'other';
  }
  return undefined;
};

describe('refund (HyperPay, scripted)', () => {
  it('looks for an earlier refund, resolves the payment, posts RF and normalizes', async () => {
    const { http, requests } = scripted(
      () => NOT_FOUND,
      () => reply(200, paymentBody()),
      () => reply(200, rfBody()),
    );
    const payments = hyperpayPayments(http);
    const result = await payments.refund(REFUND_REQ);
    expect(requests.map((r) => `${r.method} ${new URL(r.url).pathname}`)).toEqual([
      'GET /v1/query',
      'GET /v1/checkouts/chk-1/payment',
      'POST /v1/payments/pay-1',
    ]);
    expect(new URL(requests[0]?.url ?? '').searchParams.get('merchantTransactionId')).toBe(
      refundReference('refund-key-1'),
    );
    expect(Object.fromEntries(new URLSearchParams(requests[2]?.body))).toEqual({
      entityId: ENTITY,
      amount: '5.000',
      currency: 'JOD',
      paymentType: 'RF',
      merchantTransactionId: 'RF:refund-key-1',
    });
    expect(result).toMatchObject({
      refundId: 'rf-1',
      sessionId: 'chk-1',
      status: 'REFUNDED',
      amountFils: 5000,
      gatewayCode: '000.100.110',
    });
  });
  it('uses the directory when the checkout is no longer queryable', async () => {
    const directory = new MemorySessionDirectory();
    await directory.put('chk-1', { paymentId: 'pay-9' });
    const { http, requests } = scripted(
      () => NOT_FOUND,
      () => reply(200, rfBody()),
    );
    await hyperpayPayments(http, { directory }).refund(REFUND_REQ);
    expect(new URL(requests[1]?.url ?? '').pathname).toBe('/v1/payments/pay-9');
  });
  it('remembers captured payments seen by verify', async () => {
    const directory = new MemorySessionDirectory();
    const { http } = scripted(() => reply(200, paymentBody()));
    await hyperpayPayments(http, { directory }).verify('chk-1');
    await expect(directory.get('chk-1')).resolves.toEqual({
      paymentId: 'pay-1',
      reference: 'draft-1',
    });
    await expect(directory.sessionOf('pay-1')).resolves.toBe('chk-1');
  });
  it('returns an earlier refund made with the same key instead of refunding again', async () => {
    const { http, requests } = scripted(() =>
      reply(200, {
        result: { code: '000.000.000', description: 'ok' },
        records: [paymentBody({ paymentType: 'DB' }), rfBody()],
      }),
    );
    const result = await hyperpayPayments(http).refund(REFUND_REQ);
    expect(result).toMatchObject({ refundId: 'rf-1', status: 'REFUNDED', sessionId: 'chk-1' });
    expect(requests).toHaveLength(1);
  });
  it('ignores query answers without refunds and keeps going', async () => {
    for (const first of [
      reply(200, {
        result: { code: '000.000.000', description: '' },
        records: [paymentBody({ paymentType: 'DB' })],
      }),
      reply(200, { result: { code: '000.000.000', description: '' } }),
      reply(200, { result: { code: '000.000.000', description: '' }, records: [{ junk: true }] }),
    ]) {
      const { http, requests } = scripted(
        () => first,
        () => reply(200, paymentBody()),
        () => reply(200, rfBody()),
      );
      await expect(hyperpayPayments(http).refund(REFUND_REQ)).resolves.toMatchObject({
        status: 'REFUNDED',
      });
      expect(requests).toHaveLength(3);
    }
  });
  it.each([
    ['700.400.200', ERROR_CODES.REFUND_EXCEEDS],
    ['700.400.700', ERROR_CODES.VALIDATION_FAILED],
    ['700.400.580', ERROR_CODES.SESSION_NOT_FOUND],
    ['800.900.300', ERROR_CODES.AUTH_FAILED],
  ])('maps refund result %s', async (code, expected) => {
    const { http } = scripted(
      () => NOT_FOUND,
      () => reply(200, paymentBody()),
      () => reply(200, { result: { code, description: 'd' } }),
    );
    expect(await codeOf(() => hyperpayPayments(http).refund(REFUND_REQ))).toBe(expected);
  });
  it.each([
    ['000.200.000', 'REFUND_PENDING'],
    ['000.400.000', 'REFUND_PENDING'],
    ['800.100.100', 'REFUND_FAILED'],
    ['900.100.100', 'REFUND_FAILED'],
    ['123.456.789', 'UNKNOWN'],
  ])('normalizes refund result %s to %s', async (code, status) => {
    const { http } = scripted(
      () => NOT_FOUND,
      () => reply(200, paymentBody()),
      () => reply(200, rfBody({ result: { code, description: 'd' } })),
    );
    await expect(hyperpayPayments(http).refund(REFUND_REQ)).resolves.toMatchObject({
      status,
      gatewayCode: code,
    });
  });
  it('only refunds a succeeded payment', async () => {
    const { http, requests } = scripted(
      () => NOT_FOUND,
      () => reply(200, paymentBody({ result: { code: '800.100.151', description: 'declined' } })),
    );
    expect(await codeOf(() => hyperpayPayments(http).refund(REFUND_REQ))).toBe(
      ERROR_CODES.VALIDATION_FAILED,
    );
    expect(requests).toHaveLength(2);
  });
  it('fails loudly if the lookup cannot be done (never risks a double refund)', async () => {
    const { http, requests } = scripted(() => reply(503, ''));
    expect(await codeOf(() => hyperpayPayments(http).refund(REFUND_REQ))).toBe(
      ERROR_CODES.GATEWAY_UNAVAILABLE,
    );
    expect(requests.every((r) => new URL(r.url).pathname === '/v1/query')).toBe(true);
  });
  it('falls back to the reference or "unknown" when the gateway omits ids', async () => {
    const { http } = scripted(
      () => NOT_FOUND,
      () => reply(200, paymentBody()),
      () => reply(200, { result: { code: '800.100.100', description: 'no' } }),
    );
    await expect(hyperpayPayments(http).refund(REFUND_REQ)).resolves.toMatchObject({
      refundId: 'RF:refund-key-1',
      amountFils: 0,
    });
    const refundWithoutRef = scripted(() =>
      reply(200, {
        result: { code: '000.100.110', description: 'ok' },
        id: 'rf-2',
        amount: '1.000',
      }),
    );
    const payments = hyperpayPayments(refundWithoutRef.http);
    await expect(payments.getRefund('rf-2')).rejects.toMatchObject({
      code: ERROR_CODES.REFUND_NOT_FOUND,
    });
  });
});

describe('getRefund (HyperPay, scripted)', () => {
  it('reads a refund and resolves its checkout through the directory', async () => {
    const directory = new MemorySessionDirectory();
    await directory.put('chk-1', { paymentId: 'pay-1' });
    const { http, requests } = scripted(() =>
      reply(200, rfBody({ result: { code: '000.200.000', description: 'pending' } })),
    );
    const result = await hyperpayPayments(http, { directory }).getRefund('rf-1');
    expect(new URL(requests[0]?.url ?? '').pathname).toBe('/v1/payments/rf-1');
    expect(result).toMatchObject({
      refundId: 'rf-1',
      sessionId: 'chk-1',
      status: 'REFUND_PENDING',
    });
  });
  it('uses the referenced payment id when the directory does not know it', async () => {
    const { http } = scripted(() => reply(200, rfBody()));
    await expect(hyperpayPayments(http).getRefund('rf-1')).resolves.toMatchObject({
      sessionId: 'pay-1',
    });
    const bare = scripted(() => reply(200, rfBody({ referencedId: undefined })));
    await expect(hyperpayPayments(bare.http).getRefund('rf-1')).resolves.toMatchObject({
      sessionId: 'unknown',
    });
  });
  it('maps unknown and non-refund objects to REFUND_NOT_FOUND', async () => {
    expect(
      await codeOf(() => hyperpayPayments(scripted(() => NOT_FOUND).http).getRefund('rf-x')),
    ).toBe(ERROR_CODES.REFUND_NOT_FOUND);
    expect(
      await codeOf(() =>
        hyperpayPayments(scripted(() => reply(200, paymentBody())).http).getRefund('pay-1'),
      ),
    ).toBe(ERROR_CODES.REFUND_NOT_FOUND);
  });
});

class MapRedis implements RedisLike {
  readonly data = new Map<string, string>();
  get(key: string): Promise<string | null> {
    return Promise.resolve(this.data.get(key) ?? null);
  }
  set(key: string, value: string): Promise<string | null> {
    this.data.set(key, value);
    return Promise.resolve('OK');
  }
  del(key: string): Promise<number> {
    return Promise.resolve(this.data.delete(key) ? 1 : 0);
  }
}

describe('RedisSessionDirectory', () => {
  it('stores both directions and survives corrupt records', async () => {
    const redis = new MapRedis();
    const directory = new RedisSessionDirectory(redis, 60, 'd:');
    await directory.put('s1', { paymentId: 'p1', reference: 'r1' });
    await directory.put('s2', { paymentId: 'p2' });
    await expect(directory.get('s1')).resolves.toEqual({ paymentId: 'p1', reference: 'r1' });
    await expect(directory.get('s2')).resolves.toEqual({ paymentId: 'p2' });
    await expect(directory.sessionOf('p1')).resolves.toBe('s1');
    await expect(directory.get('nope')).resolves.toBeUndefined();
    await expect(directory.sessionOf('nope')).resolves.toBeUndefined();
    redis.data.set('d:session:bad', '{not json');
    redis.data.set('d:session:odd', JSON.stringify({ x: 1 }));
    await expect(directory.get('bad')).resolves.toBeUndefined();
    await expect(directory.get('odd')).resolves.toBeUndefined();
  });
  it('uses default ttl and prefix', async () => {
    const redis = new MapRedis();
    await new RedisSessionDirectory(redis).put('s', { paymentId: 'p' });
    expect([...redis.data.keys()]).toEqual([
      'wab:payments:dir:session:s',
      'wab:payments:dir:payment:p',
    ]);
  });
});

describe('refund against the OPP mock', () => {
  let mock: MockGateway;
  let payments: PaymentProvider;
  beforeEach(async () => {
    mock = await startMockGateway({ entityId: ENTITY, accessToken: TOKEN });
    payments = createPayments({
      environment: 'dev',
      provider: 'mock-gateway',
      mockGateway: {
        baseUrl: mock.url,
        entityId: ENTITY,
        accessToken: TOKEN,
        shopperResultUrl: 'wab://r',
      },
    });
  });
  afterEach(async () => {
    await payments.close();
    await mock.close();
  });

  it('refunds partially, never beyond the captured amount, once per key', async () => {
    const session = await payments.createSession(SESSION);
    await mock.settle(session.sessionId, 'success');
    expect((await payments.verify(session.sessionId)).status).toBe('SUCCEEDED');
    const first = await payments.refund({
      idempotencyKey: 'refund-key-1',
      sessionId: session.sessionId,
      amountFils: 10_000,
    });
    expect(first).toMatchObject({
      status: 'REFUNDED',
      amountFils: 10_000,
      sessionId: session.sessionId,
    });
    expect(
      await codeOf(() =>
        payments.refund({
          idempotencyKey: 'refund-key-2',
          sessionId: session.sessionId,
          amountFils: 2_501,
        }),
      ),
    ).toBe(ERROR_CODES.REFUND_EXCEEDS);
    expect((await payments.getRefund(first.refundId)).status).toBe('REFUNDED');
    // Same key from a fresh process (empty idempotency store): the gateway is asked and answers with the first refund.
    const restarted = createPayments({
      environment: 'dev',
      provider: 'mock-gateway',
      mockGateway: {
        baseUrl: mock.url,
        entityId: ENTITY,
        accessToken: TOKEN,
        shopperResultUrl: 'wab://r',
      },
    });
    const again = await restarted.refund({
      idempotencyKey: 'refund-key-1',
      sessionId: session.sessionId,
      amountFils: 10_000,
    });
    expect(again.refundId).toBe(first.refundId);
    expect([...mock.state.payments.values()].filter((p) => p.paymentType === 'RF')).toHaveLength(1);
  });
  it('refuses to refund an uncaptured payment', async () => {
    const session = await payments.createSession(SESSION);
    expect(
      await codeOf(() =>
        payments.refund({
          idempotencyKey: 'refund-key-1',
          sessionId: session.sessionId,
          amountFils: 1,
        }),
      ),
    ).toBe(ERROR_CODES.VALIDATION_FAILED);
  });
});
