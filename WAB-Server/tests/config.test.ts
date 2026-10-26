import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ConfigError, loadConfig, readEnvSources } from '../src/config';
import { envSchema } from '../src/config/env.schema';
import {
  DEFAULT_PORT,
  ENV_KEYS,
  PORT_MAX,
  PROVIDER_ENV_KEYS,
  envFileName,
} from '../src/constants/env';

const MONGO = 'mongodb://user:s3cret@localhost/wab';
const REDIS = 'redis://localhost:6379';

/** ARQAM OTP project + both secrets (values are obviously fake). */
const ARQAM = {
  ARQAM_API_KEY: 'not-a-real-arqam-key',
  ARQAM_TEMPLATE_AR: 'wab_otp_ar',
  ARQAM_TEMPLATE_EN: 'wab_otp_en',
  OTP_CODE_SECRET: 'c'.repeat(40),
  OTP_PROOF_SECRET: 'f'.repeat(40),
};
const REAL_PROVIDERS = {
  OTP_PROVIDER: 'arqam',
  STORAGE_PROVIDER: 'real',
  NOTIFIER_PROVIDER: 'real',
  PAYMENT_PROVIDER: 'disabled',
  ...ARQAM,
  FCM_SERVICE_ACCOUNT_JSON: '{"project_id":"p"}',
  SMTP_HOST: 'smtp.example.test',
  EMAIL_FROM_ADDRESS: 'noreply@example.test',
  S3_REGION: 'eu-central-1',
  S3_PUBLIC_BUCKET: 'wab-public',
  S3_PRIVATE_BUCKET: 'wab-private',
  CDN_BASE_URL: 'https://cdn.example.test',
};
const ALL_FAKE_MODES = {
  otp: 'fake',
  storage: 'fake',
  notifier: 'fake',
  payments: 'fake',
};

/** Production also needs the field-encryption key (a valid base64 key of 32 bytes). */
const PAYOUT_KEY = { PAYOUT_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64') };

const validEnv = (overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv => ({
  [ENV_KEYS.mongoUri]: MONGO,
  [ENV_KEYS.redisUrl]: REDIS,
  [ENV_KEYS.jwtAccessSecret]: 'a'.repeat(48),
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

const configProblemsOf = (source: NodeJS.ProcessEnv): ConfigError['problems'] => {
  try {
    loadConfig(source);
  } catch (error) {
    if (error instanceof ConfigError) return error.problems;
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

  it('maps OTP_PROVIDER=arqam to providers.otp and nothing else', () => {
    expect(loadConfig(validEnv({ OTP_PROVIDER: 'arqam', ...ARQAM })).providers).toEqual({
      ...ALL_FAKE_MODES,
      otp: 'arqam',
    });
  });

  it('defaults every provider to the fake outside production', () => {
    expect(loadConfig(validEnv()).providers).toEqual(ALL_FAKE_MODES);
    expect(loadConfig(validEnv({ NODE_ENV: 'test' })).providers).toEqual(ALL_FAKE_MODES);
  });

  it.each([
    [ENV_KEYS.storageProvider, 'storage'],
    [ENV_KEYS.notifierProvider, 'notifier'],
  ] as const)('maps %s to providers.%s and nothing else', (key, field) => {
    const credentials =
      key === ENV_KEYS.notifierProvider
        ? {
            FCM_SERVICE_ACCOUNT_JSON: '{}',
            SMTP_HOST: 'smtp.example.test',
            EMAIL_FROM_ADDRESS: 'noreply@example.test',
          }
        : {
            S3_REGION: 'eu-central-1',
            S3_PUBLIC_BUCKET: 'wab-public',
            S3_PRIVATE_BUCKET: 'wab-private',
            CDN_BASE_URL: 'https://cdn.example.test',
          };
    expect(loadConfig(validEnv({ [key]: 'real', ...credentials })).providers).toEqual({
      ...ALL_FAKE_MODES,
      [field]: 'real',
    });
  });

  it('rejects unknown or empty provider modes', () => {
    for (const key of PROVIDER_ENV_KEYS) {
      expect(invalidKeysOf(validEnv({ [key]: 'mock' }))).toEqual([key]);
      expect(invalidKeysOf(validEnv({ [key]: '' }))).toEqual([key]);
    }
    // Payments are paused: there is no `real` gateway mode, only `fake` and `disabled`.
    for (const bad of ['real', 'mock', '']) {
      expect(invalidKeysOf(validEnv({ [ENV_KEYS.paymentProvider]: bad }))).toEqual([
        ENV_KEYS.paymentProvider,
      ]);
    }
    expect(
      loadConfig(validEnv({ [ENV_KEYS.paymentProvider]: 'disabled' })).providers.payments,
    ).toBe('disabled');
  });

  it('requires production to name every provider as real (payments: disabled), never defaulting or faking', () => {
    const production = validEnv({ NODE_ENV: 'production', ...PAYOUT_KEY });
    expect(invalidKeysOf(production)).toEqual([
      ...PROVIDER_ENV_KEYS,
      ENV_KEYS.otpProvider,
      ENV_KEYS.paymentProvider,
    ]);
    for (const key of [...PROVIDER_ENV_KEYS, ENV_KEYS.otpProvider, ENV_KEYS.paymentProvider]) {
      expect(invalidKeysOf({ ...production, ...REAL_PROVIDERS, [key]: 'fake' })).toEqual([key]);
      const others = Object.fromEntries(
        Object.entries(REAL_PROVIDERS).filter(([name]) => name !== key),
      );
      expect(invalidKeysOf({ ...production, ...others })).toEqual([key]);
    }
    const ok = loadConfig({ ...production, ...REAL_PROVIDERS });
    expect(ok.providers).toEqual({
      otp: 'arqam',
      storage: 'real',
      notifier: 'real',
      payments: 'disabled',
    });
  });

  describe('real notifier settings', () => {
    const base = validEnv({ NOTIFIER_PROVIDER: 'real' });
    const creds = {
      FCM_SERVICE_ACCOUNT_JSON: '{"project_id":"p"}',
      SMTP_HOST: 'smtp.example.test',
      EMAIL_FROM_ADDRESS: 'noreply@example.test',
    };

    it('names every missing credential key, never a value', () => {
      expect([...invalidKeysOf(base)].sort()).toEqual(
        ['EMAIL_FROM_ADDRESS', 'FCM_SERVICE_ACCOUNT_JSON', 'SMTP_HOST'].sort(),
      );
    });

    it('builds typed settings with defaults', () => {
      const config = loadConfig({ ...base, ...creds });
      expect(config.notifier).toEqual({
        fcm: { serviceAccountJson: creds.FCM_SERVICE_ACCOUNT_JSON, dryRun: false },
        smtp: { host: creds.SMTP_HOST, port: 587, secure: false },
        from: { address: creds.EMAIL_FROM_ADDRESS, name: 'WAB' },
      });
    });

    it('reads optional values and requires SMTP user and password together', () => {
      const full = loadConfig({
        ...base,
        ...creds,
        FCM_PROJECT_ID: 'proj',
        FCM_DRY_RUN: 'true',
        SMTP_PORT: '465',
        SMTP_SECURE: 'true',
        SMTP_USER: 'u@example.test',
        SMTP_PASS: 'pw',
        EMAIL_FROM_NAME: 'Salon',
      });
      expect(full.notifier).toEqual({
        fcm: {
          serviceAccountJson: creds.FCM_SERVICE_ACCOUNT_JSON,
          projectId: 'proj',
          dryRun: true,
        },
        smtp: {
          host: creds.SMTP_HOST,
          port: 465,
          secure: true,
          user: 'u@example.test',
          pass: 'pw',
        },
        from: { address: creds.EMAIL_FROM_ADDRESS, name: 'Salon' },
      });
      expect(invalidKeysOf({ ...base, ...creds, SMTP_USER: 'u@example.test' })).toEqual([
        'SMTP_PASS',
      ]);
    });

    it('rejects bad values and is absent for the fake notifier', () => {
      expect(invalidKeysOf({ ...base, ...creds, FCM_DRY_RUN: 'yes' })).toEqual(['FCM_DRY_RUN']);
      expect(invalidKeysOf({ ...base, ...creds, EMAIL_FROM_ADDRESS: 'nope' })).toEqual([
        'EMAIL_FROM_ADDRESS',
      ]);
      expect(loadConfig(validEnv()).notifier).toBeUndefined();
    });
  });

  describe('real storage settings', () => {
    const base = validEnv({ STORAGE_PROVIDER: 'real' });
    const settings = {
      S3_REGION: 'eu-central-1',
      S3_PUBLIC_BUCKET: 'wab-public',
      S3_PRIVATE_BUCKET: 'wab-private',
      CDN_BASE_URL: 'https://cdn.example.test',
    };

    it('names every missing key, never a value', () => {
      expect([...invalidKeysOf(base)].sort()).toEqual(
        ['CDN_BASE_URL', 'S3_PRIVATE_BUCKET', 'S3_PUBLIC_BUCKET', 'S3_REGION'].sort(),
      );
    });

    it('builds typed settings with defaults (IAM role: no credentials)', () => {
      expect(loadConfig({ ...base, ...settings }).storage).toEqual({
        region: 'eu-central-1',
        publicBucket: 'wab-public',
        privateBucket: 'wab-private',
        forcePathStyle: false,
        cdnBaseUrl: 'https://cdn.example.test',
      });
    });

    it('reads endpoint, credentials and CloudFront signing', () => {
      const config = loadConfig({
        ...base,
        ...settings,
        S3_ENDPOINT: 'http://localhost:9000',
        S3_FORCE_PATH_STYLE: 'true',
        S3_ACCESS_KEY_ID: 'id',
        S3_SECRET_ACCESS_KEY: 'value',
        CLOUDFRONT_PRIVATE_BASE_URL: 'https://private.example.test',
        CLOUDFRONT_KEY_PAIR_ID: 'K1',
        CLOUDFRONT_PRIVATE_KEY: 'pem',
      });
      expect(config.storage).toEqual({
        region: 'eu-central-1',
        publicBucket: 'wab-public',
        privateBucket: 'wab-private',
        endpoint: 'http://localhost:9000',
        forcePathStyle: true,
        credentials: { accessKeyId: 'id', secretAccessKey: 'value' },
        cdnBaseUrl: 'https://cdn.example.test',
        cloudfront: { baseUrl: 'https://private.example.test', keyPairId: 'K1', privateKey: 'pem' },
      });
    });

    it('requires credentials and CloudFront settings to come complete', () => {
      expect(invalidKeysOf({ ...base, ...settings, S3_ACCESS_KEY_ID: 'id' })).toEqual([
        'S3_SECRET_ACCESS_KEY',
      ]);
      expect(
        [...invalidKeysOf({ ...base, ...settings, CLOUDFRONT_KEY_PAIR_ID: 'K1' })].sort(),
      ).toEqual(['CLOUDFRONT_PRIVATE_BASE_URL', 'CLOUDFRONT_PRIVATE_KEY']);
    });

    it('rejects bad URLs and is absent for the fake storage', () => {
      expect(invalidKeysOf({ ...base, ...settings, CDN_BASE_URL: 'nope' })).toEqual([
        'CDN_BASE_URL',
      ]);
      expect(invalidKeysOf({ ...base, ...settings, S3_ENDPOINT: 'nope' })).toEqual(['S3_ENDPOINT']);
      expect(loadConfig(validEnv()).storage).toBeUndefined();
    });
  });

  describe('ARQAM OTP settings (SRV-158)', () => {
    const base = validEnv({ OTP_PROVIDER: 'arqam' });

    it('names every missing key, never a value', () => {
      expect([...invalidKeysOf(base)].sort()).toEqual(
        [
          'ARQAM_API_KEY',
          'ARQAM_TEMPLATE_AR',
          'ARQAM_TEMPLATE_EN',
          'OTP_CODE_SECRET',
          'OTP_PROOF_SECRET',
        ].sort(),
      );
      for (const key of Object.keys(ARQAM)) {
        const without = Object.fromEntries(Object.entries(ARQAM).filter(([k]) => k !== key));
        expect(invalidKeysOf({ ...base, ...without })).toEqual([key]);
      }
      const problems = configProblemsOf({ ...base, ARQAM_API_KEY: 'x' });
      expect(JSON.stringify(problems)).not.toContain('"x"');
    });

    it('builds typed settings; base URL and sender only when given; IP off by default', () => {
      const config = loadConfig({ ...base, ...ARQAM, ARQAM_API_KEY: '  key-with-spaces  ' });
      expect(config.providers.otp).toBe('arqam');
      expect(config.otp).toEqual({
        codeSecret: ARQAM.OTP_CODE_SECRET,
        proofSecret: ARQAM.OTP_PROOF_SECRET,
        arqam: {
          apiKey: 'key-with-spaces',
          templates: { ar: ARQAM.ARQAM_TEMPLATE_AR, en: ARQAM.ARQAM_TEMPLATE_EN },
          sendIp: false,
        },
      });
      expect(
        loadConfig({
          ...base,
          ...ARQAM,
          ARQAM_BASE_URL: 'https://otp.arqam.example/api',
          ARQAM_SENDER_ID: 'wab_sender',
          ARQAM_SEND_IP: 'true',
        }).otp.arqam,
      ).toMatchObject({
        baseUrl: 'https://otp.arqam.example/api',
        senderId: 'wab_sender',
        sendIp: true,
      });
      expect(loadConfig({ ...base, ...ARQAM, ARQAM_BASE_URL: '' }).otp.arqam).not.toHaveProperty(
        'baseUrl',
      );
    });

    it.each([
      ['ARQAM_API_KEY', '   '],
      ['ARQAM_TEMPLATE_AR', 'Login Code'],
      ['ARQAM_TEMPLATE_EN', 'otp/en'],
      ['ARQAM_SENDER_ID', 'two words'],
      ['ARQAM_BASE_URL', 'not a url'],
      ['ARQAM_SEND_IP', 'yes'],
      ['OTP_CODE_SECRET', 'short'],
      ['OTP_PROOF_SECRET', 'x'.repeat(31)],
      ['OTP_FIXED_CODE', '12ab56'],
      ['OTP_FIXED_CODE', '123'],
    ])('rejects a malformed %s', (key, value) => {
      expect(invalidKeysOf({ ...base, ...ARQAM, [key]: value })).toEqual([key]);
    });

    it('requires the code and proof secrets to differ', () => {
      expect(invalidKeysOf({ ...base, ...ARQAM, OTP_PROOF_SECRET: ARQAM.OTP_CODE_SECRET })).toEqual(
        ['OTP_PROOF_SECRET'],
      );
      expect(
        invalidKeysOf(
          validEnv({ OTP_CODE_SECRET: 'a'.repeat(32), OTP_PROOF_SECRET: 'a'.repeat(32) }),
        ),
      ).toEqual(['OTP_PROOF_SECRET']);
    });

    it('the fake provider needs no ARQAM keys; the fixed code passes through in development', () => {
      expect(loadConfig(validEnv()).otp).toEqual({});
      expect(loadConfig(validEnv({ OTP_FIXED_CODE: '123456' })).otp).toEqual({
        fixedCode: '123456',
      });
      expect(loadConfig(validEnv()).providers.otp).toBe('fake');
    });

    it.each(['whatsapp', 'real'])('refuses the retired `%s` mode with a hint', (mode) => {
      expect(invalidKeysOf(validEnv({ OTP_PROVIDER: mode, ...ARQAM }))).toEqual(['OTP_PROVIDER']);
      expect(JSON.stringify(configProblemsOf(validEnv({ OTP_PROVIDER: mode })))).toContain('arqam');
    });

    it('refuses a fake, a fixed code and an http ARQAM URL in production', () => {
      const production = validEnv({ ...REAL_PROVIDERS, ...PAYOUT_KEY, NODE_ENV: 'production' });
      expect(loadConfig(production).providers.otp).toBe('arqam');
      expect(invalidKeysOf({ ...production, OTP_PROVIDER: 'fake' })).toEqual(['OTP_PROVIDER']);
      expect(invalidKeysOf({ ...production, OTP_FIXED_CODE: '123456' })).toEqual([
        'OTP_FIXED_CODE',
      ]);
      expect(invalidKeysOf({ ...production, ARQAM_BASE_URL: 'http://arqam.test/api' })).toEqual([
        'ARQAM_BASE_URL',
      ]);
      expect(
        loadConfig({ ...base, ...ARQAM, ARQAM_BASE_URL: 'http://127.0.0.1:4010/api' }).otp.arqam,
      ).toMatchObject({ baseUrl: 'http://127.0.0.1:4010/api' });
    });
  });

  it('flags production', () => {
    expect(
      loadConfig(validEnv({ ...REAL_PROVIDERS, ...PAYOUT_KEY, NODE_ENV: 'production' }))
        .isProduction,
    ).toBe(true);
  });

  it('rejects unknown NODE_ENV and LOG_LEVEL', () => {
    expect(invalidKeysOf(validEnv({ NODE_ENV: 'staging' }))).toEqual([ENV_KEYS.nodeEnv]);
    expect(invalidKeysOf(validEnv({ LOG_LEVEL: 'loud' }))).toEqual([ENV_KEYS.logLevel]);
  });

  it('has no defaults for connection secrets: missing keys fail fast', () => {
    expect(invalidKeysOf({})).toEqual([
      ENV_KEYS.mongoUri,
      ENV_KEYS.redisUrl,
      ENV_KEYS.jwtAccessSecret,
    ]);
  });

  it('reads the access-token secret and refuses a missing or short one', () => {
    expect(loadConfig(validEnv()).auth.accessSecret).toBe('a'.repeat(48));
    expect(invalidKeysOf(validEnv({ JWT_ACCESS_SECRET: 'a'.repeat(31) }))).toEqual([
      ENV_KEYS.jwtAccessSecret,
    ]);
    expect(
      loadConfig(validEnv({ JWT_ACCESS_SECRET: 'a'.repeat(32) })).auth.accessSecret,
    ).toHaveLength(32);
    expect(invalidKeysOf(validEnv({ JWT_ACCESS_SECRET: '' }))).toEqual([ENV_KEYS.jwtAccessSecret]);
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

describe('demo seed on start (SRV-160)', () => {
  it('is off by default and reads SEED_DEMO_ON_START / SEED_DEMO_DATABASE', () => {
    expect(loadConfig(validEnv()).demoSeed).toEqual({ onStart: false });
    expect(
      loadConfig(validEnv({ SEED_DEMO_ON_START: 'true', SEED_DEMO_DATABASE: 'wab-dev' })).demoSeed,
    ).toEqual({ onStart: true, allowedDatabase: 'wab-dev' });
    expect(invalidKeysOf(validEnv({ SEED_DEMO_ON_START: 'yes' }))).toEqual(['SEED_DEMO_ON_START']);
    expect(invalidKeysOf(validEnv({ SEED_DEMO_DATABASE: 'wab/dev' }))).toEqual([
      'SEED_DEMO_DATABASE',
    ]);
  });

  it('under production rules needs the database named before it seeds at startup', () => {
    const production = { ...REAL_PROVIDERS, ...PAYOUT_KEY, NODE_ENV: 'production' };
    expect(invalidKeysOf(validEnv({ ...production, SEED_DEMO_ON_START: 'true' }))).toEqual([
      'SEED_DEMO_DATABASE',
    ]);
    expect(
      loadConfig(
        validEnv({ ...production, SEED_DEMO_ON_START: 'true', SEED_DEMO_DATABASE: 'wab-dev' }),
      ).demoSeed,
    ).toEqual({ onStart: true, allowedDatabase: 'wab-dev' });
    expect(loadConfig(validEnv(production)).demoSeed).toEqual({ onStart: false });
  });
});
