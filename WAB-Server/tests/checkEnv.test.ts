import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkEnvText } from '../src/config/checkEnv';

const PLACEHOLDER = 'REPLACE_ME';
const example = (name: string): string =>
  readFileSync(join(__dirname, '..', 'docker', name), 'utf8');

/** Valid, obviously fake values for every key of the production template. */
const PRODUCTION_VALUES: Readonly<Record<string, string>> = {
  PORT: '8080',
  CORS_ALLOWED_ORIGINS: 'https://admin.example.com',
  TRUST_PROXY_HOPS: '1',
  MONGODB_URI: 'mongodb+srv://cluster.example.com/wab',
  REDIS_URL: 'rediss://cache.example.com:6380',
  JWT_ACCESS_SECRET: 'p'.repeat(48),
  PAYOUT_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
  ARQAM_API_KEY: 'not-a-real-arqam-key',
  ARQAM_TEMPLATE_AR: 'wab_otp_ar',
  ARQAM_TEMPLATE_EN: 'wab_otp_en',
  OTP_CODE_SECRET: 'c'.repeat(40),
  OTP_PROOF_SECRET: 'f'.repeat(40),
  FCM_SERVICE_ACCOUNT_JSON: '{"type":"service_account"}',
  SMTP_HOST: 'smtp.example.com',
  SMTP_PORT: '465',
  SMTP_SECURE: 'true',
  SMTP_USER: 'sender@example.com',
  SMTP_PASS: 'not-a-real-password',
  EMAIL_FROM_ADDRESS: 'sender@example.com',
  EMAIL_FROM_NAME: 'WAB',
  R2_ACCOUNT_ID: 'acc123',
  R2_ACCESS_KEY_ID: 'not-a-real-r2-key',
  R2_SECRET_ACCESS_KEY: 'not-a-real-r2-secret',
  R2_PUBLIC_BUCKET_NAME: 'wab-prod-public',
  R2_PRIVATE_BUCKET_NAME: 'wab-prod-private',
  R2_PUBLIC_URL: 'https://files.example.com',
};

const fill = (template: string, values: Readonly<Record<string, string>>): string =>
  template
    .split('\n')
    .map((line) => {
      const key = line.split('=')[0] ?? '';
      const value = values[key];
      return value !== undefined && line.endsWith(PLACEHOLDER) ? `${key}=${value}` : line;
    })
    .join('\n');

describe('checkEnvText', () => {
  it('accepts the development template as is', () => {
    expect(checkEnvText(example('env.development.example'))).toMatchObject({
      ok: true,
      invalidKeys: [],
    });
  });

  describe.each(['env.dev.example', 'env.prod.example'])('%s', (template) => {
    it('rejects the untouched template and names keys only', () => {
      const result = checkEnvText(example(template));
      expect(result.ok).toBe(false);
      expect(result.invalidKeys).toContain('MONGODB_URI');
      expect(result.invalidKeys).toContain('JWT_ACCESS_SECRET');
      expect(JSON.stringify(result)).not.toContain(PLACEHOLDER);
    });

    it('accepts the template once every placeholder has a valid value', () => {
      const filled = fill(example(template), PRODUCTION_VALUES);
      expect(filled).not.toContain(PLACEHOLDER);
      expect(checkEnvText(filled)).toMatchObject({ ok: true, invalidKeys: [] });
    });

    it('refuses a fake provider in production', () => {
      const filled = fill(example(template), PRODUCTION_VALUES).replace(
        'OTP_PROVIDER=arqam',
        'OTP_PROVIDER=fake',
      );
      expect(checkEnvText(filled)).toMatchObject({ ok: false, invalidKeys: ['OTP_PROVIDER'] });
    });

    it('refuses enabled payments in production while they are paused', () => {
      const filled = fill(example(template), PRODUCTION_VALUES).replace(
        'PAYMENT_PROVIDER=disabled',
        'PAYMENT_PROVIDER=fake',
      );
      expect(checkEnvText(filled)).toMatchObject({ ok: false, invalidKeys: ['PAYMENT_PROVIDER'] });
    });
  });

  it('never echoes a secret value of an invalid file', () => {
    const secret = 'short-secret-value';
    const result = checkEnvText(`NODE_ENV=development\nJWT_ACCESS_SECRET=${secret}\n`);
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain(secret);
  });
});
