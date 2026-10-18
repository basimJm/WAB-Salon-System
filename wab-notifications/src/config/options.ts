import type { Agent } from 'node:http';
import { z } from 'zod';
import {
  DEFAULT_IDEMPOTENCY,
  DEFAULT_LIMITS,
  DEFAULT_RETRY,
  DEFAULT_SMTP,
  DEFAULT_TIMEOUTS,
  ENVIRONMENTS,
  type Environment,
} from '../constants/defaults';
import { configError } from '../errors';
import type { MessagingLike } from '../adapters/push/fcm';
import type { TransportLike } from '../adapters/email/smtp';
import type { IdempotencyStore } from '../idempotency';
import type { RetryDeps, RetryPolicy } from '../retry';
import type { EmailChannel, Logger, NotifierEvent, PushChannel } from '../types';
import { parseServiceAccount, type ServiceAccount } from './serviceAccount';

export type PushOptions =
  | { readonly provider: 'fake' }
  | { readonly provider: 'custom'; readonly channel: PushChannel }
  | {
      readonly provider: 'fcm';
      /** Service-account key (object or JSON text), injected by the consumer from its secrets. */
      readonly credentials: ServiceAccount | string;
      /** If set it must equal the key's project (catches dev/prod key mix-ups). */
      readonly projectId?: string;
      readonly dryRun?: boolean;
      /** HTTP(S) agent for networks that need a proxy (firebase-admin ignores HTTPS_PROXY). */
      readonly httpAgent?: Agent;
      /** Use FCM's HTTP/1.1 transport (required behind an HTTP proxy; deprecated upstream). */
      readonly legacyHttpTransport?: boolean;
      readonly timeoutMs?: number;
      /** Replace the real firebase-admin client (tests, other SDK versions). */
      readonly messaging?: () => Promise<MessagingLike>;
    };

export type EmailOptions =
  | { readonly provider: 'fake' }
  | { readonly provider: 'custom'; readonly channel: EmailChannel }
  | {
      readonly provider: 'smtp';
      readonly from: { readonly name: string; readonly address: string };
      readonly smtp: {
        readonly host: string;
        readonly port?: number;
        readonly secure?: boolean;
        readonly user?: string;
        readonly pass?: string;
        readonly timeoutMs?: number;
      };
      readonly transport?: () => TransportLike;
    };

export interface NotifierOptions {
  readonly environment: Environment;
  readonly push: PushOptions;
  readonly email: EmailOptions;
  readonly retry?: Partial<RetryPolicy>;
  readonly limits?: Partial<{
    maxTokens: number;
    batchSize: number;
    maxEmailRecipients: number;
    maxDataEntries: number;
  }>;
  readonly idempotency?: { readonly store?: IdempotencyStore; readonly ttlSec?: number };
  readonly logger?: Logger;
  readonly onEvent?: (event: NotifierEvent) => void;
  readonly retryDeps?: RetryDeps;
}

const positive = z.number().int().positive();
const plainSchema = z.object({
  environment: z.enum(ENVIRONMENTS),
  retry: z
    .object({
      maxAttempts: positive,
      baseDelayMs: z.number().int().nonnegative(),
      maxDelayMs: positive,
      jitterRatio: z.number().min(0).max(1),
    })
    .partial()
    .optional(),
  limits: z
    .object({
      maxTokens: positive,
      batchSize: positive.max(500),
      maxEmailRecipients: positive,
      maxDataEntries: positive,
    })
    .partial()
    .optional(),
  ttlSec: positive.optional(),
});

const smtpSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().min(1).max(65_535).optional(),
  secure: z.boolean().optional(),
  user: z.string().min(1).optional(),
  pass: z.string().min(1).optional(),
  timeoutMs: positive.optional(),
});
const fromSchema = z.object({ name: z.string().min(1), address: z.email() });

export interface ResolvedConfig {
  readonly options: NotifierOptions;
  readonly retry: RetryPolicy;
  readonly limits: {
    readonly maxTokens: number;
    readonly batchSize: number;
    readonly maxEmailRecipients: number;
    readonly maxDataEntries: number;
    readonly maxCollapseKeyBytes: number;
  };
  readonly ttlSec: number;
  readonly fcmCredentials?: ServiceAccount;
}

const issue = (key: string): never => {
  throw configError('invalid notifier options', { fields: [key] });
};

const checkPlain = (options: NotifierOptions): void => {
  const plain = plainSchema.safeParse({
    environment: options.environment,
    retry: options.retry,
    limits: options.limits,
    ttlSec: options.idempotency?.ttlSec,
  });
  if (!plain.success) {
    throw configError('invalid notifier options', {
      fields: plain.error.issues.map((entry) => entry.path.join('.')),
    });
  }
};

const checkProd = (options: NotifierOptions): void => {
  if (options.environment !== 'prod') return;
  if (options.push.provider === 'fake') issue('push.provider (fake is refused in prod)');
  if (options.email.provider === 'fake') issue('email.provider (fake is refused in prod)');
  if (options.idempotency?.store === undefined) {
    issue('idempotency.store (a shared store is required in prod)');
  }
  if (options.push.provider === 'fcm' && options.push.dryRun === true) {
    issue('push.dryRun (not allowed in prod)');
  }
  if (options.email.provider === 'smtp') {
    const { user, pass } = options.email.smtp;
    if (user === undefined || pass === undefined) issue('email.smtp.user/pass (required in prod)');
  }
};

/** Validates every option once, at start-up, naming bad keys only (never their values). */
export const resolveConfig = (options: NotifierOptions): ResolvedConfig => {
  checkPlain(options);
  checkProd(options);

  let fcmCredentials: ServiceAccount | undefined;
  if (options.push.provider === 'fcm') {
    fcmCredentials = parseServiceAccount(options.push.credentials);
    if (
      options.push.projectId !== undefined &&
      options.push.projectId !== fcmCredentials.project_id
    ) {
      issue('push.projectId (does not match the service account project)');
    }
  }
  if (options.email.provider === 'smtp') {
    if (!fromSchema.safeParse(options.email.from).success) issue('email.from');
    if (!smtpSchema.safeParse(options.email.smtp).success) issue('email.smtp');
  }

  const base = {
    options,
    retry: { ...DEFAULT_RETRY, ...options.retry },
    limits: { ...DEFAULT_LIMITS, ...options.limits },
    ttlSec: options.idempotency?.ttlSec ?? DEFAULT_IDEMPOTENCY.ttlSec,
  };
  return fcmCredentials === undefined ? base : { ...base, fcmCredentials };
};

export const smtpDefaults = DEFAULT_SMTP;
export const timeoutDefaults = DEFAULT_TIMEOUTS;
