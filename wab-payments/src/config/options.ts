import { z } from 'zod';
import {
  DEFAULT_CURRENCY,
  DEFAULT_IDEMPOTENCY,
  DEFAULT_METHODS,
  DEFAULT_RETRY,
  DEFAULT_TIMEOUT_MS,
  CURRENCIES,
  ENVIRONMENTS,
  NON_PRODUCTION_PROVIDERS,
  PROVIDERS,
  type CurrencyCode,
  type Environment,
  type GatewayAmountDecimals,
  type ProviderName,
} from '../constants/defaults';
import {
  HEX_PATTERN,
  HYPERPAY_DEFAULT_AMOUNT_DECIMALS,
  HYPERPAY_DEFAULT_BRANDS,
  HYPERPAY_HOSTS,
  HYPERPAY_PAYMENT_TYPES,
  HYPERPAY_TEST_HOST_PATTERN,
  HYPERPAY_TEST_MODES,
  HYPERPAY_WEBHOOK,
  type HyperPayTestMode,
} from '../constants/hyperpay';
import { configError } from '../errors';
import type { SessionDirectory } from '../directory';
import type { IdempotencyStore } from '../idempotency';
import type { Logger } from '../logger';
import type { RetryDeps, RetryPolicy } from '../retry';
import type { PaymentGateway } from '../types';

/** HyperPay credentials and behaviour. Secrets are injected by the consumer, never stored here. */
export interface HyperPayOptions {
  /** Defaults to the OPP test host in dev and the live host in prod. */
  readonly baseUrl?: string;
  readonly entityId: string;
  /** Bearer token of the entity (secret). */
  readonly accessToken: string;
  /** Hex AES-256 key from the HyperPay portal that decrypts notifications (secret). */
  readonly webhookDecryptionKey?: string;
  /** Where the checkout sends the shopper back (https URL or the app's custom scheme). */
  readonly shopperResultUrl: string;
  /** Sandbox behaviour switch; refused in prod. */
  readonly testMode?: HyperPayTestMode;
  /** Payment brands per method, e.g. `{ CARD: 'VISA MASTER' }`. */
  readonly brands?: Readonly<Record<string, string>>;
  /** Decimals the gateway receives for amounts (JOD has 3; set 2 if the account needs it). */
  readonly amountDecimals?: GatewayAmountDecimals;
  /** Ask OPP for the integrity hash (SRI) of the checkout widget script. Default true. */
  readonly integrity?: boolean;
}

/** Local mock gateway (speaks the OPP wire format); credentials must match the mock's. */
export interface MockGatewayOptions {
  readonly baseUrl: string;
  readonly entityId: string;
  readonly accessToken: string;
  readonly shopperResultUrl: string;
  readonly webhookDecryptionKey?: string;
}

export interface PaymentsOptionsBase {
  readonly environment: Environment;
  readonly provider: ProviderName;
  readonly currency?: CurrencyCode;
  /** Enabled payment methods; a request for another one is refused. */
  readonly methods?: readonly string[];
  readonly hyperpay?: HyperPayOptions;
  readonly mockGateway?: MockGatewayOptions;
  readonly timeoutMs?: number;
  readonly retry?: Partial<RetryPolicy>;
  readonly idempotency?: { readonly store?: IdempotencyStore; readonly ttlSec?: number };
  /** Checkout -> payment mapping needed for late refunds (Redis in prod). */
  readonly directory?: SessionDirectory;
  /** The adapter when `provider` is `custom` (any gateway implementing the port). */
  readonly gateway?: PaymentGateway;
  readonly logger?: Logger;
  readonly retryDeps?: RetryDeps;
}

const positive = z.number().int().positive();
const url = z.string().refine((value) => URL.canParse(value));
const hyperpaySchema = z.object({
  baseUrl: url.optional(),
  entityId: z.string().min(1),
  accessToken: z.string().min(1),
  webhookDecryptionKey: z
    .string()
    .length(HYPERPAY_WEBHOOK.keyHexLength)
    .regex(HEX_PATTERN)
    .optional(),
  shopperResultUrl: url,
  testMode: z.enum(HYPERPAY_TEST_MODES).optional(),
  brands: z.record(z.string().min(1), z.string().min(1)).optional(),
  amountDecimals: z.union([z.literal(2), z.literal(3)]).optional(),
  integrity: z.boolean().optional(),
});
const plainSchema = z.object({
  environment: z.enum(ENVIRONMENTS),
  provider: z.enum(PROVIDERS),
  currency: z.enum(Object.keys(CURRENCIES) as [CurrencyCode]).optional(),
  methods: z.array(z.string().min(1)).min(1).optional(),
  timeoutMs: positive.optional(),
  ttlSec: positive.optional(),
  retry: z
    .object({
      maxAttempts: positive,
      baseDelayMs: z.number().int().nonnegative(),
      maxDelayMs: positive,
      jitterRatio: z.number().min(0).max(1),
    })
    .partial()
    .optional(),
});

export interface ResolvedHyperPay {
  readonly baseUrl: string;
  readonly entityId: string;
  readonly accessToken: string;
  readonly webhookDecryptionKey?: string;
  readonly shopperResultUrl: string;
  readonly paymentType: typeof HYPERPAY_PAYMENT_TYPES.debit;
  /** Hosted pay page of the local mock gateway (undefined for the real gateway). */
  readonly checkoutPageUrl?: string;
  readonly testMode?: HyperPayTestMode;
  readonly brands: Readonly<Record<string, string>>;
  readonly amountDecimals: GatewayAmountDecimals;
  readonly integrity: boolean;
}

export interface ResolvedConfig<O extends PaymentsOptionsBase = PaymentsOptionsBase> {
  readonly options: O;
  readonly currency: CurrencyCode;
  readonly methods: readonly string[];
  readonly timeoutMs: number;
  readonly retry: RetryPolicy;
  readonly ttlSec: number;
  readonly hyperpay?: ResolvedHyperPay;
}

const fieldsOf = (issues: readonly z.core.$ZodIssue[], prefix: string): string[] => [
  ...new Set(issues.map((entry) => `${prefix}${entry.path.join('.')}`)),
];

const reject = (key: string): never => {
  throw configError('invalid payments options', { fields: [key] });
};

const checkPlain = (options: PaymentsOptionsBase): void => {
  const parsed = plainSchema.safeParse({
    environment: options.environment,
    provider: options.provider,
    currency: options.currency,
    methods: options.methods,
    timeoutMs: options.timeoutMs,
    ttlSec: options.idempotency?.ttlSec,
    retry: options.retry,
  });
  if (!parsed.success) {
    throw configError('invalid payments options', {
      fields: fieldsOf(parsed.error.issues, ''),
    });
  }
};

const resolveHyperPay = (
  environment: Environment,
  input: HyperPayOptions | undefined,
  checkoutPageUrl?: string,
): ResolvedHyperPay => {
  if (input === undefined) return reject('hyperpay');
  const parsed = hyperpaySchema.safeParse(input);
  if (!parsed.success) {
    throw configError('invalid payments options', {
      fields: fieldsOf(parsed.error.issues, 'hyperpay.'),
    });
  }
  const prod = environment === 'prod';
  const baseUrl = input.baseUrl ?? HYPERPAY_HOSTS[environment];
  if (prod) {
    if (!baseUrl.startsWith('https://')) reject('hyperpay.baseUrl (https is required in prod)');
    if (HYPERPAY_TEST_HOST_PATTERN.test(new URL(baseUrl).hostname)) {
      reject('hyperpay.baseUrl (a sandbox host is refused in prod)');
    }
    if (input.testMode !== undefined) reject('hyperpay.testMode (not allowed in prod)');
    if (input.webhookDecryptionKey === undefined) {
      reject('hyperpay.webhookDecryptionKey (required in prod)');
    }
    if (input.shopperResultUrl.startsWith('http://')) {
      reject('hyperpay.shopperResultUrl (http is refused in prod)');
    }
  }
  return {
    baseUrl: baseUrl.replace(/\/+$/, ''),
    entityId: input.entityId,
    accessToken: input.accessToken,
    ...(input.webhookDecryptionKey === undefined
      ? {}
      : { webhookDecryptionKey: input.webhookDecryptionKey.toLowerCase() }),
    shopperResultUrl: input.shopperResultUrl,
    paymentType: HYPERPAY_PAYMENT_TYPES.debit,
    ...(checkoutPageUrl === undefined ? {} : { checkoutPageUrl }),
    ...(input.testMode === undefined ? {} : { testMode: input.testMode }),
    brands: input.brands ?? HYPERPAY_DEFAULT_BRANDS,
    amountDecimals: input.amountDecimals ?? HYPERPAY_DEFAULT_AMOUNT_DECIMALS,
    integrity: input.integrity ?? true,
  };
};

const checkProvider = (options: PaymentsOptionsBase): ResolvedHyperPay | undefined => {
  if (options.environment === 'prod' && NON_PRODUCTION_PROVIDERS.includes(options.provider)) {
    reject('provider (fake and mock-gateway are refused in prod)');
  }
  if (options.environment === 'prod' && options.idempotency?.store === undefined) {
    reject('idempotency.store (a shared store is required in prod)');
  }
  if (
    options.environment === 'prod' &&
    options.provider === 'hyperpay' &&
    options.directory === undefined
  ) {
    reject('directory (a shared session directory is required in prod)');
  }
  if (options.provider === 'custom' && options.gateway === undefined) reject('gateway');
  if (options.provider === 'mock-gateway') {
    const mock = options.mockGateway;
    if (mock === undefined || !URL.canParse(mock.baseUrl)) reject('mockGateway.baseUrl');
    const { baseUrl, entityId, accessToken, shopperResultUrl, webhookDecryptionKey } =
      mock as MockGatewayOptions;
    return resolveHyperPay(
      'dev',
      {
        baseUrl,
        entityId,
        accessToken,
        shopperResultUrl,
        ...(webhookDecryptionKey === undefined ? {} : { webhookDecryptionKey }),
      },
      `${baseUrl.replace(/\/+$/, '')}/checkout/`,
    );
  }
  return options.provider === 'hyperpay'
    ? resolveHyperPay(options.environment, options.hyperpay)
    : undefined;
};

/** Validates every option once, at start-up, naming bad keys only (never their values). */
export const resolveConfig = <O extends PaymentsOptionsBase>(options: O): ResolvedConfig<O> => {
  checkPlain(options);
  const hyperpay = checkProvider(options);
  const methods = options.methods ?? DEFAULT_METHODS;
  const base = {
    options,
    currency: options.currency ?? DEFAULT_CURRENCY,
    methods,
    timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    retry: { ...DEFAULT_RETRY, ...options.retry },
    ttlSec: options.idempotency?.ttlSec ?? DEFAULT_IDEMPOTENCY.ttlSec,
  };
  return hyperpay === undefined ? base : { ...base, hyperpay };
};
