import { resolveArqam, type ArqamChannelOptions } from '../src/adapters/arqam/options';
import { isOtpError } from '../src/errors';
import { AQ } from './helpers/arqam';

const base: ArqamChannelOptions = { environment: 'dev', ...AQ };

const fieldsOf = (options: ArqamChannelOptions): unknown => {
  try {
    resolveArqam(options);
    return null;
  } catch (error) {
    return isOtpError(error) ? error.details['fields'] : error;
  }
};

describe('resolveArqam', () => {
  it('fills the defaults', () => {
    const resolved = resolveArqam({ ...base, apiKey: '  aq_key  ' });
    expect(resolved).toMatchObject({
      baseUrl: 'https://otp.arqam.tech/api',
      apiKey: 'aq_key',
      timeoutMs: 5000,
      maxRetryAfterMs: 2000,
      senderId: undefined,
      fallbackLanguage: 'ar',
      retry: { maxAttempts: 3, baseDelayMs: 200, maxDelayMs: 2000, jitterRatio: 0.2 },
    });
    expect(typeof resolved.newIdempotencyKey()).toBe('string');
    expect(resolved.newIdempotencyKey()).not.toBe(resolved.newIdempotencyKey());
    expect(resolved.fetch).toBe(globalThis.fetch);
  });

  it('keeps overrides and strips trailing slashes', () => {
    const resolved = resolveArqam({
      ...base,
      baseUrl: 'http://localhost:4010/api//',
      senderId: 'sender_1',
      timeoutMs: 100,
      maxRetryAfterMs: 0,
      retry: { maxAttempts: 1 },
      newIdempotencyKey: () => 'k',
    });
    expect(resolved).toMatchObject({
      baseUrl: 'http://localhost:4010/api',
      senderId: 'sender_1',
      timeoutMs: 100,
      maxRetryAfterMs: 0,
      retry: { maxAttempts: 1, baseDelayMs: 200 },
    });
    expect(resolved.newIdempotencyKey()).toBe('k');
  });

  it('names invalid fields, never their values', () => {
    expect(fieldsOf({ ...base, apiKey: '   ' })).toEqual(['apiKey']);
    expect(fieldsOf({ ...base, templates: {} })).toEqual(['templates']);
    expect(fieldsOf({ ...base, templates: { ar: 'bad name!' } })).toEqual(['templates.ar']);
    expect(fieldsOf({ ...base, senderId: 'x y' })).toEqual(['senderId']);
    expect(fieldsOf({ ...base, baseUrl: 'not a url' })).toEqual(['baseUrl']);
    expect(fieldsOf({ ...base, timeoutMs: 0 })).toEqual(['timeoutMs']);
    expect(fieldsOf({ ...base, maxRetryAfterMs: -1 })).toEqual(['maxRetryAfterMs']);
    expect(fieldsOf({ ...base, retry: { maxAttempts: 0 } })).toEqual(['retry.maxAttempts']);
    expect(fieldsOf({ ...base, environment: 'staging' as 'dev' })).toEqual(['environment']);
    expect(JSON.stringify(fieldsOf({ ...base, apiKey: '' }))).not.toContain(AQ.apiKey);
  });

  it('refuses a fallback language without a template', () => {
    expect(() => resolveArqam({ ...base, fallbackLanguage: 'fr' })).toThrow(
      'ARQAM fallbackLanguage has no template',
    );
    expect(
      resolveArqam({ environment: 'dev', apiKey: AQ.apiKey, templates: AQ.templates })
        .fallbackLanguage,
    ).toBeUndefined();
  });

  it('requires https in production only', () => {
    expect(() =>
      resolveArqam({ ...base, environment: 'prod', baseUrl: 'http://otp.arqam.test/api' }),
    ).toThrow('https in production');
    expect(resolveArqam({ ...base, environment: 'prod' }).baseUrl).toBe(
      'https://otp.arqam.tech/api',
    );
    expect(resolveArqam({ ...base, baseUrl: 'http://127.0.0.1:4010' }).baseUrl).toBe(
      'http://127.0.0.1:4010',
    );
  });
});
