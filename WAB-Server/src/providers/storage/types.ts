import type { StorageRejectionReason, StorageVisibility } from '../../constants/providers';

export interface UploadUrlRequest {
  /** Server-generated object key; clients never choose it. */
  readonly key: string;
  readonly visibility: StorageVisibility;
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
  readonly visibility: StorageVisibility;
}

export interface ConfirmUploadRequest {
  readonly key: string;
  readonly visibility: StorageVisibility;
  readonly contentType: string;
  readonly maxBytes: number;
}

/** A rejected object has already been deleted by the provider. */
export type ConfirmUploadResult =
  | { readonly status: 'CONFIRMED'; readonly size: number; readonly contentType: string }
  | { readonly status: 'REJECTED'; readonly reason: StorageRejectionReason };

/** Server-side copy inside one location (public or private bucket); the target is replaced. */
export interface CopyObjectRequest {
  readonly fromKey: string;
  readonly toKey: string;
  readonly visibility: StorageVisibility;
}

/** `SOURCE_MISSING`: nothing was stored under `fromKey`, so nothing changed. */
export type CopyObjectResult = 'COPIED' | 'SOURCE_MISSING';

/** What is stored under a key; `contentType` / `updatedAt` are null when the store does not keep them. */
export interface ObjectInfo {
  readonly visibility: StorageVisibility;
  readonly size: number;
  readonly contentType: string | null;
  readonly updatedAt: Date | null;
}

export interface SignedUrlRequest {
  readonly key: string;
  readonly expiresInSec: number;
}

/**
 * File storage behind one interface (wab-storage BRD STO-01): presigned direct uploads, upload
 * confirmation by the real content, CDN URLs for public objects and short-lived signed URLs for
 * private ones. Policies (which purpose may upload what) belong to the uploads module, not here.
 * Provider failures throw `ExternalServiceError`.
 */
export interface StorageProvider {
  createUploadUrl(request: UploadUrlRequest): Promise<UploadTarget>;
  confirmUpload(request: ConfirmUploadRequest): Promise<ConfirmUploadResult>;
  /** CDN URL of a public object. Pure: no network call. */
  getPublicUrl(key: string): string;
  /** Short-lived URL to read a private object. */
  getSignedUrl(request: SignedUrlRequest): Promise<string>;
  /** Bytes of a stored object (for server-side processing); `null` when it does not exist. */
  read(key: string): Promise<Buffer | null>;
  /** Stores an object written by the server itself (e.g. an image variant). */
  write(request: WriteObjectRequest): Promise<void>;
  /** Deletes the objects; keys that do not exist are ignored. */
  delete(keys: readonly string[]): Promise<void>;
  /**
   * Copies an object onto another key of the same bucket in one step (readers see the old or the
   * new object, never a partial one): the same-key replacement of a file slot (SRV-181).
   */
  copy(request: CopyObjectRequest): Promise<CopyObjectResult>;
  /** Size, type and time of a stored object; `null` when nothing is stored under the key. */
  stat(key: string): Promise<ObjectInfo | null>;
}
