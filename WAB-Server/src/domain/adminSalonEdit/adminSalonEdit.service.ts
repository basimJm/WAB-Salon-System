import { ADMIN_SALON_EDIT_AUDIT } from '../../constants/adminSalonEdit';
import type { SalonEditArea } from '../../constants/salon';
import type { GalleryType } from '../../constants/gallery';
import type { AuditWriter } from '../audit/audit.service';
import type { AdminActor } from '../auth/accountLifecycle.service';
import type { GalleryService, GalleryItem } from '../gallery/gallery.service';
import type {
  ProfilePatch,
  SalonProfile,
  SalonProfileService,
} from '../salons/salonProfile.service';
import type { SalonStateNotifier } from '../salons/salonState.service';
import type { Logger } from '../../utils/logger';

/** Every edit says why and who did it (CLAUDE.md §5.12); the salon owner is told afterwards. */
export interface OnBehalf {
  readonly salonId: string;
  readonly reason: string;
  readonly actor: AdminActor;
}

export interface AdminSalonEditService {
  profile(salonId: string): Promise<SalonProfile>;
  updateProfile(input: OnBehalf & { patch: ProfilePatch }): Promise<SalonProfile>;
  gallery(salonId: string): Promise<GalleryItem[]>;
  addGalleryItem(
    input: OnBehalf & {
      type: GalleryType;
      key: string;
      thumbnailKey?: string | undefined;
      durationSec?: number | undefined;
    },
  ): Promise<GalleryItem>;
  removeGalleryItem(input: OnBehalf & { itemId: string }): Promise<void>;
  reorderGallery(input: OnBehalf & { ids: readonly string[] }): Promise<GalleryItem[]>;
}

export interface AdminSalonEditDeps {
  readonly profile: SalonProfileService;
  readonly gallery: GalleryService;
  readonly audit: AuditWriter;
  readonly notifier: SalonStateNotifier;
  readonly logger: Logger;
}

/** Files an admin uploaded for the salon count as the salon's own (purpose is checked as usual). */
const uploadedByAdmin = (upload: { ownerType: string }): boolean => upload.ownerType === 'ADMIN';

/**
 * Part 1 of "admin edits for a salon" (profile and gallery). The write goes through the same
 * services the merchant app uses, so every rule (completeness, limits, uploads) stays in one place;
 * this layer adds the reason, the audit record and the notice to the owner. The audit is written
 * after the change succeeded and a failed notice is logged, never reported as a failed edit.
 */
export const createAdminSalonEditService = (deps: AdminSalonEditDeps): AdminSalonEditService => {
  const { profile, gallery, audit, notifier, logger } = deps;

  const record = async (
    { salonId, reason, actor }: OnBehalf,
    action: string,
    before: unknown,
    after: unknown,
  ): Promise<void> => {
    await audit.record({
      adminId: actor.adminId,
      action,
      entityType: ADMIN_SALON_EDIT_AUDIT.entityType,
      entityId: salonId,
      before,
      after,
      reason,
      ip: actor.ip,
      userAgent: actor.userAgent,
    });
  };

  const tell = async ({ salonId, reason }: OnBehalf, area: SalonEditArea): Promise<void> => {
    try {
      await notifier.changed({ salonId, event: 'salon.edited_by_admin', reason, area });
    } catch (error) {
      logger.warn({ salonId, area, err: error }, 'salon edit notice failed');
    }
  };

  const snapshot = (items: readonly GalleryItem[]): { id: string; order: number }[] =>
    items.map((item) => ({ id: item.id, order: item.order }));

  return {
    profile: (salonId) => profile.get(salonId),

    async updateProfile(input) {
      const before = await profile.get(input.salonId);
      const after = await profile.update(input.salonId, input.patch, {
        acceptUpload: uploadedByAdmin,
      });
      const changed = Object.keys(input.patch);
      const pick = (source: SalonProfile): Record<string, unknown> =>
        Object.fromEntries(
          changed.map((field) => [field, (source as unknown as Record<string, unknown>)[field]]),
        );
      await record(input, ADMIN_SALON_EDIT_AUDIT.actions.profile, pick(before), pick(after));
      await tell(input, 'profile');
      return after;
    },

    gallery: (salonId) => gallery.list(salonId),

    async addGalleryItem({ type, key, thumbnailKey, durationSec, ...on }) {
      const item = await gallery.add({
        salonId: on.salonId,
        type,
        key,
        thumbnailKey,
        durationSec,
        acceptUpload: uploadedByAdmin,
      });
      await record(on, ADMIN_SALON_EDIT_AUDIT.actions.galleryAdd, null, { id: item.id, type });
      await tell(on, 'gallery');
      return item;
    },

    async removeGalleryItem({ itemId, ...on }) {
      const before = (await gallery.list(on.salonId)).find((item) => item.id === itemId);
      await gallery.remove({ salonId: on.salonId, id: itemId });
      await record(
        on,
        ADMIN_SALON_EDIT_AUDIT.actions.galleryRemove,
        before === undefined ? { id: itemId } : { id: before.id, type: before.type },
        null,
      );
      await tell(on, 'gallery');
    },

    async reorderGallery({ ids, ...on }) {
      const before = await gallery.list(on.salonId);
      const after = await gallery.reorder({ salonId: on.salonId, ids });
      await record(
        on,
        ADMIN_SALON_EDIT_AUDIT.actions.galleryOrder,
        snapshot(before),
        snapshot(after),
      );
      await tell(on, 'gallery');
      return after;
    },
  };
};
