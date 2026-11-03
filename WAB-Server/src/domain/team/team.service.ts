import type { Types } from 'mongoose';
import type { BranchesRepository } from '../../repositories/branches.repository';
import type { MainBranches } from '../branches/mainBranch';
import { noAccessEvents, type AccessEvents } from '../access/accessEvents';
import { ERROR_CODES, errorMessageKey } from '../../constants/errorCodes';
import type { MemberRole, Permission } from '../../constants/enums';
import type { AssignableRole } from '../../constants/team';
import type { MemberRaw } from '../../models/member.model';
import type { StorageProvider } from '../../providers/storage';
import type { MembersRepository } from '../../repositories/identity.repository';
import { isDuplicateKeyError } from '../../utils/database/errors';
import { toObjectId } from '../../utils/database/ids';
import type { Entity } from '../../utils/database/plain';
import {
  BusinessRuleError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../utils/errors';
import type { PaginationMeta, PaginationParams } from '../../utils/pagination';
import type { AccountLifecycleService } from '../auth/accountLifecycle.service';
import type { PhoneInput, PhoneVerifier } from '../auth/phoneVerifier';
import {
  defaultPermissionsFor,
  effectivePermissions,
  normalizeGrant,
} from '../permissions/permissions';
import type { BookingConflict } from '../salons/hoursService';
import type { UploadVerifier } from '../uploads/uploads.service';
import type { FileSlots } from '../files/fileSlots.service';
import { applySlotPatch } from '../files/slotPatch';
import { SLOT_KEYS } from '../../constants/uploads';

export interface TeamMemberView {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly phone: string;
  readonly photoUrl: string | null;
  readonly role: MemberRole;
  /** What the member can do now: the OWNER has everything. */
  readonly permissions: readonly Permission[];
  readonly active: boolean;
  readonly providesServices: boolean;
  /** The member's branch; `null` for the owner (every branch). */
  readonly branchId: string | null;
}

export interface MemberPatch {
  readonly firstName?: string | undefined;
  readonly lastName?: string | undefined;
  /** `null` removes the photo. */
  readonly photoKey?: string | null | undefined;
  readonly role?: AssignableRole | undefined;
  readonly permissions?: readonly string[] | undefined;
  /** Owner: move to another branch of the salon (skills are cleared, upcoming bookings refuse it). */
  readonly branchId?: string | undefined;
}

export interface TeamService {
  /** `branchId` = the caller's branch scope (managers see their branch only, §6). */
  list(input: {
    salonId: string;
    params: PaginationParams;
    branchId?: string | undefined;
  }): Promise<{ items: TeamMemberView[]; meta: PaginationMeta }>;
  get(input: {
    salonId: string;
    id: string;
    branchId?: string | undefined;
  }): Promise<TeamMemberView>;
  create(input: {
    salonId: string;
    firstName: string;
    lastName: string;
    phone: PhoneInput;
    role: AssignableRole;
    permissions?: readonly string[] | undefined;
    photoKey?: string | undefined;
    branchId?: string | undefined;
  }): Promise<TeamMemberView>;
  update(input: { salonId: string; id: string; patch: MemberPatch }): Promise<TeamMemberView>;
  deactivate(input: { salonId: string; id: string }): Promise<TeamMemberView>;
  reactivate(input: { salonId: string; id: string }): Promise<TeamMemberView>;
}

export interface TeamDeps {
  readonly members: MembersRepository;
  readonly lifecycle: Pick<AccountLifecycleService, 'deactivateMember' | 'reactivateMember'>;
  /** Tells the member's live app about permission changes. */
  readonly access?: Pick<AccessEvents, 'permissionsChanged'>;
  readonly phones: Pick<PhoneVerifier, 'resolve'>;
  readonly storage: Pick<StorageProvider, 'getPublicUrl'>;
  readonly uploads: UploadVerifier;
  /** Member photos are file slots (SRV-181). */
  readonly files: Pick<FileSlots, 'replace' | 'remove'>;
  /** Upcoming bookings of the member; deactivation is refused while any exist (SCHEDULE_CONFLICT). */
  readonly deactivationConflicts?: {
    check(input: { salonId: string; memberId: string }): Promise<BookingConflict[]>;
  };
  /** Salon-level endpoint: new non-owner members join the salon's main branch (§5.16). */
  readonly mainBranches?: Pick<MainBranches, 'idOf'>;
  /** Checks a chosen branch belongs to the salon and is not closed. */
  readonly branches?: Pick<BranchesRepository, 'findInSalon'>;
}

export const createTeamService = ({
  members,
  lifecycle,
  phones,
  storage,
  uploads,
  files,
  deactivationConflicts,
  access = noAccessEvents,
  mainBranches,
  branches,
}: TeamDeps): TeamService => {
  const view = (m: Entity<MemberRaw>): TeamMemberView => ({
    id: m.id,
    firstName: m.firstName,
    lastName: m.lastName,
    phone: m.phone,
    photoUrl: m.photoKey === undefined ? null : storage.getPublicUrl(m.photoKey),
    role: m.role,
    permissions: effectivePermissions(m),
    active: m.active,
    providesServices: m.providesServices,
    branchId: m.role === 'OWNER' ? null : (m.branchId ?? null),
  });

  /** A branch the owner picked: of this salon and still open (`BRANCH_NOT_FOUND` otherwise). */
  const openBranch = async (salonId: string, branchId: string): Promise<Types.ObjectId> => {
    const branch = await branches?.findInSalon(salonId, branchId);
    if (branch === undefined || branch === null || branch.status === 'CLOSED') {
      throw new NotFoundError({ code: ERROR_CODES.BRANCH_NOT_FOUND });
    }
    return toObjectId(branch.id);
  };

  /** Upcoming bookings of the member refuse a deactivation or a move (SCHEDULE_CONFLICT). */
  const refuseConflicts = async (salonId: string, memberId: string): Promise<void> => {
    const found = (await deactivationConflicts?.check({ salonId, memberId })) ?? [];
    if (found.length > 0) {
      throw new ConflictError({
        code: ERROR_CODES.SCHEDULE_CONFLICT,
        details: found.map((c) => ({
          field: c.bookingId,
          code: ERROR_CODES.SCHEDULE_CONFLICT,
          messageKey: errorMessageKey(ERROR_CODES.SCHEDULE_CONFLICT),
        })),
      });
    }
  };

  /** A branch member sees only members of their own branch. */
  const inScope = (m: Entity<MemberRaw>, branchId?: string): void => {
    if (branchId !== undefined && m.branchId !== branchId) {
      throw new ForbiddenError({ code: ERROR_CODES.BRANCH_SCOPE_DENIED });
    }
  };

  /** A member of another salon looks the same as a missing one. */
  const find = async (salonId: string, id: string): Promise<Entity<MemberRaw>> => {
    const member = await members.findOne({ _id: id, salonId });
    if (member === null) throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
    return member;
  };

  const verifyPhoto = async (salonId: string, photoKey: string): Promise<void> => {
    await uploads.assertConfirmed({
      keys: [photoKey],
      purpose: 'MEMBER_PHOTO',
      field: 'body.photoKey',
      accept: (upload) => upload.salonId === salonId,
    });
  };

  /** The member photo is a file slot (SRV-181): replaced in place, removed through the outbox. */
  const patchPhoto = (
    salonId: string,
    member: Entity<MemberRaw>,
    value: string | null | undefined,
  ): Promise<void> =>
    applySlotPatch(files, {
      target: {
        purpose: 'MEMBER_PHOTO',
        key: SLOT_KEYS.memberPhoto(salonId, member.id),
        ownerType: 'MEMBER',
        ownerId: member.id,
        salonId,
      },
      current: member.photoKey,
      value,
      field: 'body.photoKey',
      accept: (upload) => upload.salonId === salonId,
      write: async (ref) => {
        await members.patch(
          member.id,
          ref === null ? { set: {}, unset: ['photoKey'] } : { set: { photoKey: ref } },
        );
      },
    });

  return {
    async list({ salonId, params, branchId }) {
      const filter = branchId === undefined ? { salonId } : { salonId, branchId };
      const page = await members.findPage(filter, params, { createdAt: 1 });
      return { items: page.items.map(view), meta: page.meta };
    },

    async get({ salonId, id, branchId }) {
      const member = await find(salonId, id);
      inScope(member, branchId);
      return view(member);
    },

    async create({
      salonId,
      firstName,
      lastName,
      phone,
      role,
      permissions,
      photoKey,
      branchId: chosen,
    }) {
      const grant =
        permissions === undefined ? defaultPermissionsFor(role) : normalizeGrant(permissions);
      const resolved = await phones.resolve(phone);
      if (photoKey !== undefined) await verifyPhoto(salonId, photoKey);
      const taken = (): ConflictError =>
        new ConflictError({ code: ERROR_CODES.PHONE_ALREADY_REGISTERED });
      if ((await members.findByPhone(resolved.e164)) !== null) throw taken();
      // Members created here are never the owner (the owner comes with the salon).
      const branchId =
        chosen === undefined
          ? await mainBranches?.idOf(salonId)
          : await openBranch(salonId, chosen);
      try {
        const created = await members.create({
          salonId: toObjectId(salonId),
          ...(branchId === undefined ? {} : { branchId }),
          firstName,
          lastName,
          phone: resolved.e164,
          role,
          permissions: grant,
          active: true,
          providesServices: false,
        });
        if (photoKey === undefined) return view(created);
        // The slot key needs the member id: the photo is placed right after the member exists.
        await patchPhoto(salonId, created, photoKey);
        return view(await find(salonId, created.id));
      } catch (error) {
        // Two owners adding the same number at once: the unique index decides.
        if (isDuplicateKeyError(error)) throw taken();
        throw error;
      }
    },

    async update({ salonId, id, patch }) {
      const current = await find(salonId, id);
      const touchesAccess = patch.role !== undefined || patch.permissions !== undefined;
      // The owner keeps every right; only the name and photo of the OWNER can change here.
      if (current.role === 'OWNER' && touchesAccess) {
        throw new BusinessRuleError({ code: ERROR_CODES.LAST_OWNER });
      }
      const moving = patch.branchId !== undefined && patch.branchId !== current.branchId;
      if (moving && current.role === 'OWNER')
        throw new BusinessRuleError({ code: ERROR_CODES.LAST_OWNER });
      const nextBranch = moving ? await openBranch(salonId, patch.branchId ?? '') : undefined;
      // Moving takes the member away from their branch's bookings: refused while any is upcoming.
      if (moving) await refuseConflicts(salonId, id);
      await patchPhoto(salonId, current, patch.photoKey);
      const role = patch.role ?? (current.role === 'OWNER' ? undefined : current.role);
      const permissions =
        patch.permissions !== undefined
          ? normalizeGrant(patch.permissions)
          : patch.role !== undefined && patch.role !== current.role
            ? defaultPermissionsFor(patch.role)
            : undefined;
      const updated = await members.patch(id, {
        set: {
          ...(patch.firstName === undefined ? {} : { firstName: patch.firstName }),
          ...(patch.lastName === undefined ? {} : { lastName: patch.lastName }),
          ...(patch.role === undefined || role === undefined ? {} : { role }),
          ...(permissions === undefined ? {} : { permissions }),
          // Skills are services of the old branch: the member picks services of the new one.
          ...(nextBranch === undefined ? {} : { branchId: nextBranch, 'staff.serviceIds': [] }),
        },
      });
      if (updated === null) throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
      if (touchesAccess || moving) await access.permissionsChanged(id);
      return view(updated);
    },

    async deactivate({ salonId, id }) {
      await find(salonId, id);
      await refuseConflicts(salonId, id);
      await lifecycle.deactivateMember({ memberId: id, salonId });
      return view(await find(salonId, id));
    },

    async reactivate({ salonId, id }) {
      await lifecycle.reactivateMember({ memberId: id, salonId });
      return view(await find(salonId, id));
    },
  };
};
