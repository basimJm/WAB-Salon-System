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
    version: '1.11.0',
    sha256: 'fb2c8aa0b0ceeee7d44e34d5c0fb0fa12223831f53521c7f8d20deb955479838',
    note: 'SRV-183: TATTOO business type; persons[].referenceImageKey on drafts, referenceImageUrl on booking details; upload purpose BOOKING_REFERENCE (CUS-104)',
  },
  merchant: {
    version: '1.11.0',
    sha256: '103548fe8ac1e4713d77cf6cf5668a116962aabf05980f33c917aaf2e459a667',
    note: 'SRV-183: TATTOO business type (application, catalog), referenceImageUrl on booking details (MER-084)',
  },
  admin: {
    version: '1.14.0',
    sha256: '5726401a9d80b597aa3d255b903b8878bd3b3980a9caff9bc2686951796cf99d',
    note: 'SRV-183: TATTOO business type in filters/catalog/placements, referenceImageUrl on booking details (ADM-111)',
  },
};
