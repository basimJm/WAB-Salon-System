import type {
  Environment,
  EmailProviderName,
  PushApp,
  PushInterruptionLevel,
  PushKind,
  PushPriority,
  PushProviderName,
  PushTokenResult,
} from './constants/defaults';

export type { Environment, PushApp, PushKind, PushPriority, PushTokenResult };
export type { EmailProviderName, PushInterruptionLevel, PushProviderName };

export interface PushMessage {
  readonly app: PushApp;
  readonly kind: PushKind;
  readonly title?: string;
  readonly body?: string;
  /** Custom payload; every value is a string (FCM rule). */
  readonly data?: Readonly<Record<string, string>>;
  readonly priority?: PushPriority;
  readonly interruption?: PushInterruptionLevel;
  /** iOS notification category (Accept / Reject actions). */
  readonly actionCategory?: string;
  readonly sound?: string;
  readonly badge?: number;
  readonly androidChannelId?: string;
  /** Ask the app to show a full-screen overlay (the app reads it from the data payload). */
  readonly androidFullScreenIntent?: boolean;
  /** Newer messages with the same key replace older undelivered ones. */
  readonly collapseKey?: string;
}

export type PushTarget = { readonly tokens: readonly string[] } | { readonly topic: string };

export interface PushRequest {
  readonly target: PushTarget;
  readonly message: PushMessage;
  /** Same key + same request = sent once; matches `[A-Za-z0-9:_.-]{8,128}`. */
  readonly idempotencyKey: string;
}

export interface PushResult {
  readonly tokens: readonly { readonly token: string; readonly result: PushTokenResult }[];
  readonly sent: number;
  readonly invalidTokens: readonly string[];
}

export interface EmailRequest {
  readonly to: readonly string[];
  readonly subject: string;
  readonly text: string;
  readonly html?: string;
  readonly idempotencyKey: string;
}

export interface EmailResult {
  readonly accepted: readonly string[];
  readonly rejected: readonly string[];
}

/** The stable port every project codes against. */
export interface Notifier {
  sendPush(request: PushRequest): Promise<PushResult>;
  sendEmail(request: EmailRequest): Promise<EmailResult>;
  /** Releases pooled connections. Safe to call more than once. */
  close(): Promise<void>;
}

/** A delivery channel without idempotency or validation (the factory adds both). */
export interface PushChannel {
  send(request: PushRequest): Promise<PushResult>;
  close?(): Promise<void>;
}

export interface EmailChannel {
  send(request: EmailRequest): Promise<EmailResult>;
  close?(): Promise<void>;
}

export interface Logger {
  debug(message: string, fields?: Record<string, unknown>): void;
  info(message: string, fields?: Record<string, unknown>): void;
  warn(message: string, fields?: Record<string, unknown>): void;
  error(message: string, fields?: Record<string, unknown>): void;
}

export type NotifierEvent =
  | {
      readonly type: 'push.sent';
      readonly sent: number;
      readonly invalid: number;
      readonly failed: number;
    }
  | { readonly type: 'push.failed'; readonly code: string }
  | { readonly type: 'email.sent'; readonly accepted: number; readonly rejected: number }
  | { readonly type: 'email.failed'; readonly code: string };
