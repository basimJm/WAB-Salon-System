import { ERROR_CODES, errorMessageKey } from '../../constants/errorCodes';
import { FIELD_INVALID_CODE } from '../../constants/customerAuth';
import type { OtpPurpose } from '../../constants/providers';
import type { OtpProvider } from '../../providers';
import type { CountriesRepository } from '../../repositories/locations.repository';
import { UnauthorizedError, ValidationError, type ErrorDetail } from '../../utils/errors';
import type { OtpGate } from '../otp/otpGate.service';

/** A phone number as the client sends it: the selected country and the national digits. */
export interface PhoneInput {
  /** ISO country code of the selected country (`JO`). */
  readonly countryCode: string;
  /** National number, digits only, as the country's regex expects it. */
  readonly number: string;
}

export interface ResolvedPhone {
  readonly countryCode: string;
  readonly dialCode: string;
  readonly number: string;
  readonly e164: string;
}

export interface PhoneVerifier {
  /** Country lookup and the country's phone regex; the full number is dial code + national number. */
  resolve(phone: PhoneInput, field?: string): Promise<ResolvedPhone>;
  /** Blocked numbers cannot try again; then the provider must confirm this very number. */
  verify(phone: ResolvedPhone, otpToken: string, purpose: OtpPurpose): Promise<void>;
}

export interface PhoneVerifierDeps {
  readonly countries: CountriesRepository;
  readonly otp: OtpProvider;
  readonly otpGate: OtpGate;
}

export const invalidField = (field: string): ErrorDetail => ({
  field,
  code: FIELD_INVALID_CODE,
  messageKey: errorMessageKey(ERROR_CODES.VALIDATION_ERROR),
});

/** Phone handling shared by the customer and merchant sign-in flows (Customer PRD S13, Merchant PRD M03). */
export const createPhoneVerifier = ({
  countries,
  otp,
  otpGate,
}: PhoneVerifierDeps): PhoneVerifier => ({
  async resolve(phone, field = 'body.phone') {
    const country = await countries.findOne({ code: phone.countryCode, active: true });
    if (country === null) {
      throw new ValidationError({ details: [invalidField(`${field}.countryCode`)] });
    }
    if (!new RegExp(country.phoneRegex).test(phone.number)) {
      throw new ValidationError({ details: [invalidField(`${field}.number`)] });
    }
    return {
      countryCode: country.code,
      dialCode: country.dialCode,
      number: phone.number,
      e164: `${country.dialCode}${phone.number}`,
    };
  },

  async verify(phone, otpToken, purpose) {
    await otpGate.assertNotBlocked(phone.e164);
    const result = await otp.verify({ proof: otpToken, expectedPhone: phone.e164, purpose });
    if (result.outcome === 'VERIFIED') return;
    throw new UnauthorizedError({
      code: result.outcome === 'EXPIRED' ? ERROR_CODES.OTP_EXPIRED : ERROR_CODES.OTP_INVALID,
    });
  },
});
