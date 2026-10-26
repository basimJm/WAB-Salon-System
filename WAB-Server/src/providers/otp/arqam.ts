import {
  createArqamChannel,
  RedisCodeStore,
  type ArqamAccount,
  type ArqamChannel,
  type FetchLike,
  type RedisClientLike,
} from '@wab/otp';
import type { ArqamSettings, OtpSettings } from '../../config';
import { DEFAULT_LANGUAGE } from '../../constants/i18n';
import type { Logger } from '../../utils/logger';
import { toSdkLogger } from '../notifier/real';
import { createSdkOtp } from './sdk';
import type { OtpProvider } from './types';

/** ARQAM's `TEST` mode: every code goes to the key's own test phone, whatever number is asked. */
const ARQAM_TEST_MODE: ArqamAccount['mode'] = 'TEST';

export interface ArqamOtpDeps {
  readonly settings: OtpSettings;
  /** The server's Redis: code hashes and used-proof flags are shared by every instance. */
  readonly redis: RedisClientLike;
  readonly logger: Logger;
  readonly isProduction: boolean;
  /** Replaces the platform `fetch` (tests, a local mock of ARQAM). */
  readonly fetch?: FetchLike;
}

/** An `OtpProvider` that can also read the ARQAM account (startup report, `otp:arqam-check`). */
export interface ArqamOtpProvider extends OtpProvider {
  readonly account: () => Promise<ArqamAccount>;
}

/** Thrown at startup: OTP_PROVIDER=arqam without its key, templates or secrets (config validates first). */
export class ArqamOtpConfigError extends Error {
  constructor() {
    super(
      'arqam otp needs ARQAM_API_KEY, ARQAM_TEMPLATE_AR, ARQAM_TEMPLATE_EN and both OTP secrets',
    );
    this.name = 'ArqamOtpConfigError';
  }
}

/** The ARQAM channel from the server settings; the SDK validates the options (bad values stop startup). */
export const createArqamChannelFromSettings = (
  arqam: ArqamSettings,
  options: { readonly isProduction: boolean; readonly logger: Logger; readonly fetch?: FetchLike },
): ArqamChannel =>
  createArqamChannel({
    environment: options.isProduction ? 'prod' : 'dev',
    apiKey: arqam.apiKey,
    templates: { ar: arqam.templates.ar, en: arqam.templates.en },
    fallbackLanguage: DEFAULT_LANGUAGE,
    logger: toSdkLogger(options.logger),
    ...(arqam.baseUrl === undefined ? {} : { baseUrl: arqam.baseUrl }),
    ...(arqam.senderId === undefined ? {} : { senderId: arqam.senderId }),
    ...(options.fetch === undefined ? {} : { fetch: options.fetch }),
  });

const requireArqam = (
  settings: OtpSettings,
): { arqam: ArqamSettings; codeSecret: string; proofSecret: string } => {
  const { arqam, codeSecret, proofSecret } = settings;
  if (arqam === undefined || codeSecret === undefined || proofSecret === undefined)
    throw new ArqamOtpConfigError();
  return { arqam, codeSecret, proofSecret };
};

/**
 * Phone OTP delivered over WhatsApp by ARQAM OTP (BUSINESS_DOMAIN §3.1a): our code as `otpCode`,
 * the template of the request language (Arabic fallback), the client IP only when configured.
 */
export const createArqamOtpProvider = (deps: ArqamOtpDeps): ArqamOtpProvider => {
  const { arqam, codeSecret, proofSecret } = requireArqam(deps.settings);
  const channel = createArqamChannelFromSettings(arqam, {
    isProduction: deps.isProduction,
    logger: deps.logger,
    ...(deps.fetch === undefined ? {} : { fetch: deps.fetch }),
  });
  const flow = createSdkOtp({
    environment: deps.isProduction ? 'prod' : 'dev',
    channel,
    store: new RedisCodeStore(deps.redis),
    codeSecret,
    proofSecret,
    forwardIp: arqam.sendIp,
    logger: deps.logger,
    // Development may use a fixed code with the ARQAM test key; production refuses it.
    ...(deps.settings.fixedCode === undefined ? {} : { fixedCode: deps.settings.fixedCode }),
  });
  return { ...flow, account: () => channel.getAccount() };
};

/**
 * Logs the ARQAM account once at startup, never blocking or failing it (readiness does not depend
 * on ARQAM). A TEST key with NODE_ENV=production is a `warn`: right on the hosted dev service (it runs
 * NODE_ENV=production), wrong on prod, where every code would go to the key's test phone.
 */
export const reportArqamAccount = async (
  provider: Pick<ArqamOtpProvider, 'account'>,
  isProduction: boolean,
  logger: Logger,
): Promise<void> => {
  try {
    const { mode, balance, status } = await provider.account();
    if (isProduction && mode === ARQAM_TEST_MODE) {
      logger.warn({ mode }, 'arqam otp uses a TEST key with NODE_ENV=production');
      return;
    }
    logger.info({ mode, balance, status }, 'arqam otp account');
  } catch (error) {
    const code = error instanceof Error && 'code' in error ? String(error.code) : 'unknown';
    logger.error({ otpError: code }, 'arqam otp account check failed');
  }
};
