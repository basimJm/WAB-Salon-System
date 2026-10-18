import { decodeProtectedHeader, errors, jwtVerify, type JWTPayload } from 'jose';
import type { ResolvedOptions } from '../../config/options';
import { DEFAULT_FIREBASE, MS_PER_SECOND } from '../../constants/defaults';
import type { ProofVerifier, VerifyInput, VerifyResult } from '../../ports';
import { isE164 } from '../../validation';
import { createKeyProvider, type KeyProvider } from './keys';

const INVALID: VerifyResult = { outcome: 'INVALID_PROOF' };
const EXPIRED: VerifyResult = { outcome: 'EXPIRED' };

export interface FirebaseVerifierDeps {
  readonly keys?: KeyProvider;
}

const header = (token: string): { kid: string } | null => {
  try {
    const { alg, kid } = decodeProtectedHeader(token);
    return alg === DEFAULT_FIREBASE.algorithm && typeof kid === 'string' && kid !== ''
      ? { kid }
      : null;
  } catch {
    return null;
  }
};

/** `firebase.sign_in_provider` must be `phone`; anything else (email, anonymous…) is not an OTP proof. */
const isPhoneSignIn = (payload: JWTPayload): boolean => {
  const firebase = payload[DEFAULT_FIREBASE.claims.firebase];
  return (
    typeof firebase === 'object' &&
    firebase !== null &&
    (firebase as Record<string, unknown>)[DEFAULT_FIREBASE.claims.provider] ===
      DEFAULT_FIREBASE.signInProviderPhone
  );
};

/**
 * Claims Firebase documents for ID tokens that `jwtVerify` does not check: subject, issue time in
 * the future, and the freshness of the sign-in (`auth_time`), so a proof belongs to the code the
 * user just typed. Returns the outcome to answer, or `null` when the claims are fine.
 */
export const checkClaims = (
  payload: JWTPayload,
  now: Date,
  skewSec: number,
  maxAuthAgeSec: number,
): VerifyResult | null => {
  const nowSec = Math.floor(now.getTime() / MS_PER_SECOND);
  const authTime = payload[DEFAULT_FIREBASE.claims.authTime];
  const subjectOk =
    typeof payload.sub === 'string' &&
    payload.sub !== '' &&
    payload.sub.length <= DEFAULT_FIREBASE.maxSubjectLength;
  if (!subjectOk || typeof payload.iat !== 'number' || payload.iat > nowSec + skewSec)
    return INVALID;
  if (typeof authTime !== 'number' || authTime > nowSec + skewSec) return INVALID;
  if (!isPhoneSignIn(payload)) return INVALID;
  return nowSec - authTime > maxAuthAgeSec + skewSec ? EXPIRED : null;
};

/**
 * Verifies a Firebase Phone Auth ID token on the server: RS256 signature against Google's rotating
 * public keys, issuer, audience (project id), expiry, subject, sign-in freshness and provider, then
 * compares the verified phone number with the expected one. Key-endpoint failures throw.
 */
export const createFirebaseVerifier = (
  resolved: ResolvedOptions,
  deps: FirebaseVerifierDeps = {},
): ProofVerifier => {
  const { firebase } = resolved;
  const keys =
    deps.keys ??
    createKeyProvider({
      url: firebase.jwksUrl,
      fetch: firebase.fetch ?? defaultFetch,
      timeoutMs: firebase.timeoutMs,
      retry: resolved.retry,
      retryDeps: resolved.retryDeps,
      now: resolved.now,
      logger: resolved.logger,
    });

  return {
    verify: async ({ proof, expectedPhone }: VerifyInput): Promise<VerifyResult> => {
      const head = header(proof);
      if (head === null) return INVALID;
      const key = await keys.getKey(head.kid);
      if (key === null) return INVALID;
      let payload: JWTPayload;
      try {
        ({ payload } = await jwtVerify(proof, key, {
          algorithms: [DEFAULT_FIREBASE.algorithm],
          issuer: `${DEFAULT_FIREBASE.issuerPrefix}${firebase.projectId}`,
          audience: firebase.projectId,
          clockTolerance: firebase.clockSkewSec,
          currentDate: resolved.now(),
          requiredClaims: ['exp', 'iat', 'sub'],
        }));
      } catch (error) {
        if (error instanceof errors.JWTExpired) return EXPIRED;
        if (error instanceof errors.JOSEError) return INVALID;
        throw error;
      }
      const claimsOutcome = checkClaims(
        payload,
        resolved.now(),
        firebase.clockSkewSec,
        firebase.maxAuthAgeSec,
      );
      if (claimsOutcome !== null) return claimsOutcome;
      const phone = payload[DEFAULT_FIREBASE.claims.phone];
      if (!isE164(phone)) return INVALID;
      return phone === expectedPhone
        ? { outcome: 'VERIFIED', phone }
        : { outcome: 'PHONE_MISMATCH' };
    },
  };
};

const defaultFetch: NonNullable<ResolvedOptions['firebase']['fetch']> = (url, init) =>
  fetch(url, init);
