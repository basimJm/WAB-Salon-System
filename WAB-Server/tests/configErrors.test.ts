import { ConfigError, loadConfig } from '../src/config';

const VALID: NodeJS.ProcessEnv = {
  NODE_ENV: 'development',
  MONGODB_URI: 'mongodb://localhost:27017/wab',
  REDIS_URL: 'redis://localhost:6379',
  JWT_ACCESS_SECRET: 'a'.repeat(48),
};

const failureOf = (overrides: NodeJS.ProcessEnv): ConfigError => {
  try {
    loadConfig({ ...VALID, ...overrides });
  } catch (error) {
    if (error instanceof ConfigError) return error;
    throw error;
  }
  throw new Error('expected the configuration to be rejected');
};

describe('ConfigError messages', () => {
  it('says a missing key is not set and what a valid value looks like', () => {
    const error = failureOf({ JWT_ACCESS_SECRET: undefined });
    expect(error.message).toContain('JWT_ACCESS_SECRET is not set; must be at least 32 characters');
    expect(error.message).toContain('openssl rand -base64 48');
  });

  it('says an empty key is set but empty', () => {
    const error = failureOf({ REDIS_URL: '' });
    expect(error.message).toContain('REDIS_URL is set but empty; must start with redis://');
  });

  it('says an invalid key has an invalid value without echoing it', () => {
    const value = 'REPLACE_ME';
    const error = failureOf({
      JWT_ACCESS_SECRET: value,
      PAYOUT_ENCRYPTION_KEY: value,
    });
    expect(error.message).toContain('JWT_ACCESS_SECRET has an invalid value; must be at least 32');
    expect(error.message).toContain(
      'PAYOUT_ENCRYPTION_KEY has an invalid value; must be 32 random bytes',
    );
    expect(error.message).not.toContain(value);
    expect(JSON.stringify(error.problems)).not.toContain(value);
  });

  it('lists every problem on its own line with a count', () => {
    const error = failureOf({ JWT_ACCESS_SECRET: 'short', MONGODB_URI: 'not-a-uri' });
    expect(error.invalidKeys).toEqual(expect.arrayContaining(['JWT_ACCESS_SECRET', 'MONGODB_URI']));
    const lines = error.message.split('\n');
    expect(lines[0]).toContain(`${String(error.invalidKeys.length)} problem(s)`);
    expect(lines.filter((line) => line.startsWith('  - '))).toHaveLength(error.invalidKeys.length);
  });

  it('explains a key that production requires when its provider is real', () => {
    const error = failureOf({ NODE_ENV: 'development', STORAGE_PROVIDER: 'real' });
    expect(error.message).toContain('S3_REGION is not set; required when STORAGE_PROVIDER=real');
  });
});
