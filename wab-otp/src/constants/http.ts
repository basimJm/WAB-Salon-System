/** HTTP wire constants shared by the HTTP channel adapters. */
export const HTTP_STATUS = {
  okFrom: 200,
  okTo: 299,
  badRequest: 400,
  unauthorized: 401,
  paymentRequired: 402,
  forbidden: 403,
  tooManyRequests: 429,
  serverErrorFrom: 500,
} as const;

export const HTTP_METHOD = { get: 'GET', post: 'POST' } as const;

export const HTTP_HEADER = {
  contentType: 'content-type',
  accept: 'accept',
  idempotencyKey: 'idempotency-key',
} as const;

export const JSON_CONTENT_TYPE = 'application/json';

/** `error.name` of an aborted / timed-out fetch. */
export const TIMEOUT_ERROR_NAMES = ['TimeoutError', 'AbortError'] as const;

export const HTTPS_PREFIX = 'https://';
export const TRAILING_SLASHES = /\/+$/;
