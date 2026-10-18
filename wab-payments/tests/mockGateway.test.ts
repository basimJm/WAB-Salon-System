import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { decryptNotification } from '../src/hyperpay/crypto';
import { startMockGateway, MockState, type MockGateway } from '../src/mock-gateway';
import { checkoutPage } from '../src/mock-gateway/page';

const ENTITY = 'entity-test';
const TOKEN = 'token-test-value';
const KEY = 'ab'.repeat(32);
const AUTH = { authorization: `Bearer ${TOKEN}` };
const FORM = { 'content-type': 'application/x-www-form-urlencoded' };

let gateway: MockGateway;
beforeEach(async () => {
  gateway = await startMockGateway({ entityId: ENTITY, accessToken: TOKEN });
});
afterEach(async () => {
  await gateway.close();
});

const post = async (
  path: string,
  form: Record<string, string>,
  headers: Record<string, string> = AUTH,
): Promise<{ status: number; json: Record<string, unknown> }> => {
  const response = await fetch(`${gateway.url}${path}`, {
    method: 'POST',
    headers: { ...FORM, ...headers },
    body: new URLSearchParams(form).toString(),
  });
  return { status: response.status, json: (await response.json()) as Record<string, unknown> };
};
const get = async (
  path: string,
  headers: Record<string, string> = AUTH,
): Promise<{ status: number; json: Record<string, unknown> }> => {
  const response = await fetch(`${gateway.url}${path}`, { headers });
  return { status: response.status, json: (await response.json()) as Record<string, unknown> };
};
const checkout = async (extra: Record<string, string> = {}): Promise<string> => {
  const { json } = await post('/v1/checkouts', {
    entityId: ENTITY,
    amount: '12.500',
    currency: 'JOD',
    paymentType: 'DB',
    merchantTransactionId: 'ref-1',
    ...extra,
  });
  return json.id as string;
};

describe('mock gateway checkouts', () => {
  it('creates a checkout (with integrity on request)', async () => {
    const { status, json } = await post('/v1/checkouts', {
      entityId: ENTITY,
      amount: '1.000',
      currency: 'JOD',
      merchantTransactionId: 'r',
      integrity: 'true',
    });
    expect(status).toBe(200);
    expect(json).toMatchObject({
      result: { code: '000.200.100' },
      integrity: 'sha384-mock-integrity',
    });
    expect(gateway.state.checkouts.get(json.id as string)?.paymentType).toBe('DB');
  });
  it('rejects bad credentials, wrong entity and missing parameters', async () => {
    const bad = await post('/v1/checkouts', { entityId: ENTITY }, { authorization: 'Bearer nope' });
    expect(bad).toMatchObject({ status: 401, json: { result: { code: '800.900.300' } } });
    const wrong = await post('/v1/checkouts', {
      entityId: 'other',
      amount: '1',
      currency: 'JOD',
      merchantTransactionId: 'r',
    });
    expect(wrong.status).toBe(401);
    const missing = await post('/v1/checkouts', {
      entityId: ENTITY,
      currency: 'JOD',
      merchantTransactionId: 'r',
    });
    expect(missing).toMatchObject({ status: 400, json: { parameterErrors: [{ name: 'amount' }] } });
  });
  it('reports unpaid, pending, success, failure and cancellation', async () => {
    const id = await checkout();
    const status = (): Promise<{ status: number; json: Record<string, unknown> }> =>
      get(`/v1/checkouts/${id}/payment?entityId=${ENTITY}`);
    expect((await status()).json).toMatchObject({ result: { code: '200.300.404' } });
    for (const [outcome, code] of [
      ['pending', '000.200.000'],
      ['fail', '800.100.151'],
      ['cancel', '100.396.101'],
      ['success', '000.100.110'],
    ] as const) {
      await gateway.settle(id, outcome);
      const { json } = await status();
      expect(json).toMatchObject({
        result: { code },
        amount: '12.500',
        merchantTransactionId: 'ref-1',
        ndc: id,
      });
    }
    expect(gateway.state.payments.size).toBe(1);
  });
  it('answers 404 for unknown checkouts and entity mismatches', async () => {
    expect((await get(`/v1/checkouts/nope/payment?entityId=${ENTITY}`)).status).toBe(404);
    expect((await get('/v1/checkouts/nope/payment?entityId=zzz')).status).toBe(401);
    expect((await get(`/v1/checkouts/x/payment?entityId=${ENTITY}`, {})).status).toBe(401);
  });
  it('serves the hosted page and redirects to the shopper result url', async () => {
    const id = await checkout({ shopperResultUrl: 'wab://payment/result' });
    const page = await fetch(`${gateway.url}/checkout/${id}`);
    expect(await page.text()).toContain('Pay (success)');
    const redirect = await fetch(`${gateway.url}/checkout/${id}/success`, {
      method: 'POST',
      redirect: 'manual',
    });
    expect(redirect.status).toBe(303);
    expect(redirect.headers.get('location')).toBe(
      `wab://payment/result?id=${id}&resourcePath=${encodeURIComponent(`/v1/checkouts/${id}/payment`)}`,
    );
    expect(gateway.state.paymentOfCheckout(id)?.result.code).toBe('000.100.110');
  });
  it('appends to an existing query string and handles pages without a return url', async () => {
    const withQuery = await checkout({ shopperResultUrl: 'https://app.example.com/r?x=1' });
    const r = await fetch(`${gateway.url}/checkout/${withQuery}/fail`, {
      method: 'POST',
      redirect: 'manual',
    });
    expect(r.headers.get('location')).toContain('/r?x=1&id=');
    const bare = await checkout();
    const done = await fetch(`${gateway.url}/checkout/${bare}/cancel`, { method: 'POST' });
    expect(await done.text()).toBe('done');
  });
  it('404s unknown pages, unknown outcomes and unknown routes', async () => {
    expect((await fetch(`${gateway.url}/checkout/zzz`)).status).toBe(404);
    const id = await checkout();
    expect((await fetch(`${gateway.url}/checkout/${id}/explode`, { method: 'POST' })).status).toBe(
      404,
    );
    expect((await fetch(`${gateway.url}/elsewhere`)).status).toBe(404);
    expect((await get('/v1/unknown')).status).toBe(404);
    expect(
      await (await fetch(`${gateway.url}/v1/paymentWidgets.js?checkoutId=${id}`)).text(),
    ).toContain('mock');
  });
  it('answers 400 to oversized bodies', async () => {
    const response = await post('/v1/checkouts', { entityId: ENTITY, blob: 'x'.repeat(70_000) });
    expect(response.status).toBe(400);
  });
  it('settling an unknown checkout throws', async () => {
    await expect(gateway.settle('nope', 'success')).rejects.toThrow(RangeError);
  });
});

describe('mock gateway refunds and queries', () => {
  const paid = async (): Promise<string> => {
    const id = await checkout();
    return (await gateway.settle(id, 'success')).id;
  };
  const refund = (
    paymentId: string,
    amount: string,
    extra: Record<string, string> = {},
  ): ReturnType<typeof post> =>
    post(`/v1/payments/${paymentId}`, {
      entityId: ENTITY,
      amount,
      currency: 'JOD',
      paymentType: 'RF',
      merchantTransactionId: 'rf-1',
      ...extra,
    });

  it('refunds partially up to the captured amount', async () => {
    const paymentId = await paid();
    const first = await refund(paymentId, '10.000');
    expect(first.json).toMatchObject({
      paymentType: 'RF',
      referencedId: paymentId,
      result: { code: '000.100.110' },
    });
    const over = await refund(paymentId, '2.501');
    expect(over.json).toMatchObject({ result: { code: '700.400.200' } });
    expect((await refund(paymentId, '2.500')).json).toMatchObject({
      result: { code: '000.100.110' },
    });
    const original = await get(`/v1/payments/${paymentId}?entityId=${ENTITY}`);
    expect(original.json).toMatchObject({ id: paymentId });
  });
  it('refuses refunds of unknown or uncaptured payments and bad requests', async () => {
    expect((await refund('nope', '1.000')).json).toMatchObject({ result: { code: '700.400.580' } });
    const id = await checkout();
    const failed = (await gateway.settle(id, 'fail')).id;
    expect((await refund(failed, '1.000')).json).toMatchObject({ result: { code: '700.400.700' } });
    expect((await refund(failed, '1.000', { entityId: 'zzz' })).status).toBe(401);
    expect((await refund(failed, '1.000', { paymentType: 'DB' })).status).toBe(400);
    expect(
      (
        await post(`/v1/payments/${failed}`, {
          entityId: ENTITY,
          paymentType: 'RF',
          currency: 'JOD',
        })
      ).status,
    ).toBe(400);
  });
  it('queries by merchant transaction id', async () => {
    const paymentId = await paid();
    await refund(paymentId, '1.000');
    const found = await get(`/v1/query?entityId=${ENTITY}&merchantTransactionId=ref-1`);
    expect(found.json.records).toHaveLength(1);
    expect(
      (await get(`/v1/query?entityId=${ENTITY}&merchantTransactionId=rf-1`)).json,
    ).toMatchObject({
      records: [{ paymentType: 'RF' }],
    });
    expect((await get(`/v1/query?entityId=${ENTITY}&merchantTransactionId=none`)).status).toBe(404);
    expect((await get(`/v1/query?entityId=${ENTITY}`)).status).toBe(400);
    expect((await get('/v1/query?entityId=zzz&merchantTransactionId=a')).status).toBe(401);
    expect((await get(`/v1/payments/nope?entityId=${ENTITY}`)).status).toBe(404);
    expect((await get('/v1/payments/nope?entityId=zzz')).status).toBe(401);
  });
  it('injects http failures once each', async () => {
    gateway.injectHttpFailures(503, 429);
    expect((await get(`/v1/payments/x?entityId=${ENTITY}`)).status).toBe(503);
    expect((await get(`/v1/payments/x?entityId=${ENTITY}`)).status).toBe(429);
    expect((await get(`/v1/payments/x?entityId=${ENTITY}`)).status).toBe(404);
  });
});

describe('mock gateway webhooks', () => {
  let receiver: Server;
  let received: { body: string; headers: Record<string, string | string[] | undefined> }[];
  let url: string;
  beforeEach(async () => {
    received = [];
    receiver = createServer((req, res) => {
      let body = '';
      req.on('data', (chunk: Buffer) => (body += chunk.toString()));
      req.on('end', () => {
        received.push({ body, headers: req.headers });
        res.writeHead(200).end();
      });
    });
    await new Promise<void>((resolve) => receiver.listen(0, '127.0.0.1', resolve));
    url = `http://127.0.0.1:${String((receiver.address() as AddressInfo).port)}/hook`;
    await gateway.close();
    gateway = await startMockGateway({
      entityId: ENTITY,
      accessToken: TOKEN,
      webhook: { url, keyHex: KEY },
    });
  });
  afterEach(async () => {
    receiver.closeAllConnections();
    await new Promise((resolve) => receiver.close(resolve));
  });

  it('sends an encrypted notification that the right key decrypts', async () => {
    const id = await checkout();
    const payment = await gateway.settle(id, 'success');
    expect(received).toHaveLength(1);
    const { body, headers } = received[0] ?? { body: '', headers: {} };
    const plain = decryptNotification(
      {
        body,
        iv: String(headers['x-initialization-vector']),
        tag: String(headers['x-authentication-tag']),
      },
      KEY,
    );
    expect(JSON.parse(plain)).toMatchObject({
      type: 'PAYMENT',
      payload: { id: payment.id, ndc: id },
    });
    expect(await gateway.deliverWebhook(payment.id)).toBe(200);
    expect(received).toHaveLength(2);
  });
  it('also notifies refunds, and returns undefined for unknown payments or dead receivers', async () => {
    const paymentId = (await gateway.settle(await checkout(), 'success')).id;
    await post(`/v1/payments/${paymentId}`, {
      entityId: ENTITY,
      amount: '1.000',
      currency: 'JOD',
      paymentType: 'RF',
      merchantTransactionId: 'rf',
    });
    expect(received).toHaveLength(2);
    expect(await gateway.deliverWebhook('nope')).toBeUndefined();
    await new Promise((resolve) => receiver.close(resolve));
    expect(await gateway.deliverWebhook(paymentId)).toBeUndefined();
  });
  it('sends nothing when no webhook is configured', async () => {
    const quiet = await startMockGateway({ entityId: ENTITY, accessToken: TOKEN });
    expect(await quiet.deliverWebhook('x')).toBeUndefined();
    await quiet.close();
  });
});

describe('mock state and page', () => {
  it('uses injected clock and ids and formats timestamps', () => {
    let n = 0;
    const state = new MockState({
      now: () => new Date('2026-10-18T10:00:00.123Z'),
      newId: () => `id${String(++n)}`,
    });
    expect(state.timestamp()).toBe('2026-10-18 10:00:00+0000');
    const c = state.createCheckout({
      entityId: 'e',
      amount: '1',
      currency: 'JOD',
      paymentType: 'DB',
      merchantTransactionId: 'm',
    });
    expect(c.id).toBe('id1.mock');
    expect(state.complete('missing', 'success')).toBeUndefined();
    expect(state.paymentOfCheckout('missing')).toBeUndefined();
  });
  it('escapes html in the pay page', () => {
    expect(checkoutPage({ checkoutId: 'a b', amount: '<1>', currency: '"J"' })).not.toContain(
      '<1>',
    );
  });
  it('reports a port that is already taken', async () => {
    const first = await startMockGateway({ entityId: ENTITY, accessToken: TOKEN });
    const port = Number(new URL(first.url).port);
    await expect(
      startMockGateway({ entityId: ENTITY, accessToken: TOKEN, port }),
    ).rejects.toThrow();
    await first.close();
  });
});
