import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { ERROR_CODES } from '../src/constants/errorCodes';
import { SETTING_DEFAULTS } from '../src/constants/settings';
import { createAdminSalonEditService } from '../src/domain/adminSalonEdit/adminSalonEdit.service';
import { createAuditWriter } from '../src/domain/audit/audit.service';
import { createSalonServicesService } from '../src/domain/salonServices/salonServices.service';
import { createHoursService, type ScheduleConflicts } from '../src/domain/salons/hoursService';
import { createPolicyService } from '../src/domain/salons/policy.service';
import { createStaffService } from '../src/domain/team/staff.service';
import type { UploadVerifier } from '../src/domain/uploads/uploads.service';
import { requireAuth } from '../src/middlewares/auth';
import { FakeStorageProvider } from '../src/providers/storage';
import { AuditLogsRepository } from '../src/repositories/auditLogs.repository';
import { CatalogServicesRepository } from '../src/repositories/catalog.repository';
import { ClosuresRepository } from '../src/repositories/closures.repository';
import { MembersRepository } from '../src/repositories/identity.repository';
import { SalonServicesRepository } from '../src/repositories/salonServices.repository';
import { SalonsRepository } from '../src/repositories/salons.repository';
import { signAccessToken } from '../src/utils/auth/accessToken';
import { ValidationError } from '../src/utils/errors';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const SECRET = 'a'.repeat(48);
const REASON = 'Owner asked by phone';
const NOW = new Date('2026-10-12T08:00:00Z');
const salonId = new Types.ObjectId();
const adminId = new Types.ObjectId().toHexString();

const m = {
  salons: createFakeModel(),
  closures: createFakeModel(),
  catalog: createFakeModel(),
  services: createFakeModel(),
  members: createFakeModel(),
  audit: createFakeModel(),
};
const notices: Record<string, unknown>[] = [];
const conflict = { list: [] as { bookingId: string; startsAt: Date; status: string }[] };
const conflicts: ScheduleConflicts = {
  weekly: () => Promise.resolve(conflict.list),
  closure: () => Promise.resolve(conflict.list),
};
const uploads = new Map<string, { purpose: string; ownerType: string }>();
const verifier: UploadVerifier = {
  assertConfirmed: ({ keys, purpose, field, accept = () => true }) => {
    const bad = keys.filter((key) => {
      const upload = uploads.get(key);
      return (
        upload === undefined ||
        upload.purpose !== purpose ||
        !accept({ ...upload, key, status: 'CONFIRMED' } as never)
      );
    });
    return bad.length === 0
      ? Promise.resolve()
      : Promise.reject(
          new ValidationError({
            code: ERROR_CODES.UPLOAD_INVALID,
            details: [
              { field, code: ERROR_CODES.UPLOAD_INVALID, messageKey: 'errors.UPLOAD_INVALID' },
            ],
          }),
        );
  },
};
const settings = { get: (key: string) => Promise.resolve(SETTING_DEFAULTS[key as never]) };
const state = {
  recompute: (id: string) =>
    Promise.resolve({ salonId: id, state: 'LIVE' as const, missing: [], isComplete: true }),
};
const salonRepo = new SalonsRepository(m.salons.model as never);
const servicesRepo = new SalonServicesRepository(m.services.model as never);
const app = createApp({
  logger,
  services: {
    adminGuard: requireAuth('admin', SECRET),
    adminSalonEdit: createAdminSalonEditService({
      profile: undefined as never,
      gallery: undefined as never,
      hours: createHoursService({
        salons: salonRepo,
        closures: new ClosuresRepository(m.closures.model as never),
        settings,
        state,
        conflicts,
        now: () => NOW,
      }),
      conflicts,
      salonServices: createSalonServicesService({
        salons: salonRepo,
        catalog: new CatalogServicesRepository(m.catalog.model as never),
        services: servicesRepo,
        storage: new FakeStorageProvider(),
        uploads: verifier,
        state,
      }),
      staff: createStaffService({
        members: new MembersRepository(m.members.model as never),
        salons: salonRepo,
        salonServices: servicesRepo,
        settings,
        state,
      }),
      policy: createPolicyService({ salons: salonRepo, state }),
      audit: createAuditWriter(new AuditLogsRepository(m.audit.model as never)),
      notifier: {
        changed: (change) => {
          notices.push(change);
          return Promise.resolve();
        },
      },
      logger,
    }),
  },
});

interface Body {
  data: Record<string, unknown> & unknown[];
  meta?: { total: number };
  error?: { code: string; details?: { field: string }[] };
}
const bodyOf = (res: { body: unknown }): Body => res.body as Body;
const bearer = `Bearer ${signAccessToken({ secret: SECRET, subjectType: 'ADMIN', subjectId: adminId, ttlSec: 600 }).token}`;
const salon = `/admin/v1/salons/${salonId.toHexString()}`;
const call = (
  method: 'get' | 'post' | 'put' | 'patch',
  path: string,
  body?: object,
): Promise<{ status: number; body: unknown }> => {
  const req = request(app)[method](`${salon}${path}`).set('Authorization', bearer);
  return body === undefined ? req : req.send(body);
};
const week = (off: string[] = []): { day: string; isOff: boolean; open: string; close: string }[] =>
  ['SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI'].map((day) => ({
    day,
    isOff: off.includes(day),
    open: '09:00',
    close: '18:00',
  }));

beforeEach(() => {
  for (const model of Object.values(m)) model.docs.length = 0;
  m.salons.docs.push({
    _id: salonId,
    name: 'Glow',
    businessType: 'SALON',
    audience: 'FEMALE',
    state: 'LIVE',
    weeklySchedule: week(['SAT']),
  });
  uploads.clear();
  notices.length = 0;
  conflict.list = [];
});

describe('admin salon edit: hours and closures', () => {
  it('reads the hours', async () => {
    const res = await call('get', '/hours');
    expect(res.status).toBe(200);
    expect((bodyOf(res).data['weeklySchedule'] as unknown[]).length).toBe(7);
  });

  it('previews the bookings a schedule or closure would break without changing anything', async () => {
    conflict.list = [
      {
        bookingId: new Types.ObjectId().toHexString(),
        startsAt: new Date('2026-10-20T09:00:00Z'),
        status: 'APPROVED',
      },
    ];
    const weekly = await call('post', '/hours/preview', { days: week(['SUN']) });
    expect(weekly.status).toBe(200);
    expect(bodyOf(weekly).data).toHaveLength(1);
    const closure = await call('post', '/closures/preview', {
      from: '2026-10-20',
      to: '2026-10-21',
    });
    expect(bodyOf(closure).data).toHaveLength(1);
    expect(m.audit.docs).toHaveLength(0);
    expect(m.closures.docs).toHaveLength(0);
    expect(notices).toHaveLength(0);
  });

  it('replaces the weekly hours with a reason: audited before/after and the owner is told', async () => {
    const res = await call('put', '/hours', { days: week(['FRI']), reason: REASON });
    expect(res.status).toBe(200);
    expect(m.audit.docs[0]).toMatchObject({ action: 'SALON_HOURS_EDIT', reason: REASON });
    expect(notices[0]).toMatchObject({
      event: 'salon.edited_by_admin',
      area: 'hours',
      reason: REASON,
    });
    const stored = m.salons.docs[0]?.['weeklySchedule'] as { day: string; isOff: boolean }[];
    expect(stored.find((d) => d.day === 'FRI')?.isOff).toBe(true);
  });

  it('refuses a schedule that breaks bookings (409 with the booking ids) and a missing reason', async () => {
    const bookingId = new Types.ObjectId().toHexString();
    conflict.list = [{ bookingId, startsAt: new Date('2026-10-20T09:00:00Z'), status: 'PENDING' }];
    const res = await call('put', '/hours', { days: week(['FRI']), reason: REASON });
    expect(res.status).toBe(409);
    expect(bodyOf(res).error?.code).toBe(ERROR_CODES.SCHEDULE_CONFLICT);
    expect(bodyOf(res).error?.details?.[0]?.field).toBe(bookingId);
    expect(m.audit.docs).toHaveLength(0);
    conflict.list = [];
    expect((await call('put', '/hours', { days: week() })).status).toBe(400);
    expect((await call('put', '/hours', { days: week().slice(1), reason: REASON })).status).toBe(
      400,
    );
  });

  it('adds, changes and removes a closure; the closure text and the audit reason stay separate', async () => {
    const added = await call('post', '/closures', {
      from: '2026-10-20',
      to: '2026-10-22',
      closureReason: 'Renovation',
      reason: REASON,
    });
    expect(added.status).toBe(201);
    const id = String(bodyOf(added).data['id']);
    expect(bodyOf(added).data['reason']).toBe('Renovation');
    expect(m.audit.docs[0]).toMatchObject({ action: 'SALON_CLOSURE_ADD', reason: REASON });

    const changed = await call('patch', `/closures/${id}`, { to: '2026-10-23', reason: REASON });
    expect(changed.status).toBe(200);
    expect(bodyOf(changed).data['to']).toBe('2026-10-23');
    expect(m.audit.docs[1]).toMatchObject({ action: 'SALON_CLOSURE_UPDATE' });

    const removed = await call('post', `/closures/${id}/remove`, { reason: REASON });
    expect(removed.status).toBe(200);
    expect(m.audit.docs[2]).toMatchObject({ action: 'SALON_CLOSURE_REMOVE', before: { id } });
    expect(notices.map((n) => n['area'])).toEqual(['hours', 'hours', 'hours']);
    expect((await call('post', `/closures/${id}/remove`, { reason: REASON })).status).toBe(404);
  });

  it('refuses a past or reversed closure, an empty patch, and a closure that breaks bookings', async () => {
    const bad = (body: object): Promise<{ status: number }> =>
      call('post', '/closures', { closureReason: 'x', reason: REASON, ...body });
    expect((await bad({ from: '2026-10-01', to: '2026-10-02' })).status).toBe(400);
    expect((await bad({ from: '2026-10-22', to: '2026-10-20' })).status).toBe(400);
    expect((await bad({ from: 'nope', to: '2026-10-20' })).status).toBe(400);
    conflict.list = [
      {
        bookingId: new Types.ObjectId().toHexString(),
        startsAt: new Date('2026-10-21T09:00:00Z'),
        status: 'APPROVED',
      },
    ];
    expect((await bad({ from: '2026-10-20', to: '2026-10-22' })).status).toBe(409);
    expect(m.audit.docs).toHaveLength(0);
    const id = new Types.ObjectId().toHexString();
    expect((await call('patch', `/closures/${id}`, { reason: REASON })).status).toBe(400);
  });
});

describe('admin salon edit: policy', () => {
  const POLICY = {
    cancellationWindowHours: 24,
    paymentOptions: ['PAY_ON_ARRIVAL', 'DEPOSIT'],
    depositPercentage: 20,
    depositRefundableOnCustomerCancel: true,
    fullPaymentRefundOnCustomerCancel: 'MINUS_DEPOSIT',
    noShowDeposit: 'KEEP',
    noShowFullPayment: 'REFUND_MINUS_DEPOSIT',
    notes: 'Arrive early',
  };

  it('is null until set, then set with reason, audited and announced', async () => {
    expect(bodyOf(await call('get', '/policy')).data).toBeNull();
    const res = await call('put', '/policy', { ...POLICY, reason: REASON });
    expect(res.status).toBe(200);
    expect(bodyOf(res).data['depositPercentage']).toBe(20);
    expect(m.audit.docs[0]).toMatchObject({ action: 'SALON_POLICY_EDIT', before: null });
    expect(notices[0]).toMatchObject({ area: 'policy' });
    expect(bodyOf(await call('get', '/policy')).data['notes']).toBe('Arrive early');
  });

  it('needs a deposit percentage when a deposit is offered, and a reason', async () => {
    const noPercent = { ...POLICY, depositPercentage: undefined };
    expect((await call('put', '/policy', { ...noPercent, reason: REASON })).status).toBe(400);
    expect((await call('put', '/policy', POLICY)).status).toBe(400);
    expect(m.audit.docs).toHaveLength(0);
  });
});

describe('admin salon edit: services', () => {
  const catalogEntry = (gender = 'FEMALE'): string => {
    const _id = new Types.ObjectId();
    m.catalog.docs.push({
      _id,
      name: { ar: 'قص', en: 'Cut' },
      description: { ar: 'و', en: 'd' },
      imageKey: 'catalog/cut.jpg',
      businessType: 'SALON',
      audience: gender,
      active: true,
      sortOrder: 0,
    });
    return _id.toHexString();
  };
  const BASE = { price: '12.500', durationMinutes: 45 };

  it('adds a catalog service in fils, audited, owner told; lists it paginated', async () => {
    const catalogServiceId = catalogEntry();
    const res = await call('post', '/services', { catalogServiceId, ...BASE, reason: REASON });
    expect(res.status).toBe(201);
    expect(bodyOf(res).data['price']).toBe('12.500');
    expect(m.services.docs[0]?.['price']).toBe(12500);
    expect(m.audit.docs[0]).toMatchObject({ action: 'SALON_SERVICE_ADD', reason: REASON });
    expect(notices[0]).toMatchObject({ area: 'services' });
    const list = bodyOf(await call('get', '/services?pageSize=1'));
    expect(list.data).toHaveLength(1);
    expect(list.meta?.total).toBe(1);
  });

  it('keeps the merchant rules: audience, duplicates, price, reason', async () => {
    const male = catalogEntry('MALE');
    const mismatch = await call('post', '/services', {
      catalogServiceId: male,
      ...BASE,
      reason: REASON,
    });
    expect(mismatch.status).toBe(400);
    expect(bodyOf(mismatch).error?.code).toBe(ERROR_CODES.BUSINESS_TYPE_MISMATCH);
    const ok = catalogEntry();
    expect(
      (await call('post', '/services', { catalogServiceId: ok, ...BASE, reason: REASON })).status,
    ).toBe(201);
    expect(
      (await call('post', '/services', { catalogServiceId: ok, ...BASE, reason: REASON })).status,
    ).toBe(409);
    expect(
      (
        await call('post', '/services', {
          catalogServiceId: catalogEntry(),
          price: '0.000',
          durationMinutes: 45,
          reason: REASON,
        })
      ).status,
    ).toBe(400);
    expect(
      (await call('post', '/services', { catalogServiceId: catalogEntry(), ...BASE })).status,
    ).toBe(400);
  });

  it('changes a service; media must be uploaded by an admin for that purpose', async () => {
    const created = await call('post', '/services', {
      catalogServiceId: catalogEntry(),
      ...BASE,
      reason: REASON,
    });
    const id = String(bodyOf(created).data['id']);
    m.audit.docs.length = 0;
    const changed = await call('patch', `/services/${id}`, {
      price: '15.000',
      active: false,
      reason: REASON,
    });
    expect(changed.status).toBe(200);
    expect(m.services.docs[0]?.['price']).toBe(15000);
    expect(m.audit.docs[0]).toMatchObject({ action: 'SALON_SERVICE_UPDATE' });

    uploads.set('services/ok.jpg', { purpose: 'SERVICE_MEDIA', ownerType: 'ADMIN' });
    uploads.set('services/other.jpg', { purpose: 'SERVICE_MEDIA', ownerType: 'CUSTOMER' });
    expect(
      (await call('patch', `/services/${id}`, { mediaKeys: ['services/ok.jpg'], reason: REASON }))
        .status,
    ).toBe(200);
    expect(
      (
        await call('patch', `/services/${id}`, {
          mediaKeys: ['services/ok.jpg', 'services/other.jpg'],
          reason: REASON,
        })
      ).status,
    ).toBe(400);
    expect((await call('patch', `/services/${id}`, { reason: REASON })).status).toBe(400);
    const missing = new Types.ObjectId().toHexString();
    expect(
      (await call('patch', `/services/${missing}`, { active: true, reason: REASON })).status,
    ).toBe(404);
  });
});

describe('admin salon edit: staff profile', () => {
  const addMember = (over: Record<string, unknown> = {}): string => {
    const _id = new Types.ObjectId();
    m.members.docs.push({
      _id,
      salonId,
      firstName: 'Rana',
      lastName: 'Said',
      phone: '+962770001122',
      role: 'EMPLOYEE',
      permissions: [],
      active: true,
      providesServices: false,
      ...over,
    });
    return _id.toHexString();
  };
  const addService = (): string => {
    const _id = new Types.ObjectId();
    m.services.docs.push({
      _id,
      salonId,
      catalogServiceId: new Types.ObjectId(),
      price: 1000,
      durationMinutes: 30,
      active: true,
      mediaKeys: [],
    });
    return _id.toHexString();
  };

  it('reads and replaces a member’s staff profile with reason and audit', async () => {
    const member = addMember();
    const service = addService();
    expect(bodyOf(await call('get', `/members/${member}/staff`)).data['providesServices']).toBe(
      false,
    );
    const res = await call('put', `/members/${member}/staff`, {
      providesServices: true,
      serviceIds: [service],
      brideQualified: true,
      workingDays: [{ day: 'SUN' }, { day: 'MON' }],
      reason: REASON,
    });
    expect(res.status).toBe(200);
    expect(bodyOf(res).data['serviceIds']).toEqual([service]);
    expect(m.audit.docs[0]).toMatchObject({ action: 'SALON_STAFF_EDIT', reason: REASON });
    expect(notices[0]).toMatchObject({ area: 'staff' });
  });

  it('refuses other salons’ services, a closed day, a member of another salon, and a missing reason', async () => {
    const member = addMember();
    const foreign = new Types.ObjectId().toHexString();
    const profile = {
      providesServices: true,
      serviceIds: [] as string[],
      brideQualified: false,
      workingDays: [{ day: 'SUN' }],
    };
    expect(
      (
        await call('put', `/members/${member}/staff`, {
          ...profile,
          serviceIds: [foreign],
          reason: REASON,
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await call('put', `/members/${member}/staff`, {
          ...profile,
          workingDays: [{ day: 'SAT' }],
          reason: REASON,
        })
      ).status,
    ).toBe(400);
    const other = addMember({ salonId: new Types.ObjectId() });
    expect(
      (await call('put', `/members/${other}/staff`, { ...profile, reason: REASON })).status,
    ).toBe(404);
    expect((await call('put', `/members/${member}/staff`, profile)).status).toBe(400);
    expect(m.audit.docs).toHaveLength(0);
  });
});
