import { ERROR_CODES } from '../../constants/codes';
import {
  FAKE_PROOF_KINDS,
  FAKE_PROOF_PREFIX,
  FAKE_PROOF_SEPARATOR,
  type FakeProofKind,
} from '../../constants/fake';
import { providerError } from '../../errors';
import type { ProofVerifier, VerifyInput, VerifyResult } from '../../ports';
import { isE164 } from '../../validation';

/** Builds a proof the fake verifier understands (dev and tests only). */
export const fakeProof = (phone: string, kind: FakeProofKind = 'valid'): string =>
  [FAKE_PROOF_PREFIX, kind, phone].join(FAKE_PROOF_SEPARATOR);

const parseProof = (proof: string): { kind: FakeProofKind; phone: string } | null => {
  const [prefix, kind, phone, ...rest] = proof.split(FAKE_PROOF_SEPARATOR);
  const known = FAKE_PROOF_KINDS.find((candidate) => candidate === kind);
  if (prefix !== FAKE_PROOF_PREFIX || known === undefined) return null;
  if (rest.length > 0 || !isE164(phone)) return null;
  return { kind: known, phone };
};

/** Deterministic local verifier: no network, no credentials. Refused in production by the options. */
export const createFakeVerifier = (): ProofVerifier => ({
  verify: ({ proof, expectedPhone }: VerifyInput): Promise<VerifyResult> => {
    const parsed = parseProof(proof);
    if (parsed === null || parsed.kind === 'invalid')
      return Promise.resolve({ outcome: 'INVALID_PROOF' });
    if (parsed.kind === 'provider-error')
      return Promise.reject(
        providerError(ERROR_CODES.VENDOR_ERROR, 'Fake provider outage requested', true),
      );
    if (parsed.kind === 'expired') return Promise.resolve({ outcome: 'EXPIRED' });
    if (parsed.phone !== expectedPhone) return Promise.resolve({ outcome: 'PHONE_MISMATCH' });
    return Promise.resolve({ outcome: 'VERIFIED', phone: parsed.phone });
  },
});
