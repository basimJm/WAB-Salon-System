import { ZodError } from 'zod';
import { API_ERROR_CODES, HTTP_STATUS } from '@/constants/http';
import type { ErrorKind } from '@/constants/errors';
import { AppError } from './AppError';

const KIND_BY_STATUS: Readonly<Record<number, ErrorKind>> = {
  [HTTP_STATUS.badRequest]: 'validation',
  [HTTP_STATUS.unauthorized]: 'unauthorized',
  [HTTP_STATUS.forbidden]: 'forbidden',
  [HTTP_STATUS.notFound]: 'notFound',
  [HTTP_STATUS.conflict]: 'conflict',
  [HTTP_STATUS.unprocessable]: 'conflict',
  [HTTP_STATUS.rateLimited]: 'rateLimited',
  [HTTP_STATUS.gatewayTimeout]: 'timeout',
};

const KIND_BY_CODE: Readonly<Record<string, ErrorKind>> = {
  [API_ERROR_CODES.unauthorized]: 'unauthorized',
  [API_ERROR_CODES.forbidden]: 'forbidden',
  [API_ERROR_CODES.notFound]: 'notFound',
  [API_ERROR_CODES.validation]: 'validation',
  [API_ERROR_CODES.rateLimited]: 'rateLimited',
};

/** Domain error codes win over the HTTP status; unknown 5xx are `server`, other 4xx `unknown`. */
export function kindFromResponse(status: number, code?: string): ErrorKind {
  const byCode = code ? KIND_BY_CODE[code] : undefined;
  if (byCode) return byCode;
  const byStatus = KIND_BY_STATUS[status];
  if (byStatus) return byStatus;
  return status >= HTTP_STATUS.serverError ? 'server' : 'unknown';
}

const isAbort = (e: unknown): boolean => e instanceof DOMException && e.name === 'AbortError';
const isTimeout = (e: unknown): boolean => e instanceof DOMException && e.name === 'TimeoutError';

/** Turns anything thrown into an AppError. Never throws, never loses the original as `cause`. */
export function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (isTimeout(error)) return new AppError({ kind: 'timeout', cause: error });
  if (isAbort(error)) return new AppError({ kind: 'unknown', cause: error });
  if (error instanceof ZodError) return new AppError({ kind: 'parse', cause: error });
  // `fetch` rejects with a TypeError when the network is unreachable.
  if (error instanceof TypeError) return new AppError({ kind: 'network', cause: error });
  return new AppError({ kind: 'unknown', cause: error });
}
