import { resolveConfig, type StorageOptions } from '../src/config/options';
import { ERROR_CODES } from '../src/constants/codes';
import { DEFAULT_RETRY, REDACTED } from '../src/constants/defaults';
import { StorageError, configError, isStorageError, validationError } from '../src/errors';
import { noopLogger, redact, redactingLogger, type Logger } from '../src/logger';
import { delayFor, isRetryable, realRetryDeps, withRetry, withTimeout } from '../src/retry';

const dev = (extra: Partial<StorageOptions> = {}): StorageOptions => ({
  environment: 'dev',
  provider: 'memory',
  cdn: { baseUrl: 'http://localhost:9000/cdn/' },
  ...extra,
});
const s3 = {
  region: 'eu-central-1',
  publicBucket: 'pub',
  privateBucket: 'priv',
};
const prod = (extra: Partial<StorageOptions> = {}): StorageOptions => ({
  environment: 'prod',
  provider: 's3',
  s3,
  cdn: { baseUrl: 'https://cdn.example.com' },
  ...extra,
});
const fieldsOf = (options: StorageOptions): string[] => {
  try {
    resolveConfig(options);
  } catch (error) {
    const failure = error as StorageError;
    expect(failure.code).toBe(ERROR_CODES.CONFIG_INVALID);
    return failure.details['fields'] as string[];
  }
  throw new Error('expected a configuration error');
};

describe('errors', () => {
  it('carries code, retryable, cause and details', () => {
    const cause = new Error('x');
    const error = new StorageError(ERROR_CODES.UNAVAILABLE, 'down', {
      retryable: true,
      cause,
      details: { a: 1 },
    });
    expect(error).toMatchObject({ name: 'StorageError', retryable: true, details: { a: 1 } });
    expect(error.cause).toBe(cause);
    expect(isStorageError(error)).toBe(true);
    expect(isStorageError(new Error('x'))).toBe(false);
  });
  it('defaults to non-retryable without details', () => {
    const error = new StorageError(ERROR_CODES.UNKNOWN, 'm');
    expect(error.retryable).toBe(false);
    expect(error.details).toEqual({});
    expect(error.cause).toBeUndefined();
  });
  it('builds config and validation errors', () => {
    expect(configError('m').code).toBe(ERROR_CODES.CONFIG_INVALID);
    expect(configError('m', { fields: ['a'] }).details).toEqual({ fields: ['a'] });
    expect(validationError('m').code).toBe(ERROR_CODES.VALIDATION_FAILED);
  });
});

describe('resolveConfig', () => {
  it('fills defaults and trims trailing slashes', () => {
    const config = resolveConfig(dev());
    expect(config.cdnBaseUrl).toBe('http://localhost:9000/cdn');
    expect(config.retry).toEqual(DEFAULT_RETRY);
    expect(config.variants).toMatchObject({ thumbWidth: 320, mediumWidth: 960, quality: 80 });
    expect(config.uploadMaxTtlSec).toBe(300);
    expect(config.signedUrlMaxTtlSec).toBe(600);
    expect(config.s3).toBeUndefined();
    expect(config.localFs).toBeUndefined();
  });
  it('lets the consumer override everything', () => {
    const config = resolveConfig(
      dev({
        provider: 's3',
        s3: { ...s3, endpoint: 'http://localhost:9000', forcePathStyle: true },
        upload: { maxTtlSec: 60 },
        signedUrl: { maxTtlSec: 30 },
        readMaxBytes: 10,
        timeoutMs: 5,
        retry: { maxAttempts: 5, baseDelayMs: 1, maxDelayMs: 2, jitterRatio: 0 },
        variants: { thumbWidth: 100, mediumWidth: 200, quality: 50 },
      }),
    );
    expect(config).toMatchObject({
      uploadMaxTtlSec: 60,
      signedUrlMaxTtlSec: 30,
      readMaxBytes: 10,
      timeoutMs: 5,
    });
    expect(config.retry).toEqual({ maxAttempts: 5, baseDelayMs: 1, maxDelayMs: 2, jitterRatio: 0 });
    expect(config.variants).toMatchObject({ thumbWidth: 100, mediumWidth: 200, quality: 50 });
    expect(config.s3).toMatchObject({ forcePathStyle: true, endpoint: 'http://localhost:9000' });
  });
  it('defaults forcePathStyle to false and keeps credentials', () => {
    const credentials = { accessKeyId: 'a', secretAccessKey: 'b' };
    const config = resolveConfig(prod({ s3: { ...s3, credentials } }));
    expect(config.s3?.forcePathStyle).toBe(false);
    expect(config.s3?.credentials).toEqual(credentials);
  });
  it('resolves local-fs', () => {
    const config = resolveConfig(
      dev({
        provider: 'local-fs',
        localFs: { rootDir: '/tmp/x', baseUrl: 'http://localhost:3000/' },
      }),
    );
    expect(config.localFs).toEqual({ rootDir: '/tmp/x', baseUrl: 'http://localhost:3000' });
  });
  it.each([
    [dev({ provider: 'gcs' as never }), 'provider'],
    [{ ...dev(), environment: 'staging' as never }, 'environment'],
    [dev({ retry: { maxAttempts: 0 } }), 'retry.maxAttempts'],
    [dev({ retry: { jitterRatio: 2 } }), 'retry.jitterRatio'],
    [dev({ upload: { maxTtlSec: 604_801 } }), 'upload.maxTtlSec'],
    [dev({ variants: { quality: 101 } }), 'variants.quality'],
    [dev({ cdn: { baseUrl: 'nope' } }), 'cdn.baseUrl'],
    [dev({ provider: 's3', s3: { ...s3, publicBucket: '' } }), 's3.publicBucket'],
    [
      dev({ provider: 's3', s3: { ...s3, credentials: { accessKeyId: 'a' } as never } }),
      's3.credentials.secretAccessKey',
    ],
    [dev({ timeoutMs: -1 }), 'timeoutMs'],
  ])('rejects bad options (%#)', (options, field) => {
    expect(fieldsOf(options)).toContain(field);
  });
  it('requires the section of the chosen provider', () => {
    expect(fieldsOf(dev({ provider: 's3' }))).toEqual(['s3']);
    expect(fieldsOf(dev({ provider: 'local-fs' }))).toEqual(['localFs']);
  });
  it('accepts a strict production setup', () => {
    expect(resolveConfig(prod()).environment).toBe('prod');
  });
  it.each([
    [prod({ provider: 'memory' }), 'provider'],
    [
      prod({ provider: 'local-fs', localFs: { rootDir: '/x', baseUrl: 'https://a.com' } }),
      'provider',
    ],
    [prod({ cdn: { baseUrl: 'http://cdn.example.com' } }), 'cdn.baseUrl'],
    [prod({ s3: { ...s3, endpoint: 'http://minio.local:9000' } }), 's3.endpoint'],
    [prod({ s3: { ...s3, privateBucket: 'pub' } }), 's3.privateBucket'],
  ])('refuses unsafe production setups (%#)', (options, field) => {
    expect(fieldsOf(options)).toContain(field);
  });
  it('never puts secrets into the error', () => {
    try {
      resolveConfig(
        prod({ s3: { ...s3, credentials: { accessKeyId: 'AKIA-LEAK', secretAccessKey: '' } } }),
      );
    } catch (error) {
      expect((error as Error).message).not.toContain('AKIA-LEAK');
    }
  });
  it('wraps the consumer logger with redaction', () => {
    const seen: unknown[] = [];
    const logger: Logger = { ...noopLogger, info: (_m, fields) => seen.push(fields) };
    resolveConfig(dev({ logger })).logger.info('x', { secretAccessKey: 's', key: 'k' });
    expect(seen).toEqual([{ secretAccessKey: REDACTED, key: 'k' }]);
  });
});

describe('logger', () => {
  it('redacts nested and array secrets without mutating', () => {
    const input = {
      a: [{ password: 'p', ok: 1 }],
      b: { signature: 's', c: { d: { e: { f: { g: { h: 1 } } } } } },
    };
    const out = redact(input) as { a: { password: string }[]; b: { signature: string } };
    expect(out.a[0]?.password).toBe(REDACTED);
    expect(out.b.signature).toBe(REDACTED);
    expect(input.a[0]?.password).toBe('p');
    expect(JSON.stringify(out)).toContain(REDACTED);
    expect(redact('text')).toBe('text');
    expect(redact(null)).toBeNull();
  });
  it('forwards every level, with and without fields', () => {
    const calls: string[] = [];
    const inner: Logger = {
      debug: (m, f) => calls.push(`d:${m}:${f === undefined ? 'none' : 'fields'}`),
      info: (m) => calls.push(`i:${m}`),
      warn: (m) => calls.push(`w:${m}`),
      error: (m) => calls.push(`e:${m}`),
    };
    const logger = redactingLogger(inner);
    logger.debug('a');
    logger.info('b', { x: 1 });
    logger.warn('c');
    logger.error('d');
    expect(calls).toEqual(['d:a:none', 'i:b', 'w:c', 'e:d']);
    noopLogger.debug('x');
    noopLogger.info('x');
    noopLogger.warn('x');
    noopLogger.error('x');
  });
});

describe('retry', () => {
  const policy = { maxAttempts: 3, baseDelayMs: 100, maxDelayMs: 250, jitterRatio: 0.5 };
  const retryable = (): StorageError =>
    new StorageError(ERROR_CODES.UNAVAILABLE, 'x', { retryable: true });
  it('computes capped exponential delays with jitter', () => {
    expect(delayFor(1, policy, () => 0.5)).toBe(100);
    expect(delayFor(2, policy, () => 0.5)).toBe(200);
    expect(delayFor(3, policy, () => 0.5)).toBe(250);
    expect(delayFor(1, policy, () => 1)).toBe(150);
    expect(delayFor(1, { ...policy, jitterRatio: 5 }, () => 0)).toBe(0);
  });
  it('retries retryable errors until success', async () => {
    const sleeps: number[] = [];
    const deps = {
      sleep: (ms: number) => Promise.resolve(void sleeps.push(ms)),
      random: () => 0.5,
    };
    let calls = 0;
    const onRetry = jest.fn();
    const result = await withRetry(
      () => {
        calls += 1;
        return calls < 3 ? Promise.reject(retryable()) : Promise.resolve('ok');
      },
      policy,
      deps,
      onRetry,
    );
    expect(result).toBe('ok');
    expect(sleeps).toEqual([100, 200]);
    expect(onRetry).toHaveBeenCalledTimes(2);
  });
  it('gives up after maxAttempts and never retries other errors', async () => {
    const deps = { sleep: () => Promise.resolve(), random: () => 0.5 };
    let calls = 0;
    await expect(
      withRetry(() => (calls++, Promise.reject(retryable())), policy, deps),
    ).rejects.toBeInstanceOf(StorageError);
    expect(calls).toBe(3);
    calls = 0;
    await expect(
      withRetry(() => (calls++, Promise.reject(new Error('x'))), policy, deps),
    ).rejects.toThrow('x');
    expect(calls).toBe(1);
    expect(isRetryable(new Error('x'))).toBe(false);
  });
  it('has a real sleep and random', async () => {
    await realRetryDeps.sleep(1);
    expect(realRetryDeps.random()).toBeLessThan(1);
  });
  it('times out slow work and clears the timer on success', async () => {
    await expect(
      withTimeout(new Promise(() => undefined), 5, () => new Error('late')),
    ).rejects.toThrow('late');
    await expect(withTimeout(Promise.resolve(1), 1000, () => new Error('late'))).resolves.toBe(1);
  });
});
