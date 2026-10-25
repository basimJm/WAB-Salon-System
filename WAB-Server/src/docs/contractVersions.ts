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
    version: '1.1.0',
    sha256: 'c2c4681b6941e89081906b3028eb232715b2d191ab1e161bcc9b760b90d46e4d',
    note: 'Baseline (SRV-111) after salon branches: search/home/details branches, branchId on availability, drafts, bookings, reviews; requestedAt on booking rows (CUS-082…087).',
  },
  merchant: {
    version: '1.1.0',
    sha256: 'ed3b6cb065372923f78be945ca0ae3b7b723ba33d9f0ae95461e4883df001cc9',
    note: 'Baseline (SRV-111) after salon branches and M07/M20/M21/M25 endpoints: branches CRUD, branch-scoped hours/services/bookings/finance, reviews, statistics, dashboard, /me, change-phone, push switch, leave, deletion request, conflict previews (MER-042/043/049/050, MER-061…066).',
  },
  admin: {
    version: '1.1.0',
    sha256: '36ad3c2e0858e2c49585dcb0996a64d1205cc0266602fd5a07fb1fcc2f4bd2ea',
    note: 'Baseline (SRV-111) after salon branches: branch CRUD, branch filters on bookings/reviews/members/finance/exports, salon edit per branch, staff move (ADM-088…091).',
  },
};
