import { ERROR_CODES } from '../../constants/errorCodes';
import {
  PERMISSIONS,
  type Language,
  type MemberRole,
  type Permission,
} from '../../constants/enums';
import type { MemberRaw } from '../../models/member.model';
import type { OtpProvider } from '../../providers';
import type {
  InstallationsRepository,
  MembersRepository,
} from '../../repositories/identity.repository';
import type { CountriesRepository } from '../../repositories/locations.repository';
import type { Entity } from '../../utils/database/plain';
import { ForbiddenError, NotFoundError, UnauthorizedError } from '../../utils/errors';
import type { OtpGate } from '../otp/otpGate.service';
import type { SettingsService } from '../settings';
import type { DeviceInput } from './customerAuth.service';
import { createPhoneVerifier, type PhoneInput } from './phoneVerifier';
import type { RefreshTokenService } from './refreshTokens.service';
import { createSessionTokens, type TokenPair } from './sessionTokens';

/** What the merchant app caches after sign-in (Merchant PRD §5); permissions refresh from the server. */
export interface MemberProfile {
  readonly id: string;
  readonly salonId: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly phone: string;
  readonly role: MemberRole;
  /** The OWNER always has every permission; others get what the owner granted. */
  readonly permissions: readonly Permission[];
  readonly providesServices: boolean;
  readonly photoKey?: string;
}

export interface MerchantSession extends TokenPair {
  readonly member: MemberProfile;
}

export interface MerchantAuthService {
  /** Before the OTP is sent (M02): is this number an active member's? */
  checkPhone(input: { phone: PhoneInput }): Promise<void>;
  login(input: {
    phone: PhoneInput;
    idToken: string;
    device: DeviceInput;
    language: Language;
  }): Promise<MerchantSession>;
  refresh(input: { refreshToken: string }): Promise<MerchantSession>;
  logout(input: { refreshToken: string }): Promise<void>;
}

export interface MerchantAuthDeps {
  readonly members: MembersRepository;
  readonly installations: InstallationsRepository;
  readonly countries: CountriesRepository;
  readonly otp: OtpProvider;
  readonly otpGate: OtpGate;
  readonly refreshTokens: RefreshTokenService;
  readonly settings: Pick<SettingsService, 'get'>;
  readonly accessSecret: string;
  readonly now?: () => Date;
}

export const toMemberProfile = (member: Entity<MemberRaw>): MemberProfile => ({
  id: member.id,
  salonId: member.salonId,
  firstName: member.firstName,
  lastName: member.lastName,
  phone: member.phone,
  role: member.role,
  permissions: member.role === 'OWNER' ? PERMISSIONS : member.permissions,
  providesServices: member.providesServices,
  ...(member.photoKey === undefined ? {} : { photoKey: member.photoKey }),
});

const notLinked = (): NotFoundError =>
  new NotFoundError({ code: ERROR_CODES.PHONE_NOT_REGISTERED });
const inactive = (): ForbiddenError => new ForbiddenError({ code: ERROR_CODES.MEMBER_INACTIVE });

/**
 * Merchant member sign-in (Merchant PRD §4.4). A member is added by the salon owner, so there is no
 * self-registration here: an unknown number gets `PHONE_NOT_REGISTERED` and the app offers to apply
 * with a new salon (SRV-041). The platform JWT carries only the member and scope; role,
 * permissions and salon are loaded from the database (so a change applies at once) and returned
 * in the profile for the app to cache.
 */
export const createMerchantAuthService = (deps: MerchantAuthDeps): MerchantAuthService => {
  const { members, installations, countries, otp, otpGate, refreshTokens } = deps;
  const now = deps.now ?? ((): Date => new Date());
  const phones = createPhoneVerifier({ countries, otp, otpGate });
  const tokens = createSessionTokens({
    refreshTokens,
    settings: deps.settings,
    accessSecret: deps.accessSecret,
    now,
  });

  /** The active member behind a number; unknown and deactivated members get their own errors. */
  const activeMember = async (e164: string): Promise<Entity<MemberRaw>> => {
    const member = await members.findByPhone(e164);
    if (member === null) throw notLinked();
    if (!member.active) throw inactive();
    return member;
  };

  return {
    async checkPhone({ phone }) {
      await activeMember((await phones.resolve(phone)).e164);
    },

    async login({ phone: input, idToken, device, language }) {
      const phone = await phones.resolve(input);
      await phones.verify(phone, idToken, 'LOGIN');
      const member = await activeMember(phone.e164);
      await installations.linkMember(member.id, { ...device, language }, now());
      await otpGate.reset(phone.e164);
      const pair = await tokens.open('MEMBER', member.id, device.installationId);
      return { ...pair, member: toMemberProfile(member) };
    },

    async refresh({ refreshToken }) {
      const next = await tokens.rotate(refreshToken);
      const member = await members.findById(next.subjectId);
      if (member === null || !member.active) {
        // Removed or deactivated by the owner since the session began: end every session.
        await refreshTokens.revokeAll('MEMBER', next.subjectId);
        throw member === null ? new UnauthorizedError() : inactive();
      }
      return { ...next.tokens, member: toMemberProfile(member) };
    },

    async logout({ refreshToken }) {
      const ended = await refreshTokens.revoke(refreshToken);
      if (ended?.installationId !== undefined) {
        await installations.unlinkMember(ended.installationId);
      }
    },
  };
};
