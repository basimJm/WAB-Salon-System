import { ERROR_CODES, type ErrorCode } from '../../constants/codes';
import { HTTP_STATUS, META_ERRORS, TIMEOUT_ERROR_NAMES } from '../../constants/whatsapp';
import { isOtpError, OtpError } from '../../errors';

/** What Meta puts in `error` (Graph API error object); every field is optional on the wire. */
export interface MetaError {
  readonly code?: number;
  readonly subcode?: number;
  readonly type?: string;
  readonly fbtraceId?: string;
}

/** Reads `{ error: { code, error_subcode, type, fbtrace_id } }`; anything else is `{}`. */
export const readMetaError = (body: unknown): MetaError => {
  if (typeof body !== 'object' || body === null) return {};
  const error = (body as Record<string, unknown>)['error'];
  if (typeof error !== 'object' || error === null) return {};
  const fields = error as Record<string, unknown>;
  const num = (value: unknown): number | undefined =>
    typeof value === 'number' && Number.isInteger(value) ? value : undefined;
  const str = (value: unknown): string | undefined =>
    typeof value === 'string' ? value : undefined;
  const code = num(fields['code']);
  const subcode = num(fields['error_subcode']);
  const type = str(fields['type']);
  const fbtraceId = str(fields['fbtrace_id']);
  return {
    ...(code === undefined ? {} : { code }),
    ...(subcode === undefined ? {} : { subcode }),
    ...(type === undefined ? {} : { type }),
    ...(fbtraceId === undefined ? {} : { fbtraceId }),
  };
};

interface Mapping {
  readonly code: ErrorCode;
  readonly message: string;
  readonly retryable: boolean;
}

const has = (list: readonly number[], value: number | undefined): boolean =>
  value !== undefined && list.includes(value);

const byMetaCode = (code: number | undefined): Mapping | null => {
  if (has(META_ERRORS.delivery, code))
    return {
      code: ERROR_CODES.DELIVERY_FAILED,
      message: 'Recipient cannot get WhatsApp messages',
      retryable: false,
    };
  const inAuthRange =
    code !== undefined && code >= META_ERRORS.authRange.from && code <= META_ERRORS.authRange.to;
  if (has(META_ERRORS.auth, code) || inAuthRange)
    return {
      code: ERROR_CODES.AUTH_FAILED,
      message: 'WhatsApp rejected the access token',
      retryable: false,
    };
  if (has(META_ERRORS.config, code))
    return {
      code: ERROR_CODES.CONFIG_INVALID,
      message: 'WhatsApp refused the template request',
      retryable: false,
    };
  if (has(META_ERRORS.account, code))
    return {
      code: ERROR_CODES.VENDOR_ERROR,
      message: 'WhatsApp account cannot send',
      retryable: false,
    };
  if (has(META_ERRORS.rateLimited, code))
    return { code: ERROR_CODES.RATE_LIMITED, message: 'WhatsApp rate limit', retryable: true };
  if (has(META_ERRORS.rateLimitedHard, code))
    return {
      code: ERROR_CODES.RATE_LIMITED,
      message: 'WhatsApp spam rate limit',
      retryable: false,
    };
  if (has(META_ERRORS.temporary, code))
    return {
      code: ERROR_CODES.VENDOR_ERROR,
      message: 'WhatsApp temporary failure',
      retryable: true,
    };
  return null;
};

const byStatus = (status: number): Mapping => {
  if (status === HTTP_STATUS.unauthorized || status === HTTP_STATUS.forbidden)
    return {
      code: ERROR_CODES.AUTH_FAILED,
      message: 'WhatsApp rejected the access token',
      retryable: false,
    };
  if (status === HTTP_STATUS.tooManyRequests)
    return { code: ERROR_CODES.RATE_LIMITED, message: 'WhatsApp rate limit', retryable: true };
  if (status >= HTTP_STATUS.serverErrorFrom)
    return {
      code: ERROR_CODES.VENDOR_ERROR,
      message: 'WhatsApp temporary failure',
      retryable: true,
    };
  return { code: ERROR_CODES.UNKNOWN, message: 'Unexpected WhatsApp answer', retryable: false };
};

/**
 * A non-2xx answer becomes a typed error: Meta's `error.code` decides first, the HTTP status
 * second. Details carry status and Meta ids only (never the token, the code or the phone).
 */
export const whatsAppStatusError = (status: number, meta: MetaError): OtpError => {
  const mapping = byMetaCode(meta.code) ?? byStatus(status);
  return new OtpError(mapping.code, mapping.message, {
    retryable: mapping.retryable,
    details: {
      status,
      ...(meta.code === undefined ? {} : { metaCode: meta.code }),
      ...(meta.subcode === undefined ? {} : { metaSubcode: meta.subcode }),
      ...(meta.fbtraceId === undefined ? {} : { fbtraceId: meta.fbtraceId }),
    },
  });
};

/** A fetch that produced no HTTP answer: timeout or network failure (both retryable). */
export const whatsAppTransportError = (error: unknown): OtpError => {
  if (isOtpError(error)) return error;
  // `AbortSignal.timeout` rejects with a DOMException that may come from another realm.
  const name =
    typeof error === 'object' && error !== null && 'name' in error ? String(error.name) : '';
  return (TIMEOUT_ERROR_NAMES as readonly string[]).includes(name)
    ? new OtpError(ERROR_CODES.TIMEOUT, 'WhatsApp request timed out', {
        retryable: true,
        cause: error,
      })
    : new OtpError(ERROR_CODES.NETWORK_ERROR, 'WhatsApp unreachable', {
        retryable: true,
        cause: error,
      });
};
