import { SLOT_KEYS } from '../../constants/uploads';
import type { BannerRaw } from '../../models/banner.model';
import type { CatalogServiceRaw } from '../../models/catalogService.model';
import type { AdminImageField } from './imageSlots';

/** The catalog entry's picture is one slot: `catalog/{id}/image` (SRV-182). */
export const CATALOG_IMAGE_FIELDS: readonly AdminImageField<CatalogServiceRaw>[] = [
  {
    purpose: 'CATALOG_IMAGE',
    slotKey: (id) => SLOT_KEYS.catalogImage(id),
    field: 'body.imageKey',
    path: 'imageKey',
    read: (source) => {
      const value = (source as { imageKey?: unknown }).imageKey;
      return typeof value === 'string' ? value : undefined;
    },
  },
];

const BANNER_LANGUAGES = ['ar', 'en'] as const;

/** A banner has one picture per language: `banners/{id}/image-ar` and `-en` (SRV-182). */
export const BANNER_IMAGE_FIELDS: readonly AdminImageField<BannerRaw>[] = BANNER_LANGUAGES.map(
  (language) => ({
    purpose: 'BANNER_IMAGE',
    slotKey: (id: string) => SLOT_KEYS.bannerImage(id, language),
    field: `body.imageKey.${language}`,
    path: `imageKey.${language}`,
    read: (source: unknown) => {
      const image = (source as { imageKey?: Partial<Record<string, unknown>> }).imageKey;
      const value = image?.[language];
      return typeof value === 'string' ? value : undefined;
    },
  }),
);
