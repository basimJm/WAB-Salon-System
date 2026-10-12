import { ERROR_CODES, errorMessageKey } from '../../constants/errorCodes';
import type { Gender, Language, Platform } from '../../constants/enums';
import { FIELD_INVALID_CODE, type PhoneCheckPurpose } from '../../constants/customerAuth';
import type { OtpPurpose } from '../../constants/providers';
import type { OtpProvider } from '../../providers';
import type {
  CustomersRepository,
  InstallationsRepository,
} from '../../repositories/identity.repository';
import type {
  AreasRepository,
  CitiesRepository,
  CountriesRepository,
} from '../../repositories/locations.repository';
import { signAccessToken } from '../../utils/auth/accessToken';
import { isDuplicateKeyError } from '../../utils/database/errors';
import { toObjectId } from '../../utils/database/ids';
import type { Entity } from '../../utils/database/plain';
import {
  type ErrorDetail,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../../utils/errors';
import type { CustomerRaw } from '../../models/customer.model';
import type { OtpGate } from '../otp/otpGate.service';
import type { SettingsService } from '../settings';
import type { RefreshTokenService } from './refreshTokens.service';

export interface PhoneInput {
  /** ISO country code of the selected country (`JO`). */
  readonly countryCode: string;
  /** National number, digits only, as the country's regex expects it. */
  readonly number: string;
}

export interface DeviceInput {
  readonly installationId: string;
  readonly platform: Platform;
  readonly appVersion: string;
  readonly osVersion?: string | undefined;
  readonly deviceModel?: string | undefined;
  readonly fcmToken?: string | undefined;
}

export interface RegisterInput {
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly gender: Gender;
  readonly cityId: string;
  readonly areaId: string;
  readonly phone: PhoneInput;
  /** Firebase ID token obtained after the user typed the SMS code. */
  readonly idToken: string;
  readonly device: DeviceInput;
  readonly language: Language;
}

export interface LoginInput {
  readonly phone: PhoneInput;
  readonly idToken: string;
  readonly device: DeviceInput;
  readonly language: Language;
}

export interface CustomerProfile {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly gender: Gender;
  readonly phone: { countryCode: string; dialCode: string; number: string; e164: string };
  readonly cityId: string;
  readonly areaId: string;
  readonly language: Language;
  readonly pushEnabled: boolean;
  readonly avatarKey?: string;
}

export interface CustomerSession {
  readonly accessToken: string;
  readonly accessTokenExpiresAt: Date;
  readonly refreshToken: string;
  readonly refreshTokenExpiresAt: Date;
  readonly customer: CustomerProfile;
}

export interface CustomerAuthService {
  /** Before the OTP is sent (S11/S12): is the number usable for this mode? */
  checkPhone(input: { phone: PhoneInput; purpose: PhoneCheckPurpose }): Promise<void>;
  register(input: RegisterInput): Promise<CustomerSession>;
  login(input: LoginInput): Promise<CustomerSession>;
  refresh(input: { refreshToken: string }): Promise<CustomerSession>;
  logout(input: { refreshToken: string }): Promise<void>;
  changePhone(input: {
    customerId: string;
    phone: PhoneInput;
    idToken: string;
  }): Promise<CustomerProfile>;
}

export interface CustomerAuthDeps {
  readonly customers: CustomersRepository;
  readonly installations: InstallationsRepository;
  readonly countries: CountriesRepository;
  readonly cities: CitiesRepository;
  readonly areas: AreasRepository;
  readonly otp: OtpProvider;
  readonly otpGate: OtpGate;
  readonly refreshTokens: RefreshTokenService;
  readonly settings: Pick<SettingsService, 'get'>;
  readonly accessSecret: string;
  readonly now?: () => Date;
}

interface ResolvedPhone {
  readonly countryCode: string;
  readonly dialCode: string;
  readonly number: string;
  readonly e164: string;
}

const toProfile = (customer: Entity<CustomerRaw>): CustomerProfile => ({
  id: customer.id,
  firstName: customer.firstName,
  lastName: customer.lastName,
  email: customer.email,
  gender: customer.gender,
  phone: { ...customer.phone },
  cityId: customer.cityId,
  areaId: customer.areaId,
  language: customer.language,
  pushEnabled: customer.pushEnabled,
  ...(customer.avatarKey === undefined ? {} : { avatarKey: customer.avatarKey }),
});

const invalidField = (field: string): ErrorDetail => ({
  field,
  code: FIELD_INVALID_CODE,
  messageKey: errorMessageKey(ERROR_CODES.VALIDATION_ERROR),
});

const accountBlocked = (): ForbiddenError =>
  new ForbiddenError({ code: ERROR_CODES.ACCOUNT_BLOCKED });
const phoneTaken = (): ConflictError =>
  new ConflictError({ code: ERROR_CODES.PHONE_ALREADY_REGISTERED });
const phoneUnknown = (): NotFoundError =>
  new NotFoundError({ code: ERROR_CODES.PHONE_NOT_REGISTERED });

/**
 * Customer register, login, refresh, logout and phone change (Customer PRD S11, S12, S13, S22).
 * The phone is only trusted after the OTP provider confirms the Firebase ID token for that exact
 * number; the platform limits (SRV-027) gate every verification attempt.
 */
export const createCustomerAuthService = (deps: CustomerAuthDeps): CustomerAuthService => {
  const { customers, installations, countries, cities, areas, otp, otpGate, refreshTokens } = deps;
  const now = deps.now ?? ((): Date => new Date());

  /** Country lookup and the country's phone regex; the full number is dial code + national number. */
  const resolvePhone = async (phone: PhoneInput, field = 'body.phone'): Promise<ResolvedPhone> => {
    const country = await countries.findOne({ code: phone.countryCode, active: true });
    if (country === null) {
      throw new ValidationError({
        details: [invalidField(`${field}.countryCode`)],
      });
    }
    if (!new RegExp(country.phoneRegex).test(phone.number)) {
      throw new ValidationError({
        details: [invalidField(`${field}.number`)],
      });
    }
    return {
      countryCode: country.code,
      dialCode: country.dialCode,
      number: phone.number,
      e164: `${country.dialCode}${phone.number}`,
    };
  };

  /** Blocked numbers cannot try again; then the provider must confirm this very number. */
  const verifyOwnership = async (
    phone: ResolvedPhone,
    idToken: string,
    purpose: OtpPurpose,
  ): Promise<void> => {
    await otpGate.assertNotBlocked(phone.e164);
    const result = await otp.verify({ proof: idToken, expectedPhone: phone.e164, purpose });
    if (result.outcome === 'VERIFIED') return;
    throw new UnauthorizedError({
      code: result.outcome === 'EXPIRED' ? ERROR_CODES.OTP_EXPIRED : ERROR_CODES.OTP_INVALID,
    });
  };

  const openSession = async (
    customer: Entity<CustomerRaw>,
    device: DeviceInput,
    language: Language,
  ): Promise<CustomerSession> => {
    const at = now();
    const [accessTtlSec, refreshTtlDays] = await Promise.all([
      settings('auth.accessTokenTtlSec'),
      settings('auth.refreshTokenTtlDays'),
    ]);
    await installations.linkCustomer(customer.id, { ...device, language }, at);
    const refresh = await refreshTokens.issue({
      subjectType: 'CUSTOMER',
      subjectId: customer.id,
      installationId: device.installationId,
      ttlDays: refreshTtlDays,
    });
    return buildSession(customer, refresh, accessTtlSec, at);
  };

  const settings = (key: 'auth.accessTokenTtlSec' | 'auth.refreshTokenTtlDays'): Promise<number> =>
    deps.settings.get(key);

  const buildSession = (
    customer: Entity<CustomerRaw>,
    refresh: { token: string; expiresAt: Date },
    accessTtlSec: number,
    at: Date,
  ): CustomerSession => {
    const access = signAccessToken({
      secret: deps.accessSecret,
      subjectType: 'CUSTOMER',
      subjectId: customer.id,
      ttlSec: accessTtlSec,
      now: at,
    });
    return {
      accessToken: access.token,
      accessTokenExpiresAt: access.expiresAt,
      refreshToken: refresh.token,
      refreshTokenExpiresAt: refresh.expiresAt,
      customer: toProfile(customer),
    };
  };

  return {
    async checkPhone({ phone, purpose }) {
      const resolved = await resolvePhone(phone);
      const customer = await customers.findByPhone(resolved.e164);
      if (purpose === 'REGISTER') {
        if (customer !== null) throw phoneTaken();
        return;
      }
      if (customer === null || customer.status === 'DELETED') throw phoneUnknown();
      if (customer.status === 'BLOCKED') throw accountBlocked();
    },

    async register(input) {
      const phone = await resolvePhone(input.phone);
      const [city, area] = await Promise.all([
        cities.findOne({ _id: input.cityId, active: true }),
        areas.findOne({ _id: input.areaId, active: true }),
      ]);
      const details = [
        ...(city === null ? [invalidField('body.cityId')] : []),
        ...(area === null || area.cityId !== input.cityId ? [invalidField('body.areaId')] : []),
      ];
      if (details.length > 0) throw new ValidationError({ details });

      await verifyOwnership(phone, input.idToken, 'REGISTER');
      if ((await customers.findByPhone(phone.e164)) !== null) throw phoneTaken();
      let created: Entity<CustomerRaw>;
      try {
        created = await customers.create({
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          gender: input.gender,
          phone,
          cityId: toObjectId(input.cityId),
          areaId: toObjectId(input.areaId),
          language: input.language,
          pushEnabled: true,
          status: 'ACTIVE',
          lastActiveAt: now(),
        });
      } catch (error) {
        // Two sign-ups for one number at once: the unique index decides.
        if (isDuplicateKeyError(error)) throw phoneTaken();
        throw error;
      }
      await otpGate.reset(phone.e164);
      return openSession(created, input.device, input.language);
    },

    async login(input) {
      const phone = await resolvePhone(input.phone);
      await verifyOwnership(phone, input.idToken, 'LOGIN');
      const found = await customers.findByPhone(phone.e164);
      if (found === null || found.status === 'DELETED') throw phoneUnknown();
      if (found.status === 'BLOCKED') throw accountBlocked();
      // Logging in during the deletion grace period restores the account (PRD S11).
      const customer =
        found.status === 'DELETION_PENDING'
          ? await customers.restoreFromDeletion(found.id, now())
          : await customers.updateById(found.id, { lastActiveAt: now() });
      if (customer === null) throw phoneUnknown();
      await otpGate.reset(phone.e164);
      return openSession(customer, input.device, input.language);
    },

    async refresh({ refreshToken }) {
      const [refreshTtlDays, accessTtlSec] = await Promise.all([
        settings('auth.refreshTokenTtlDays'),
        settings('auth.accessTokenTtlSec'),
      ]);
      const next = await refreshTokens.rotate({ token: refreshToken, ttlDays: refreshTtlDays });
      const customer = await customers.findById(next.subjectId);
      if (customer === null || customer.status !== 'ACTIVE') {
        // The account was blocked or removed since the session began: end every session.
        await refreshTokens.revokeAll('CUSTOMER', next.subjectId);
        throw customer?.status === 'BLOCKED' ? accountBlocked() : new UnauthorizedError();
      }
      return buildSession(customer, next, accessTtlSec, now());
    },

    async logout({ refreshToken }) {
      const ended = await refreshTokens.revoke(refreshToken);
      if (ended?.installationId !== undefined) {
        await installations.unlinkCustomer(ended.installationId);
      }
    },

    async changePhone({ customerId, phone: input, idToken }) {
      const customer = await customers.findById(customerId);
      if (customer === null || customer.status !== 'ACTIVE') throw new UnauthorizedError();
      const phone = await resolvePhone(input);
      await verifyOwnership(phone, idToken, 'CHANGE_PHONE');
      const owner = await customers.findByPhone(phone.e164);
      if (owner !== null && owner.id !== customer.id) throw phoneTaken();
      let updated: Entity<CustomerRaw> | null;
      try {
        updated = await customers.updateById(customer.id, { phone });
      } catch (error) {
        if (isDuplicateKeyError(error)) throw phoneTaken();
        throw error;
      }
      if (updated === null) throw new UnauthorizedError();
      await otpGate.reset(phone.e164);
      return toProfile(updated);
    },
  };
};
