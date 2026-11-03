import { ERROR_CODES, errorMessageKey } from '../../constants/errorCodes';
import type { Audience, BusinessType, Language } from '../../constants/enums';
import { AUDIENCE_ALL, audienceFor } from '../businessTypes/rules';

const CLINIC: BusinessType = 'CLINIC';
const MEDICAL_LICENSE_FIELD = 'body.medicalLicenseKeys';
/** A clinic applies with its medical license (§5.19). */
const medicalLicenseRequired = (): ValidationError =>
  new ValidationError({
    details: [
      {
        field: MEDICAL_LICENSE_FIELD,
        code: ERROR_CODES.VALIDATION_ERROR,
        messageKey: errorMessageKey(ERROR_CODES.VALIDATION_ERROR),
      },
    ],
  });
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
  ValidationError,
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
import type { StorageCleanup } from '../files/storageCleanup.service';
import { droppedKeys } from '../files/storedObjects';

export interface SalonDraft {
  readonly name: string;
  /** SALON or CLINIC; never changes afterwards (§5.19). */
  readonly businessType: BusinessType;
  /** Required for a SALON; a CLINIC is always BOTH (whatever is sent). */
  readonly audience?: Audience | undefined;
  readonly description?: string | undefined;
  readonly cityId?: string | undefined;
  readonly areaId?: string | undefined;
}

export interface ApplyInput {
  readonly phone: PhoneInput;
  readonly otpToken: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly salon: SalonDraft;
  readonly documentKeys: readonly string[];
  /** Required for a CLINIC (§5.19), ignored for a SALON. */
  readonly medicalLicenseKeys?: readonly string[] | undefined;
  readonly device: DeviceInput;
  readonly language: Language;
}

export interface ResubmitInput {
  readonly memberId: string;
  readonly name?: string | undefined;
  /** A SALON may correct its audience while the application is rejected; a CLINIC stays BOTH. */
  readonly audience?: Audience | undefined;
  readonly description?: string | undefined;
  readonly documentKeys?: readonly string[] | undefined;
  /** A CLINIC may replace its medical license documents. */
  readonly medicalLicenseKeys?: readonly string[] | undefined;
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
  /** Documents replaced on a resubmission are deleted through the outbox (SRV-182). */
  readonly cleanup?: Pick<StorageCleanup, 'enqueue'>;
  readonly accessSecret: string;
  readonly now?: () => Date;
  /** A new or resubmitted application (the admin panel's live list, `application.created`). */
  readonly onSubmitted?: (salon: Entity<SalonRaw>) => void;
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
      const clinic = input.salon.businessType === CLINIC;
      const medical = clinic ? [...(input.medicalLicenseKeys ?? [])] : [];
      if (clinic) {
        if (medical.length === 0) throw medicalLicenseRequired();
        await deps.uploads?.assertConfirmed({
          keys: medical,
          purpose: 'MEDICAL_LICENSE',
          field: MEDICAL_LICENSE_FIELD,
          accept: (upload) => upload.ownerType === 'GUEST',
        });
      }
      await phones.verify(phone, input.otpToken, 'REGISTER');
      if ((await members.findByPhone(phone.e164)) !== null) throw phoneTaken();

      const at = now();
      const salon = await salons.create({
        name: input.salon.name,
        businessType: input.salon.businessType,
        audience: audienceFor(input.salon.businessType, input.salon.audience ?? AUDIENCE_ALL),
        state: 'APPLICATION_PENDING',
        ...(input.salon.description === undefined ? {} : { description: input.salon.description }),
        ...(input.salon.cityId === undefined ? {} : { cityId: toObjectId(input.salon.cityId) }),
        ...(input.salon.areaId === undefined ? {} : { areaId: toObjectId(input.salon.areaId) }),
        searchText: input.salon.name,
        application: {
          submittedAt: at,
          resubmissionCount: 0,
          documentKeys: [...input.documentKeys],
          ...(clinic ? { medicalLicenseKeys: medical } : {}),
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
      deps.onSubmitted?.(salon);
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
      const clinic = salon.businessType === CLINIC;
      if (clinic && changes.medicalLicenseKeys !== undefined) {
        await deps.uploads?.assertConfirmed({
          keys: changes.medicalLicenseKeys,
          purpose: 'MEDICAL_LICENSE',
          field: MEDICAL_LICENSE_FIELD,
          allow: salon.application.medicalLicenseKeys ?? [],
          accept: (upload) => upload.salonId === salonId,
        });
      }
      const medical = clinic
        ? [...(changes.medicalLicenseKeys ?? salon.application.medicalLicenseKeys ?? [])]
        : undefined;
      if (medical?.length === 0) throw medicalLicenseRequired();
      const updated = await salons.updateById(salonId, {
        ...(changes.name === undefined ? {} : { name: changes.name, searchText: changes.name }),
        ...(changes.audience === undefined
          ? {}
          : { audience: audienceFor(salon.businessType, changes.audience) }),
        ...(changes.description === undefined ? {} : { description: changes.description }),
        state: 'APPLICATION_PENDING',
        application: {
          submittedAt: now(),
          resubmissionCount: salon.application.resubmissionCount + 1,
          documentKeys: [...(changes.documentKeys ?? salon.application.documentKeys)],
          ...(medical === undefined ? {} : { medicalLicenseKeys: medical }),
        },
      });
      if (updated === null) throw new NotFoundError({ code: ERROR_CODES.SALON_NOT_FOUND });
      const dropped = [
        ...droppedKeys(salon.application.documentKeys, updated.application.documentKeys),
        ...droppedKeys(
          salon.application.medicalLicenseKeys ?? [],
          updated.application.medicalLicenseKeys ?? [],
        ),
      ];
      if (dropped.length > 0) await deps.cleanup?.enqueue(dropped, 'FILE_REMOVED');
      deps.onSubmitted?.(updated);
      return toStatus(updated);
    },
  };
};
