import { SignJWT, exportJWK, generateKeyPair, type JWK, type KeyLike } from 'jose';
import type { FetchLike } from '../../src/config/options';

export const PROJECT = 'wab-test-project';
export const PHONE = '+962791234567';
export const KID = 'kid-1';
export const NOW = new Date('2026-10-18T10:00:00Z');
export const nowSec = Math.floor(NOW.getTime() / 1000);

export interface TestKey {
  readonly kid: string;
  readonly privateKey: KeyLike;
  readonly jwk: JWK & { kid: string };
}

/** A locally generated RSA key standing in for one of Google's signing keys. */
export const makeKey = async (kid = KID): Promise<TestKey> => {
  const { privateKey, publicKey } = await generateKeyPair('RS256', { extractable: true });
  const jwk = { ...(await exportJWK(publicKey)), kid, alg: 'RS256', use: 'sig' };
  return { kid, privateKey, jwk };
};

export interface TokenOptions {
  readonly claims?: Record<string, unknown>;
  readonly omit?: readonly string[];
  readonly key?: TestKey;
  readonly alg?: string;
  readonly kid?: string | null;
}

/** Claims of a real Firebase phone sign-in ID token. */
export const baseClaims = (): Record<string, unknown> => ({
  iss: `https://securetoken.google.com/${PROJECT}`,
  aud: PROJECT,
  sub: 'uid-123',
  iat: nowSec - 30,
  exp: nowSec + 3000,
  auth_time: nowSec - 30,
  phone_number: PHONE,
  firebase: { identities: { phone: [PHONE] }, sign_in_provider: 'phone' },
});

export const signToken = async (key: TestKey, options: TokenOptions = {}): Promise<string> => {
  const claims = { ...baseClaims(), ...options.claims };
  for (const name of options.omit ?? []) Reflect.deleteProperty(claims, name);
  const header: Record<string, unknown> = { alg: options.alg ?? 'RS256', typ: 'JWT' };
  if (options.kid !== null) header['kid'] = options.kid ?? key.kid;
  return new SignJWT(claims)
    .setProtectedHeader(header as { alg: string })
    .sign(options.key?.privateKey ?? key.privateKey);
};

export interface StubResponse {
  readonly status?: number;
  readonly body?: unknown;
  readonly cacheControl?: string | null;
  readonly json?: () => Promise<unknown>;
}

/** A stub of Google's key endpoint; `respond` can change between calls. */
export const stubFetch = (
  respond: (call: number) => StubResponse | Error,
): { fetch: FetchLike; calls: () => number } => {
  let calls = 0;
  const fetchStub: FetchLike = (_url, init) => {
    calls += 1;
    const answer = respond(calls);
    if (answer instanceof Error) return Promise.reject(answer);
    expect(init.signal).toBeInstanceOf(AbortSignal);
    return Promise.resolve({
      status: answer.status ?? 200,
      headers: {
        get: (name) =>
          name.toLowerCase() === 'cache-control'
            ? answer.cacheControl === undefined
              ? 'public, max-age=3600'
              : answer.cacheControl
            : null,
      },
      json: answer.json ?? (() => Promise.resolve(answer.body)),
    });
  };
  return { fetch: fetchStub, calls: () => calls };
};

export const jwks = (...keys: TestKey[]): { keys: JWK[] } => ({ keys: keys.map((k) => k.jwk) });
