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
    version: '1.14.0',
    sha256: '95d990f4f45e7105f39c40d5f3dfc6bd28d0ae14f5b4acb910183c2fc45add45',
    note: 'CUS-110: GET /customer/v1/salons gains optional openNow boolean filter',
  },
  merchant: {
    version: '1.13.0',
    sha256: '7057da79969f1412306411a23d31a39dba22aa2806bf1c285db46b7cb6db36d0',
    note: 'SRV-186: bookings tab TO_CLOSE; the booking\'s own staff may complete / no-show (route accepts BOOKINGS_VIEW_OWN); push booking.close_reminder / close_overdue with actions COMPLETED,NO_SHOW (MER-086)',
  },
  admin: {
    version: '1.16.0',
    sha256: '8098cfaed0332e93ae5bd9b4a3c4e17eb201993d42911088a2686802898a4a20',
    note: 'SRV-186: bookings tab TO_CLOSE; alert kind BOOKING_CLOSE_OVERDUE (entity BOOKING); settings booking.closeReminderIntervalMinutes / closeOverdueAlertHours (ADM-112)',
  },
};
