import { MemoryLimitStore } from './adapters/memory-store';
import type { OtpOptions, ResolvedOptions } from './config/options';
import { FAILURE_REASONS } from './constants/defaults';
import { configError, validationError } from './errors';
import { createLimits } from './limits';
import type {
  FailureInput,
  FailureResult,
  LimitStore,
  OtpProvider,
  PrecheckInput,
  PrecheckResult,
  VerifyInput,
  VerifyResult,
} from './ports';
import { assertPhone, assertPurpose } from './validation';
import { createOtpVerifier, safeEmit } from './verifier';

const storeFor = (resolved: ResolvedOptions): LimitStore => {
  if (resolved.store !== undefined) return resolved.store;
  if (resolved.environment === 'dev') return new MemoryLimitStore();
  throw configError('A shared limit store is required in production');
};

/**
 * The full provider: proof verification (adapter chosen by `options.provider`) plus the platform's
 * request / wrong-code limits (store injected, memory in dev, shared store required in prod).
 */
export const createOtpService = (options: OtpOptions): OtpProvider => {
  const verifier = createOtpVerifier(options);
  const { resolved } = verifier;
  const store = storeFor(resolved);
  const limits = createLimits(
    store,
    { ...resolved.limits, resendAfterSec: resolved.resendAfterSec },
    resolved.keyPrefix,
  );
  const until = (ms: number): Date => new Date(resolved.now().getTime() + ms);
  const config = { otpLength: resolved.otpLength, resendAfterSeconds: resolved.resendAfterSec };

  return {
    getConfig: () => config,

    async precheck(input: PrecheckInput): Promise<PrecheckResult> {
      assertPhone(input.phone, 'phone');
      assertPurpose(input.purpose);
      const decision = await limits.request(input.phone);
      safeEmit(resolved, { type: 'precheck', allowed: decision.allowed, purpose: input.purpose });
      return {
        allowed: decision.allowed,
        otpLength: config.otpLength,
        resendAfterSeconds: decision.resendAfterSeconds,
        ...(decision.blocked ? { blockedUntil: until(decision.retryAfterMs) } : {}),
      };
    },

    async verify(input: VerifyInput): Promise<VerifyResult> {
      assertPhone(input.expectedPhone, 'expectedPhone');
      if ((await limits.status(input.expectedPhone)).blocked) {
        safeEmit(resolved, { type: 'verify', outcome: 'BLOCKED', purpose: input.purpose });
        return { outcome: 'BLOCKED' };
      }
      const result = await verifier.verify(input);
      if (result.outcome === 'VERIFIED') await limits.reset(input.expectedPhone);
      return result;
    },

    async reportFailure(input: FailureInput): Promise<FailureResult> {
      assertPhone(input.phone, 'phone');
      assertPurpose(input.purpose);
      if (!FAILURE_REASONS.includes(input.reason)) throw validationError('Unknown failure reason');
      // Only a wrong code counts; an expired code or a provider hiccup is not the user's fault.
      const result =
        input.reason === 'WRONG_CODE'
          ? await limits.wrongAttempt(input.phone)
          : await limits.status(input.phone);
      safeEmit(resolved, { type: 'failure', reason: input.reason, blocked: result.blocked });
      return {
        blocked: result.blocked,
        attemptsRemaining: result.attemptsRemaining,
        ...(result.blocked ? { blockedUntil: until(result.retryAfterMs) } : {}),
      };
    },

    close: async () => {
      await verifier.close?.();
      await store.close?.();
    },
  };
};
