import type { DocName } from '../constants/docs';

/**
 * Published contract per namespace (SRV-111): `openapi.info.version`, the fingerprint of the
 * generated document it belongs to, and the client impact of the last change. Edited only by
 * `npm run contract:bump -- <name> "<client impact>"`; `tests/contractGuard.test.ts` fails when
 * a generated document no longer matches its fingerprint.
 */
export const CONTRACT_VERSIONS: Readonly<
  Record<DocName, { readonly version: string; readonly sha256: string; readonly note: string }>
> = {
  common: {
    version: '1.1.0',
    sha256: '7f3f181e90340aeb41ef1ababd6a3407d56eb639f4108c02b1a88b9b66a18d5e',
    note: 'SRV-153: error code OTP_DELIVERY_FAILED added to the error enum only. Clients: none',
  },
  customer: {
    version: '1.4.0',
    sha256: '4abb4f99c0dce22ed67f35b77c3b63b66b7f67042741e9b8cd2d128644e5bb6a',
    note: 'SRV-153 BREAKING (WhatsApp OTP): POST /auth/otp/request now sends the code (answer adds expiresInSeconds; 422 OTP_DELIVERY_FAILED); NEW POST /auth/otp/verify {phone,purpose,code} -> {otpToken,expiresInSeconds}; POST /auth/otp/wrong-attempt REMOVED; idToken -> otpToken in POST /auth/login, /auth/register, /auth/change-phone, /bookings/drafts/{id}/verify-otp; error code OTP_DELIVERY_FAILED. Client: CUS-089 (./gradlew apiSync)',
  },
  merchant: {
    version: '1.5.0',
    sha256: '75d06730cc35c53a631eaea8627bf6f4617517df5695fd7c770274ddfedd1b4f',
    note: 'SRV-153 BREAKING (WhatsApp OTP): POST /auth/otp/request now sends the code (answer adds expiresInSeconds; 422 OTP_DELIVERY_FAILED); NEW POST /auth/otp/verify {phone,purpose,code} -> {otpToken,expiresInSeconds}; POST /auth/otp/wrong-attempt REMOVED; idToken -> otpToken in POST /auth/login, /auth/change-phone, /salon/applications, PUT /salon/payout-details; error code OTP_DELIVERY_FAILED. Client: MER-070 (./gradlew apiSync)',
  },
  admin: {
    version: '1.6.0',
    sha256: '2da64228c42baab53c5dcdb70564c1f1661bff6e30ee82a55d00c976f2c36d07',
    note: 'SRV-153: error code OTP_DELIVERY_FAILED added to the error enum only (no admin operation changed). Client: ADM none required (npm run api:sync optional)',
  },
};
