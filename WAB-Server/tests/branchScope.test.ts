import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { OWNER_ONLY_PERMISSIONS, ROLE_TEMPLATES } from '../src/constants/permissions';
import { assertBookingInScope } from '../src/domain/bookings/bookingActions.service';
import { createBookingQueriesService } from '../src/domain/bookings/bookingQueries.service';
import { effectivePermissions, normalizeGrant } from '../src/domain/permissions/permissions';
import { createHoursService } from '../src/domain/salons/hoursService';
import { createTeamService } from '../src/domain/team/team.service';
import { requireAuth } from '../src/middlewares/auth';
import { loadMember } from '../src/middlewares/permission';
import { BookingsRepository } from '../src/repositories/bookings.repository';
import { BranchesRepository } from '../src/repositories/branches.repository';
import { ClosuresRepository } from '../src/repositories/closures.repository';
import { CustomersRepository, MembersRepository } from '../src/repositories/identity.repository';
import { SalonsRepository } from '../src/repositories/salons.repository';
import { signAccessToken } from '../src/utils/auth/accessToken';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const SECRET = 'a'.repeat(48);
const salonId = new Types.ObjectId();
const mainBranch = new Types.ObjectId();
const otherBranch = new Types.ObjectId();
const week = (open: string): { day: string; isOff: boolean; open: string; close: string }[] =>
  ['SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI'].map((day) => ({
    day,
    isOff: day === 'FRI',
    open,
    close: '20:00',
  }));

describe('branch members lose the salon-wide permissions (§6 branch scope)', () => {
  it('managers are offered every branch permission but finance, subscription and policy', () => {
    expect(ROLE_TEMPLATES.MANAGER).not.toEqual(expect.arrayContaining(['FINANCE_VIEW']));
    for (const permission of OWNER_ONLY_PERMISSIONS)
      expect(ROLE_TEMPLATES.MANAGER).not.toContain(permission);
    expect(ROLE_TEMPLATES.MANAGER).toEqual(
      expect.arrayContaining([
        'BOOKINGS_RESPOND',
        'STAFF_MANAGE',
        'WORKING_HOURS_MANAGE',
        'SERVICES_MANAGE',
        'DASHBOARD_VIEW',
      ]),
    );
  });

  it('drops them from grants and from what older members still hold; the owner keeps all', () => {
    expect(normalizeGrant(['BOOKINGS_VIEW_ALL', 'FINANCE_VIEW', 'POLICIES_MANAGE'])).toEqual([
      'BOOKINGS_VIEW_ALL',
    ]);
    expect(
      effectivePermissions({
        role: 'MANAGER',
        permissions: ['FINANCE_VIEW', 'SUBSCRIPTION_VIEW', 'REVIEWS_VIEW'],
      }),
    ).toEqual(['REVIEWS_VIEW']);
    expect(effectivePermissions({ role: 'OWNER', permissions: [] })).toContain('FINANCE_VIEW');
    expect(() => normalizeGrant(['BRANCHES_MANAGE'])).toThrow();
  });
});

describe('bookings of another branch', () => {
  it('a branch member is refused (BRANCH_SCOPE_DENIED); the owner is not', () => {
    expect(() => {
      assertBookingInScope({ branchId: 'b2' }, { branchId: 'b1' });
    }).toThrow(expect.objectContaining({ code: 'BRANCH_SCOPE_DENIED', httpStatus: 403 }) as Error);
    expect(() => {
      assertBookingInScope({ branchId: 'b2' }, {});
    }).not.toThrow();
  });

  it('lists and calendars only the member’s branch', async () => {
    const bookings = createFakeModel();
    const at = new Date('2026-11-01T08:00:00.000Z');
    const booking = (branchId: Types.ObjectId, ref: string): Record<string, unknown> => ({
      _id: new Types.ObjectId(),
      referenceNumber: ref,
      salonId,
      branchId,
      customerId: new Types.ObjectId(),
      status: 'APPROVED',
      appointmentStart: at,
      appointmentEnd: new Date(at.getTime() + 3_600_000),
      persons: [
        {
          name: 'A',
          isMain: true,
          isBride: false,
          staffId: new Types.ObjectId(),
          start: at,
          end: new Date(at.getTime() + 3_600_000),
          services: [],
          subtotal: 0,
        },
      ],
      money: { total: 0, dueOnline: 0, paidOnline: 0, remaining: 0, refunded: 0 },
      statusHistory: [],
      paymentMethod: 'PAY_ON_ARRIVAL',
      paymentStatus: 'PAY_ON_ARRIVAL',
      refundStatus: 'NONE',
      hasBride: false,
      respondBy: new Date(at.getTime() + 3_600_000),
      createdAt: at,
    });
    bookings.docs.push(booking(mainBranch, 'WAB-AAAAAA'), booking(otherBranch, 'WAB-BBBBBB'));
    const queries = createBookingQueriesService({
      bookings: new BookingsRepository(bookings.model as never),
      customers: new CustomersRepository(createFakeModel().model as never),
      members: new MembersRepository(createFakeModel().model as never),
      salons: new SalonsRepository(createFakeModel().model as never),
      settings: { get: () => Promise.resolve('Asia/Amman') } as never,
      storage: { getPublicUrl: (key: string) => key },
      now: () => new Date('2026-10-30T08:00:00.000Z'),
    });
    const member = {
      id: new Types.ObjectId().toHexString(),
      permissions: ['BOOKINGS_VIEW_ALL'],
      branchId: otherBranch.toHexString(),
    };
    const page = await queries.list({
      audience: { kind: 'MERCHANT', salonId: salonId.toHexString(), member },
      query: {},
      params: { page: 1, pageSize: 10 },
    } as never);
    expect(page.items.map((b: { referenceNumber: string }) => b.referenceNumber)).toEqual([
      'WAB-BBBBBB',
    ]);
    const ownerPage = await queries.list({
      audience: {
        kind: 'MERCHANT',
        salonId: salonId.toHexString(),
        member: { ...member, branchId: undefined },
      },
      query: {},
      params: { page: 1, pageSize: 10 },
    } as never);
    expect(ownerPage.items).toHaveLength(2);
    const blocks = await queries.calendar({
      salonId: salonId.toHexString(),
      member,
      from: '2026-11-01',
      to: '2026-11-01',
    });
    expect(blocks.map((b) => b.referenceNumber)).toEqual(['WAB-BBBBBB']);
  });
});

describe('team and hours per branch', () => {
  const setup = (): {
    members: ReturnType<typeof createFakeModel>;
    branches: ReturnType<typeof createFakeModel>;
    closures: ReturnType<typeof createFakeModel>;
    salons: ReturnType<typeof createFakeModel>;
  } => {
    const members = createFakeModel();
    const branches = createFakeModel();
    const closures = createFakeModel();
    const salons = createFakeModel();
    salons.docs.push({
      _id: salonId,
      name: 'Hifa',
      businessType: 'SALON',
      audience: 'FEMALE',
      state: 'LIVE',
      weeklySchedule: week('10:00'),
      mainBranchId: mainBranch,
    });
    branches.docs.push(
      {
        _id: mainBranch,
        salonId,
        isMain: true,
        status: 'ACTIVE',
        name: { ar: 'ر', en: 'Main' },
        weeklySchedule: week('10:00'),
        completeness: { missing: [], isComplete: true },
      },
      {
        _id: otherBranch,
        salonId,
        isMain: false,
        status: 'ACTIVE',
        name: { ar: 'م', en: 'Mecca Street' },
        weeklySchedule: week('12:00'),
        completeness: { missing: [], isComplete: true },
      },
    );
    return { members, branches, closures, salons };
  };

  it('managers list only their branch; the owner picks a branch for a new member and can move staff', async () => {
    const { members, branches } = setup();
    members.docs.push(
      {
        _id: new Types.ObjectId(),
        salonId,
        branchId: mainBranch,
        role: 'EMPLOYEE',
        firstName: 'A',
        lastName: 'A',
        phone: '+962780000001',
        permissions: [],
        active: true,
        providesServices: true,
        staff: {
          serviceIds: [new Types.ObjectId()],
          workingDays: [],
          brideQualified: false,
          rating: { avg: 0, count: 0 },
          customersCount: 0,
        },
      },
      {
        _id: new Types.ObjectId(),
        salonId,
        branchId: otherBranch,
        role: 'EMPLOYEE',
        firstName: 'B',
        lastName: 'B',
        phone: '+962780000002',
        permissions: [],
        active: true,
        providesServices: false,
      },
    );
    const conflicts: string[] = [];
    const team = createTeamService({
      members: new MembersRepository(members.model as never),
      lifecycle: {} as never,
      phones: {
        resolve: (p: { number: string }) => Promise.resolve({ e164: `+962${p.number}` }),
      } as never,
      storage: { getPublicUrl: (k: string) => k },
      uploads: {} as never,
      branches: new BranchesRepository(branches.model as never),
      deactivationConflicts: {
        check: ({ memberId }) =>
          Promise.resolve(conflicts.includes(memberId) ? ([{ bookingId: 'b-1' }] as never) : []),
      },
    });
    const scoped = await team.list({
      salonId: salonId.toHexString(),
      params: { page: 1, pageSize: 10 },
      branchId: otherBranch.toHexString(),
    });
    expect(scoped.items.map((m) => m.firstName)).toEqual(['B']);
    const first = members.docs[0]?.['_id'] as Types.ObjectId;
    await expect(
      team.get({
        salonId: salonId.toHexString(),
        id: first.toHexString(),
        branchId: otherBranch.toHexString(),
      }),
    ).rejects.toMatchObject({ code: 'BRANCH_SCOPE_DENIED' });

    const created = await team.create({
      salonId: salonId.toHexString(),
      firstName: 'C',
      lastName: 'C',
      phone: { countryCode: 'JO', number: '780000003' },
      role: 'EMPLOYEE',
      branchId: otherBranch.toHexString(),
    });
    expect(created.branchId).toBe(otherBranch.toHexString());
    await expect(
      team.create({
        salonId: salonId.toHexString(),
        firstName: 'D',
        lastName: 'D',
        phone: { countryCode: 'JO', number: '780000004' },
        role: 'EMPLOYEE',
        branchId: new Types.ObjectId().toHexString(),
      }),
    ).rejects.toMatchObject({ code: 'BRANCH_NOT_FOUND' });

    conflicts.push(first.toHexString());
    await expect(
      team.update({
        salonId: salonId.toHexString(),
        id: first.toHexString(),
        patch: { branchId: otherBranch.toHexString() },
      }),
    ).rejects.toMatchObject({ code: 'SCHEDULE_CONFLICT' });
    conflicts.length = 0;
    const moved = await team.update({
      salonId: salonId.toHexString(),
      id: first.toHexString(),
      patch: { branchId: otherBranch.toHexString() },
    });
    expect(moved.branchId).toBe(otherBranch.toHexString());
    expect((members.docs[0]?.['staff'] as { serviceIds: unknown[] }).serviceIds).toEqual([]);
  });

  it('hours: a manager reads and writes their branch; the owner’s salon-level calls work on the main branch', async () => {
    const { branches, closures, salons } = setup();
    const hours = createHoursService({
      salons: new SalonsRepository(salons.model as never),
      closures: new ClosuresRepository(closures.model as never),
      settings: {
        get: (key: string) => Promise.resolve(key === 'timezone' ? 'Asia/Amman' : 15),
      } as never,
      state: { recompute: () => Promise.resolve({} as never) },
      branches: new BranchesRepository(branches.model as never),
      mainBranches: { idOf: () => Promise.resolve(mainBranch), mirror: () => Promise.resolve() },
      now: () => new Date('2026-10-30T08:00:00.000Z'),
    });
    expect(
      (await hours.get(salonId.toHexString(), otherBranch.toHexString())).weeklySchedule[0]?.open,
    ).toBe('12:00');
    expect((await hours.get(salonId.toHexString())).weeklySchedule[0]?.open).toBe('10:00');
    await hours.setWeekly(salonId.toHexString(), week('13:00') as never, otherBranch.toHexString());
    expect((branches.docs[1]?.['weeklySchedule'] as { open: string }[])[0]?.open).toBe('13:00');
    expect((salons.docs[0]?.['weeklySchedule'] as { open: string }[])[0]?.open).toBe('10:00');
    const closure = await hours.addClosure({
      salonId: salonId.toHexString(),
      scope: otherBranch.toHexString(),
      from: '2026-11-10',
      to: '2026-11-10',
      reason: 'Training',
    });
    expect(String(closures.docs[0]?.['branchId'])).toBe(otherBranch.toHexString());
    expect((await hours.get(salonId.toHexString())).closures).toEqual([]);
    await expect(
      hours.removeClosure({
        salonId: salonId.toHexString(),
        id: closure.id,
        scope: mainBranch.toHexString(),
      }),
    ).rejects.toMatchObject({ code: 'BRANCH_SCOPE_DENIED' });
  });
});

describe('loadMember', () => {
  it('puts the member’s branch on the request (never for the owner)', async () => {
    const members = createFakeModel();
    const seen: unknown[] = [];
    const app = createApp({ logger, router: undefined } as never);
    expect(app).toBeDefined();
    const managerId = new Types.ObjectId();
    const ownerId = new Types.ObjectId();
    members.docs.push(
      {
        _id: managerId,
        salonId,
        branchId: otherBranch,
        role: 'MANAGER',
        permissions: [],
        active: true,
      },
      { _id: ownerId, salonId, branchId: mainBranch, role: 'OWNER', permissions: [], active: true },
    );
    const auth = requireAuth('merchant', SECRET);
    const load = loadMember(new MembersRepository(members.model as never));
    const express = (await import('express')).default;
    const probe = express();
    probe.get('/', auth, load, (req, res) => {
      seen.push(req.member?.branchId);
      res.json({});
    });
    for (const id of [managerId, ownerId]) {
      const token = signAccessToken({
        secret: SECRET,
        subjectType: 'MEMBER',
        subjectId: id.toHexString(),
        ttlSec: 600,
      }).token;
      await request(probe).get('/').set('Authorization', `Bearer ${token}`);
    }
    expect(seen).toEqual([otherBranch.toHexString(), undefined]);
  });
});
