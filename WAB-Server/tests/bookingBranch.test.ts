import { Types } from 'mongoose';
import { createAvailabilityService } from '../src/domain/availability/availability.service';
import { BranchesRepository } from '../src/repositories/branches.repository';
import { ClosuresRepository } from '../src/repositories/closures.repository';
import { MembersRepository } from '../src/repositories/identity.repository';
import { LeavesRepository } from '../src/repositories/leaves.repository';
import { SalonServicesRepository } from '../src/repositories/salonServices.repository';
import { SalonsRepository } from '../src/repositories/salons.repository';
import { createFakeModel } from './helpers/fakeModel';

const salonId = new Types.ObjectId();
const abdoun = new Types.ObjectId();
const mecca = new Types.ObjectId();
const DAYS = ['SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI'] as const;
const week = (
  open: string,
  close: string,
): { day: string; isOff: boolean; open: string; close: string }[] =>
  DAYS.map((day) => ({ day, isOff: false, open, close }));
const SETTINGS: Record<string, unknown> = {
  timezone: 'Asia/Amman',
  'booking.slotMinutes': 15,
  'booking.maxDaysAhead': 90,
  'booking.minLeadMinutes': 0,
  'booking.maxCompanions': 5,
};
// 2026-11-02 is a Monday; the clock is the evening before.
const NOW = new Date('2026-11-01T18:00:00.000Z');
const DATE = '2026-11-02';

const setup = (): {
  service: ReturnType<typeof createAvailabilityService>;
  branches: ReturnType<typeof createFakeModel>;
  ids: {
    abdounService: Types.ObjectId;
    meccaService: Types.ObjectId;
    abdounStaff: Types.ObjectId;
    meccaStaff: Types.ObjectId;
  };
} => {
  const salons = createFakeModel();
  const branches = createFakeModel();
  const members = createFakeModel();
  const services = createFakeModel();
  salons.docs.push({
    _id: salonId,
    name: 'Hifa',
    businessType: 'SALON',
    audience: 'FEMALE',
    state: 'LIVE',
    weeklySchedule: week('09:00', '18:00'),
    completeness: { missing: [], isComplete: true },
  });
  const branch = (
    id: Types.ObjectId,
    en: string,
    open: string,
    extra: Record<string, unknown> = {},
  ): Record<string, unknown> => ({
    _id: id,
    salonId,
    isMain: id === abdoun,
    status: 'ACTIVE',
    name: { ar: en, en },
    weeklySchedule: week(open, '20:00'),
    completeness: { missing: [], isComplete: true },
    ...extra,
  });
  branches.docs.push(branch(abdoun, 'Abdoun', '10:00'), branch(mecca, 'Mecca Street', '14:00'));
  const ids = {
    abdounService: new Types.ObjectId(),
    meccaService: new Types.ObjectId(),
    abdounStaff: new Types.ObjectId(),
    meccaStaff: new Types.ObjectId(),
  };
  services.docs.push(
    {
      _id: ids.abdounService,
      salonId,
      branchId: abdoun,
      catalogServiceId: new Types.ObjectId(),
      price: 15_000,
      durationMinutes: 60,
      brideOnly: false,
      active: true,
      mediaKeys: [],
    },
    {
      _id: ids.meccaService,
      salonId,
      branchId: mecca,
      catalogServiceId: new Types.ObjectId(),
      price: 18_000,
      durationMinutes: 60,
      brideOnly: false,
      active: true,
      mediaKeys: [],
    },
  );
  const staff = (
    id: Types.ObjectId,
    branchId: Types.ObjectId,
    serviceId: Types.ObjectId,
  ): Record<string, unknown> => ({
    _id: id,
    salonId,
    branchId,
    role: 'EMPLOYEE',
    firstName: 'S',
    lastName: 'S',
    phone: `+9627800${id.toHexString().slice(-5)}`,
    permissions: [],
    active: true,
    providesServices: true,
    staff: {
      serviceIds: [serviceId],
      brideQualified: false,
      workingDays: DAYS.map((day) => ({ day })),
      rating: { avg: 0, count: 0 },
      customersCount: 0,
    },
  });
  members.docs.push(
    staff(ids.abdounStaff, abdoun, ids.abdounService),
    staff(ids.meccaStaff, mecca, ids.meccaService),
  );
  const service = createAvailabilityService({
    salons: new SalonsRepository(salons.model as never),
    members: new MembersRepository(members.model as never),
    salonServices: new SalonServicesRepository(services.model as never),
    closures: new ClosuresRepository(createFakeModel().model as never),
    leaves: new LeavesRepository(createFakeModel().model as never),
    holds: { busy: () => Promise.resolve([]) },
    settings: { get: (key: string) => Promise.resolve(SETTINGS[key]) } as never,
    branches: new BranchesRepository(branches.model as never),
    now: () => NOW,
  });
  return { service, branches, ids };
};
const firstStart = (slots: { start: Date; available: boolean }[]): string | undefined =>
  slots.find((s) => s.available)?.start.toISOString();

describe('booking with branches (§5.18)', () => {
  it('a salon with several bookable branches needs the branch first (BRANCH_REQUIRED)', async () => {
    const { service, ids } = setup();
    await expect(
      service.slots({
        salonId: salonId.toHexString(),
        date: DATE,
        person: { serviceIds: [ids.abdounService.toHexString()], isBride: false },
      }),
    ).rejects.toMatchObject({ code: 'BRANCH_REQUIRED', httpStatus: 422 });
  });

  it('uses the picked branch’s hours, services and staff only', async () => {
    const { service, ids } = setup();
    const result = await service.slots({
      salonId: salonId.toHexString(),
      branchId: mecca.toHexString(),
      date: DATE,
      person: { serviceIds: [ids.meccaService.toHexString()], isBride: false },
    });
    // Mecca Street opens at 14:00 Amman (11:00 UTC); its only staff member is offered.
    expect(firstStart(result.slots)).toBe('2026-11-02T11:00:00.000Z');
    expect(new Set(result.slots.flatMap((s) => s.eligibleStaffIds))).toEqual(
      new Set([ids.meccaStaff.toHexString()]),
    );
    await expect(
      service.slots({
        salonId: salonId.toHexString(),
        branchId: mecca.toHexString(),
        date: DATE,
        person: { serviceIds: [ids.abdounService.toHexString()], isBride: false },
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('an offline branch is not bookable; an unknown branch is not found', async () => {
    const { service, branches, ids } = setup();
    Object.assign(branches.docs[1] ?? {}, { status: 'OFFLINE' });
    const person = { serviceIds: [ids.meccaService.toHexString()], isBride: false };
    await expect(
      service.slots({
        salonId: salonId.toHexString(),
        branchId: mecca.toHexString(),
        date: DATE,
        person,
      }),
    ).rejects.toMatchObject({ code: 'BRANCH_NOT_BOOKABLE' });
    await expect(
      service.slots({
        salonId: salonId.toHexString(),
        branchId: new Types.ObjectId().toHexString(),
        date: DATE,
        person,
      }),
    ).rejects.toMatchObject({ code: 'BRANCH_NOT_FOUND', httpStatus: 404 });
  });

  it('picks the only bookable branch by itself and returns it with the plan', async () => {
    const { service, branches, ids } = setup();
    Object.assign(branches.docs[1] ?? {}, {
      completeness: { missing: ['STAFF'], isComplete: false },
    });
    const result = await service.slots({
      salonId: salonId.toHexString(),
      date: DATE,
      person: { serviceIds: [ids.abdounService.toHexString()], isBride: false },
    });
    expect(firstStart(result.slots)).toBe('2026-11-02T07:00:00.000Z');
    const plan = await service.plan({
      salonId: salonId.toHexString(),
      persons: [
        {
          name: 'Rana',
          isBride: false,
          serviceIds: [ids.abdounService.toHexString()],
          start: new Date('2026-11-02T07:00:00.000Z'),
        },
      ],
    });
    expect(plan.branch?.id).toBe(abdoun.toHexString());
    expect(plan.persons[0]?.staffId).toBe(ids.abdounStaff.toHexString());
  });
});
