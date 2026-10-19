import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { createPaymentsService } from '../src/domain/payments/payments.service';
import { requireAuth } from '../src/middlewares/auth';
import { DisabledPaymentProvider } from '../src/providers/payments';
import { BookingDraftsRepository } from '../src/repositories/bookingDrafts.repository';
import { CustomersRepository } from '../src/repositories/identity.repository';
import { TransactionsRepository } from '../src/repositories/transactions.repository';
import { signAccessToken } from '../src/utils/auth/accessToken';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const SECRET = 'a'.repeat(48);
const NOW = new Date('2026-10-12T08:00:00Z');
const HTTP_UNAVAILABLE = 503;
const HTTP_UNAUTHORIZED = 401;
const m = { drafts: createFakeModel(), customers: createFakeModel(), tx: createFakeModel() };
const me = new Types.ObjectId();
const draftId = new Types.ObjectId();

const app = createApp({
  logger: createLogger({ level: 'silent' }),
  services: {
    payments: createPaymentsService({
      transactions: new TransactionsRepository(m.tx.model as never),
      drafts: new BookingDraftsRepository(m.drafts.model as never),
      customers: new CustomersRepository(m.customers.model as never),
      provider: new DisabledPaymentProvider(),
      providerName: 'disabled',
      logger: createLogger({ level: 'silent' }),
      onSettled: { settled: () => Promise.resolve() },
      now: () => NOW,
    }),
    installations: {
      service: undefined as never,
      customerOptional: requireAuth('customer', SECRET),
      customerRequired: requireAuth('customer', SECRET),
      merchantRequired: requireAuth('merchant', SECRET),
    },
  },
});

const bearer = `Bearer ${
  signAccessToken({
    secret: SECRET,
    subjectType: 'CUSTOMER',
    subjectId: me.toHexString(),
    ttlSec: 600,
  }).token
}`;

beforeEach(() => {
  for (const model of Object.values(m)) model.docs.length = 0;
  m.customers.docs.push({ _id: me, status: 'ACTIVE' });
  m.drafts.docs.push({
    _id: draftId,
    customerId: me,
    salonId: new Types.ObjectId(),
    totals: { total: 10_000, dueOnline: 2_000 },
    paymentMethod: 'DEPOSIT',
    otpVerifiedAt: NOW,
    expiresAt: new Date(NOW.getTime() + 600_000),
  });
});

describe('payments are paused', () => {
  it('starting a payment answers 503 and leaves no transaction or draft link behind', async () => {
    const res = await request(app)
      .post('/customer/v1/payments')
      .set('Authorization', bearer)
      .send({ draftId: draftId.toHexString(), platform: 'ANDROID', appVersion: '1.0.0' });
    expect(res.status).toBe(HTTP_UNAVAILABLE);
    expect(m.tx.docs).toHaveLength(0);
    expect(m.drafts.docs[0]?.['transactionId']).toBeUndefined();
  });

  it('a gateway webhook is never trusted', async () => {
    const res = await request(app)
      .post('/webhooks/payments')
      .set('Content-Type', 'application/json')
      .set('X-Signature', 'anything')
      .send(JSON.stringify({ sessionId: 's', status: 'SUCCEEDED' }));
    expect(res.status).toBe(HTTP_UNAUTHORIZED);
  });
});
