import {
  buildTemplateBody,
  createWhatsAppChannel,
  createWhatsAppOtp,
} from '../src/adapters/whatsapp';
import { MemoryCodeStore } from '../src/adapters/code-store/memory';
import type { WhatsAppChannelOptions } from '../src/adapters/whatsapp/options';
import { isOtpError } from '../src/errors';
import type { Logger, OtpMessage } from '../src/ports';
import { accepted, metaError, noSleep, stubMeta, WA, type Reply } from './helpers/whatsapp';

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
  over: Partial<WhatsAppChannelOptions> = {},
): {
  channel: ReturnType<typeof createWhatsAppChannel>;
  calls: ReturnType<typeof stubMeta>['calls'];
} => {
  const stub = stubMeta(...replies);
  const channel = createWhatsAppChannel({
    environment: 'dev',
    ...WA,
    fetch: stub.fetch,
    retryDeps: noSleep,
    ...over,
  });
  return { channel, calls: stub.calls };
};

describe('WhatsApp authentication template body', () => {
  it('puts the code in the body and in the copy-code button, without the leading +', () => {
    const body: unknown = JSON.parse(
      buildTemplateBody(
        { templateName: 'wab_otp', languageCodes: WA.languageCodes, fallbackLanguage: undefined },
        message({ language: 'en' }),
      ),
    );
    expect(body).toEqual({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: '962791234567',
      type: 'template',
      template: {
        name: 'wab_otp',
        language: { code: 'en_US' },
        components: [
          { type: 'body', parameters: [{ type: 'text', text: '123456' }] },
          {
            type: 'button',
            sub_type: 'url',
            index: '0',
            parameters: [{ type: 'text', text: '123456' }],
          },
        ],
      },
    });
  });

  it('maps the app language, falls back when configured, refuses otherwise', () => {
    const config = { templateName: 't', languageCodes: WA.languageCodes, fallbackLanguage: 'ar' };
    const lang = (language: string, fallback?: string): unknown =>
      (
        JSON.parse(
          buildTemplateBody({ ...config, fallbackLanguage: fallback }, message({ language })),
        ) as { template: { language: { code: string } } }
      ).template.language.code;
    expect(lang('ar')).toBe('ar');
    expect(lang('fr', 'ar')).toBe('ar');
    expect(() => lang('fr')).toThrow('No WhatsApp template language');
    expect(() => lang('toString')).toThrow('No WhatsApp template language');
    expect(
      (JSON.parse(buildTemplateBody(config, message({ to: '962791234567' }))) as { to: string }).to,
    ).toBe('962791234567');
  });
});

describe('createWhatsAppChannel', () => {
  it('posts to the Graph messages endpoint with the bearer token and returns the wamid', async () => {
    const { channel, calls } = channelWith([accepted('wamid.ABC')]);
    await expect(channel.send(message())).resolves.toEqual({ id: 'wamid.ABC' });
    expect(channel.name).toBe('whatsapp');
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      url: 'https://graph.facebook.com/v26.0/1234567890/messages',
      method: 'POST',
      headers: {
        authorization: 'Bearer EAAtest-token-value',
        'content-type': 'application/json',
        accept: 'application/json',
      },
    });
  });

  it('uses the configured base URL (trailing slash removed) and API version', async () => {
    const { channel, calls } = channelWith([accepted()], {
      baseUrl: 'http://mock.test:8080/',
      apiVersion: 'v27.1',
    });
    await channel.send(message());
    expect(calls[0]?.url).toBe('http://mock.test:8080/v27.1/1234567890/messages');
  });

  it('retries 5xx and 429 then succeeds', async () => {
    const { channel, calls } = channelWith([{ status: 503 }, { status: 429 }, accepted()]);
    await expect(channel.send(message())).resolves.toEqual({ id: 'wamid.TEST' });
    expect(calls).toHaveLength(3);
  });

  it('retries Meta rate limits (130429) and temporary errors (131000) up to maxAttempts', async () => {
    const { channel, calls } = channelWith([metaError(400, 130429), metaError(500, 131000)], {
      retry: { maxAttempts: 2 },
    });
    await expect(channel.send(message())).rejects.toMatchObject({
      code: 'OTP_PROVIDER_UNAVAILABLE',
      retryable: true,
    });
    expect(calls).toHaveLength(2);
  });

  it.each([
    [metaError(400, 131026), 'OTP_DELIVERY_FAILED'],
    [metaError(400, 131030), 'OTP_DELIVERY_FAILED'],
    [metaError(401, 190), 'OTP_AUTH_FAILED'],
    [metaError(404, 132001), 'OTP_CONFIG_INVALID'],
    [metaError(400, 131048), 'OTP_RATE_LIMITED'],
    [{ status: 400, raw: 'not json' }, 'OTP_UNKNOWN'],
    [{ status: 403 }, 'OTP_AUTH_FAILED'],
  ] as const)('does not retry a non-retryable answer (%#)', async (reply, code) => {
    const { channel, calls } = channelWith([reply, accepted()]);
    await expect(channel.send(message())).rejects.toMatchObject({ code, retryable: false });
    expect(calls).toHaveLength(1);
  });

  it('maps a timeout and a network failure to retryable errors', async () => {
    const timeout = Object.assign(new Error('slow'), { name: 'TimeoutError' });
    const { channel, calls } = channelWith([timeout, new TypeError('fetch failed'), accepted()]);
    await expect(channel.send(message())).resolves.toEqual({ id: 'wamid.TEST' });
    expect(calls).toHaveLength(3);
    const { channel: down } = channelWith([timeout], { retry: { maxAttempts: 1 } });
    await expect(down.send(message())).rejects.toMatchObject({ code: 'OTP_TIMEOUT' });
  });

  it('aborts a request that exceeds timeoutMs', async () => {
    const hanging = createWhatsAppChannel({
      environment: 'dev',
      ...WA,
      timeoutMs: 5,
      retry: { maxAttempts: 1 },
      fetch: (_url, init) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () => {
            reject(init.signal.reason as Error);
          });
        }),
    });
    await expect(hanging.send(message())).rejects.toMatchObject({ code: 'OTP_TIMEOUT' });
  });

  it('refuses a 2xx answer without a message id and does not retry it', async () => {
    const { channel, calls } = channelWith([{ status: 200, body: { messages: [] } }, accepted()]);
    await expect(channel.send(message())).rejects.toMatchObject({
      code: 'OTP_MALFORMED_RESPONSE',
      retryable: false,
    });
    expect(calls).toHaveLength(1);
    for (const body of [
      null,
      { messages: 'x' },
      { messages: [null] },
      { messages: [{ id: '' }] },
    ]) {
      const { channel: odd } = channelWith([{ status: 200, body }]);
      await expect(odd.send(message())).rejects.toMatchObject({ code: 'OTP_MALFORMED_RESPONSE' });
    }
    const { channel: garbage } = channelWith([{ status: 200, raw: '<html>' }]);
    await expect(garbage.send(message())).rejects.toMatchObject({ code: 'OTP_MALFORMED_RESPONSE' });
  });

  it('refuses codes longer than 15 characters before calling Meta', async () => {
    const { channel, calls } = channelWith([accepted()]);
    await expect(channel.send(message({ code: '1'.repeat(16) }))).rejects.toMatchObject({
      code: 'OTP_INPUT_INVALID',
    });
    expect(calls).toHaveLength(0);
  });

  it('never logs the token, the code or the full phone', async () => {
    const lines: string[] = [];
    const record = (msg: string, fields?: unknown): void => {
      lines.push(`${msg} ${JSON.stringify(fields)}`);
    };
    const logger: Logger = { debug: record, info: record, warn: record, error: record };
    const { channel } = channelWith(
      [{ status: 502 }, metaError(400, 131026), metaError(400, 999)],
      {
        logger,
      },
    );
    await expect(channel.send(message())).rejects.toMatchObject({ code: 'OTP_DELIVERY_FAILED' });
    await expect(channel.send(message())).rejects.toMatchObject({ code: 'OTP_UNKNOWN' });
    const all = lines.join('\n');
    expect(all).toContain('OTP_DELIVERY_FAILED');
    expect(all).toContain('131026');
    expect(all).not.toContain('EAAtest');
    expect(all).not.toContain('123456');
    expect(all).not.toContain('962791234567');
  });

  it('wraps a non-Error rejection as a network error', async () => {
    const { channel } = channelWith([], {
      retry: { maxAttempts: 1 },
      fetch: () => Promise.reject(new Error('boom')),
    });
    const error: unknown = await channel.send(message()).catch((e: unknown) => e);
    expect(isOtpError(error) && error.code).toBe('OTP_NETWORK_ERROR');
  });

  it('uses the global fetch when none is injected', () => {
    expect(() => createWhatsAppChannel({ environment: 'dev', ...WA })).not.toThrow();
  });
});

describe('createWhatsAppOtp', () => {
  it('sends the generated code over WhatsApp and verifies it into an otpToken', async () => {
    const stub = stubMeta(accepted());
    const logs: string[] = [];
    const otp = createWhatsAppOtp({
      environment: 'dev',
      store: new MemoryCodeStore(),
      codeSecret: 'c'.repeat(32),
      proofSecret: 'p'.repeat(32),
      randomInt: () => 4242,
      logger: {
        debug: () => undefined,
        info: (m) => logs.push(m),
        warn: () => undefined,
        error: () => undefined,
      },
      whatsapp: { ...WA, fetch: stub.fetch, retryDeps: noSleep },
    });
    expect(otp.channelName).toBe('whatsapp');
    await expect(otp.sendCode({ phone: PHONE, purpose: 'LOGIN', language: 'en' })).resolves.toEqual(
      {
        expiresInSec: 300,
        messageId: 'wamid.TEST',
      },
    );
    expect(JSON.stringify(stub.calls[0]?.body)).toContain('004242');
    const verified = await otp.verifyCode({ phone: PHONE, purpose: 'LOGIN', code: '004242' });
    expect(verified).toMatchObject({ outcome: 'VERIFIED', phone: PHONE, expiresInSec: 600 });
    expect(logs).toContain('otp code sent');
  });

  it('keeps an explicit WhatsApp logger and enforces https in production', () => {
    const base = {
      store: Object.assign(new MemoryCodeStore(), { scope: 'shared' as const }),
      codeSecret: 'c'.repeat(32),
      proofSecret: 'p'.repeat(32),
    };
    const silent: Logger = {
      debug: () => undefined,
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
    };
    expect(() =>
      createWhatsAppOtp({
        ...base,
        environment: 'prod',
        logger: silent,
        whatsapp: { ...WA, logger: silent, baseUrl: 'http://graph.test' },
      }),
    ).toThrow('https');
    expect(
      createWhatsAppOtp({ ...base, environment: 'prod', whatsapp: { ...WA } }).channelName,
    ).toBe('whatsapp');
  });
});
