import type { AccountLifecycleService } from '../auth/accountLifecycle.service';
import { ERROR_CODES } from '../../constants/errorCodes';
import type { MemberRaw } from '../../models/member.model';
import type { StorageProvider } from '../../providers/storage';
import type { MembersRepository } from '../../repositories/identity.repository';
import { isDuplicateKeyError } from '../../utils/database/errors';
import type { Entity } from '../../utils/database/plain';
import { ConflictError, ExternalServiceError, UnauthorizedError } from '../../utils/errors';
import { toMemberProfile, type MemberProfile } from '../auth/merchantAuth.service';
import type { PhoneInput, PhoneVerifier } from '../auth/phoneVerifier';
import type { OtpGate } from '../otp/otpGate.service';
import type { FileSlots } from '../files/fileSlots.service';
import { applySlotPatch } from '../files/slotPatch';
import { SLOT_KEYS } from '../../constants/uploads';

/** "My account" (M25): the session profile plus what the screen shows. */
export interface MemberSelfView extends MemberProfile {
  readonly photoUrl: string | null;
  readonly pushEnabled: boolean;
}

/** `photoKey: null` removes the photo. */
export interface MemberSelfPatch {
  readonly firstName?: string | undefined;
  readonly lastName?: string | undefined;
  readonly photoKey?: string | null | undefined;
}

export interface MemberSelfService {
  get(memberId: string): Promise<MemberSelfView>;
  update(input: { memberId: string; patch: MemberSelfPatch }): Promise<MemberSelfView>;
  /** The new number must be confirmed by OTP sent to it (purpose CHANGE_PHONE). */
  changePhone(input: {
    memberId: string;
    phone: PhoneInput;
    otpToken: string;
  }): Promise<MemberSelfView>;
  /**
   * A non-owner removes their own access (M25 "Delete my account"): deactivated, sessions ended.
   * The owner gets 422 LAST_OWNER — their path is the salon deletion request.
   */
  leave(input: { memberId: string; salonId: string }): Promise<void>;
}

export interface MemberSelfDeps {
  readonly members: Pick<MembersRepository, 'findById' | 'findByPhone' | 'patch'>;
  readonly storage: Pick<StorageProvider, 'getPublicUrl'>;
  /** The member photo is a file slot (SRV-181): replaced in place, removed through the outbox. */
  readonly files: Pick<FileSlots, 'replace' | 'remove'>;
  readonly phones: PhoneVerifier;
  readonly otpGate: Pick<OtpGate, 'reset'>;
  readonly lifecycle?: Pick<AccountLifecycleService, 'deactivateMember'>;
}

const phoneTaken = (): ConflictError =>
  new ConflictError({ code: ERROR_CODES.PHONE_ALREADY_REGISTERED });

/**
 * A member's own account (SRV-129): name and photo, phone change with OTP. Role, permissions and
 * branch stay with the owner (team management); a deactivated member is treated as signed out.
 */
export const createMemberSelfService = (deps: MemberSelfDeps): MemberSelfService => {
  const { members, storage, files, phones, otpGate } = deps;

  const view = (m: Entity<MemberRaw>): MemberSelfView => ({
    ...toMemberProfile(m),
    photoUrl: m.photoKey === undefined ? null : storage.getPublicUrl(m.photoKey),
    pushEnabled: m.pushEnabled !== false,
  });

  const active = async (memberId: string): Promise<Entity<MemberRaw>> => {
    const member = await members.findById(memberId);
    if (member?.active !== true) throw new UnauthorizedError();
    return member;
  };

  const saved = (updated: Entity<MemberRaw> | null): MemberSelfView => {
    if (updated === null) throw new UnauthorizedError();
    return view(updated);
  };

  return {
    get: async (memberId) => view(await active(memberId)),

    async update({ memberId, patch }) {
      const member = await active(memberId);
      const salonId = String(member.salonId);
      await applySlotPatch(files, {
        target: {
          purpose: 'MEMBER_PHOTO',
          key: SLOT_KEYS.memberPhoto(salonId, member.id),
          ownerType: 'MEMBER',
          ownerId: member.id,
          salonId,
        },
        current: member.photoKey,
        value: patch.photoKey,
        field: 'body.photoKey',
        // Only a photo this member uploaded may become their photo.
        accept: (upload) => upload.ownerType === 'MEMBER' && upload.ownerId === member.id,
        write: async (ref) => {
          await members.patch(
            member.id,
            ref === null ? { set: {}, unset: ['photoKey'] } : { set: { photoKey: ref } },
          );
        },
      });
      const set: Record<string, unknown> = {};
      if (patch.firstName !== undefined) set['firstName'] = patch.firstName;
      if (patch.lastName !== undefined) set['lastName'] = patch.lastName;
      return saved(await members.patch(member.id, { set }));
    },

    async changePhone({ memberId, phone: input, otpToken }) {
      const member = await active(memberId);
      const phone = await phones.resolve(input);
      await phones.verify(phone, otpToken, 'CHANGE_PHONE');
      const holder = await members.findByPhone(phone.e164);
      if (holder !== null && holder.id !== member.id) throw phoneTaken();
      let updated: Entity<MemberRaw> | null;
      try {
        updated = await members.patch(member.id, { set: { phone: phone.e164 } });
      } catch (error) {
        if (isDuplicateKeyError(error)) throw phoneTaken();
        throw error;
      }
      await otpGate.reset(phone.e164);
      return saved(updated);
    },

    async leave({ memberId, salonId }) {
      if (deps.lifecycle === undefined) throw new ExternalServiceError({ unavailable: true });
      await deps.lifecycle.deactivateMember({ memberId, salonId });
    },
  };
};
