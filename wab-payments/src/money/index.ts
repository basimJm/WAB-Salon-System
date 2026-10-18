import {
  CURRENCIES,
  MAX_AMOUNT_FILS,
  type CurrencyCode,
  type GatewayAmountDecimals,
} from '../constants/defaults';
import { ERROR_CODES } from '../constants/codes';
import { PaymentSdkError, validationError } from '../errors';

const DECIMAL_PATTERN = /^(\d{1,12})(?:\.(\d{1,3}))?$/;

export const isAmountFils = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0 && value <= MAX_AMOUNT_FILS;

export const assertAmountFils = (value: unknown, label = 'amountFils'): number => {
  if (!isAmountFils(value)) throw validationError(`${label} must be a positive integer (fils)`);
  return value;
};

/**
 * Integer minor units -> the decimal string a gateway expects (`12500` -> `"12.500"`). When the
 * gateway wants fewer decimals than the currency has, the amount must be exactly representable:
 * rounding money silently is never acceptable.
 */
export const filsToDecimal = (
  fils: number,
  currency: CurrencyCode,
  decimals: GatewayAmountDecimals = CURRENCIES[currency].decimals,
): string => {
  assertAmountFils(fils);
  const { decimals: native, minorPerMajor } = CURRENCIES[currency];
  const drop = 10 ** (native - decimals);
  if (decimals > native || fils % drop !== 0) {
    throw validationError(`amount is not representable with ${String(decimals)} decimals`);
  }
  const major = Math.floor(fils / minorPerMajor);
  const fraction = String((fils % minorPerMajor) / drop).padStart(decimals, '0');
  return `${String(major)}.${fraction}`;
};

/** A gateway amount string -> integer minor units; anything unexpected is a malformed response. */
export const decimalToFils = (text: unknown, currency: CurrencyCode): number => {
  const match = typeof text === 'string' ? DECIMAL_PATTERN.exec(text) : null;
  if (match === null) {
    throw new PaymentSdkError(ERROR_CODES.MALFORMED_RESPONSE, 'gateway amount is not a decimal');
  }
  const { decimals, minorPerMajor } = CURRENCIES[currency];
  const [, major = '0', fraction = ''] = match;
  const fils = Number(major) * minorPerMajor + Number(fraction.padEnd(decimals, '0'));
  if (!Number.isSafeInteger(fils)) {
    throw new PaymentSdkError(ERROR_CODES.MALFORMED_RESPONSE, 'gateway amount is out of range');
  }
  return fils;
};
