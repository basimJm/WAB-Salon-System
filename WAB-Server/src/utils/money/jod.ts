import { FILS_PER_JOD, JOD_DECIMAL_PLACES, JOD_STRING_PATTERN } from '../../constants/money';
import { ValidationError } from '../errors';
import { assertFils } from './fils';

export interface ParseJodOptions {
  /** Ledger adjustments are signed; prices and payments are not. */
  readonly allowNegative?: boolean;
}

const FILS_PER_JOD_BIG = BigInt(FILS_PER_JOD);
const MAX_FILS_BIG = BigInt(Number.MAX_SAFE_INTEGER);

/** Exact conversion of a JOD string; `undefined` when it is not a valid amount. */
const toFils = (text: unknown, allowNegative: boolean): number | undefined => {
  if (typeof text !== 'string') return undefined;
  const match = JOD_STRING_PATTERN.exec(text);
  if (match === null) return undefined;
  const [, sign = '', whole = '', fraction = ''] = match;
  if (sign !== '' && !allowNegative) return undefined;
  const magnitude =
    BigInt(whole) * FILS_PER_JOD_BIG + BigInt(fraction.padEnd(JOD_DECIMAL_PLACES, '0'));
  if (magnitude > MAX_FILS_BIG) return undefined;
  // "-0.000" is zero, not negative zero.
  return sign === '' || magnitude === 0n ? Number(magnitude) : -Number(magnitude);
};

/** Is `value` a valid JOD amount string? Use it in request schemas before `parseJod`. */
export const isJodString = (
  value: unknown,
  { allowNegative = false }: ParseJodOptions = {},
): value is string => toFils(value, allowNegative) !== undefined;

/** `"12.5"` → `12500` fils. Invalid input is a client error (400 `VALIDATION_ERROR`). */
export const parseJod = (text: string, { allowNegative = false }: ParseJodOptions = {}): number => {
  const fils = toFils(text, allowNegative);
  if (fils === undefined) throw new ValidationError();
  return fils;
};

/** `12500` fils → `"12.500"`: the API format, always 3 decimals. Integer arithmetic only. */
export const formatJod = (fils: number): string => {
  assertFils(fils);
  const magnitude = Math.abs(fils);
  // Remainder first: (magnitude - fraction) / 1000 divides a multiple of 1000, so it is exact;
  // magnitude / 1000 would be a rounded float.
  const fraction = magnitude % FILS_PER_JOD;
  const whole = (magnitude - fraction) / FILS_PER_JOD;
  const sign = fils < 0 ? '-' : '';
  return `${sign}${String(whole)}.${String(fraction).padStart(JOD_DECIMAL_PLACES, '0')}`;
};
