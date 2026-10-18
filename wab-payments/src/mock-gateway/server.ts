import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { HYPERPAY_PATHS } from '../constants/hyperpay';
import { MOCK_GATEWAY_DEFAULTS } from '../constants/mock';
import { encryptNotification } from '../hyperpay/crypto';
import { checkoutPage } from './page';
import {
  MOCK_CODES,
  MOCK_OUTCOMES,
  MockState,
  type MockOutcome,
  type MockPayment,
  type MockResult,
  type MockStateOptions,
} from './state';

export interface MockGatewayOptions {
  /** 0 picks a free port. */
  readonly port?: number;
  readonly host?: string;
  readonly entityId: string;
  readonly accessToken: string;
  /** When set, every completed payment/refund is POSTed here as an encrypted notification. */
  readonly webhook?: { readonly url: string; readonly keyHex: string };
  readonly state?: MockStateOptions;
}

export interface MockGateway {
  readonly url: string;
  readonly state: MockState;
  /** The shopper finishes the payment page; sends the webhook when configured. */
  settle(checkoutId: string, outcome: MockOutcome): Promise<MockPayment>;
  /** Answer the next HTTP calls with these statuses (e.g. 503) before behaving normally. */
  injectHttpFailures(...statuses: number[]): void;
  /** Re-sends the notification for a payment (HyperPay retries on failure). */
  deliverWebhook(paymentId: string): Promise<number | undefined>;
  close(): Promise<void>;
}

const JSON_TYPE = 'application/json;charset=UTF-8';
const HTML_TYPE = 'text/html;charset=UTF-8';
const HTTP = { ok: 200, redirect: 303, badRequest: 400, unauthorized: 401, notFound: 404 } as const;
const MAX_BODY_BYTES = 64 * 1024;

const readBody = async (req: IncomingMessage): Promise<string> => {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.from(chunk as Uint8Array);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) throw new RangeError('body too large');
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
};

const send = (res: ServerResponse, status: number, body: unknown, type = JSON_TYPE): void => {
  res.writeHead(status, { 'content-type': type });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
};

export const startMockGateway = async (options: MockGatewayOptions): Promise<MockGateway> => {
  const state = new MockState(options.state);
  const failures: number[] = [];
  const host = options.host ?? MOCK_GATEWAY_DEFAULTS.host;
  let origin = '';

  const envelope = (result: MockResult, extra: object = {}): object => ({
    result,
    buildNumber: 'mock-build',
    timestamp: state.timestamp(),
    ...extra,
  });
  const paymentBody = (payment: MockPayment): object =>
    envelope(payment.result, {
      id: payment.id,
      paymentType: payment.paymentType,
      paymentBrand: 'VISA',
      amount: payment.amount,
      currency: payment.currency,
      merchantTransactionId: payment.merchantTransactionId,
      ...(payment.referencedId === undefined ? {} : { referencedId: payment.referencedId }),
      ...(payment.checkoutId === undefined ? {} : { ndc: payment.checkoutId }),
    });

  const deliverWebhook = async (paymentId: string): Promise<number | undefined> => {
    const payment = state.payments.get(paymentId);
    if (options.webhook === undefined || payment === undefined) return undefined;
    const plain = JSON.stringify({ type: 'PAYMENT', payload: paymentBody(payment) });
    const sealed = encryptNotification(plain, options.webhook.keyHex);
    try {
      const response = await fetch(options.webhook.url, {
        method: 'POST',
        headers: {
          'content-type': 'text/plain',
          'x-initialization-vector': sealed.iv,
          'x-authentication-tag': sealed.tag,
        },
        body: sealed.body,
      });
      return response.status;
    } catch {
      return undefined;
    }
  };

  const settle = async (checkoutId: string, outcome: MockOutcome): Promise<MockPayment> => {
    const payment = state.complete(checkoutId, outcome);
    if (payment === undefined) throw new RangeError('unknown checkout');
    await deliverWebhook(payment.id);
    return payment;
  };

  const authorized = (req: IncomingMessage): boolean =>
    req.headers.authorization === `Bearer ${options.accessToken}`;
  const entityOk = (value: string | null): boolean => value === options.entityId;
  const unauthorized = (res: ServerResponse): void => {
    send(res, HTTP.unauthorized, envelope(MOCK_CODES.authFailed));
  };
  const missing = (res: ServerResponse, name: string): void => {
    send(res, HTTP.badRequest, envelope(MOCK_CODES.notFound, { parameterErrors: [{ name }] }));
  };

  const handleCheckoutCreate = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const form = new URLSearchParams(await readBody(req));
    if (!entityOk(form.get('entityId'))) return unauthorized(res);
    for (const name of ['amount', 'currency', 'merchantTransactionId']) {
      if (!form.get(name)) return missing(res, name);
    }
    const shopperResultUrl = form.get('shopperResultUrl');
    const checkout = state.createCheckout({
      entityId: options.entityId,
      amount: form.get('amount') ?? '',
      currency: form.get('currency') ?? '',
      paymentType: form.get('paymentType') ?? 'DB',
      merchantTransactionId: form.get('merchantTransactionId') ?? '',
      ...(shopperResultUrl === null ? {} : { shopperResultUrl }),
    });
    send(
      res,
      HTTP.ok,
      envelope(MOCK_CODES.checkoutCreated, {
        id: checkout.id,
        ndc: checkout.id,
        ...(form.get('integrity') === 'true' ? { integrity: 'sha384-mock-integrity' } : {}),
      }),
    );
  };

  const handleRefund = async (
    req: IncomingMessage,
    res: ServerResponse,
    paymentId: string,
  ): Promise<void> => {
    const form = new URLSearchParams(await readBody(req));
    if (!entityOk(form.get('entityId'))) return unauthorized(res);
    if (form.get('paymentType') !== 'RF') return missing(res, 'paymentType');
    for (const name of ['amount', 'currency']) if (!form.get(name)) return missing(res, name);
    const outcome = state.refund(paymentId, {
      amount: form.get('amount') ?? '',
      currency: form.get('currency') ?? '',
      merchantTransactionId: form.get('merchantTransactionId') ?? '',
    });
    if ('error' in outcome) return send(res, HTTP.ok, envelope(outcome.error));
    await deliverWebhook(outcome.payment.id);
    send(res, HTTP.ok, paymentBody(outcome.payment));
  };

  const route = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const url = new URL(req.url ?? '/', origin);
    const method = req.method ?? 'GET';
    const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
    const [root, a, b, c] = parts;

    if (root === 'checkout' && a !== undefined) {
      const checkout = state.checkouts.get(a);
      if (checkout === undefined) return send(res, HTTP.notFound, 'unknown checkout', HTML_TYPE);
      if (method === 'GET' && b === undefined) {
        return send(res, HTTP.ok, checkoutPage({ checkoutId: a, ...checkout }), HTML_TYPE);
      }
      if (
        method === 'POST' &&
        b !== undefined &&
        (MOCK_OUTCOMES as readonly string[]).includes(b)
      ) {
        await settle(a, b as MockOutcome);
        const target = checkout.shopperResultUrl;
        if (target === undefined) return send(res, HTTP.ok, 'done', HTML_TYPE);
        const separator = target.includes('?') ? '&' : '?';
        const resourcePath = encodeURIComponent(HYPERPAY_PATHS.checkoutPayment(a));
        res.writeHead(HTTP.redirect, {
          location: `${target}${separator}id=${encodeURIComponent(a)}&resourcePath=${resourcePath}`,
        });
        return void res.end();
      }
    }
    if (root !== 'v1') return send(res, HTTP.notFound, 'not found', HTML_TYPE);
    if (a === 'paymentWidgets.js') {
      return send(res, HTTP.ok, '/* mock widget */', 'application/javascript');
    }
    if (!authorized(req)) return unauthorized(res);

    if (a === 'checkouts' && b === undefined && method === 'POST') {
      return handleCheckoutCreate(req, res);
    }
    if (a === 'checkouts' && b !== undefined && c === 'payment' && method === 'GET') {
      if (!entityOk(url.searchParams.get('entityId'))) return unauthorized(res);
      const payment = state.paymentOfCheckout(b);
      if (!state.checkouts.has(b)) return send(res, HTTP.notFound, envelope(MOCK_CODES.notFound));
      return send(
        res,
        HTTP.ok,
        payment === undefined ? envelope(MOCK_CODES.notFound) : paymentBody(payment),
      );
    }
    if (a === 'payments' && b !== undefined && c === undefined) {
      if (method === 'POST') return handleRefund(req, res, b);
      if (method === 'GET') {
        if (!entityOk(url.searchParams.get('entityId'))) return unauthorized(res);
        const payment = state.payments.get(b);
        return payment === undefined
          ? send(res, HTTP.notFound, envelope(MOCK_CODES.noTransaction))
          : send(res, HTTP.ok, paymentBody(payment));
      }
    }
    if (a === 'query' && method === 'GET') {
      if (!entityOk(url.searchParams.get('entityId'))) return unauthorized(res);
      const reference = url.searchParams.get('merchantTransactionId');
      if (reference === null) return missing(res, 'merchantTransactionId');
      const records = state.byMerchantTransactionId(reference);
      return records.length === 0
        ? send(res, HTTP.notFound, envelope(MOCK_CODES.noTransaction))
        : send(res, HTTP.ok, envelope(MOCK_CODES.success, { records: records.map(paymentBody) }));
    }
    return send(res, HTTP.notFound, envelope(MOCK_CODES.badRequest));
  };

  const server: Server = createServer((req, res) => {
    const injected = failures.shift();
    if (injected !== undefined) {
      send(res, injected, envelope({ code: '800.500.100', description: 'injected failure' }));
      return;
    }
    route(req, res).catch(() => {
      if (!res.headersSent) send(res, HTTP.badRequest, envelope(MOCK_CODES.badRequest));
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(options.port ?? 0, host, resolve);
  });
  const { port } = server.address() as AddressInfo;
  origin = `http://${host}:${String(port)}`;

  return {
    url: origin,
    state,
    settle,
    deliverWebhook,
    injectHttpFailures: (...statuses: number[]): void => {
      failures.push(...statuses);
    },
    close: (): Promise<void> =>
      new Promise((resolve) => {
        server.closeAllConnections();
        server.close(() => {
          resolve();
        });
      }),
  };
};
