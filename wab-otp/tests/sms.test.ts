import { createSmsOtp, type SmsOtpOptions } from '../src/adapters/sms';
import { FakeSmsVendor, MemoryCodeStore } from '../src/adapters/sms/fake';
import { createOtpService } from '../src/service';

const PHONE = '+962791234567';
const SECRET = 's'.repeat(40);
const TEMPLATE = 'Code {code}, valid {minutes} min';

describe('server-verified SMS skeleton (fake vendor)', () => {
  let time = 0;
  let vendor: FakeSmsVendor;
  let store: MemoryCodeStore;
  const make = (over: Partial<SmsOtpOptions> = {}): ReturnType<typeof createSmsOtp> =>
    createSmsOtp({
      environment: 'dev',
      vendor,
      store,
      secret: SECRET,
      template: TEMPLATE,
      randomDigit: () => 42,
      ...over,
    });
  beforeEach(() => {
    time = 1000;
    vendor = new FakeSmsVendor();
    store = new MemoryCodeStore(() => time);
  });

  it('sends a zero-padded code with the message template and stores only a hash', async () => {
    const result = await make().sendCode({ phone: PHONE, purpose: 'LOGIN' });
    expect(result).toEqual({ expiresInSec: 300, messageId: 'fake-1' });
    expect(vendor.sent).toEqual([{ to: PHONE, body: 'Code 000042, valid 5 min' }]);
    const stored = await store.get(`otp:code:LOGIN:${PHONE}`);
    expect(stored).toMatch(/^[0-9a-f]{64}$/);
    expect(stored).not.toContain('000042');
  });

  it('verifies the right code once, and rejects a repeat', async () => {
    const sms = make();
    await sms.sendCode({ phone: PHONE, purpose: 'LOGIN' });
    const input = { proof: '000042', expectedPhone: PHONE, purpose: 'LOGIN' } as const;
    await expect(sms.verifier.verify(input)).resolves.toEqual({
      outcome: 'VERIFIED',
      phone: PHONE,
    });
    await expect(sms.verifier.verify(input)).resolves.toEqual({ outcome: 'EXPIRED' });
  });

  it('rejects a wrong code, keeps the real one valid, and binds phone and purpose', async () => {
    const sms = make();
    await sms.sendCode({ phone: PHONE, purpose: 'LOGIN' });
    const wrong = { proof: '111111', expectedPhone: PHONE, purpose: 'LOGIN' } as const;
    await expect(sms.verifier.verify(wrong)).resolves.toEqual({ outcome: 'INVALID_PROOF' });
    await expect(
      sms.verifier.verify({ proof: '000042', expectedPhone: PHONE, purpose: 'REGISTER' }),
    ).resolves.toEqual({ outcome: 'EXPIRED' });
    await expect(
      sms.verifier.verify({ proof: '000042', expectedPhone: '+962781234567', purpose: 'LOGIN' }),
    ).resolves.toEqual({ outcome: 'EXPIRED' });
    await expect(
      sms.verifier.verify({ proof: '000042', expectedPhone: PHONE, purpose: 'LOGIN' }),
    ).resolves.toMatchObject({ outcome: 'VERIFIED' });
  });

  it('expires after the TTL', async () => {
    const sms = make({ ttlSec: 60 });
    await sms.sendCode({ phone: PHONE, purpose: 'LOGIN' });
    time += 61_000;
    await expect(
      sms.verifier.verify({ proof: '000042', expectedPhone: PHONE, purpose: 'LOGIN' }),
    ).resolves.toEqual({ outcome: 'EXPIRED' });
  });

  it('supports other code lengths and draws real random codes by default', async () => {
    const sms = make({ codeLength: 4 });
    await sms.sendCode({ phone: PHONE, purpose: 'LOGIN' });
    expect(vendor.sent[0]?.body).toContain('Code 0042,');
    const random = createSmsOtp({
      environment: 'dev',
      vendor,
      store,
      secret: SECRET,
      template: TEMPLATE,
    });
    await random.sendCode({ phone: PHONE, purpose: 'LOGIN' });
    expect(vendor.sent[1]?.body).toMatch(/Code \d{6},/);
  });

  it('removes the stored code and throws a typed retryable error when the vendor fails', async () => {
    vendor.failWith = new Error('gateway down secret-host');
    await expect(make().sendCode({ phone: PHONE, purpose: 'LOGIN' })).rejects.toMatchObject({
      code: 'OTP_PROVIDER_UNAVAILABLE',
      retryable: true,
    });
    expect(await store.get(`otp:code:LOGIN:${PHONE}`)).toBeNull();
  });

  it('wraps a vendor that rejects with a plain error', async () => {
    const typed = Object.assign(new Error('x'), {});
    const vendorWithTyped = {
      send: () => Promise.reject(typed),
    };
    await expect(
      make({ vendor: vendorWithTyped }).sendCode({ phone: PHONE, purpose: 'LOGIN' }),
    ).rejects.toMatchObject({ code: 'OTP_PROVIDER_UNAVAILABLE' });
  });

  it('validates input and refuses weak secrets and fakes in production', async () => {
    await expect(make().sendCode({ phone: 'x', purpose: 'LOGIN' })).rejects.toMatchObject({
      code: 'OTP_INPUT_INVALID',
    });
    await expect(make().sendCode({ phone: PHONE, purpose: 'login' })).rejects.toMatchObject({
      code: 'OTP_INPUT_INVALID',
    });
    expect(() => make({ secret: 'short' })).toThrow('too short');
    expect(() => make({ environment: 'prod' })).toThrow('refused in production');
    const sharedStore = Object.assign(new MemoryCodeStore(), { scope: 'shared' as const });
    expect(() =>
      make({
        environment: 'prod',
        store: sharedStore,
        vendor: { send: () => Promise.reject(new Error('x')) },
      }),
    ).not.toThrow();
  });

  it('plugs into the service through the custom provider (limits included)', async () => {
    const sms = make();
    const otp = createOtpService({
      environment: 'dev',
      provider: 'custom',
      verifier: sms.verifier,
    });
    await sms.sendCode({ phone: PHONE, purpose: 'LOGIN' });
    await expect(
      otp.verify({ proof: '000042', expectedPhone: PHONE, purpose: 'LOGIN' }),
    ).resolves.toMatchObject({ outcome: 'VERIFIED' });
  });
});
