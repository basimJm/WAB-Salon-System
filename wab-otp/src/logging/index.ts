import type { Fields, Logger } from '../ports';

const REDACTED = '[REDACTED]';
const SECRET_KEY = /proof|token|code|secret|password|credential|authorization|key/i;
const PHONE_VALUE = /\+\d{7,15}/g;
const MASK_VISIBLE_TAIL = 3;
const MAX_DEPTH = 4;

/** `+962791234567` -> `+*********567`: the last three digits only (ONF-01). */
export const maskPhone = (value: string): string =>
  value.replace(PHONE_VALUE, (match) => {
    const digits = match.slice(1);
    return `+${'*'.repeat(digits.length - MASK_VISIBLE_TAIL)}${digits.slice(-MASK_VISIBLE_TAIL)}`;
  });

const redactValue = (key: string, value: unknown, depth: number): unknown => {
  if (SECRET_KEY.test(key)) return REDACTED;
  if (typeof value === 'string') return maskPhone(value);
  if (typeof value !== 'object' || value === null) return value;
  if (depth >= MAX_DEPTH) return REDACTED;
  if (Array.isArray(value)) return value.map((item: unknown) => redactValue(key, item, depth + 1));
  return redactFields(value as Fields, depth + 1);
};

/** Returns a copy with secrets removed and phone numbers masked; the input is never changed. */
export const redactFields = (fields: Fields, depth = 0): Fields =>
  Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, redactValue(key, value, depth)]),
  );

const noop = (): void => undefined;
export const silentLogger: Logger = { debug: noop, info: noop, warn: noop, error: noop };

/** Wraps the consumer's logger so nothing sensitive can reach it. */
export const redactingLogger = (inner: Logger | undefined): Logger => {
  if (inner === undefined) return silentLogger;
  const wrap =
    (write: Logger['info']): Logger['info'] =>
    (message, fields) => {
      write(maskPhone(message), fields === undefined ? undefined : redactFields(fields));
    };
  return {
    debug: wrap(inner.debug.bind(inner)),
    info: wrap(inner.info.bind(inner)),
    warn: wrap(inner.warn.bind(inner)),
    error: wrap(inner.error.bind(inner)),
  };
};
