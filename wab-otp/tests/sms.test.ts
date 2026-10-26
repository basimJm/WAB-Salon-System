import { MemoryCodeStore } from '../src/adapters/code-store/memory';
import { createSmsChannel, createSmsOtp } from '../src/adapters/sms';
import { FakeSmsVendor } from '../src/adapters/sms/fake';
import type { OtpMessage } from '../src/ports';

const PHONE = '+962791234567';
const templates = {
  ar: 'رمزك {code} صالح {minutes} دقائق',
  en: 'Code {code}, valid {minutes} min',
};
const message = (over: Partial<OtpMessage> = {}): OtpMessage => ({
  to: PHONE,
  code: '000042',
  language: 'en',
  purpose: 'LOGIN',
  ttlSec: 300,
  ...over,
});

describe('SMS channel', () => {
  let vendor: FakeSmsVendor;
  beforeEach(() => {
    vendor = new FakeSmsVendor();
  });

  it('renders the template of the language with code and minutes', async () => {
    const channel = createSmsChannel({ vendor, templates });
    expect(channel).toMatchObject({ name: 'sms', isFake: true });
    await expect(channel.send(message())).resolves.toEqual({ id: 'fake-1' });
    await channel.send(message({ language: 'ar', ttlSec: 90 }));
    expect(vendor.sent).toEqual([
      { to: PHONE, body: 'Code 000042, valid 5 min' },
      { to: PHONE, body: 'رمزك 000042 صالح 2 دقائق' },
    ]);
  });

  it('falls back to the configured language, refuses others (own keys only)', async () => {
    await createSmsChannel({ vendor, templates, fallbackLanguage: 'ar' }).send(
      message({ language: 'fr' }),
    );
    expect(vendor.sent[0]?.body).toContain('رمزك');
    const strict = createSmsChannel({ vendor, templates });
    await expect(strict.send(message({ language: 'fr' }))).rejects.toMatchObject({
      code: 'OTP_INPUT_INVALID',
    });
    await expect(strict.send(message({ language: 'toString' }))).rejects.toMatchObject({
      code: 'OTP_INPUT_INVALID',
    });
  });

  it('is not fake with a real vendor and passes vendor failures through', async () => {
    const real = { send: () => Promise.reject(new Error('gateway down')) };
    const channel = createSmsChannel({ vendor: real, templates });
    expect(channel.isFake).toBeUndefined();
    await expect(channel.send(message())).rejects.toThrow('gateway down');
    vendor.failWith = new Error('x');
    await expect(createSmsChannel({ vendor, templates }).send(message())).rejects.toThrow('x');
  });

  it('refuses empty templates, templates without {code} and an unknown fallback', () => {
    expect(() => createSmsChannel({ vendor, templates: {} })).toThrow('required');
    expect(() => createSmsChannel({ vendor, templates: { en: 'no code' } })).toThrow('{code}');
    expect(() => createSmsChannel({ vendor, templates, fallbackLanguage: 'fr' })).toThrow(
      'fallbackLanguage',
    );
  });

  it('createSmsOtp runs the generic code flow over SMS', async () => {
    const otp = createSmsOtp({
      environment: 'dev',
      store: new MemoryCodeStore(),
      codeSecret: 'c'.repeat(32),
      proofSecret: 'p'.repeat(32),
      randomInt: () => 42,
      sms: { vendor, templates },
    });
    expect(otp.channelName).toBe('sms');
    await otp.sendCode({ phone: PHONE, purpose: 'LOGIN', language: 'en' });
    expect(vendor.sent[0]?.body).toBe('Code 000042, valid 5 min');
    await expect(
      otp.verifyCode({ phone: PHONE, purpose: 'LOGIN', code: '000042' }),
    ).resolves.toMatchObject({ outcome: 'VERIFIED' });
  });
});
