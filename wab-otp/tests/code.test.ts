import { createCodeOtp, type CodeOtpOptions } from '../src/adapters/code';
import { MemoryCodeStore } from '../src/adapters/code-store/memory';
import { FakeOtpChannel } from '../src/adapters/fake/channel';
import { OtpError } from '../src/errors';
import type { CodeStore, OtpEvent } from '../src/ports';
import { createOtpService } from '../src/service';

const PHONE = '+962791234567';
const CODE_SECRET = 'c'.repeat(32);
const PROOF_SECRET = 'p'.repeat(32);
const START = new Date('2026-10-26T10:00:00Z');
const shared = (): MemoryCodeStore =>
  Object.assign(new MemoryCodeStore(), { scope: 'shared' as const });

describe('createCodeOtp (server-generated codes over any channel)', () => {
  let now: Date;
  let channel: FakeOtpChannel;
  let store: MemoryCodeStore;
  const make = (over: Partial<CodeOtpOptions> = {}): ReturnType<typeof createCodeOtp> =>
    createCodeOtp({
      environment: 'dev',
      channel,
      store,
      codeSecret: CODE_SECRET,
      proofSecret: PROOF_SECRET,
      randomInt: () => 42,
      now: () => now,
      ...over,
    });
  const send = { phone: PHONE, purpose: 'LOGIN', language: 'ar' } as const;
  beforeEach(() => {
    now = START;
    channel = new FakeOtpChannel();
    store = new MemoryCodeStore(() => now.getTime());
  });

  it('sends a zero-padded code with language, purpose and TTL, storing only its HMAC', async () => {
    const otp = make();
    await expect(otp.sendCode(send)).resolves.toEqual({ expiresInSec: 300, messageId: 'fake-1' });
    expect(otp.channelName).toBe('fake');
    expect(channel.sent).toEqual([
      { to: PHONE, code: '000042', language: 'ar', purpose: 'LOGIN', ttlSec: 300 },
    ]);
    expect(channel.lastCode(PHONE)).toBe('000042');
    expect(channel.lastCode('+962780000000')).toBeUndefined();
    const stored = await store.get(`otp:code:LOGIN:${PHONE}`);
    expect(stored).toMatch(/^[0-9a-f]{64}$/);
    expect(stored).not.toContain('000042');
  });

  it('verifies the right code once into a usable otpToken', async () => {
    const otp = make();
    await otp.sendCode(send);
    const result = await otp.verifyCode({ phone: PHONE, purpose: 'LOGIN', code: '000042' });
    expect(result).toMatchObject({ outcome: 'VERIFIED', phone: PHONE, expiresInSec: 600 });
    await expect(
      otp.verifyCode({ phone: PHONE, purpose: 'LOGIN', code: '000042' }),
    ).resolves.toEqual({ outcome: 'EXPIRED' });
    if (result.outcome !== 'VERIFIED') throw new Error('not verified');
    const check = { proof: result.otpToken, expectedPhone: PHONE, purpose: 'LOGIN' } as const;
    await expect(otp.proofs.verify(check)).resolves.toEqual({ outcome: 'VERIFIED', phone: PHONE });
    await expect(otp.proofs.verify(check)).resolves.toEqual({ outcome: 'INVALID_PROOF' });
  });

  it('rejects a wrong code, keeps the real one valid, binds phone and purpose', async () => {
    const otp = make();
    await otp.sendCode(send);
    const at = (over: object): { phone: string; purpose: string; code: string } => ({
      phone: PHONE,
      purpose: 'LOGIN',
      code: '000042',
      ...over,
    });
    await expect(otp.verifyCode(at({ code: '111111' }))).resolves.toEqual({
      outcome: 'INVALID_PROOF',
    });
    await expect(otp.verifyCode(at({ code: '' }))).resolves.toEqual({ outcome: 'INVALID_PROOF' });
    await expect(otp.verifyCode(at({ purpose: 'REGISTER' }))).resolves.toEqual({
      outcome: 'EXPIRED',
    });
    await expect(otp.verifyCode(at({ phone: '+962781234567' }))).resolves.toEqual({
      outcome: 'EXPIRED',
    });
    await expect(otp.verifyCode(at({}))).resolves.toMatchObject({ outcome: 'VERIFIED' });
  });

  it('expires the code after the TTL; a resend replaces the earlier code', async () => {
    let next = 1;
    const otp = make({ codeTtlSec: 60, randomInt: () => next++ });
    await otp.sendCode(send);
    now = new Date(START.getTime() + 61_000);
    await expect(
      otp.verifyCode({ phone: PHONE, purpose: 'LOGIN', code: '000001' }),
    ).resolves.toEqual({ outcome: 'EXPIRED' });
    await otp.sendCode(send);
    await otp.sendCode(send);
    await expect(
      otp.verifyCode({ phone: PHONE, purpose: 'LOGIN', code: '000002' }),
    ).resolves.toEqual({ outcome: 'INVALID_PROOF' });
    await expect(
      otp.verifyCode({ phone: PHONE, purpose: 'LOGIN', code: '000003' }),
    ).resolves.toMatchObject({ outcome: 'VERIFIED' });
  });

  it('lets exactly one concurrent verification of the same code win', async () => {
    const otp = make();
    await otp.sendCode(send);
    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        otp.verifyCode({ phone: PHONE, purpose: 'LOGIN', code: '000042' }),
      ),
    );
    expect(results.filter((r) => r.outcome === 'VERIFIED')).toHaveLength(1);
  });

  it('draws real CSPRNG codes of the configured length by default', async () => {
    const otp = createCodeOtp({
      environment: 'dev',
      channel,
      store,
      codeSecret: CODE_SECRET,
      proofSecret: PROOF_SECRET,
      codeLength: 4,
    });
    await otp.sendCode(send);
    expect(channel.sent[0]?.code).toMatch(/^\d{4}$/);
  });

  it('uses a fixed code in dev only', async () => {
    const otp = make({ fixedCode: '123456' });
    await otp.sendCode(send);
    expect(channel.lastCode(PHONE)).toBe('123456');
    expect(() => make({ fixedCode: '12' })).toThrow('fixedCode');
    expect(() => make({ fixedCode: '12345a' })).toThrow('fixedCode');
    expect(() =>
      make({
        environment: 'prod',
        channel: { name: 'x', send: channel.send.bind(channel) },
        store: shared(),
        fixedCode: '123456',
      }),
    ).toThrow('fixedCode is refused');
  });

  it('deletes the code and rethrows a typed channel error (DELIVERY_FAILED stays as is)', async () => {
    const events: OtpEvent[] = [];
    const otp = make({ onEvent: (e) => events.push(e) });
    channel.failWith = new OtpError('OTP_DELIVERY_FAILED', 'not on WhatsApp');
    await expect(otp.sendCode(send)).rejects.toMatchObject({
      code: 'OTP_DELIVERY_FAILED',
      retryable: false,
    });
    expect(await store.get(`otp:code:LOGIN:${PHONE}`)).toBeNull();
    channel.failWith = new Error('socket hang up');
    await expect(otp.sendCode(send)).rejects.toMatchObject({
      code: 'OTP_PROVIDER_UNAVAILABLE',
      retryable: true,
    });
    channel.failWith = undefined;
    await otp.sendCode(send);
    expect(events).toEqual([
      {
        type: 'send',
        channel: 'fake',
        purpose: 'LOGIN',
        delivered: false,
        errorCode: 'OTP_DELIVERY_FAILED',
      },
      {
        type: 'send',
        channel: 'fake',
        purpose: 'LOGIN',
        delivered: false,
        errorCode: 'OTP_PROVIDER_UNAVAILABLE',
      },
      { type: 'send', channel: 'fake', purpose: 'LOGIN', delivered: true },
    ]);
  });

  it('survives a throwing event hook and logs without the code', async () => {
    const lines: string[] = [];
    const log = (m: string, f?: unknown): void => {
      lines.push(`${m} ${JSON.stringify(f)}`);
    };
    const otp = make({
      onEvent: () => {
        throw new Error('hook');
      },
      logger: { debug: log, info: log, warn: log, error: log },
    });
    await otp.sendCode(send);
    channel.failWith = new Error('x');
    await expect(otp.sendCode(send)).rejects.toThrow();
    const all = lines.join('\n');
    expect(all).toContain('otp event hook failed');
    expect(all).not.toContain('000042');
    expect(all).not.toContain('962791234567');
    expect(all).toContain('+*********567');
  });

  it('validates inputs', async () => {
    const otp = make();
    await expect(otp.sendCode({ ...send, phone: 'x' })).rejects.toMatchObject({
      code: 'OTP_INPUT_INVALID',
    });
    await expect(otp.sendCode({ ...send, purpose: 'login' })).rejects.toMatchObject({
      code: 'OTP_INPUT_INVALID',
    });
    await expect(otp.sendCode({ ...send, language: '' })).rejects.toMatchObject({
      code: 'OTP_INPUT_INVALID',
    });
    await expect(
      otp.verifyCode({ phone: PHONE, purpose: 'LOGIN', code: 42 as unknown as string }),
    ).rejects.toMatchObject({ code: 'OTP_INPUT_INVALID' });
    await expect(otp.verifyCode({ phone: 'x', purpose: 'LOGIN', code: '1' })).rejects.toMatchObject(
      {
        code: 'OTP_INPUT_INVALID',
      },
    );
  });

  it('refuses weak or shared secrets, bad lengths and TTLs', () => {
    expect(() => make({ codeSecret: 'short' })).toThrow('code secret is too short');
    expect(() => make({ proofSecret: 'short' })).toThrow('proof secret is too short');
    expect(() => make({ proofSecret: CODE_SECRET })).toThrow('must differ');
    expect(() => make({ codeLength: 0 })).toThrow('codeLength');
    expect(() => make({ codeLength: 16 })).toThrow('codeLength');
    expect(() => make({ codeTtlSec: 0 })).toThrow('codeTtlSec');
    expect(() =>
      make({ proofTtlSec: 1, codeTtlSec: 1, newId: () => 'a', keyPrefix: 'k' }),
    ).not.toThrow();
  });

  it('refuses a fake channel and a local store in production, accepts real ones', () => {
    const real = { name: 'real', send: channel.send.bind(channel) };
    expect(() => make({ environment: 'prod', store: shared() })).toThrow('fake channel');
    expect(() => make({ environment: 'prod', channel: real })).toThrow('process-local');
    expect(() => make({ environment: 'prod', channel: real, store: shared() })).not.toThrow();
  });

  it('propagates a code store outage as an error', async () => {
    const broken: CodeStore = {
      scope: 'shared',
      set: () => Promise.reject(new Error('store down')),
      get: () => Promise.reject(new Error('store down')),
      delete: () => Promise.resolve(false),
      setIfAbsent: () => Promise.resolve(false),
    };
    const otp = make({ store: broken });
    await expect(otp.sendCode(send)).rejects.toThrow('store down');
    expect(channel.sent).toHaveLength(0);
    await expect(otp.verifyCode({ phone: PHONE, purpose: 'LOGIN', code: '1' })).rejects.toThrow(
      'store down',
    );
  });

  it('plugs into createOtpService: limits + otpToken verification through the signed provider', async () => {
    const otp = make();
    const service = createOtpService({
      environment: 'dev',
      provider: 'signed',
      proof: { secret: PROOF_SECRET, store },
      now: () => now,
    });
    expect((await service.precheck({ phone: PHONE, purpose: 'LOGIN' })).allowed).toBe(true);
    await otp.sendCode(send);
    await service.reportFailure({ phone: PHONE, purpose: 'LOGIN', reason: 'WRONG_CODE' });
    const result = await otp.verifyCode({ phone: PHONE, purpose: 'LOGIN', code: '000042' });
    if (result.outcome !== 'VERIFIED') throw new Error('not verified');
    const check = { proof: result.otpToken, expectedPhone: PHONE, purpose: 'LOGIN' } as const;
    await expect(service.verify(check)).resolves.toEqual({ outcome: 'VERIFIED', phone: PHONE });
    await expect(service.verify(check)).resolves.toEqual({ outcome: 'INVALID_PROOF' });
    await service.close();
  });
});
