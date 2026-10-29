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
    version: '1.2.0',
    sha256: 'f69a4075d02f7f10f6b00ef1ead65a665c2547e739b959307667d7a763667e17',
    note: 'SRV-174: error codes BUSINESS_TYPE_MISMATCH, AUDIENCE_CHANGE_NOT_ALLOWED, BRIDE_NOT_ALLOWED; schemas BusinessType/Audience (no client row)',
  },
  customer: {
    version: '1.9.0',
    sha256: '96bae9f6fde6056b18303397858711b4f736663c7048ffdc28c7a0b928d31511',
    note: 'SRV-176: booking person gender (optional; mixed persons at BOTH salons and clinics, GENDER_MISMATCH at men\'s/women\'s salons; bride sent as MALE = GENDER_MISMATCH), availability person gender, draft 404 for a business the customer may not see, bookings ?businessType= filter, rows businessType + salonAudience, detail persons gender. Client: CUS-099',
  },
  merchant: {
    version: '1.8.0',
    sha256: 'ee4f92324e6e8e08950df99660a336af892fecfc2f2ae4a6f54761ed78c484d4',
    note: 'SRV-176: booking rows businessType + salonAudience, detail persons gender (additive, no client row)',
  },
  admin: {
    version: '1.10.0',
    sha256: 'ad26beaad47e7dc388700172e38e6ac072bc2e92b198be21f62b4c31960071f0',
    note: 'SRV-176: booking rows businessType + salonAudience, detail persons gender (additive; admin filter in SRV-178)',
  },
};
