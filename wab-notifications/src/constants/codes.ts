export const ERROR_CODES = {
  CONFIG_INVALID: 'NOTIFY_CONFIG_INVALID',
  VALIDATION_FAILED: 'NOTIFY_VALIDATION_FAILED',
  AUTH_FAILED: 'NOTIFY_AUTH_FAILED',
  NETWORK_ERROR: 'NOTIFY_NETWORK_ERROR',
  TIMEOUT: 'NOTIFY_TIMEOUT',
  RATE_LIMITED: 'NOTIFY_RATE_LIMITED',
  QUOTA_EXCEEDED: 'NOTIFY_QUOTA_EXCEEDED',
  VENDOR_ERROR: 'NOTIFY_VENDOR_ERROR',
  MALFORMED_RESPONSE: 'NOTIFY_MALFORMED_RESPONSE',
  PAYLOAD_INVALID: 'NOTIFY_PAYLOAD_INVALID',
  DUPLICATE_IN_PROGRESS: 'NOTIFY_DUPLICATE_IN_PROGRESS',
  IDEMPOTENCY_CONFLICT: 'NOTIFY_IDEMPOTENCY_CONFLICT',
  UNKNOWN: 'NOTIFY_UNKNOWN',
} as const;
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/** FCM error codes (firebase-admin `messaging/*`) grouped by how the SDK reacts. */
export const FCM_CODES = {
  invalidToken: [
    'messaging/registration-token-not-registered',
    'messaging/invalid-registration-token',
  ],
  payloadInvalid: [
    'messaging/invalid-argument',
    'messaging/invalid-payload',
    'messaging/payload-size-limit-exceeded',
  ],
  /** `invalid-argument` whose message says this is about the token, not the payload (seen on real FCM). */
  tokenMessagePattern: /registration token/i,
  auth: [
    'messaging/authentication-error',
    'messaging/third-party-auth-error',
    'messaging/mismatched-credential',
    'messaging/invalid-apns-credentials',
    'app/invalid-credential',
  ],
  retryable: [
    'messaging/internal-error',
    'messaging/server-unavailable',
    'messaging/unknown-error',
    'app/network-error',
  ],
  rateLimited: [
    'messaging/message-rate-exceeded',
    'messaging/device-message-rate-exceeded',
    'messaging/topics-message-rate-exceeded',
    'messaging/quota-exceeded',
  ],
} as const;

/** SMTP / nodemailer transport error codes and reply codes. */
export const SMTP_CODES = {
  auth: ['EAUTH'],
  network: [
    'ECONNECTION',
    'ESOCKET',
    'ECONNRESET',
    'ECONNREFUSED',
    'EDNS',
    'ENOTFOUND',
    'EPROTOCOL',
  ],
  timeout: ['ETIMEDOUT', 'ESOCKETTIMEDOUT'],
  /** 4xx replies: try again later. */
  transientReplies: [421, 450, 451, 452],
  /** Reply that means a daily/rolling sending quota was hit (e.g. Gmail `550 5.4.5`). */
  quotaEnhancedStatus: '5.4.5',
  quotaPhrase: 'sending limit',
} as const;
