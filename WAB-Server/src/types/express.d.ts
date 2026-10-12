import type { Logger } from 'pino';
import type { Language } from '../constants/i18n';
import type { MessageParams } from '../utils/errors';

declare global {
  namespace Express {
    interface Request {
      /** Request id; also returned to clients as `traceId` in error responses. */
      id: string;
      /** Child logger bound to the request id. */
      log: Logger;
      /** Language resolved from `Accept-Language` (default `ar`). */
      language: Language;
      /** Translates a locale key into the request language. */
      t: (key: string, params?: MessageParams) => string;
      /** Output of the `validate` middleware; read it through `validated()`. */
      validated: Record<string, unknown>;
    }
  }
}

export {};
