import { FakeGateway } from './adapters/fake';
import { resolveConfig, type PaymentsOptionsBase, type ResolvedConfig } from './config/options';
import { configError } from './errors';
import { MemoryIdempotencyStore } from './idempotency';
import { silentLogger, createRedactingLogger } from './logger';
import { createPaymentProvider } from './provider';
import { realRetryDeps } from './retry';
import type { PaymentGateway, PaymentProvider } from './types';

export type PaymentsOptions = PaymentsOptionsBase;

const buildGateway = (config: ResolvedConfig): PaymentGateway => {
  const { options } = config;
  switch (options.provider) {
    case 'fake':
      return new FakeGateway();
    case 'custom':
      // `resolveConfig` guarantees the gateway exists for the custom provider.
      return options.gateway as PaymentGateway;
    default:
      throw configError('payment adapter is not available', { fields: ['provider'] });
  }
};

/**
 * The one entry point: validates the options, builds the adapter named by `provider` and returns
 * the stable `PaymentProvider`. No global state; call it once per process and reuse the result.
 */
export const createPayments = (options: PaymentsOptions): PaymentProvider => {
  const config = resolveConfig(options);
  return createPaymentProvider({
    gateway: buildGateway(config),
    config,
    store: options.idempotency?.store ?? new MemoryIdempotencyStore(config.ttlSec),
    logger: createRedactingLogger(options.logger ?? silentLogger),
    retryDeps: options.retryDeps ?? realRetryDeps,
  });
};
