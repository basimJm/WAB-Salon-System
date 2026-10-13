import request from 'supertest';
import { createApp } from '../src/app';
import { createAppConfigService, evaluateVersion } from '../src/domain/appConfig';
import { createLogger } from '../src/utils/logger';
import { compareVersions } from '../src/utils/version';

const logger = createLogger({ level: 'silent' });
const POLICY = { latest: '2.0.0', minSupported: '1.5', optionalUpdate: true };

describe('compareVersions', () => {
  it.each([
    ['1.10', '1.9', 1],
    ['1.2', '1.2.0', 0],
    ['1.2.0.1', '1.2', 1],
    ['0.9', '1', -1],
    ['10', '9.9.9', 1],
  ])('%s vs %s', (a, b, sign) => {
    expect(Math.sign(compareVersions(a, b))).toBe(sign);
  });
});

describe('evaluateVersion', () => {
  it.each([
    ['1.4.9', 'UPDATE_REQUIRED'],
    ['1.5', 'UPDATE_AVAILABLE'],
    ['1.9.9', 'UPDATE_AVAILABLE'],
    ['2.0.0', 'OK'],
    ['2.0.1', 'OK'],
  ])('version %s is %s', (version, status) => {
    expect(evaluateVersion(version, POLICY)).toBe(status);
  });

  it('does not offer an optional update when the policy turns it off', () => {
    expect(evaluateVersion('1.6', { ...POLICY, optionalUpdate: false })).toBe('OK');
    expect(evaluateVersion('1.0', { ...POLICY, optionalUpdate: false })).toBe('UPDATE_REQUIRED');
  });

  it('is OK when no policy exists', () => {
    expect(evaluateVersion('0.1', null)).toBe('OK');
  });
});

interface Rig {
  policy: (typeof POLICY & { storeUrl: string }) | null;
  maintenance: { enabled: boolean; message: { ar: string; en: string } } | null;
  contact: { phone: string; whatsapp: string; email: string } | null;
}

const rig: Rig = { policy: null, maintenance: null, contact: null };
const service = createAppConfigService({
  appVersions: { findFor: () => Promise.resolve(rig.policy as never) },
  maintenance: { findFor: () => Promise.resolve(rig.maintenance as never) },
  contactInfo: { findFor: () => Promise.resolve(rig.contact as never) },
  settings: {
    get: ((key: string) =>
      Promise.resolve(
        { 'discovery.nearbyRadiusKm': 10, 'otp.length': 6, 'otp.resendAfterSec': 60 }[key],
      )) as never,
  },
});

interface Body {
  success: boolean;
  data: {
    update: { status: string; latest: string | null; storeUrl: string | null };
    maintenance: { enabled: boolean; message: string | null };
    nearbyRadiusKm: number;
    otp: { length: number; resendAfterSeconds: number };
    contact: { phone: string } | null;
  };
  error: { details: { field: string }[] };
}
const bodyOf = (res: { body: unknown }): Body => res.body as Body;
const app = createApp({ logger, services: { appConfig: service } });

beforeEach(() => {
  rig.policy = null;
  rig.maintenance = null;
  rig.contact = null;
});

describe('GET /config', () => {
  it.each(['customer', 'merchant'])('serves defaults on /%s/v1 without policy rows', async (ns) => {
    const res = await request(app).get(`/${ns}/v1/config?platform=ANDROID&version=1.0`);
    expect(res.status).toBe(200);
    expect(bodyOf(res).data).toMatchObject({
      update: { status: 'OK', latest: null, storeUrl: null },
      maintenance: { enabled: false, message: null },
      nearbyRadiusKm: 10,
      otp: { length: 6, resendAfterSeconds: 60 },
      contact: null,
    });
  });

  it('reports a required update with the store link', async () => {
    rig.policy = { ...POLICY, storeUrl: 'https://store.example/app' };
    const res = await request(app).get('/customer/v1/config?platform=IOS&version=1.0');
    expect(bodyOf(res).data.update).toMatchObject({
      status: 'UPDATE_REQUIRED',
      latest: '2.0.0',
      storeUrl: 'https://store.example/app',
    });
  });

  it('returns the maintenance message in the request language, only while enabled', async () => {
    rig.maintenance = { enabled: true, message: { ar: 'صيانة', en: 'Maintenance' } };
    const query = '/customer/v1/config?platform=IOS&version=1.0';
    const en = await request(app).get(query).set('Accept-Language', 'en');
    expect(bodyOf(en).data.maintenance).toEqual({ enabled: true, message: 'Maintenance' });
    const ar = await request(app).get(query);
    expect(bodyOf(ar).data.maintenance.message).toBe('صيانة');
    rig.maintenance.enabled = false;
    const off = await request(app).get(query);
    expect(bodyOf(off).data.maintenance).toEqual({ enabled: false, message: null });
  });

  it('returns contact info when present', async () => {
    rig.contact = { phone: '+962791234567', whatsapp: '+962791234567', email: 'a@b.co' };
    const res = await request(app).get('/merchant/v1/config?platform=ANDROID&version=1');
    expect(bodyOf(res).data.contact?.phone).toBe('+962791234567');
  });

  it.each([
    ['platform=WEB&version=1.0', 'query.platform'],
    ['platform=IOS&version=abc', 'query.version'],
    ['platform=IOS', 'query.version'],
    ['version=1.0', 'query.platform'],
  ])('rejects %s', async (query, field) => {
    const res = await request(app).get(`/customer/v1/config?${query}`);
    expect(res.status).toBe(400);
    expect(bodyOf(res).error.details.map((d) => d.field)).toContain(field);
  });

  it('answers 503, not 404, when the service is not configured', async () => {
    const res = await request(createApp({ logger })).get(
      '/customer/v1/config?platform=IOS&version=1.0',
    );
    expect(res.status).toBe(503);
  });
});
