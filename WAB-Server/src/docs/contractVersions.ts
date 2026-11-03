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
    version: '1.13.0',
    sha256: '92ca7c8a190dcd5f094a11f337818cb8f370644d6a6ff12d32d5e42679785e41',
    note: 'SRV-185: booking rows source (MERCHANT = Booked by the business) + createdBy (always null for customers) (CUS-104)',
  },
  merchant: {
    version: '1.12.0',
    sha256: 'cc057e5987f2782234a036bee595b88dc63aff00093cf9b93c42827d0194f75f',
    note: 'SRV-185: POST /bookings (book for a customer), GET /customers/lookup, permission BOOKINGS_CREATE, upload BOOKING_REFERENCE for members, rows source/createdBy, customer.id nullable (MER-085)',
  },
  admin: {
    version: '1.15.0',
    sha256: '62c368a024c93c07aa7d49ffe7f122e1b1a8650be173e5417229efe1db975363',
    note: 'SRV-185: bookings source filter + export column, rows source/createdBy, customer.id nullable, search booking customerId nullable, permission BOOKINGS_CREATE (ADM-112)',
  },
};
