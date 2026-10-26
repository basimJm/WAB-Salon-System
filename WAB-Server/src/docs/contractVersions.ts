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
    version: '1.5.0',
    sha256: '3af28abc1d51b48cce4112db9c932a5da1c5f42c7bd97d6b4f331968f3d2cf53',
    note: 'SRV-170 (additive + semantic): CUS-093 uses services[].brideOnly on GET /customer/v1/salons/{salonId} (+ staff sheet services), bookings list/detail staff[] and persons[].staff {id,name,firstName,photoUrl} (first name only), list-row rejection, money.remaining = 0 once final + new money.paidAtSalon; ./gradlew apiSync',
  },
  merchant: {
    version: '1.6.0',
    sha256: '6c69d083bfdf698c9ce611460ec428e514ece5bacee98c420e42e30513e2d359',
    note: 'SRV-170 (additive + semantic): booking rows/details add rejection, staff {firstName, photoUrl}, money.paidAtSalon; money.remaining is 0 once the booking is final (was the stored at-salon part). No merchant row needed: decoders tolerate new fields; ./gradlew apiSync at the next merchant task',
  },
  admin: {
    version: '1.7.0',
    sha256: '24e6e85ef138fd2b219584f04e833db4ae116e549c4e87d4d4251adcd3f767e4',
    note: 'SRV-170 (additive + semantic): booking rows/details add rejection, staff {firstName, photoUrl}, money.paidAtSalon; money.remaining is 0 once the booking is final. No admin row needed; npm run api:sync at the next admin task',
  },
};
