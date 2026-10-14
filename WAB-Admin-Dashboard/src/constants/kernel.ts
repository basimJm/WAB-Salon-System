import type { Language } from './i18n';

/** Business time zone: all admin dates and hours are shown in it (Admin PRD §2, BUSINESS_DOMAIN §1). */
export const BUSINESS_TIME_ZONE = 'Asia/Amman';

export const FILS_PER_JOD = 1_000;
export const JOD_DECIMAL_PLACES = 3;
/** Most whole-JOD digits whose fils still fit a safe integer. */
const MAX_WHOLE_DIGITS = String(Math.floor(Number.MAX_SAFE_INTEGER / FILS_PER_JOD)).length;
/** `[-]whole[.fraction]`: ASCII digits, no leading zeros, 1-3 decimals when there is a dot. Groups: sign, whole, fraction. */
export const JOD_STRING_PATTERN = new RegExp(
  `^(-?)(0|[1-9][0-9]{0,${String(MAX_WHOLE_DIGITS - 1)}})(?:\\.([0-9]{1,${String(JOD_DECIMAL_PLACES)}}))?$`,
);

/** Intl locales: Arabic UI uses Arabic-Indic digits, English uses Latin digits ("numerals follow the language"). */
export const INTL_LOCALES: Readonly<Record<Language, string>> = {
  ar: 'ar-JO-u-nu-arab-ca-gregory',
  en: 'en-GB-u-nu-latn-ca-gregory',
};

export const MS_PER_MINUTE = 60_000;
export const MINUTES_PER_DAY = 1_440;
/** `YYYY-MM-DD`: a calendar day with no time zone attached. */
export const LOCAL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
export const ISO_INSTANT_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;
