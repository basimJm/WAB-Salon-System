import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { createAlertInbox } from '../src/domain/alerts/alertInbox.service';
import { requireAuth } from '../src/middlewares/auth';
import { FakeNotifier } from '../src/providers/notifier';
import { AdminsRepository } from '../src/repositories/identity.repository';
import { AlertsRepository } from '../src/repositories/alerts.repository';
import { signAccessToken } from '../src/utils/auth/accessToken';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const SECRET = 'a'.repeat(48);
const NOW = new Date('2026-10-13T12:00:00.000Z');
const ago = (min: number): Date => new Date(NOW.getTime() - min * 60_000);
const alertsM = createFakeModel();
const adminsM = createFakeModel();
const notifier = new FakeNotifier();
let failMail = false;
const realSend = notifier.sendEmail.bind(notifier);
const sent: { to: readonly string[]; subject: string; text: string }[] = [];
notifier.sendEmail = (req) => {
  if (failMail) return Promise.reject(new Error('smtp down'));
  sent.push({ to: req.to, subject: req.subject, text: req.text });
  return realSend(req);
};
const inbox = createAlertInbox({
  alerts: new AlertsRepository(alertsM.model as never),
  admins: new AdminsRepository(adminsM.model as never),
  notifier,
  logger,
});
const app = createApp({
  logger,
  services: { adminGuard: requireAuth('admin', SECRET), adminAlerts: inbox },
});
const token = (type: 'ADMIN' | 'CUSTOMER' = 'ADMIN'): string =>
  `Bearer ${signAccessToken({ secret: SECRET, subjectType: type, subjectId: new Types.ObjectId().toHexString(), ttlSec: 600 }).token}`;
interface Body {
  data: unknown;
  meta?: { total: number };
}
const bodyOf = (res: { body: unknown }): Body => res.body as Body;
const add = (over: Record<string, unknown>): Types.ObjectId => {
  const _id = new Types.ObjectId();
  alertsM.docs.push({
    _id,
    kind: 'REVIEW_PENDING',
    severity: 'INFO',
    title: 't',
    data: {},
    status: 'NEW',
    dedupeKey: String(_id),
    createdAt: ago(5),
    updatedAt: ago(5),
    ...over,
  });
  return _id;
};

beforeEach(() => {
  alertsM.docs.length = 0;
  adminsM.docs.length = 0;
  sent.length = 0;
  failMail = false;
  adminsM.docs.push({ _id: new Types.ObjectId(), email: 'admin@example.com', alertEmails: [] });
});

describe('alert endpoints', () => {
  it('need an admin token', async () => {
    expect((await request(app).get('/admin/v1/alerts')).status).toBe(401);
    expect(
      (await request(app).get('/admin/v1/alerts').set('Authorization', token('CUSTOMER'))).status,
    ).toBe(403);
  });

  it('list with filters, count the new ones and acknowledge once', async () => {
    const a = add({ kind: 'REFUND_FAILED', severity: 'CRITICAL' });
    add({ status: 'ACKNOWLEDGED' });
    const list = await request(app).get('/admin/v1/alerts').set('Authorization', token());
    expect(bodyOf(list).meta?.total).toBe(2);
    const kind = await request(app)
      .get('/admin/v1/alerts?kind=REFUND_FAILED&status=NEW')
      .set('Authorization', token());
    expect(bodyOf(kind).meta?.total).toBe(1);
    const count = await request(app).get('/admin/v1/alerts/count').set('Authorization', token());
    expect(bodyOf(count).data).toEqual({ new: 1 });
    const ack = await request(app)
      .post(`/admin/v1/alerts/${a.toHexString()}/acknowledge`)
      .set('Authorization', token());
    expect((bodyOf(ack).data as { status: string }).status).toBe('ACKNOWLEDGED');
    const again = await request(app)
      .post(`/admin/v1/alerts/${a.toHexString()}/acknowledge`)
      .set('Authorization', token());
    expect(again.status).toBe(200);
    const unknown = await request(app)
      .post(`/admin/v1/alerts/${new Types.ObjectId().toHexString()}/acknowledge`)
      .set('Authorization', token());
    expect(unknown.status).toBe(404);
    expect(
      (await request(app).get('/admin/v1/alerts?status=BAD').set('Authorization', token())).status,
    ).toBe(400);
  });
});

describe('alert emails', () => {
  it('mails urgent alerts at once, one email each, and marks them', async () => {
    add({ kind: 'REFUND_FAILED', severity: 'CRITICAL' });
    add({ kind: 'PAYMENT_FAILURE_SPIKE', severity: 'WARNING' });
    expect(await inbox.deliverEmails(NOW)).toBe(2);
    expect(sent).toHaveLength(2);
    expect(sent[0]?.to).toEqual(['admin@example.com']);
    expect(await inbox.deliverEmails(NOW)).toBe(0);
    expect(sent).toHaveLength(2);
    expect(alertsM.docs.every((d) => d.emailedAt !== undefined)).toBe(true);
  });

  it('uses the configured alert addresses', async () => {
    adminsM.docs[0] = {
      _id: new Types.ObjectId(),
      email: 'admin@example.com',
      alertEmails: ['ops@example.com'],
    };
    add({ severity: 'CRITICAL' });
    await inbox.deliverEmails(NOW);
    expect(sent[0]?.to).toEqual(['ops@example.com']);
  });

  it('holds quiet alerts until the oldest has waited the digest time, then sends one email', async () => {
    add({ createdAt: ago(10) });
    add({ createdAt: ago(5) });
    expect(await inbox.deliverEmails(NOW)).toBe(0);
    expect(sent).toHaveLength(0);
    add({ createdAt: ago(90) });
    expect(await inbox.deliverEmails(NOW)).toBe(3);
    expect(sent).toHaveLength(1);
    expect(sent[0]?.text.split('\n').filter((l) => l.startsWith('- '))).toHaveLength(3);
  });

  it('a failed email is retried next run and does not block other alerts', async () => {
    add({ severity: 'CRITICAL' });
    failMail = true;
    expect(await inbox.deliverEmails(NOW)).toBe(0);
    expect(alertsM.docs[0]?.emailedAt).toBeUndefined();
    failMail = false;
    expect(await inbox.deliverEmails(NOW)).toBe(1);
  });

  it('sends nothing when no admin exists', async () => {
    adminsM.docs.length = 0;
    add({ severity: 'CRITICAL' });
    expect(await inbox.deliverEmails(NOW)).toBe(0);
  });
});
