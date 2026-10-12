import { FULL_PERCENT } from '../../constants/money';

/**
 * Money is an integer number of fils (1 JOD = 1000 fils), never a float. Negative values are valid:
 * ledger entries are signed (BUSINESS_DOMAIN.md §3 ledger).
 */
export const isFils = (value: unknown): value is number => Number.isSafeInteger(value);

export function assertFils(value: unknown, name = 'amount'): asserts value is number {
  if (!isFils(value)) throw new TypeError(`${name} must be an integer number of fils`);
}

const assertSafeResult = (value: number, name: string): number => {
  if (!isFils(value)) throw new RangeError(`${name} is outside the safe range of fils`);
  return value;
};

/** Sum of fils; every element and the running total must stay a safe integer. */
export const sumFils = (values: readonly number[]): number => {
  let total = 0;
  for (const value of values) {
    assertFils(value);
    total = assertSafeResult(total + value, 'total');
  }
  return total;
};

/**
 * `amount × numerator / denominator` rounded half-up to 1 fils (BUSINESS_DOMAIN.md §5.5). Exact
 * (BigInt, no float), and ties go away from zero so a negative amount rounds like its positive twin.
 */
export const mulDivRound = (amount: number, numerator: number, denominator: number): number => {
  assertFils(amount);
  if (!isFils(numerator) || numerator < 0) {
    throw new RangeError('numerator must be a non-negative integer');
  }
  if (!isFils(denominator) || denominator < 1) {
    throw new RangeError('denominator must be a positive integer');
  }
  const product = BigInt(amount) * BigInt(numerator);
  const negative = product < 0n;
  const magnitude = negative ? -product : product;
  const divisor = BigInt(denominator);
  const quotient = magnitude / divisor;
  const remainder = magnitude % divisor;
  // At least half of the divisor is left over → round up.
  const rounded = remainder >= divisor - remainder ? quotient + 1n : quotient;
  return assertSafeResult(Number(negative ? -rounded : rounded), 'result');
};

/**
 * `percent` % of `amount`, e.g. the deposit of a booking. Compute the other part by subtraction
 * (`total - deposit`), not as a second percentage, or two rounded halves can add up to 1 fils too much.
 */
export const percentOf = (amount: number, percent: number): number => {
  if (!Number.isInteger(percent) || percent < 0 || percent > FULL_PERCENT) {
    throw new RangeError(`percent must be a whole number from 0 to ${String(FULL_PERCENT)}`);
  }
  return mulDivRound(amount, percent, FULL_PERCENT);
};
