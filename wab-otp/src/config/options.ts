import { z } from 'zod';
import {
  DEFAULT_FIREBASE,
  DEFAULT_LIMITS,
  DEFAULT_OTP,
  DEFAULT_RETRY,
  ENVIRONMENTS,
  PROVIDERS,
  type Environment,
  type ProviderName,
} from '../constants/defaults';
import { configError } from '../errors';
import { redactingLogger } from '../logging';
import type { LimitStore, Logger, OtpEvent, ProofVerifier } from '../ports';
import { realRetryDeps, type RetryDeps, type RetryPolicy } from '../retry';

/** The slice of `fetch` the Firebase adapter needs (tests and proxies inject their own). */
export type FetchLike = (
  url: string,
  init: { readonly signal: AbortSignal; readonly headers: Readonly<Record<string, string>> },
) => Promise<{
  readonly status: number;
  readonly headers: { get(name: string): string | null };
  json(): Promise<unknown>;
}>;

export interface FirebaseOptions {
  /** Firebase project id of this environment (dev and prod are different projects). */
  readonly projectId: string;
  /** Dev only: Auth emulator `host:port`; tokens from it are unsigned. */
  readonly authEmulatorHost?: string;
  /** Override of the public-key endpoint (https in prod). */
  readonly jwksUrl?: string;
  readonly fetch?: FetchLike;
  readonly timeoutMs?: number;
  readonly clockSkewSec?: number;
  readonly maxAuthAgeSec?: number;
}

export interface OtpOptions {
  readonly environment: Environment;
  readonly provider: ProviderName;
  readonly firebase?: FirebaseOptions;
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
  readonly retry?: Partial<RetryPolicy>;
  readonly logger?: Logger;
  readonly onEvent?: (event: OtpEvent) => void;
  readonly now?: () => Date;
  readonly retryDeps?: RetryDeps;
}

export interface ResolvedOptions {
  readonly environment: Environment;
  readonly provider: ProviderName;
  readonly firebase: Required<Omit<FirebaseOptions, 'authEmulatorHost' | 'fetch'>> &
    Pick<FirebaseOptions, 'authEmulatorHost' | 'fetch'>;
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
  readonly retry: RetryPolicy;
  readonly logger: Logger;
  readonly onEvent: (event: OtpEvent) => void;
  readonly now: () => Date;
  readonly retryDeps: RetryDeps;
}

const positive = z.number().int().positive();
const EMULATOR_HOST = /^[A-Za-z0-9.-]+:\d{1,5}$/;
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
  retry: z
    .object({
      maxAttempts: positive,
      baseDelayMs: z.number().int().nonnegative(),
      maxDelayMs: positive,
      jitterRatio: z.number().min(0).max(1),
    })
    .partial()
    .optional(),
  firebase: z
    .object({
      projectId: z.string().trim().min(1),
      authEmulatorHost: z.string().regex(EMULATOR_HOST).optional(),
      jwksUrl: z.url().optional(),
      timeoutMs: positive.optional(),
      clockSkewSec: z.number().int().nonnegative().optional(),
      maxAuthAgeSec: positive.optional(),
    })
    .partial()
    .optional(),
});

const fail = (message: string): never => {
  throw configError(message);
};

const checkProd = (options: OtpOptions): void => {
  if (options.provider === 'fake') fail('The fake provider is refused in production');
  if (options.provider === 'firebase') {
    if (options.firebase?.projectId === undefined || options.firebase.projectId.trim() === '')
      fail('firebase.projectId is required in production');
    if (options.firebase?.authEmulatorHost !== undefined)
      fail('firebase.authEmulatorHost is forbidden in production');
    if (options.firebase?.jwksUrl !== undefined && !options.firebase.jwksUrl.startsWith('https://'))
      fail('firebase.jwksUrl must be https in production');
  }
  if (options.store?.scope === 'local')
    fail('A process-local limit store is refused in production; inject a shared store');
};

const checkProvider = (options: OtpOptions): void => {
  if (options.provider === 'custom' && options.verifier === undefined)
    fail('provider "custom" needs a verifier');
  if (options.provider === 'firebase') {
    const projectId = options.firebase?.projectId;
    if (projectId === undefined || projectId.trim() === '')
      fail('firebase.projectId is required for provider "firebase"');
  }
};

/** Validates the options once and fills every default; throws `OtpError` (CONFIG_INVALID). */
export const resolveOptions = (options: OtpOptions): ResolvedOptions => {
  const parsed = plainSchema.safeParse(options);
  if (!parsed.success)
    throw configError('Invalid options', {
      fields: parsed.error.issues.map((issue) => issue.path.join('.')),
    });
  if (options.environment === 'prod') checkProd(options);
  else if (options.firebase?.authEmulatorHost !== undefined && options.provider !== 'firebase')
    fail('firebase.authEmulatorHost needs provider "firebase"');
  checkProvider(options);
  const firebase = options.firebase;
  return {
    environment: options.environment,
    provider: options.provider,
    firebase: {
      projectId: firebase?.projectId ?? '',
      jwksUrl: firebase?.jwksUrl ?? DEFAULT_FIREBASE.jwksUrl,
      timeoutMs: firebase?.timeoutMs ?? DEFAULT_FIREBASE.timeoutMs,
      clockSkewSec: firebase?.clockSkewSec ?? DEFAULT_FIREBASE.clockSkewSec,
      maxAuthAgeSec: firebase?.maxAuthAgeSec ?? DEFAULT_FIREBASE.maxAuthAgeSec,
      ...(firebase?.authEmulatorHost === undefined
        ? {}
        : { authEmulatorHost: firebase.authEmulatorHost }),
      ...(firebase?.fetch === undefined ? {} : { fetch: firebase.fetch }),
    },
    verifier: options.verifier,
    limits: { ...DEFAULT_LIMITS, ...options.limits },
    otpLength: options.otpLength ?? DEFAULT_OTP.otpLength,
    resendAfterSec: options.resendAfterSec ?? DEFAULT_OTP.resendAfterSec,
    store: options.store,
    keyPrefix: options.keyPrefix ?? '',
    retry: { ...DEFAULT_RETRY, ...options.retry },
    logger: redactingLogger(options.logger),
    onEvent: options.onEvent ?? ((): void => undefined),
    now: options.now ?? ((): Date => new Date()),
    retryDeps: options.retryDeps ?? realRetryDeps,
  };
};
