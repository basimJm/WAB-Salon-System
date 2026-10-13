import {
  IBAN_COUNTRY_LENGTHS,
  IBAN_MAX_LENGTH,
  IBAN_MIN_LENGTH,
  IBAN_PATTERN,
} from '../constants/iban';

/** Upper-case without spaces or dashes: how an IBAN is stored and compared. */
export const normalizeIban = (value: string): string => value.replace(/[\s-]/g, '').toUpperCase();

/** ISO 13616 check: the characters, the country's length when known, and the mod-97 checksum. */
export const isValidIban = (value: string): boolean => {
  const iban = normalizeIban(value);
  if (iban.length < IBAN_MIN_LENGTH || iban.length > IBAN_MAX_LENGTH) return false;
  if (!IBAN_PATTERN.test(iban)) return false;
  const expected = IBAN_COUNTRY_LENGTHS[iban.slice(0, 2)];
  if (expected !== undefined && expected !== iban.length) return false;
  // Move the first four characters to the end, turn letters into numbers (A=10..Z=35) and reduce
  // piece by piece so the number never exceeds the safe integer range.
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const char of rearranged) {
    const digits = String(Number.parseInt(char, 36));
    for (const digit of digits) remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
};
