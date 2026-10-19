import { MAX_PARAM_DEPTH, REDACTED, SENSITIVE_KEY_PATTERN } from './constants/defaults';

/** Injected logger: `(message, fields)`. The consumer adapts pino/winston to it. */
export interface Logger {
  debug(message: string, fields?: Record<string, unknown>): void;
  info(message: string, fields?: Record<string, unknown>): void;
  warn(message: string, fields?: Record<string, unknown>): void;
  error(message: string, fields?: Record<string, unknown>): void;
}

const noop = (): void => undefined;

export const noopLogger: Logger = { debug: noop, info: noop, warn: noop, error: noop };

/** Copies `value` with secret-looking keys replaced; bounded depth, never mutates the input. */
export const redact = (value: unknown, depth = 0): unknown => {
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Date) return value;
  if (depth >= MAX_PARAM_DEPTH) return REDACTED;
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [key, inner] of Object.entries(value)) {
    out[key] = SENSITIVE_KEY_PATTERN.test(key) ? REDACTED : redact(inner, depth + 1);
  }
  return out;
};

/** Wraps a logger so every field object is redacted before it is written. */
export const redactingLogger = (logger: Logger): Logger => {
  const wrap =
    (write: Logger['info']): Logger['info'] =>
    (message, fields) => {
      write(
        message,
        fields === undefined ? undefined : (redact(fields) as Record<string, unknown>),
      );
    };
  return {
    debug: wrap((m, f) => {
      logger.debug(m, f);
    }),
    info: wrap((m, f) => {
      logger.info(m, f);
    }),
    warn: wrap((m, f) => {
      logger.warn(m, f);
    }),
    error: wrap((m, f) => {
      logger.error(m, f);
    }),
  };
};
