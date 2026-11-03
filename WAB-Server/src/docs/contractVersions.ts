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
    version: '1.10.0',
    sha256: 'f938c86cd062b9b69ec66e8abd021e1f8b98216839280222e38234855029e392',
    note: 'Additive: single-image fields (coverKey, profileKey, photoKey) also accept the returned file reference key?v=n (SRV-182); no client change needed',
  },
  admin: {
    version: '1.13.0',
    sha256: '12f75204c3a159f2a604ebdb9f9b66d1c2ae1eb2f6156eed22d474d9d501c295',
    note: 'Additive: catalog imageKey, banner imageKey.ar/en, salon coverKey/profileKey also accept the returned file reference key?v=n (SRV-182); no client change needed',
  },
};
