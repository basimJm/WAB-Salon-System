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
    version: '1.8.0',
    sha256: 'da97b25ac02a3e89ede41ef683c8fb1a71ebe4bd370552f0bad755ff5df75a64',
    note: 'SRV-175: businessType filter on search/filters (+ recommended per type, salons first), businessType + audience on every card, home salonServices/clinicServices/recommendedSalons/recommendedClinics/nearestSalons/nearestClinics (old keys kept as salon aliases), salon details ?gender= for guests (404 when hidden); favorites follow the audience rule. Client: CUS-098',
  },
  merchant: {
    version: '1.7.0',
    sha256: '8330b4d0d02d3402bcf7f2c8294eb627733c6e9da5b310a71dc23b469485ee94',
    note: 'SRV-174 BREAKING: application salon {businessType, audience}; profile/catalog gender -> businessType + audience; BUSINESS_TYPE_MISMATCH / BRIDE_NOT_ALLOWED on services. Client: MER-080',
  },
  admin: {
    version: '1.9.0',
    sha256: '30e74ceb21378da1a6029d46a8b5b1b7c8bb71078264897713b754af1ba2ffba',
    note: 'SRV-174 BREAKING: salons/applications/catalog/placements/search gender -> businessType + audience (filters too); PATCH /salons/{id}/gender -> /salons/{id}/audience; placements reorder by businessType; SALONS export businessType/audience. Client: ADM-109',
  },
};
