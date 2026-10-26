import { ARQAM_ERRORS, type ArqamErrorMapping } from '../../constants/arqam';
import { ERROR_CODES } from '../../constants/codes';
import { MS_PER_SECOND } from '../../constants/defaults';
import { HTTP_STATUS } from '../../constants/http';
import { OtpError } from '../../errors';
import { asRecord } from '../http';

/** What ARQAM puts in a refusal `{ success: false, errorCode, errorMessage, retryAfter? }`. */
export interface ArqamErrorBody {
  readonly errorCode?: string;
  readonly errorMessage?: string;
  /** Seconds, on `RATE_LIMITED`. */
  readonly retryAfter?: number;
}

/** Reads the refusal fields; anything missing or of the wrong type is left out. */
export const readArqamError = (body: unknown): ArqamErrorBody => {
  const fields = asRecord(body);
  if (fields === null) return {};
  const errorCode = fields['errorCode'];
  const errorMessage = fields['errorMessage'];
  const retryAfter = fields['retryAfter'];
  return {
    ...(typeof errorCode === 'string' && errorCode !== '' ? { errorCode } : {}),
    ...(typeof errorMessage === 'string' ? { errorMessage } : {}),
    ...(typeof retryAfter === 'number' && Number.isFinite(retryAfter) && retryAfter >= 0
      ? { retryAfter }
      : {}),
  };
};

const byStatus = (status: number): ArqamErrorMapping => {
  if (status === HTTP_STATUS.unauthorized || status === HTTP_STATUS.forbidden)
    return { code: ERROR_CODES.AUTH_FAILED, retryable: false, message: 'ARQAM refused the key' };
  if (status === HTTP_STATUS.paymentRequired)
    return { code: ERROR_CODES.VENDOR_ERROR, retryable: false, message: 'ARQAM needs credits' };
  if (status === HTTP_STATUS.tooManyRequests)
    return { code: ERROR_CODES.RATE_LIMITED, retryable: true, message: 'ARQAM rate limit' };
  if (status >= HTTP_STATUS.serverErrorFrom)
    return {
      code: ERROR_CODES.VENDOR_ERROR,
      retryable: true,
      message: 'ARQAM temporary failure',
    };
  return { code: ERROR_CODES.UNKNOWN, retryable: false, message: 'Unexpected ARQAM answer' };
};

const known = (errorCode: string | undefined): ArqamErrorMapping | undefined =>
  errorCode !== undefined && Object.hasOwn(ARQAM_ERRORS, errorCode)
    ? ARQAM_ERRORS[errorCode]
    : undefined;

/**
 * A non-2xx answer becomes a typed error: ARQAM's `errorCode` decides first, the HTTP status
 * second. A `retryAfter` longer than `maxRetryAfterMs` is not waited for (not retried). Details
 * carry the status, ARQAM's code and the wait only (never the key, the code or the phone).
 */
export const arqamStatusError = (
  status: number,
  refusal: ArqamErrorBody,
  maxRetryAfterMs: number,
): OtpError => {
  const mapping = known(refusal.errorCode) ?? byStatus(status);
  const retryAfterMs =
    refusal.retryAfter === undefined ? undefined : refusal.retryAfter * MS_PER_SECOND;
  const tooLong = retryAfterMs !== undefined && retryAfterMs > maxRetryAfterMs;
  return new OtpError(mapping.code, mapping.message, {
    retryable: mapping.retryable && !tooLong,
    details: {
      status,
      ...(refusal.errorCode === undefined ? {} : { arqamError: refusal.errorCode }),
      ...(retryAfterMs === undefined ? {} : { retryAfterMs }),
    },
  });
};
