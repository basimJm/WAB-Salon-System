import {
  createOtpVerifier,
  ERROR_CODES as SDK_ERRORS,
  isOtpError,
  type OtpOptions,
  type ProofVerifier,
} from '@wab/otp';
import type { OtpSettings } from '../../config';
import { ExternalServiceError } from '../../utils/errors';
import type { Logger } from '../../utils/logger';
import { toSdkLogger } from '../notifier/real';
import type { OtpProvider, OtpVerifyInput, OtpVerifyResult } from './types';

/** OTP provider backed by the `wab-otp` SDK; `close` releases its resources. */
export interface ClosableOtpProvider extends OtpProvider {
  close(): Promise<void>;
}

export interface RealOtpDeps {
  readonly settings: OtpSettings;
  readonly logger: Logger;
  readonly isProduction: boolean;
  /** Replaces the SDK factory (tests). */
  readonly build?: (options: OtpOptions) => ProofVerifier;
}

/** SDK errors that mean the caller sent something invalid: a bug here, not a provider outage. */
const CALLER_ERRORS: readonly string[] = [SDK_ERRORS.CONFIG_INVALID, SDK_ERRORS.VALIDATION_FAILED];

/** Provider failures become typed 502/503 errors; the vendor text never reaches a client. */
export const mapSdkError = (error: unknown): never => {
  if (!isOtpError(error)) throw error;
  if (CALLER_ERRORS.includes(error.code))
    throw new RangeError(`otp request rejected: ${error.code}`);
  throw new ExternalServiceError({ cause: error, unavailable: error.retryable });
};

/**
 * The server owns limits and blocks (SRV-027), so only proof verification is delegated. Outcomes
 * the platform has no use for (`PURPOSE_MISMATCH`, `BLOCKED`) can only come from limiter-aware
 * adapters; if one ever appears it is treated as an invalid proof, never as success.
 */
export const toServerResult = (result: {
  readonly outcome: string;
  readonly phone?: string;
}): OtpVerifyResult => {
  switch (result.outcome) {
    case 'VERIFIED':
      return result.phone === undefined
        ? { outcome: 'INVALID_PROOF' }
        : { outcome: 'VERIFIED', phone: result.phone };
    case 'PHONE_MISMATCH':
    case 'EXPIRED':
      return { outcome: result.outcome };
    default:
      return { outcome: 'INVALID_PROOF' };
  }
};

export const createRealOtp = (deps: RealOtpDeps): ClosableOtpProvider => {
  const { firebase } = deps.settings;
  const options: OtpOptions = {
    environment: deps.isProduction ? 'prod' : 'dev',
    provider: 'firebase',
    firebase: {
      projectId: firebase.projectId,
      ...(firebase.authEmulatorHost === undefined
        ? {}
        : { authEmulatorHost: firebase.authEmulatorHost }),
    },
    logger: toSdkLogger(deps.logger),
  };
  const sdk = (deps.build ?? createOtpVerifier)(options);
  return {
    verify: async (input: OtpVerifyInput): Promise<OtpVerifyResult> => {
      try {
        return toServerResult(await sdk.verify(input));
      } catch (error) {
        return mapSdkError(error);
      }
    },
    close: async () => {
      await sdk.close?.();
    },
  };
};
