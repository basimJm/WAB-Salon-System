import { z } from 'zod';
import { DEFAULT_RETRY, type Environment } from '../../constants/defaults';
import { DEFAULT_WHATSAPP, WHATSAPP_PATTERNS } from '../../constants/whatsapp';
import { configError } from '../../errors';
import { redactingLogger } from '../../logging';
import type { Logger } from '../../ports';
import { realRetryDeps, type RetryDeps, type RetryPolicy } from '../../retry';

/** The slice of `fetch` the WhatsApp channel needs (tests, proxies and local mocks inject their own). */
export type FetchLike = (
  url: string,
  init: {
    readonly method: string;
    readonly headers: Readonly<Record<string, string>>;
    readonly body: string;
    readonly signal: AbortSignal;
  },
) => Promise<{ readonly status: number; text(): Promise<string> }>;

export interface WhatsAppChannelOptions {
  readonly environment: Environment;
  /** WhatsApp → API Setup → "Phone number ID" (not the phone number itself). */
  readonly phoneNumberId: string;
  /** System-user access token (secret; never logged). */
  readonly accessToken: string;
  /** Approved authentication template name (same name in every language). */
  readonly templateName: string;
  /** App language → template language code, e.g. `{ ar: 'ar', en: 'en_US' }`. */
  readonly languageCodes: Readonly<Record<string, string>>;
  /** App language used when the requested one is not in `languageCodes`. */
  readonly fallbackLanguage?: string;
  /** Graph API version (default `DEFAULT_WHATSAPP.apiVersion`). */
  readonly apiVersion?: string;
  /** Graph base URL (https in production; a local mock in dev). */
  readonly baseUrl?: string;
  readonly timeoutMs?: number;
  readonly fetch?: FetchLike;
  readonly retry?: Partial<RetryPolicy>;
  readonly retryDeps?: RetryDeps;
  readonly logger?: Logger;
}

export interface ResolvedWhatsApp {
  readonly url: string;
  readonly accessToken: string;
  readonly templateName: string;
  readonly languageCodes: Readonly<Record<string, string>>;
  readonly fallbackLanguage: string | undefined;
  readonly timeoutMs: number;
  readonly fetch: FetchLike;
  readonly retry: RetryPolicy;
  readonly retryDeps: RetryDeps;
  readonly logger: Logger;
}

const positive = z.number().int().positive();
const schema = z.object({
  environment: z.enum(['dev', 'prod']),
  phoneNumberId: z.string().regex(WHATSAPP_PATTERNS.phoneNumberId),
  accessToken: z.string().trim().min(1),
  templateName: z.string().regex(WHATSAPP_PATTERNS.templateName),
  languageCodes: z
    .record(z.string().min(1), z.string().regex(WHATSAPP_PATTERNS.languageCode))
    .refine((codes) => Object.keys(codes).length > 0),
  fallbackLanguage: z.string().min(1).optional(),
  apiVersion: z.string().regex(WHATSAPP_PATTERNS.apiVersion).optional(),
  baseUrl: z.url().optional(),
  timeoutMs: positive.optional(),
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

const HTTPS = 'https://';
const TRAILING_SLASHES = /\/+$/;

/** Validates once and fills defaults; `OTP_CONFIG_INVALID` names the fields, never the values. */
export const resolveWhatsApp = (options: WhatsAppChannelOptions): ResolvedWhatsApp => {
  const parsed = schema.safeParse(options);
  if (!parsed.success)
    throw configError('Invalid WhatsApp options', {
      fields: parsed.error.issues.map((issue) => issue.path.join('.')),
    });
  const baseUrl = (options.baseUrl ?? DEFAULT_WHATSAPP.baseUrl).replace(TRAILING_SLASHES, '');
  if (options.environment === 'prod' && !baseUrl.startsWith(HTTPS))
    throw configError('WhatsApp baseUrl must be https in production');
  if (
    options.fallbackLanguage !== undefined &&
    !Object.hasOwn(options.languageCodes, options.fallbackLanguage)
  )
    throw configError('WhatsApp fallbackLanguage has no language code');
  const separator = DEFAULT_WHATSAPP.pathSeparator;
  const url = [
    baseUrl,
    options.apiVersion ?? DEFAULT_WHATSAPP.apiVersion,
    options.phoneNumberId,
    DEFAULT_WHATSAPP.messagesPath,
  ].join(separator);
  return {
    url,
    accessToken: options.accessToken,
    templateName: options.templateName,
    languageCodes: options.languageCodes,
    fallbackLanguage: options.fallbackLanguage,
    timeoutMs: options.timeoutMs ?? DEFAULT_WHATSAPP.timeoutMs,
    fetch: options.fetch ?? globalThis.fetch,
    retry: { ...DEFAULT_RETRY, ...options.retry },
    retryDeps: options.retryDeps ?? realRetryDeps,
    logger: redactingLogger(options.logger),
  };
};
