import { createEmulatorToken, createEmulatorVerifier } from '../src/adapters/firebase/emulator';
import { resolveOptions } from '../src/config/options';
import type { ProofVerifier, VerifyInput } from '../src/ports';
import { createOtpService } from '../src/service';
import { createOtpVerifier } from '../src/verifier';
import { baseClaims, makeKey, NOW, PHONE, PROJECT, signToken } from './helpers/firebase';

const OTHER = '+962781234567';
const input = (proof: string, expectedPhone = PHONE): VerifyInput => ({
  proof,
  expectedPhone,
  purpose: 'LOGIN',
});
const devOptions = {
  environment: 'dev',
  provider: 'firebase',
  firebase: { projectId: PROJECT, authEmulatorHost: 'localhost:9099' },
  now: () => NOW,
} as const;
const token = (over: { expiresInSec?: number; phone?: string; projectId?: string } = {}): string =>
  createEmulatorToken({ projectId: PROJECT, phone: PHONE, now: NOW, ...over });

describe('Firebase Auth emulator mode (dev, localhost)', () => {
  let verifier: ProofVerifier;
  beforeEach(() => {
    verifier = createOtpVerifier(devOptions);
  });

  it('verifies an emulator-shaped unsigned token without any network call', async () => {
    const original = globalThis.fetch;
    globalThis.fetch = () => {
      throw new Error('network is forbidden in emulator mode');
    };
    try {
      await expect(verifier.verify(input(token()))).resolves.toEqual({
        outcome: 'VERIFIED',
        phone: PHONE,
      });
    } finally {
      globalThis.fetch = original;
    }
  });

  it('applies the same claim checks as the real verifier', async () => {
    await expect(verifier.verify(input(token(), OTHER))).resolves.toEqual({
      outcome: 'PHONE_MISMATCH',
    });
    await expect(verifier.verify(input(token({ expiresInSec: -600 })))).resolves.toEqual({
      outcome: 'EXPIRED',
    });
    await expect(verifier.verify(input(token({ projectId: 'other' })))).resolves.toEqual({
      outcome: 'INVALID_PROOF',
    });
  });

  it('rejects malformed, signed, wrong-issuer and incomplete tokens', async () => {
    const key = await makeKey();
    const noExp = (() => {
      const claims = baseClaims();
      Reflect.deleteProperty(claims, 'exp');
      const part = (v: unknown): string => Buffer.from(JSON.stringify(v)).toString('base64url');
      return `${part({ alg: 'none' })}.${part(claims)}.`;
    })();
    const badIss = (() => {
      const part = (v: unknown): string => Buffer.from(JSON.stringify(v)).toString('base64url');
      return `${part({ alg: 'none' })}.${part({ ...baseClaims(), iss: 'https://evil.example/x' })}.`;
    })();
    for (const proof of ['garbage', 'a.b.', await signToken(key), noExp, badIss]) {
      await expect(verifier.verify(input(proof))).resolves.toEqual({ outcome: 'INVALID_PROOF' });
    }
  });

  it('works through the full service with limits', async () => {
    const otp = createOtpService(devOptions);
    await expect(
      otp.verify({ proof: token(), expectedPhone: PHONE, purpose: 'LOGIN' }),
    ).resolves.toMatchObject({ outcome: 'VERIFIED' });
  });

  it('is refused in production by the options and by the verifier itself', () => {
    expect(() =>
      createOtpVerifier({
        environment: 'prod',
        provider: 'firebase',
        firebase: { projectId: PROJECT, authEmulatorHost: 'localhost:9099' },
      }),
    ).toThrow('forbidden in production');
    const prodLike = { ...resolveOptions(devOptions), environment: 'prod' as const };
    expect(() => createEmulatorVerifier(prodLike)).toThrow('dev with authEmulatorHost');
    const noHost = resolveOptions({
      environment: 'dev',
      provider: 'firebase',
      firebase: { projectId: PROJECT },
    });
    expect(() => createEmulatorVerifier(noHost)).toThrow('dev with authEmulatorHost');
  });
});

describe('createEmulatorToken', () => {
  it('builds the claim shape the emulator issues', () => {
    const [header, body, signature] = token().split('.');
    expect(JSON.parse(Buffer.from(header ?? '', 'base64url').toString())).toEqual({
      alg: 'none',
      typ: 'JWT',
    });
    expect(JSON.parse(Buffer.from(body ?? '', 'base64url').toString())).toMatchObject({
      iss: `https://securetoken.google.com/${PROJECT}`,
      aud: PROJECT,
      sub: 'emulator-user',
      user_id: 'emulator-user',
      phone_number: PHONE,
      firebase: { sign_in_provider: 'phone' },
    });
    expect(signature).toBe('');
  });
  it('defaults the clock and honours a custom uid', () => {
    const [, body] = createEmulatorToken({ projectId: 'p', phone: PHONE, uid: 'u1' }).split('.');
    const claims = JSON.parse(Buffer.from(body ?? '', 'base64url').toString()) as { sub: string };
    expect(claims.sub).toBe('u1');
  });
});
