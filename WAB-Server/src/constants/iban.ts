/** IBAN rules (SRV-090, Merchant PRD M22 "IBAN format validation"). */
export const IBAN_PATTERN = /^[A-Z]{2}\d{2}[A-Z0-9]+$/;
export const IBAN_MIN_LENGTH = 15;
export const IBAN_MAX_LENGTH = 34;
/** Jordan's IBAN is 30 characters; other countries are checked by pattern and checksum only. */
export const IBAN_COUNTRY_LENGTHS: Readonly<Record<string, number>> = { JO: 30 };
export const IBAN_LAST_DIGITS = 4;
