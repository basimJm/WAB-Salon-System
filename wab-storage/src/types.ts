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

/** Server-side copy inside one location (public or private); the target is overwritten. */
export interface CopyObjectRequest {
  readonly fromKey: string;
  readonly toKey: string;
  readonly visibility: Visibility;
}

/** What is stored under a key (`stat`); `contentType` / `updatedAt` are null when the adapter does not keep them. */
export interface ObjectInfo {
  readonly visibility: Visibility;
  readonly size: number;
  readonly contentType: string | null;
  readonly updatedAt: Date | null;
}

/**
 * Browser access to both buckets: presigned PUT uploads and GETs from the given web origins only
 * (the admin panel). Mobile apps do not need CORS.
 */
export interface BucketCorsRequest {
  readonly allowedOrigins: readonly string[];
  /** How long browsers may cache the preflight answer. */
  readonly maxAgeSec: number;
}

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
  /**
   * Copies an object onto another key of the same location, replacing it in one step (readers see
   * the old or the new object, never a partial one). A missing source rejects with NOT_FOUND.
   */
  copy(request: CopyObjectRequest): Promise<void>;
  /** Size, type and time of a stored object; `null` when nothing is stored under the key. */
  stat(key: string): Promise<ObjectInfo | null>;
}
