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
    version: '1.3.0',
    sha256: 'acac02271d18380376c0daa56ec56e491d154a3d44b9e914c518c8ebc59074e3',
    note: 'SRV-151: id patterns without the /i flag; availability others[].start/end and draft persons[].start are required non-null ISO date-time strings. Re-sync: customer ./gradlew apiSync (CUS-060).',
  },
  merchant: {
    version: '1.4.0',
    sha256: '8769412644440bc722cc5a16c0263a4e7aebf50ad1e275f32075a7011c2dafb7',
    note: 'SRV-151: id patterns without the /i flag; POST /salon/applications member = full MemberProfile. Re-sync: merchant ./gradlew apiSync (MER-054).',
  },
  admin: {
    version: '1.5.0',
    sha256: 'd61c51ed4386c716bc5e99ebd3eb313d169fa74c18f595181161d930920de1a1',
    note: 'SRV-151: id patterns without the /i flag (S6); the panel can drop its objectId re-validation. Re-sync: admin npm run api:sync (ADM-079).',
  },
};
