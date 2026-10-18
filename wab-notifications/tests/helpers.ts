import type { FcmBatchResponse, MessagingLike } from '../src/adapters/push/fcm';
import type { MailMessage, TransportLike } from '../src/adapters/email/smtp';
import type { RetryDeps, RetryPolicy } from '../src/retry';
import type { EmailRequest, Logger, PushRequest } from '../src/types';

export const FAST_RETRY: RetryPolicy = {
  maxAttempts: 3,
  baseDelayMs: 10,
  maxDelayMs: 100,
  jitterRatio: 0,
};

export interface Clock {
  readonly deps: RetryDeps;
  readonly sleeps: number[];
}

/** Retry deps that never really wait and record every requested delay. */
export const instantDeps = (random = 0.5): Clock => {
  const sleeps: number[] = [];
  return {
    sleeps,
    deps: {
      sleep: (ms) => {
        sleeps.push(ms);
        return Promise.resolve();
      },
      random: () => random,
    },
  };
};

export interface LogEntry {
  readonly level: string;
  readonly message: string;
  readonly fields: Record<string, unknown> | undefined;
}

export const spyLogger = (): { logger: Logger; entries: LogEntry[] } => {
  const entries: LogEntry[] = [];
  const at =
    (level: string) =>
    (message: string, fields?: Record<string, unknown>): void => {
      entries.push({ level, message, fields });
    };
  return {
    entries,
    logger: { debug: at('debug'), info: at('info'), warn: at('warn'), error: at('error') },
  };
};

export const pushRequest = (overrides: Partial<PushRequest> = {}): PushRequest => ({
  target: { tokens: ['token-1', 'token-2'] },
  message: { app: 'CUSTOMER', kind: 'VISIBLE', title: 'Hello', body: 'World' },
  idempotencyKey: 'push:booking-1:requested',
  ...overrides,
});

export const emailRequest = (overrides: Partial<EmailRequest> = {}): EmailRequest => ({
  to: ['admin@example.com'],
  subject: 'Subject',
  text: 'Body',
  idempotencyKey: 'email:alert-1:sent',
  ...overrides,
});

export type MulticastCall = Parameters<MessagingLike['sendEachForMulticast']>;
export type SendCall = Parameters<MessagingLike['send']>;

export interface ScriptedMessaging extends MessagingLike {
  readonly multicasts: MulticastCall[];
  readonly sends: SendCall[];
}

/** Messaging double: each call consumes the next scripted answer (a response or an error). */
export const scriptedMessaging = (
  script: (FcmBatchResponse | Error)[],
  sendScript: (string | Error)[] = [],
): ScriptedMessaging => {
  const multicasts: MulticastCall[] = [];
  const sends: SendCall[] = [];
  return {
    multicasts,
    sends,
    sendEachForMulticast: (...args) => {
      multicasts.push(args);
      const next = script.shift();
      if (next === undefined) throw new Error('script exhausted');
      return next instanceof Error ? Promise.reject(next) : Promise.resolve(next);
    },
    send: (...args) => {
      sends.push(args);
      const next = sendScript.shift() ?? 'projects/p/messages/1';
      return typeof next === 'string' ? Promise.resolve(next) : Promise.reject(next);
    },
  };
};

export const ok = (): { success: true } => ({ success: true });
export const bad = (code: string): { success: false; error: { code: string } } => ({
  success: false,
  error: { code },
});

export const fcmError = (code: string): Error => Object.assign(new Error(code), { code });

export interface ScriptedTransport extends TransportLike {
  readonly mails: MailMessage[];
  closed: number;
}

export const scriptedTransport = (
  script: (Error | { accepted: unknown[]; rejected: unknown[] })[],
): ScriptedTransport => {
  const mails: MailMessage[] = [];
  const transport: ScriptedTransport = {
    mails,
    closed: 0,
    sendMail: (mail) => {
      mails.push(mail);
      const next = script.shift() ?? { accepted: [...mail.to], rejected: [] };
      return next instanceof Error ? Promise.reject(next) : Promise.resolve(next);
    },
    close: () => {
      transport.closed += 1;
    },
  };
  return transport;
};

export const smtpError = (fields: {
  code?: string;
  responseCode?: number;
  response?: string;
}): Error => Object.assign(new Error('smtp'), fields);

export const FAKE_ACCOUNT = {
  type: 'service_account',
  project_id: 'wab-test',
  client_email: 'svc@wab-test.iam.gserviceaccount.com',
  private_key: 'not-a-real-key',
} as const;
