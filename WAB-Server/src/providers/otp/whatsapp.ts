import {
  createWhatsAppChannel,
  RedisCodeStore,
  type FetchLike,
  type RedisClientLike,
} from '@wab/otp';
import type { OtpSettings, WhatsAppSettings } from '../../config';
import { DEFAULT_LANGUAGE } from '../../constants/i18n';
import { WHATSAPP_TEMPLATE_LANGUAGES } from '../../constants/otp';
import type { Logger } from '../../utils/logger';
import { toSdkLogger } from '../notifier/real';
import { createSdkOtp } from './sdk';
import type { OtpProvider } from './types';

export interface WhatsAppOtpDeps {
  readonly settings: OtpSettings;
  /** The server's Redis: code hashes and used-proof flags are shared by every instance. */
  readonly redis: RedisClientLike;
  readonly logger: Logger;
  readonly isProduction: boolean;
  /** Replaces the platform `fetch` (tests, a local mock of graph.facebook.com). */
  readonly fetch?: FetchLike;
  /** Graph base URL override (tests); https is enforced by the SDK in production. */
  readonly baseUrl?: string;
}

/** Thrown at startup: OTP_PROVIDER=whatsapp without its account or secrets (config validates first). */
export class WhatsAppOtpConfigError extends Error {
  constructor() {
    super('whatsapp otp needs WHATSAPP_* settings and both OTP secrets');
    this.name = 'WhatsAppOtpConfigError';
  }
}

const requireAccount = (
  settings: OtpSettings,
): { whatsapp: WhatsAppSettings; codeSecret: string; proofSecret: string } => {
  const { whatsapp, codeSecret, proofSecret } = settings;
  if (whatsapp === undefined || codeSecret === undefined || proofSecret === undefined)
    throw new WhatsAppOtpConfigError();
  return { whatsapp, codeSecret, proofSecret };
};

/**
 * Phone OTP over the WhatsApp Cloud API authentication template (BUSINESS_DOMAIN §3.1a), in the
 * request language with Arabic as the fallback. The SDK validates the account options here, so a
 * bad phone number id, template name or API version stops the server at startup.
 */
export const createWhatsAppOtpProvider = (deps: WhatsAppOtpDeps): OtpProvider => {
  const { whatsapp, codeSecret, proofSecret } = requireAccount(deps.settings);
  const environment = deps.isProduction ? 'prod' : 'dev';
  const channel = createWhatsAppChannel({
    environment,
    phoneNumberId: whatsapp.phoneNumberId,
    accessToken: whatsapp.accessToken,
    templateName: whatsapp.templateName,
    languageCodes: WHATSAPP_TEMPLATE_LANGUAGES,
    fallbackLanguage: DEFAULT_LANGUAGE,
    logger: toSdkLogger(deps.logger),
    ...(whatsapp.apiVersion === undefined ? {} : { apiVersion: whatsapp.apiVersion }),
    ...(deps.fetch === undefined ? {} : { fetch: deps.fetch }),
    ...(deps.baseUrl === undefined ? {} : { baseUrl: deps.baseUrl }),
  });
  return createSdkOtp({
    environment,
    channel,
    store: new RedisCodeStore(deps.redis),
    codeSecret,
    proofSecret,
    logger: deps.logger,
    // Development may still use a fixed code with real WhatsApp test numbers; production refuses it.
    ...(deps.settings.fixedCode === undefined ? {} : { fixedCode: deps.settings.fixedCode }),
  });
};
