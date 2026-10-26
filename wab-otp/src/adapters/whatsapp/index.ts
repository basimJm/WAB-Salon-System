import { ERROR_CODES } from '../../constants/codes';
import { DEFAULT_CODE } from '../../constants/defaults';
import { DEFAULT_WHATSAPP, HTTP_STATUS, WHATSAPP_BODY } from '../../constants/whatsapp';
import { OtpError, validationError } from '../../errors';
import type { OtpChannel, OtpMessage } from '../../ports';
import { withRetry } from '../../retry';
import { createCodeOtp, type CodeOtp, type CodeOtpOptions } from '../code';
import { readMetaError, whatsAppStatusError, whatsAppTransportError } from './errors';
import { resolveWhatsApp, type ResolvedWhatsApp, type WhatsAppChannelOptions } from './options';

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
};

/** `{ messages: [{ id }] }` is Meta's acceptance; the id is the WhatsApp message id (`wamid…`). */
const messageIdOf = (body: unknown): string | null => {
  if (typeof body !== 'object' || body === null) return null;
  const messages = (body as Record<string, unknown>)['messages'];
  if (!Array.isArray(messages)) return null;
  const first: unknown = messages[0];
  if (typeof first !== 'object' || first === null) return null;
  const id = (first as Record<string, unknown>)['id'];
  return typeof id === 'string' && id !== '' ? id : null;
};

type LanguageConfig = Pick<ResolvedWhatsApp, 'templateName' | 'languageCodes' | 'fallbackLanguage'>;

const languageCodeOf = (config: LanguageConfig, language: string): string => {
  const own = Object.hasOwn(config.languageCodes, language)
    ? config.languageCodes[language]
    : undefined;
  const fallback =
    config.fallbackLanguage === undefined
      ? undefined
      : config.languageCodes[config.fallbackLanguage];
  const code = own ?? fallback;
  if (code === undefined) throw validationError('No WhatsApp template language for this language');
  return code;
};

const textParameter = (code: string): { type: string; text: string } => ({
  type: WHATSAPP_BODY.parameterType,
  text: code,
});

/** The authentication-template body: the code goes in the body AND in the copy-code button. */
export const buildTemplateBody = (
  config: LanguageConfig,
  message: Pick<OtpMessage, 'to' | 'code' | 'language'>,
): string =>
  JSON.stringify({
    messaging_product: WHATSAPP_BODY.messagingProduct,
    recipient_type: WHATSAPP_BODY.recipientType,
    to: message.to.startsWith(DEFAULT_WHATSAPP.e164Plus) ? message.to.slice(1) : message.to,
    type: WHATSAPP_BODY.type,
    template: {
      name: config.templateName,
      language: { code: languageCodeOf(config, message.language) },
      components: [
        { type: WHATSAPP_BODY.bodyComponent, parameters: [textParameter(message.code)] },
        {
          type: WHATSAPP_BODY.buttonComponent,
          sub_type: WHATSAPP_BODY.buttonSubType,
          index: WHATSAPP_BODY.buttonIndex,
          parameters: [textParameter(message.code)],
        },
      ],
    },
  });

const post = async (config: ResolvedWhatsApp, body: string): Promise<{ id: string }> => {
  let status: number;
  let text: string;
  try {
    const response = await config.fetch(config.url, {
      method: DEFAULT_WHATSAPP.method,
      headers: {
        [DEFAULT_WHATSAPP.authorizationHeader]: `${DEFAULT_WHATSAPP.authScheme} ${config.accessToken}`,
        [DEFAULT_WHATSAPP.contentTypeHeader]: DEFAULT_WHATSAPP.jsonContentType,
        [DEFAULT_WHATSAPP.acceptHeader]: DEFAULT_WHATSAPP.jsonContentType,
      },
      body,
      signal: AbortSignal.timeout(config.timeoutMs),
    });
    status = response.status;
    text = await response.text();
  } catch (error) {
    throw whatsAppTransportError(error);
  }
  const parsed = parseJson(text);
  if (status >= HTTP_STATUS.okFrom && status <= HTTP_STATUS.okTo) {
    const id = messageIdOf(parsed);
    if (id !== null) return { id };
    config.logger.error('whatsapp malformed answer', { status });
    // Not retried: Meta may have accepted the message, and a retry would send a second one.
    throw new OtpError(ERROR_CODES.MALFORMED_RESPONSE, 'WhatsApp answer without a message id', {
      details: { status },
    });
  }
  const error = whatsAppStatusError(status, readMetaError(parsed));
  const level = error.code === ERROR_CODES.UNKNOWN ? 'error' : 'warn';
  // Field names avoid `code`: the redacting logger hides every key that contains it.
  config.logger[level]('whatsapp send refused', {
    error: error.code,
    status,
    metaError: error.details['metaCode'],
    metaSubError: error.details['metaSubcode'],
    fbtraceId: error.details['fbtraceId'],
  });
  throw error;
};

/** WhatsApp Cloud API (Meta) authentication template as an `OtpChannel`. */
export const createWhatsAppChannel = (options: WhatsAppChannelOptions): OtpChannel => {
  const config = resolveWhatsApp(options);
  return {
    name: DEFAULT_WHATSAPP.channelName,
    send: async (message) => {
      if (message.code.length > DEFAULT_CODE.maxLength)
        throw validationError('code is too long for a WhatsApp authentication template');
      const body = buildTemplateBody(config, message);
      return withRetry(
        () => post(config, body),
        config.retry,
        config.retryDeps,
        (attempt, error) => {
          config.logger.warn('whatsapp retry', {
            attempt,
            // only retryable `OtpError`s are retried
            error: (error as OtpError).code,
          });
        },
      );
    },
  };
};

export type WhatsAppOtpOptions = Omit<CodeOtpOptions, 'channel'> & {
  readonly whatsapp: Omit<WhatsAppChannelOptions, 'environment'>;
};

/** Server-generated codes delivered over WhatsApp, with the signed single-use proof. */
export const createWhatsAppOtp = (options: WhatsAppOtpOptions): CodeOtp => {
  const { whatsapp, ...rest } = options;
  const channel = createWhatsAppChannel({
    ...whatsapp,
    environment: options.environment,
    ...(whatsapp.logger === undefined && options.logger !== undefined
      ? { logger: options.logger }
      : {}),
  });
  return createCodeOtp({ ...rest, channel });
};
