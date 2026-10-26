import { resolveWhatsApp, type WhatsAppChannelOptions } from '../src/adapters/whatsapp/options';
import { WA } from './helpers/whatsapp';

const base: WhatsAppChannelOptions = { environment: 'dev', ...WA };

const errorOf = (options: WhatsAppChannelOptions): { code: string; details: unknown } | null => {
  try {
    resolveWhatsApp(options);
    return null;
  } catch (error) {
    return error as { code: string; details: unknown };
  }
};

describe('resolveWhatsApp', () => {
  it('fills defaults: Graph base URL, documented API version, timeout and retry', () => {
    const r = resolveWhatsApp(base);
    expect(r.url).toBe('https://graph.facebook.com/v26.0/1234567890/messages');
    expect(r.timeoutMs).toBe(5000);
    expect(r.retry).toEqual({
      maxAttempts: 3,
      baseDelayMs: 200,
      maxDelayMs: 2000,
      jitterRatio: 0.2,
    });
    expect(r.fallbackLanguage).toBeUndefined();
    expect(typeof r.fetch).toBe('function');
  });

  it('keeps consumer values', () => {
    const fetch = (): Promise<never> => Promise.reject(new Error('x'));
    const r = resolveWhatsApp({
      ...base,
      apiVersion: 'v30.0',
      baseUrl: 'http://localhost.test:9000',
      timeoutMs: 50,
      retry: { maxAttempts: 1 },
      fallbackLanguage: 'ar',
      fetch,
    });
    expect(r.url).toBe('http://localhost.test:9000/v30.0/1234567890/messages');
    expect(r).toMatchObject({ timeoutMs: 50, fallbackLanguage: 'ar', fetch });
    expect(r.retry.maxAttempts).toBe(1);
  });

  it.each([
    ['phoneNumberId', { phoneNumberId: '+962 79' }],
    ['accessToken', { accessToken: '  ' }],
    ['templateName', { templateName: 'Bad Name' }],
    ['languageCodes', { languageCodes: {} }],
    ['languageCodes.en', { languageCodes: { en: 'english' } }],
    ['apiVersion', { apiVersion: '26' }],
    ['baseUrl', { baseUrl: 'not a url' }],
    ['timeoutMs', { timeoutMs: 0 }],
    ['retry.jitterRatio', { retry: { jitterRatio: 2 } }],
  ] as const)('refuses a bad %s and names the field, never the value', (field, over) => {
    const error = errorOf({ ...base, ...over });
    expect(error?.code).toBe('OTP_CONFIG_INVALID');
    expect(error?.details).toEqual({ fields: expect.arrayContaining([field]) as unknown });
    expect(JSON.stringify(error)).not.toContain(WA.accessToken);
  });

  it('refuses a fallback language without a code (own keys only)', () => {
    expect(errorOf({ ...base, fallbackLanguage: 'fr' })?.code).toBe('OTP_CONFIG_INVALID');
    expect(errorOf({ ...base, fallbackLanguage: 'toString' })?.code).toBe('OTP_CONFIG_INVALID');
  });

  it('requires https in production', () => {
    expect(errorOf({ ...base, environment: 'prod', baseUrl: 'http://graph.test' })?.code).toBe(
      'OTP_CONFIG_INVALID',
    );
    expect(resolveWhatsApp({ ...base, environment: 'prod' }).url).toMatch(/^https:\/\//);
    expect(
      resolveWhatsApp({ ...base, environment: 'prod', baseUrl: 'https://proxy.test' }).url,
    ).toBe('https://proxy.test/v26.0/1234567890/messages');
  });
});
