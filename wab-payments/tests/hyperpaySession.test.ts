import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { ERROR_CODES } from '../src/constants/codes';
import { fetchHttpClient } from '../src/http';
import {
  classifyResult,
  paymentStatusOf,
  refundStatusOf,
  requestErrorOf,
} from '../src/hyperpay/codes';
import { PaymentSdkError } from '../src/errors';
import { SESSION } from './helpers';
import {
  CHECKOUT_OK,
  ENTITY,
  TOKEN,
  hyperpayPayments,
  paymentBody,
  reply,
  scripted,
} from './hyperpayHelpers';

const codeOf = async (
  run: () => Promise<unknown>,
): Promise<{ code?: string; retryable?: boolean; details?: unknown }> => {
  try {
    await run();
  } catch (error) {
    if (error instanceof PaymentSdkError) {
      return { code: error.code, retryable: error.retryable, details: error.details };
    }
    throw error;
  }
  return {};
};

describe('createSession (HyperPay)', () => {
  it('posts a form with the expected OPP parameters and returns the client checkout', async () => {
    const { http, requests } = scripted(() => reply(200, CHECKOUT_OK));
    const payments = hyperpayPayments(http);
    const session = await payments.createSession({
      ...SESSION,
      customer: {
        email: 'a@b.co',
        givenName: 'A',
        surname: 'B',
        phone: '+962791234567',
        ip: '10.1.1.1',
      },
    });
    const request = requests[0];
    expect(request).toMatchObject({
      method: 'POST',
      url: 'https://eu-test.oppwa.com/v1/checkouts',
      headers: {
        authorization: `Bearer ${TOKEN}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
    });
    const form = Object.fromEntries(new URLSearchParams(request?.body));
    expect(form).toEqual({
      entityId: ENTITY,
      amount: '12.500',
      currency: 'JOD',
      paymentType: 'DB',
      merchantTransactionId: 'draft-1',
      shopperResultUrl: 'wab://payment/result',
      'customParameters[idempotencyKey]': SESSION.idempotencyKey,
      integrity: 'true',
      'customer.email': 'a@b.co',
      'customer.givenName': 'A',
      'customer.surname': 'B',
      'customer.phone': '+962791234567',
      'customer.ip': '10.1.1.1',
    });
    expect(session).toEqual({
      sessionId: 'chk-1',
      status: 'PENDING',
      amountFils: 12_500,
      currency: 'JOD',
      reference: 'draft-1',
      client: {
        provider: 'hyperpay',
        environment: 'dev',
        checkoutId: 'chk-1',
        brands: ['VISA', 'MASTER'],
        shopperResultUrl: 'wab://payment/result',
        widgetScriptUrl: 'https://eu-test.oppwa.com/v1/paymentWidgets.js?checkoutId=chk-1',
        integrity: 'sha384-abc',
      },
    });
  });
  it('honours decimals, test mode, integrity off and custom brands', async () => {
    const { http, requests } = scripted(() => reply(200, { ...CHECKOUT_OK, integrity: undefined }));
    const payments = hyperpayPayments(http, {
      methods: ['CARD'],
      hyperpay: {
        entityId: ENTITY,
        accessToken: TOKEN,
        shopperResultUrl: 'https://app.example.com/r',
        amountDecimals: 2,
        testMode: 'EXTERNAL',
        integrity: false,
        brands: { CARD: ' MADA   VISA ' },
      },
    });
    const session = await payments.createSession(SESSION);
    const form = Object.fromEntries(new URLSearchParams(requests[0]?.body));
    expect(form).toMatchObject({ amount: '12.50', testMode: 'EXTERNAL' });
    expect(form).not.toHaveProperty('integrity');
    expect(session.client).toMatchObject({ brands: ['MADA', 'VISA'] });
    expect(session.client).not.toHaveProperty('integrity');
  });
  it('refuses amounts not representable with 2 decimals before calling the gateway', async () => {
    const { http, requests } = scripted(() => reply(200, CHECKOUT_OK));
    const payments = hyperpayPayments(http, {
      hyperpay: {
        entityId: ENTITY,
        accessToken: TOKEN,
        shopperResultUrl: 'wab://r',
        amountDecimals: 2,
      },
    });
    expect(
      (await codeOf(() => payments.createSession({ ...SESSION, amountFils: 12_505 }))).code,
    ).toBe(ERROR_CODES.VALIDATION_FAILED);
    expect(requests).toHaveLength(0);
  });
  it('needs brands for the chosen method', async () => {
    const { http } = scripted(() => reply(200, CHECKOUT_OK));
    const payments = hyperpayPayments(http, {
      methods: ['CARD', 'WALLET'],
    });
    expect(
      (await codeOf(() => payments.createSession({ ...SESSION, method: 'WALLET' }))).code,
    ).toBe(ERROR_CODES.METHOD_UNSUPPORTED);
  });
  it.each([
    [
      'unauthorized',
      reply(401, { result: { code: '800.900.300', description: 'x' } }),
      ERROR_CODES.AUTH_FAILED,
      false,
    ],
    ['forbidden', reply(403, 'nope'), ERROR_CODES.AUTH_FAILED, false],
    ['timeout status', reply(408, ''), ERROR_CODES.TIMEOUT, true],
    ['throttled', reply(429, ''), ERROR_CODES.RATE_LIMITED, true],
    ['bad gateway', reply(502, '<html>'), ERROR_CODES.GATEWAY_UNAVAILABLE, true],
    [
      'server error',
      reply(500, { result: { code: '800.500.100', description: 'x' } }),
      ERROR_CODES.GATEWAY_UNAVAILABLE,
      true,
    ],
    [
      'bad request: invalid parameter',
      reply(400, { result: { code: '200.300.404', description: 'invalid or missing parameter' } }),
      ERROR_CODES.VENDOR_ERROR,
      false,
    ],
    [
      'bad request: auth code',
      reply(400, { result: { code: '800.900.300', description: 'x' } }),
      ERROR_CODES.AUTH_FAILED,
      false,
    ],
    [
      'bad request: throttled code',
      reply(400, { result: { code: '800.120.100', description: 'x' } }),
      ERROR_CODES.RATE_LIMITED,
      true,
    ],
    ['bad request without result', reply(400, {}), ERROR_CODES.VENDOR_ERROR, false],
    ['other client error', reply(418, 'teapot'), ERROR_CODES.VENDOR_ERROR, false],
    ['not json', reply(200, 'oops'), ERROR_CODES.MALFORMED_RESPONSE, false],
    [
      'missing id',
      reply(200, { result: { code: '000.200.100', description: '' } }),
      ERROR_CODES.MALFORMED_RESPONSE,
      false,
    ],
    [
      'not created',
      reply(200, { id: 'x', result: { code: '100.100.101', description: 'bad card' } }),
      ERROR_CODES.VENDOR_ERROR,
      false,
    ],
    [
      'auth code in 200',
      reply(200, { id: 'x', result: { code: '800.900.301', description: 'sender' } }),
      ERROR_CODES.AUTH_FAILED,
      false,
    ],
  ])('maps %s', async (_name, response, code, retryable) => {
    const { http } = scripted(() => response);
    const payments = hyperpayPayments(http, { retry: { maxAttempts: 1 } });
    expect(await codeOf(() => payments.createSession(SESSION))).toMatchObject({ code, retryable });
  });
  it('retries a transient 503 and then succeeds', async () => {
    const { http, requests } = scripted(
      () => reply(503, ''),
      () => reply(200, CHECKOUT_OK),
    );
    const payments = hyperpayPayments(http);
    await expect(payments.createSession(SESSION)).resolves.toMatchObject({ sessionId: 'chk-1' });
    expect(requests).toHaveLength(2);
  });
});

describe('verify (HyperPay)', () => {
  const verify = (
    response: ReturnType<typeof reply>,
  ): ReturnType<ReturnType<typeof hyperpayPayments>['verify']> =>
    hyperpayPayments(scripted(() => response).http, { retry: { maxAttempts: 1 } }).verify('chk-1');

  it('queries the checkout payment with the entity id and normalizes a success', async () => {
    const { http, requests } = scripted(() => reply(200, paymentBody()));
    const result = await hyperpayPayments(http).verify('chk-1');
    expect(requests[0]).toMatchObject({
      method: 'GET',
      url: `https://eu-test.oppwa.com/v1/checkouts/chk-1/payment?entityId=${ENTITY}`,
    });
    expect(result).toMatchObject({
      sessionId: 'chk-1',
      status: 'SUCCEEDED',
      amountFils: 12_500,
      gatewayCode: '000.100.110',
      gatewayMessage: 'Request successfully processed',
      paymentId: 'pay-1',
      reference: 'draft-1',
    });
    expect(JSON.stringify(result.raw)).not.toContain('1111');
    expect(JSON.stringify(result.raw)).toContain('000.100.110');
  });
  it.each([
    ['000.000.000', 'SUCCEEDED'],
    ['000.100.112', 'SUCCEEDED'],
    ['000.300.000', 'SUCCEEDED'],
    ['000.600.000', 'SUCCEEDED'],
    ['000.400.110', 'SUCCEEDED'],
    ['000.400.000', 'PENDING'],
    ['000.400.100', 'PENDING'],
    ['000.200.000', 'PENDING'],
    ['000.200.001', 'PENDING'],
    ['800.400.500', 'PENDING'],
    ['100.396.101', 'CANCELLED'],
    ['100.396.103', 'CANCELLED'],
    ['100.396.201', 'CANCELLED'],
    ['100.396.104', 'UNKNOWN'],
    ['800.100.151', 'FAILED'],
    ['800.100.100', 'FAILED'],
    ['100.100.101', 'FAILED'],
    ['100.380.101', 'FAILED'],
    ['100.390.105', 'FAILED'],
    ['000.400.101', 'FAILED'],
    ['800.300.101', 'FAILED'],
    ['900.100.100', 'FAILED'],
    ['000.400.030', 'FAILED'],
    ['800.500.100', 'FAILED'],
    ['999.999.999', 'FAILED'],
    ['600.200.100', 'FAILED'],
    ['123.456.789', 'UNKNOWN'],
    ['000.999.999', 'UNKNOWN'],
  ])('maps result code %s to %s', async (code, status) => {
    const result = await verify(reply(200, paymentBody({ result: { code, description: 'd' } })));
    expect(result.status).toBe(status);
    expect(result.gatewayCode).toBe(code);
  });
  it.each([
    ['800.900.300', ERROR_CODES.AUTH_FAILED],
    ['800.120.100', ERROR_CODES.RATE_LIMITED],
    ['700.400.580', ERROR_CODES.SESSION_NOT_FOUND],
    ['200.100.101', ERROR_CODES.VENDOR_ERROR],
    ['100.600.500', ERROR_CODES.VENDOR_ERROR],
  ])('treats request-level code %s as an error', async (code, expected) => {
    const outcome = await codeOf(() =>
      verify(reply(200, paymentBody({ result: { code, description: 'd' } }))),
    );
    expect(outcome.code).toBe(expected);
  });
  it('treats "no payment yet" (200 or 404) as pending with amount 0', async () => {
    for (const status of [200, 404]) {
      const result = await verify(
        reply(status, {
          result: { code: '200.300.404', description: 'invalid or missing parameter' },
        }),
      );
      expect(result).toMatchObject({
        status: 'PENDING',
        amountFils: 0,
        gatewayCode: '200.300.404',
      });
    }
  });
  it('rejects a success in another currency, bad amounts and malformed bodies', async () => {
    expect((await codeOf(() => verify(reply(200, paymentBody({ currency: 'USD' }))))).code).toBe(
      ERROR_CODES.MALFORMED_RESPONSE,
    );
    expect((await codeOf(() => verify(reply(200, paymentBody({ amount: '1.2345' }))))).code).toBe(
      ERROR_CODES.MALFORMED_RESPONSE,
    );
    expect((await codeOf(() => verify(reply(200, { nothing: true })))).code).toBe(
      ERROR_CODES.MALFORMED_RESPONSE,
    );
  });
  it('lets a declined payment keep its original amount and omit ids', async () => {
    const result = await verify(
      reply(200, {
        amount: '5.000',
        currency: 'USD',
        result: { code: '800.100.151', description: 'declined' },
      }),
    );
    expect(result).toMatchObject({ status: 'FAILED', amountFils: 5000 });
    expect(result).not.toHaveProperty('paymentId');
  });
});

describe('result code helpers', () => {
  it('classifies and maps categories', () => {
    expect(classifyResult('000.100.110')).toBe('SUCCESS');
    expect(classifyResult('nonsense')).toBe('UNKNOWN');
    expect(paymentStatusOf('AUTH')).toBe('UNKNOWN');
    expect(refundStatusOf('SUCCESS')).toBe('REFUNDED');
    expect(refundStatusOf('REVIEW')).toBe('REFUND_PENDING');
    expect(refundStatusOf('PENDING')).toBe('REFUND_PENDING');
    expect(refundStatusOf('NO_PAYMENT')).toBe('REFUND_PENDING');
    expect(refundStatusOf('REJECTED')).toBe('REFUND_FAILED');
    expect(refundStatusOf('CANCELLED')).toBe('REFUND_FAILED');
    expect(refundStatusOf('COMMUNICATION')).toBe('REFUND_FAILED');
    expect(refundStatusOf('SYSTEM')).toBe('REFUND_FAILED');
    expect(refundStatusOf('UNCERTAIN')).toBe('UNKNOWN');
    expect(refundStatusOf('AUTH')).toBe('UNKNOWN');
    expect(requestErrorOf('SUCCESS')).toBeUndefined();
    expect(requestErrorOf('THROTTLED')).toMatchObject({ retryable: true });
  });
});

describe('fetchHttpClient', () => {
  const withServer = async (
    handler: Parameters<typeof createServer>[1],
    run: (url: string) => Promise<void>,
  ): Promise<void> => {
    const server = createServer(handler);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
      await run(`http://127.0.0.1:${String((server.address() as AddressInfo).port)}`);
    } finally {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
  };

  it('returns status and body for GET and POST', async () => {
    await withServer(
      (req, res) => {
        let body = '';
        req.on('data', (chunk: Buffer) => (body += chunk.toString()));
        req.on('end', () =>
          res.writeHead(201).end(`${req.method ?? ''}:${body}:${String(req.headers['x-test'])}`),
        );
      },
      async (url) => {
        expect(
          await fetchHttpClient({
            method: 'GET',
            url,
            headers: { 'x-test': 'a' },
            timeoutMs: 1000,
          }),
        ).toEqual({ status: 201, body: 'GET::a' });
        expect(
          await fetchHttpClient({
            method: 'POST',
            url,
            headers: { 'x-test': 'b' },
            body: 'k=v',
            timeoutMs: 1000,
          }),
        ).toEqual({ status: 201, body: 'POST:k=v:b' });
      },
    );
  });
  it('times out slow servers with a retryable TIMEOUT error', async () => {
    await withServer(
      () => undefined,
      async (url) => {
        expect(
          await codeOf(() => fetchHttpClient({ method: 'GET', url, headers: {}, timeoutMs: 30 })),
        ).toMatchObject({
          code: ERROR_CODES.TIMEOUT,
          retryable: true,
        });
      },
    );
  });
  it('reports unreachable hosts as retryable NETWORK_ERROR', async () => {
    let url = '';
    await withServer(
      () => undefined,
      (u) => {
        url = u;
        return Promise.resolve();
      },
    );
    expect(
      await codeOf(() => fetchHttpClient({ method: 'GET', url, headers: {}, timeoutMs: 500 })),
    ).toMatchObject({
      code: ERROR_CODES.NETWORK_ERROR,
      retryable: true,
    });
  });
});
