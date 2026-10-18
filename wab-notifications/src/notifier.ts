import { FakeEmailChannel } from './adapters/email/fake';
import { SmtpEmailChannel } from './adapters/email/smtp';
import { FakePushChannel } from './adapters/push/fake';
import { FcmPushChannel } from './adapters/push/fcm';
import { createFirebaseMessaging, createSmtpTransport } from './adapters/vendors';
import type { ServiceAccount } from './config/serviceAccount';
import { resolveConfig, type NotifierOptions, type ResolvedConfig } from './config/options';
import { fingerprintOf, MemoryIdempotencyStore, type IdempotencyStore } from './idempotency';
import { isNotificationError } from './errors';
import { realRetryDeps, type RetryDeps } from './retry';
import type {
  EmailChannel,
  EmailRequest,
  EmailResult,
  Logger,
  Notifier,
  NotifierEvent,
  PushChannel,
  PushRequest,
  PushResult,
} from './types';
import { assertEmailRequest, assertPushRequest } from './validation';

const silentLogger: Logger = { debug: noop, info: noop, warn: noop, error: noop };
function noop(): void {
  /* intentionally empty */
}

interface Channels {
  readonly push: PushChannel;
  readonly email: EmailChannel;
  readonly closers: (() => Promise<void>)[];
}

type PushFcm = Extract<NotifierOptions['push'], { provider: 'fcm' }>;
type EmailSmtp = Extract<NotifierOptions['email'], { provider: 'smtp' }>;

const buildFcm = (
  push: PushFcm,
  config: ResolvedConfig,
  logger: Logger,
  deps: RetryDeps,
  closers: (() => Promise<void>)[],
): PushChannel => {
  let messaging = push.messaging;
  if (messaging === undefined) {
    const vendor = createFirebaseMessaging(config.fcmCredentials as ServiceAccount, {
      httpAgent: push.httpAgent,
      legacyHttpTransport: push.legacyHttpTransport,
    });
    messaging = vendor.messaging;
    closers.push(vendor.close);
  }
  return new FcmPushChannel({
    messaging,
    logger,
    retry: config.retry,
    retryDeps: deps,
    batchSize: config.limits.batchSize,
    ...(push.timeoutMs === undefined ? {} : { timeoutMs: push.timeoutMs }),
    dryRun: push.dryRun ?? false,
  });
};

const buildSmtp = (
  email: EmailSmtp,
  config: ResolvedConfig,
  logger: Logger,
  deps: RetryDeps,
): EmailChannel =>
  new SmtpEmailChannel({
    transport:
      email.transport ??
      (() => createSmtpTransport(email.smtp, config.options.environment === 'prod')),
    from: email.from,
    logger,
    retry: config.retry,
    retryDeps: deps,
  });

const buildChannels = (config: ResolvedConfig, logger: Logger, deps: RetryDeps): Channels => {
  const { push: pushOptions, email: emailOptions } = config.options;
  const closers: (() => Promise<void>)[] = [];
  const push: PushChannel =
    pushOptions.provider === 'custom'
      ? pushOptions.channel
      : pushOptions.provider === 'fake'
        ? new FakePushChannel()
        : buildFcm(pushOptions, config, logger, deps, closers);
  const email: EmailChannel =
    emailOptions.provider === 'custom'
      ? emailOptions.channel
      : emailOptions.provider === 'fake'
        ? new FakeEmailChannel()
        : buildSmtp(emailOptions, config, logger, deps);
  for (const channel of [push, email]) {
    if (channel.close) closers.push(channel.close.bind(channel));
  }
  return { push, email, closers };
};

/**
 * Creates the notifier: validation, idempotency, retry and the chosen push/email adapters.
 * Options are validated here, once; a bad configuration throws `NotificationError` (CONFIG_INVALID).
 */
export const createNotifier = (
  options: NotifierOptions,
): Notifier & {
  readonly channels: { readonly push: PushChannel; readonly email: EmailChannel };
} => {
  const config = resolveConfig(options);
  const logger = options.logger ?? silentLogger;
  const deps = options.retryDeps ?? realRetryDeps;
  const store: IdempotencyStore =
    options.idempotency?.store ?? new MemoryIdempotencyStore(config.ttlSec);
  const channels = buildChannels(config, logger, deps);
  let closed = false;

  const emit = (event: NotifierEvent): void => {
    try {
      options.onEvent?.(event);
    } catch (error) {
      logger.warn('notifier.hook_failed', { type: event.type, error: String(error) });
    }
  };

  const failure = (type: 'push.failed' | 'email.failed', error: unknown): never => {
    emit({ type, code: isNotificationError(error) ? error.code : 'UNKNOWN' });
    throw error;
  };

  return {
    channels: { push: channels.push, email: channels.email },

    async sendPush(request: PushRequest): Promise<PushResult> {
      assertPushRequest(request, config.limits);
      const run = { delivered: false };
      try {
        const result = await store.run(request.idempotencyKey, fingerprintOf(request), async () => {
          const sent = await channels.push.send(request);
          run.delivered = true;
          return sent;
        });
        if (run.delivered) {
          emit({
            type: 'push.sent',
            sent: result.sent,
            invalid: result.invalidTokens.length,
            failed: result.tokens.filter((entry) => entry.result === 'FAILED').length,
          });
        }
        return result;
      } catch (error) {
        return failure('push.failed', error);
      }
    },

    async sendEmail(request: EmailRequest): Promise<EmailResult> {
      assertEmailRequest(request, config.limits);
      const run = { delivered: false };
      try {
        const result = await store.run(request.idempotencyKey, fingerprintOf(request), async () => {
          const sent = await channels.email.send(request);
          run.delivered = true;
          return sent;
        });
        if (run.delivered) {
          emit({
            type: 'email.sent',
            accepted: result.accepted.length,
            rejected: result.rejected.length,
          });
        }
        return result;
      } catch (error) {
        return failure('email.failed', error);
      }
    },

    async close(): Promise<void> {
      if (closed) return;
      closed = true;
      await Promise.allSettled(channels.closers.map((close) => close()));
    },
  };
};
