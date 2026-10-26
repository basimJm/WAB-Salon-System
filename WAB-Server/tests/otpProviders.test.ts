import type { FetchLike, RedisClientLike } from '@wab/otp';
import type { AppConfig, OtpSettings } from '../src/config';
import { ERROR_CODES } from '../src/constants/errorCodes';
import { createPhoneVerifier } from '../src/domain/auth/phoneVerifier';
import type { OtpGate } from '../src/domain/otp/otpGate.service';
import { createProviders, ProviderUnavailableError } from '../src/providers';
import {
  createWhatsAppOtpProvider,
  FakeOtpProvider,
  mapOtpSdkError,
  toProofResult,
  WhatsAppOtpConfigError,
} from '../src/providers/otp';
import { BusinessRuleError, ExternalServiceError, RateLimitError } from '../src/utils/errors';
import type { Logger } from '../src/utils/logger';
import { normalizeError } from '../src/utils/errors/normalize';

/** SRV-153: the OTP providers (fake + WhatsApp over `@wab/otp`) and `otpToken` checks. */
const PHONE = '+962791234567';
const OTHER = '+962781234567';
const RULES = { codeLength: 6, codeTtlSec: 300, proofTtlSec: 600 } as const;
const ACCESS_TOKEN = 'not-a-real-access-token-value';
const WHATSAPP_ACCOUNT = {
  phoneNumberId: '106540352242922',
  accessToken: ACCESS_TOKEN,
  templateName: 'wab_login_code',
};
const WHATSAPP: OtpSettings = {
  codeSecret: 'c'.repeat(40),
  proofSecret: 'f'.repeat(40),
  whatsapp: WHATSAPP_ACCOUNT,
};

/** Just enough of ioredis for `RedisCodeStore` (its two Lua scripts: SET PX and SET PX NX). */
class MemoryRedis implements RedisClientLike {
  readonly data = new Map<string, string>();
  eval(script: string, _keys: number, ...args: (string | number)[]): Promise<unknown> {
    const [key, value] = args.map(String);
    if (key === undefined || value === undefined) return Promise.reject(new Error('args'));
    if (script.includes("'NX'") && this.data.has(key)) return Promise.resolve(0);
    this.data.set(key, value);
    return Promise.resolve(1);
  }
  pttl(): Promise<number> {
    return Promise.resolve(-1);
  }
  get(key: string): Promise<string | null> {
    return Promise.resolve(this.data.get(key) ?? null);
  }
  del(...keys: string[]): Promise<number> {
    return Promise.resolve(keys.filter((key) => this.data.delete(key)).length);
  }
}

/** Records every log call so tests can prove codes, tokens and full phones never reach a log. */
const capturingLogger = (): { logger: Logger; lines: () => string } => {
  const calls: unknown[] = [];
  const record = (...args: unknown[]): void => {
    calls.push(args);
  };
  const logger = { debug: record, info: record, warn: record, error: record } as never;
  return { logger, lines: () => JSON.stringify(calls) };
};

interface Sent {
  readonly url: string;
  readonly body: Record<string, unknown>;
  readonly headers: Readonly<Record<string, string>>;
}
const metaFetch = (status: number, answer: unknown): { fetch: FetchLike; sent: Sent[] } => {
  const sent: Sent[] = [];
  const fetch: FetchLike = (url, init) => {
    sent.push({
      url,
      body: JSON.parse(init.body) as Record<string, unknown>,
      headers: init.headers,
    });
    return Promise.resolve({ status, text: () => Promise.resolve(JSON.stringify(answer)) });
  };
  return { fetch, sent };
};
const ACCEPTED = { messages: [{ id: 'wamid.HBgLOTYyNzkxMjM0NTY3' }] };

describe('WhatsApp OTP provider', () => {
  const build = (
    status = 200,
    answer: unknown = ACCEPTED,
    settings: OtpSettings = WHATSAPP,
    isProduction = false,
  ): ReturnType<typeof metaFetch> & { otp: ReturnType<typeof createWhatsAppOtpProvider> } & {
    log: () => string;
    redis: MemoryRedis;
  } => {
    const { logger, lines } = capturingLogger();
    const meta = metaFetch(status, answer);
    const redis = new MemoryRedis();
    const otp = createWhatsAppOtpProvider({
      settings,
      redis,
      logger,
      isProduction,
      fetch: meta.fetch,
    });
    return { ...meta, otp, log: lines, redis };
  };

  it('sends the authentication template in the request language and stores only the HMAC', async () => {
    const { otp, sent, redis, log } = build();
    await expect(
      otp.sendCode({ phone: PHONE, purpose: 'LOGIN', language: 'en' }, RULES),
    ).resolves.toEqual({ expiresInSeconds: 300 });
    expect(sent).toHaveLength(1);
    expect(sent[0]?.url).toBe('https://graph.facebook.com/v26.0/106540352242922/messages');
    expect(sent[0]?.headers['authorization']).toBe(`Bearer ${ACCESS_TOKEN}`);
    const template = sent[0]?.body['template'] as {
      name: string;
      language: { code: string };
      components: { parameters: { text: string }[] }[];
    };
    expect(sent[0]?.body['to']).toBe('962791234567');
    expect(template.name).toBe('wab_login_code');
    expect(template.language.code).toBe('en_US');
    const code = template.components[0]?.parameters[0]?.text ?? '';
    expect(code).toMatch(/^\d{6}$/);
    const stored = redis.data.get(`otp:code:LOGIN:${PHONE}`) ?? '';
    expect(stored).not.toContain(code);
    // The right code yields a token; nothing secret is logged.
    const verified = await otp.verifyCode({ phone: PHONE, purpose: 'LOGIN', code }, RULES);
    expect(verified.outcome).toBe('VERIFIED');
    const token = verified.outcome === 'VERIFIED' ? verified.otpToken : '';
    expect(log()).not.toContain(code);
    expect(log()).not.toContain(token);
    expect(log()).not.toContain(ACCESS_TOKEN);
    expect(log()).not.toContain(PHONE);
  });

  it('uses Arabic for ar and the pinned API version', async () => {
    const { otp, sent } = build(200, ACCEPTED, {
      ...WHATSAPP,
      whatsapp: { ...WHATSAPP_ACCOUNT, apiVersion: 'v25.0' },
    });
    await otp.sendCode({ phone: PHONE, purpose: 'REGISTER', language: 'ar' }, RULES);
    expect(sent[0]?.url).toContain('/v25.0/');
    expect((sent[0]?.body['template'] as { language: { code: string } }).language.code).toBe('ar');
  });

  it('maps "not on WhatsApp" (Meta 131026) to 422 OTP_DELIVERY_FAILED and stores no code', async () => {
    const { otp, redis, log } = build(400, {
      error: { code: 131026, message: 'Message undeliverable', fbtrace_id: 'trace-1' },
    });
    const failure = await otp
      .sendCode({ phone: PHONE, purpose: 'LOGIN', language: 'ar' }, RULES)
      .catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(BusinessRuleError);
    expect(normalizeError(failure)).toMatchObject({
      code: ERROR_CODES.OTP_DELIVERY_FAILED,
      httpStatus: 422,
    });
    expect(redis.data.size).toBe(0);
    expect(log()).toContain('trace-1');
    expect(log()).not.toContain(PHONE);
  });

  it('maps a rejected access token (401) to a 503 without vendor text', async () => {
    const { otp, log } = build(401, { error: { code: 190, message: 'Invalid OAuth token' } });
    const failure = await otp
      .sendCode({ phone: PHONE, purpose: 'LOGIN', language: 'ar' }, RULES)
      .catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(ExternalServiceError);
    expect(normalizeError(failure).httpStatus).toBe(503);
    expect(log()).toContain('OTP_AUTH_FAILED');
    expect(log()).not.toContain(ACCESS_TOKEN);
  });

  it('refuses to start without its account or secrets', () => {
    expect(() => build(200, ACCEPTED, { codeSecret: 'c'.repeat(40) })).toThrow(
      WhatsAppOtpConfigError,
    );
    expect(() =>
      build(200, ACCEPTED, { ...WHATSAPP, proofSecret: undefined } as unknown as OtpSettings),
    ).toThrow(WhatsAppOtpConfigError);
  });

  it('refuses a fixed code in production (503 at the first send)', async () => {
    const { otp, sent } = build(200, ACCEPTED, { ...WHATSAPP, fixedCode: '123456' }, true);
    const failure = await otp
      .sendCode({ phone: PHONE, purpose: 'LOGIN', language: 'ar' }, RULES)
      .catch((error: unknown) => error);
    expect(normalizeError(failure).httpStatus).toBe(503);
    expect(sent).toHaveLength(0);
  });

  it('rebuilds the code flow when the settings change', async () => {
    const { otp, sent } = build();
    await otp.sendCode(
      { phone: PHONE, purpose: 'LOGIN', language: 'ar' },
      { ...RULES, codeLength: 4 },
    );
    const template = sent[0]?.body['template'] as {
      components: { parameters: { text: string }[] }[];
    };
    expect(template.components[0]?.parameters[0]?.text).toMatch(/^\d{4}$/);
  });
});

describe('fake OTP provider', () => {
  it('records the code instead of sending it, honours a dev fixed code and issues a working token', async () => {
    const otp = new FakeOtpProvider({ fixedCode: '246810' });
    await otp.sendCode({ phone: PHONE, purpose: 'LOGIN', language: 'ar' }, RULES);
    expect(otp.channel.lastCode(PHONE)).toBe('246810');
    const result = await otp.verifyCode({ phone: PHONE, purpose: 'LOGIN', code: '246810' }, RULES);
    expect(result).toMatchObject({ outcome: 'VERIFIED', expiresInSeconds: 600 });
    const wrong = await otp.verifyCode({ phone: PHONE, purpose: 'LOGIN', code: '246810' }, RULES);
    expect(wrong).toEqual({ outcome: 'EXPIRED' });
  });

  it('answers INVALID_CODE for a wrong code and keeps the code for another try', async () => {
    const otp = new FakeOtpProvider({ fixedCode: '246810' });
    await otp.sendCode({ phone: PHONE, purpose: 'LOGIN', language: 'ar' }, RULES);
    await expect(
      otp.verifyCode({ phone: PHONE, purpose: 'LOGIN', code: '000000' }, RULES),
    ).resolves.toEqual({ outcome: 'INVALID_CODE' });
    await expect(
      otp.verifyCode({ phone: PHONE, purpose: 'LOGIN', code: '246810' }, RULES),
    ).resolves.toMatchObject({ outcome: 'VERIFIED' });
  });

  it('maps SDK errors: input bugs are RangeErrors, unknown errors pass through', () => {
    expect(() => otpTokenVerifyBug()).toThrow(RangeError);
    const plain = new Error('plain');
    expect(() => mapOtpSdkError(plain, PHONE)).toThrow(plain);
  });

  it('fails closed on outcomes the server does not use', () => {
    expect(toProofResult({ outcome: 'BLOCKED' })).toEqual({ outcome: 'INVALID_PROOF' });
    expect(toProofResult({ outcome: 'VERIFIED' })).toEqual({ outcome: 'INVALID_PROOF' });
    expect(toProofResult({ outcome: 'PURPOSE_MISMATCH' })).toEqual({
      outcome: 'PURPOSE_MISMATCH',
    });
  });
});

/** An SDK input-validation error (`OTP_INPUT_INVALID`) is a server bug, not a provider outage. */
const otpTokenVerifyBug = (): never => {
  try {
    // A purpose the SDK refuses: lower case.
    new FakeOtpProvider().issueToken(PHONE, 'login' as never);
  } catch (error) {
    return mapOtpSdkError(error, PHONE);
  }
  throw new Error('expected the SDK to refuse the purpose');
};

describe('otpToken checks through the phone verifier (every phone-verified action)', () => {
  const otp = new FakeOtpProvider();
  let blocked = false;
  const gate = {
    assertNotBlocked: () =>
      blocked
        ? Promise.reject(new RateLimitError({ code: ERROR_CODES.OTP_BLOCKED }))
        : Promise.resolve(),
  } as unknown as OtpGate;
  const phones = createPhoneVerifier({ countries: {} as never, otp, otpGate: gate });
  const resolved = (e164: string): Parameters<typeof phones.verify>[0] => ({
    countryCode: 'JO',
    dialCode: '+962',
    number: e164.slice(4),
    e164,
  });
  const PURPOSES = [
    'LOGIN',
    'REGISTER',
    'CHANGE_PHONE',
    'BOOKING_CONFIRMATION',
    'BANK_DETAILS',
  ] as const;
  const codeOf = async (promise: Promise<void>): Promise<string | undefined> =>
    promise.then(
      () => undefined,
      (error: unknown) => normalizeError(error).code,
    );

  afterEach(() => {
    blocked = false;
  });

  it.each(PURPOSES)('%s: a valid token works once; a replay is OTP_INVALID', async (purpose) => {
    const token = otp.issueToken(PHONE, purpose);
    await expect(phones.verify(resolved(PHONE), token, purpose)).resolves.toBeUndefined();
    expect(await codeOf(phones.verify(resolved(PHONE), token, purpose))).toBe('OTP_INVALID');
  });

  it.each(PURPOSES)('%s: a token of any other purpose is OTP_INVALID', async (purpose) => {
    for (const other of PURPOSES.filter((candidate) => candidate !== purpose)) {
      const token = otp.issueToken(PHONE, other);
      expect(await codeOf(phones.verify(resolved(PHONE), token, purpose))).toBe('OTP_INVALID');
    }
  });

  it('a token of another phone is OTP_INVALID and is not used up by the mismatch', async () => {
    const token = otp.issueToken(PHONE, 'LOGIN');
    expect(await codeOf(phones.verify(resolved(OTHER), token, 'LOGIN'))).toBe('OTP_INVALID');
    await expect(phones.verify(resolved(PHONE), token, 'LOGIN')).resolves.toBeUndefined();
  });

  it('an expired token is OTP_EXPIRED; a tampered or foreign one OTP_INVALID', async () => {
    const expired = otp.issueToken(PHONE, 'LOGIN', { issuedAt: new Date('2020-01-01') });
    expect(await codeOf(phones.verify(resolved(PHONE), expired, 'LOGIN'))).toBe('OTP_EXPIRED');
    const token = otp.issueToken(PHONE, 'LOGIN');
    expect(await codeOf(phones.verify(resolved(PHONE), `${token}x`, 'LOGIN'))).toBe('OTP_INVALID');
    const foreign = new FakeOtpProvider().issueToken(PHONE, 'LOGIN');
    expect(await codeOf(phones.verify(resolved(PHONE), foreign, 'LOGIN'))).toBe('OTP_INVALID');
    expect(await codeOf(phones.verify(resolved(PHONE), 'garbage', 'LOGIN'))).toBe('OTP_INVALID');
  });

  it('a blocked phone is refused before the token is checked (the token stays usable)', async () => {
    const token = otp.issueToken(PHONE, 'LOGIN');
    blocked = true;
    expect(await codeOf(phones.verify(resolved(PHONE), token, 'LOGIN'))).toBe('OTP_BLOCKED');
    blocked = false;
    await expect(phones.verify(resolved(PHONE), token, 'LOGIN')).resolves.toBeUndefined();
  });
});

describe('createProviders: OTP', () => {
  const modes = { otp: 'fake', storage: 'fake', notifier: 'fake', payments: 'fake' } as const;
  const deps = (otp: OtpSettings): { redis: never; logger: Logger; config: AppConfig } => ({
    redis: new MemoryRedis() as never,
    logger: capturingLogger().logger,
    config: { otp } as AppConfig,
  });

  it('builds the fake on the shared Redis with the dev fixed code and configured secrets', async () => {
    const providers = createProviders(
      modes,
      false,
      deps({ fixedCode: '135790', codeSecret: 'c'.repeat(40), proofSecret: 'f'.repeat(40) }),
    );
    const otp = providers.otp as FakeOtpProvider;
    expect(otp).toBeInstanceOf(FakeOtpProvider);
    await otp.sendCode({ phone: PHONE, purpose: 'LOGIN', language: 'ar' }, RULES);
    expect(otp.channel.lastCode(PHONE)).toBe('135790');
  });

  it('builds WhatsApp from the config and refuses the fake in production', () => {
    const whatsapp = createProviders({ ...modes, otp: 'whatsapp' }, false, deps(WHATSAPP));
    expect(whatsapp.otp).not.toBeInstanceOf(FakeOtpProvider);
    expect(() => createProviders(modes, true, deps({}))).toThrow(ProviderUnavailableError);
    expect(() => createProviders({ ...modes, otp: 'whatsapp' }, false, deps({}))).toThrow(
      WhatsAppOtpConfigError,
    );
  });
});
