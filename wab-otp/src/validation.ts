import { E164_PATTERN, MAX_PROOF_LENGTH, PURPOSE_PATTERN } from './constants/defaults';
import { validationError } from './errors';
import type { VerifyInput } from './ports';

export const isE164 = (value: unknown): value is string =>
  typeof value === 'string' && E164_PATTERN.test(value);

export const assertPhone = (value: unknown, field: string): void => {
  if (!isE164(value)) throw validationError(`${field} must be an E.164 phone number`);
};

export const assertPurpose = (value: unknown): void => {
  if (typeof value !== 'string' || !PURPOSE_PATTERN.test(value))
    throw validationError('purpose must be an UPPER_SNAKE_CASE name');
};

/** Caller mistakes are `OTP_INPUT_INVALID`; a bad proof is an outcome, not an error. */
export const assertVerifyInput = (input: VerifyInput): void => {
  assertPhone(input.expectedPhone, 'expectedPhone');
  assertPurpose(input.purpose);
  if (typeof input.proof !== 'string' || input.proof === '')
    throw validationError('proof must be a non-empty string');
  if (input.proof.length > MAX_PROOF_LENGTH) throw validationError('proof is too long');
};
