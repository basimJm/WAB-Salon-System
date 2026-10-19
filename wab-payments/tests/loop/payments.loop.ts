import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  createPayments,
  isPaymentSdkError,
  type PaymentProvider,
  type PaymentWebhookEvent,
} from '../../src';
import { startMockGateway } from '../../src/mock-gateway';

const ITERATIONS = 200;
const CONCURRENCY = 20;
const ENTITY = 'loop-entity';
const TOKEN = 'loop-token-value';
const KEY = '5a'.repeat(32);
const noSleep = { sleep: (): Promise<void> => Promise.resolve(), random: (): number => 0.5 };

/** Caller behaviour: a retryable failure is repeated with the SAME idempotency key. */
const untilDone = async <T>(run: () => Promise<T>): Promise<T> => {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      if (attempt > 8 || !isPaymentSdkError(error) || !error.retryable) throw error;
    }
  }
};

describe('payment flow loop (HyperPay adapter against the OPP mock)', () => {
  it('charges once per key, never over-refunds and treats webhook replays as no-ops', async () => {
    const events: PaymentWebhookEvent[] = [];
    const holder: { payments?: PaymentProvider } = {};
    const receiver = createServer((req, res) => {
      let body = '';
      req.on('data', (chunk: Buffer) => (body += chunk.toString()));
      req.on('end', () => {
        holder.payments
          ?.handleWebhook({
            rawBody: body,
            signature: String(req.headers['x-authentication-tag']),
            headers: { 'x-initialization-vector': String(req.headers['x-initialization-vector']) },
          })
          .then((event) => {
            events.push(event);
            res.writeHead(200).end();
          })
          .catch(() => res.writeHead(401).end());
      });
    });
    await new Promise<void>((resolve) => receiver.listen(0, '127.0.0.1', resolve));
    const hook = `http://127.0.0.1:${String((receiver.address() as AddressInfo).port)}/hook`;
    const mock = await startMockGateway({
      entityId: ENTITY,
      accessToken: TOKEN,
      webhook: { url: hook, keyHex: KEY },
    });
    holder.payments = createPayments({
      environment: 'dev',
      provider: 'mock-gateway',
      retryDeps: noSleep,
      mockGateway: {
        baseUrl: mock.url,
        entityId: ENTITY,
        accessToken: TOKEN,
        shopperResultUrl: 'wab://payment/result',
        webhookDecryptionKey: KEY,
      },
    });
    const gateway = holder.payments;

    const flow = async (i: number): Promise<void> => {
      const request = {
        idempotencyKey: `loop:session:${String(i)}`,
        amountFils: 10_000,
        reference: `draft-${String(i)}`,
      };
      // Duplicate concurrent calls with the same key must share one checkout.
      const [a, b] = await Promise.all([
        untilDone(() => gateway.createSession(request)),
        untilDone(() => gateway.createSession(request)),
      ]);
      expect(a.sessionId).toBe(b.sessionId);
      await mock.settle(a.sessionId, 'success');
      const verified = await untilDone(() => gateway.verify(a.sessionId));
      expect(verified).toMatchObject({ status: 'SUCCEEDED', amountFils: 10_000 });

      const refund = (n: number, amountFils: number): ReturnType<PaymentProvider['refund']> =>
        untilDone(() =>
          gateway.refund({
            idempotencyKey: `loop:refund:${String(i)}:${String(n)}`,
            sessionId: a.sessionId,
            amountFils,
          }),
        );
      await refund(1, 6_000);
      await expect(refund(2, 4_001)).rejects.toMatchObject({ code: 'PAYMENT_REFUND_EXCEEDS' });
      const last = await refund(3, 4_000);
      expect(last.status).toBe('REFUNDED');
      // The same key again returns the same refund and moves no money.
      expect((await refund(3, 4_000)).refundId).toBe(last.refundId);
    };

    try {
      for (let start = 0; start < ITERATIONS; start += CONCURRENCY) {
        mock.injectHttpFailures(503, 502, 429);
        await Promise.all(
          Array.from({ length: Math.min(CONCURRENCY, ITERATIONS - start) }, (_, k) =>
            flow(start + k),
          ),
        );
      }

      const records = [...mock.state.payments.values()];
      expect(mock.state.checkouts.size).toBe(ITERATIONS);
      expect(records.filter((p) => p.paymentType === 'DB')).toHaveLength(ITERATIONS);
      const refunds = records.filter((p) => p.paymentType === 'RF');
      expect(refunds).toHaveLength(ITERATIONS * 2);
      for (const original of records.filter((p) => p.paymentType === 'DB')) {
        const total = refunds
          .filter((r) => r.referencedId === original.id)
          .reduce((sum, r) => sum + Math.round(Number(r.amount) * 1000), 0);
        expect(total).toBeLessThanOrEqual(10_000);
      }

      // Re-delivering every payment notification is a replay, never a second effect.
      const before = events.filter((e) => !e.replayed).length;
      for (const original of records.filter((p) => p.paymentType === 'DB')) {
        await mock.deliverWebhook(original.id);
      }
      expect(events.filter((e) => !e.replayed)).toHaveLength(before);
      expect(events.filter((e) => e.replayed)).toHaveLength(ITERATIONS);
      expect(events.filter((e) => e.kind === 'PAYMENT' && !e.replayed)).toHaveLength(ITERATIONS);
      expect(events.filter((e) => e.kind === 'REFUND' && !e.replayed)).toHaveLength(ITERATIONS * 2);
    } finally {
      await gateway.close();
      await mock.close();
      receiver.closeAllConnections();
      await new Promise((resolve) => receiver.close(resolve));
    }
  });
});
