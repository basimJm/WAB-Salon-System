import type { AppConfig } from '../config';
import {
  DISABLED_PAYMENT_MODE,
  REAL_PROVIDER_MODE,
  WHATSAPP_OTP_MODE,
} from '../constants/providers';
import { InternalError } from '../utils/errors';
import { FakeNotifier, type Notifier } from './notifier';
import { createRealNotifier, type ClosableNotifier } from './notifier/real';
import type { Redis } from 'ioredis';
import type { Logger } from '../utils/logger';
import { RedisCodeStore } from '@wab/otp';
import { FakeOtpProvider, createWhatsAppOtpProvider, type OtpProvider } from './otp';
import { DisabledPaymentProvider, FakePaymentProvider, type PaymentProvider } from './payments';
import { FakeStorageProvider, type StorageProvider } from './storage';
import { createRealStorage } from './storage/real';

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

type Mode = AppConfig['providers']['storage'];

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
  // Payments are paused: `disabled` answers 503 on every gateway call; a fake never runs in production.
  const pickPayments = (mode: AppConfig['providers']['payments']): PaymentProvider => {
    if (mode === DISABLED_PAYMENT_MODE) return new DisabledPaymentProvider();
    if (isProduction)
      throw new ProviderUnavailableError('payments', 'fakes are not allowed in production');
    return new FakePaymentProvider();
  };
  // Phone OTP (BUSINESS_DOMAIN §3.1a): WhatsApp in production; the fake records codes (dev/test).
  const pickOtp = (mode: AppConfig['providers']['otp']): OtpProvider => {
    if (mode === WHATSAPP_OTP_MODE) {
      if (deps === undefined)
        throw new ProviderUnavailableError('otp', 'runtime dependencies missing');
      return createWhatsAppOtpProvider({
        settings: deps.config.otp,
        redis: deps.redis,
        logger: deps.logger,
        isProduction,
      });
    }
    if (isProduction)
      throw new ProviderUnavailableError('otp', 'fakes are not allowed in production');
    if (deps === undefined) return new FakeOtpProvider();
    const { codeSecret, proofSecret, fixedCode } = deps.config.otp;
    return new FakeOtpProvider({
      store: new RedisCodeStore(deps.redis),
      logger: deps.logger,
      ...(codeSecret === undefined ? {} : { codeSecret }),
      ...(proofSecret === undefined ? {} : { proofSecret }),
      ...(fixedCode === undefined ? {} : { fixedCode }),
    });
  };
  const built = {
    otp: pickOtp(providers.otp),
    storage: pick(
      'storage',
      providers.storage,
      () => new FakeStorageProvider(),
      () => {
        const settings = deps?.config.storage;
        if (deps === undefined || settings === undefined)
          throw new ProviderUnavailableError('storage', 'S3 or CDN settings missing');
        return createRealStorage({ settings, isProduction, logger: deps.logger });
      },
    ),
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
    payments: pickPayments(providers.payments),
  };
  return {
    ...built,
    close: async () => {
      await Promise.all(closers.map((close) => close()));
    },
  };
};

export type { Notifier, OtpProvider, PaymentProvider, StorageProvider };
