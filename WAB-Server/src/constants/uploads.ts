import type { Permission } from './enums';
import type { StorageVisibility } from './providers';

/** Uploads module (SRV-046, BUSINESS_DOMAIN.md §3.7 `uploads`, wab-storage BRD STO-02..05). */
export const UPLOADS_COLLECTION = 'uploads';
/** `CONSUMED`: a temporary upload that was copied onto a file slot (SRV-181) and is no longer usable. */
export const UPLOAD_STATUSES = ['PENDING', 'CONFIRMED', 'REJECTED', 'CONSUMED'] as const;
export type UploadStatus = (typeof UPLOAD_STATUSES)[number];
export const UPLOAD_OWNER_TYPES = ['CUSTOMER', 'MEMBER', 'ADMIN', 'GUEST'] as const;
export type UploadOwnerType = (typeof UPLOAD_OWNER_TYPES)[number];

export const UPLOAD_PURPOSES = [
  'CUSTOMER_AVATAR',
  'MEMBER_PHOTO',
  'SALON_COVER',
  'SALON_PROFILE',
  'GALLERY_IMAGE',
  'GALLERY_VIDEO',
  'SERVICE_MEDIA',
  'LICENSE_DOCUMENT',
  'MEDICAL_LICENSE',
  'CATALOG_IMAGE',
  'BANNER_IMAGE',
] as const;
export type UploadPurpose = (typeof UPLOAD_PURPOSES)[number];

export type UploadKind = 'image' | 'video' | 'document';
export const UPLOAD_CONTENT_TYPES: Readonly<Record<UploadKind, Readonly<Record<string, string>>>> =
  {
    image: { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic' },
    video: { 'video/mp4': 'mp4', 'video/quicktime': 'mov' },
    document: {
      'application/pdf': 'pdf',
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/heic': 'heic',
    },
  };

export type UploadScope = 'customer' | 'merchant' | 'admin' | 'guest';

export interface UploadPolicy {
  readonly kind: UploadKind;
  readonly visibility: StorageVisibility;
  /** First part of the generated key. */
  readonly prefix: string;
  /** Who may ask for an upload URL for this purpose. */
  readonly scopes: readonly UploadScope[];
  /** Merchant permission the member needs (the owner always has it). */
  readonly permission?: Permission;
  /** Merchant members only: owners only. */
  readonly ownerOnly?: boolean;
}

/** What a guest may upload before applying; the first is the default. */
export const GUEST_LICENSE_PURPOSES = ['LICENSE_DOCUMENT', 'MEDICAL_LICENSE'] as const;

export const UPLOAD_POLICIES: Readonly<Record<UploadPurpose, UploadPolicy>> = {
  CUSTOMER_AVATAR: {
    kind: 'image',
    visibility: 'PUBLIC',
    prefix: 'customers',
    scopes: ['customer'],
  },
  MEMBER_PHOTO: { kind: 'image', visibility: 'PUBLIC', prefix: 'members', scopes: ['merchant'] },
  SALON_COVER: {
    kind: 'image',
    visibility: 'PUBLIC',
    prefix: 'salons/cover',
    scopes: ['admin', 'merchant'],
    permission: 'SALON_PROFILE_MANAGE',
  },
  SALON_PROFILE: {
    kind: 'image',
    visibility: 'PUBLIC',
    prefix: 'salons/profile',
    scopes: ['admin', 'merchant'],
    permission: 'SALON_PROFILE_MANAGE',
  },
  GALLERY_IMAGE: {
    kind: 'image',
    visibility: 'PUBLIC',
    prefix: 'gallery',
    scopes: ['admin', 'merchant'],
    permission: 'GALLERY_MANAGE',
  },
  GALLERY_VIDEO: {
    kind: 'video',
    visibility: 'PUBLIC',
    prefix: 'gallery',
    scopes: ['admin', 'merchant'],
    permission: 'GALLERY_MANAGE',
  },
  SERVICE_MEDIA: {
    kind: 'image',
    visibility: 'PUBLIC',
    prefix: 'services',
    scopes: ['merchant'],
    permission: 'SERVICES_MANAGE',
  },
  LICENSE_DOCUMENT: {
    kind: 'document',
    visibility: 'PRIVATE',
    prefix: 'licenses',
    scopes: ['guest', 'merchant'],
    ownerOnly: true,
  },
  // A clinic's medical license (§5.19): required besides the trade license, private like it.
  MEDICAL_LICENSE: {
    kind: 'document',
    visibility: 'PRIVATE',
    prefix: 'medical-licenses',
    scopes: ['guest', 'merchant'],
    ownerOnly: true,
  },
  CATALOG_IMAGE: {
    kind: 'image',
    visibility: 'PUBLIC',
    prefix: 'catalog',
    // Admins build the catalog; salons attach a picture to a catalog request.
    scopes: ['admin', 'merchant'],
    permission: 'SERVICES_MANAGE',
  },
  BANNER_IMAGE: { kind: 'image', visibility: 'PUBLIC', prefix: 'banners', scopes: ['admin'] },
};

export const BYTES_PER_MB = 1_048_576;
/** Lifetime of a presigned upload URL and of the pending record. */
export const UPLOAD_URL_TTL_SEC = 300;
/** Per-IP budget of presign/confirm (public licence uploads included); its own counter (SRV-151). */
export const UPLOAD_ROUTE_RATE_LIMIT = { windowMs: 60_000, max: 20 } as const;
export const UPLOAD_ROUTES = {
  base: '/uploads',
  presign: '/presign',
  confirm: '/confirm',
  licensePresign: '/license/presign',
  licenseConfirm: '/license/confirm',
} as const;

/** Smaller copies of public images, stored beside the original (SRV-047, BE-72, STO-07). */
export const IMAGE_VARIANTS = [
  { name: 'thumb', width: 320 },
  { name: 'medium', width: 960 },
] as const;
export type ImageVariantName = (typeof IMAGE_VARIANTS)[number]['name'];
export const VARIANT_CONTENT_TYPE = 'image/webp';
export const VARIANT_EXTENSION = 'webp';
export const VARIANT_QUALITY = 80;
export const VARIANT_SEPARATOR = '_';

/**
 * File slots (SRV-181, BUSINESS_DOMAIN §3.7): a single-image field owns one fixed object key; the
 * stored reference is `<key>?v=<version>` so URLs change when the content does (app + CDN caches).
 */
export const FILE_VERSION_SEPARATOR = '?v=';
export const SLOT_PURPOSES = [
  'CUSTOMER_AVATAR',
  'SALON_PROFILE',
  'SALON_COVER',
  'MEMBER_PHOTO',
  'CATALOG_IMAGE',
  'BANNER_IMAGE',
] as const;
export type SlotPurpose = (typeof SLOT_PURPOSES)[number];
/** Object key of each slot; ids are server ids (ObjectId strings), never client text. */
export const SLOT_KEYS = {
  customerAvatar: (customerId: string): string => `customers/${customerId}/profile/avatar`,
  salonLogo: (salonId: string): string => `salons/${salonId}/logo`,
  salonCover: (salonId: string): string => `salons/${salonId}/cover`,
  memberPhoto: (salonId: string, memberId: string): string =>
    `salons/${salonId}/staff/${memberId}/photo`,
  catalogImage: (catalogServiceId: string): string => `catalog/${catalogServiceId}/image`,
  bannerImage: (bannerId: string, language: string): string =>
    `banners/${bannerId}/image-${language}`,
} as const;
/** Redis lock of one slot while its object and reference change (concurrent replacements queue). */
export const FILE_SLOT_LOCK_PREFIX = 'file-slot';
/** A replacement copies one object: the lock outlives it; a second request waits up to ~5 s, then 409. */
export const FILE_SLOT_LOCK = { ttlMs: 30_000, attempts: 50, retryDelayMs: 100 } as const;

/** Cleanup outbox (`storageCleanups`): objects to delete after the database stopped using them. */
export const STORAGE_CLEANUPS_COLLECTION = 'storageCleanups';
export const STORAGE_CLEANUP_BATCH_SIZE = 200;
export const STORAGE_CLEANUP_MAX_ATTEMPTS = 10;
/** Retry delay = base * 2^(attempts-1), capped (a provider outage must not spin). */
export const STORAGE_CLEANUP_RETRY_BASE_MS = 60_000;
export const STORAGE_CLEANUP_RETRY_MAX_MS = 6 * 60 * 60 * 1_000;
export const STORAGE_CLEANUP_REASONS = [
  'SLOT_REPLACED_TEMP',
  'SLOT_REPLACED_LEGACY',
  'SLOT_REMOVED',
  'FILE_REMOVED',
  'OWNER_DELETED',
] as const;
export type StorageCleanupReason = (typeof STORAGE_CLEANUP_REASONS)[number];
