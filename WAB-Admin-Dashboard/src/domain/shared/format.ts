import type { Language } from '../../constants/i18n';
import {
  BUSINESS_TIME_ZONE,
  INTL_LOCALES,
  JOD_DECIMAL_PLACES,
  JOD_STRING_PATTERN,
} from '../../constants/kernel';
import { parseInstant } from './time';

const ARABIC_INDIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const DIGIT = /[0-9]/g;

/** Rewrites ASCII digits to the digits of `language` ("numerals follow the language"). */
export const localizeDigits = (text: string, language: Language): string =>
  language === 'ar'
    ? text.replace(DIGIT, (digit) => ARABIC_INDIC_DIGITS.charAt(Number(digit)))
    : text;

export const formatNumber = (value: number, language: Language): string =>
  new Intl.NumberFormat(INTL_LOCALES[language]).format(value);

function decimalSeparator(language: Language): string {
  const part = new Intl.NumberFormat(INTL_LOCALES[language], { minimumFractionDigits: 1 })
    .formatToParts(1.1)
    .find((p) => p.type === 'decimal');
  return part?.value ?? '.';
}

/**
 * Display text for a JOD amount string, e.g. `1234.5` -> "1,234.500" / "١٬٢٣٤٫٥٠٠".
 * Works on the string (BigInt for the whole part), so no amount ever passes through a float.
 * The currency name is added by the caller from the locale files.
 */
export function formatJodAmount(amount: string, language: Language): string {
  const match = JOD_STRING_PATTERN.exec(amount);
  if (!match) throw new RangeError('not a valid JOD amount');
  const [, sign = '', whole = '0', fraction = ''] = match;
  const wholeText = new Intl.NumberFormat(INTL_LOCALES[language]).format(BigInt(whole));
  const fractionText = localizeDigits(fraction.padEnd(JOD_DECIMAL_PLACES, '0'), language);
  const isZero = /^0*$/.test(whole + fraction);
  const signText = sign && !isZero ? '-' : '';
  return `${signText}${wholeText}${decimalSeparator(language)}${fractionText}`;
}

type DateStyle = 'date' | 'longDate' | 'time' | 'dateTime';
const OPTIONS: Readonly<Record<DateStyle, Intl.DateTimeFormatOptions>> = {
  date: { year: 'numeric', month: 'short', day: 'numeric' },
  longDate: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
  time: { hour: 'numeric', minute: '2-digit', hour12: true },
  dateTime: {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  },
};

/** Formats a UTC instant in Asia/Amman: 12-hour clock, language digits. `input` is an ISO string or a Date. */
export function formatInstant(
  input: string | Date,
  language: Language,
  style: DateStyle = 'dateTime',
  timeZone: string = BUSINESS_TIME_ZONE,
): string {
  const instant = typeof input === 'string' ? parseInstant(input) : input;
  return new Intl.DateTimeFormat(INTL_LOCALES[language], { ...OPTIONS[style], timeZone }).format(
    instant,
  );
}

/** `0.256` -> "26%" (Arabic digits in Arabic); rounds to a whole percent. */
export const formatPercent = (ratio: number, language: Language): string =>
  `${formatNumber(Math.round(ratio * 100), language)}%`;
