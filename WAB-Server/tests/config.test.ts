import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ConfigError, loadConfig, readEnvSources } from '../src/config';
import { envSchema } from '../src/config/env.schema';
import { DEFAULT_PORT, ENV_KEYS, PORT_MAX, envFileName } from '../src/constants/env';

const MONGO = 'mongodb://user:s3cret@localhost/wab';
const REDIS = 'redis://localhost:6379';

const REAL_PROVIDERS = { OTP_PROVIDER: 'real', STORAGE_PROVIDER: 'real' };

const validEnv = (overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv => ({
  [ENV_KEYS.mongoUri]: MONGO,
  [ENV_KEYS.redisUrl]: REDIS,
  ...overrides,
});

const invalidKeysOf = (source: NodeJS.ProcessEnv): readonly string[] => {
  try {
    loadConfig(source);
  } catch (error) {
    if (error instanceof ConfigError) return error.invalidKeys;
    throw error;
  }
  throw new Error('expected loadConfig to throw');
};

describe('loadConfig', () => {
  it('applies non-secret defaults', () => {
    const config = loadConfig(validEnv());
    expect(config.env).toBe('development');
    expect(config.isProduction).toBe(false);
    expect(config.port).toBe(DEFAULT_PORT);
    expect(config.logLevel).toBe('info');
    expect(config.corsAllowedOrigins).toEqual([]);
  });

  it('coerces and validates the port', () => {
    expect(loadConfig(validEnv({ PORT: '8080' })).port).toBe(8080);
    expect(invalidKeysOf(validEnv({ PORT: '0' }))).toEqual([ENV_KEYS.port]);
    expect(invalidKeysOf(validEnv({ PORT: String(PORT_MAX + 1) }))).toEqual([ENV_KEYS.port]);
    expect(invalidKeysOf(validEnv({ PORT: 'abc' }))).toEqual([ENV_KEYS.port]);
  });

  it('defaults every provider to the fake outside production', () => {
    expect(loadConfig(validEnv()).providers).toEqual({ otp: 'fake', storage: 'fake' });
    expect(loadConfig(validEnv({ NODE_ENV: 'test' })).providers).toEqual({
      otp: 'fake',
      storage: 'fake',
    });
  });

  it('reads the provider modes and rejects unknown ones', () => {
    const config = loadConfig(validEnv({ OTP_PROVIDER: 'real', STORAGE_PROVIDER: 'fake' }));
    expect(config.providers).toEqual({ otp: 'real', storage: 'fake' });
    expect(invalidKeysOf(validEnv({ OTP_PROVIDER: 'mock' }))).toEqual([ENV_KEYS.otpProvider]);
    expect(invalidKeysOf(validEnv({ STORAGE_PROVIDER: '' }))).toEqual([ENV_KEYS.storageProvider]);
  });

  it('requires production to name every provider as real, never defaulting or faking', () => {
    const production = validEnv({ NODE_ENV: 'production' });
    expect(invalidKeysOf(production)).toEqual([ENV_KEYS.otpProvider, ENV_KEYS.storageProvider]);
    expect(
      invalidKeysOf({ ...production, OTP_PROVIDER: 'real', STORAGE_PROVIDER: 'fake' }),
    ).toEqual([ENV_KEYS.storageProvider]);
    expect(
      invalidKeysOf({ ...production, OTP_PROVIDER: 'fake', STORAGE_PROVIDER: 'real' }),
    ).toEqual([ENV_KEYS.otpProvider]);
    const ok = loadConfig({ ...production, OTP_PROVIDER: 'real', STORAGE_PROVIDER: 'real' });
    expect(ok.providers).toEqual({ otp: 'real', storage: 'real' });
  });

  it('flags production', () => {
    expect(loadConfig(validEnv({ ...REAL_PROVIDERS, NODE_ENV: 'production' })).isProduction).toBe(
      true,
    );
  });

  it('rejects unknown NODE_ENV and LOG_LEVEL', () => {
    expect(invalidKeysOf(validEnv({ NODE_ENV: 'staging' }))).toEqual([ENV_KEYS.nodeEnv]);
    expect(invalidKeysOf(validEnv({ LOG_LEVEL: 'loud' }))).toEqual([ENV_KEYS.logLevel]);
  });

  it('has no defaults for connection secrets: missing keys fail fast', () => {
    expect(invalidKeysOf({})).toEqual([ENV_KEYS.mongoUri, ENV_KEYS.redisUrl]);
  });

  it('rejects malformed connection strings', () => {
    expect(invalidKeysOf(validEnv({ MONGODB_URI: 'http://example.test' }))).toEqual([
      ENV_KEYS.mongoUri,
    ]);
    expect(invalidKeysOf(validEnv({ REDIS_URL: 'localhost:6379' }))).toEqual([ENV_KEYS.redisUrl]);
  });

  it('defaults to trusting no proxy and validates TRUST_PROXY_HOPS', () => {
    expect(loadConfig(validEnv()).trustProxyHops).toBe(0);
    expect(loadConfig(validEnv({ TRUST_PROXY_HOPS: '1' })).trustProxyHops).toBe(1);
    expect(invalidKeysOf(validEnv({ TRUST_PROXY_HOPS: '-1' }))).toEqual([ENV_KEYS.trustProxyHops]);
    expect(invalidKeysOf(validEnv({ TRUST_PROXY_HOPS: '99' }))).toEqual([ENV_KEYS.trustProxyHops]);
    expect(invalidKeysOf(validEnv({ TRUST_PROXY_HOPS: 'x' }))).toEqual([ENV_KEYS.trustProxyHops]);
  });

  it('accepts mongodb+srv and rediss', () => {
    const config = loadConfig(
      validEnv({ MONGODB_URI: 'mongodb+srv://u:p@cluster.test/db', REDIS_URL: 'rediss://h:1' }),
    );
    expect(config.mongo.uri).toContain('mongodb+srv://');
    expect(config.redis.url).toBe('rediss://h:1');
  });

  it('parses the CORS origin list, trimming blanks', () => {
    const config = loadConfig(
      validEnv({ CORS_ALLOWED_ORIGINS: ' https://a.test , ,https://b.test' }),
    );
    expect(config.corsAllowedOrigins).toEqual(['https://a.test', 'https://b.test']);
  });

  it('never leaks values in the error', () => {
    let message = '';
    try {
      loadConfig(validEnv({ MONGODB_URI: 'mongodb-bad://user:s3cret@host', PORT: 'oops' }));
    } catch (error) {
      message = error instanceof Error ? error.message : '';
    }
    expect(message).toContain(ENV_KEYS.mongoUri);
    expect(message).toContain(ENV_KEYS.port);
    expect(message).not.toContain('s3cret');
    expect(message).not.toContain('oops');
  });

  it('returns an immutable config', () => {
    const config = loadConfig(validEnv());
    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(config.mongo)).toBe(true);
    expect(Object.isFrozen(config.corsAllowedOrigins)).toBe(true);
  });
});

describe('readEnvSources', () => {
  let directory: string;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'wab-config-'));
  });

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  it('reads the file matching NODE_ENV', () => {
    writeFileSync(join(directory, envFileName('production')), 'PORT=9000\n');
    writeFileSync(join(directory, envFileName('development')), 'PORT=1111\n');
    const merged = readEnvSources({ NODE_ENV: 'production' }, directory);
    expect(merged['PORT']).toBe('9000');
  });

  it('defaults to the development file when NODE_ENV is unset or unknown', () => {
    writeFileSync(join(directory, envFileName('development')), 'PORT=1111\n');
    expect(readEnvSources({}, directory)['PORT']).toBe('1111');
    expect(readEnvSources({ NODE_ENV: 'staging' }, directory)['PORT']).toBe('1111');
  });

  it('lets real environment variables override the file', () => {
    writeFileSync(join(directory, envFileName('development')), 'PORT=1111\n');
    expect(readEnvSources({ PORT: '2222' }, directory)['PORT']).toBe('2222');
  });

  it('works when no env file exists', () => {
    expect(readEnvSources({ PORT: '1' }, directory)).toEqual({ PORT: '1' });
  });
});

describe('.env.example', () => {
  const lines = readFileSync(join(__dirname, '..', '.env.example'), 'utf8').split('\n');
  const entries = lines.filter((line) => line.trim() !== '' && !line.startsWith('#'));

  it('lists every key the schema reads, with no values', () => {
    const listed = entries.map((line) => line.split('=')[0]).sort();
    expect(listed).toEqual(Object.keys(envSchema.shape).sort());
    expect(entries.every((line) => line.endsWith('='))).toBe(true);
  });
});
