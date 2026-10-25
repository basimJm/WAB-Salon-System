import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { createAuditWriter } from '../src/domain/audit/audit.service';
import { assertSalonBookable, isCustomerVisible } from '../src/domain/salons/bookable';
import { computeMissing, type CompletenessInput } from '../src/domain/salons/completeness';
import {
  createSalonStateService,
  createStaffFacts,
  type CompletenessFacts,
} from '../src/domain/salons/salonState.service';
import type { SalonPolicy } from '../src/models/salon.model';
import { requireAuth } from '../src/middlewares/auth';
import { MembersRepository } from '../src/repositories/identity.repository';
import { SalonsRepository } from '../src/repositories/salons.repository';
import { signAccessToken } from '../src/utils/auth/accessToken';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const SECRET = 'a'.repeat(48);
const NOW = new Date('2026-10-12T10:00:00.000Z');
const adminId = new Types.ObjectId().toHexString();
const POLICY: SalonPolicy = {
  cancellationWindowHours: 2,
  paymentOptions: ['PAY_ON_ARRIVAL'],
  depositRefundableOnCustomerCancel: true,
  fullPaymentRefundOnCustomerCancel: 'FULL',
  noShowDeposit: 'KEEP',
  noShowFullPayment: 'KEEP',
};
const COMPLETE: CompletenessInput = {
  name: 'Glow',
  coverKey: 'c.jpg',
  profileKey: 'p.jpg',
  description: 'nice',
  policy: POLICY,
  branches: { bookable: true, mainMissing: [] },
};

describe('computeMissing', () => {
  it('is empty for a complete salon', () => {
    expect(computeMissing(COMPLETE)).toEqual([]);
  });

  it.each([
    ['COVER', { coverKey: undefined }],
    ['COVER', { coverKey: '  ' }],
    ['PROFILE_IMAGE', { profileKey: undefined }],
    ['NAME', { name: ' ' }],
    ['DESCRIPTION', { description: undefined }],
    ['BRANCH', { branches: { bookable: false, mainMissing: [] } }],
    ['BRANCH', { branches: { bookable: false, mainMissing: null } }],
    ['STAFF', { branches: { bookable: false, mainMissing: ['STAFF'] } }],
    ['POLICY', { policy: undefined }],
    ['POLICY', { policy: { ...POLICY, paymentOptions: [] } }],
    ['POLICY', { policy: { ...POLICY, cancellationWindowHours: -1 } }],
    ['POLICY', { policy: { ...POLICY, paymentOptions: ['DEPOSIT'] } }],
    ['POLICY', { policy: { ...POLICY, paymentOptions: ['DEPOSIT'], depositPercentage: 101 } }],
    ['POLICY', { policy: { ...POLICY, paymentOptions: ['DEPOSIT'], depositPercentage: 0 } }],
  ])('reports %s when %j', (item, change) => {
    expect(computeMissing({ ...COMPLETE, ...(change as Partial<CompletenessInput>) })).toEqual([
      item,
    ]);
  });

  it('accepts a deposit policy with a valid percentage and lists items in the domain order', () => {
    expect(
      computeMissing({
        ...COMPLETE,
        policy: { ...POLICY, paymentOptions: ['DEPOSIT'], depositPercentage: 30 },
      }),
    ).toEqual([]);
    expect(
      computeMissing({
        ...COMPLETE,
        coverKey: undefined,
        policy: undefined,
        branches: { bookable: false, mainMissing: ['LOCATION', 'STAFF'] },
      }),
    ).toEqual(['COVER', 'LOCATION', 'STAFF', 'POLICY']);
  });

  it('is complete when another branch is bookable, whatever the main branch lacks', () => {
    expect(
      computeMissing({ ...COMPLETE, branches: { bookable: true, mainMissing: ['PHONE'] } }),
    ).toEqual([]);
  });
});

describe('customer visibility', () => {
  const salon = (state: string, isComplete: boolean): Parameters<typeof isCustomerVisible>[0] =>
    ({ state, completeness: { missing: [], isComplete } }) as never;

  it('is LIVE and complete only', () => {
    expect(isCustomerVisible(salon('LIVE', true))).toBe(true);
    expect(isCustomerVisible(salon('LIVE', false))).toBe(false);
    expect(isCustomerVisible(salon('OFFLINE', true))).toBe(false);
    expect(isCustomerVisible(salon('APPROVED_INCOMPLETE', true))).toBe(false);
  });

  it('refuses new bookings with SALON_NOT_BOOKABLE', () => {
    expect(() => {
      assertSalonBookable(salon('LIVE', true));
    }).not.toThrow();
    expect(() => {
      assertSalonBookable(salon('LIVE', false));
    }).toThrow(expect.objectContaining({ code: 'SALON_NOT_BOOKABLE', httpStatus: 422 }) as Error);
  });
});

const salons = createFakeModel();
const members = createFakeModel();
const audits: Record<string, unknown>[] = [];
const events: Record<string, unknown>[] = [];
const facts = { services: 0, staff: 0 };
const factsImpl: CompletenessFacts = {
  activeServiceCount: () => Promise.resolve(facts.services),
  qualifiedStaffCount: () => Promise.resolve(facts.staff),
};
const notifier = { fail: false };
const service = createSalonStateService({
  salons: new SalonsRepository(salons.model as never),
  facts: factsImpl,
  audit: createAuditWriter({
    append: (data) => {
      audits.push(data);
      return Promise.resolve({ id: 'a', ...data } as never);
    },
  }),
  notifier: {
    changed: (change) => {
      events.push(change);
      return notifier.fail ? Promise.reject(new Error('down')) : Promise.resolve();
    },
  },
  logger,
  now: () => NOW,
});
const app = createApp({
  logger,
  services: { adminGuard: requireAuth('admin', SECRET), salonState: service },
});
const auth = (): Record<string, string> => ({
  Authorization: `Bearer ${signAccessToken({ secret: SECRET, subjectType: 'ADMIN', subjectId: adminId, ttlSec: 600 }).token}`,
});
const addSalon = (state: string, over: Record<string, unknown> = {}): string => {
  const _id = new Types.ObjectId();
  salons.docs.push({
    _id,
    name: 'Glow',
    gender: 'FEMALE',
    state,
    coverKey: 'c.jpg',
    profileKey: 'p.jpg',
    description: 'nice',
    phone: '+962791234567',
    location: { type: 'Point', coordinates: [35.9, 31.9] },
    weeklySchedule: [{ day: 'SUN', isOff: false, open: '09:00', close: '18:00' }],
    policy: POLICY,
    completeness: { missing: ['SERVICE'], isComplete: false },
    ...over,
  });
  return _id.toHexString();
};

beforeEach(() => {
  salons.docs.length = 0;
  members.docs.length = 0;
  audits.length = 0;
  events.length = 0;
  facts.services = 1;
  facts.staff = 1;
  notifier.fail = false;
});

describe('recompute', () => {
  it('promotes APPROVED_INCOMPLETE to LIVE once complete and tells the owner', async () => {
    const id = addSalon('APPROVED_INCOMPLETE');
    const status = await service.recompute(id);
    expect(status).toMatchObject({ state: 'LIVE', isComplete: true, missing: [] });
    expect(salons.docs[0]?.['state']).toBe('LIVE');
    expect(events).toEqual([{ salonId: id, event: 'salon.live' }]);
  });

  it('keeps APPROVED_INCOMPLETE and lists what is missing', async () => {
    const id = addSalon('APPROVED_INCOMPLETE');
    facts.services = 0;
    const status = await service.recompute(id);
    expect(status).toMatchObject({
      state: 'APPROVED_INCOMPLETE',
      isComplete: false,
      missing: ['SERVICE'],
    });
    expect(events).toHaveLength(0);
  });

  it('a LIVE salon that lost its last service stays LIVE but is no longer bookable; the owner is told once', async () => {
    const id = addSalon('LIVE', { completeness: { missing: [], isComplete: true } });
    facts.services = 0;
    const status = await service.recompute(id);
    expect(status).toMatchObject({ state: 'LIVE', isComplete: false });
    expect(events).toEqual([{ salonId: id, event: 'salon.not_bookable' }]);
    await service.recompute(id);
    expect(events).toHaveLength(1);
    expect(() => {
      assertSalonBookable(salons.docs[0] as never);
    }).toThrow();
  });

  it('never moves OFFLINE or application states', async () => {
    for (const state of ['OFFLINE', 'APPLICATION_PENDING', 'APPLICATION_REJECTED']) {
      salons.docs.length = 0;
      const id = addSalon(state);
      expect((await service.recompute(id)).state).toBe(state);
    }
  });

  it('survives a failing notification and 404s for an unknown salon', async () => {
    const id = addSalon('APPROVED_INCOMPLETE');
    notifier.fail = true;
    expect((await service.recompute(id)).state).toBe('LIVE');
    await expect(service.recompute(new Types.ObjectId().toHexString())).rejects.toMatchObject({
      code: 'SALON_NOT_FOUND',
    });
  });
});

describe('createStaffFacts', () => {
  it('counts active service providers that have a service and a working day', async () => {
    const salonId = new Types.ObjectId();
    const base = { salonId, active: true, providesServices: true };
    members.docs.push(
      {
        _id: new Types.ObjectId(),
        ...base,
        staff: { serviceIds: ['s'], workingDays: [{ day: 'SUN' }] },
      },
      {
        _id: new Types.ObjectId(),
        ...base,
        staff: { serviceIds: [], workingDays: [{ day: 'SUN' }] },
      },
      { _id: new Types.ObjectId(), ...base, staff: { serviceIds: ['s'], workingDays: [] } },
      {
        _id: new Types.ObjectId(),
        ...base,
        active: false,
        staff: { serviceIds: ['s'], workingDays: [{ day: 'SUN' }] },
      },
      { _id: new Types.ObjectId(), salonId, active: true, providesServices: false },
    );
    const real = createStaffFacts(new MembersRepository(members.model as never), () =>
      Promise.resolve(0),
    );
    expect(await real.qualifiedStaffCount(salonId.toHexString())).toBe(1);
  });
});

describe('admin offline / online', () => {
  const post = async (
    id: string,
    action: 'offline' | 'online',
    body: object,
  ): Promise<{ status: number; body: unknown }> =>
    await request(app).post(`/admin/v1/salons/${id}/${action}`).set(auth()).send(body);

  it('takes a LIVE salon offline with reason, audit and notification, and back to LIVE when complete', async () => {
    const id = addSalon('LIVE', { completeness: { missing: [], isComplete: true } });
    const off = await post(id, 'offline', { reason: 'complaints' });
    expect(off.status).toBe(200);
    expect(salons.docs[0]).toMatchObject({
      state: 'OFFLINE',
      offline: { reason: 'complaints', at: NOW },
    });
    expect(audits[0]).toMatchObject({ action: 'SALON_SET_OFFLINE', reason: 'complaints', adminId });
    expect(events[0]).toMatchObject({ event: 'salon.offline', reason: 'complaints' });
    const on = await post(id, 'online', { reason: 'resolved' });
    expect((on.body as { data: { state: string } }).data.state).toBe('LIVE');
    expect(audits[1]).toMatchObject({ action: 'SALON_SET_ONLINE' });
  });

  it('brings an incomplete salon back as APPROVED_INCOMPLETE', async () => {
    const id = addSalon('OFFLINE');
    facts.services = 0;
    const on = await post(id, 'online', { reason: 'resolved' });
    expect((on.body as { data: { state: string } }).data.state).toBe('APPROVED_INCOMPLETE');
  });

  it('refuses wrong source states (422), missing reason (400), unknown salon (404) and non-admins', async () => {
    const pending = addSalon('APPLICATION_PENDING');
    expect((await post(pending, 'offline', { reason: 'x' })).status).toBe(422);
    const live = addSalon('LIVE');
    expect((await post(live, 'online', { reason: 'x' })).status).toBe(422);
    expect((await post(live, 'offline', {})).status).toBe(400);
    expect(
      (await post(new Types.ObjectId().toHexString(), 'offline', { reason: 'x' })).status,
    ).toBe(404);
    expect(
      (await request(app).post(`/admin/v1/salons/${live}/offline`).send({ reason: 'x' })).status,
    ).toBe(401);
    expect(audits).toHaveLength(0);
  });
});
