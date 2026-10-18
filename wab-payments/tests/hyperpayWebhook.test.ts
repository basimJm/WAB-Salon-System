import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  createPayments,
  ERROR_CODES,
  PaymentSdkError,
  type PaymentProvider,
  type PaymentWebhookEvent,
} from '../src';
import { MemorySessionDirectory } from '../src/directory';
import { encryptNotification } from '../src/hyperpay/crypto';
import { startMockGateway, type MockGateway } from '../src/mock-gateway';
import { SESSION } from './helpers';
import {
  ENTITY,
  TOKEN,
  WEBHOOK_KEY,
  hyperpayPayments,
  paymentBody,
  scripted,
  reply,
} from './hyperpayHelpers';

const seal = (
  type: string,
  payload: unknown,
  key = WEBHOOK_KEY,
): { rawBody: string; signature: string; headers: Record<string, string> } => {
  const sealed = encryptNotification(JSON.stringify({ type, payload }), key);
  return {
    rawBody: sealed.body,
    signature: sealed.tag,
    headers: { 'X-Initialization-Vector': sealed.iv, 'x-authentication-tag': sealed.tag },
  };
};
const payments = (extra = {}): PaymentProvider =>
  hyperpayPayments(scripted(() => reply(200, {})).http, extra);
const codeOf = async (run: () => Promise<unknown>): Promise<string | undefined> => {
  try {
    await run();
  } catch (error) {
    return error instanceof PaymentSdkError ? error.code : 'other';
  }
  return undefined;
};

describe('HyperPay webhooks', () => {
  it('decrypts a payment notification and normalizes it', async () => {
    const event = await payments().handleWebhook(seal('PAYMENT', paymentBody()));
    expect(event).toMatchObject({
      kind: 'PAYMENT',
      sessionId: 'chk-1',
      status: 'SUCCEEDED',
      gatewayCode: '000.100.110',
      paymentId: 'pay-1',
      reference: 'draft-1',
      amountFils: 12_500,
      replayed: false,
    });
    expect(event.eventId).toHaveLength(64);
  });
  it('accepts the JSON-wrapped form and a signature passed only as the tag', async () => {
    const sealed = seal('PAYMENT', paymentBody());
    const wrapped = {
      rawBody: JSON.stringify({ encryptedBody: sealed.rawBody }),
      signature: sealed.signature,
      headers: { 'x-initialization-vector': sealed.headers['X-Initialization-Vector'] ?? '' },
    };
    await expect(payments().handleWebhook(wrapped)).resolves.toMatchObject({
      kind: 'PAYMENT',
      status: 'SUCCEEDED',
    });
  });
  it.each([
    ['000.200.000', 'PENDING'],
    ['800.100.151', 'FAILED'],
    ['100.396.101', 'CANCELLED'],
    ['123.456.789', 'UNKNOWN'],
  ])('maps notification code %s to %s', async (code, status) => {
    const event = await payments().handleWebhook(
      seal('PAYMENT', paymentBody({ result: { code, description: 'd' } })),
    );
    expect(event.status).toBe(status);
  });
  it('resolves the checkout through the directory when ndc is missing, and remembers captures', async () => {
    const directory = new MemorySessionDirectory();
    await directory.put('chk-9', { paymentId: 'pay-1' });
    const event = await payments({ directory }).handleWebhook(
      seal('PAYMENT', paymentBody({ ndc: undefined })),
    );
    expect(event.sessionId).toBe('chk-9');
    const fresh = new MemorySessionDirectory();
    await payments({ directory: fresh }).handleWebhook(seal('PAYMENT', paymentBody()));
    await expect(fresh.get('chk-1')).resolves.toEqual({ paymentId: 'pay-1' });
  });
  it('rejects authentic payments it cannot attach to a checkout', async () => {
    expect(
      await codeOf(() =>
        payments().handleWebhook(seal('PAYMENT', paymentBody({ ndc: undefined }))),
      ),
    ).toBe(ERROR_CODES.MALFORMED_RESPONSE);
    expect(
      await codeOf(() =>
        payments().handleWebhook(seal('PAYMENT', paymentBody({ ndc: undefined, id: undefined }))),
      ),
    ).toBe(ERROR_CODES.MALFORMED_RESPONSE);
  });
  it('normalizes refund notifications', async () => {
    const directory = new MemorySessionDirectory();
    await directory.put('chk-1', { paymentId: 'pay-1' });
    const refund = paymentBody({
      id: 'rf-1',
      paymentType: 'RF',
      referencedId: 'pay-1',
      amount: '5.000',
    });
    await expect(
      payments({ directory }).handleWebhook(seal('PAYMENT', refund)),
    ).resolves.toMatchObject({
      kind: 'REFUND',
      sessionId: 'chk-1',
      refundStatus: 'REFUNDED',
      paymentId: 'rf-1',
      amountFils: 5000,
    });
    await expect(payments().handleWebhook(seal('PAYMENT', refund))).resolves.toMatchObject({
      sessionId: 'pay-1',
    });
    expect(
      await codeOf(() =>
        payments().handleWebhook(seal('PAYMENT', { ...refund, referencedId: undefined })),
      ),
    ).toBe(ERROR_CODES.MALFORMED_RESPONSE);
  });
  it('acknowledges other notification types without side effects', async () => {
    const event = await payments().handleWebhook(seal('REGISTRATION', { id: 'x' }));
    expect(event).toMatchObject({ kind: 'IGNORED', sessionId: '', status: 'UNKNOWN' });
    expect((await payments().handleWebhook(seal('test', {}))).kind).toBe('IGNORED');
  });
  it('tolerates a payload with an unreadable amount', async () => {
    const event = await payments().handleWebhook(seal('PAYMENT', paymentBody({ amount: 'abc' })));
    expect(event).not.toHaveProperty('amountFils');
  });
  it('flags replays of the same notification, even with a different IV', async () => {
    const p = payments();
    const first = await p.handleWebhook(seal('PAYMENT', paymentBody()));
    const second = await p.handleWebhook(seal('PAYMENT', paymentBody()));
    expect(first.replayed).toBe(false);
    expect(second).toMatchObject({ eventId: first.eventId, replayed: true });
    const other = await p.handleWebhook(
      seal('PAYMENT', paymentBody({ result: { code: '800.100.151', description: 'x' } })),
    );
    expect(other.replayed).toBe(false);
  });
  it('rejects forged, corrupt and misconfigured notifications', async () => {
    const good = seal('PAYMENT', paymentBody());
    const wrongKey = seal('PAYMENT', paymentBody(), 'cd'.repeat(32));
    const noIv = { rawBody: good.rawBody, signature: good.signature };
    const jsonNotEncrypted = { ...good, rawBody: '{"hello":"world"}' };
    const brokenJson = { ...good, rawBody: '{broken' };
    const plainNotJson = encryptNotification('not json', WEBHOOK_KEY);
    const noType = encryptNotification('{"payload":{}}', WEBHOOK_KEY);
    const badPayload = seal('PAYMENT', { result: 5 });
    const cases = [
      {
        ...good,
        signature: '',
        headers: { 'x-initialization-vector': good.headers['X-Initialization-Vector'] ?? '' },
      },
      wrongKey,
      noIv,
      jsonNotEncrypted,
      brokenJson,
      {
        rawBody: plainNotJson.body,
        signature: plainNotJson.tag,
        headers: { 'x-initialization-vector': plainNotJson.iv },
      },
      {
        rawBody: noType.body,
        signature: noType.tag,
        headers: { 'x-initialization-vector': noType.iv },
      },
      badPayload,
    ];
    for (const input of cases) {
      expect(await codeOf(() => payments().handleWebhook(input))).toBe(ERROR_CODES.WEBHOOK_INVALID);
    }
    const noKey = hyperpayPayments(scripted(() => reply(200, {})).http, {
      hyperpay: { entityId: ENTITY, accessToken: TOKEN, shopperResultUrl: 'wab://r' },
    });
    expect(await codeOf(() => noKey.handleWebhook(good))).toBe(ERROR_CODES.WEBHOOK_INVALID);
  });
  it('never caches a rejected notification', async () => {
    const p = payments();
    const good = seal('PAYMENT', paymentBody());
    expect(
      await codeOf(() => p.handleWebhook({ ...good, rawBody: `00${good.rawBody.slice(2)}` })),
    ).toBe(ERROR_CODES.WEBHOOK_INVALID);
    await expect(p.handleWebhook(good)).resolves.toMatchObject({ replayed: false });
  });
});

describe('webhook end to end with the OPP mock', () => {
  let mock: MockGateway;
  let receiver: Server;
  let provider: PaymentProvider;
  const events: PaymentWebhookEvent[] = [];
  beforeEach(async () => {
    events.length = 0;
    receiver = createServer((req, res) => {
      let body = '';
      req.on('data', (chunk: Buffer) => (body += chunk.toString()));
      req.on('end', () => {
        provider
          .handleWebhook({
            rawBody: body,
            signature: String(req.headers['x-authentication-tag']),
            headers: Object.fromEntries(
              Object.entries(req.headers).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
            ),
          })
          .then((event) => {
            events.push(event);
            res.writeHead(200).end();
          })
          .catch(() => res.writeHead(401).end());
      });
    });
    await new Promise<void>((resolve) => receiver.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${String((receiver.address() as AddressInfo).port)}/hook`;
    mock = await startMockGateway({
      entityId: ENTITY,
      accessToken: TOKEN,
      webhook: { url, keyHex: WEBHOOK_KEY },
    });
    provider = createPayments({
      environment: 'dev',
      provider: 'mock-gateway',
      mockGateway: {
        baseUrl: mock.url,
        entityId: ENTITY,
        accessToken: TOKEN,
        shopperResultUrl: 'wab://r',
        webhookDecryptionKey: WEBHOOK_KEY,
      },
    });
  });
  afterEach(async () => {
    await provider.close();
    await mock.close();
    receiver.closeAllConnections();
    await new Promise((resolve) => receiver.close(resolve));
  });

  it('delivers a settled payment and refund, and flags a re-delivery', async () => {
    const session = await provider.createSession(SESSION);
    const payment = await mock.settle(session.sessionId, 'success');
    expect(events[0]).toMatchObject({
      kind: 'PAYMENT',
      sessionId: session.sessionId,
      status: 'SUCCEEDED',
      replayed: false,
    });
    expect(await mock.deliverWebhook(payment.id)).toBe(200);
    expect(events[1]).toMatchObject({ eventId: events[0]?.eventId, replayed: true });
    const refund = await provider.refund({
      idempotencyKey: 'refund-key-1',
      sessionId: session.sessionId,
      amountFils: 1000,
    });
    expect(events[2]).toMatchObject({
      kind: 'REFUND',
      sessionId: session.sessionId,
      refundStatus: 'REFUNDED',
    });
    expect(refund.status).toBe('REFUNDED');
  });
  it('answers 401 to a notification encrypted with another key', async () => {
    await mock.close();
    mock = await startMockGateway({
      entityId: ENTITY,
      accessToken: TOKEN,
      webhook: {
        url: `http://127.0.0.1:${String((receiver.address() as AddressInfo).port)}/hook`,
        keyHex: 'ee'.repeat(32),
      },
    });
    const { id } = mock.state.createCheckout({
      entityId: ENTITY,
      amount: '1.000',
      currency: 'JOD',
      paymentType: 'DB',
      merchantTransactionId: 'r',
    });
    await mock.settle(id, 'success');
    expect(events).toHaveLength(0);
  });
});
