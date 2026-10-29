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
    version: '1.11.0',
    sha256: '53d42822410bfb03fabc202d1694624e29f7f7d6ee26471598623a310a8446e5',
    note: 'SRV-177: alert kind SALON_AUDIENCE_WIDENED (additive; ADM-110 shows it)',
  },
};
