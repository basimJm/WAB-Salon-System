import { createFirebaseVerifier, checkClaims } from '../src/adapters/firebase';
import type { KeyProvider } from '../src/adapters/firebase/keys';
import { resolveOptions } from '../src/config/options';
import type { ProofVerifier, VerifyInput } from '../src/ports';
import { createOtpVerifier } from '../src/verifier';
import {
  baseClaims,
  jwks,
  KID,
  makeKey,
  NOW,
  nowSec,
  PHONE,
  PROJECT,
  signToken,
  stubFetch,
  type TestKey,
  type TokenOptions,
} from './helpers/firebase';

const OTHER = '+962781234567';
const input = (proof: string, expectedPhone = PHONE): VerifyInput => ({
  proof,
  expectedPhone,
  purpose: 'LOGIN',
});

describe('Firebase ID-token verification (local RSA keys, stubbed key endpoint)', () => {
  let key: TestKey;
  let verifier: ProofVerifier;
  let fetchCalls: () => number;
  let time: Date;

  beforeAll(async () => {
    key = await makeKey();
  });
  beforeEach(() => {
    time = NOW;
    const stub = stubFetch(() => ({ body: jwks(key) }));
    fetchCalls = stub.calls;
    verifier = createOtpVerifier({
      environment: 'prod',
      provider: 'firebase',
      firebase: { projectId: PROJECT, fetch: stub.fetch },
      store: { scope: 'shared' } as never,
      now: () => time,
    });
  });
  const verify = async (token: TokenOptions, expected = PHONE): Promise<unknown> =>
    verifier.verify(input(await signToken(key, token), expected));

  it('verifies a valid phone sign-in token', async () => {
    await expect(verify({})).resolves.toEqual({ outcome: 'VERIFIED', phone: PHONE });
    await verify({});
    expect(fetchCalls()).toBe(1);
  });

  it('answers PHONE_MISMATCH when the verified phone differs', async () => {
    await expect(verify({}, OTHER)).resolves.toEqual({ outcome: 'PHONE_MISMATCH' });
  });

  it('answers EXPIRED for an expired token and tolerates the configured clock skew', async () => {
    await expect(verify({ claims: { exp: nowSec - 600 } })).resolves.toEqual({
      outcome: 'EXPIRED',
    });
    await expect(verify({ claims: { exp: nowSec - 10 } })).resolves.toMatchObject({
      outcome: 'VERIFIED',
    });
  });

  it('answers EXPIRED when the sign-in is older than the freshness window', async () => {
    await expect(
      verify({ claims: { auth_time: nowSec - 700, iat: nowSec - 700 } }),
    ).resolves.toEqual({
      outcome: 'EXPIRED',
    });
  });

  it('answers INVALID_PROOF for wrong audience, issuer, provider, subject and phone claims', async () => {
    const bad: TokenOptions[] = [
      { claims: { aud: 'other-project' } },
      { claims: { iss: 'https://securetoken.google.com/other-project' } },
      { claims: { iss: 'https://evil.example/wab-test-project' } },
      { claims: { firebase: { sign_in_provider: 'password' } } },
      { claims: { firebase: 'phone' } },
      { omit: ['firebase'] },
      { claims: { sub: '' } },
      { claims: { sub: 's'.repeat(129) } },
      { omit: ['sub'] },
      { omit: ['iat'] },
      { omit: ['exp'] },
      { claims: { iat: nowSec + 3600 } },
      { omit: ['auth_time'] },
      { claims: { auth_time: nowSec + 3600 } },
      { claims: { phone_number: '0791234567' } },
      { omit: ['phone_number'] },
    ];
    for (const token of bad) {
      await expect(verify(token)).resolves.toEqual({ outcome: 'INVALID_PROOF' });
    }
  });

  it('answers INVALID_PROOF for forged signatures, unknown kid, wrong alg and garbage', async () => {
    const forger = await makeKey(KID);
    await expect(verify({ key: forger })).resolves.toEqual({ outcome: 'INVALID_PROOF' });
    await expect(verify({ kid: 'unknown-kid' })).resolves.toEqual({ outcome: 'INVALID_PROOF' });
    await expect(verify({ kid: null })).resolves.toEqual({ outcome: 'INVALID_PROOF' });
    await expect(verify({ alg: 'RS512' })).resolves.toEqual({ outcome: 'INVALID_PROOF' });
    for (const garbage of ['garbage', 'a.b.c', '....', 'eyJhbGciOiJub25lIn0.e30.']) {
      await expect(verifier.verify(input(garbage))).resolves.toEqual({ outcome: 'INVALID_PROOF' });
    }
  });

  it('rejects an unsigned (alg none) token', async () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', kid: KID })).toString('base64url');
    const body = Buffer.from(JSON.stringify(baseClaims())).toString('base64url');
    await expect(verifier.verify(input(`${header}.${body}.`))).resolves.toEqual({
      outcome: 'INVALID_PROOF',
    });
  });

  it('throws a typed retryable error when the key endpoint is down and nothing is cached', async () => {
    const down = stubFetch(() => ({ status: 503 }));
    const v = createOtpVerifier({
      environment: 'dev',
      provider: 'firebase',
      firebase: { projectId: PROJECT, fetch: down.fetch },
      retry: { maxAttempts: 2, baseDelayMs: 0, maxDelayMs: 1 },
      retryDeps: { sleep: () => Promise.resolve(), random: () => 0.5 },
      now: () => time,
    });
    await expect(v.verify(input(await signToken(key, {})))).rejects.toMatchObject({
      code: 'OTP_PROVIDER_UNAVAILABLE',
      retryable: true,
    });
    expect(down.calls()).toBe(2);
  });

  it('rethrows unexpected non-JOSE errors from verification', async () => {
    const resolved = resolveOptions({
      environment: 'dev',
      provider: 'firebase',
      firebase: { projectId: PROJECT },
      now: () => time,
    });
    const keys: KeyProvider = { getKey: () => Promise.resolve('not a key' as never) };
    const v = createFirebaseVerifier(resolved, { keys });
    await expect(v.verify(input(await signToken(key, {})))).rejects.toBeDefined();
  });

  it('uses the global fetch when none is injected', async () => {
    const original = globalThis.fetch;
    const stub = stubFetch(() => ({ body: jwks(key) }));
    globalThis.fetch = ((url: string, init: never) => stub.fetch(url, init)) as never;
    try {
      const v = createOtpVerifier({
        environment: 'dev',
        provider: 'firebase',
        firebase: { projectId: PROJECT },
        now: () => time,
      });
      await expect(v.verify(input(await signToken(key, {})))).resolves.toMatchObject({
        outcome: 'VERIFIED',
      });
    } finally {
      globalThis.fetch = original;
    }
  });
});

describe('checkClaims', () => {
  const now = NOW;
  it('accepts a fresh phone sign-in', () => {
    expect(checkClaims(baseClaims(), now, 30, 600)).toBeNull();
  });
  it('accepts auth_time exactly at the edge of the window', () => {
    expect(checkClaims({ ...baseClaims(), auth_time: nowSec - 630 }, now, 30, 600)).toBeNull();
    expect(checkClaims({ ...baseClaims(), auth_time: nowSec - 631 }, now, 30, 600)).toEqual({
      outcome: 'EXPIRED',
    });
  });
});
