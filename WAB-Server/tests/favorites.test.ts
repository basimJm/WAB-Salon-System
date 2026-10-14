import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { SETTING_DEFAULTS } from '../src/constants/settings';
import { createFavoritesService } from '../src/domain/favorites/favorites.service';
import { createSearchService } from '../src/domain/search/search.service';
import { requireAuth } from '../src/middlewares/auth';
import { FakeStorageProvider } from '../src/providers/storage';
import { ClosuresRepository } from '../src/repositories/closures.repository';
import { FavoritesRepository } from '../src/repositories/favorites.repository';
import { SalonServicesRepository } from '../src/repositories/salonServices.repository';
import { SalonsRepository } from '../src/repositories/salons.repository';
import { signAccessToken } from '../src/utils/auth/accessToken';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const SECRET = 'a'.repeat(48);
const NOW = new Date('2026-10-12T08:00:00Z');
const m = {
  favorites: createFakeModel(),
  salons: createFakeModel(),
  services: createFakeModel(),
  closures: createFakeModel(),
};
const favoritesRepo = new FavoritesRepository(m.favorites.model as never);
const salonsRepo = new SalonsRepository(m.salons.model as never);
const search = createSearchService({
  salons: salonsRepo,
  salonServices: new SalonServicesRepository(m.services.model as never),
  closures: new ClosuresRepository(m.closures.model as never),
  storage: new FakeStorageProvider(),
  settings: { get: (key: string) => Promise.resolve(SETTING_DEFAULTS[key as never]) },
  favorites: favoritesRepo,
  now: () => NOW,
});
const app = createApp({
  logger,
  services: {
    favorites: createFavoritesService({ favorites: favoritesRepo, salons: salonsRepo, search }),
    installations: {
      service: undefined as never,
      customerOptional: requireAuth('customer', SECRET),
      customerRequired: requireAuth('customer', SECRET),
      merchantRequired: requireAuth('merchant', SECRET),
    },
  },
});

interface Body {
  data: { name: string; isFavorite: boolean }[] & { isFavorite: boolean };
  meta?: { total: number };
  error: { code: string };
}
const bodyOf = (res: { body: unknown }): Body => res.body as Body;
const id = (): Types.ObjectId => new Types.ObjectId();
const tokenFor = (subjectId: string, type: 'CUSTOMER' | 'MEMBER' = 'CUSTOMER'): string =>
  `Bearer ${signAccessToken({ secret: SECRET, subjectType: type, subjectId, ttlSec: 600 }).token}`;
const me = id().toHexString();
const week = ['SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI'].map((day) => ({
  day,
  isOff: false,
  open: '09:00',
  close: '18:00',
}));
const addSalon = (name: string, over: Record<string, unknown> = {}): string => {
  const _id = id();
  m.salons.docs.push({
    _id,
    name,
    searchText: name,
    gender: 'FEMALE',
    state: 'LIVE',
    completeness: { missing: [], isComplete: true },
    rating: { avg: 4, count: 1 },
    weeklySchedule: week,
    ...over,
  });
  return _id.toHexString();
};
const put = (salonId: string, auth = tokenFor(me)): request.Test =>
  request(app).put(`/customer/v1/favorites/${salonId}`).set('Authorization', auth);

beforeEach(() => {
  for (const f of Object.values(m)) f.docs.length = 0;
});

describe('favorites', () => {
  it('saves a salon once, however many times it is tapped', async () => {
    const salon = addSalon('Glow');
    expect(bodyOf(await put(salon)).data.isFavorite).toBe(true);
    expect((await put(salon)).status).toBe(200);
    expect(m.favorites.docs).toHaveLength(1);
  });

  it('refuses salons that are hidden or unknown', async () => {
    const hidden = addSalon('Off', { state: 'OFFLINE' });
    const incomplete = addSalon('Inc', { completeness: { missing: ['COVER'], isComplete: false } });
    for (const salon of [hidden, incomplete, id().toHexString()]) {
      const res = await put(salon);
      expect(res.status).toBe(404);
      expect(bodyOf(res).error.code).toBe('SALON_NOT_FOUND');
    }
    expect((await put('nope')).status).toBe(400);
    expect(m.favorites.docs).toHaveLength(0);
  });

  it('removes a favorite, and removing one that is not saved is fine', async () => {
    const salon = addSalon('Glow');
    await put(salon);
    const del = (): request.Test =>
      request(app).delete(`/customer/v1/favorites/${salon}`).set('Authorization', tokenFor(me));
    expect(bodyOf(await del()).data.isFavorite).toBe(false);
    expect((await del()).status).toBe(200);
    expect(m.favorites.docs).toHaveLength(0);
  });

  it('lists my favorites newest first, as cards marked as favorite, paginated', async () => {
    const names = Array.from({ length: 12 }, (_v, i) => `S${String(i)}`);
    for (const [i, name] of names.entries()) {
      const salon = addSalon(name);
      m.favorites.docs.push({
        _id: id(),
        customerId: new Types.ObjectId(me),
        salonId: new Types.ObjectId(salon),
        createdAt: new Date(NOW.getTime() + i * 1000),
      });
    }
    const list = (query = ''): request.Test =>
      request(app).get(`/customer/v1/favorites${query}`).set('Authorization', tokenFor(me));
    const first = bodyOf(await list());
    expect(first.data.map((c) => c.name)).toEqual(names.slice(2).reverse());
    expect(first.data.every((c) => c.isFavorite)).toBe(true);
    expect(first.meta?.total).toBe(12);
    expect(bodyOf(await list('?page=2')).data.map((c) => c.name)).toEqual(['S1', 'S0']);
  });

  it('never shows another customer’s favorites and drops salons that went offline', async () => {
    const mine = addSalon('Mine');
    const gone = addSalon('Gone');
    const theirs = addSalon('Theirs');
    await put(mine);
    await put(gone);
    await put(theirs, tokenFor(id().toHexString()));
    for (const doc of m.salons.docs) {
      if (String(doc['_id']) === gone) doc['state'] = 'OFFLINE';
    }
    const res = await request(app).get('/customer/v1/favorites').set('Authorization', tokenFor(me));
    expect(bodyOf(res).data.map((c) => c.name)).toEqual(['Mine']);
  });

  it('needs a customer token', async () => {
    const salon = addSalon('Glow');
    expect((await request(app).get('/customer/v1/favorites')).status).toBe(401);
    expect((await request(app).put(`/customer/v1/favorites/${salon}`)).status).toBe(401);
    const asMember = await put(salon, tokenFor(id().toHexString(), 'MEMBER'));
    expect(asMember.status).toBe(403);
  });
});
