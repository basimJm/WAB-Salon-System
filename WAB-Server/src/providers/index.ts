import type { AppConfig } from '../config';
import { REAL_PROVIDER_MODE } from '../constants/providers';
import { InternalError } from '../utils/errors';
import { FakeAnalyticsProvider, type AnalyticsProvider } from './analytics';
import { FakeNotifier, type Notifier } from './notifier';
import { FakeOtpProvider, type OtpProvider } from './otp';
import { FakePaymentProvider, type PaymentProvider } from './payments';
import { FakeStorageProvider, type StorageProvider } from './storage';

export interface Providers {
  readonly otp: OtpProvider;
  readonly storage: StorageProvider;
  readonly notifier: Notifier;
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
): Providers => {
  const pick = <T>(name: string, mode: Mode, fake: () => T): T => {
    if (mode === REAL_PROVIDER_MODE) {
      throw new ProviderUnavailableError(name, 'the real integration is not built yet');
    }
    if (isProduction)
      throw new ProviderUnavailableError(name, 'fakes are not allowed in production');
    return fake();
  };
  return {
    otp: pick('otp', providers.otp, () => new FakeOtpProvider()),
    storage: pick('storage', providers.storage, () => new FakeStorageProvider()),
    notifier: pick('notifier', providers.notifier, () => new FakeNotifier()),
    payments: pick('payments', providers.payments, () => new FakePaymentProvider()),
    analytics: pick('analytics', providers.analytics, () => new FakeAnalyticsProvider()),
  };
};

export type { AnalyticsProvider, Notifier, OtpProvider, PaymentProvider, StorageProvider };
