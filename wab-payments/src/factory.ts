import { FakeGateway } from './adapters/fake';
import { resolveConfig, type PaymentsOptionsBase, type ResolvedConfig } from './config/options';
import { fetchHttpClient, type HttpClient } from './http';
import { createHyperPayClient } from './hyperpay/client';
import { HyperPayGateway } from './hyperpay/gateway';
import { MemoryIdempotencyStore } from './idempotency';
import { silentLogger, createRedactingLogger } from './logger';
import { createPaymentProvider } from './provider';
import { realRetryDeps } from './retry';
import type { PaymentGateway, PaymentProvider } from './types';

export type PaymentsOptions = PaymentsOptionsBase & {
  /** Replaces the network layer (proxies, tracing, tests). Defaults to global `fetch`. */
  readonly http?: HttpClient;
};

const buildGateway = (config: ResolvedConfig, options: PaymentsOptions): PaymentGateway => {
  switch (options.provider) {
    case 'fake':
      return new FakeGateway();
    case 'custom':
      // `resolveConfig` guarantees the gateway exists for the custom provider.
      return options.gateway as PaymentGateway;
    case 'hyperpay':
    case 'mock-gateway': {
      // `resolveConfig` guarantees the settings exist for these providers.
      const settings = config.hyperpay as NonNullable<ResolvedConfig['hyperpay']>;
      return new HyperPayGateway({
        provider: options.provider,
        environment: options.environment,
        currency: config.currency,
        settings,
        client: createHyperPayClient(settings, options.http ?? fetchHttpClient, config.timeoutMs),
      });
    }
  }
};

/**
 * The one entry point: validates the options, builds the adapter named by `provider` and returns
 * the stable `PaymentProvider`. No global state; call it once per process and reuse the result.
 */
export const createPayments = (options: PaymentsOptions): PaymentProvider => {
  const config = resolveConfig(options);
  return createPaymentProvider({
    gateway: buildGateway(config, options),
    config,
    store: options.idempotency?.store ?? new MemoryIdempotencyStore(config.ttlSec),
    logger: createRedactingLogger(options.logger ?? silentLogger),
    retryDeps: options.retryDeps ?? realRetryDeps,
  });
};
