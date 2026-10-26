import { DEFAULT_CODE } from '../../constants/defaults';
import { configError, validationError } from '../../errors';
import type { OtpChannel } from '../../ports';
import { createCodeOtp, type CodeOtp, type CodeOtpOptions } from '../code';

/** A real SMS vendor (Twilio, a local gateway…) implements this; outages throw `OtpError`. */
export interface SmsVendor {
  /** A fake vendor must say so: production refuses it. */
  readonly isFake?: boolean;
  send(message: { readonly to: string; readonly body: string }): Promise<{ readonly id: string }>;
}

export interface SmsChannelOptions {
  readonly vendor: SmsVendor;
  /** Message text per app language; `{code}` and `{minutes}` are replaced (consumer-localized). */
  readonly templates: Readonly<Record<string, string>>;
  /** Language used when the requested one has no template (must be a key of `templates`). */
  readonly fallbackLanguage?: string;
}

export const SMS_CHANNEL_NAME = 'sms';
const CODE_PLACEHOLDER = '{code}';
const MINUTES_PLACEHOLDER = '{minutes}';

/** SMS as an `OtpChannel` (no vendor chosen for WAB; kept so a vendor is one adapter away). */
export const createSmsChannel = (options: SmsChannelOptions): OtpChannel => {
  const languages = Object.keys(options.templates);
  if (languages.length === 0) throw configError('sms templates are required');
  if (Object.values(options.templates).some((text) => !text.includes(CODE_PLACEHOLDER)))
    throw configError('every sms template needs {code}');
  if (options.fallbackLanguage !== undefined && !languages.includes(options.fallbackLanguage))
    throw configError('sms fallbackLanguage has no template');
  return {
    name: SMS_CHANNEL_NAME,
    ...(options.vendor.isFake === true ? { isFake: true } : {}),
    send: ({ to, code, language, ttlSec }) => {
      const own = Object.hasOwn(options.templates, language)
        ? options.templates[language]
        : undefined;
      const template =
        own ??
        (options.fallbackLanguage === undefined
          ? undefined
          : options.templates[options.fallbackLanguage]);
      if (template === undefined)
        return Promise.reject(validationError('No sms template for this language'));
      const body = template
        .replace(CODE_PLACEHOLDER, code)
        .replace(MINUTES_PLACEHOLDER, String(Math.ceil(ttlSec / DEFAULT_CODE.secondsPerMinute)));
      return options.vendor.send({ to, body });
    },
  };
};

export type SmsOtpOptions = Omit<CodeOtpOptions, 'channel'> & { readonly sms: SmsChannelOptions };

/** Server-generated codes over SMS (same flow as WhatsApp). */
export const createSmsOtp = (options: SmsOtpOptions): CodeOtp => {
  const { sms, ...rest } = options;
  return createCodeOtp({ ...rest, channel: createSmsChannel(sms) });
};
