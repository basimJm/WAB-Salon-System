import { FILS_PER_JOD, JOD_DECIMAL_PLACES, JOD_STRING_PATTERN } from '../../constants/kernel';
import type { Brand } from './brand';

/** A JOD amount exactly as the API sends it: a decimal string with 1-3 decimals. Never a float. */
export type JodString = Brand<string, 'JodString'>;

const FILS_PER_JOD_BIG = BigInt(FILS_PER_JOD);
const MAX_FILS_BIG = BigInt(Number.MAX_SAFE_INTEGER);

export interface ParseJodOptions {
  /** Ledger adjustments are signed; prices and payments are not. */
  readonly allowNegative?: boolean;
}

/** Exact conversion to integer fils, or `undefined` when `text` is not a valid amount. */
export function tryParseJod(
  text: unknown,
  { allowNegative = false }: ParseJodOptions = {},
): number | undefined {
  if (typeof text !== 'string') return undefined;
  const match = JOD_STRING_PATTERN.exec(text);
  if (match === null) return undefined;
  const [, sign = '', whole = '', fraction = ''] = match;
  if (sign !== '' && !allowNegative) return undefined;
  const magnitude =
    BigInt(whole) * FILS_PER_JOD_BIG + BigInt(fraction.padEnd(JOD_DECIMAL_PLACES, '0'));
  if (magnitude > MAX_FILS_BIG) return undefined;
  return sign === '' || magnitude === 0n ? Number(magnitude) : -Number(magnitude);
}

export const isJodString = (value: unknown, options?: ParseJodOptions): value is JodString =>
  tryParseJod(value, options) !== undefined;

/** `"12.5"` -> `12500`. Invalid input is a programmer/data error (the server validated it). */
export function jodToFils(text: string, options?: ParseJodOptions): number {
  const fils = tryParseJod(text, options);
  if (fils === undefined) throw new RangeError('not a valid JOD amount');
  return fils;
}

export const isFils = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value);

/** `12500` -> `"12.500"`: always 3 decimals, integer arithmetic only. */
export function filsToJod(fils: number): JodString {
  if (!isFils(fils)) throw new RangeError('fils must be a safe integer');
  const magnitude = Math.abs(fils);
  const fraction = magnitude % FILS_PER_JOD;
  const whole = (magnitude - fraction) / FILS_PER_JOD;
  const sign = fils < 0 ? '-' : '';
  return `${sign}${String(whole)}.${String(fraction).padStart(JOD_DECIMAL_PLACES, '0')}` as JodString;
}

/** Sums amounts without ever touching floating point. */
export function sumJod(values: readonly string[], options?: ParseJodOptions): JodString {
  const total = values.reduce((sum, value) => sum + jodToFils(value, options), 0);
  if (!isFils(total)) throw new RangeError('sum is out of range');
  return filsToJod(total);
}
