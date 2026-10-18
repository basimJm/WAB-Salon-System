import { isRecipientRefusal, normalizeSmtpError } from '../src/adapters/email/smtpErrors';
import { ERROR_CODES } from '../src/constants/codes';
import { NotificationError } from '../src/errors';
import { smtpError } from './helpers';

describe('normalizeSmtpError', () => {
  it.each([
    [{ code: 'EAUTH' }, ERROR_CODES.AUTH_FAILED, false],
    [{ responseCode: 535 }, ERROR_CODES.AUTH_FAILED, false],
    [
      { responseCode: 550, response: '550 5.4.5 Daily user sending limit exceeded' },
      ERROR_CODES.QUOTA_EXCEEDED,
      false,
    ],
    [{ response: '452 Your sending limit was reached' }, ERROR_CODES.QUOTA_EXCEEDED, false],
    [{ code: 'ETIMEDOUT' }, ERROR_CODES.TIMEOUT, true],
    [{ code: 'ESOCKETTIMEDOUT' }, ERROR_CODES.TIMEOUT, true],
    [{ code: 'ECONNECTION' }, ERROR_CODES.NETWORK_ERROR, true],
    [{ code: 'ECONNREFUSED' }, ERROR_CODES.NETWORK_ERROR, true],
    [{ code: 'EDNS' }, ERROR_CODES.NETWORK_ERROR, true],
    [{ responseCode: 421 }, ERROR_CODES.VENDOR_ERROR, true],
    [{ responseCode: 451 }, ERROR_CODES.VENDOR_ERROR, true],
    [{ responseCode: 554 }, ERROR_CODES.VENDOR_ERROR, false],
    [{}, ERROR_CODES.UNKNOWN, false],
  ])('%j → %s (retryable %s)', (fields, code, retryable) => {
    const cause = smtpError(fields);
    const error = normalizeSmtpError(cause);
    expect(error).toMatchObject({ code, retryable });
    expect(error.cause).toBe(cause);
  });

  it('passes SDK errors through and handles non-object throws', () => {
    const own = new NotificationError(ERROR_CODES.TIMEOUT, 'x');
    expect(normalizeSmtpError(own)).toBe(own);
    expect(normalizeSmtpError('boom').code).toBe(ERROR_CODES.UNKNOWN);
    expect(normalizeSmtpError(null).code).toBe(ERROR_CODES.UNKNOWN);
  });

  it('records the codes but never the message text in details', () => {
    const error = normalizeSmtpError(smtpError({ code: 'ECONNECTION', responseCode: 421 }));
    expect(error.details).toEqual({ smtpCode: 'ECONNECTION', replyCode: 421 });
    expect(normalizeSmtpError(smtpError({ code: 'EAUTH' })).details).toEqual({
      smtpCode: 'EAUTH',
      replyCode: null,
    });
  });
});

describe('isRecipientRefusal', () => {
  it('is true only for permanent envelope refusals', () => {
    expect(isRecipientRefusal(smtpError({ code: 'EENVELOPE', responseCode: 550 }))).toBe(true);
    expect(isRecipientRefusal(smtpError({ code: 'EENVELOPE', responseCode: 450 }))).toBe(false);
    expect(isRecipientRefusal(smtpError({ code: 'EENVELOPE' }))).toBe(false);
    expect(isRecipientRefusal(smtpError({ code: 'ECONNECTION', responseCode: 550 }))).toBe(false);
    expect(isRecipientRefusal(undefined)).toBe(false);
  });
});
