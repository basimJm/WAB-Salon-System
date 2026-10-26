import type { FetchLike } from '@wab/otp';
import { parseArqamCheckArgs, runArqamCheck } from '../src/providers/otp/arqamCheck';

/** SRV-158: `npm run otp:arqam-check` (account check + optional test send), never the key. */
const KEY = 'not-a-real-arqam-key-value';
const ENV: NodeJS.ProcessEnv = {
  MONGODB_URI: 'mongodb://localhost/wab',
  REDIS_URL: 'redis://localhost:6379',
  JWT_ACCESS_SECRET: 'a'.repeat(48),
  OTP_PROVIDER: 'arqam',
  ARQAM_API_KEY: KEY,
  ARQAM_TEMPLATE_AR: 'wab_otp_ar',
  ARQAM_TEMPLATE_EN: 'wab_otp_en',
  OTP_CODE_SECRET: 'c'.repeat(40),
  OTP_PROOF_SECRET: 'f'.repeat(40),
};

interface Call {
  readonly url: string;
  readonly method: string;
  readonly body?: string;
  readonly headers: Readonly<Record<string, string>>;
}
const stub = (
  ...answers: { status: number; body: unknown }[]
): { fetch: FetchLike; calls: Call[] } => {
  const calls: Call[] = [];
  const fetch: FetchLike = (url, init) => {
    calls.push({
      url,
      method: init.method,
      headers: init.headers,
      ...(init.body === undefined ? {} : { body: init.body }),
    });
    const answer = answers[Math.min(calls.length - 1, answers.length - 1)] ?? {
      status: 500,
      body: {},
    };
    return Promise.resolve({
      status: answer.status,
      text: () => Promise.resolve(JSON.stringify(answer.body)),
    });
  };
  return { fetch, calls };
};

const run = async (
  argv: string[],
  options: { env?: NodeJS.ProcessEnv; fetch?: FetchLike } = {},
): Promise<{ code: number; out: string; err: string }> => {
  let out = '';
  let err = '';
  const code = await runArqamCheck(argv, {
    out: (text) => (out += text),
    err: (text) => (err += text),
    env: options.env ?? ENV,
    newCode: () => '424242',
    ...(options.fetch === undefined ? {} : { fetch: options.fetch }),
  });
  return { code, out, err };
};

const ACCOUNT = { status: 200, body: { mode: 'test', balance: 120, status: 'active' } };

describe('parseArqamCheckArgs', () => {
  it('reads --send and --lang, defaults to Arabic', () => {
    expect(parseArqamCheckArgs([])).toEqual({ lang: 'ar' });
    expect(parseArqamCheckArgs(['--send', '+962791234567', '--lang', 'en'])).toEqual({
      send: '+962791234567',
      lang: 'en',
    });
  });

  it.each([[['--send']], [['--send', '0791234567']], [['--lang', 'fr']], [['--other', 'x']]])(
    'refuses %j',
    (argv) => {
      expect(parseArqamCheckArgs(argv)).toBeNull();
    },
  );
});

describe('runArqamCheck', () => {
  it('prints the account mode and balance, never the key', async () => {
    const { fetch, calls } = stub(ACCOUNT);
    const result = await run([], { fetch });
    expect(result.code).toBe(0);
    expect(result.out).toContain('mode TEST');
    expect(result.out).toContain('balance 120');
    expect(result.out).toContain('ar=wab_otp_ar en=wab_otp_en');
    expect(result.out + result.err).not.toContain(KEY);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ method: 'GET' });
    expect(calls[0]?.headers['x-api-key']).toBe(KEY);
  });

  it('sends one test OTP with --send in the chosen language', async () => {
    const { fetch, calls } = stub(ACCOUNT, {
      status: 200,
      body: { success: true, messageId: 'm-1', status: 'sent' },
    });
    const result = await run(['--send', '+962791234567', '--lang', 'en'], { fetch });
    expect(result.code).toBe(0);
    expect(JSON.parse(calls[1]?.body ?? '{}')).toEqual({
      phoneNumber: '+962791234567',
      otpCode: '424242',
      templateName: 'wab_otp_en',
    });
    expect(result.out).toContain('messageId m-1');
    expect(result.out).not.toContain(KEY);
  });

  it('uses a random 6-digit code by default', async () => {
    const { fetch, calls } = stub(ACCOUNT, {
      status: 200,
      body: { success: true, messageId: 'm-2' },
    });
    let out = '';
    await runArqamCheck(['--send', '+962791234567'], {
      out: (text) => (out += text),
      err: () => undefined,
      env: ENV,
      fetch,
    });
    const sent = JSON.parse(calls[1]?.body ?? '{}') as { otpCode: string };
    expect(sent.otpCode).toMatch(/^\d{6}$/);
    expect(out).toContain('m-2');
  });

  it('reports ARQAM refusals with their code and exits 1', async () => {
    const { fetch } = stub({
      status: 401,
      body: { success: false, errorCode: 'UNAUTHORIZED', errorMessage: 'bad key' },
    });
    const result = await run([], { fetch });
    expect(result.code).toBe(1);
    expect(result.err).toContain('OTP_AUTH_FAILED (ARQAM UNAUTHORIZED)');
    const failing: FetchLike = () => Promise.reject(new TypeError('fetch failed'));
    const offline = await run([], { fetch: failing });
    expect(offline.err).toContain('OTP_NETWORK_ERROR');
  });

  it('exits 2 on bad arguments, another OTP provider or an invalid configuration', async () => {
    expect((await run(['--lang', 'fr'])).code).toBe(2);
    const fake = await run([], { env: { ...ENV, OTP_PROVIDER: 'fake' } });
    expect(fake.code).toBe(2);
    expect(fake.err).toContain('OTP_PROVIDER is not arqam');
    const broken = await run([], { env: { ...ENV, ARQAM_TEMPLATE_EN: undefined } });
    expect(broken.code).toBe(2);
    expect(broken.err).toContain('ARQAM_TEMPLATE_EN');
    expect(broken.err).not.toContain(KEY);
  });
});
