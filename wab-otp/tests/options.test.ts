import { MemoryCodeStore } from '../src/adapters/code-store/memory';
import { resolveOptions, type OtpOptions } from '../src/config/options';
import type { CodeStore, LimitStore, ProofVerifier } from '../src/ports';

const verifier: ProofVerifier = { verify: () => Promise.resolve({ outcome: 'INVALID_PROOF' }) };
const store = (scope: 'local' | 'shared'): LimitStore => ({
  scope,
  hit: () => Promise.resolve({ allowed: true, blocked: false, count: 1, retryAfterMs: 0 }),
  countOf: () => Promise.resolve(0),
  blockTtlMs: () => Promise.resolve(0),
  startCooldown: () => Promise.resolve({ started: true, retryAfterMs: 0 }),
  reset: () => Promise.resolve(),
});
const sharedCodes = (): CodeStore =>
  Object.assign(new MemoryCodeStore(), { scope: 'shared' as const });
const SECRET = 'p'.repeat(32);
const prod: OtpOptions = {
  environment: 'prod',
  provider: 'signed',
  proof: { secret: SECRET, store: sharedCodes() },
};

const codeOf = (options: OtpOptions): string | undefined => {
  try {
    resolveOptions(options);
    return undefined;
  } catch (error) {
    return (error as { code: string }).code;
  }
};

describe('resolveOptions', () => {
  it('fills every default for a minimal dev setup', () => {
    const r = resolveOptions({ environment: 'dev', provider: 'fake' });
    expect(r.limits).toEqual({ requestMax: 5, requestWindowSec: 300, wrongMax: 5, blockSec: 900 });
    expect(r).toMatchObject({ otpLength: 6, resendAfterSec: 60, keyPrefix: '' });
    expect(r.proof).toBeUndefined();
    expect(r.now()).toBeInstanceOf(Date);
    r.onEvent({ type: 'provider_error', code: 'x' });
    expect(r.onEvent).toBeInstanceOf(Function);
  });

  it('keeps consumer values', () => {
    const now = (): Date => new Date(0);
    const proof = { secret: SECRET, store: new MemoryCodeStore(), keyPrefix: 'k:' };
    const r = resolveOptions({
      environment: 'dev',
      provider: 'signed',
      proof,
      limits: { requestMax: 2 },
      otpLength: 4,
      resendAfterSec: 0,
      keyPrefix: 'a',
      now,
    });
    expect(r.limits.requestMax).toBe(2);
    expect(r.limits.wrongMax).toBe(5);
    expect(r.proof).toBe(proof);
    expect(r.now).toBe(now);
    expect(r.otpLength).toBe(4);
  });

  it('rejects malformed values naming the fields only', () => {
    expect(codeOf({ environment: 'qa' as 'dev', provider: 'fake' })).toBe('OTP_CONFIG_INVALID');
    expect(codeOf({ environment: 'dev', provider: 'firebase' as 'fake' })).toBe(
      'OTP_CONFIG_INVALID',
    );
    expect(codeOf({ environment: 'dev', provider: 'fake', otpLength: 2 })).toBe(
      'OTP_CONFIG_INVALID',
    );
    expect(codeOf({ environment: 'dev', provider: 'fake', limits: { requestMax: 0 } })).toBe(
      'OTP_CONFIG_INVALID',
    );
  });

  it('requires a verifier for custom and a strong secret for signed', () => {
    expect(codeOf({ environment: 'dev', provider: 'custom' })).toBe('OTP_CONFIG_INVALID');
    expect(resolveOptions({ environment: 'dev', provider: 'custom', verifier }).verifier).toBe(
      verifier,
    );
    expect(codeOf({ environment: 'dev', provider: 'signed' })).toBe('OTP_CONFIG_INVALID');
    expect(
      codeOf({
        environment: 'dev',
        provider: 'signed',
        proof: { secret: 'short', store: new MemoryCodeStore() },
      }),
    ).toBe('OTP_CONFIG_INVALID');
  });

  describe('production rules', () => {
    it('accepts a signed setup with shared stores', () => {
      expect(resolveOptions({ ...prod, store: store('shared') }).environment).toBe('prod');
    });
    it('refuses fake, local limit stores and local proof stores', () => {
      expect(codeOf({ environment: 'prod', provider: 'fake' })).toBe('OTP_CONFIG_INVALID');
      expect(codeOf({ ...prod, store: store('local') })).toBe('OTP_CONFIG_INVALID');
      expect(codeOf({ ...prod, proof: { secret: SECRET, store: new MemoryCodeStore() } })).toBe(
        'OTP_CONFIG_INVALID',
      );
    });
    it('allows a custom verifier', () => {
      expect(resolveOptions({ environment: 'prod', provider: 'custom', verifier }).provider).toBe(
        'custom',
      );
    });
  });
});
