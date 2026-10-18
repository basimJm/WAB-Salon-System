const formatters = new Map<string, Intl.DateTimeFormat>();

const formatterFor = (timeZone: string): Intl.DateTimeFormat => {
  const cached = formatters.get(timeZone);
  if (cached !== undefined) return cached;
  // The `en-CA` locale prints `YYYY-MM-DD`.
  const created = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  formatters.set(timeZone, created);
  return created;
};

/** Local calendar day `YYYY-MM-DD` of an instant in a time zone. */
export const dayKey = (instant: Date, timeZone: string): string =>
  formatterFor(timeZone).format(instant);

/** True when the runtime knows the IANA time zone. */
export const isValidTimeZone = (timeZone: string): boolean => {
  try {
    formatterFor(timeZone);
    return true;
  } catch {
    return false;
  }
};
