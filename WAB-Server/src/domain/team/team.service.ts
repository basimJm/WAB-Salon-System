import { ERROR_CODES, errorMessageKey } from '../../constants/errorCodes';
import type { MemberRole, Permission } from '../../constants/enums';
import type { AssignableRole } from '../../constants/team';
import type { MemberRaw } from '../../models/member.model';
import type { StorageProvider } from '../../providers/storage';
import type { MembersRepository } from '../../repositories/identity.repository';
import { isDuplicateKeyError } from '../../utils/database/errors';
import { toObjectId } from '../../utils/database/ids';
import type { Entity } from '../../utils/database/plain';
import { BusinessRuleError, ConflictError, NotFoundError } from '../../utils/errors';
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
}

export interface MemberPatch {
  readonly firstName?: string | undefined;
  readonly lastName?: string | undefined;
  /** `null` removes the photo. */
  readonly photoKey?: string | null | undefined;
  readonly role?: AssignableRole | undefined;
  readonly permissions?: readonly string[] | undefined;
}

export interface TeamService {
  list(input: {
    salonId: string;
    params: PaginationParams;
  }): Promise<{ items: TeamMemberView[]; meta: PaginationMeta }>;
  get(input: { salonId: string; id: string }): Promise<TeamMemberView>;
  create(input: {
    salonId: string;
    firstName: string;
    lastName: string;
    phone: PhoneInput;
    role: AssignableRole;
    permissions?: readonly string[] | undefined;
    photoKey?: string | undefined;
  }): Promise<TeamMemberView>;
  update(input: { salonId: string; id: string; patch: MemberPatch }): Promise<TeamMemberView>;
  deactivate(input: { salonId: string; id: string }): Promise<TeamMemberView>;
  reactivate(input: { salonId: string; id: string }): Promise<TeamMemberView>;
}

export interface TeamDeps {
  readonly members: MembersRepository;
  readonly lifecycle: Pick<AccountLifecycleService, 'deactivateMember' | 'reactivateMember'>;
  readonly phones: Pick<PhoneVerifier, 'resolve'>;
  readonly storage: Pick<StorageProvider, 'getPublicUrl'>;
  readonly uploads: UploadVerifier;
  /** Upcoming bookings of the member; deactivation is refused while any exist (SCHEDULE_CONFLICT). */
  readonly deactivationConflicts?: {
    check(input: { salonId: string; memberId: string }): Promise<BookingConflict[]>;
  };
}

export const createTeamService = ({
  members,
  lifecycle,
  phones,
  storage,
  uploads,
  deactivationConflicts,
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
  });

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

  return {
    async list({ salonId, params }) {
      const page = await members.findPage({ salonId }, params, { createdAt: 1 });
      return { items: page.items.map(view), meta: page.meta };
    },

    async get({ salonId, id }) {
      return view(await find(salonId, id));
    },

    async create({ salonId, firstName, lastName, phone, role, permissions, photoKey }) {
      const grant =
        permissions === undefined ? defaultPermissionsFor(role) : normalizeGrant(permissions);
      const resolved = await phones.resolve(phone);
      if (photoKey !== undefined) await verifyPhoto(salonId, photoKey);
      const taken = (): ConflictError =>
        new ConflictError({ code: ERROR_CODES.PHONE_ALREADY_REGISTERED });
      if ((await members.findByPhone(resolved.e164)) !== null) throw taken();
      try {
        const created = await members.create({
          salonId: toObjectId(salonId),
          firstName,
          lastName,
          phone: resolved.e164,
          ...(photoKey === undefined ? {} : { photoKey }),
          role,
          permissions: grant,
          active: true,
          providesServices: false,
        });
        return view(created);
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
      if (typeof patch.photoKey === 'string' && patch.photoKey !== current.photoKey) {
        await verifyPhoto(salonId, patch.photoKey);
      }
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
          ...(typeof patch.photoKey === 'string' ? { photoKey: patch.photoKey } : {}),
          ...(patch.role === undefined || role === undefined ? {} : { role }),
          ...(permissions === undefined ? {} : { permissions }),
        },
        unset: patch.photoKey === null ? ['photoKey'] : [],
      });
      if (updated === null) throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
      return view(updated);
    },

    async deactivate({ salonId, id }) {
      await find(salonId, id);
      const found = (await deactivationConflicts?.check({ salonId, memberId: id })) ?? [];
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
      await lifecycle.deactivateMember({ memberId: id, salonId });
      return view(await find(salonId, id));
    },

    async reactivate({ salonId, id }) {
      await lifecycle.reactivateMember({ memberId: id, salonId });
      return view(await find(salonId, id));
    },
  };
};
