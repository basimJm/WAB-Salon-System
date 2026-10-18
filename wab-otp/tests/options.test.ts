import { resolveOptions, type OtpOptions } from '../src/config/options';
import type { LimitStore, ProofVerifier } from '../src/ports';

const verifier: ProofVerifier = { verify: () => Promise.resolve({ outcome: 'INVALID_PROOF' }) };
const store = (scope: 'local' | 'shared'): LimitStore => ({
  scope,
  hit: () => Promise.resolve({ allowed: true, blocked: false, count: 1, retryAfterMs: 0 }),
  countOf: () => Promise.resolve(0),
  blockTtlMs: () => Promise.resolve(0),
  startCooldown: () => Promise.resolve({ started: true, retryAfterMs: 0 }),
  reset: () => Promise.resolve(),
});
const prod: OtpOptions = {
  environment: 'prod',
  provider: 'firebase',
  firebase: { projectId: 'wab-prod' },
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
    expect(r.retry.maxAttempts).toBe(3);
    expect(r.firebase.jwksUrl).toContain('https://');
    expect(r.now()).toBeInstanceOf(Date);
    r.onEvent({ type: 'provider_error', code: 'x' });
    expect(r.onEvent).toBeInstanceOf(Function);
  });

  it('keeps consumer values', () => {
    const now = (): Date => new Date(0);
    const r = resolveOptions({
      environment: 'dev',
      provider: 'firebase',
      firebase: {
        projectId: 'p',
        authEmulatorHost: 'localhost:9099',
        jwksUrl: 'http://localhost:1/jwk',
        timeoutMs: 10,
        clockSkewSec: 1,
        maxAuthAgeSec: 2,
        fetch: () => Promise.reject(new Error('x')),
      },
      limits: { requestMax: 2 },
      otpLength: 4,
      resendAfterSec: 0,
      keyPrefix: 'a',
      now,
    });
    expect(r.limits.requestMax).toBe(2);
    expect(r.limits.wrongMax).toBe(5);
    expect(r.firebase).toMatchObject({
      authEmulatorHost: 'localhost:9099',
      timeoutMs: 10,
      projectId: 'p',
    });
    expect(r.firebase.fetch).toBeDefined();
    expect(r.now).toBe(now);
    expect(r.otpLength).toBe(4);
  });

  it('rejects malformed values naming the fields only', () => {
    expect(codeOf({ environment: 'qa' as 'dev', provider: 'fake' })).toBe('OTP_CONFIG_INVALID');
    expect(codeOf({ environment: 'dev', provider: 'fake', otpLength: 2 })).toBe(
      'OTP_CONFIG_INVALID',
    );
    expect(codeOf({ environment: 'dev', provider: 'fake', limits: { requestMax: 0 } })).toBe(
      'OTP_CONFIG_INVALID',
    );
    expect(
      codeOf({
        environment: 'dev',
        provider: 'firebase',
        firebase: { projectId: 'p', authEmulatorHost: 'no port' },
      }),
    ).toBe('OTP_CONFIG_INVALID');
    expect(codeOf({ environment: 'dev', provider: 'fake', retry: { jitterRatio: 2 } })).toBe(
      'OTP_CONFIG_INVALID',
    );
  });

  it('requires a verifier for custom and a project for firebase', () => {
    expect(codeOf({ environment: 'dev', provider: 'custom' })).toBe('OTP_CONFIG_INVALID');
    expect(resolveOptions({ environment: 'dev', provider: 'custom', verifier }).verifier).toBe(
      verifier,
    );
    expect(codeOf({ environment: 'dev', provider: 'firebase' })).toBe('OTP_CONFIG_INVALID');
    expect(codeOf({ environment: 'dev', provider: 'firebase', firebase: { projectId: ' ' } })).toBe(
      'OTP_CONFIG_INVALID',
    );
  });

  it('refuses an emulator host without the firebase provider', () => {
    expect(
      codeOf({
        environment: 'dev',
        provider: 'fake',
        firebase: { projectId: 'p', authEmulatorHost: 'localhost:9099' },
      }),
    ).toBe('OTP_CONFIG_INVALID');
  });

  describe('production rules', () => {
    it('accepts a strict firebase setup with a shared store', () => {
      expect(resolveOptions({ ...prod, store: store('shared') }).environment).toBe('prod');
    });
    it('refuses fake, missing project, emulator, http keys and local stores', () => {
      expect(codeOf({ environment: 'prod', provider: 'fake' })).toBe('OTP_CONFIG_INVALID');
      expect(codeOf({ environment: 'prod', provider: 'firebase' })).toBe('OTP_CONFIG_INVALID');
      expect(
        codeOf({ environment: 'prod', provider: 'firebase', firebase: { projectId: '  ' } }),
      ).toBe('OTP_CONFIG_INVALID');
      expect(
        codeOf({ ...prod, firebase: { projectId: 'p', authEmulatorHost: 'localhost:9099' } }),
      ).toBe('OTP_CONFIG_INVALID');
      expect(codeOf({ ...prod, firebase: { projectId: 'p', jwksUrl: 'http://x.test/jwk' } })).toBe(
        'OTP_CONFIG_INVALID',
      );
      expect(codeOf({ ...prod, store: store('local') })).toBe('OTP_CONFIG_INVALID');
    });
    it('allows a custom verifier', () => {
      expect(resolveOptions({ environment: 'prod', provider: 'custom', verifier }).provider).toBe(
        'custom',
      );
    });
    it('allows an https key endpoint', () => {
      expect(
        resolveOptions({ ...prod, firebase: { projectId: 'p', jwksUrl: 'https://k.test/jwk' } })
          .firebase.jwksUrl,
      ).toBe('https://k.test/jwk');
    });
  });
});
