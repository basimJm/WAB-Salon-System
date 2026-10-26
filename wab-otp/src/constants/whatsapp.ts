/**
 * WhatsApp Cloud API (Meta) wire constants: authentication template with a copy-code button
 * (developers.facebook.com/docs/whatsapp/business-management-api/authentication-templates).
 */
export const DEFAULT_WHATSAPP = {
  baseUrl: 'https://graph.facebook.com',
  /** Version of Meta's documentation example; consumers override it with `apiVersion`. */
  apiVersion: 'v26.0',
  messagesPath: 'messages',
  pathSeparator: '/',
  timeoutMs: 5000,
  authScheme: 'Bearer',
  authorizationHeader: 'authorization',
  contentTypeHeader: 'content-type',
  acceptHeader: 'accept',
  jsonContentType: 'application/json',
  method: 'POST',
  channelName: 'whatsapp',
  /** Meta wants the recipient in international format without the leading `+`. */
  e164Plus: '+',
} as const;

/** Fields of the send-message body. */
export const WHATSAPP_BODY = {
  messagingProduct: 'whatsapp',
  recipientType: 'individual',
  type: 'template',
  bodyComponent: 'body',
  buttonComponent: 'button',
  /** Meta turns the OTP copy-code button into a URL button when the template is created. */
  buttonSubType: 'url',
  buttonIndex: '0',
  parameterType: 'text',
} as const;

export const WHATSAPP_PATTERNS = {
  phoneNumberId: /^\d{1,32}$/,
  templateName: /^[a-z0-9_]{1,512}$/,
  apiVersion: /^v\d{1,3}\.\d{1,3}$/,
  languageCode: /^[a-z]{2,3}(_[A-Z]{2})?$/,
} as const;

export const HTTP_STATUS = {
  okFrom: 200,
  okTo: 299,
  unauthorized: 401,
  forbidden: 403,
  tooManyRequests: 429,
  serverErrorFrom: 500,
} as const;

/** `error.name` of an aborted / timed-out fetch. */
export const TIMEOUT_ERROR_NAMES = ['TimeoutError', 'AbortError'] as const;

/**
 * Meta Graph / Cloud API error codes (developers.facebook.com/docs/whatsapp/cloud-api/support/
 * error-codes, read 2026-10-26), grouped by what the SDK does with them.
 */
export const META_ERRORS = {
  /** The recipient cannot get the message: not on WhatsApp / undeliverable (131026), sender ==
   * recipient (131021), recipient not in the test number's allowed list (131030). */
  delivery: [131021, 131026, 131030],
  /** Token expired / invalid / missing permission. */
  auth: [0, 3, 10, 190, 131005],
  /** Graph permission errors 200–299. */
  authRange: { from: 200, to: 299 },
  /** Our request or template does not match what Meta has (fix the configuration). */
  config: [100, 131008, 131009, 132000, 132001, 132005, 132007, 132012, 132015, 132016, 135000],
  /** The WhatsApp account or number cannot send (policy, billing, registration, display name). */
  account: [368, 130497, 131031, 131037, 131042, 131045, 133010],
  /** Throughput / pair rate limits: retried with backoff. */
  rateLimited: [4, 80007, 130429, 131056],
  /** Spam rate limit on the business number: retrying now does not help. */
  rateLimitedHard: [131048],
  /** Temporary Meta failures: retried with backoff. */
  temporary: [1, 2, 131000, 131016, 131057, 133004],
} as const;
