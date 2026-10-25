import { ERROR_CODES } from '../../constants/errorCodes';
import type { MemberRaw } from '../../models/member.model';
import type { StorageProvider } from '../../providers/storage';
import type { MembersRepository } from '../../repositories/identity.repository';
import { isDuplicateKeyError } from '../../utils/database/errors';
import type { Entity } from '../../utils/database/plain';
import { ConflictError, UnauthorizedError } from '../../utils/errors';
import { toMemberProfile, type MemberProfile } from '../auth/merchantAuth.service';
import type { PhoneInput, PhoneVerifier } from '../auth/phoneVerifier';
import type { OtpGate } from '../otp/otpGate.service';
import type { UploadVerifier } from '../uploads/uploads.service';

/** "My account" (M25): the session profile plus what the screen shows. */
export interface MemberSelfView extends MemberProfile {
  readonly photoUrl: string | null;
  /** `null` for the owner (every branch). */
  readonly branchId: string | null;
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
    idToken: string;
  }): Promise<MemberSelfView>;
}

export interface MemberSelfDeps {
  readonly members: Pick<MembersRepository, 'findById' | 'findByPhone' | 'patch'>;
  readonly storage: Pick<StorageProvider, 'getPublicUrl'>;
  readonly uploads: Pick<UploadVerifier, 'assertConfirmed'>;
  readonly phones: PhoneVerifier;
  readonly otpGate: Pick<OtpGate, 'reset'>;
}

const phoneTaken = (): ConflictError =>
  new ConflictError({ code: ERROR_CODES.PHONE_ALREADY_REGISTERED });

/**
 * A member's own account (SRV-129): name and photo, phone change with OTP. Role, permissions and
 * branch stay with the owner (team management); a deactivated member is treated as signed out.
 */
export const createMemberSelfService = (deps: MemberSelfDeps): MemberSelfService => {
  const { members, storage, uploads, phones, otpGate } = deps;

  const view = (m: Entity<MemberRaw>): MemberSelfView => ({
    ...toMemberProfile(m),
    photoUrl: m.photoKey === undefined ? null : storage.getPublicUrl(m.photoKey),
    branchId: m.role === 'OWNER' ? null : (m.branchId ?? null),
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
      if (typeof patch.photoKey === 'string') {
        // Only a photo this member uploaded may become their photo.
        await uploads.assertConfirmed({
          keys: [patch.photoKey],
          purpose: 'MEMBER_PHOTO',
          field: 'body.photoKey',
          accept: (upload) => upload.ownerType === 'MEMBER' && upload.ownerId === member.id,
        });
      }
      const set: Record<string, unknown> = {};
      if (patch.firstName !== undefined) set['firstName'] = patch.firstName;
      if (patch.lastName !== undefined) set['lastName'] = patch.lastName;
      if (typeof patch.photoKey === 'string') set['photoKey'] = patch.photoKey;
      return saved(
        await members.patch(member.id, { set, unset: patch.photoKey === null ? ['photoKey'] : [] }),
      );
    },

    async changePhone({ memberId, phone: input, idToken }) {
      const member = await active(memberId);
      const phone = await phones.resolve(input);
      await phones.verify(phone, idToken, 'CHANGE_PHONE');
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
  };
};
