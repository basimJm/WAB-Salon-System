/**
 * HyperPay (ACI OPP / COPYandPAY) constants. Built from the public OPP documentation; real-gateway
 * behaviour is UNVERIFIED until run against the owner's sandbox (Integration.md §11).
 */
export const HYPERPAY_HOSTS = {
  dev: 'https://eu-test.oppwa.com',
  prod: 'https://eu-prod.oppwa.com',
} as const;
/** Hosts that only serve sandbox traffic: refused in production. */
export const HYPERPAY_TEST_HOST_PATTERN = /(^|[.-])test\./i;

export const HYPERPAY_PATHS = {
  checkouts: '/v1/checkouts',
  checkoutPayment: (checkoutId: string): string =>
    `/v1/checkouts/${encodeURIComponent(checkoutId)}/payment`,
  payment: (paymentId: string): string => `/v1/payments/${encodeURIComponent(paymentId)}`,
  query: '/v1/query',
  queryById: (id: string): string => `/v1/query/${encodeURIComponent(id)}`,
  widgetScript: (checkoutId: string): string =>
    `/v1/paymentWidgets.js?checkoutId=${encodeURIComponent(checkoutId)}`,
} as const;

export const HYPERPAY_PARAMS = {
  entityId: 'entityId',
  amount: 'amount',
  currency: 'currency',
  paymentType: 'paymentType',
  merchantTransactionId: 'merchantTransactionId',
  integrity: 'integrity',
  testMode: 'testMode',
  customerEmail: 'customer.email',
  customerGivenName: 'customer.givenName',
  customerSurname: 'customer.surname',
  customerPhone: 'customer.phone',
  customerIp: 'customer.ip',
  shopperResultUrl: 'shopperResultUrl',
  customParametersPrefix: 'customParameters',
} as const;

export const HYPERPAY_PAYMENT_TYPES = { debit: 'DB', preAuth: 'PA', refund: 'RF' } as const;
export const HYPERPAY_TEST_MODES = ['EXTERNAL', 'INTERNAL'] as const;
export type HyperPayTestMode = (typeof HYPERPAY_TEST_MODES)[number];
export const HYPERPAY_DEFAULT_BRANDS: Readonly<Record<string, string>> = { CARD: 'VISA MASTER' };
export const HYPERPAY_REQUEST_CONTENT_TYPE = 'application/x-www-form-urlencoded';

/** Webhook decryption (AES-256-GCM): key is 32 bytes as hex; IV and tag arrive as hex headers. */
export const HYPERPAY_WEBHOOK = {
  ivHeader: 'x-initialization-vector',
  tagHeader: 'x-authentication-tag',
  keyHexLength: 64,
  authTagBytes: 16,
} as const;
export const HEX_PATTERN = /^(?:[0-9a-fA-F]{2})+$/;
/** The number of decimals OPP expects when the integrator did not choose (assumption). */
export const HYPERPAY_DEFAULT_AMOUNT_DECIMALS: 2 | 3 = 3;
export const HYPERPAY_REFUND_SUCCESS_STATUS = 'RF';
