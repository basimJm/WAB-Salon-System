import { ERROR_CODES, VISIBILITIES } from './constants/codes';
import {
  CONTENT_TYPE_PATTERN,
  MAX_PRESIGN_TTL_SEC,
  OBJECT_KEY_MAX_LENGTH,
  OBJECT_KEY_PATTERN,
} from './constants/defaults';
import { StorageError, validationError } from './errors';
import type {
  ConfirmUploadRequest,
  CopyObjectRequest,
  SignedUrlRequest,
  UploadUrlRequest,
  WriteObjectRequest,
} from './types';

export const assertKey = (key: string): void => {
  if (typeof key !== 'string' || key.length === 0 || key.length > OBJECT_KEY_MAX_LENGTH)
    throw new StorageError(ERROR_CODES.KEY_INVALID, 'Object key has an invalid length');
  if (!OBJECT_KEY_PATTERN.test(key))
    throw new StorageError(ERROR_CODES.KEY_INVALID, 'Object key has an invalid shape');
};

const assertContentType = (contentType: string): void => {
  if (typeof contentType !== 'string' || !CONTENT_TYPE_PATTERN.test(contentType))
    throw validationError('contentType is not a valid media type');
};

const assertVisibility = (visibility: string): void => {
  if (!(VISIBILITIES as readonly string[]).includes(visibility))
    throw validationError('visibility must be PUBLIC or PRIVATE');
};

const assertPositiveInteger = (value: number, name: string): void => {
  if (!Number.isSafeInteger(value) || value <= 0)
    throw validationError(`${name} must be a positive whole number`);
};

/** `maxTtlSec` is the consumer-configured ceiling, never above the S3 limit. */
export const assertTtl = (ttlSec: number, maxTtlSec: number): void => {
  assertPositiveInteger(ttlSec, 'expiresInSec');
  if (ttlSec > Math.min(maxTtlSec, MAX_PRESIGN_TTL_SEC))
    throw validationError('expiresInSec exceeds the configured maximum');
};

export const assertUploadRequest = (request: UploadUrlRequest, maxTtlSec: number): void => {
  assertKey(request.key);
  assertVisibility(request.visibility);
  assertContentType(request.contentType);
  assertPositiveInteger(request.maxBytes, 'maxBytes');
  assertTtl(request.expiresInSec, maxTtlSec);
};

export const assertConfirmRequest = (request: ConfirmUploadRequest): void => {
  assertKey(request.key);
  assertVisibility(request.visibility);
  assertContentType(request.contentType);
  assertPositiveInteger(request.maxBytes, 'maxBytes');
};

export const assertSignedRequest = (request: SignedUrlRequest, maxTtlSec: number): void => {
  assertKey(request.key);
  assertTtl(request.expiresInSec, maxTtlSec);
};

export const assertWriteRequest = (request: WriteObjectRequest): void => {
  assertKey(request.key);
  assertVisibility(request.visibility);
  assertContentType(request.contentType);
  if (!Buffer.isBuffer(request.body)) throw validationError('body must be a Buffer');
};

export const assertCopyRequest = (request: CopyObjectRequest): void => {
  assertKey(request.fromKey);
  assertKey(request.toKey);
  assertVisibility(request.visibility);
  if (request.fromKey === request.toKey) throw validationError('fromKey and toKey must differ');
};

export const encodeKey = (key: string): string => key.split('/').map(encodeURIComponent).join('/');
