import { ERROR_CODES, SMTP_CODES } from '../../constants/codes';
import { NotificationError } from '../../errors';

interface SmtpErrorShape {
  readonly code?: unknown;
  readonly responseCode?: unknown;
  readonly response?: unknown;
  readonly command?: unknown;
}

const asShape = (error: unknown): SmtpErrorShape =>
  typeof error === 'object' && error !== null ? error : {};

const codeOf = (error: unknown): string => {
  const { code } = asShape(error);
  return typeof code === 'string' ? code : '';
};

const replyCodeOf = (error: unknown): number | undefined => {
  const { responseCode } = asShape(error);
  return typeof responseCode === 'number' ? responseCode : undefined;
};

const replyTextOf = (error: unknown): string => {
  const { response } = asShape(error);
  return typeof response === 'string' ? response : '';
};

/** True when the server refused the recipients for good (5xx at RCPT): nothing was sent. */
export const isRecipientRefusal = (error: unknown): boolean => {
  const reply = replyCodeOf(error);
  return codeOf(error) === 'EENVELOPE' && reply !== undefined && reply >= 500;
};

/** Turns a nodemailer error into the SDK's typed error. */
export const normalizeSmtpError = (error: unknown): NotificationError => {
  if (error instanceof NotificationError) return error;
  const code = codeOf(error);
  const reply = replyCodeOf(error);
  const text = replyTextOf(error);
  const base = { cause: error, details: { smtpCode: code, replyCode: reply ?? null } } as const;

  if ((SMTP_CODES.auth as readonly string[]).includes(code) || reply === 535) {
    return new NotificationError(ERROR_CODES.AUTH_FAILED, 'SMTP rejected the credentials', base);
  }
  if (
    text.includes(SMTP_CODES.quotaEnhancedStatus) ||
    text.toLowerCase().includes(SMTP_CODES.quotaPhrase)
  ) {
    return new NotificationError(ERROR_CODES.QUOTA_EXCEEDED, 'SMTP sending quota exceeded', base);
  }
  if ((SMTP_CODES.timeout as readonly string[]).includes(code)) {
    return new NotificationError(ERROR_CODES.TIMEOUT, 'SMTP request timed out', {
      ...base,
      retryable: true,
    });
  }
  if ((SMTP_CODES.network as readonly string[]).includes(code)) {
    return new NotificationError(ERROR_CODES.NETWORK_ERROR, 'SMTP server unreachable', {
      ...base,
      retryable: true,
    });
  }
  if (reply !== undefined && (SMTP_CODES.transientReplies as readonly number[]).includes(reply)) {
    return new NotificationError(ERROR_CODES.VENDOR_ERROR, 'SMTP temporary failure', {
      ...base,
      retryable: true,
    });
  }
  if (reply !== undefined && reply >= 500) {
    return new NotificationError(ERROR_CODES.VENDOR_ERROR, 'SMTP permanent failure', base);
  }
  return new NotificationError(ERROR_CODES.UNKNOWN, 'unexpected SMTP error', base);
};
