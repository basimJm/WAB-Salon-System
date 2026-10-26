import { ERROR_CODES, type ErrorCode } from './codes';

/**
 * ARQAM OTP wire constants (otp.arqam.tech/apidoc, read 2026-10-26). ARQAM delivers our own code
 * (`otpCode`) over WhatsApp from its approved sender with an authentication template.
 */
export const DEFAULT_ARQAM = {
  baseUrl: 'https://otp.arqam.tech/api',
  sendPath: '/sms/otp',
  accountPath: '/sms/account',
  /** `{messageId}` is replaced (URL-encoded). */
  historyPath: '/messages/{messageId}/history',
  messageIdPlaceholder: '{messageId}',
  apiKeyHeader: 'x-api-key',
  timeoutMs: 5000,
  channelName: 'arqam',
  /** Longest `retryAfter` (ms) the channel waits in-request before giving up on `RATE_LIMITED`. */
  maxRetryAfterMs: 2000,
} as const;

/** What ARQAM accepts as `otpCode`. */
export const ARQAM_CODE_PATTERN = /^\d{4,6}$/;

export const ARQAM_PATTERNS = {
  /** `otp`, `reset_password` or a WhatsApp template name. */
  templateName: /^[A-Za-z0-9_.-]{1,512}$/,
  senderId: /^[A-Za-z0-9_.:+-]{1,128}$/,
} as const;

/** IPv4-mapped IPv6 prefix (`::ffff:1.2.3.4`) that Node puts in front of IPv4 client addresses. */
export const IPV4_MAPPED_PREFIX = '::ffff:';

export interface ArqamErrorMapping {
  readonly code: ErrorCode;
  readonly retryable: boolean;
  readonly message: string;
}

/** ARQAM `errorCode` → SDK error. Unknown codes fall back to the HTTP status. */
export const ARQAM_ERRORS: Readonly<Record<string, ArqamErrorMapping>> = {
  INVALID_PHONE: {
    code: ERROR_CODES.DELIVERY_FAILED,
    retryable: false,
    message: 'ARQAM refused the phone number',
  },
  PROVIDER_ERROR: {
    code: ERROR_CODES.DELIVERY_FAILED,
    retryable: false,
    message: 'WhatsApp refused the message (ARQAM refunded it)',
  },
  UNAUTHORIZED: {
    code: ERROR_CODES.AUTH_FAILED,
    retryable: false,
    message: 'ARQAM rejected the API key',
  },
  UNKNOWN_AUTH_TEMPLATE: {
    code: ERROR_CODES.CONFIG_INVALID,
    retryable: false,
    message: 'ARQAM does not know the template',
  },
  SENDER_REQUIRED: {
    code: ERROR_CODES.CONFIG_INVALID,
    retryable: false,
    message: 'ARQAM needs a senderId (several approved senders)',
  },
  INVALID_REQUEST: {
    code: ERROR_CODES.CONFIG_INVALID,
    retryable: false,
    message: 'ARQAM refused the request',
  },
  INSUFFICIENT_CREDITS: {
    code: ERROR_CODES.VENDOR_ERROR,
    retryable: false,
    message: 'ARQAM account has no credits',
  },
  SENDER_NOT_AVAILABLE: {
    code: ERROR_CODES.VENDOR_ERROR,
    retryable: false,
    message: 'ARQAM project or account is inactive',
  },
  RATE_LIMIT_PHONE: {
    code: ERROR_CODES.RATE_LIMITED,
    retryable: false,
    message: 'ARQAM rate limit for this phone',
  },
  RATE_LIMIT_IP: {
    code: ERROR_CODES.RATE_LIMITED,
    retryable: false,
    message: 'ARQAM rate limit for this IP',
  },
  RATE_LIMITED: {
    code: ERROR_CODES.RATE_LIMITED,
    retryable: true,
    message: 'ARQAM rate limit',
  },
};

/** ARQAM delivery states (`GET /messages/{id}/history`) → normalized states. */
export const ARQAM_DELIVERY_STATES = {
  sent: 'SENT',
  delivered: 'DELIVERED',
  read: 'READ',
  failed: 'FAILED',
} as const;
export type DeliveryState =
  (typeof ARQAM_DELIVERY_STATES)[keyof typeof ARQAM_DELIVERY_STATES] | 'UNKNOWN';

/** `GET /sms/account` mode values. */
export const ARQAM_MODES = { live: 'LIVE', test: 'TEST' } as const;
export type ArqamMode = (typeof ARQAM_MODES)[keyof typeof ARQAM_MODES] | 'UNKNOWN';
