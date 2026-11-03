import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { ALERT_KINDS, alertTitleKey } from '../src/constants/alerts';
import { createAlertInbox } from '../src/domain/alerts/alertInbox.service';
import { createAlertsService } from '../src/domain/alerts/alerts.service';
import {
  alertFeedPayload,
  alertTitle,
  alertTitles,
  normalizeAlertEntityType,
  titlesOf,
} from '../src/domain/alerts/alertText';
import { requireAuth } from '../src/middlewares/auth';
import { AlertModel, type AlertRaw } from '../src/models/alert.model';
import { FakeNotifier } from '../src/providers/notifier';
import { AlertsRepository } from '../src/repositories/alerts.repository';
import { AdminsRepository } from '../src/repositories/identity.repository';
import { signAccessToken } from '../src/utils/auth/accessToken';
import type { Entity } from '../src/utils/database/plain';
import { translate } from '../src/utils/i18n';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

/** SRV-150: alert titles in the request language (+ both), one uppercase subject type (S11, S12). */
const logger = createLogger({ level: 'silent' });
const SECRET = 'a'.repeat(48);
const NOW = new Date('2026-10-25T12:00:00.000Z');
const alertsM = createFakeModel();
const adminsM = createFakeModel();
const alertsRepo = new AlertsRepository(alertsM.model as never);
const inbox = createAlertInbox({
  alerts: alertsRepo,
  admins: new AdminsRepository(adminsM.model as never),
  notifier: new FakeNotifier(),
  logger,
});
const app = createApp({
  logger,
  services: { adminGuard: requireAuth('admin', SECRET), adminAlerts: inbox },
});
const token = `Bearer ${
  signAccessToken({
    secret: SECRET,
    subjectType: 'ADMIN',
    subjectId: new Types.ObjectId().toHexString(),
    ttlSec: 600,
  }).token
}`;
interface Row {
  id: string;
  kind: string;
  title: string;
  titles: { ar: string; en: string };
  entityType: string | null;
}
const rowsOf = (res: { body: unknown }): Row[] => (res.body as { data: Row[] }).data;
const add = (over: Record<string, unknown>): Types.ObjectId => {
  const _id = new Types.ObjectId();
  alertsM.docs.push({
    _id,
    kind: 'REFUND_FAILED',
    severity: 'CRITICAL',
    title: titlesOf('REFUND_FAILED'),
    data: {},
    status: 'NEW',
    dedupeKey: String(_id),
    createdAt: NOW,
    updatedAt: NOW,
    ...over,
  });
  return _id;
};
const en = (kind: (typeof ALERT_KINDS)[number]): string => translate('en', alertTitleKey(kind));
const ar = (kind: (typeof ALERT_KINDS)[number]): string => translate('ar', alertTitleKey(kind));

beforeEach(() => {
  alertsM.docs.length = 0;
});

describe('alert titles (S11)', () => {
  it('every kind has a different Arabic and English title', () => {
    for (const kind of ALERT_KINDS) {
      const titles = titlesOf(kind);
      expect(titles).toEqual({ ar: ar(kind), en: en(kind) });
      expect(titles.ar).not.toBe(titles.en);
    }
  });

  it('a raised alert stores the title in both languages', async () => {
    const service = createAlertsService({
      alerts: alertsRepo,
      transactions: {} as never,
      refunds: {} as never,
      salons: {} as never,
      reviews: {} as never,
      catalogRequests: {} as never,
      settings: { get: (() => Promise.resolve({})) as never },
      logger,
    });
    await service.raise({
      kind: 'SALON_DELETION_REQUEST',
      severity: 'WARNING',
      dedupeKey: 'salon-deletion:x:1',
      entityType: 'SALON',
      entityId: new Types.ObjectId().toHexString(),
    });
    expect(alertsM.docs[0]?.['title']).toEqual(titlesOf('SALON_DELETION_REQUEST'));
    expect(alertsM.docs[0]?.['entityType']).toBe('SALON');
  });

  it('the list answers the title in the request language and both titles', async () => {
    add({});
    const inEnglish = rowsOf(
      await request(app)
        .get('/admin/v1/alerts')
        .set('Authorization', token)
        .set('Accept-Language', 'en'),
    );
    expect(inEnglish[0]?.title).toBe(en('REFUND_FAILED'));
    expect(inEnglish[0]?.titles).toEqual(titlesOf('REFUND_FAILED'));
    const inArabic = rowsOf(
      await request(app)
        .get('/admin/v1/alerts')
        .set('Authorization', token)
        .set('Accept-Language', 'ar'),
    );
    expect(inArabic[0]?.title).toBe(ar('REFUND_FAILED'));
    const byDefault = rowsOf(
      await request(app).get('/admin/v1/alerts').set('Authorization', token),
    );
    expect(byDefault[0]?.title).toBe(ar('REFUND_FAILED'));
  });

  it('acknowledge answers in the request language too', async () => {
    const id = add({});
    const res = await request(app)
      .post(`/admin/v1/alerts/${id.toHexString()}/acknowledge`)
      .set('Authorization', token)
      .set('Accept-Language', 'en');
    expect((res.body as { data: Row }).data.title).toBe(en('REFUND_FAILED'));
  });

  it('an alert stored before the fix (English string title) reads in both languages', async () => {
    add({ kind: 'SALON_APPLICATION', title: en('SALON_APPLICATION') });
    const rows = rowsOf(
      await request(app)
        .get('/admin/v1/alerts')
        .set('Authorization', token)
        .set('Accept-Language', 'ar'),
    );
    expect(rows[0]?.title).toBe(ar('SALON_APPLICATION'));
    expect(rows[0]?.titles).toEqual(titlesOf('SALON_APPLICATION'));
    expect(alertTitle({ kind: 'REVIEW_PENDING', title: 'x' }, 'en')).toBe(en('REVIEW_PENDING'));
    expect(alertTitles({ kind: 'REVIEW_PENDING', title: { ar: 'x' } })).toEqual(
      titlesOf('REVIEW_PENDING'),
    );
  });

  it('the live feed event carries the default-language title and both titles', () => {
    const alert = {
      id: 'a1',
      kind: 'CATALOG_REQUEST',
      severity: 'INFO',
      title: titlesOf('CATALOG_REQUEST'),
    } as unknown as Entity<AlertRaw>;
    expect(alertFeedPayload(alert)).toEqual({
      id: 'a1',
      kind: 'CATALOG_REQUEST',
      severity: 'INFO',
      title: ar('CATALOG_REQUEST'),
      titles: titlesOf('CATALOG_REQUEST'),
    });
  });
});

describe('alert subject type (S12)', () => {
  it('reads the old lowercase spelling as the uppercase enum', async () => {
    add({ entityType: 'salon', entityId: new Types.ObjectId() });
    add({ entityType: 'REFUND', entityId: new Types.ObjectId() });
    add({});
    const rows = rowsOf(await request(app).get('/admin/v1/alerts').set('Authorization', token));
    expect(rows.map((r) => r.entityType).sort()).toEqual(['REFUND', 'SALON', null].sort());
  });

  it('normalizes known values and drops unknown ones', () => {
    expect(normalizeAlertEntityType('catalog_request')).toBe('CATALOG_REQUEST');
    expect(normalizeAlertEntityType('REVIEW')).toBe('REVIEW');
    // §5.21: overdue bookings are alert subjects.
    expect(normalizeAlertEntityType('booking')).toBe('BOOKING');
    expect(normalizeAlertEntityType('payout')).toBeNull();
    expect(normalizeAlertEntityType(undefined)).toBeNull();
    expect(normalizeAlertEntityType(7)).toBeNull();
  });

  it('the schema refuses a lowercase subject type and needs both titles', async () => {
    const base = {
      kind: 'SALON_DELETION_REQUEST',
      severity: 'WARNING',
      title: titlesOf('SALON_DELETION_REQUEST'),
      dedupeKey: 'k',
    };
    const errorsOf = async (doc: Record<string, unknown>): Promise<string[]> => {
      try {
        await new AlertModel(doc).validate();
        return [];
      } catch (error) {
        return Object.keys((error as { errors: Record<string, unknown> }).errors);
      }
    };
    expect(await errorsOf({ ...base, entityType: 'SALON' })).toEqual([]);
    expect(await errorsOf({ ...base, entityType: 'salon' })).toEqual(['entityType']);
    expect(await errorsOf({ ...base, title: { en: 'only English' } })).toEqual(['title.ar']);
  });
});
