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
    version: '1.6.0',
    sha256: '72384a511ae44eccbd9c6d4eb0a589315ce48ffcf856d467e3a32b009de82eda',
    note: 'SRV-172: optional branchId query on salon details (that branch\'s staff/services/place; 404 BRANCH_NOT_FOUND); staff sheet = member branch services. Additive; customer app needs no change (it filters by branchId client-side), apiSync at the next customer task.',
  },
  merchant: {
    version: '1.6.0',
    sha256: '6c69d083bfdf698c9ce611460ec428e514ece5bacee98c420e42e30513e2d359',
    note: 'SRV-170 (additive + semantic): booking rows/details add rejection, staff {firstName, photoUrl}, money.paidAtSalon; money.remaining is 0 once the booking is final (was the stored at-salon part). No merchant row needed: decoders tolerate new fields; ./gradlew apiSync at the next merchant task',
  },
  admin: {
    version: '1.8.0',
    sha256: '182e94e9ba7796693505c5617f02fab203ce66ba7d7a92ac0b60be2a33930c9b',
    note: 'SRV-171 (additive): GET /admin/v1/salons/{id}/branches takes page/pageSize (default 25) and answers meta {page, pageSize, total}; booking q also matches partial references. Admin panel already tolerates both; npm run api:sync at the next admin task',
  },
};
