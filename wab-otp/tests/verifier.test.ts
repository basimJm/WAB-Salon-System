import { createFakeVerifier, fakeProof } from '../src/adapters/fake';
import type { OtpEvent, ProofVerifier, VerifyInput } from '../src/ports';
import { OtpError } from '../src/errors';
import { createOtpVerifier } from '../src/verifier';
import { assertPhone, assertPurpose, assertVerifyInput, isE164 } from '../src/validation';

const PHONE = '+962791234567';
const OTHER = '+962781234567';
const input = (proof: string, expectedPhone = PHONE): VerifyInput => ({
  proof,
  expectedPhone,
  purpose: 'LOGIN',
});

describe('validation', () => {
  it('recognises E.164 numbers', () => {
    expect(isE164(PHONE)).toBe(true);
    for (const bad of [
      '0791234567',
      '+0123456789',
      '+96279',
      'abc',
      5,
      undefined,
      '+9627912345678901',
    ])
      expect(isE164(bad)).toBe(false);
  });
  it('rejects bad phones, purposes and proofs with OTP_INPUT_INVALID', () => {
    expect(() => assertPhone('x', 'phone')).toThrow('phone must be');
    expect(() => assertPurpose('login')).toThrow('purpose');
    expect(() => assertPurpose(3)).toThrow('purpose');
    expect(() => assertPurpose('MY_NEW_PURPOSE')).not.toThrow();
    expect(() => assertVerifyInput(input(''))).toThrow('proof');
    expect(() => assertVerifyInput(input('x'.repeat(9000)))).toThrow('too long');
    expect(() => assertVerifyInput({ ...input('p'), proof: 5 as unknown as string })).toThrow(
      'proof',
    );
    try {
      assertVerifyInput(input('p', 'bad'));
    } catch (error) {
      expect((error as OtpError).code).toBe('OTP_INPUT_INVALID');
    }
  });
});

describe('fake verifier', () => {
  const fake = createFakeVerifier();
  it('verifies a valid proof for the expected phone', async () => {
    await expect(fake.verify(input(fakeProof(PHONE)))).resolves.toEqual({
      outcome: 'VERIFIED',
      phone: PHONE,
    });
  });
  it('maps every proof kind', async () => {
    await expect(fake.verify(input(fakeProof(PHONE, 'expired')))).resolves.toEqual({
      outcome: 'EXPIRED',
    });
    await expect(fake.verify(input(fakeProof(PHONE, 'invalid')))).resolves.toEqual({
      outcome: 'INVALID_PROOF',
    });
    await expect(fake.verify(input(fakeProof(OTHER)))).resolves.toEqual({
      outcome: 'PHONE_MISMATCH',
    });
    await expect(fake.verify(input(fakeProof(PHONE, 'provider-error')))).rejects.toMatchObject({
      code: 'OTP_PROVIDER_UNAVAILABLE',
      retryable: true,
    });
  });
  it('treats garbage as an invalid proof', async () => {
    for (const proof of [
      'garbage',
      'fake-otp:nope:+962791234567',
      'fake-otp:valid:x',
      'fake-otp:valid:+962791234567:extra',
    ])
      await expect(fake.verify(input(proof))).resolves.toEqual({ outcome: 'INVALID_PROOF' });
  });
});

describe('createOtpVerifier', () => {
  const events: OtpEvent[] = [];
  const base = {
    environment: 'dev',
    provider: 'fake',
    onEvent: (e: OtpEvent): void => {
      events.push(e);
    },
  } as const;
  beforeEach(() => {
    events.length = 0;
  });

  it('verifies, emits an event and closes cleanly', async () => {
    const verifier = createOtpVerifier(base);
    await expect(verifier.verify(input(fakeProof(PHONE)))).resolves.toEqual({
      outcome: 'VERIFIED',
      phone: PHONE,
    });
    expect(events).toEqual([{ type: 'verify', outcome: 'VERIFIED', purpose: 'LOGIN' }]);
    await expect(verifier.close?.()).resolves.toBeUndefined();
  });

  it('rejects invalid input before touching the adapter', async () => {
    const verify = jest.fn();
    const verifier = createOtpVerifier({
      environment: 'dev',
      provider: 'custom',
      verifier: { verify },
    });
    await expect(verifier.verify(input('p', 'bad'))).rejects.toMatchObject({
      code: 'OTP_INPUT_INVALID',
    });
    expect(verify).not.toHaveBeenCalled();
  });

  it('throws typed errors for outages and reports them', async () => {
    const verifier = createOtpVerifier(base);
    await expect(verifier.verify(input(fakeProof(PHONE, 'provider-error')))).rejects.toMatchObject({
      code: 'OTP_PROVIDER_UNAVAILABLE',
    });
    expect(events).toEqual([{ type: 'provider_error', code: 'OTP_PROVIDER_UNAVAILABLE' }]);
  });

  it('wraps unexpected adapter errors as OTP_UNKNOWN keeping the cause', async () => {
    const boom = new Error('boom');
    const custom: ProofVerifier = { verify: () => Promise.reject(boom) };
    const verifier = createOtpVerifier({
      environment: 'dev',
      provider: 'custom',
      verifier: custom,
    });
    await expect(verifier.verify(input('p'))).rejects.toMatchObject({
      code: 'OTP_UNKNOWN',
      cause: boom,
    });
  });

  it('never lets an unknown or incomplete adapter answer read as success', async () => {
    const answers: unknown[] = [{ outcome: 'MAYBE' }, {}, { outcome: 'VERIFIED' }, { outcome: 7 }];
    for (const answer of answers) {
      const custom: ProofVerifier = { verify: () => Promise.resolve(answer as never) };
      const verifier = createOtpVerifier({
        environment: 'dev',
        provider: 'custom',
        verifier: custom,
      });
      await expect(verifier.verify(input('p'))).rejects.toMatchObject({
        code: 'OTP_MALFORMED_RESPONSE',
      });
    }
  });

  it('downgrades a verified phone that differs from the expected one', async () => {
    const custom: ProofVerifier = {
      verify: () => Promise.resolve({ outcome: 'VERIFIED', phone: OTHER }),
    };
    const verifier = createOtpVerifier({
      environment: 'dev',
      provider: 'custom',
      verifier: custom,
    });
    await expect(verifier.verify(input('p'))).resolves.toEqual({ outcome: 'PHONE_MISMATCH' });
  });

  it('passes through the extra outcomes a custom adapter may return', async () => {
    const custom: ProofVerifier = {
      verify: () => Promise.resolve({ outcome: 'PURPOSE_MISMATCH' }),
    };
    const verifier = createOtpVerifier({
      environment: 'dev',
      provider: 'custom',
      verifier: custom,
    });
    await expect(verifier.verify(input('p'))).resolves.toEqual({ outcome: 'PURPOSE_MISMATCH' });
  });

  it('survives a throwing event hook and logs it without secrets', async () => {
    const warn = jest.fn();
    const verifier = createOtpVerifier({
      environment: 'dev',
      provider: 'fake',
      onEvent: () => {
        throw new Error('hook');
      },
      logger: { debug: jest.fn(), info: jest.fn(), warn, error: jest.fn() },
    });
    await expect(verifier.verify(input(fakeProof(PHONE)))).resolves.toMatchObject({
      outcome: 'VERIFIED',
    });
    expect(warn).toHaveBeenCalledWith('otp event hook failed', expect.anything());
  });

  it('does not log the proof or the full phone on failures', async () => {
    const error = jest.fn();
    const verifier = createOtpVerifier({
      environment: 'dev',
      provider: 'fake',
      logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error },
    });
    await expect(verifier.verify(input(fakeProof(PHONE, 'provider-error')))).rejects.toBeInstanceOf(
      OtpError,
    );
    expect(JSON.stringify(error.mock.calls)).not.toContain(PHONE);
  });

  it('closes the adapter when it has a close hook', async () => {
    const close = jest.fn().mockResolvedValue(undefined);
    const verifier = createOtpVerifier({
      environment: 'dev',
      provider: 'custom',
      verifier: { verify: () => Promise.resolve({ outcome: 'INVALID_PROOF' }), close },
    });
    await verifier.close?.();
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('refuses unconfigured providers at creation', () => {
    expect(() => createOtpVerifier({ environment: 'dev', provider: 'firebase' })).toThrow(
      'projectId',
    );
    expect(() => createOtpVerifier({ environment: 'prod', provider: 'fake' })).toThrow('refused');
  });
});
