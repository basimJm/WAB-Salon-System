import type { ClientRateLimitInfo, Store } from 'express-rate-limit';
import request from 'supertest';
import { createApp } from '../src/app';
import { OBJECT_ID_PATTERN } from '../src/constants/database';
import { DEMO_BRANCHES, DEMO_SALONS } from '../src/constants/demoSeed';
import { buildOpenApiDocuments } from '../src/docs';
import { availabilityBody } from '../src/modules/customer/availability/availability.validation';
import { createDraftBody } from '../src/modules/customer/bookingDrafts/drafts.validation';
import { routeLimitScope } from '../src/modules/shared/rateLimits';
import { translate } from '../src/utils/i18n';
import { createLogger } from '../src/utils/logger';

/** SRV-151: contract and behaviour gaps found by the remote-dev runs (ADM-079, CUS-060, MER-054). */

const logger = createLogger({ level: 'silent' });
const ID = '65a1b2c3d4e5f6a7b8c9d0e1';
const START = '2026-11-02T08:00:00.000Z';
const END = '2026-11-02T09:00:00.000Z';
const ARABIC = /[؀-ۿ]/;

type Json = Record<string, unknown>;
const docs = buildOpenApiDocuments();

/** Every `pattern` string anywhere in a document. */
const patternsOf = (node: unknown, found: string[] = []): string[] => {
  if (Array.isArray(node)) node.forEach((item) => patternsOf(item, found));
  else if (node !== null && typeof node === 'object') {
    for (const [key, value] of Object.entries(node as Json)) {
      if (key === 'pattern' && typeof value === 'string') found.push(value);
      else patternsOf(value, found);
    }
  }
  return found;
};

const at = (node: unknown, ...path: string[]): Json => {
  let current = node;
  for (const key of path) current = (current as Json)[key];
  return current as Json;
};

describe('id patterns (S6, CUS-060 #14, MER-054 #11)', () => {
  it('the shared id regex carries no flag and accepts both hex cases', () => {
    expect(OBJECT_ID_PATTERN.flags).toBe('');
    expect(OBJECT_ID_PATTERN.test(ID)).toBe(true);
    expect(OBJECT_ID_PATTERN.test(ID.toUpperCase())).toBe(true);
    expect(OBJECT_ID_PATTERN.test(`${ID}0`)).toBe(false);
    expect(OBJECT_ID_PATTERN.test('zz'.repeat(12))).toBe(false);
  });

  it.each(Object.keys(docs))('%s: every pattern is a plain regex source', (name) => {
    const patterns = patternsOf(docs[name as keyof typeof docs]);
    for (const pattern of patterns) {
      expect(pattern).not.toMatch(/\/[dgimsuyv]*$/);
      expect(() => new RegExp(pattern)).not.toThrow();
    }
  });

  it('the customer document validates real ids with its own pattern', () => {
    const patterns = patternsOf(docs.customer).filter((p) => p.includes('{24}'));
    expect(patterns.length).toBeGreaterThan(0);
    for (const pattern of patterns) expect(new RegExp(pattern).test(ID)).toBe(true);
  });
});

describe('companion staff picks (CUS-060 #4 / #13; BUSINESS_DOMAIN §5.4 step 4)', () => {
  const body = (pick: Json): Json => ({
    date: '2026-11-02',
    person: { serviceIds: [ID] },
    others: [{ staffId: ID, ...pick }],
  });

  it('accepts an interval with start and end (offset or Z) and parses dates', () => {
    const parsed = availabilityBody.parse(body({ start: START, end: '2026-11-02T12:00:00+03:00' }));
    expect(parsed.others[0]?.start).toEqual(new Date(START));
    expect(parsed.others[0]?.end).toEqual(new Date(END));
  });

  it.each([
    ['null start', { start: null, end: END }],
    ['null end', { start: START, end: null }],
    ['missing end', { start: START }],
    ['epoch number', { start: 0, end: END }],
    ['not a date', { start: 'soon', end: END }],
    ['end before start', { start: END, end: START }],
  ])('refuses %s', (_label, pick) => {
    expect(availabilityBody.safeParse(body(pick)).success).toBe(false);
  });

  it('documents start and end as required, non-nullable date-time strings', () => {
    const schema = at(
      docs.customer,
      'paths',
      '/customer/v1/salons/{salonId}/availability',
      'post',
      'requestBody',
      'content',
      'application/json',
      'schema',
      'properties',
      'others',
      'items',
    );
    expect(schema['required']).toEqual(expect.arrayContaining(['staffId', 'start', 'end']));
    for (const field of ['start', 'end']) {
      expect(at(schema, 'properties', field)).toMatchObject({
        type: 'string',
        format: 'date-time',
      });
    }
  });

  it('the draft person start follows the same rule', () => {
    const person = { name: 'Lina', serviceIds: [ID] };
    const draft = (start: unknown): Json => ({
      salonId: ID,
      paymentMethod: 'PAY_ON_ARRIVAL',
      persons: [{ ...person, start }],
    });
    expect(createDraftBody.safeParse(draft(START)).success).toBe(true);
    expect(createDraftBody.safeParse(draft(null)).success).toBe(false);
    const start = at(
      docs.customer,
      'paths',
      '/customer/v1/bookings/drafts',
      'post',
      'requestBody',
      'content',
      'application/json',
      'schema',
      'properties',
      'persons',
      'items',
      'properties',
      'start',
    );
    expect(start).toMatchObject({ type: 'string', format: 'date-time' });
  });
});

describe('salon application answer (MER-054 #9)', () => {
  it('declares the full member profile', () => {
    const data = at(
      docs.merchant,
      'paths',
      '/merchant/v1/salon/applications',
      'post',
      'responses',
      '201',
      'content',
      'application/json',
      'schema',
      'properties',
      'data',
    );
    const member = at(data, 'properties', 'member');
    const ref = member['$ref'];
    const profile =
      typeof ref === 'string'
        ? at(docs.merchant.components, 'schemas', ref.split('/').pop() ?? '')
        : member;
    expect(Object.keys(at(profile, 'properties'))).toEqual(
      expect.arrayContaining([
        'id',
        'salonId',
        'firstName',
        'lastName',
        'phone',
        'role',
        'permissions',
        'providesServices',
        'branchId',
      ]),
    );
  });
});

describe('closing the main branch (MER-054 #10)', () => {
  it.each(['ar', 'en'] as const)('has its own %s branch messages', (language) => {
    for (const key of ['branches.mainCannotClose', 'branches.invalidStatus']) {
      const text = translate(language, key);
      expect(text).not.toBe(key);
      expect(text).not.toBe(translate(language, 'errors.INVALID_TRANSITION'));
    }
  });
});

describe('demo seed text (CUS-060 #15)', () => {
  it('writes the single-language salon and branch text in English', () => {
    for (const salon of DEMO_SALONS) {
      expect(salon.description).not.toMatch(ARABIC);
      expect(salon.locationText).not.toMatch(ARABIC);
    }
    for (const branch of DEMO_BRANCHES) expect(branch.locationText).not.toMatch(ARABIC);
  });
});

describe('route rate limits (CUS-060 #17)', () => {
  /** Counts per scope + client key, like the Redis store does per prefix. */
  const counts = new Map<string, number>();
  class ScopedStore implements Store {
    readonly localKeys = false;
    constructor(readonly prefix: string) {}
    init(): void {}
    increment(key: string): Promise<ClientRateLimitInfo> {
      const k = `${this.prefix}|${key}`;
      const totalHits = (counts.get(k) ?? 0) + 1;
      counts.set(k, totalHits);
      return Promise.resolve({ totalHits, resetTime: new Date(Date.now() + 60_000) });
    }
    decrement(key: string): Promise<void> {
      const k = `${this.prefix}|${key}`;
      counts.set(k, Math.max(0, (counts.get(k) ?? 0) - 1));
      return Promise.resolve();
    }
    resetKey(key: string): Promise<void> {
      counts.delete(`${this.prefix}|${key}`);
      return Promise.resolve();
    }
  }
  const scopesUsed = new Set<string>();
  const app = createApp({
    logger,
    services: {
      rateLimitStoreFor: (scope) => {
        scopesUsed.add(scope);
        return new ScopedStore(scope);
      },
    },
  });
  const hitsOf = (scope: string): number =>
    [...counts.entries()]
      .filter(([key]) => key.startsWith(`${scope}|`))
      .reduce((sum, [, n]) => sum + n, 0);
  const OTP_LIMIT = 20;
  const BROWSING = [
    '/customer/v1/banners',
    '/customer/v1/catalog/services',
    '/customer/v1/profile',
    '/customer/v1/config',
    '/customer/v1/content/faqs',
    '/customer/v1/locations/countries',
  ];

  beforeEach(() => {
    counts.clear();
  });

  it('keeps OTP, browsing and the other families in separate scopes per namespace', () => {
    for (const ns of ['customer', 'merchant'] as const) {
      expect(scopesUsed).toContain(routeLimitScope(ns, 'otp'));
      expect(scopesUsed).toContain(routeLimitScope(ns, 'browse'));
      expect(scopesUsed).toContain(routeLimitScope(ns, 'upload'));
    }
    expect(scopesUsed).toContain('customer:booking');
    expect(scopesUsed).toContain('admin:otp');
  });

  it('browsing never spends the OTP budget, and is not limited at the OTP rate', async () => {
    for (let round = 0; round < 4; round += 1) {
      for (const path of BROWSING) {
        const res = await request(app).get(path);
        expect(res.status).not.toBe(429);
      }
    }
    expect(hitsOf('customer:browse')).toBe(BROWSING.length * 4);
    expect(hitsOf('customer:otp')).toBe(0);
    const otp = await request(app).post('/customer/v1/auth/otp/request').send({});
    expect(otp.status).not.toBe(429);
  });

  it('the OTP and auth routes still share the strict budget', async () => {
    for (let i = 0; i < OTP_LIMIT; i += 1) {
      await request(app).post('/customer/v1/auth/otp/request').send({});
    }
    const blocked = await request(app).post('/customer/v1/auth/otp/request').send({});
    expect(blocked.status).toBe(429);
    expect((blocked.body as { error: { code: string } }).error.code).toBe('RATE_LIMITED');
    expect((await request(app).post('/customer/v1/auth/check-phone').send({})).status).toBe(429);
    expect((await request(app).get('/customer/v1/banners')).status).not.toBe(429);
  });

  it('merchant catalog and inbox count as browsing', async () => {
    await request(app).get('/merchant/v1/catalog/services');
    await request(app).get('/merchant/v1/notifications');
    expect(hitsOf('merchant:browse')).toBe(2);
    expect(hitsOf('merchant:otp')).toBe(0);
  });
});
