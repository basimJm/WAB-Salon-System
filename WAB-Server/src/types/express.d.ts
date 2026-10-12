import type { Logger } from 'pino';

declare global {
  namespace Express {
    interface Request {
      /** Request id; also returned to clients as `traceId` in error responses. */
      id: string;
      /** Child logger bound to the request id. */
      log: Logger;
    }
  }
}

export {};
