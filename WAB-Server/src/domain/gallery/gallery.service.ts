import { ERROR_CODES, errorMessageKey } from '../../constants/errorCodes';
import { GALLERY_MAX_ITEMS, type GalleryType } from '../../constants/gallery';
import type { GalleryItemRaw } from '../../models/galleryItem.model';
import type { StorageProvider } from '../../providers/storage';
import type { GalleryRepository } from '../../repositories/gallery.repository';
import { toObjectId } from '../../utils/database/ids';
import type { UploadRaw } from '../../models/upload.model';
import type { Entity } from '../../utils/database/plain';
import { BusinessRuleError, NotFoundError, ValidationError } from '../../utils/errors';
import type { SettingsService } from '../settings';
import { variantKey } from '../uploads/variants';
import type { StorageCleanup } from '../files/storageCleanup.service';
import { storedObjectsOf } from '../files/storedObjects';
import type { UploadVerifier } from '../uploads/uploads.service';

export interface GalleryItem {
  readonly id: string;
  readonly type: GalleryType;
  readonly url: string;
  /** Small copy; may not exist yet right after the upload, so clients fall back to `url`. */
  readonly thumbnailUrl: string | null;
  readonly durationSec: number | null;
  readonly order: number;
}

export interface GalleryService {
  list(salonId: string): Promise<GalleryItem[]>;
  add(input: {
    salonId: string;
    type: GalleryType;
    key: string;
    thumbnailKey?: string | undefined;
    durationSec?: number | undefined;
    /** Replaces the default "uploaded by this salon" check (an admin adds for the salon). */
    acceptUpload?: ((upload: Entity<UploadRaw>) => boolean) | undefined;
  }): Promise<GalleryItem>;
  remove(input: { salonId: string; id: string }): Promise<void>;
  /** `ids` must list every item of the salon exactly once. */
  reorder(input: { salonId: string; ids: readonly string[] }): Promise<GalleryItem[]>;
}

export interface GalleryDeps {
  readonly gallery: GalleryRepository;
  readonly storage: Pick<StorageProvider, 'getPublicUrl'>;
  readonly uploads: UploadVerifier;
  readonly settings: Pick<SettingsService, 'get'>;
  /** Removed items' files are deleted through the outbox (SRV-182). */
  readonly cleanup: Pick<StorageCleanup, 'enqueue'>;
}

const invalid = (field: string): ValidationError =>
  new ValidationError({
    code: ERROR_CODES.VALIDATION_ERROR,
    details: [
      {
        field,
        code: ERROR_CODES.VALIDATION_ERROR,
        messageKey: errorMessageKey(ERROR_CODES.VALIDATION_ERROR),
      },
    ],
  });

export const createGalleryService = ({
  gallery,
  storage,
  uploads,
  settings,
  cleanup,
}: GalleryDeps): GalleryService => {
  const toItem = (item: Entity<GalleryItemRaw>): GalleryItem => ({
    id: item.id,
    type: item.type,
    url: storage.getPublicUrl(item.key),
    thumbnailUrl: item.thumbnailKey === undefined ? null : storage.getPublicUrl(item.thumbnailKey),
    durationSec: item.durationSec ?? null,
    order: item.order,
  });

  return {
    async list(salonId) {
      return (await gallery.forSalon(salonId)).map(toItem);
    },

    async add({ salonId, type, key, thumbnailKey, durationSec, acceptUpload }) {
      const mine =
        acceptUpload ?? ((upload: { salonId?: string }): boolean => upload.salonId === salonId);
      await uploads.assertConfirmed({
        keys: [key],
        purpose: type === 'IMAGE' ? 'GALLERY_IMAGE' : 'GALLERY_VIDEO',
        field: 'body.key',
        accept: mine,
      });
      if (thumbnailKey !== undefined) {
        // A video's poster frame is an ordinary gallery image uploaded by the same salon.
        await uploads.assertConfirmed({
          keys: [thumbnailKey],
          purpose: 'GALLERY_IMAGE',
          field: 'body.thumbnailKey',
          accept: mine,
        });
      }
      if (type === 'VIDEO' && durationSec !== undefined) {
        const maxSec = await settings.get('uploads.videoMaxSec');
        if (durationSec > maxSec) throw invalid('body.durationSec');
      }
      const existing = await gallery.forSalon(salonId);
      if (existing.length >= GALLERY_MAX_ITEMS) {
        throw new BusinessRuleError({ code: ERROR_CODES.VALIDATION_ERROR });
      }
      const created = await gallery.create({
        salonId: toObjectId(salonId),
        type,
        key,
        ...(type === 'IMAGE'
          ? { thumbnailKey: variantKey(key, 'thumb') }
          : thumbnailKey === undefined
            ? {}
            : { thumbnailKey }),
        ...(type === 'VIDEO' && durationSec !== undefined ? { durationSec } : {}),
        order: existing.reduce((highest, item) => Math.max(highest, item.order), -1) + 1,
      });
      return toItem(created);
    },

    async remove({ salonId, id }) {
      const items = await gallery.forSalon(salonId);
      const item = items.find((candidate) => candidate.id === id);
      if (item === undefined || !(await gallery.remove(salonId, id))) {
        throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
      }
      // The record is gone; its files go through the cleanup outbox (retried until deleted).
      await cleanup.enqueue(
        [
          ...storedObjectsOf([item.key]),
          ...(item.thumbnailKey === undefined || item.type === 'IMAGE' ? [] : [item.thumbnailKey]),
        ],
        'FILE_REMOVED',
      );
    },

    async reorder({ salonId, ids }) {
      const items = await gallery.forSalon(salonId);
      const known = new Set(items.map((item) => item.id));
      if (
        ids.length !== items.length ||
        new Set(ids).size !== ids.length ||
        !ids.every((id) => known.has(id))
      ) {
        throw invalid('body.ids');
      }
      await Promise.all(ids.map((id, order) => gallery.updateById(id, { order })));
      return (await gallery.forSalon(salonId)).map(toItem);
    },
  };
};
