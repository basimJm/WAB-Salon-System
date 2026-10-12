/**
 * Money constants (SRV-015). Amounts are integer fils; the API shows JOD as a decimal string with
 * 3 decimals (BUSINESS_DOMAIN.md, Conventions).
 */
export const JOD_DECIMAL_PLACES = 3;
export const FILS_PER_JOD = 1_000;

/** 100 % — the denominator of a percentage and its upper bound (`depositPercentage` is 1–100). */
export const FULL_PERCENT = 100;

/** Most whole-JOD digits that still fit a safe integer of fils (9,007,199,254,740 has 13). */
const MAX_WHOLE_DIGITS = String(Math.floor(Number.MAX_SAFE_INTEGER / FILS_PER_JOD)).length;

/**
 * `[-]whole[.fraction]`: ASCII digits only, no leading zeros, 1–3 decimals when there is a dot, and a
 * bounded length so a hostile string never reaches the BigInt conversion at full size.
 * Groups: sign, whole part, fraction.
 */
export const JOD_STRING_PATTERN = new RegExp(
  `^(-?)(0|[1-9][0-9]{0,${String(MAX_WHOLE_DIGITS - 1)}})(?:\\.([0-9]{1,${String(JOD_DECIMAL_PLACES)}}))?$`,
);
