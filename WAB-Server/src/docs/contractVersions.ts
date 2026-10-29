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
    version: '1.10.0',
    sha256: '165d6924157ccd7178184be5775480626a5effae53d84aeddce50bd08c6fdbb7',
    note: 'SRV-177: upload purpose enum gains MEDICAL_LICENSE (merchant-only purpose; no client change)',
  },
  merchant: {
    version: '1.9.0',
    sha256: 'b616a55ad461714e21471fed7dc3aaedeb23c68be45a9e476f048269a21d181e',
    note: 'SRV-177: application medicalLicenseKeys (required for CLINIC; guest license presign takes purpose MEDICAL_LICENSE), PATCH /salon/audience (owner widens MALE/FEMALE -> BOTH; else 422 AUDIENCE_CHANGE_NOT_ALLOWED), notification salon.audience_widened. Client: MER-080, MER-081',
  },
  admin: {
    version: '1.12.0',
    sha256: '67581175ea2080f4ad2e9aaad72b5b36c3e9c1ef400151ecaed7af52e2620e94',
    note: 'SRV-178: businessType filter on applications, bookings (+ BOOKINGS export), reviews, catalog requests (salons/catalog/placements since SRV-174); application detail medicalLicenseUrls (signed). Client: ADM-109, ADM-110',
  },
};
