import type { Permission } from './enums';
import type { StorageVisibility } from './providers';

/** Uploads module (SRV-046, BUSINESS_DOMAIN.md §3.7 `uploads`, wab-storage BRD STO-02..05). */
export const UPLOADS_COLLECTION = 'uploads';
export const UPLOAD_STATUSES = ['PENDING', 'CONFIRMED', 'REJECTED'] as const;
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
