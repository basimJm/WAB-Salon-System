import { ExternalServiceError } from '../../utils/errors';
import type { BranchesRepository } from '../../repositories/branches.repository';
import type { TeamMemberView, TeamService } from '../team/team.service';
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
import type { Language } from '../../constants/i18n';
import type { UploadRaw } from '../../models/upload.model';
import type { Entity } from '../../utils/database/plain';
import type { Logger } from '../../utils/logger';
import type { PaginationMeta, PaginationParams } from '../../utils/pagination';
import type {
  AddFields,
  SalonServiceView,
  SalonServicesService,
  UpdateFields,
} from '../salonServices/salonServices.service';
import type {
  BookingConflict,
  ClosureView,
  HoursService,
  HoursView,
  ScheduleConflicts,
  WeeklyDayInput,
} from '../salons/hoursService';
import type { PolicyInput, PolicyService, PolicyView } from '../salons/policy.service';
import type { StaffProfileInput, StaffProfileView, StaffService } from '../team/staff.service';

/** Every edit says why and who did it (CLAUDE.md §5.12); the salon owner is told afterwards. */
export interface OnBehalf {
  readonly salonId: string;
  readonly reason: string;
  readonly actor: AdminActor;
  /** Hours, closures and services: the branch edited (default the main branch, §3.3a). */
  readonly branchId?: string | undefined;
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

  hours(salonId: string, branchId?: string): Promise<HoursView>;
  /** Upcoming PENDING/APPROVED bookings a new weekly schedule would break (nothing is changed). */
  previewWeekly(input: {
    salonId: string;
    days: readonly WeeklyDayInput[];
    branchId?: string | undefined;
  }): Promise<BookingConflict[]>;
  /** Upcoming PENDING/APPROVED bookings a closure would break (nothing is changed). */
  previewClosure(input: {
    salonId: string;
    from: string;
    to: string;
    branchId?: string | undefined;
  }): Promise<BookingConflict[]>;
  setWeekly(input: OnBehalf & { days: readonly WeeklyDayInput[] }): Promise<HoursView>;
  addClosure(
    input: OnBehalf & { from: string; to: string; closureReason: string },
  ): Promise<ClosureView>;
  updateClosure(
    input: OnBehalf & {
      closureId: string;
      from?: string | undefined;
      to?: string | undefined;
      closureReason?: string | undefined;
    },
  ): Promise<ClosureView>;
  removeClosure(input: OnBehalf & { closureId: string }): Promise<void>;

  services(input: {
    salonId: string;
    language: Language;
    params: PaginationParams;
    branchId?: string | undefined;
  }): Promise<{ items: SalonServiceView[]; meta: PaginationMeta }>;
  addService(
    input: OnBehalf & { language: Language; catalogServiceId: string; fields: AddFields },
  ): Promise<SalonServiceView>;
  updateService(
    input: OnBehalf & { language: Language; serviceId: string; fields: UpdateFields },
  ): Promise<SalonServiceView>;

  staff(input: { salonId: string; memberId: string }): Promise<StaffProfileView>;
  setStaff(
    input: OnBehalf & { memberId: string; profile: StaffProfileInput },
  ): Promise<StaffProfileView>;
  /** Moves a member to another branch of the salon (skills cleared; upcoming bookings refuse it). */
  moveStaff(input: OnBehalf & { memberId: string; toBranchId: string }): Promise<TeamMemberView>;

  policy(salonId: string): Promise<PolicyView | null>;
  setPolicy(input: OnBehalf & { policy: PolicyInput }): Promise<PolicyView>;
}

export interface AdminSalonEditDeps {
  readonly profile: SalonProfileService;
  readonly gallery: GalleryService;
  readonly hours: HoursService;
  readonly conflicts: ScheduleConflicts;
  readonly salonServices: SalonServicesService;
  readonly staff: StaffService;
  readonly policy: PolicyService;
  readonly audit: AuditWriter;
  readonly notifier: SalonStateNotifier;
  readonly logger: Logger;
  /** Main branch for previews without a branch; without it previews check the whole salon. */
  readonly branches?: Pick<BranchesRepository, 'main'>;
  /** Moving staff between branches (§5.16); without it `moveStaff` is unavailable. */
  readonly team?: Pick<TeamService, 'get' | 'update'>;
}

/** Files an admin uploaded for the salon count as the salon's own (purpose is checked as usual). */
const uploadedByAdmin = (upload: Entity<UploadRaw>): boolean => upload.ownerType === 'ADMIN';

/**
 * Part 1 of "admin edits for a salon" (profile and gallery). The write goes through the same
 * services the merchant app uses, so every rule (completeness, limits, uploads) stays in one place;
 * this layer adds the reason, the audit record and the notice to the owner. The audit is written
 * after the change succeeded and a failed notice is logged, never reported as a failed edit.
 */
export const createAdminSalonEditService = (deps: AdminSalonEditDeps): AdminSalonEditService => {
  const {
    profile,
    gallery,
    hours,
    conflicts,
    salonServices,
    staff,
    policy,
    audit,
    notifier,
    logger,
  } = deps;

  const record = async (
    { salonId, reason, actor, branchId }: OnBehalf,
    action: string,
    before: unknown,
    after: unknown,
  ): Promise<void> => {
    // A branch edit names its branch next to the change.
    const scoped = (value: unknown): unknown =>
      branchId === undefined ? value : { branchId, change: value };
    await audit.record({
      adminId: actor.adminId,
      action,
      entityType: ADMIN_SALON_EDIT_AUDIT.entityType,
      entityId: salonId,
      before: scoped(before),
      after: scoped(after),
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

  /** The branch a preview checks: the named one, else the main branch (§3.3a). */
  const previewBranch = async (salonId: string, branchId?: string): Promise<string | undefined> =>
    branchId ?? (await deps.branches?.main(salonId))?.id;

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

    hours: (salonId, branchId) => hours.get(salonId, branchId),

    previewWeekly: async ({ salonId, days, branchId }) =>
      conflicts.weekly(salonId, days, await previewBranch(salonId, branchId)),

    previewClosure: async ({ salonId, from, to, branchId }) =>
      conflicts.closure(salonId, { from, to }, await previewBranch(salonId, branchId)),

    async setWeekly({ days, ...on }) {
      const before = await hours.get(on.salonId, on.branchId);
      const after = await hours.setWeekly(on.salonId, days, on.branchId);
      await record(
        on,
        ADMIN_SALON_EDIT_AUDIT.actions.hours,
        before.weeklySchedule,
        after.weeklySchedule,
      );
      await tell(on, 'hours');
      return after;
    },

    async addClosure({ from, to, closureReason, ...on }) {
      const created = await hours.addClosure({
        salonId: on.salonId,
        scope: on.branchId,
        from,
        to,
        reason: closureReason,
      });
      await record(on, ADMIN_SALON_EDIT_AUDIT.actions.closureAdd, null, {
        id: created.id,
        from,
        to,
        reason: closureReason,
      });
      await tell(on, 'hours');
      return created;
    },

    async updateClosure({ closureId, from, to, closureReason, ...on }) {
      const before = (await hours.get(on.salonId, on.branchId)).closures.find(
        (c) => c.id === closureId,
      );
      const updated = await hours.updateClosure({
        salonId: on.salonId,
        scope: on.branchId,
        id: closureId,
        from,
        to,
        reason: closureReason,
      });
      await record(
        on,
        ADMIN_SALON_EDIT_AUDIT.actions.closureUpdate,
        before ?? { id: closureId },
        updated,
      );
      await tell(on, 'hours');
      return updated;
    },

    async removeClosure({ closureId, ...on }) {
      const before = (await hours.get(on.salonId, on.branchId)).closures.find(
        (c) => c.id === closureId,
      );
      await hours.removeClosure({ salonId: on.salonId, id: closureId, scope: on.branchId });
      await record(
        on,
        ADMIN_SALON_EDIT_AUDIT.actions.closureRemove,
        before ?? { id: closureId },
        null,
      );
      await tell(on, 'hours');
    },

    services: ({ salonId, language, params, branchId }) =>
      salonServices.list({ salonId, language, params, scope: branchId }),

    async addService({ language, catalogServiceId, fields, ...on }) {
      const created = await salonServices.add({
        salonId: on.salonId,
        scope: on.branchId,
        language,
        catalogServiceId,
        fields,
        acceptUpload: uploadedByAdmin,
      });
      await record(on, ADMIN_SALON_EDIT_AUDIT.actions.serviceAdd, null, {
        id: created.id,
        catalogServiceId,
        price: fields.price,
        durationMinutes: fields.durationMinutes,
      });
      await tell(on, 'services');
      return created;
    },

    async updateService({ language, serviceId, fields, ...on }) {
      const updated = await salonServices.update({
        salonId: on.salonId,
        scope: on.branchId,
        language,
        id: serviceId,
        fields,
        acceptUpload: uploadedByAdmin,
      });
      await record(on, ADMIN_SALON_EDIT_AUDIT.actions.serviceUpdate, { id: serviceId }, fields);
      await tell(on, 'services');
      return updated;
    },

    staff: ({ salonId, memberId }) => staff.get({ salonId, memberId }),

    async setStaff({ memberId, profile: input, ...on }) {
      const before = await staff.get({ salonId: on.salonId, memberId });
      const after = await staff.set({ salonId: on.salonId, memberId, profile: input });
      await record(on, ADMIN_SALON_EDIT_AUDIT.actions.staff, before, after);
      await tell(on, 'staff');
      return after;
    },

    async moveStaff({ memberId, toBranchId, ...on }) {
      const team = deps.team;
      if (team === undefined) throw new ExternalServiceError({ unavailable: true });
      const before = await team.get({ salonId: on.salonId, id: memberId });
      const after = await team.update({
        salonId: on.salonId,
        id: memberId,
        patch: { branchId: toBranchId },
      });
      await record(
        on,
        ADMIN_SALON_EDIT_AUDIT.actions.staffMove,
        { memberId, branchId: before.branchId },
        { memberId, branchId: after.branchId },
      );
      await tell(on, 'staff');
      return after;
    },

    policy: (salonId) => policy.get(salonId),

    async setPolicy({ policy: input, ...on }) {
      const before = await policy.get(on.salonId);
      const after = await policy.set(on.salonId, input);
      await record(on, ADMIN_SALON_EDIT_AUDIT.actions.policy, before, after);
      await tell(on, 'policy');
      return after;
    },
  };
};
