import {
  resolveConfig,
  type HyperPayOptions,
  type PaymentsOptionsBase,
} from '../src/config/options';
import { HYPERPAY_HOSTS } from '../src/constants/hyperpay';
import { DEFAULT_RETRY } from '../src/constants/defaults';
import { ERROR_CODES } from '../src/constants/codes';
import { PaymentSdkError } from '../src/errors';

const KEY = 'ab'.repeat(32);
const base: HyperPayOptions = {
  entityId: 'entity-1',
  accessToken: 'token-1',
  shopperResultUrl: 'https://app.example.com/return',
};
const hyperpay = (extra: Partial<HyperPayOptions> = {}): HyperPayOptions => ({
  ...base,
  webhookDecryptionKey: KEY.toUpperCase(),
  ...extra,
});
const prod = (extra: Partial<HyperPayOptions> = {}): PaymentsOptionsBase => ({
  environment: 'prod',
  provider: 'hyperpay',
  hyperpay: hyperpay(extra),
});
const fieldsOf = (options: PaymentsOptionsBase): unknown => {
  try {
    resolveConfig(options);
  } catch (error) {
    expect(error).toBeInstanceOf(PaymentSdkError);
    expect((error as PaymentSdkError).code).toBe(ERROR_CODES.CONFIG_INVALID);
    return (error as PaymentSdkError).details.fields;
  }
  throw new Error('expected a config error');
};

describe('resolveConfig', () => {
  it('applies defaults for the fake provider in dev', () => {
    const config = resolveConfig({ environment: 'dev', provider: 'fake' });
    expect(config).toMatchObject({ currency: 'JOD', methods: ['CARD'], timeoutMs: 15_000 });
    expect(config.retry).toEqual(DEFAULT_RETRY);
    expect(config.hyperpay).toBeUndefined();
  });
  it('merges overrides', () => {
    const config = resolveConfig({
      environment: 'dev',
      provider: 'fake',
      methods: ['CARD', 'WALLET'],
      timeoutMs: 5,
      retry: { maxAttempts: 1 },
      idempotency: { ttlSec: 60 },
    });
    expect(config).toMatchObject({ methods: ['CARD', 'WALLET'], timeoutMs: 5, ttlSec: 60 });
    expect(config.retry.maxAttempts).toBe(1);
  });
  it('names the bad plain keys only', () => {
    expect(fieldsOf({ environment: 'dev', provider: 'fake', timeoutMs: -1 })).toEqual([
      'timeoutMs',
    ]);
    expect(fieldsOf({ environment: 'x' as never, provider: 'fake' })).toEqual(['environment']);
  });
  it('refuses fake and mock providers in prod', () => {
    expect(fieldsOf({ environment: 'prod', provider: 'fake' })).toEqual([
      'provider (fake and mock-gateway are refused in prod)',
    ]);
    expect(fieldsOf({ environment: 'prod', provider: 'mock-gateway' })).toEqual([
      'provider (fake and mock-gateway are refused in prod)',
    ]);
  });
  it('needs a valid mock gateway url', () => {
    expect(fieldsOf({ environment: 'dev', provider: 'mock-gateway' })).toEqual([
      'mockGateway.baseUrl',
    ]);
    expect(
      resolveConfig({
        environment: 'dev',
        provider: 'mock-gateway',
        mockGateway: { baseUrl: 'http://localhost:4010' },
      }).options.provider,
    ).toBe('mock-gateway');
  });
});

describe('resolveConfig hyperpay', () => {
  it('uses the test host in dev and the live host in prod', () => {
    const dev = resolveConfig({
      environment: 'dev',
      provider: 'hyperpay',
      hyperpay: hyperpay(),
    }).hyperpay;
    expect(dev).toMatchObject({
      baseUrl: HYPERPAY_HOSTS.dev,
      paymentType: 'DB',
      amountDecimals: 3,
      integrity: true,
      brands: { CARD: 'VISA MASTER' },
    });
    expect(resolveConfig(prod()).hyperpay?.baseUrl).toBe(HYPERPAY_HOSTS.prod);
  });
  it('normalises the key, trailing slashes and keeps optional settings', () => {
    const resolved = resolveConfig({
      environment: 'dev',
      provider: 'hyperpay',
      hyperpay: hyperpay({
        baseUrl: 'http://localhost:4010///',
        testMode: 'EXTERNAL',
        paymentType: 'PA',
        amountDecimals: 2,
        integrity: false,
        brands: { CARD: 'MADA' },
      }),
    }).hyperpay;
    expect(resolved).toMatchObject({
      baseUrl: 'http://localhost:4010',
      webhookDecryptionKey: KEY,
      testMode: 'EXTERNAL',
      paymentType: 'PA',
      amountDecimals: 2,
      integrity: false,
      brands: { CARD: 'MADA' },
    });
  });
  it('allows dev without a webhook key', () => {
    const config = resolveConfig({ environment: 'dev', provider: 'hyperpay', hyperpay: base });
    expect(config.hyperpay?.webhookDecryptionKey).toBeUndefined();
  });
  it('requires the hyperpay block and valid fields', () => {
    expect(fieldsOf({ environment: 'dev', provider: 'hyperpay' })).toEqual(['hyperpay']);
    expect(
      fieldsOf({
        environment: 'dev',
        provider: 'hyperpay',
        hyperpay: hyperpay({ entityId: '', webhookDecryptionKey: 'zz' }),
      }),
    ).toEqual(['hyperpay.entityId', 'hyperpay.webhookDecryptionKey']);
  });
  it('enforces the strict production rules', () => {
    expect(fieldsOf(prod({ baseUrl: 'http://pay.example.com' }))).toEqual([
      'hyperpay.baseUrl (https is required in prod)',
    ]);
    expect(fieldsOf(prod({ baseUrl: HYPERPAY_HOSTS.dev }))).toEqual([
      'hyperpay.baseUrl (a sandbox host is refused in prod)',
    ]);
    expect(fieldsOf(prod({ testMode: 'EXTERNAL' }))).toEqual([
      'hyperpay.testMode (not allowed in prod)',
    ]);
    expect(fieldsOf({ environment: 'prod', provider: 'hyperpay', hyperpay: base })).toEqual([
      'hyperpay.webhookDecryptionKey (required in prod)',
    ]);
    expect(fieldsOf(prod({ shopperResultUrl: 'http://x.example.com/r' }))).toEqual([
      'hyperpay.shopperResultUrl (http is refused in prod)',
    ]);
  });
  it('accepts a custom app scheme as the return url in prod', () => {
    expect(
      resolveConfig(prod({ shopperResultUrl: 'wab://payment/result' })).hyperpay,
    ).toBeDefined();
  });
});
