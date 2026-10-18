import { ERROR_CODES } from '../src/constants/codes';
import {
  NotificationError,
  configError,
  isNotificationError,
  validationError,
} from '../src/errors';

describe('NotificationError', () => {
  it('carries code, retryable flag, cause and details', () => {
    const cause = new Error('root');
    const error = new NotificationError(ERROR_CODES.TIMEOUT, 'slow', {
      retryable: true,
      cause,
      details: { attempt: 2 },
    });
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('NotificationError');
    expect(error.code).toBe(ERROR_CODES.TIMEOUT);
    expect(error.retryable).toBe(true);
    expect(error.cause).toBe(cause);
    expect(error.details).toEqual({ attempt: 2 });
  });

  it('defaults to non-retryable with empty details and no cause', () => {
    const error = new NotificationError(ERROR_CODES.UNKNOWN, 'x');
    expect(error.retryable).toBe(false);
    expect(error.details).toEqual({});
    expect(error.cause).toBeUndefined();
  });

  it('isNotificationError narrows only SDK errors', () => {
    expect(isNotificationError(validationError('bad'))).toBe(true);
    expect(isNotificationError(new Error('plain'))).toBe(false);
    expect(isNotificationError('text')).toBe(false);
  });

  it('builds config and validation errors with the right codes', () => {
    expect(configError('c').code).toBe(ERROR_CODES.CONFIG_INVALID);
    expect(configError('c', { fields: ['a'] }).details).toEqual({ fields: ['a'] });
    expect(validationError('v').code).toBe(ERROR_CODES.VALIDATION_FAILED);
    expect(validationError('v').retryable).toBe(false);
  });
});
