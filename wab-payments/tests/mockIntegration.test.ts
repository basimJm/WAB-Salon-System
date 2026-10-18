import { createPayments, type PaymentProvider } from '../src';
import { startMockGateway, type MockGateway } from '../src/mock-gateway';
import { HyperPayGateway } from '../src/hyperpay/gateway';
import { ENTITY, TOKEN, WEBHOOK_KEY } from './hyperpayHelpers';
import { SESSION } from './helpers';

let mock: MockGateway;
let payments: PaymentProvider;
beforeEach(async () => {
  mock = await startMockGateway({ entityId: ENTITY, accessToken: TOKEN });
  payments = createPayments({
    environment: 'dev',
    provider: 'mock-gateway',
    mockGateway: {
      baseUrl: mock.url,
      entityId: ENTITY,
      accessToken: TOKEN,
      shopperResultUrl: 'wab://payment/result',
      webhookDecryptionKey: WEBHOOK_KEY,
    },
  });
});
afterEach(async () => {
  await payments.close();
  await mock.close();
});

describe('mock-gateway provider (HyperPay adapter against the local OPP mock)', () => {
  it('creates a session with a hosted pay page and verifies each outcome', async () => {
    const session = await payments.createSession(SESSION);
    expect(session.client).toMatchObject({
      provider: 'mock-gateway',
      checkoutUrl: `${mock.url}/checkout/${encodeURIComponent(session.sessionId)}`,
    });
    expect((await payments.verify(session.sessionId)).status).toBe('PENDING');
    for (const [outcome, status] of [
      ['pending', 'PENDING'],
      ['fail', 'FAILED'],
      ['cancel', 'CANCELLED'],
      ['success', 'SUCCEEDED'],
    ] as const) {
      await mock.settle(session.sessionId, outcome);
      expect((await payments.verify(session.sessionId)).status).toBe(status);
    }
  });
  it('rejects wrong credentials as an auth failure', async () => {
    const wrong = createPayments({
      environment: 'dev',
      provider: 'mock-gateway',
      mockGateway: {
        baseUrl: mock.url,
        entityId: ENTITY,
        accessToken: 'wrong',
        shopperResultUrl: 'wab://r',
      },
    });
    await expect(wrong.createSession(SESSION)).rejects.toMatchObject({
      code: 'PAYMENT_AUTH_FAILED',
    });
  });
  it('survives injected gateway outages through retries', async () => {
    mock.injectHttpFailures(503, 502);
    await expect(payments.createSession(SESSION)).resolves.toMatchObject({ status: 'PENDING' });
  });
  it('has not built webhooks yet (PAY-007)', async () => {
    const gateway = new HyperPayGateway({} as never);
    await expect(gateway.parseWebhook()).rejects.toThrow('not available yet');
  });
});
