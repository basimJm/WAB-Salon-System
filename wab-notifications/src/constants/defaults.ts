/** Every tunable default lives here; consumers override them through options. */
export const ENVIRONMENTS = ['dev', 'prod'] as const;
export type Environment = (typeof ENVIRONMENTS)[number];

export const PUSH_PROVIDERS = ['fake', 'fcm', 'custom'] as const;
export type PushProviderName = (typeof PUSH_PROVIDERS)[number];
export const EMAIL_PROVIDERS = ['fake', 'smtp', 'brevo', 'custom'] as const;
export type EmailProviderName = (typeof EMAIL_PROVIDERS)[number];

export const PUSH_APPS = ['CUSTOMER', 'MERCHANT'] as const;
export type PushApp = (typeof PUSH_APPS)[number];
export const PUSH_KINDS = ['VISIBLE', 'DATA_ONLY'] as const;
export type PushKind = (typeof PUSH_KINDS)[number];
export const PUSH_PRIORITIES = ['NORMAL', 'HIGH'] as const;
export type PushPriority = (typeof PUSH_PRIORITIES)[number];
export const PUSH_INTERRUPTION_LEVELS = ['TIME_SENSITIVE'] as const;
export type PushInterruptionLevel = (typeof PUSH_INTERRUPTION_LEVELS)[number];
export const PUSH_TOKEN_RESULTS = ['SENT', 'INVALID_TOKEN', 'FAILED'] as const;
export type PushTokenResult = (typeof PUSH_TOKEN_RESULTS)[number];

export const LANGUAGES = ['ar', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];

export const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9:_.-]{8,128}$/;
export const PUSH_TOPIC_PATTERN = /^[A-Za-z0-9_.~%-]{1,900}$/;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const HEADER_INJECTION_PATTERN = /[\r\n]/;

export const DEFAULT_LIMITS = {
  /** Tokens accepted in one `sendPush` call (same contract as WAB-Server). */
  maxTokens: 500,
  /** FCM multicast hard limit per request. */
  batchSize: 500,
  maxEmailRecipients: 50,
  maxDataEntries: 100,
  /** FCM collapse key / `apns-collapse-id` limit in bytes. */
  maxCollapseKeyBytes: 64,
} as const;

export const DEFAULT_RETRY = {
  maxAttempts: 3,
  baseDelayMs: 200,
  maxDelayMs: 5000,
  /** Fraction of the delay randomised to avoid synchronised retries. */
  jitterRatio: 0.2,
} as const;

export const DEFAULT_IDEMPOTENCY = {
  ttlSec: 86_400,
  keyPrefix: 'wab:notifications:idem:',
} as const;

export const DEFAULT_TIMEOUTS = { fcmMs: 10_000, smtpMs: 15_000, httpEmailMs: 15_000 } as const;

/** Brevo transactional email HTTP API (NOT-012); `baseUrl` is overridable (local mock in dev). */
export const DEFAULT_BREVO = {
  baseUrl: 'https://api.brevo.com/v3',
  sendPath: '/smtp/email',
  apiKeyHeader: 'api-key',
  jsonContentType: 'application/json',
} as const;
export const HTTPS_PROTOCOL = 'https:';
export const DEFAULT_SMTP = { port: 587, secureOnPort: 465 } as const;
export const DEFAULT_BRAND_NAME = 'WAB';
export const DEFAULT_BRAND_COLOR = '#6D28D9';
export const MS_PER_SECOND = 1000;

/** Data keys the SDK adds to FCM payloads; apps read them to build the overlay. */
export const DATA_KEYS = {
  fullScreenIntent: 'fullScreenIntent',
  titleFallback: 'title',
  bodyFallback: 'body',
} as const;
export const TRUE_STRING = 'true';
export const APNS = {
  priorityHigh: '10',
  priorityLow: '5',
  pushTypeAlert: 'alert',
  pushTypeBackground: 'background',
  interruptionTimeSensitive: 'time-sensitive',
  defaultSound: 'default',
} as const;
