import {
  ERROR_CODES,
  StorageError,
  type BucketCorsRequest,
  type StorageOptions,
} from '@wab/storage';
import type { AppConfig } from '../src/config';
import { STORAGE_CORS_MAX_AGE_SEC } from '../src/constants/providers';
import { runStorageCors } from '../src/providers/storage/corsSetup';
import { createLogger } from '../src/utils/logger';

const logger = createLogger({ level: 'silent' });
const R2 = {
  provider: 'r2',
  accountId: 'acc123',
  publicBucket: 'wab-public',
  privateBucket: 'wab-private',
  credentials: { accessKeyId: 'not-a-real-r2-key', secretAccessKey: 'not-a-real-r2-secret' },
  cdnBaseUrl: 'https://files.example.test',
} as const;
const configWith = (extra: Record<string, unknown>): AppConfig =>
  ({
    isProduction: true,
    logLevel: 'silent',
    corsAllowedOrigins: ['https://admin.example.test'],
    storage: R2,
    ...extra,
  }) as unknown as AppConfig;

const run = async (
  config: AppConfig | (() => never),
  apply: (options: StorageOptions, request: BucketCorsRequest) => Promise<void> = () =>
    Promise.resolve(),
): Promise<{ code: number; out: string; err: string }> => {
  let out = '';
  let err = '';
  const code = await runStorageCors({
    out: (text) => (out += text),
    err: (text) => (err += text),
    loadConfig: typeof config === 'function' ? config : () => config,
    apply,
    logger,
  });
  return { code, out, err };
};

describe('npm run storage:cors (SRV-180)', () => {
  it('applies one rule for the admin origins to the configured R2 buckets', async () => {
    const seen: [StorageOptions, BucketCorsRequest][] = [];
    const result = await run(configWith({}), (options, request) => {
      seen.push([options, request]);
      return Promise.resolve();
    });
    expect(result).toEqual({
      code: 0,
      out: 'storage:cors: rule set on both buckets for 1 origin(s)\n',
      err: '',
    });
    expect(seen[0]?.[0]).toMatchObject({ provider: 'r2', environment: 'prod' });
    expect(seen[0]?.[1]).toEqual({
      allowedOrigins: ['https://admin.example.test'],
      maxAgeSec: STORAGE_CORS_MAX_AGE_SEC,
    });
    expect(result.out).not.toContain('not-a-real');
  });

  it('refuses without an object store, without origins, or with an invalid environment', async () => {
    expect((await run(configWith({ storage: undefined }))).code).toBe(1);
    const noOrigins = await run(configWith({ corsAllowedOrigins: [] }));
    expect(noOrigins).toMatchObject({ code: 1, out: '' });
    expect(noOrigins.err).toContain('CORS_ALLOWED_ORIGINS');
    const broken = await run(() => {
      throw new Error('bad env');
    });
    expect(broken).toMatchObject({ code: 1 });
    expect(broken.err).toContain('env:check');
  });

  it('reports a vendor refusal by code only', async () => {
    const result = await run(configWith({}), () =>
      Promise.reject(
        new StorageError(ERROR_CODES.ACCESS_DENIED, 'denied for key not-a-real-r2-key'),
      ),
    );
    expect(result).toEqual({
      code: 1,
      out: '',
      err: 'storage:cors: not applied (STORAGE_ACCESS_DENIED)\n',
    });
    expect((await run(configWith({}), () => Promise.reject(new Error('x')))).err).toContain(
      'UNKNOWN',
    );
  });
});
