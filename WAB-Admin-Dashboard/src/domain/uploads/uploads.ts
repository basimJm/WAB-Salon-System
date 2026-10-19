export type UploadPurpose =
  | 'BANNER_IMAGE'
  | 'CATALOG_IMAGE'
  | 'SALON_COVER'
  | 'SALON_PROFILE'
  | 'GALLERY_IMAGE'
  | 'GALLERY_VIDEO'
  | 'SERVICE_MEDIA';

export interface UploadedFile {
  readonly key: string;
  /** Public CDN address when the file is public; null for private files. */
  readonly url: string | null;
}

/** Presign -> PUT to storage -> confirm: the only way a file reaches the platform (BUSINESS_DOMAIN uploads). */
export interface UploadsRepository {
  upload(
    purpose: UploadPurpose,
    file: File,
    onProgress: (ratio: number) => void,
  ): Promise<UploadedFile>;
}
