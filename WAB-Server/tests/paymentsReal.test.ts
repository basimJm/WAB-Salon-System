import type { Redis } from 'ioredis';
import {
  ERROR_CODES as SDK_ERRORS,
  PaymentSdkError,
  type PaymentProvider as SdkProvider,
  type PaymentsOptions,
} from '@wab/payments';
import { startMockGateway, type MockGateway } from '@wab/payments/mock-gateway';
import type { PaymentSettings } from '../src/config';
import { ERROR_CODES } from '../src/constants/errorCodes';
import { createProviders, ProviderUnavailableError } from '../src/providers';
import {
  buildSdkOptions,
  createRealPayments,
  mapSdkError,
  toPaymentStatus,
  toRefundStatus,
} from '../src/providers/payments/real';
import {
  BaseError,
  ExternalServiceError,
  PaymentError,
  UnauthorizedError,
} from '../src/utils/errors';
import { connectRedis, disconnectRedis } from '../src/utils/redis/client';
import { createLogger } from '../src/utils/logger';
import { startTestRedis, type TestRedis } from './helpers/redis';

const logger = createLogger({ level: 'silent' });
const KEY = 'cd'.repeat(32);
const SETTINGS: PaymentSettings = {
  gateway: 'hyperpay',
  entityId: 'entity-test',
  accessToken: 'access-test-value',
  returnUrl: 'wab://payment/result',
  webhookKey: KEY,
};
const REQUEST = { idempotencyKey: 'draft-1:1', amountFils: 12_500, reference: 'draft-1' } as const;

let testRedis: TestRedis;
let redis: Redis;
beforeAll(async () => {
  testRedis = await startTestRedis();
  redis = await connectRedis({ redis: { url: testRedis.url } }, logger);
});
afterAll(async () => {
  await disconnectRedis(redis);
  await testRedis.stop();
});
beforeEach(async () => {
  await redis.flushdb();
});

const sdkError = (code: string, retryable = false): PaymentSdkError =>
  new PaymentSdkError(code as never, 'x', { retryable });
const failing = (error: unknown): SdkProvider =>
  new Proxy({} as SdkProvider, {
    get: () => (): Promise<never> =>
      Promise.reject(error instanceof Error ? error : new Error('boom')),
  });

describe('status normalization', () => {
  it('never lets an unknown outcome look like success', () => {
    expect(toPaymentStatus('UNKNOWN')).toBe('PENDING');
    expect(toPaymentStatus('SUCCEEDED')).toBe('SUCCEEDED');
    expect(toPaymentStatus('CANCELLED')).toBe('CANCELLED');
    expect(toRefundStatus('UNKNOWN')).toBe('REFUND_PENDING');
    expect(toRefundStatus('REFUNDED')).toBe('REFUNDED');
  });
});

describe('buildSdkOptions', () => {
  const deps = { redis, logger, isProduction: false };

  it('maps HyperPay settings and wires shared Redis stores', () => {
    const options = buildSdkOptions(
      { ...SETTINGS, baseUrl: 'https://pay.example.test', testMode: 'EXTERNAL' },
      deps,
    );
    expect(options).toMatchObject({
      environment: 'dev',
      provider: 'hyperpay',
      hyperpay: {
        entityId: 'entity-test',
        accessToken: 'access-test-value',
        shopperResultUrl: 'wab://payment/result',
        baseUrl: 'https://pay.example.test',
        testMode: 'EXTERNAL',
        webhookDecryptionKey: KEY,
      },
    });
    expect(options.idempotency?.store).toBeDefined();
    expect(options.directory).toBeDefined();
  });

  it('omits optional settings and uses prod mode in production', () => {
    const options = buildSdkOptions({ ...SETTINGS, webhookKey: undefined } as never, {
      ...deps,
      isProduction: true,
    });
    expect(options.environment).toBe('prod');
    expect(options.hyperpay).not.toHaveProperty('baseUrl');
    expect(options.hyperpay).not.toHaveProperty('testMode');
    expect(options.hyperpay).not.toHaveProperty('webhookDecryptionKey');
  });

  it('maps the mock gateway', () => {
    const options = buildSdkOptions(
      { ...SETTINGS, gateway: 'mock-gateway', baseUrl: 'http://localhost:4010' },
      deps,
    );
    expect(options).toMatchObject({
      provider: 'mock-gateway',
      mockGateway: { baseUrl: 'http://localhost:4010', webhookDecryptionKey: KEY },
    });
    const noUrl = buildSdkOptions({ ...SETTINGS, gateway: 'mock-gateway' }, deps);
    expect(noUrl.mockGateway?.baseUrl).toBe('');
  });
});

describe('createRealPayments (stubbed SDK)', () => {
  const sdk = (
    over: Partial<SdkProvider>,
  ): { provider: ReturnType<typeof create>; seen: PaymentsOptions[] } => {
    const seen: PaymentsOptions[] = [];
    const base = {
      capabilities: {
        partialRefunds: true,
        splitPayments: false,
        webhooks: true,
        cancelSession: false,
      },
      close: () => Promise.resolve(),
      ...over,
    } as SdkProvider;
    const provider = create(() => base, seen);
    return { provider, seen };
  };
  const create = (
    build: () => SdkProvider,
    seen: PaymentsOptions[] = [],
  ): ReturnType<typeof createRealPayments> =>
    createRealPayments({
      settings: SETTINGS,
      redis,
      logger,
      isProduction: false,
      build: (options) => {
        seen.push(options);
        return build();
      },
    });
  const client = {
    provider: 'hyperpay',
    environment: 'dev',
    checkoutId: 'chk-1',
    brands: ['VISA'],
    shopperResultUrl: 'wab://r',
  } as const;

  it('creates sessions with only the fields the port knows and maps the client block', async () => {
    const calls: unknown[] = [];
    const { provider, seen } = sdk({
      createSession: (request) => {
        calls.push(request);
        return Promise.resolve({
          sessionId: 'chk-1',
          status: 'UNKNOWN',
          amountFils: 12_500,
          currency: 'JOD',
          reference: 'draft-1',
          client: { ...client, widgetScriptUrl: 'https://w' },
        });
      },
    });
    const session = await provider.createSession(REQUEST);
    expect(calls).toEqual([REQUEST]);
    expect(session).toEqual({
      sessionId: 'chk-1',
      status: 'PENDING',
      amountFils: 12_500,
      reference: 'draft-1',
      client: { ...client, widgetScriptUrl: 'https://w' },
    });
    expect(seen).toHaveLength(1);
  });

  it('verifies with and without a gateway fee', async () => {
    const result = {
      sessionId: 'chk-1',
      status: 'SUCCEEDED',
      amountFils: 1,
      gatewayCode: '000.100.110',
      gatewayMessage: 'ok',
      raw: {},
    } as const;
    const { provider } = sdk({ verify: () => Promise.resolve({ ...result, feeFils: 25 }) });
    await expect(provider.verify('chk-1')).resolves.toEqual({
      sessionId: 'chk-1',
      status: 'SUCCEEDED',
      amountFils: 1,
      gatewayCode: '000.100.110',
      gatewayMessage: 'ok',
      feeFils: 25,
    });
    const noFee = sdk({ verify: () => Promise.resolve(result) }).provider;
    expect(await noFee.verify('chk-1')).not.toHaveProperty('feeFils');
  });

  it('maps refunds, refund status lookups, webhooks and the checkout rebuild', async () => {
    const refund = {
      refundId: 'rf-1',
      sessionId: 'chk-1',
      status: 'UNKNOWN',
      amountFils: 5,
      gatewayCode: 'c',
      gatewayMessage: 'm',
      raw: {},
    } as const;
    const received: unknown[] = [];
    const { provider } = sdk({
      refund: () => Promise.resolve(refund),
      getRefund: () => Promise.resolve({ ...refund, status: 'REFUNDED' }),
      handleWebhook: (input) => {
        received.push(input);
        return Promise.resolve({
          kind: 'PAYMENT',
          replayed: true,
          sessionId: 'chk-1',
          status: 'UNKNOWN',
          gatewayCode: 'c',
          gatewayMessage: 'm',
          eventId: 'e',
        });
      },
      clientCheckout: () => client,
    });
    expect(
      (await provider.refund({ idempotencyKey: 'refund-1', sessionId: 'chk-1', amountFils: 5 }))
        .status,
    ).toBe('REFUND_PENDING');
    expect((await provider.getRefund('rf-1')).status).toBe('REFUNDED');
    const event = await provider.handleWebhook({
      rawBody: 'b',
      signature: 's',
      headers: { h: 'v' },
    });
    expect(event).toEqual({
      kind: 'PAYMENT',
      replayed: true,
      sessionId: 'chk-1',
      status: 'PENDING',
      gatewayCode: 'c',
      gatewayMessage: 'm',
    });
    await provider.handleWebhook({ rawBody: 'b', signature: 's' });
    expect(received).toEqual([
      { rawBody: 'b', signature: 's', headers: { h: 'v' } },
      { rawBody: 'b', signature: 's' },
    ]);
    expect(provider.clientCheckout?.('chk-1')).toEqual(client);
  });

  it('closes the SDK', async () => {
    let closed = false;
    const { provider } = sdk({
      close: () => {
        closed = true;
        return Promise.resolve();
      },
    });
    await provider.close();
    expect(closed).toBe(true);
  });

  it('turns SDK errors into typed server errors on every call', async () => {
    const provider = create(() => failing(sdkError(SDK_ERRORS.AUTH_FAILED)));
    await expect(provider.createSession(REQUEST)).rejects.toBeInstanceOf(ExternalServiceError);
    await expect(provider.verify('x')).rejects.toBeInstanceOf(ExternalServiceError);
    await expect(
      provider.refund({ idempotencyKey: 'refund-1', sessionId: 'x', amountFils: 1 }),
    ).rejects.toBeInstanceOf(ExternalServiceError);
    await expect(provider.getRefund('x')).rejects.toBeInstanceOf(ExternalServiceError);
    await expect(provider.handleWebhook({ rawBody: 'b', signature: 's' })).rejects.toBeInstanceOf(
      ExternalServiceError,
    );
  });
});

describe('mapSdkError', () => {
  const thrown = (
    error: unknown,
    operation: 'session' | 'verify' | 'refund' | 'webhook',
  ): unknown => {
    try {
      mapSdkError(error, operation);
    } catch (caught) {
      return caught;
    }
    return undefined;
  };

  it('rethrows foreign errors untouched', () => {
    const foreign = new Error('x');
    expect(thrown(foreign, 'verify')).toBe(foreign);
  });
  it('maps webhook failures to 401 and refund conditions to PaymentError', () => {
    expect(thrown(sdkError(SDK_ERRORS.WEBHOOK_INVALID), 'webhook')).toBeInstanceOf(
      UnauthorizedError,
    );
    expect(thrown(sdkError(SDK_ERRORS.REFUND_EXCEEDS), 'refund')).toBeInstanceOf(PaymentError);
    const notCaptured = thrown(sdkError(SDK_ERRORS.VALIDATION_FAILED), 'refund');
    expect(notCaptured).toBeInstanceOf(PaymentError);
    expect((notCaptured as BaseError).code).toBe(ERROR_CODES.PAYMENT_NOT_VERIFIED);
  });
  it.each([
    SDK_ERRORS.CONFIG_INVALID,
    SDK_ERRORS.VALIDATION_FAILED,
    SDK_ERRORS.METHOD_UNSUPPORTED,
    SDK_ERRORS.FEATURE_UNSUPPORTED,
    SDK_ERRORS.DUPLICATE,
  ])('treats %s as a caller bug', (code) => {
    expect(thrown(sdkError(code), 'session')).toBeInstanceOf(RangeError);
  });
  it('maps gateway failures to 502 or 503 by retryability', () => {
    const outage = thrown(
      sdkError(SDK_ERRORS.GATEWAY_UNAVAILABLE, true),
      'verify',
    ) as ExternalServiceError;
    const rejected = thrown(sdkError(SDK_ERRORS.AUTH_FAILED), 'verify') as ExternalServiceError;
    const busy = thrown(
      sdkError(SDK_ERRORS.DUPLICATE_IN_PROGRESS),
      'session',
    ) as ExternalServiceError;
    expect(outage.httpStatus).toBe(503);
    expect(rejected.httpStatus).toBe(502);
    expect(busy.httpStatus).toBe(503);
  });
});

describe('createProviders payments wiring', () => {
  const config = (payment?: PaymentSettings): never =>
    ({ payment, otp: undefined, notifier: undefined }) as never;
  const modes = {
    otp: 'fake',
    storage: 'fake',
    notifier: 'fake',
    payments: 'real',
    analytics: 'fake',
  } as const;

  it('builds the real provider from the config and closes it', async () => {
    const providers = createProviders(modes, false, { redis, logger, config: config(SETTINGS) });
    expect(providers.payments.clientCheckout?.('chk-9')).toMatchObject({
      provider: 'hyperpay',
      checkoutId: 'chk-9',
    });
    await providers.close();
  });
  it('fails loudly without settings or runtime dependencies', () => {
    expect(() => createProviders(modes, false, { redis, logger, config: config() })).toThrow(
      ProviderUnavailableError,
    );
    expect(() => createProviders(modes, false)).toThrow(ProviderUnavailableError);
  });
  it('refuses the fake in production', () => {
    expect(() => createProviders({ ...modes, payments: 'fake' }, true)).toThrow(
      ProviderUnavailableError,
    );
  });
});

describe('real SDK against the local OPP mock', () => {
  let mock: MockGateway;
  beforeEach(async () => {
    mock = await startMockGateway({
      entityId: SETTINGS.entityId,
      accessToken: SETTINGS.accessToken,
    });
  });
  afterEach(async () => {
    await mock.close();
  });

  it('creates, verifies and refunds, and never charges twice for one key', async () => {
    const provider = createRealPayments({
      settings: { ...SETTINGS, gateway: 'mock-gateway', baseUrl: mock.url },
      redis,
      logger,
      isProduction: false,
    });
    const session = await provider.createSession(REQUEST);
    const again = await provider.createSession(REQUEST);
    expect(again.sessionId).toBe(session.sessionId);
    expect(mock.state.checkouts.size).toBe(1);
    expect(session.client?.checkoutUrl).toBe(
      `${mock.url}/checkout/${encodeURIComponent(session.sessionId)}`,
    );
    expect((await provider.verify(session.sessionId)).status).toBe('PENDING');
    await mock.settle(session.sessionId, 'success');
    expect(await provider.verify(session.sessionId)).toMatchObject({
      status: 'SUCCEEDED',
      amountFils: 12_500,
    });
    const refund = await provider.refund({
      idempotencyKey: 'refund-key-1',
      sessionId: session.sessionId,
      amountFils: 5_000,
    });
    expect(refund).toMatchObject({ status: 'REFUNDED', amountFils: 5_000 });
    await expect(
      provider.refund({
        idempotencyKey: 'refund-key-2',
        sessionId: session.sessionId,
        amountFils: 7_501,
      }),
    ).rejects.toBeInstanceOf(PaymentError);
    await provider.close();
  });
});
