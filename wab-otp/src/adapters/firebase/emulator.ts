import { decodeJwt, decodeProtectedHeader, type JWTPayload } from 'jose';
import type { ResolvedOptions } from '../../config/options';
import { DEFAULT_FIREBASE, MS_PER_SECOND } from '../../constants/defaults';
import { configError } from '../../errors';
import type { ProofVerifier, VerifyInput, VerifyResult } from '../../ports';
import { finishVerification } from './index';

const INVALID: VerifyResult = { outcome: 'INVALID_PROOF' };
const EMULATOR_ALG = 'none';
const EMULATOR_TOKEN_LIFETIME_SEC = 3600;

const decode = (token: string): JWTPayload | null => {
  try {
    return decodeProtectedHeader(token).alg === EMULATOR_ALG ? decodeJwt(token) : null;
  } catch {
    return null;
  }
};

/**
 * Dev only (`firebase.authEmulatorHost`): the Firebase Auth emulator issues UNSIGNED ID tokens
 * (`alg: none`) with the real claim shapes. This verifier accepts exactly those, applies every
 * claim check of the real verifier (project, expiry, freshness, provider, phone) and nothing
 * else. Production refuses the emulator host in the options and again here.
 */
export const createEmulatorVerifier = (resolved: ResolvedOptions): ProofVerifier => {
  if (resolved.environment === 'prod' || resolved.firebase.authEmulatorHost === undefined)
    throw configError('The Firebase emulator verifier is for dev with authEmulatorHost only');
  const { firebase } = resolved;
  return {
    verify: ({ proof, expectedPhone }: VerifyInput): Promise<VerifyResult> => {
      const payload = decode(proof);
      if (payload === null) return Promise.resolve(INVALID);
      const issuer = `${DEFAULT_FIREBASE.issuerPrefix}${firebase.projectId}`;
      if (payload.iss !== issuer || payload.aud !== firebase.projectId)
        return Promise.resolve(INVALID);
      const nowSec = Math.floor(resolved.now().getTime() / MS_PER_SECOND);
      if (typeof payload.exp !== 'number') return Promise.resolve(INVALID);
      if (payload.exp + firebase.clockSkewSec < nowSec)
        return Promise.resolve({ outcome: 'EXPIRED' });
      return Promise.resolve(finishVerification(payload, expectedPhone, resolved));
    },
  };
};

export interface EmulatorTokenInput {
  readonly projectId: string;
  readonly phone: string;
  readonly now?: Date;
  readonly uid?: string;
  /** Seconds after `now`; negative = already expired. */
  readonly expiresInSec?: number;
}

const encode = (value: unknown): string => Buffer.from(JSON.stringify(value)).toString('base64url');

/** Builds a token in the shape the Auth emulator issues, for dev tooling and consumer tests. */
export const createEmulatorToken = (input: EmulatorTokenInput): string => {
  const issuedAt = Math.floor((input.now ?? new Date()).getTime() / MS_PER_SECOND);
  const uid = input.uid ?? 'emulator-user';
  const claims = {
    iss: `${DEFAULT_FIREBASE.issuerPrefix}${input.projectId}`,
    aud: input.projectId,
    sub: uid,
    user_id: uid,
    iat: issuedAt,
    auth_time: issuedAt,
    exp: issuedAt + (input.expiresInSec ?? EMULATOR_TOKEN_LIFETIME_SEC),
    phone_number: input.phone,
    firebase: {
      identities: { phone: [input.phone] },
      sign_in_provider: DEFAULT_FIREBASE.signInProviderPhone,
    },
  };
  return `${encode({ alg: EMULATOR_ALG, typ: 'JWT' })}.${encode(claims)}.`;
};
