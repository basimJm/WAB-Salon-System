import type { RejectionReason, Visibility } from './constants/codes';

export interface UploadUrlRequest {
  /** Server-generated object key; clients never choose it. */
  readonly key: string;
  readonly visibility: Visibility;
  readonly contentType: string;
  readonly maxBytes: number;
  readonly expiresInSec: number;
}

export interface UploadTarget {
  readonly url: string;
  readonly method: 'PUT';
  /** Headers the client must send with the upload. */
  readonly headers: Readonly<Record<string, string>>;
  readonly expiresAt: Date;
}

export interface WriteObjectRequest {
  readonly key: string;
  readonly body: Buffer;
  readonly contentType: string;
  readonly visibility: Visibility;
}

export interface ConfirmUploadRequest {
  readonly key: string;
  readonly visibility: Visibility;
  readonly contentType: string;
  readonly maxBytes: number;
}

/** A rejected object has already been deleted by the provider. */
export type ConfirmUploadResult =
  | { readonly status: 'CONFIRMED'; readonly size: number; readonly contentType: string }
  | { readonly status: 'REJECTED'; readonly reason: RejectionReason };

export interface SignedUrlRequest {
  readonly key: string;
  readonly expiresInSec: number;
}

/**
 * File storage behind one interface. Keys are unique across the public and private locations.
 * Failures throw `StorageError`; invalid arguments reject with a `StorageError` of code
 * `STORAGE_VALIDATION_FAILED` / `STORAGE_KEY_INVALID` (except `getPublicUrl`, which throws).
 */
export interface StorageProvider {
  createUploadUrl(request: UploadUrlRequest): Promise<UploadTarget>;
  confirmUpload(request: ConfirmUploadRequest): Promise<ConfirmUploadResult>;
  /** CDN URL of a public object. Pure: no network call. */
  getPublicUrl(key: string): string;
  /** Short-lived URL to read a private object. */
  getSignedUrl(request: SignedUrlRequest): Promise<string>;
  /** Bytes of a stored object; `null` when it does not exist. */
  read(key: string): Promise<Buffer | null>;
  /** Stores an object written by the server itself (e.g. an image variant). */
  write(request: WriteObjectRequest): Promise<void>;
  /** Deletes the objects (any number; batched); keys that do not exist are ignored. */
  delete(keys: readonly string[]): Promise<void>;
}
