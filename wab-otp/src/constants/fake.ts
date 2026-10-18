/** Proof format of the fake adapter. Identical to the WAB-Server fake so both stay interchangeable. */
export const FAKE_PROOF_PREFIX = 'fake-otp';
export const FAKE_PROOF_SEPARATOR = ':';
export const FAKE_PROOF_KINDS = ['valid', 'expired', 'invalid', 'provider-error'] as const;
export type FakeProofKind = (typeof FAKE_PROOF_KINDS)[number];
