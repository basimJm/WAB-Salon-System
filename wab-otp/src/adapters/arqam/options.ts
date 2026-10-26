import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { ARQAM_PATTERNS, DEFAULT_ARQAM } from '../../constants/arqam';
import { DEFAULT_RETRY, type Environment } from '../../constants/defaults';
import { HTTPS_PREFIX, TRAILING_SLASHES } from '../../constants/http';
import { configError } from '../../errors';
import { redactingLogger } from '../../logging';
import type { Logger } from '../../ports';
import { realRetryDeps, type RetryDeps, type RetryPolicy } from '../../retry';
import type { FetchLike } from '../http';

export interface ArqamChannelOptions {
  readonly environment: Environment;
  /** Project API key (`X-API-Key`; secret, never logged). A test key sends every code to its test phone. */
  readonly apiKey: string;
  /** App language → ARQAM template name, e.g. `{ ar: 'wab_otp_ar', en: 'wab_otp_en' }`. */
  readonly templates: Readonly<Record<string, string>>;
  /** App language used when the requested one has no template (must be a key of `templates`). */
  readonly fallbackLanguage?: string;
  /** Approved sender to use when the account has several (`SENDER_REQUIRED`). */
  readonly senderId?: string;
  /** API base URL (https in production; a local mock in dev). */
  readonly baseUrl?: string;
  readonly timeoutMs?: number;
  /** Longest `retryAfter` the channel waits before retrying `RATE_LIMITED` (ms). */
  readonly maxRetryAfterMs?: number;
  readonly fetch?: FetchLike;
  readonly retry?: Partial<RetryPolicy>;
  readonly retryDeps?: RetryDeps;
  /** One key per send, reused by its retries (tests inject a fixed one). */
  readonly newIdempotencyKey?: () => string;
  readonly logger?: Logger;
}

export interface ResolvedArqam {
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly templates: Readonly<Record<string, string>>;
  readonly fallbackLanguage: string | undefined;
  readonly senderId: string | undefined;
  readonly timeoutMs: number;
  readonly maxRetryAfterMs: number;
  readonly fetch: FetchLike;
  readonly retry: RetryPolicy;
  readonly retryDeps: RetryDeps;
  readonly newIdempotencyKey: () => string;
  readonly logger: Logger;
}

const positive = z.number().int().positive();
const schema = z.object({
  environment: z.enum(['dev', 'prod']),
  apiKey: z.string().trim().min(1),
  templates: z
    .record(z.string().min(1), z.string().regex(ARQAM_PATTERNS.templateName))
    .refine((templates) => Object.keys(templates).length > 0),
  fallbackLanguage: z.string().min(1).optional(),
  senderId: z.string().regex(ARQAM_PATTERNS.senderId).optional(),
  baseUrl: z.url().optional(),
  timeoutMs: positive.optional(),
  maxRetryAfterMs: z.number().int().nonnegative().optional(),
  retry: z
    .object({
      maxAttempts: positive,
      baseDelayMs: z.number().int().nonnegative(),
      maxDelayMs: positive,
      jitterRatio: z.number().min(0).max(1),
    })
    .partial()
    .optional(),
});

/** Validates once and fills defaults; `OTP_CONFIG_INVALID` names the fields, never the values. */
export const resolveArqam = (options: ArqamChannelOptions): ResolvedArqam => {
  const parsed = schema.safeParse(options);
  if (!parsed.success)
    throw configError('Invalid ARQAM options', {
      fields: parsed.error.issues.map((issue) => issue.path.join('.')),
    });
  const baseUrl = (options.baseUrl ?? DEFAULT_ARQAM.baseUrl).replace(TRAILING_SLASHES, '');
  if (options.environment === 'prod' && !baseUrl.startsWith(HTTPS_PREFIX))
    throw configError('ARQAM baseUrl must be https in production');
  if (
    options.fallbackLanguage !== undefined &&
    !Object.hasOwn(options.templates, options.fallbackLanguage)
  )
    throw configError('ARQAM fallbackLanguage has no template');
  return {
    baseUrl,
    apiKey: options.apiKey.trim(),
    templates: options.templates,
    fallbackLanguage: options.fallbackLanguage,
    senderId: options.senderId,
    timeoutMs: options.timeoutMs ?? DEFAULT_ARQAM.timeoutMs,
    maxRetryAfterMs: options.maxRetryAfterMs ?? DEFAULT_ARQAM.maxRetryAfterMs,
    fetch: options.fetch ?? globalThis.fetch,
    retry: { ...DEFAULT_RETRY, ...options.retry },
    retryDeps: options.retryDeps ?? realRetryDeps,
    newIdempotencyKey: options.newIdempotencyKey ?? randomUUID,
    logger: redactingLogger(options.logger),
  };
};
