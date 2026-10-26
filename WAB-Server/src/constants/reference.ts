/** Booking reference number constants (SRV-021, BUSINESS_DOMAIN.md §3.4 `referenceNumber`, §12). */
export const REFERENCE_PREFIX = 'WAB-';
export const REFERENCE_CODE_LENGTH = 6;
/**
 * Crockford base32: 32 symbols without `I`, `L`, `O`, `U`. `0`/`1` stay because the decoder maps
 * the look-alikes `O` → `0` and `I`/`L` → `1`, so nobody can mistype a printed number.
 */
export const REFERENCE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
/** Look-alike letters people may type, and the symbol each stands for. */
export const REFERENCE_LOOKALIKES: Readonly<Record<string, string>> = {
  O: '0',
  I: '1',
  L: '1',
};
/** The field that holds the reference number, used to recognise its duplicate-key errors. */
export const REFERENCE_FIELD = 'referenceNumber';
/** 32^6 ≈ 1.07 billion numbers, so a retry is rare; a handful of attempts is plenty. */
export const REFERENCE_MAX_ATTEMPTS = 5;
/**
 * Booking search: the fewest code symbols that count as a partial reference (`BW1` finds
 * `WAB-BW1JEZ`). Shorter text would match too many bookings to be useful (SRV-171 S5).
 */
export const REFERENCE_SEARCH_MIN_SYMBOLS = 3;
export const BASE32_SYMBOL_MASK = 0b11111;
