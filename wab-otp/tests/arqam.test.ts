import {
  buildSendBody,
  createArqamChannel,
  createArqamOtp,
  normalizeIp,
  templateFor,
} from '../src/adapters/arqam';
import type { ArqamChannelOptions } from '../src/adapters/arqam/options';
import { MemoryCodeStore } from '../src/adapters/code-store/memory';
import type { Logger, OtpMessage } from '../src/ports';
import { accepted, AQ, noSleep, refused, stubArqam, type Reply } from './helpers/arqam';

const PHONE = '+962791234567';
const message = (over: Partial<OtpMessage> = {}): OtpMessage => ({
  to: PHONE,
  code: '123456',
  language: 'ar',
  purpose: 'LOGIN',
  ttlSec: 300,
  ...over,
});

const channelWith = (
  replies: Reply[],
  over: Partial<ArqamChannelOptions> = {},
): {
  channel: ReturnType<typeof createArqamChannel>;
  calls: ReturnType<typeof stubArqam>['calls'];
} => {
  const stub = stubArqam(...replies);
  let n = 0;
  const channel = createArqamChannel({
    environment: 'dev',
    ...AQ,
    fetch: stub.fetch,
    retryDeps: noSleep,
    newIdempotencyKey: () => `idem-${String((n += 1))}`,
    ...over,
  });
  return { channel, calls: stub.calls };
};

const recorder = (): { logger: Logger; lines: string[] } => {
  const lines: string[] = [];
  const record = (msg: string, fields?: unknown): void => {
    lines.push(`${msg} ${JSON.stringify(fields)}`);
  };
  return { logger: { debug: record, info: record, warn: record, error: record }, lines };
};

describe('ARQAM request body', () => {
  const config = { templates: AQ.templates, fallbackLanguage: 'ar', senderId: undefined };

  it('sends our code as otpCode with the template of the app language', () => {
    expect(JSON.parse(buildSendBody(config, message({ language: 'en' })))).toEqual({
      phoneNumber: PHONE,
      otpCode: '123456',
      templateName: 'wab_otp_en',
    });
  });

  it('adds senderId and a normalized ipAddress only when known', () => {
    expect(
      JSON.parse(buildSendBody({ ...config, senderId: 's1' }, message({ ip: '::ffff:10.1.2.3' }))),
    ).toEqual({
      phoneNumber: PHONE,
      otpCode: '123456',
      templateName: 'wab_otp_ar',
      senderId: 's1',
      ipAddress: '10.1.2.3',
    });
    expect(JSON.parse(buildSendBody(config, message({ ip: 'not-an-ip' })))).not.toHaveProperty(
      'ipAddress',
    );
  });

  it('falls back to the fallback language and refuses a language without template', () => {
    expect(templateFor(config, 'fr')).toBe('wab_otp_ar');
    expect(() => templateFor({ ...config, fallbackLanguage: undefined }, 'fr')).toThrow(
      'No ARQAM template for this language',
    );
    expect(() => templateFor({ ...config, fallbackLanguage: undefined }, 'toString')).toThrow(
      'No ARQAM template',
    );
  });

  it('normalizes client IPs', () => {
    expect(normalizeIp(undefined)).toBeUndefined();
    expect(normalizeIp(' 203.0.113.9 ')).toBe('203.0.113.9');
    expect(normalizeIp('::FFFF:203.0.113.9')).toBe('203.0.113.9');
    expect(normalizeIp('2001:db8::1')).toBe('2001:db8::1');
    expect(normalizeIp('::ffff:abcd')).toBe('::ffff:abcd');
    expect(normalizeIp('::ffff:zz')).toBeUndefined();
    expect(normalizeIp('')).toBeUndefined();
  });
});

describe('createArqamChannel.send', () => {
  it('posts to /sms/otp with the key, JSON headers and one idempotency key; returns messageId', async () => {
    const { channel, calls } = channelWith([accepted('uuid-1')]);
    await expect(channel.send(message())).resolves.toEqual({ id: 'uuid-1' });
    expect(channel.name).toBe('arqam');
    expect(channel.isFake).toBeUndefined();
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      url: 'https://otp.arqam.tech/api/sms/otp',
      method: 'POST',
      headers: {
        'x-api-key': AQ.apiKey,
        'content-type': 'application/json',
        accept: 'application/json',
        'idempotency-key': 'idem-1',
      },
      body: { phoneNumber: PHONE, otpCode: '123456', templateName: 'wab_otp_ar' },
    });
  });

  it('retries 5xx, network errors and timeouts with the same idempotency key', async () => {
    const timeout = Object.assign(new Error('slow'), { name: 'TimeoutError' });
    const { channel, calls } = channelWith([{ status: 503 }, timeout, accepted()]);
    await expect(channel.send(message())).resolves.toEqual({ id: 'msg-1' });
    expect(calls).toHaveLength(3);
    expect(new Set(calls.map((c) => c.headers['idempotency-key']))).toEqual(new Set(['idem-1']));
    await channel.send(message());
    expect(calls[3]?.headers['idempotency-key']).toBe('idem-2');
  });

  it('retries RATE_LIMITED after its retryAfter, within the cap', async () => {
    const sleeps: number[] = [];
    const { channel, calls } = channelWith([refused(429, 'RATE_LIMITED', 1), accepted()], {
      retryDeps: { sleep: (ms) => (sleeps.push(ms), Promise.resolve()), random: () => 0.5 },
    });
    await expect(channel.send(message())).resolves.toEqual({ id: 'msg-1' });
    expect(calls).toHaveLength(2);
    expect(sleeps).toEqual([1000]);
    const { channel: slow, calls: slowCalls } = channelWith([
      refused(429, 'RATE_LIMITED', 30),
      accepted(),
    ]);
    await expect(slow.send(message())).rejects.toMatchObject({
      code: 'OTP_RATE_LIMITED',
      retryable: false,
    });
    expect(slowCalls).toHaveLength(1);
  });

  it.each([
    [refused(400, 'INVALID_PHONE'), 'OTP_DELIVERY_FAILED'],
    [refused(502, 'PROVIDER_ERROR'), 'OTP_DELIVERY_FAILED'],
    [refused(401, 'UNAUTHORIZED'), 'OTP_AUTH_FAILED'],
    [refused(400, 'UNKNOWN_AUTH_TEMPLATE'), 'OTP_CONFIG_INVALID'],
    [refused(400, 'SENDER_REQUIRED'), 'OTP_CONFIG_INVALID'],
    [refused(400, 'INVALID_REQUEST'), 'OTP_CONFIG_INVALID'],
    [refused(402, 'INSUFFICIENT_CREDITS'), 'OTP_PROVIDER_UNAVAILABLE'],
    [refused(403, 'SENDER_NOT_AVAILABLE'), 'OTP_PROVIDER_UNAVAILABLE'],
    [refused(429, 'RATE_LIMIT_PHONE'), 'OTP_RATE_LIMITED'],
    [refused(429, 'RATE_LIMIT_IP'), 'OTP_RATE_LIMITED'],
    [{ status: 400, raw: 'not json' }, 'OTP_UNKNOWN'],
  ] as const)('does not retry a final refusal (%#)', async (reply, code) => {
    const { channel, calls } = channelWith([reply, accepted()]);
    await expect(channel.send(message())).rejects.toMatchObject({ code, retryable: false });
    expect(calls).toHaveLength(1);
  });

  it('gives up after maxAttempts on an outage', async () => {
    const { channel, calls } = channelWith([{ status: 500 }], { retry: { maxAttempts: 2 } });
    await expect(channel.send(message())).rejects.toMatchObject({
      code: 'OTP_PROVIDER_UNAVAILABLE',
      retryable: true,
    });
    expect(calls).toHaveLength(2);
  });

  it('refuses a 2xx answer without messageId and never retries it', async () => {
    for (const reply of [
      { status: 200, body: { success: false, messageId: 'm' } },
      { status: 200, body: { success: true } },
      { status: 200, body: { success: true, messageId: '' } },
      { status: 200, body: [] },
      { status: 200, raw: '<html>' },
    ]) {
      const { channel, calls } = channelWith([reply, accepted()]);
      await expect(channel.send(message())).rejects.toMatchObject({
        code: 'OTP_MALFORMED_RESPONSE',
        retryable: false,
      });
      expect(calls).toHaveLength(1);
    }
  });

  it('refuses codes ARQAM cannot carry before calling it', async () => {
    const { channel, calls } = channelWith([accepted()]);
    for (const code of ['123', '1234567', '12a456']) {
      await expect(channel.send(message({ code }))).rejects.toMatchObject({
        code: 'OTP_CONFIG_INVALID',
      });
    }
    await expect(channel.send(message({ code: '1234' }))).resolves.toEqual({ id: 'msg-1' });
    expect(calls).toHaveLength(1);
  });

  it('passes senderId and the client IP when given', async () => {
    const { channel, calls } = channelWith([accepted()], { senderId: 'wab_sender' });
    await channel.send(message({ ip: '198.51.100.7' }));
    expect(calls[0]?.body).toMatchObject({ senderId: 'wab_sender', ipAddress: '198.51.100.7' });
  });

  it('never logs the key, the code or the full phone', async () => {
    const { logger, lines } = recorder();
    const { channel } = channelWith(
      [
        { status: 502 },
        refused(400, 'INVALID_PHONE'),
        { status: 418, body: { errorMessage: `bad ${PHONE}` } },
      ],
      { logger },
    );
    await expect(channel.send(message())).rejects.toMatchObject({ code: 'OTP_DELIVERY_FAILED' });
    await expect(channel.send(message())).rejects.toMatchObject({ code: 'OTP_UNKNOWN' });
    const all = lines.join('\n');
    expect(all).toContain('INVALID_PHONE');
    expect(all).toContain('arqam send retry');
    expect(all).toContain('arqam send refused');
    expect(all).not.toContain(AQ.apiKey);
    expect(all).not.toContain('123456');
    expect(all).not.toContain('962791234567');
  });

  it('uses the global fetch when none is injected', () => {
    expect(() => createArqamChannel({ environment: 'dev', ...AQ })).not.toThrow();
  });
});

describe('createArqamChannel lookups', () => {
  it('reads the account (GET, key, no body, no idempotency key)', async () => {
    const { channel, calls } = channelWith([
      { status: 200, body: { mode: 'test', balance: 500, status: 'active' } },
    ]);
    await expect(channel.getAccount()).resolves.toEqual({
      mode: 'TEST',
      balance: 500,
      status: 'active',
    });
    expect(calls[0]).toMatchObject({
      url: 'https://otp.arqam.tech/api/sms/account',
      method: 'GET',
      headers: { 'x-api-key': AQ.apiKey, accept: 'application/json' },
      body: undefined,
    });
    expect(calls[0]?.headers).not.toHaveProperty('idempotency-key');
    expect(calls[0]?.headers).not.toHaveProperty('content-type');
  });

  it('maps account refusals and malformed answers', async () => {
    const { channel } = channelWith([refused(401, 'UNAUTHORIZED')]);
    await expect(channel.getAccount()).rejects.toMatchObject({ code: 'OTP_AUTH_FAILED' });
    const { channel: odd } = channelWith([{ status: 200, raw: 'oops' }]);
    await expect(odd.getAccount()).rejects.toMatchObject({ code: 'OTP_MALFORMED_RESPONSE' });
  });

  it('reads the delivery history of a message (id URL-encoded)', async () => {
    const { channel, calls } = channelWith([
      { status: 200, body: { messageId: 'a/b', currentStatus: 'delivered', history: [] } },
    ]);
    await expect(channel.getDeliveryStatus('a/b')).resolves.toEqual({
      messageId: 'a/b',
      state: 'DELIVERED',
      history: [],
    });
    expect(calls[0]?.url).toBe('https://otp.arqam.tech/api/messages/a%2Fb/history');
  });

  it('validates the message id and maps history errors', async () => {
    const { channel, calls } = channelWith([{ status: 200, body: {} }]);
    await expect(channel.getDeliveryStatus(' ')).rejects.toMatchObject({
      code: 'OTP_INPUT_INVALID',
    });
    await expect(channel.getDeliveryStatus(3 as unknown as string)).rejects.toMatchObject({
      code: 'OTP_INPUT_INVALID',
    });
    expect(calls).toHaveLength(0);
    await expect(channel.getDeliveryStatus('m')).rejects.toMatchObject({
      code: 'OTP_MALFORMED_RESPONSE',
    });
  });
});

describe('createArqamOtp', () => {
  const secrets = { codeSecret: 'c'.repeat(32), proofSecret: 'p'.repeat(32) };

  it('sends the generated code through ARQAM and verifies it into an otpToken', async () => {
    const stub = stubArqam(accepted('m-9'), { status: 200, body: { mode: 'live', balance: 9 } });
    const logs: string[] = [];
    const otp = createArqamOtp({
      environment: 'dev',
      store: new MemoryCodeStore(),
      ...secrets,
      randomInt: () => 4242,
      logger: {
        debug: () => undefined,
        info: (m) => logs.push(m),
        warn: () => undefined,
        error: () => undefined,
      },
      arqam: { ...AQ, fetch: stub.fetch, retryDeps: noSleep },
    });
    expect(otp.channelName).toBe('arqam');
    await expect(
      otp.sendCode({ phone: PHONE, purpose: 'LOGIN', language: 'en', ip: '203.0.113.1' }),
    ).resolves.toEqual({ expiresInSec: 300, messageId: 'm-9' });
    expect(stub.calls[0]?.body).toMatchObject({
      otpCode: '004242',
      templateName: 'wab_otp_en',
      ipAddress: '203.0.113.1',
    });
    const verified = await otp.verifyCode({ phone: PHONE, purpose: 'LOGIN', code: '004242' });
    expect(verified).toMatchObject({ outcome: 'VERIFIED', phone: PHONE, expiresInSec: 600 });
    expect(logs).toContain('otp code sent');
    await expect(otp.getAccount()).resolves.toMatchObject({ mode: 'LIVE', balance: 9 });
  });

  it('removes the stored code when ARQAM refuses the recipient', async () => {
    const stub = stubArqam(refused(400, 'INVALID_PHONE'));
    const otp = createArqamOtp({
      environment: 'dev',
      store: new MemoryCodeStore(),
      ...secrets,
      randomInt: () => 1,
      arqam: { ...AQ, fetch: stub.fetch, retryDeps: noSleep },
    });
    await expect(
      otp.sendCode({ phone: PHONE, purpose: 'LOGIN', language: 'ar' }),
    ).rejects.toMatchObject({ code: 'OTP_DELIVERY_FAILED' });
    await expect(
      otp.verifyCode({ phone: PHONE, purpose: 'LOGIN', code: '000001' }),
    ).resolves.toEqual({ outcome: 'EXPIRED' });
    await expect(otp.getDeliveryStatus('')).rejects.toMatchObject({ code: 'OTP_INPUT_INVALID' });
  });

  it('keeps an explicit ARQAM logger, enforces https and refuses fixed codes in production', () => {
    const base = {
      store: Object.assign(new MemoryCodeStore(), { scope: 'shared' as const }),
      ...secrets,
    };
    const { logger } = recorder();
    expect(() =>
      createArqamOtp({
        ...base,
        environment: 'prod',
        logger,
        arqam: { ...AQ, logger, baseUrl: 'http://otp.arqam.test/api' },
      }),
    ).toThrow('https');
    expect(() =>
      createArqamOtp({ ...base, environment: 'prod', fixedCode: '123456', arqam: { ...AQ } }),
    ).toThrow('fixedCode is refused in production');
    expect(createArqamOtp({ ...base, environment: 'prod', arqam: { ...AQ } }).channelName).toBe(
      'arqam',
    );
  });
});
