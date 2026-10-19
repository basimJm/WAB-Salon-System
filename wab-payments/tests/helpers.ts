import { FakeGateway } from '../src/adapters/fake';
import { createPayments } from '../src';
import type { Logger } from '../src/logger';
import type { PaymentProvider } from '../src/types';
import type { RetryDeps } from '../src/retry';

export const noSleep: RetryDeps = { sleep: () => Promise.resolve(), random: () => 0.5 };

export interface LogLine {
  readonly level: string;
  readonly message: string;
  readonly fields: unknown;
}

export const capturingLogger = (): { logger: Logger; lines: LogLine[] } => {
  const lines: LogLine[] = [];
  const at =
    (level: string) =>
    (message: string, fields?: unknown): void => {
      lines.push({ level, message, fields });
    };
  return {
    lines,
    logger: { debug: at('debug'), info: at('info'), warn: at('warn'), error: at('error') },
  };
};

export const withFake = (
  extra: Partial<Parameters<typeof createPayments>[0]> = {},
): { payments: PaymentProvider; gateway: FakeGateway } => {
  const gateway = new FakeGateway();
  const payments = createPayments({
    environment: 'dev',
    provider: 'custom',
    gateway,
    retryDeps: noSleep,
    ...extra,
  });
  return { payments, gateway };
};

export const SESSION = {
  idempotencyKey: 'draft-1:attempt-1',
  amountFils: 12_500,
  reference: 'draft-1',
} as const;
