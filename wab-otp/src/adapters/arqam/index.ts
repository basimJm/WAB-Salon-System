import { isIP } from 'node:net';
import { ARQAM_CODE_PATTERN, DEFAULT_ARQAM, IPV4_MAPPED_PREFIX } from '../../constants/arqam';
import { ERROR_CODES } from '../../constants/codes';
import { HTTP_HEADER, HTTP_METHOD, JSON_CONTENT_TYPE } from '../../constants/http';
import { configError, OtpError, validationError } from '../../errors';
import type { OtpChannel, OtpMessage } from '../../ports';
import { withRetry } from '../../retry';
import { createCodeOtp, type CodeOtp, type CodeOtpOptions } from '../code';
import { asRecord, isSuccess, sendHttp } from '../http';
import { arqamStatusError, readArqamError } from './errors';
import { resolveArqam, type ArqamChannelOptions, type ResolvedArqam } from './options';
import { readAccount, readDeliveryStatus, type ArqamAccount, type DeliveryStatus } from './status';

const VENDOR = 'ARQAM';

type TemplateConfig = Pick<ResolvedArqam, 'templates' | 'fallbackLanguage'>;

/** App language → ARQAM template name (the fallback language when the requested one has none). */
export const templateFor = (config: TemplateConfig, language: string): string => {
  const own = Object.hasOwn(config.templates, language) ? config.templates[language] : undefined;
  const fallback =
    config.fallbackLanguage === undefined ? undefined : config.templates[config.fallbackLanguage];
  const name = own ?? fallback;
  if (name === undefined) throw validationError('No ARQAM template for this language');
  return name;
};

/** A plain IPv4/IPv6 address (`::ffff:` mapping removed), or `undefined` when it is not one. */
export const normalizeIp = (ip: string | undefined): string | undefined => {
  if (ip === undefined) return undefined;
  const trimmed = ip.trim();
  const unmapped = trimmed.toLowerCase().startsWith(IPV4_MAPPED_PREFIX)
    ? trimmed.slice(IPV4_MAPPED_PREFIX.length)
    : trimmed;
  if (isIP(unmapped) !== 0) return unmapped;
  return isIP(trimmed) === 0 ? undefined : trimmed;
};

/** `POST /sms/otp` body: our code as `otpCode`; `senderId` / `ipAddress` only when known. */
export const buildSendBody = (
  config: TemplateConfig & Pick<ResolvedArqam, 'senderId'>,
  message: Pick<OtpMessage, 'to' | 'code' | 'language' | 'ip'>,
): string => {
  const ipAddress = normalizeIp(message.ip);
  return JSON.stringify({
    phoneNumber: message.to,
    otpCode: message.code,
    templateName: templateFor(config, message.language),
    ...(config.senderId === undefined ? {} : { senderId: config.senderId }),
    ...(ipAddress === undefined ? {} : { ipAddress }),
  });
};

interface Call {
  readonly method: string;
  readonly path: string;
  readonly body?: string;
  readonly idempotencyKey?: string;
  /** Log label (`send`, `account`, `history`). */
  readonly label: string;
}

/** One ARQAM call with retries; a 2xx answer's parsed body is returned, refusals are typed errors. */
const callArqam = (config: ResolvedArqam, call: Call): Promise<unknown> => {
  const headers: Record<string, string> = {
    [DEFAULT_ARQAM.apiKeyHeader]: config.apiKey,
    [HTTP_HEADER.accept]: JSON_CONTENT_TYPE,
    ...(call.body === undefined ? {} : { [HTTP_HEADER.contentType]: JSON_CONTENT_TYPE }),
    ...(call.idempotencyKey === undefined
      ? {}
      : { [HTTP_HEADER.idempotencyKey]: call.idempotencyKey }),
  };
  const once = async (): Promise<unknown> => {
    const answer = await sendHttp(config.fetch, {
      url: `${config.baseUrl}${call.path}`,
      method: call.method,
      headers,
      timeoutMs: config.timeoutMs,
      vendor: VENDOR,
      ...(call.body === undefined ? {} : { body: call.body }),
    });
    if (isSuccess(answer.status)) return answer.body;
    const refusal = readArqamError(answer.body);
    const error = arqamStatusError(answer.status, refusal, config.maxRetryAfterMs);
    const unknown = error.code === ERROR_CODES.UNKNOWN;
    // Field names avoid `code`/`key`: the redacting logger hides every key that contains them.
    config.logger[unknown ? 'error' : 'warn'](`arqam ${call.label} refused`, {
      error: error.code,
      status: answer.status,
      arqamError: refusal.errorCode,
      retryAfterMs: error.details['retryAfterMs'],
      ...(unknown ? { arqamMessage: refusal.errorMessage } : {}),
    });
    throw error;
  };
  return withRetry(once, config.retry, config.retryDeps, (attempt, error) => {
    // only retryable `OtpError`s are retried
    config.logger.warn(`arqam ${call.label} retry`, { attempt, error: (error as OtpError).code });
  });
};

const malformed = (config: ResolvedArqam, label: string): OtpError => {
  config.logger.error(`arqam malformed ${label} answer`);
  // Not retried: a send may have been accepted, and a retry would send a second message.
  return new OtpError(ERROR_CODES.MALFORMED_RESPONSE, `ARQAM ${label} answer is malformed`);
};

/** `{ success: true, messageId, status: 'sent', cost }` is ARQAM's acceptance. */
const messageIdOf = (body: unknown): string | null => {
  const fields = asRecord(body);
  if (fields === null || fields['success'] === false) return null;
  const id = fields['messageId'];
  return typeof id === 'string' && id !== '' ? id : null;
};

/** The ARQAM channel plus read-only account and delivery lookups (no OTP side effects). */
export interface ArqamChannel extends OtpChannel {
  /** `GET /sms/account`: live/test mode, balance, status (health checks, setup checks). */
  getAccount(): Promise<ArqamAccount>;
  /** `GET /messages/{messageId}/history`: sent / delivered / read / failed (for a later feature). */
  getDeliveryStatus(messageId: string): Promise<DeliveryStatus>;
}

/** ARQAM OTP (otp.arqam.tech) as an `OtpChannel`: it delivers our code over WhatsApp. */
export const createArqamChannel = (options: ArqamChannelOptions): ArqamChannel => {
  const config = resolveArqam(options);
  return {
    name: DEFAULT_ARQAM.channelName,

    send: async (message) => {
      if (!ARQAM_CODE_PATTERN.test(message.code))
        throw configError('ARQAM accepts 4 to 6 digit codes: set the code length to 4-6');
      const body = buildSendBody(config, message);
      const answer = await callArqam(config, {
        method: HTTP_METHOD.post,
        path: DEFAULT_ARQAM.sendPath,
        body,
        // One key per code: a retry after a timeout cannot make ARQAM send (and charge) twice.
        idempotencyKey: config.newIdempotencyKey(),
        label: 'send',
      });
      const id = messageIdOf(answer);
      if (id === null) throw malformed(config, 'send');
      return { id };
    },

    getAccount: async () => {
      const answer = await callArqam(config, {
        method: HTTP_METHOD.get,
        path: DEFAULT_ARQAM.accountPath,
        label: 'account',
      });
      const account = readAccount(answer);
      if (account === null) throw malformed(config, 'account');
      return account;
    },

    getDeliveryStatus: async (messageId) => {
      if (typeof messageId !== 'string' || messageId.trim() === '')
        throw validationError('messageId must be a non-empty string');
      const path = DEFAULT_ARQAM.historyPath.replace(
        DEFAULT_ARQAM.messageIdPlaceholder,
        encodeURIComponent(messageId),
      );
      const answer = await callArqam(config, { method: HTTP_METHOD.get, path, label: 'history' });
      const status = readDeliveryStatus(answer);
      if (status === null) throw malformed(config, 'history');
      return status;
    },
  };
};

export type ArqamOtpOptions = Omit<CodeOtpOptions, 'channel'> & {
  readonly arqam: Omit<ArqamChannelOptions, 'environment'>;
};

export type ArqamOtp = CodeOtp & Pick<ArqamChannel, 'getAccount' | 'getDeliveryStatus'>;

/** Server-generated codes delivered by ARQAM over WhatsApp, with the signed single-use proof. */
export const createArqamOtp = (options: ArqamOtpOptions): ArqamOtp => {
  const { arqam, ...rest } = options;
  const channel = createArqamChannel({
    ...arqam,
    environment: options.environment,
    ...(arqam.logger === undefined && options.logger !== undefined
      ? { logger: options.logger }
      : {}),
  });
  return {
    ...createCodeOtp({ ...rest, channel }),
    getAccount: () => channel.getAccount(),
    getDeliveryStatus: (messageId) => channel.getDeliveryStatus(messageId),
  };
};
