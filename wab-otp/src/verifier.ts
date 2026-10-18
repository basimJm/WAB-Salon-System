import { createFakeVerifier } from './adapters/fake';
import { createFirebaseVerifier } from './adapters/firebase';
import { resolveOptions, type OtpOptions, type ResolvedOptions } from './config/options';
import { ERROR_CODES } from './constants/codes';
import { VERIFY_OUTCOMES } from './constants/defaults';
import { configError, isOtpError, OtpError, providerError } from './errors';
import type { OtpEvent, ProofVerifier, VerifyInput, VerifyResult } from './ports';
import { assertVerifyInput } from './validation';

/** Events are a courtesy to the consumer: a throwing hook must never break a verification. */
export const safeEmit = (resolved: ResolvedOptions, event: OtpEvent): void => {
  try {
    resolved.onEvent(event);
  } catch (error) {
    resolved.logger.warn('otp event hook failed', { error: String(error) });
  }
};

const selectAdapter = (resolved: ResolvedOptions): ProofVerifier => {
  switch (resolved.provider) {
    case 'fake':
      return createFakeVerifier();
    case 'custom':
      if (resolved.verifier === undefined) throw configError('provider "custom" needs a verifier');
      return resolved.verifier;
    case 'firebase':
      return createFirebaseVerifier(resolved);
  }
};

const isKnownOutcome = (value: unknown): value is VerifyResult['outcome'] =>
  typeof value === 'string' && (VERIFY_OUTCOMES as readonly string[]).includes(value);

/** Anything a vendor adapter returns is checked; nothing unknown can ever read as success. */
const normalize = (result: VerifyResult, input: VerifyInput): VerifyResult => {
  const outcome: unknown = (result as { outcome?: unknown }).outcome;
  if (!isKnownOutcome(outcome))
    throw providerError(ERROR_CODES.MALFORMED_RESPONSE, 'Unknown verification outcome', false);
  if (outcome !== 'VERIFIED') return { outcome };
  const phone = (result as { phone?: unknown }).phone;
  if (typeof phone !== 'string')
    throw providerError(ERROR_CODES.MALFORMED_RESPONSE, 'Verified outcome without a phone', false);
  return phone === input.expectedPhone
    ? { outcome: 'VERIFIED', phone }
    : { outcome: 'PHONE_MISMATCH' };
};

export interface OtpVerifier extends ProofVerifier {
  readonly resolved: ResolvedOptions;
}

/**
 * Verification only (no limits): validates the input, runs the chosen adapter, checks and
 * normalizes its answer. Provider outages throw `OtpError` and are never outcomes.
 */
export const createOtpVerifier = (options: OtpOptions): OtpVerifier => {
  const resolved = resolveOptions(options);
  const adapter = selectAdapter(resolved);
  return {
    resolved,
    verify: async (input) => {
      assertVerifyInput(input);
      try {
        const result = normalize(await adapter.verify(input), input);
        safeEmit(resolved, { type: 'verify', outcome: result.outcome, purpose: input.purpose });
        return result;
      } catch (error) {
        const wrapped = isOtpError(error)
          ? error
          : new OtpError(ERROR_CODES.UNKNOWN, 'Verification failed unexpectedly', { cause: error });
        resolved.logger.error('otp verification failed', { code: wrapped.code });
        safeEmit(resolved, { type: 'provider_error', code: wrapped.code });
        throw wrapped;
      }
    },
    close: async () => {
      await adapter.close?.();
    },
  };
};
