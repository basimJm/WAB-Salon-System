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
    version: '1.0.0',
    sha256: '55fa55df8a6c044d6de591140b6b79c9b916d1d67fb740b1eb841e54b401fad8',
    note: 'Baseline (SRV-111): health, readiness, payment webhook.',
  },
  customer: {
    version: '1.2.0',
    sha256: '9a6ea813fb84460a92b247bf3c6a46193f1ec696ff2a89e00a88a9d34a4227c5',
    note: 'CUS-086: booking draft response has branch {id, name, locationText} (SRV-128b)',
  },
  merchant: {
    version: '1.2.0',
    sha256: '4589684966d2eb0db164dc87f08a859e5121ad682aafedd0f2294443a9e07c74',
    note: 'MER-021/MER-063: GET /merchant/v1/bookings/{id}/eligible-staff (SRV-128a)',
  },
  admin: {
    version: '1.3.0',
    sha256: 'ec28ab65c006a6cb4a1f938c5976e24ba4187fbca75538a7588a94831cc1759f',
    note: 'ADM-047: export kinds CUSTOMERS and SALONS (filters of their screens); PDF exports render Arabic',
  },
};
