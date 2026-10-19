/**
 * HyperPay / OPP result-code groups (regexes from the public OPP result-code reference, from
 * memory of the docs: UNVERIFIED against the live reference until a sandbox run). Order matters:
 * the first match wins. Unknown codes are never success.
 */
export const RESULT_CATEGORIES = [
  'SUCCESS',
  'REVIEW',
  'PENDING',
  'NO_PAYMENT',
  'CANCELLED',
  'UNCERTAIN',
  'AUTH',
  'THROTTLED',
  'NOT_FOUND',
  'INVALID_REQUEST',
  'COMMUNICATION',
  'SYSTEM',
  'REJECTED',
  'UNKNOWN',
] as const;
export type ResultCategory = (typeof RESULT_CATEGORIES)[number];

export const RESULT_RULES: readonly {
  readonly category: ResultCategory;
  readonly pattern: RegExp;
}[] = [
  { category: 'SUCCESS', pattern: /^(000\.000\.|000\.100\.1|000\.[36]|000\.400\.[1][12]0)/ },
  { category: 'REVIEW', pattern: /^(000\.400\.0[^3]|000\.400\.100)/ },
  { category: 'NO_PAYMENT', pattern: /^200\.300\.404/ },
  { category: 'PENDING', pattern: /^(000\.200|800\.400\.5|100\.400\.500)/ },
  { category: 'UNCERTAIN', pattern: /^100\.396\.104/ },
  { category: 'CANCELLED', pattern: /^100\.396\.(10[1236]|201)/ },
  { category: 'AUTH', pattern: /^800\.900\.(30[0-3]|399|40[01])/ },
  { category: 'THROTTLED', pattern: /^800\.120\.1/ },
  { category: 'NOT_FOUND', pattern: /^700\.400\.580/ },
  {
    category: 'INVALID_REQUEST',
    pattern:
      /^(200\.[123]|800\.900|100\.[53][07]|100\.[69]00\.500|100\.[678]00\.|700\.[1-5]00|300\.100\.100)/,
  },
  { category: 'COMMUNICATION', pattern: /^(900\.[1234]00|000\.400\.030)/ },
  { category: 'SYSTEM', pattern: /^(800\.[56]|999\.|600\.1|800\.800\.8)/ },
  { category: 'REJECTED', pattern: /^(000\.400\.|800\.|100\.|500\.|600\.)/ },
];

/** The only code that means a checkout was created. */
export const CHECKOUT_CREATED_PATTERN = /^000\.200\.100$/;
/** Refund request outcomes that mean the refund exceeds what was captured / cannot be refunded. */
export const REFUND_EXCEEDS_PATTERN = /^700\.400\.2/;
export const REFUND_NOT_CAPTURED_PATTERN = /^700\.400\.7/;
