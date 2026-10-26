import { FakeOtpChannel, MemoryCodeStore, type FetchLike, type RedisClientLike } from '@wab/otp';
import type { AppConfig, OtpSettings } from '../src/config';
import { ERROR_CODES } from '../src/constants/errorCodes';
import { createPhoneVerifier } from '../src/domain/auth/phoneVerifier';
import type { OtpGate } from '../src/domain/otp/otpGate.service';
import { createProviders, ProviderUnavailableError } from '../src/providers';
import {
  ArqamOtpConfigError,
  createArqamOtpProvider,
  createSdkOtp,
  FakeOtpProvider,
  mapOtpSdkError,
  reportArqamAccount,
  toProofResult,
} from '../src/providers/otp';
import { BusinessRuleError, ExternalServiceError, RateLimitError } from '../src/utils/errors';
import type { Logger } from '../src/utils/logger';
import { normalizeError } from '../src/utils/errors/normalize';

/** SRV-153 / SRV-158: the OTP providers (fake + ARQAM over `@wab/otp`) and `otpToken` checks. */
const PHONE = '+962791234567';
const OTHER = '+962781234567';
const RULES = { codeLength: 6, codeTtlSec: 300, proofTtlSec: 600 } as const;
const API_KEY = 'not-a-real-arqam-key-value';
const ARQAM_PROJECT = {
  apiKey: API_KEY,
  templates: { ar: 'wab_otp_ar', en: 'wab_otp_en' },
  sendIp: false,
};
const ARQAM: OtpSettings = {
  codeSecret: 'c'.repeat(40),
  proofSecret: 'f'.repeat(40),
  arqam: ARQAM_PROJECT,
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

/** Records every log call so tests can prove codes, keys and full phones never reach a log. */
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
  readonly method: string;
  readonly body: Record<string, unknown>;
  readonly headers: Readonly<Record<string, string>>;
}
/** A stubbed ARQAM API: no network, one scripted answer for every call. */
const arqamFetch = (status: number, answer: unknown): { fetch: FetchLike; sent: Sent[] } => {
  const sent: Sent[] = [];
  const fetch: FetchLike = (url, init) => {
    sent.push({
      url,
      method: init.method,
      body: init.body === undefined ? {} : (JSON.parse(init.body) as Record<string, unknown>),
      headers: init.headers,
    });
    return Promise.resolve({ status, text: () => Promise.resolve(JSON.stringify(answer)) });
  };
  return { fetch, sent };
};
const ACCEPTED = { success: true, messageId: '7b0c0b8e-msg', status: 'sent', cost: 25 };
const refusal = (errorCode: string): unknown => ({
  success: false,
  errorCode,
  errorMessage: 'arqam says no',
});

type ArqamProvider = ReturnType<typeof createArqamOtpProvider>;

describe('ARQAM OTP provider', () => {
  const build = (
    status = 200,
    answer: unknown = ACCEPTED,
    settings: OtpSettings = ARQAM,
    isProduction = false,
  ): ReturnType<typeof arqamFetch> & {
    otp: ArqamProvider;
    log: () => string;
    redis: MemoryRedis;
  } => {
    const { logger, lines } = capturingLogger();
    const stub = arqamFetch(status, answer);
    const redis = new MemoryRedis();
    const otp = createArqamOtpProvider({
      settings,
      redis,
      logger,
      isProduction,
      fetch: stub.fetch,
    });
    return { ...stub, otp, log: lines, redis };
  };
  const send = (otp: ArqamProvider, language: 'ar' | 'en' = 'ar', ip?: string): Promise<unknown> =>
    otp
      .sendCode(
        { phone: PHONE, purpose: 'LOGIN', language, ...(ip === undefined ? {} : { ip }) },
        RULES,
      )
      .catch((error: unknown) => error);

  it('hands our code to ARQAM with the English template and stores only the HMAC', async () => {
    const { otp, sent, redis, log } = build();
    await expect(
      otp.sendCode({ phone: PHONE, purpose: 'LOGIN', language: 'en' }, RULES),
    ).resolves.toEqual({ expiresInSeconds: 300 });
    expect(sent).toHaveLength(1);
    expect(sent[0]?.url).toBe('https://otp.arqam.tech/api/sms/otp');
    expect(sent[0]?.method).toBe('POST');
    expect(sent[0]?.headers['x-api-key']).toBe(API_KEY);
    expect(sent[0]?.headers['idempotency-key']).toMatch(/^[0-9a-f-]{36}$/);
    expect(sent[0]?.body).toMatchObject({ phoneNumber: PHONE, templateName: 'wab_otp_en' });
    expect(sent[0]?.body).not.toHaveProperty('ipAddress');
    expect(sent[0]?.body).not.toHaveProperty('senderId');
    const code = String(sent[0]?.body['otpCode']);
    expect(code).toMatch(/^\d{6}$/);
    expect(redis.data.get(`otp:code:LOGIN:${PHONE}`) ?? '').not.toContain(code);
    const verified = await otp.verifyCode({ phone: PHONE, purpose: 'LOGIN', code }, RULES);
    expect(verified.outcome).toBe('VERIFIED');
    const token = verified.outcome === 'VERIFIED' ? verified.otpToken : '';
    expect(log()).not.toContain(code);
    expect(log()).not.toContain(token);
    expect(log()).not.toContain(API_KEY);
    expect(log()).not.toContain(PHONE);
  });

  it('uses the Arabic template for ar, the sender id and a custom base URL', async () => {
    const { otp, sent } = build(200, ACCEPTED, {
      ...ARQAM,
      arqam: { ...ARQAM_PROJECT, senderId: 'wab_sender', baseUrl: 'http://127.0.0.1:4010/api' },
    });
    await send(otp, 'ar');
    expect(sent[0]?.url).toBe('http://127.0.0.1:4010/api/sms/otp');
    expect(sent[0]?.body).toMatchObject({ templateName: 'wab_otp_ar', senderId: 'wab_sender' });
  });

  it('passes the client IP only when ARQAM_SEND_IP is on', async () => {
    const off = build();
    await send(off.otp, 'ar', '::ffff:203.0.113.7');
    expect(off.sent[0]?.body).not.toHaveProperty('ipAddress');
    const on = build(200, ACCEPTED, { ...ARQAM, arqam: { ...ARQAM_PROJECT, sendIp: true } });
    await send(on.otp, 'ar', '::ffff:203.0.113.7');
    expect(on.sent[0]?.body['ipAddress']).toBe('203.0.113.7');
    await send(on.otp, 'ar');
    expect(on.sent[1]?.body).not.toHaveProperty('ipAddress');
  });

  it.each([
    [400, 'INVALID_PHONE'],
    [502, 'PROVIDER_ERROR'],
  ])('maps %i %s to 422 OTP_DELIVERY_FAILED and stores no code', async (status, errorCode) => {
    const { otp, redis, log, sent } = build(status, refusal(errorCode));
    const failure = await send(otp);
    expect(failure).toBeInstanceOf(BusinessRuleError);
    expect(normalizeError(failure)).toMatchObject({
      code: ERROR_CODES.OTP_DELIVERY_FAILED,
      httpStatus: 422,
    });
    expect(sent).toHaveLength(1);
    expect(redis.data.size).toBe(0);
    expect(log()).toContain(errorCode);
    expect(log()).not.toContain(PHONE);
  });

  it.each([
    [401, 'UNAUTHORIZED', 'OTP_AUTH_FAILED'],
    [402, 'INSUFFICIENT_CREDITS', 'OTP_PROVIDER_UNAVAILABLE'],
    [403, 'SENDER_NOT_AVAILABLE', 'OTP_PROVIDER_UNAVAILABLE'],
    [400, 'SENDER_REQUIRED', 'OTP_CONFIG_INVALID'],
    [400, 'UNKNOWN_AUTH_TEMPLATE', 'OTP_CONFIG_INVALID'],
    [400, 'INVALID_REQUEST', 'OTP_CONFIG_INVALID'],
    [429, 'RATE_LIMIT_PHONE', 'OTP_RATE_LIMITED'],
    [429, 'RATE_LIMIT_IP', 'OTP_RATE_LIMITED'],
  ])('maps %i %s to a 503 logged as an error (%s)', async (status, errorCode, sdk) => {
    const { otp, log } = build(status, refusal(errorCode));
    const failure = await send(otp);
    expect(failure).toBeInstanceOf(ExternalServiceError);
    expect(normalizeError(failure).httpStatus).toBe(503);
    expect(log()).toContain(sdk);
    expect(log()).toContain('otp provider failed');
    expect(log()).not.toContain(API_KEY);
    expect(log()).not.toContain('arqam says no');
  });

  it('refuses to start without its project or secrets', () => {
    expect(() => build(200, ACCEPTED, { codeSecret: 'c'.repeat(40) })).toThrow(ArqamOtpConfigError);
    expect(() =>
      build(200, ACCEPTED, { ...ARQAM, proofSecret: undefined } as unknown as OtpSettings),
    ).toThrow(ArqamOtpConfigError);
  });

  it('refuses http in production at startup and a fixed code at the first send', async () => {
    const http = { ...ARQAM, arqam: { ...ARQAM_PROJECT, baseUrl: 'http://arqam.test' } };
    expect(() => build(200, ACCEPTED, http, true)).toThrow('https');
    const { otp, sent } = build(200, ACCEPTED, { ...ARQAM, fixedCode: '123456' }, true);
    expect(normalizeError(await send(otp)).httpStatus).toBe(503);
    expect(sent).toHaveLength(0);
  });

  it('rebuilds the code flow when the settings change; a code ARQAM cannot carry is a 503', async () => {
    const { otp, sent } = build();
    const input = { phone: PHONE, purpose: 'LOGIN', language: 'ar' } as const;
    await otp.sendCode(input, { ...RULES, codeLength: 4 });
    expect(String(sent[0]?.body['otpCode'])).toMatch(/^\d{4}$/);
    const tooLong = await otp
      .sendCode(input, { ...RULES, codeLength: 8 })
      .catch((error: unknown) => error);
    expect(normalizeError(tooLong).httpStatus).toBe(503);
    expect(sent).toHaveLength(1);
  });

  it('reads the ARQAM account (GET /sms/account)', async () => {
    const { otp, sent } = build(200, { mode: 'test', balance: 300 });
    await expect(otp.account()).resolves.toMatchObject({ mode: 'TEST', balance: 300 });
    expect(sent[0]).toMatchObject({
      url: 'https://otp.arqam.tech/api/sms/account',
      method: 'GET',
    });
  });
});

describe('reportArqamAccount (startup, never blocking)', () => {
  const account = (answer: Promise<unknown>): Parameters<typeof reportArqamAccount>[0] => ({
    account: () => answer as never,
  });

  it('logs the mode and balance', async () => {
    const { logger, lines } = capturingLogger();
    await reportArqamAccount(account(Promise.resolve({ mode: 'LIVE', balance: 10 })), true, logger);
    expect(lines()).toContain('arqam otp account');
    expect(lines()).toContain('LIVE');
  });

  it('flags a TEST key with NODE_ENV=production as an error, not in development', async () => {
    const prod = capturingLogger();
    await reportArqamAccount(account(Promise.resolve({ mode: 'TEST' })), true, prod.logger);
    expect(prod.lines()).toContain('TEST key with NODE_ENV=production');
    const dev = capturingLogger();
    await reportArqamAccount(account(Promise.resolve({ mode: 'TEST' })), false, dev.logger);
    expect(dev.lines()).not.toContain('TEST key with NODE_ENV=production');
  });

  it('logs a failed check without throwing', async () => {
    const { logger, lines } = capturingLogger();
    const failing = Object.assign(new Error('x'), { code: 'OTP_AUTH_FAILED' });
    await expect(
      reportArqamAccount(account(Promise.reject(failing)), true, logger),
    ).resolves.toBeUndefined();
    expect(lines()).toContain('OTP_AUTH_FAILED');
    await reportArqamAccount(account(Promise.reject(new Error('plain'))), true, logger);
    expect(lines()).toContain('unknown');
  });
});

describe('createSdkOtp IP forwarding', () => {
  it('drops the IP unless forwardIp is on', async () => {
    const channel = new FakeOtpChannel();
    const deps = {
      environment: 'dev' as const,
      channel,
      store: new MemoryCodeStore(),
      codeSecret: 'c'.repeat(40),
      proofSecret: 'f'.repeat(40),
    };
    const input = { phone: PHONE, purpose: 'LOGIN', language: 'ar', ip: '203.0.113.1' } as const;
    await createSdkOtp(deps).sendCode(input, RULES);
    expect(channel.sent[0]).not.toHaveProperty('ip');
    await createSdkOtp({ ...deps, forwardIp: true }).sendCode(input, RULES);
    expect(channel.sent[1]?.ip).toBe('203.0.113.1');
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

  it('builds ARQAM from the config and refuses the fake in production', () => {
    const arqam = createProviders({ ...modes, otp: 'arqam' }, false, deps(ARQAM));
    expect(arqam.otp).not.toBeInstanceOf(FakeOtpProvider);
    expect(() => createProviders(modes, true, deps({}))).toThrow(ProviderUnavailableError);
    expect(() => createProviders({ ...modes, otp: 'arqam' }, false, deps({}))).toThrow(
      ArqamOtpConfigError,
    );
    expect(() => createProviders({ ...modes, otp: 'arqam' }, false)).toThrow(
      ProviderUnavailableError,
    );
  });

  it('reports the OTP account only for ARQAM (the fake has nothing to report)', async () => {
    await expect(
      createProviders(modes, false, deps({})).reportOtpAccount(),
    ).resolves.toBeUndefined();
    const realFetch = globalThis.fetch;
    const stub = arqamFetch(200, { mode: 'live', balance: 5 });
    globalThis.fetch = stub.fetch as typeof globalThis.fetch;
    try {
      await createProviders({ ...modes, otp: 'arqam' }, false, deps(ARQAM)).reportOtpAccount();
    } finally {
      globalThis.fetch = realFetch;
    }
    expect(stub.sent[0]?.url).toBe('https://otp.arqam.tech/api/sms/account');
  });
});
