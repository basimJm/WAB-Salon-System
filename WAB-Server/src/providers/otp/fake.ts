import {
  E164_PATTERN,
  FAKE_OTP_PROOF_KINDS,
  FAKE_OTP_PROOF_PREFIX,
  FAKE_OTP_PROOF_SEPARATOR,
  type FakeOtpProofKind,
} from '../../constants/providers';
import { ExternalServiceError } from '../../utils/errors';
import type { OtpProvider, OtpVerifyInput, OtpVerifyResult } from './types';

export const isE164 = (value: unknown): value is string =>
  typeof value === 'string' && E164_PATTERN.test(value);

/** Builds a proof the fake provider understands, for tests and local development. */
export const fakeOtpProof = (phone: string, kind: FakeOtpProofKind = 'valid'): string =>
  [FAKE_OTP_PROOF_PREFIX, kind, phone].join(FAKE_OTP_PROOF_SEPARATOR);

const parseProof = (proof: string): { kind: FakeOtpProofKind; phone: string } | null => {
  const [prefix, kind, phone, ...rest] = proof.split(FAKE_OTP_PROOF_SEPARATOR);
  const knownKind = FAKE_OTP_PROOF_KINDS.find((candidate) => candidate === kind);
  if (prefix !== FAKE_OTP_PROOF_PREFIX || knownKind === undefined) return null;
  if (rest.length > 0 || !isE164(phone)) return null;
  return { kind: knownKind, phone };
};

/** In-repo stand-in for the Firebase provider (dev/test only; production config refuses it). */
export class FakeOtpProvider implements OtpProvider {
  verify({ proof, expectedPhone }: OtpVerifyInput): Promise<OtpVerifyResult> {
    if (!isE164(expectedPhone)) {
      return Promise.reject(new RangeError('expectedPhone must be an E.164 number'));
    }
    const parsed = parseProof(proof);
    if (parsed === null || parsed.kind === 'invalid') {
      return Promise.resolve({ outcome: 'INVALID_PROOF' });
    }
    if (parsed.kind === 'provider-error') return Promise.reject(new ExternalServiceError());
    if (parsed.kind === 'expired') return Promise.resolve({ outcome: 'EXPIRED' });
    if (parsed.phone !== expectedPhone) return Promise.resolve({ outcome: 'PHONE_MISMATCH' });
    return Promise.resolve({ outcome: 'VERIFIED', phone: parsed.phone });
  }
}
