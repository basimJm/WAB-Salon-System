import type { DocName } from '../constants/docs';

/**
 * Published contract per namespace: `openapi.info.version`, the fingerprint of the generated
 * document it belongs to, and the client impact of the last change. Edited only by
 * `npm run contract:bump -- <name> "<client impact>"`; `tests/contractGuard.test.ts` fails when
 * a generated document no longer matches its fingerprint.
 */
export const CONTRACT_VERSIONS: Readonly<
  Record<DocName, { readonly version: string; readonly sha256: string; readonly note: string }>
> = {
  common: {
    version: '1.0.0',
    sha256: 'PENDING',
    note: 'Initial contract: health, readiness, payment webhook',
  },
  customer: {
    version: '1.0.0',
    sha256: 'PENDING',
    note: 'Initial contract: OTP, auth, profile, uploads, notifications, items',
  },
  merchant: {
    version: '1.0.0',
    sha256: 'PENDING',
    note: 'Initial contract: OTP, auth, me, team, uploads, notifications, items',
  },
  admin: {
    version: '1.0.0',
    sha256: 'PENDING',
    note: 'Initial contract: auth, settings, audit log, uploads, items',
  },
};
