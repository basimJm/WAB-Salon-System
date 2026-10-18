import {
  CARD_NUMBER_PATTERN,
  MAX_REDACT_DEPTH,
  REDACTED,
  SENSITIVE_KEY_PATTERN,
} from '../constants/defaults';

export type LogFields = Readonly<Record<string, unknown>>;

/** Minimal logger the consumer injects (pino/winston adapters are one-liners). */
export interface Logger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
}

export const silentLogger: Logger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

const redactString = (value: string): string => value.replace(CARD_NUMBER_PATTERN, REDACTED);

/** Deep copy with secrets, card-number-looking text and cycles removed; never mutates the input. */
export const redact = (value: unknown, depth = 0, seen = new WeakSet<object>()): unknown => {
  if (typeof value === 'string') return redactString(value);
  if (typeof value !== 'object' || value === null) return value;
  if (depth >= MAX_REDACT_DEPTH || seen.has(value)) return REDACTED;
  seen.add(value);
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1, seen));
  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    out[key] = SENSITIVE_KEY_PATTERN.test(key) ? REDACTED : redact(entry, depth + 1, seen);
  }
  return out;
};

const asFields = (fields: LogFields): LogFields => redact(fields) as LogFields;

/** Every call goes through `redact`, so a careless caller cannot leak a secret or a card number. */
export const createRedactingLogger = (inner: Logger): Logger => {
  const wrap =
    (level: keyof Logger): Logger[keyof Logger] =>
    (message, fields) => {
      inner[level](redactString(message), fields === undefined ? undefined : asFields(fields));
    };
  return { debug: wrap('debug'), info: wrap('info'), warn: wrap('warn'), error: wrap('error') };
};
