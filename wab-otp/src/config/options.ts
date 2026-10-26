import { z } from 'zod';
import {
  DEFAULT_LIMITS,
  DEFAULT_OTP,
  ENVIRONMENTS,
  PROVIDERS,
  type Environment,
  type ProviderName,
} from '../constants/defaults';
import { configError } from '../errors';
import { redactingLogger } from '../logging';
import type { LimitStore, Logger, OtpEvent, ProofVerifier } from '../ports';
import { assertProofOptions, type ProofOptions } from '../proof';

/** Options of the `signed` provider: the same secret and store `createCodeOtp` issues proofs with. */
export type SignedProofOptions = Pick<ProofOptions, 'secret' | 'store' | 'keyPrefix'>;

export interface OtpOptions {
  readonly environment: Environment;
  readonly provider: ProviderName;
  /** Required for `provider: 'signed'`: verifies the SDK's own `otpToken`. */
  readonly proof?: SignedProofOptions;
  /** Required for `provider: 'custom'`: any vendor's verifier. */
  readonly verifier?: ProofVerifier;
  readonly limits?: Partial<{
    requestMax: number;
    requestWindowSec: number;
    wrongMax: number;
    blockSec: number;
  }>;
  readonly otpLength?: number;
  readonly resendAfterSec?: number;
  readonly store?: LimitStore;
  /** Namespace placed in front of every store key. */
  readonly keyPrefix?: string;
  readonly logger?: Logger;
  readonly onEvent?: (event: OtpEvent) => void;
  readonly now?: () => Date;
}

export interface ResolvedOptions {
  readonly environment: Environment;
  readonly provider: ProviderName;
  readonly proof: SignedProofOptions | undefined;
  readonly verifier: ProofVerifier | undefined;
  readonly limits: {
    requestMax: number;
    requestWindowSec: number;
    wrongMax: number;
    blockSec: number;
  };
  readonly otpLength: number;
  readonly resendAfterSec: number;
  readonly store: LimitStore | undefined;
  readonly keyPrefix: string;
  readonly logger: Logger;
  readonly onEvent: (event: OtpEvent) => void;
  readonly now: () => Date;
}

const positive = z.number().int().positive();
const plainSchema = z.object({
  environment: z.enum(ENVIRONMENTS),
  provider: z.enum(PROVIDERS),
  limits: z
    .object({
      requestMax: positive,
      requestWindowSec: positive,
      wrongMax: positive,
      blockSec: positive,
    })
    .partial()
    .optional(),
  otpLength: z.number().int().min(4).max(10).optional(),
  resendAfterSec: z.number().int().nonnegative().optional(),
  keyPrefix: z.string().max(64).optional(),
});

const fail = (message: string): never => {
  throw configError(message);
};

const checkProvider = (options: OtpOptions): void => {
  if (options.provider === 'custom' && options.verifier === undefined)
    fail('provider "custom" needs a verifier');
  if (options.provider === 'signed') {
    if (options.proof === undefined) fail('provider "signed" needs proof options');
    else assertProofOptions(options.proof);
  }
};

const checkProd = (options: OtpOptions): void => {
  if (options.provider === 'fake') fail('The fake provider is refused in production');
  if (options.store?.scope === 'local')
    fail('A process-local limit store is refused in production; inject a shared store');
  if (options.provider === 'signed' && options.proof?.store.scope === 'local')
    fail('A process-local proof store is refused in production; inject a shared store');
};

/** Validates the options once and fills every default; throws `OtpError` (CONFIG_INVALID). */
export const resolveOptions = (options: OtpOptions): ResolvedOptions => {
  const parsed = plainSchema.safeParse(options);
  if (!parsed.success)
    throw configError('Invalid options', {
      fields: parsed.error.issues.map((issue) => issue.path.join('.')),
    });
  checkProvider(options);
  if (options.environment === 'prod') checkProd(options);
  return {
    environment: options.environment,
    provider: options.provider,
    proof: options.proof,
    verifier: options.verifier,
    limits: { ...DEFAULT_LIMITS, ...options.limits },
    otpLength: options.otpLength ?? DEFAULT_OTP.otpLength,
    resendAfterSec: options.resendAfterSec ?? DEFAULT_OTP.resendAfterSec,
    store: options.store,
    keyPrefix: options.keyPrefix ?? '',
    logger: redactingLogger(options.logger),
    onEvent: options.onEvent ?? ((): void => undefined),
    now: options.now ?? ((): Date => new Date()),
  };
};
