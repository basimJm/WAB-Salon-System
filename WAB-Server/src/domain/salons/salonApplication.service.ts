import { ERROR_CODES } from '../../constants/errorCodes';
import type { Gender, Language } from '../../constants/enums';
import type { SalonState } from '../../constants/salon';
import type { OtpProvider } from '../../providers';
import type {
  InstallationsRepository,
  MembersRepository,
} from '../../repositories/identity.repository';
import type {
  AreasRepository,
  CitiesRepository,
  CountriesRepository,
} from '../../repositories/locations.repository';
import type { SalonRaw } from '../../models/salon.model';
import type { Entity } from '../../utils/database/plain';
import type { SalonsRepository } from '../../repositories/salons.repository';
import { isDuplicateKeyError } from '../../utils/database/errors';
import { toObjectId } from '../../utils/database/ids';
import {
  BusinessRuleError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '../../utils/errors';
import type { DeviceInput } from '../auth/customerAuth.service';
import { toMemberProfile, type MemberProfile } from '../auth/merchantAuth.service';
import type { OtpGate } from '../otp/otpGate.service';
import { assertPlace } from '../locations/place';
import { createPhoneVerifier, type PhoneInput } from '../auth/phoneVerifier';
import type { RefreshTokenService } from '../auth/refreshTokens.service';
import { createSessionTokens, type TokenPair } from '../auth/sessionTokens';
import type { SettingsService } from '../settings';
import type { UploadVerifier } from '../uploads/uploads.service';

export interface SalonDraft {
  readonly name: string;
  readonly gender: Gender;
  readonly description?: string | undefined;
  readonly cityId?: string | undefined;
  readonly areaId?: string | undefined;
}

export interface ApplyInput {
  readonly phone: PhoneInput;
  readonly idToken: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly salon: SalonDraft;
  readonly documentKeys: readonly string[];
  readonly device: DeviceInput;
  readonly language: Language;
}

export interface ResubmitInput {
  readonly memberId: string;
  readonly name?: string | undefined;
  readonly gender?: Gender | undefined;
  readonly description?: string | undefined;
  readonly documentKeys?: readonly string[] | undefined;
}

export interface ApplicationStatus {
  readonly salonId: string;
  readonly state: SalonState;
  readonly submittedAt: Date;
  readonly resubmissionCount: number;
  readonly rejectionReason?: string;
}

export interface AppliedSession extends TokenPair {
  readonly member: MemberProfile;
  readonly application: ApplicationStatus;
}

export interface SalonApplicationService {
  /** M05: a new owner and salon from a verified phone; the salon waits for admin review. */
  apply(input: ApplyInput): Promise<AppliedSession>;
  /** M06: the owner sees whether the application is pending, rejected (with the reason) or approved. */
  status(input: { memberId: string }): Promise<ApplicationStatus>;
  /** M06: after a rejection the owner fixes the application and sends it again. */
  resubmit(input: ResubmitInput): Promise<ApplicationStatus>;
}

export interface SalonApplicationDeps {
  readonly salons: SalonsRepository;
  readonly members: MembersRepository;
  readonly installations: InstallationsRepository;
  readonly countries: CountriesRepository;
  readonly cities: Pick<CitiesRepository, 'findOne'>;
  readonly areas: Pick<AreasRepository, 'findOne'>;
  readonly otp: OtpProvider;
  readonly otpGate: OtpGate;
  readonly refreshTokens: RefreshTokenService;
  readonly settings: Pick<SettingsService, 'get'>;
  /** When set, license documents must be files the server issued and confirmed. */
  readonly uploads?: UploadVerifier;
  readonly accessSecret: string;
  readonly now?: () => Date;
}

const phoneTaken = (): ConflictError =>
  new ConflictError({ code: ERROR_CODES.PHONE_ALREADY_REGISTERED });

export const createSalonApplicationService = (
  deps: SalonApplicationDeps,
): SalonApplicationService => {
  const { salons, members, installations, cities, areas, otp, otpGate, refreshTokens } = deps;
  const now = deps.now ?? ((): Date => new Date());
  const phones = createPhoneVerifier({ countries: deps.countries, otp, otpGate });
  const tokens = createSessionTokens({
    refreshTokens,
    settings: deps.settings,
    accessSecret: deps.accessSecret,
    now,
  });

  const toStatus = (salon: {
    id: string;
    state: SalonState;
    application: {
      submittedAt: Date;
      resubmissionCount: number;
      rejectionReason?: string | undefined;
    };
  }): ApplicationStatus => ({
    salonId: salon.id,
    state: salon.state,
    submittedAt: salon.application.submittedAt,
    resubmissionCount: salon.application.resubmissionCount,
    ...(salon.application.rejectionReason === undefined
      ? {}
      : { rejectionReason: salon.application.rejectionReason }),
  });

  /** The signed-in owner and their salon; other members cannot touch the application. */
  const ownerSalon = async (memberId: string): Promise<{ salonId: string }> => {
    const member = await members.findById(memberId);
    if (member === null || !member.active) throw new UnauthorizedError();
    if (member.role !== 'OWNER') throw new ForbiddenError({ code: ERROR_CODES.OWNER_REQUIRED });
    return { salonId: member.salonId };
  };

  const loadSalon = async (salonId: string): Promise<Entity<SalonRaw>> => {
    const salon = await salons.findById(salonId);
    if (salon === null) throw new NotFoundError({ code: ERROR_CODES.SALON_NOT_FOUND });
    return salon;
  };

  return {
    async apply(input) {
      const phone = await phones.resolve(input.phone);
      await assertPlace({ cities, areas }, 'body.salon', input.salon.cityId, input.salon.areaId);
      await deps.uploads?.assertConfirmed({
        keys: input.documentKeys,
        purpose: 'LICENSE_DOCUMENT',
        field: 'body.documentKeys',
        accept: (upload) => upload.ownerType === 'GUEST',
      });
      await phones.verify(phone, input.idToken, 'REGISTER');
      if ((await members.findByPhone(phone.e164)) !== null) throw phoneTaken();

      const at = now();
      const salon = await salons.create({
        name: input.salon.name,
        gender: input.salon.gender,
        state: 'APPLICATION_PENDING',
        ...(input.salon.description === undefined ? {} : { description: input.salon.description }),
        ...(input.salon.cityId === undefined ? {} : { cityId: toObjectId(input.salon.cityId) }),
        ...(input.salon.areaId === undefined ? {} : { areaId: toObjectId(input.salon.areaId) }),
        searchText: input.salon.name,
        application: {
          submittedAt: at,
          resubmissionCount: 0,
          documentKeys: [...input.documentKeys],
        },
      });
      let owner;
      try {
        owner = await members.create({
          salonId: toObjectId(salon.id),
          firstName: input.firstName,
          lastName: input.lastName,
          phone: phone.e164,
          role: 'OWNER',
          permissions: [],
          active: true,
          providesServices: false,
        });
      } catch (error) {
        // No owner, no salon: two applications for one number at once, the unique index decides.
        await salons.discard(salon.id);
        if (isDuplicateKeyError(error)) throw phoneTaken();
        throw error;
      }
      await installations.linkMember(owner.id, { ...input.device, language: input.language }, at);
      await otpGate.reset(phone.e164);
      const pair = await tokens.open('MEMBER', owner.id, input.device.installationId);
      return { ...pair, member: toMemberProfile(owner), application: toStatus(salon) };
    },

    async status({ memberId }) {
      const { salonId } = await ownerSalon(memberId);
      return toStatus(await loadSalon(salonId));
    },

    async resubmit({ memberId, ...changes }) {
      const { salonId } = await ownerSalon(memberId);
      const salon = await loadSalon(salonId);
      if (salon.state !== 'APPLICATION_REJECTED') {
        throw new BusinessRuleError({ code: ERROR_CODES.INVALID_TRANSITION });
      }
      if (changes.documentKeys !== undefined) {
        await deps.uploads?.assertConfirmed({
          keys: changes.documentKeys,
          purpose: 'LICENSE_DOCUMENT',
          field: 'body.documentKeys',
          // Documents already on the application stay valid; new ones must come from this salon.
          allow: salon.application.documentKeys,
          accept: (upload) => upload.salonId === salonId,
        });
      }
      const updated = await salons.updateById(salonId, {
        ...(changes.name === undefined ? {} : { name: changes.name, searchText: changes.name }),
        ...(changes.gender === undefined ? {} : { gender: changes.gender }),
        ...(changes.description === undefined ? {} : { description: changes.description }),
        state: 'APPLICATION_PENDING',
        application: {
          submittedAt: now(),
          resubmissionCount: salon.application.resubmissionCount + 1,
          documentKeys: [...(changes.documentKeys ?? salon.application.documentKeys)],
        },
      });
      if (updated === null) throw new NotFoundError({ code: ERROR_CODES.SALON_NOT_FOUND });
      return toStatus(updated);
    },
  };
};
