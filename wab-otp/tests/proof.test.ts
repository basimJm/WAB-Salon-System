import { createHmac } from 'node:crypto';
import { MemoryCodeStore } from '../src/adapters/code-store/memory';
import { assertProofOptions, createProofs, type ProofOptions } from '../src/proof';
import type { CodeStore } from '../src/ports';

const PHONE = '+962791234567';
const SECRET = 'p'.repeat(32);
const START = new Date('2026-10-26T10:00:00Z');

describe('signed single-use OTP proof', () => {
  let now: Date;
  let store: MemoryCodeStore;
  let ids: number;
  const make = (over: Partial<ProofOptions> = {}): ReturnType<typeof createProofs> =>
    createProofs({
      secret: SECRET,
      store,
      now: () => now,
      newId: () => `jti-${String((ids += 1))}`,
      ...over,
    });
  const input = (
    proof: string,
    over: Record<string, string> = {},
  ): { proof: string; expectedPhone: string; purpose: string } => ({
    proof,
    expectedPhone: PHONE,
    purpose: 'LOGIN',
    ...over,
  });
  beforeEach(() => {
    now = START;
    ids = 0;
    store = new MemoryCodeStore(() => now.getTime());
  });

  it('issues a compact token with phone, purpose, jti, iat, exp and verifies it once', async () => {
    const proofs = make();
    const { otpToken, expiresInSec } = proofs.issue({ phone: PHONE, purpose: 'LOGIN' });
    expect(expiresInSec).toBe(600);
    expect(otpToken).toMatch(/^[\w-]+\.[\w-]+$/);
    const payload: unknown = JSON.parse(
      Buffer.from(otpToken.split('.')[0] ?? '', 'base64url').toString(),
    );
    const iat = START.getTime() / 1000;
    expect(payload).toEqual({
      v: 1,
      phone: PHONE,
      purpose: 'LOGIN',
      jti: 'jti-1',
      iat,
      exp: iat + 600,
    });
    await expect(proofs.verifier.verify(input(otpToken))).resolves.toEqual({
      outcome: 'VERIFIED',
      phone: PHONE,
    });
    // replay
    await expect(proofs.verifier.verify(input(otpToken))).resolves.toEqual({
      outcome: 'INVALID_PROOF',
    });
    expect(await store.get('otp:used:jti-1')).toBe('1');
  });

  it('lets exactly one of many concurrent uses win', async () => {
    const proofs = make();
    const { otpToken } = proofs.issue({ phone: PHONE, purpose: 'LOGIN' });
    const results = await Promise.all(
      Array.from({ length: 10 }, () => proofs.verifier.verify(input(otpToken))),
    );
    expect(results.filter((r) => r.outcome === 'VERIFIED')).toHaveLength(1);
  });

  it('expires at exp, and the used flag lives only as long as the proof', async () => {
    const proofs = make({ ttlSec: 60 });
    const first = proofs.issue({ phone: PHONE, purpose: 'LOGIN' });
    const second = proofs.issue({ phone: PHONE, purpose: 'LOGIN' });
    await proofs.verifier.verify(input(first.otpToken));
    now = new Date(START.getTime() + 59_000);
    expect(store.size()).toBe(1);
    now = new Date(START.getTime() + 60_000);
    expect(store.size()).toBe(0);
    await expect(proofs.verifier.verify(input(second.otpToken))).resolves.toEqual({
      outcome: 'EXPIRED',
    });
  });

  it('binds the phone and the purpose without consuming the proof on a mismatch', async () => {
    const proofs = make();
    const { otpToken } = proofs.issue({ phone: PHONE, purpose: 'LOGIN' });
    await expect(
      proofs.verifier.verify(input(otpToken, { expectedPhone: '+962781234567' })),
    ).resolves.toEqual({ outcome: 'PHONE_MISMATCH' });
    await expect(proofs.verifier.verify(input(otpToken, { purpose: 'REGISTER' }))).resolves.toEqual(
      {
        outcome: 'PURPOSE_MISMATCH',
      },
    );
    await expect(proofs.verifier.verify(input(otpToken))).resolves.toMatchObject({
      outcome: 'VERIFIED',
    });
  });

  it('refuses tampered, foreign-secret and malformed tokens', async () => {
    const proofs = make();
    const { otpToken } = proofs.issue({ phone: PHONE, purpose: 'LOGIN' });
    const [body, signature] = otpToken.split('.') as [string, string];
    const forged = Buffer.from(
      JSON.stringify({ v: 1, phone: PHONE, purpose: 'LOGIN', jti: 'x', iat: 0, exp: 9e9 }),
    ).toString('base64url');
    const sign = (text: string): string =>
      createHmac('sha256', SECRET).update(text).digest('base64url');
    const cases = [
      `${forged}.${signature}`,
      `${body}.${signature.slice(0, -2)}`,
      `${body}.${signature}.extra`,
      body,
      '.',
      make({ secret: 'q'.repeat(32) }).issue({ phone: PHONE, purpose: 'LOGIN' }).otpToken,
      // correctly signed but not a valid payload
      `${Buffer.from('not json').toString('base64url')}.${sign(Buffer.from('not json').toString('base64url'))}`,
      `${Buffer.from('{"v":2}').toString('base64url')}.${sign(Buffer.from('{"v":2}').toString('base64url'))}`,
    ];
    for (const proof of cases)
      await expect(proofs.verifier.verify(input(proof))).resolves.toEqual({
        outcome: 'INVALID_PROOF',
      });
  });

  it('uses the key prefix for used flags', async () => {
    const proofs = make({ keyPrefix: 'wab:' });
    const { otpToken } = proofs.issue({ phone: PHONE, purpose: 'LOGIN' });
    await proofs.verifier.verify(input(otpToken));
    expect(await store.get('wab:otp:used:jti-1')).toBe('1');
  });

  it('validates inputs and options', async () => {
    const proofs = make();
    expect(() => proofs.issue({ phone: '0791234567', purpose: 'LOGIN' })).toThrow('E.164');
    expect(() => proofs.issue({ phone: PHONE, purpose: 'login' })).toThrow('UPPER_SNAKE');
    await expect(proofs.verifier.verify(input(''))).rejects.toMatchObject({
      code: 'OTP_INPUT_INVALID',
    });
    expect(() => make({ secret: 'short' })).toThrow('too short');
    expect(() => make({ ttlSec: 0 })).toThrow('ttlSec');
    expect(() => make({ ttlSec: 1.5 })).toThrow('ttlSec');
    expect(() => assertProofOptions({ secret: 1 as unknown as string, store })).toThrow();
  });

  it('works with real time and random ids by default', async () => {
    const proofs = createProofs({ secret: SECRET, store: new MemoryCodeStore() });
    const a = proofs.issue({ phone: PHONE, purpose: 'LOGIN' }).otpToken;
    const b = proofs.issue({ phone: PHONE, purpose: 'LOGIN' }).otpToken;
    expect(a).not.toBe(b);
    await expect(proofs.verifier.verify(input(a))).resolves.toMatchObject({ outcome: 'VERIFIED' });
  });

  it('propagates a store outage as an error, never as success', async () => {
    const broken: CodeStore = {
      scope: 'shared',
      set: () => Promise.resolve(),
      get: () => Promise.resolve(null),
      delete: () => Promise.resolve(false),
      setIfAbsent: () => Promise.reject(new Error('down')),
    };
    const proofs = make({ store: broken });
    const { otpToken } = proofs.issue({ phone: PHONE, purpose: 'LOGIN' });
    await expect(proofs.verifier.verify(input(otpToken))).rejects.toThrow('down');
  });
});
