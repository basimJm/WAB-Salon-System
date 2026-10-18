import {
  resolveConfig,
  smtpDefaults,
  timeoutDefaults,
  type NotifierOptions,
} from '../src/config/options';
import { ERROR_CODES } from '../src/constants/codes';
import { MemoryIdempotencyStore } from '../src/idempotency';
import { FAKE_ACCOUNT, scriptedMessaging } from './helpers';

const smtp = { host: 'localhost', port: 1025 };
const from = { name: 'WAB', address: 'no-reply@example.com' };
const dev = (overrides: Partial<NotifierOptions> = {}): NotifierOptions => ({
  environment: 'dev',
  push: { provider: 'fake' },
  email: { provider: 'fake' },
  ...overrides,
});
const prod = (overrides: Partial<NotifierOptions> = {}): NotifierOptions => ({
  environment: 'prod',
  push: {
    provider: 'fcm',
    credentials: FAKE_ACCOUNT,
    messaging: () => Promise.resolve(scriptedMessaging([])),
  },
  email: { provider: 'smtp', from, smtp: { host: 'smtp.example.com', user: 'u', pass: 'p' } },
  idempotency: { store: new MemoryIdempotencyStore() },
  ...overrides,
});
const fieldsOf = (options: NotifierOptions): string[] => {
  try {
    resolveConfig(options);
  } catch (error) {
    const failure = error as { code: string; details: { fields: string[] } };
    expect(failure.code).toBe(ERROR_CODES.CONFIG_INVALID);
    return failure.details.fields;
  }
  throw new Error('expected a configuration error');
};

describe('resolveConfig — defaults', () => {
  it('fills retry, limits and ttl from the defaults', () => {
    const config = resolveConfig(dev());
    expect(config.retry).toEqual({
      maxAttempts: 3,
      baseDelayMs: 200,
      maxDelayMs: 5000,
      jitterRatio: 0.2,
    });
    expect(config.limits).toMatchObject({ maxTokens: 500, batchSize: 500, maxEmailRecipients: 50 });
    expect(config.ttlSec).toBe(86_400);
    expect(config.fcmCredentials).toBeUndefined();
  });
  it('lets the consumer override them', () => {
    const config = resolveConfig(
      dev({
        retry: { maxAttempts: 5 },
        limits: { maxTokens: 10, batchSize: 5 },
        idempotency: { ttlSec: 60 },
      }),
    );
    expect(config.retry.maxAttempts).toBe(5);
    expect(config.retry.baseDelayMs).toBe(200);
    expect(config.limits).toMatchObject({ maxTokens: 10, batchSize: 5 });
    expect(config.ttlSec).toBe(60);
  });
  it('exposes the transport defaults', () => {
    expect(smtpDefaults.port).toBe(587);
    expect(timeoutDefaults.fcmMs).toBeGreaterThan(0);
  });
});

describe('resolveConfig — validation', () => {
  it.each([
    [dev({ retry: { maxAttempts: 0 } }), 'retry.maxAttempts'],
    [dev({ retry: { jitterRatio: 2 } }), 'retry.jitterRatio'],
    [dev({ limits: { batchSize: 501 } }), 'limits.batchSize'],
    [dev({ idempotency: { ttlSec: -1 } }), 'ttlSec'],
    [{ ...dev(), environment: 'staging' as never }, 'environment'],
  ])('rejects bad plain options (%#)', (options, field) => {
    expect(fieldsOf(options)).toEqual([field]);
  });

  it('parses and checks the FCM credentials', () => {
    const config = resolveConfig(
      dev({ push: { provider: 'fcm', credentials: JSON.stringify(FAKE_ACCOUNT) } }),
    );
    expect(config.fcmCredentials?.project_id).toBe('wab-test');
    expect(() => resolveConfig(dev({ push: { provider: 'fcm', credentials: '{}' } }))).toThrow(
      'service account is invalid',
    );
  });

  it('catches a dev/prod key mix-up through projectId', () => {
    expect(() =>
      resolveConfig(
        dev({ push: { provider: 'fcm', credentials: FAKE_ACCOUNT, projectId: 'wab-test' } }),
      ),
    ).not.toThrow();
    expect(
      fieldsOf(
        dev({ push: { provider: 'fcm', credentials: FAKE_ACCOUNT, projectId: 'wab-prod' } }),
      ),
    ).toEqual(['push.projectId (does not match the service account project)']);
  });

  it('validates the SMTP sender and server', () => {
    expect(
      fieldsOf(dev({ email: { provider: 'smtp', from: { name: '', address: 'x' }, smtp } })),
    ).toEqual(['email.from']);
    expect(fieldsOf(dev({ email: { provider: 'smtp', from, smtp: { host: '' } } }))).toEqual([
      'email.smtp',
    ]);
    expect(
      fieldsOf(dev({ email: { provider: 'smtp', from, smtp: { host: 'h', port: 70_000 } } })),
    ).toEqual(['email.smtp']);
    expect(() => resolveConfig(dev({ email: { provider: 'smtp', from, smtp } }))).not.toThrow();
  });
});

describe('resolveConfig — prod rules', () => {
  it('accepts a complete prod configuration', () => {
    expect(() => resolveConfig(prod())).not.toThrow();
  });
  it('refuses fake adapters', () => {
    expect(fieldsOf(prod({ push: { provider: 'fake' } }))).toEqual([
      'push.provider (fake is refused in prod)',
    ]);
    expect(fieldsOf(prod({ email: { provider: 'fake' } }))).toEqual([
      'email.provider (fake is refused in prod)',
    ]);
  });
  it('requires a shared idempotency store', () => {
    expect(fieldsOf(prod({ idempotency: {} }))).toEqual([
      'idempotency.store (a shared store is required in prod)',
    ]);
  });
  it('forbids dryRun', () => {
    expect(
      fieldsOf(prod({ push: { provider: 'fcm', credentials: FAKE_ACCOUNT, dryRun: true } })),
    ).toEqual(['push.dryRun (not allowed in prod)']);
  });
  it('requires SMTP credentials', () => {
    expect(
      fieldsOf(prod({ email: { provider: 'smtp', from, smtp: { host: 'smtp.example.com' } } })),
    ).toEqual(['email.smtp.user/pass (required in prod)']);
    expect(
      fieldsOf(
        prod({ email: { provider: 'smtp', from, smtp: { host: 'smtp.example.com', user: 'u' } } }),
      ),
    ).toEqual(['email.smtp.user/pass (required in prod)']);
  });
  it('allows custom adapters (any third party) in prod', () => {
    const push = {
      provider: 'custom',
      channel: { send: () => Promise.reject(new Error('n/a')) },
    } as const;
    const email = {
      provider: 'custom',
      channel: { send: () => Promise.reject(new Error('n/a')) },
    } as const;
    expect(() => resolveConfig(prod({ push, email }))).not.toThrow();
  });
});
