import { ERROR_CODES } from '../../constants/errorCodes';
import type { Gender, Language, Platform } from '../../constants/enums';
import type { PhoneCheckPurpose } from '../../constants/customerAuth';
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
import { isDuplicateKeyError } from '../../utils/database/errors';
import { toObjectId } from '../../utils/database/ids';
import type { Entity } from '../../utils/database/plain';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../../utils/errors';
import type { CustomerRaw } from '../../models/customer.model';
import type { OtpGate } from '../otp/otpGate.service';
import type { SettingsService } from '../settings';
import { createPhoneVerifier, invalidField, type PhoneInput } from './phoneVerifier';
import type { RefreshTokenService } from './refreshTokens.service';
import { createSessionTokens, type TokenPair } from './sessionTokens';

export type { PhoneInput } from './phoneVerifier';

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
  /** `otpToken` from `POST /auth/otp/verify` (purpose REGISTER). */
  readonly otpToken: string;
  readonly device: DeviceInput;
  readonly language: Language;
}

export interface LoginInput {
  readonly phone: PhoneInput;
  readonly otpToken: string;
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

export interface CustomerSession extends TokenPair {
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
    otpToken: string;
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
  /**
   * Business-made bookings of this number join the account on sign-up and phone change (§5.20);
   * a failure is logged and never blocks the account.
   */
  readonly claims?: BookingClaims;
}

/** Links business-made bookings made for a phone number to the customer who now owns it. */
export interface BookingClaims {
  claim(e164: string, customerId: string): Promise<void>;
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

const accountBlocked = (): ForbiddenError =>
  new ForbiddenError({ code: ERROR_CODES.ACCOUNT_BLOCKED });
const phoneTaken = (): ConflictError =>
  new ConflictError({ code: ERROR_CODES.PHONE_ALREADY_REGISTERED });
const phoneUnknown = (): NotFoundError =>
  new NotFoundError({ code: ERROR_CODES.PHONE_NOT_REGISTERED });

/**
 * Customer register, login, refresh, logout and phone change (Customer PRD S11, S12, S13, S22).
 * The phone is only trusted after the OTP provider confirms the `otpToken` for that exact
 * number; the platform limits (SRV-027) gate every verification attempt.
 */
export const createCustomerAuthService = (deps: CustomerAuthDeps): CustomerAuthService => {
  const { customers, installations, countries, cities, areas, otp, otpGate, refreshTokens } = deps;
  const now = deps.now ?? ((): Date => new Date());

  const phones = createPhoneVerifier({ countries, otp, otpGate });
  const resolvePhone = phones.resolve.bind(phones);
  const verifyOwnership = phones.verify.bind(phones);
  const tokens = createSessionTokens({
    refreshTokens,
    settings: deps.settings,
    accessSecret: deps.accessSecret,
    now,
  });

  const openSession = async (
    customer: Entity<CustomerRaw>,
    device: DeviceInput,
    language: Language,
  ): Promise<CustomerSession> => {
    await installations.linkCustomer(customer.id, { ...device, language }, now());
    const pair = await tokens.open('CUSTOMER', customer.id, device.installationId);
    return { ...pair, customer: toProfile(customer) };
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

      await verifyOwnership(phone, input.otpToken, 'REGISTER');
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
      await deps.claims?.claim(phone.e164, created.id);
      return openSession(created, input.device, input.language);
    },

    async login(input) {
      const phone = await resolvePhone(input.phone);
      await verifyOwnership(phone, input.otpToken, 'LOGIN');
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
      const next = await tokens.rotate(refreshToken);
      const customer = await customers.findById(next.subjectId);
      if (customer === null || customer.status !== 'ACTIVE') {
        // The account was blocked or removed since the session began: end every session.
        await refreshTokens.revokeAll('CUSTOMER', next.subjectId);
        throw customer?.status === 'BLOCKED' ? accountBlocked() : new UnauthorizedError();
      }
      return { ...next.tokens, customer: toProfile(customer) };
    },

    async logout({ refreshToken }) {
      const ended = await refreshTokens.revoke(refreshToken);
      if (ended?.installationId !== undefined) {
        await installations.unlinkCustomer(ended.installationId);
      }
    },

    async changePhone({ customerId, phone: input, otpToken }) {
      const customer = await customers.findById(customerId);
      if (customer === null || customer.status !== 'ACTIVE') throw new UnauthorizedError();
      const phone = await resolvePhone(input);
      await verifyOwnership(phone, otpToken, 'CHANGE_PHONE');
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
      await deps.claims?.claim(phone.e164, updated.id);
      return toProfile(updated);
    },
  };
};
