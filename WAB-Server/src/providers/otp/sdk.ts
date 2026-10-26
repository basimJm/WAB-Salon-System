import {
  createCodeOtp,
  createProofs,
  ERROR_CODES as SDK_ERRORS,
  isOtpError,
  maskPhone,
  type CodeOtp,
  type CodeStore,
  type Environment as SdkEnvironment,
  type OtpChannel,
  type ProofVerifier,
} from '@wab/otp';
import { ERROR_CODES } from '../../constants/errorCodes';
import { OTP_CODE_KEY_PREFIX } from '../../constants/otp';
import { BusinessRuleError, ExternalServiceError } from '../../utils/errors';
import type { Logger } from '../../utils/logger';
import { toSdkLogger } from '../notifier/real';
import type { OtpCodeRules, OtpCodeResult, OtpProvider, OtpVerifyResult } from './types';

export interface SdkOtpDeps {
  /** `prod` makes the SDK refuse a fake channel, a local store and a fixed code. */
  readonly environment: SdkEnvironment;
  readonly channel: OtpChannel;
  /** Code hashes and used-proof flags (Redis in every running server; memory in unit tests). */
  readonly store: CodeStore;
  readonly codeSecret: string;
  readonly proofSecret: string;
  /** Development only: every code is this value. */
  readonly fixedCode?: string;
  readonly logger?: Logger;
  readonly now?: () => Date;
}

/**
 * SDK failures become typed API errors; the vendor text never reaches a client and codes, tokens
 * and full phone numbers never reach a log. A recipient WhatsApp refuses is the caller's problem
 * (422 `OTP_DELIVERY_FAILED`); anything else (outage, throttling, token or template problem, store
 * down) is a 503 the owner must see in the logs. Invalid input from this server is a bug.
 */
export const mapOtpSdkError = (error: unknown, phone: string, logger?: Logger): never => {
  if (!isOtpError(error)) throw error;
  const fields = {
    otpError: error.code,
    retryable: error.retryable,
    phone: maskPhone(phone),
    ...error.details,
  };
  if (error.code === SDK_ERRORS.DELIVERY_FAILED) {
    logger?.warn(fields, 'otp code not delivered');
    throw new BusinessRuleError({ code: ERROR_CODES.OTP_DELIVERY_FAILED, cause: error });
  }
  if (error.code === SDK_ERRORS.VALIDATION_FAILED) {
    throw new RangeError(`otp request rejected: ${error.code}`);
  }
  logger?.error(fields, 'otp provider failed');
  throw new ExternalServiceError({ cause: error, unavailable: true });
};

/** Outcomes the server has no use for (`BLOCKED` comes only from limiter-aware adapters) fail closed. */
export const toProofResult = (result: {
  readonly outcome: string;
  readonly phone?: string;
}): OtpVerifyResult => {
  switch (result.outcome) {
    case 'VERIFIED':
      return result.phone === undefined
        ? { outcome: 'INVALID_PROOF' }
        : { outcome: 'VERIFIED', phone: result.phone };
    case 'PHONE_MISMATCH':
    case 'PURPOSE_MISMATCH':
    case 'EXPIRED':
      return { outcome: result.outcome };
    default:
      return { outcome: 'INVALID_PROOF' };
  }
};

const rulesKey = (rules: OtpCodeRules): string =>
  [rules.codeLength, rules.codeTtlSec, rules.proofTtlSec].join(':');

/**
 * Server-generated phone OTP over any `@wab/otp` channel (BUSINESS_DOMAIN §3.1a). The SDK takes the
 * code rules at construction, so the code flow is rebuilt when the settings change (cheap: no I/O);
 * proofs are checked by one verifier whose lifetime does not matter for checking.
 */
export const createSdkOtp = (deps: SdkOtpDeps): OtpProvider => {
  const sdkLogger = deps.logger === undefined ? undefined : toSdkLogger(deps.logger);
  let cached: { readonly key: string; readonly flow: CodeOtp } | undefined;
  const flowFor = (rules: OtpCodeRules): CodeOtp => {
    const key = rulesKey(rules);
    if (cached?.key === key) return cached.flow;
    const flow = createCodeOtp({
      environment: deps.environment,
      channel: deps.channel,
      store: deps.store,
      codeSecret: deps.codeSecret,
      proofSecret: deps.proofSecret,
      codeLength: rules.codeLength,
      codeTtlSec: rules.codeTtlSec,
      proofTtlSec: rules.proofTtlSec,
      keyPrefix: OTP_CODE_KEY_PREFIX,
      ...(deps.fixedCode === undefined ? {} : { fixedCode: deps.fixedCode }),
      ...(sdkLogger === undefined ? {} : { logger: sdkLogger }),
      ...(deps.now === undefined ? {} : { now: deps.now }),
    });
    cached = { key, flow };
    return flow;
  };
  const proofs: ProofVerifier = createProofs({
    secret: deps.proofSecret,
    store: deps.store,
    keyPrefix: OTP_CODE_KEY_PREFIX,
    ...(deps.now === undefined ? {} : { now: deps.now }),
  }).verifier;
  const guarded = async <T>(phone: string, work: () => Promise<T>): Promise<T> => {
    try {
      return await work();
    } catch (error) {
      return mapOtpSdkError(error, phone, deps.logger);
    }
  };

  return {
    sendCode: (input, rules) =>
      guarded(input.phone, async () => {
        const sent = await flowFor(rules).sendCode(input);
        return { expiresInSeconds: sent.expiresInSec };
      }),

    verifyCode: (input, rules) =>
      guarded(input.phone, async (): Promise<OtpCodeResult> => {
        const result = await flowFor(rules).verifyCode(input);
        if (result.outcome === 'VERIFIED')
          return {
            outcome: 'VERIFIED',
            otpToken: result.otpToken,
            expiresInSeconds: result.expiresInSec,
          };
        return { outcome: result.outcome === 'EXPIRED' ? 'EXPIRED' : 'INVALID_CODE' };
      }),

    verify: (input) =>
      guarded(input.expectedPhone, async () => toProofResult(await proofs.verify(input))),
  };
};
