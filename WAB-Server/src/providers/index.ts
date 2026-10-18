import type { AppConfig } from '../config';
import { REAL_PROVIDER_MODE } from '../constants/providers';
import { InternalError } from '../utils/errors';
import { FakeAnalyticsProvider, type AnalyticsProvider } from './analytics';
import { FakeNotifier, type Notifier } from './notifier';
import { createRealNotifier, type ClosableNotifier } from './notifier/real';
import type { Redis } from 'ioredis';
import type { Logger } from '../utils/logger';
import { FakeOtpProvider, type OtpProvider } from './otp';
import { FakePaymentProvider, type PaymentProvider } from './payments';
import { FakeStorageProvider, type StorageProvider } from './storage';

/** What the real integrations need from the running process. */
export interface ProviderDeps {
  readonly redis: Redis;
  readonly logger: Logger;
  readonly config: AppConfig;
}

export interface Providers {
  readonly otp: OtpProvider;
  readonly storage: StorageProvider;
  readonly notifier: Notifier;
  /** Releases provider connections on shutdown. */
  readonly close: () => Promise<void>;
  readonly payments: PaymentProvider;
  readonly analytics: AnalyticsProvider;
}

/** The configured provider cannot be built: not integrated yet, or a fake in production. */
export class ProviderUnavailableError extends InternalError {
  constructor(
    readonly provider: string,
    reason: string,
  ) {
    super();
    this.message = `${provider} provider unavailable: ${reason}`;
  }
}

type Mode = AppConfig['providers']['otp'];

/**
 * Builds the providers named by the config. Fakes are for development and tests only: they are
 * refused in production even if the config check was bypassed. `real` providers arrive with the
 * `wab-*` packages (SRV-034, SRV-046...) and fail loudly until then.
 */
export const createProviders = (
  providers: AppConfig['providers'],
  isProduction: boolean,
  deps?: ProviderDeps,
): Providers => {
  const closers: (() => Promise<void>)[] = [];
  const pick = <T>(name: string, mode: Mode, fake: () => T, real?: () => T): T => {
    if (mode === REAL_PROVIDER_MODE) {
      if (real !== undefined) return real();
      throw new ProviderUnavailableError(name, 'the real integration is not built yet');
    }
    if (isProduction)
      throw new ProviderUnavailableError(name, 'fakes are not allowed in production');
    return fake();
  };
  const built = {
    otp: pick('otp', providers.otp, () => new FakeOtpProvider()),
    storage: pick('storage', providers.storage, () => new FakeStorageProvider()),
    notifier: pick(
      'notifier',
      providers.notifier,
      (): Notifier => new FakeNotifier(),
      () => {
        const settings = deps?.config.notifier;
        if (deps === undefined || settings === undefined) {
          throw new ProviderUnavailableError(
            'notifier',
            'credentials or runtime dependencies missing',
          );
        }
        const real: ClosableNotifier = createRealNotifier({
          settings,
          redis: deps.redis,
          logger: deps.logger,
          isProduction,
        });
        closers.push(() => real.close());
        return real;
      },
    ),
    payments: pick('payments', providers.payments, () => new FakePaymentProvider()),
    analytics: pick('analytics', providers.analytics, () => new FakeAnalyticsProvider()),
  };
  return {
    ...built,
    close: async () => {
      await Promise.all(closers.map((close) => close()));
    },
  };
};

export type { AnalyticsProvider, Notifier, OtpProvider, PaymentProvider, StorageProvider };
