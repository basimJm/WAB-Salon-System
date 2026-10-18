import { LOCALE_TAGS, type Language } from '../../constants/i18n';

const formatters = new Map<string, Intl.DateTimeFormat>();

/** `12/10/2026, 11:00 am` / `١٢‏/١٠‏/٢٠٢٦ ١١:٠٠ ص`: 12-hour clock in the salon's time zone, numerals of the language. */
export const formatDateTime = (instant: Date, timeZone: string, language: Language): string => {
  const cacheKey = `${language}|${timeZone}`;
  let formatter = formatters.get(cacheKey);
  if (formatter === undefined) {
    formatter = new Intl.DateTimeFormat(LOCALE_TAGS[language], {
      timeZone,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    formatters.set(cacheKey, formatter);
  }
  return formatter.format(instant);
};
