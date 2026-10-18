import { fakeProof } from '../src/adapters/fake';
import { MemoryLimitStore } from '../src/adapters/memory-store';
import { createLimits, type Limits } from '../src/limits';
import type { OtpEvent, OtpProvider } from '../src/ports';
import { createOtpService } from '../src/service';

const PHONE = '+962791234567';
const OTHER = '+962781234567';
const config = {
  requestMax: 3,
  requestWindowSec: 300,
  wrongMax: 3,
  blockSec: 900,
  resendAfterSec: 60,
};

describe('limits engine', () => {
  let time = 0;
  const make = (): Limits => createLimits(new MemoryLimitStore(() => time), config, 'ns:');
  beforeEach(() => {
    time = 1_000_000;
  });

  it('allows a request, then holds the resend cooldown', async () => {
    const limits = make();
    expect(await limits.request(PHONE)).toMatchObject({ allowed: true, resendAfterSeconds: 60 });
    time += 10_000;
    expect(await limits.request(PHONE)).toMatchObject({
      allowed: false,
      blocked: false,
      resendAfterSeconds: 50,
    });
  });

  it('blocks on the request that reaches the limit; the next one is denied', async () => {
    const limits = make();
    for (let i = 0; i < 3; i += 1) {
      const d = await limits.request(PHONE);
      expect(d.allowed).toBe(true);
      time += 61_000;
    }
    const denied = await limits.request(PHONE);
    expect(denied).toMatchObject({ allowed: false, blocked: true, resendAfterSeconds: 0 });
    expect(denied.retryAfterMs).toBeGreaterThan(0);
    time += 900_000;
    expect((await limits.request(PHONE)).allowed).toBe(true);
  });

  it('counts wrong attempts, blocks on the last, and shares the block with requests', async () => {
    const limits = make();
    expect(await limits.wrongAttempt(PHONE)).toMatchObject({
      blocked: false,
      attemptsRemaining: 2,
    });
    expect(await limits.wrongAttempt(PHONE)).toMatchObject({
      blocked: false,
      attemptsRemaining: 1,
    });
    expect(await limits.wrongAttempt(PHONE)).toMatchObject({
      blocked: true,
      attemptsRemaining: 0,
      retryAfterMs: 900_000,
    });
    expect(await limits.request(PHONE)).toMatchObject({ allowed: false, blocked: true });
    expect(await limits.status(PHONE)).toMatchObject({ blocked: true, attemptsRemaining: 0 });
    expect(await limits.wrongAttempt(PHONE)).toMatchObject({ blocked: true, attemptsRemaining: 0 });
  });

  it('keeps phones independent and resets everything', async () => {
    const limits = make();
    await limits.wrongAttempt(PHONE);
    expect(await limits.status(OTHER)).toMatchObject({ blocked: false, attemptsRemaining: 3 });
    expect(await limits.status(PHONE)).toMatchObject({ attemptsRemaining: 2 });
    await limits.request(PHONE);
    await limits.reset(PHONE);
    expect(await limits.status(PHONE)).toMatchObject({ blocked: false, attemptsRemaining: 3 });
    expect((await limits.request(PHONE)).allowed).toBe(true);
  });
});

describe('createOtpService', () => {
  const events: OtpEvent[] = [];
  const build = (extra: Record<string, unknown> = {}): OtpProvider =>
    createOtpService({
      environment: 'dev',
      provider: 'fake',
      limits: { requestMax: 2, wrongMax: 2 },
      onEvent: (e) => {
        events.push(e);
      },
      now: () => new Date(0),
      ...extra,
    });
  beforeEach(() => {
    events.length = 0;
  });

  it('exposes config without I/O', () => {
    expect(build({ otpLength: 4, resendAfterSec: 30 }).getConfig()).toEqual({
      otpLength: 4,
      resendAfterSeconds: 30,
    });
  });

  it('prechecks: allowed, then resend wait, then block with blockedUntil', async () => {
    const otp = build({ resendAfterSec: 0, limits: { requestMax: 2, blockSec: 60 } });
    expect(await otp.precheck({ phone: PHONE, purpose: 'LOGIN' })).toEqual({
      allowed: true,
      otpLength: 6,
      resendAfterSeconds: 0,
    });
    const second = await otp.precheck({ phone: PHONE, purpose: 'LOGIN' });
    expect(second.allowed).toBe(true);
    const third = await otp.precheck({ phone: PHONE, purpose: 'LOGIN' });
    expect(third).toMatchObject({ allowed: false, blockedUntil: new Date(60_000) });
    expect(events.filter((e) => e.type === 'precheck')).toHaveLength(3);
  });

  it('holds the resend cooldown without a blockedUntil', async () => {
    const otp = build();
    await otp.precheck({ phone: PHONE, purpose: 'LOGIN' });
    const r = await otp.precheck({ phone: PHONE, purpose: 'LOGIN' });
    expect(r.allowed).toBe(false);
    expect(r.blockedUntil).toBeUndefined();
    expect(r.resendAfterSeconds).toBeGreaterThan(0);
  });

  it('verifies, resets limits on success and answers BLOCKED while blocked', async () => {
    const otp = build();
    await otp.reportFailure({ phone: PHONE, purpose: 'LOGIN', reason: 'WRONG_CODE' });
    const ok = await otp.verify({
      proof: fakeProof(PHONE),
      expectedPhone: PHONE,
      purpose: 'LOGIN',
    });
    expect(ok).toEqual({ outcome: 'VERIFIED', phone: PHONE });
    // counter was reset by the success, so two more wrong codes are needed to block
    expect(
      await otp.reportFailure({ phone: PHONE, purpose: 'LOGIN', reason: 'WRONG_CODE' }),
    ).toMatchObject({
      blocked: false,
      attemptsRemaining: 1,
    });
    const blocked = await otp.reportFailure({
      phone: PHONE,
      purpose: 'LOGIN',
      reason: 'WRONG_CODE',
    });
    expect(blocked).toMatchObject({ blocked: true, attemptsRemaining: 0 });
    expect(blocked.blockedUntil).toBeInstanceOf(Date);
    expect(
      await otp.verify({ proof: fakeProof(PHONE), expectedPhone: PHONE, purpose: 'LOGIN' }),
    ).toEqual({
      outcome: 'BLOCKED',
    });
    expect(events).toContainEqual({ type: 'verify', outcome: 'BLOCKED', purpose: 'LOGIN' });
  });

  it('does not reset limits after a failed proof', async () => {
    const otp = build();
    await otp.reportFailure({ phone: PHONE, purpose: 'LOGIN', reason: 'WRONG_CODE' });
    const bad = await otp.verify({
      proof: fakeProof(OTHER),
      expectedPhone: PHONE,
      purpose: 'LOGIN',
    });
    expect(bad).toEqual({ outcome: 'PHONE_MISMATCH' });
    expect(
      await otp.reportFailure({ phone: PHONE, purpose: 'LOGIN', reason: 'WRONG_CODE' }),
    ).toMatchObject({
      blocked: true,
    });
  });

  it('counts only wrong codes, not expiry or provider errors', async () => {
    const otp = build();
    for (const reason of ['EXPIRED', 'PROVIDER_ERROR'] as const) {
      expect(await otp.reportFailure({ phone: PHONE, purpose: 'LOGIN', reason })).toEqual({
        blocked: false,
        attemptsRemaining: 2,
      });
    }
  });

  it('rejects bad input with typed validation errors', async () => {
    const otp = build();
    await expect(otp.precheck({ phone: 'x', purpose: 'LOGIN' })).rejects.toMatchObject({
      code: 'OTP_INPUT_INVALID',
    });
    await expect(otp.precheck({ phone: PHONE, purpose: 'login' })).rejects.toMatchObject({
      code: 'OTP_INPUT_INVALID',
    });
    await expect(
      otp.verify({ proof: 'p', expectedPhone: 'x', purpose: 'LOGIN' }),
    ).rejects.toMatchObject({ code: 'OTP_INPUT_INVALID' });
    await expect(
      otp.reportFailure({ phone: 'x', purpose: 'LOGIN', reason: 'WRONG_CODE' }),
    ).rejects.toMatchObject({ code: 'OTP_INPUT_INVALID' });
    await expect(
      otp.reportFailure({ phone: PHONE, purpose: 'x', reason: 'WRONG_CODE' }),
    ).rejects.toMatchObject({ code: 'OTP_INPUT_INVALID' });
    await expect(
      otp.reportFailure({ phone: PHONE, purpose: 'LOGIN', reason: 'NOPE' as 'EXPIRED' }),
    ).rejects.toMatchObject({ code: 'OTP_INPUT_INVALID' });
  });

  it('requires a shared store in production and closes store + adapter', async () => {
    expect(() =>
      createOtpService({
        environment: 'prod',
        provider: 'custom',
        verifier: { verify: () => Promise.resolve({ outcome: 'INVALID_PROOF' }) },
      }),
    ).toThrow('shared limit store');
    const closeStore = jest.fn().mockResolvedValue(undefined);
    const closeVerifier = jest.fn().mockResolvedValue(undefined);
    const store = Object.assign(new MemoryLimitStore(), {
      close: closeStore,
      scope: 'shared' as const,
    });
    const otp = createOtpService({
      environment: 'prod',
      provider: 'custom',
      verifier: {
        verify: () => Promise.resolve({ outcome: 'INVALID_PROOF' }),
        close: closeVerifier,
      },
      store,
    });
    await otp.close();
    expect(closeStore).toHaveBeenCalledTimes(1);
    expect(closeVerifier).toHaveBeenCalledTimes(1);
  });

  it('closes cleanly with no hooks', async () => {
    await expect(build().close()).resolves.toBeUndefined();
  });
});
