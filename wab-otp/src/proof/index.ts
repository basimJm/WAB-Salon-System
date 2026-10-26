import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import {
  CODE_KEY_PREFIX,
  DEFAULT_CODE,
  DEFAULT_PROOF,
  E164_PATTERN,
  MS_PER_SECOND,
  PURPOSE_PATTERN,
  type OtpPurpose,
} from '../constants/defaults';
import { configError } from '../errors';
import type { CodeStore, ProofVerifier, VerifyInput, VerifyResult } from '../ports';
import { assertPhone, assertPurpose, assertVerifyInput } from '../validation';

export interface ProofOptions {
  /** HMAC secret of the proof (>= 32 chars, injected from the consumer's secret store). */
  readonly secret: string;
  /** Holds `otp:used:{jti}` flags; shared in production. */
  readonly store: CodeStore;
  /** Lifetime of an issued proof (default 600 s = `otp.proofTtlSec`). */
  readonly ttlSec?: number;
  /** Namespace placed in front of every store key. */
  readonly keyPrefix?: string;
  readonly now?: () => Date;
  /** Proof id generator (tests). */
  readonly newId?: () => string;
}

export interface IssuedProof {
  readonly otpToken: string;
  readonly expiresInSec: number;
}

export interface Proofs {
  /** Signs `{phone, purpose, jti, iat, exp}`; call it only after the code was checked. */
  issue(input: { readonly phone: string; readonly purpose: OtpPurpose }): IssuedProof;
  /** Checks signature, expiry, phone, purpose and single use (`otp:used:{jti}`). */
  readonly verifier: ProofVerifier;
}

const payloadSchema = z.object({
  v: z.literal(DEFAULT_PROOF.version),
  phone: z.string().regex(E164_PATTERN),
  purpose: z.string().regex(PURPOSE_PATTERN),
  jti: z.string().min(1),
  iat: z.number().int().nonnegative(),
  exp: z.number().int().positive(),
});
type Payload = z.infer<typeof payloadSchema>;

const INVALID: VerifyResult = { outcome: 'INVALID_PROOF' };

const decode = (part: string): unknown => {
  try {
    return JSON.parse(Buffer.from(part, DEFAULT_PROOF.encoding).toString()) as unknown;
  } catch {
    return null;
  }
};

/** Validates the proof options once; shared by `createProofs` and the `signed` provider. */
export const assertProofOptions = (options: ProofOptions): void => {
  if (typeof options.secret !== 'string' || options.secret.length < DEFAULT_CODE.minSecretLength)
    throw configError('proof secret is too short');
  if (options.ttlSec !== undefined && !(Number.isInteger(options.ttlSec) && options.ttlSec > 0))
    throw configError('proof ttlSec must be a positive integer');
};

/**
 * Signed single-use OTP proof (BUSINESS_DOMAIN §3.1a step 3/4): `base64url(payload).base64url(hmac)`.
 * Stateless to check except the single-use flag, which lives as long as the proof could.
 */
export const createProofs = (options: ProofOptions): Proofs => {
  assertProofOptions(options);
  const ttlSec = options.ttlSec ?? DEFAULT_PROOF.ttlSec;
  const now = options.now ?? ((): Date => new Date());
  const newId = options.newId ?? randomUUID;
  const prefix = options.keyPrefix ?? '';
  const sign = (body: string): Buffer =>
    createHmac(DEFAULT_PROOF.hmacAlgorithm, options.secret).update(body).digest();
  const nowSec = (): number => Math.floor(now().getTime() / MS_PER_SECOND);
  const usedKey = (jti: string): string =>
    `${prefix}${CODE_KEY_PREFIX.used}${CODE_KEY_PREFIX.separator}${jti}`;

  const parse = (token: string): Payload | null => {
    const parts = token.split(DEFAULT_PROOF.separator);
    const [body, signature] = parts;
    if (parts.length !== 2 || body === undefined || signature === undefined) return null;
    const given = Buffer.from(signature, DEFAULT_PROOF.encoding);
    const expected = sign(body);
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
    const parsed = payloadSchema.safeParse(decode(body));
    return parsed.success ? parsed.data : null;
  };

  return {
    issue({ phone, purpose }) {
      assertPhone(phone, 'phone');
      assertPurpose(purpose);
      const iat = nowSec();
      const payload: Payload = {
        v: DEFAULT_PROOF.version,
        phone,
        purpose,
        jti: newId(),
        iat,
        exp: iat + ttlSec,
      };
      const body = Buffer.from(JSON.stringify(payload)).toString(DEFAULT_PROOF.encoding);
      const signature = sign(body).toString(DEFAULT_PROOF.encoding);
      return { otpToken: `${body}${DEFAULT_PROOF.separator}${signature}`, expiresInSec: ttlSec };
    },
    verifier: {
      verify: async (input: VerifyInput): Promise<VerifyResult> => {
        assertVerifyInput(input);
        const payload = parse(input.proof);
        if (payload === null) return INVALID;
        const remainingSec = payload.exp - nowSec();
        if (remainingSec <= 0) return { outcome: 'EXPIRED' };
        if (payload.phone !== input.expectedPhone) return { outcome: 'PHONE_MISMATCH' };
        if (payload.purpose !== input.purpose) return { outcome: 'PURPOSE_MISMATCH' };
        const first = await options.store.setIfAbsent(
          usedKey(payload.jti),
          DEFAULT_PROOF.usedFlag,
          remainingSec * MS_PER_SECOND,
        );
        return first ? { outcome: 'VERIFIED', phone: payload.phone } : INVALID;
      },
    },
  };
};
