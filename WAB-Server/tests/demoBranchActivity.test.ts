import { Types } from 'mongoose';
import { DEMO_IMAGE_PREFIX, DEMO_SERVICES } from '../src/constants/demoCatalog';
import { DEMO_BRANCHES, DEMO_DAYS_AHEAD, DEMO_SALONS } from '../src/constants/demoSeed';
import { SEED_AREAS } from '../src/constants/referenceData';
import { ALL_MODELS } from '../src/models';
import { buildDemoBranchPlans, writeDemoBranchPlans } from '../src/seeds/demo/branchActivity';
import type { DemoBranchSource } from '../src/seeds/demo/branches';
import { buildDemoDatasetParts } from '../src/seeds/demo/dataset';
import { demoId } from '../src/seeds/demo/random';
import {
  DEMO_COLLECTIONS,
  type DemoContext,
  type DemoDataset,
  type DemoDoc,
} from '../src/seeds/demo/types';
import {
  toDemoModel,
  writeDemoBaseOnce,
  writeDemoDataset,
  type DemoModel,
} from '../src/seeds/demo/writer';
import { seedDemoOnStart } from '../src/seeds/demoOnStart';
import { createLogger } from '../src/utils/logger';
import { addDays, localDateOf } from '../src/utils/time';

const NOW = new Date('2026-10-26T09:00:00.000Z');
const TZ = 'Asia/Amman';
const context: DemoContext = {
  now: NOW,
  timeZone: TZ,
  adminId: new Types.ObjectId(),
  countryCode: 'JO',
  dialCode: '+962',
  cityId: new Types.ObjectId(),
  areaIds: new Map(SEED_AREAS.map((area) => [area.name.en, new Types.ObjectId()])),
  catalog: DEMO_SERVICES.map((service) => ({
    id: new Types.ObjectId(),
    gender: service.gender,
    name: service.name,
    imageKey: `${DEMO_IMAGE_PREFIX}${service.image}`,
  })),
};
const { data: base, customers } = buildDemoDatasetParts(context);

/** What `loadDemoBranchSources` reads after the migration: LIVE salons and their main services. */
const sources = new Map<string, DemoBranchSource>(
  [...new Set(DEMO_BRANCHES.map((spec) => spec.salon))].flatMap((key) => {
    const salonId = demoId(`salon:${key}`);
    const salon = base.Salon.find((row) => row._id.equals(salonId));
    if (salon?.['state'] !== 'LIVE') return [];
    const services = base.SalonService.filter(
      (row) => String(row['salonId']) === salonId.toString() && row['active'] === true,
    ).map((row) => ({
      catalogServiceId: row['catalogServiceId'] as Types.ObjectId,
      price: row['price'] as number,
      durationMinutes: row['durationMinutes'] as number,
      brideOnly: row['brideOnly'] === true,
    }));
    return [[key, { salonId, gender: salon['gender'] as DemoBranchSource['gender'], services }]];
  }),
);
const plans = buildDemoBranchPlans(context, sources, customers);
const str = (value: unknown): string => String(value);
const today = localDateOf(NOW, TZ);
const STATUSES_WANTED = [
  'AUTO_CANCELLED',
  'PENDING',
  'APPROVED',
  'COMPLETED',
  'NO_SHOW',
  'REJECTED',
  'CANCELLED_BY_CUSTOMER',
  'CANCELLED_BY_SALON',
];

type Person = {
  staffId: Types.ObjectId;
  start: Date;
  end: Date;
  isBride: boolean;
  services: { salonServiceId: Types.ObjectId }[];
};

describe('demo branches for the merchant app (SRV-160)', () => {
  it('gives two women’s and two men’s salons 2–4 branches each (main + extras)', () => {
    const perSalon = new Map<string, number>();
    for (const spec of DEMO_BRANCHES) perSalon.set(spec.salon, (perSalon.get(spec.salon) ?? 1) + 1);
    const byGender = { FEMALE: 0, MALE: 0 };
    for (const [salon, count] of perSalon) {
      expect(count).toBeGreaterThanOrEqual(2);
      expect(count).toBeLessThanOrEqual(4);
      const spec = DEMO_SALONS.find((item) => item.key === salon);
      expect(spec?.state).toBe('LIVE');
      if (spec !== undefined) byGender[spec.gender] += 1;
    }
    expect(byGender.FEMALE).toBeGreaterThanOrEqual(2);
    expect(byGender.MALE).toBeGreaterThanOrEqual(2);
    expect(plans).toHaveLength(DEMO_BRANCHES.length);
  });

  it('every branch has its place, hours, services, a manager and limited employees', () => {
    for (const plan of plans) {
      const [branch] = plan.data.Branch;
      expect(branch).toMatchObject({ isMain: false, status: 'ACTIVE' });
      expect(plan.data.SalonService.length).toBeGreaterThan(0);
      const roles = plan.data.Member.map((m) => m['role']);
      expect(roles.filter((role) => role === 'MANAGER')).toHaveLength(1);
      expect(roles.filter((role) => role === 'EMPLOYEE').length).toBeGreaterThanOrEqual(1);
      for (const member of plan.data.Member) {
        expect(str(member['branchId'])).toBe(plan.branchId.toString());
        if (member['role'] === 'EMPLOYEE') {
          expect(member['permissions']).toEqual(['BOOKINGS_VIEW_OWN', 'REVIEWS_VIEW']);
        }
      }
    }
  });

  it('books every branch in every state, today/tomorrow included, with branch id and snapshot', () => {
    const statuses = new Set<string>();
    for (const plan of plans) {
      expect(plan.data.Booking.length).toBeGreaterThan(10);
      const days = new Set<string>();
      for (const booking of plan.data.Booking) {
        statuses.add(str(booking['status']));
        expect(str(booking['branchId'])).toBe(plan.branchId.toString());
        expect(booking['branchSnapshot']).toMatchObject({ name: plan.data.Branch[0]?.['name'] });
        days.add(localDateOf(booking['appointmentStart'] as Date, TZ));
      }
      expect(days.has(today) || days.has(addDays(today, 1))).toBe(true);
      for (const row of [...plan.data.Transaction, ...plan.data.LedgerEntry, ...plan.data.Refund]) {
        expect(str(row['branchId'])).toBe(plan.branchId.toString());
      }
    }
    for (const status of STATUSES_WANTED)
      expect([status, statuses.has(status)]).toEqual([status, true]);
  });

  it('only books branch staff who work that day, have every skill, are bride-qualified, and are free', () => {
    for (const plan of plans) {
      const staff = new Map(plan.data.Member.map((m) => [m._id.toString(), m]));
      const busy = new Map<string, [number, number][]>();
      for (const booking of plan.data.Booking) {
        for (const person of booking['persons'] as Person[]) {
          const member = staff.get(person.staffId.toString());
          expect(member).toBeDefined();
          const skills = new Set(
            (member?.['staff'] as { serviceIds: Types.ObjectId[] }).serviceIds.map(str),
          );
          for (const service of person.services) {
            expect(skills.has(service.salonServiceId.toString())).toBe(true);
          }
          if (person.isBride) {
            expect((member?.['staff'] as { brideQualified: boolean }).brideQualified).toBe(true);
          }
          if (!['PENDING', 'APPROVED', 'COMPLETED', 'NO_SHOW'].includes(str(booking['status'])))
            continue;
          const list = busy.get(person.staffId.toString()) ?? [];
          for (const [start, end] of list) {
            expect(person.end.getTime() <= start || person.start.getTime() >= end).toBe(true);
          }
          list.push([person.start.getTime(), person.end.getTime()]);
          busy.set(person.staffId.toString(), list);
        }
      }
    }
  });

  it('writes reviews per branch and tells the owner and the branch manager about requests', () => {
    for (const plan of plans) {
      expect(plan.data.Review.length).toBeGreaterThan(0);
      for (const review of plan.data.Review) {
        expect(str(review['branchId'])).toBe(plan.branchId.toString());
      }
      const manager = plan.data.Member.find((m) => m['role'] === 'MANAGER');
      const memberRecipients = new Set(
        plan.data.Notification.filter((n) => n['recipientType'] === 'MEMBER').map((n) =>
          str(n['recipientId']),
        ),
      );
      expect(memberRecipients).toEqual(
        new Set([demoId(`member:${plan.salon}:owner`).toString(), str(manager?._id)]),
      );
      expect(plan.data.Notification.some((n) => n['recipientType'] === 'CUSTOMER')).toBe(true);
    }
  });

  it('SRV-172: customer notifications name "Salon - Branch" on every branch, main included, in AR and EN', () => {
    const texts = (
      rows: DemoDoc[],
      salonId: string,
      event = 'booking.cancelled_by_customer',
    ): { ar: string; en: string }[] =>
      rows
        .filter(
          (n) =>
            n['recipientType'] === 'CUSTOMER' &&
            n['event'] === event &&
            str((n['data'] as { salonId: string }).salonId) === salonId,
        )
        .map((n) => n['body'] as { ar: string; en: string });
    for (const plan of plans) {
      const spec = DEMO_BRANCHES.find((b) => b.salon === plan.salon && b.key === plan.key);
      const salon = DEMO_SALONS.find((s) => s.key === plan.salon);
      const found = texts(plan.data.Notification, demoId(`salon:${plan.salon}`).toString());
      expect(found.length).toBeGreaterThan(0);
      for (const text of found) {
        expect(text.en).toContain(`${salon?.name ?? ''} - ${spec?.name.en ?? ''}`);
        expect(text.ar).toContain(`${salon?.name ?? ''} - ${spec?.name.ar ?? ''}`);
      }
    }
    // The main branch (named after the salon's area, §5.16) of the same salons.
    for (const key of new Set(plans.map((plan) => plan.salon))) {
      const salon = DEMO_SALONS.find((s) => s.key === key);
      const area = SEED_AREAS.find((a) => a.name.en === salon?.place.area)?.name;
      const main = texts(base.Notification, demoId(`salon:${key}`).toString(), 'booking.created');
      expect(main.length).toBeGreaterThan(0);
      for (const text of main) {
        expect(text.en).toContain(`${salon?.name ?? ''} - ${area?.en ?? ''}`);
        expect(text.ar).toContain(`${salon?.name ?? ''} - ${area?.ar ?? ''}`);
      }
    }
    // A single-branch demo salon keeps its plain name.
    const single = DEMO_SALONS.find(
      (s) => s.state === 'LIVE' && !DEMO_BRANCHES.some((b) => b.salon === s.key),
    );
    for (const n of base.Notification.filter(
      (row) =>
        row['recipientType'] === 'CUSTOMER' &&
        str((row['data'] as { salonId: string }).salonId) ===
          demoId(`salon:${single?.key ?? ''}`).toString(),
    )) {
      expect((n['body'] as { en: string }).en).not.toContain(`${single?.name ?? ''} - `);
    }
  });

  it('puts the closure and the staff leave after the booked days of the branch', () => {
    const lastBooked = addDays(today, DEMO_DAYS_AHEAD);
    for (const plan of plans) {
      expect(str(plan.marker['from']) > lastBooked).toBe(true);
      expect(str(plan.marker['branchId'])).toBe(plan.branchId.toString());
      for (const leave of plan.data.StaffLeave) expect(str(leave['from']) > lastBooked).toBe(true);
    }
  });

  it('every row passes its real Mongoose schema', () => {
    const models = new Map(ALL_MODELS.map((model) => [model.modelName, toDemoModel(model)]));
    for (const plan of plans) {
      for (const collection of DEMO_COLLECTIONS) {
        for (const doc of [
          ...plan.data[collection],
          ...(collection === 'SalonClosure' ? [plan.marker] : []),
        ]) {
          const error = models.get(collection)?.validateDoc(doc);
          expect([collection, error?.message ?? null]).toEqual([collection, null]);
        }
      }
    }
  });

  it('is deterministic and keeps unique keys unique across the base and every branch', () => {
    expect(JSON.stringify(buildDemoBranchPlans(context, sources, customers))).toBe(
      JSON.stringify(plans),
    );
    const all = [base, ...plans.map((plan) => plan.data)];
    const unique = (values: unknown[]): void => {
      expect(new Set(values.map(str)).size).toBe(values.length);
    };
    unique(all.flatMap((data) => data.Member.map((m) => m['phone'])));
    unique(all.flatMap((data) => data.Booking.map((b) => b['referenceNumber'])));
    for (const collection of DEMO_COLLECTIONS) {
      unique(all.flatMap((data) => data[collection].map((doc) => doc._id)));
    }
    // The branch staff phones of SRV-148 stay where the merchant tooling expects them.
    const khalda = plans.find((plan) => plan.key === 'khalda');
    expect(khalda?.data.Member.map((m) => m['phone'])).toEqual(['+962789010001', '+962789010002']);
  });

  it('a branch whose salon is not seeded or not live is skipped', () => {
    expect(buildDemoBranchPlans(context, new Map(), customers)).toEqual([]);
  });
});

/** In-memory stand-in for the Mongoose models (rows by id). */
const memoryModels = (): Map<string, DemoModel & { rows: Map<string, object> }> =>
  new Map(
    DEMO_COLLECTIONS.map((name) => {
      const rows = new Map<string, object>();
      return [
        name,
        {
          modelName: name,
          rows,
          validateDoc: () => null,
          find: (filter: object) => ({
            lean: () => {
              const wanted = (filter as { _id: { $in: Types.ObjectId[] } })._id.$in.map(str);
              return Promise.resolve(
                wanted.filter((id) => rows.has(id)).map((id) => ({ _id: id })),
              );
            },
          }),
          insertMany: (docs: object[]) => {
            for (const doc of docs as DemoDoc[]) rows.set(doc._id.toString(), doc);
            return Promise.resolve(docs);
          },
        },
      ];
    }),
  );
const total = (models: ReturnType<typeof memoryModels>): number =>
  [...models.values()].reduce((sum, model) => sum + model.rows.size, 0);

describe('demo seed writes (idempotent, SRV-160)', () => {
  it('writes every branch once with its marker; a second run skips them all', async () => {
    const models = memoryModels();
    const first = await writeDemoBranchPlans(plans, models);
    expect(first.written).toHaveLength(plans.length);
    for (const plan of plans) {
      expect(models.get('SalonClosure')?.rows.has(plan.marker._id.toString())).toBe(true);
      expect(models.get('Booking')?.rows.size).toBeGreaterThan(0);
    }
    const count = total(models);
    // A run on another day builds other bookings: the finished branches are still skipped.
    const later = buildDemoBranchPlans(
      { ...context, now: new Date(NOW.getTime() + 3 * 24 * 3_600_000) },
      sources,
      customers,
    );
    const second = await writeDemoBranchPlans(later, models);
    expect(second).toEqual({ written: [], skipped: first.written });
    expect(total(models)).toBe(count);
  });

  it('completes a branch an earlier seed created without activity (SRV-148)', async () => {
    const models = memoryModels();
    const khalda = plans.find((plan) => plan.key === 'khalda');
    if (khalda === undefined) throw new Error('khalda plan missing');
    const structureOnly: DemoDataset = { ...khalda.data };
    for (const collection of DEMO_COLLECTIONS) {
      if (!['Branch', 'Member', 'SalonService'].includes(collection))
        structureOnly[collection] = [];
    }
    await writeDemoDataset(structureOnly, models);
    const result = await writeDemoBranchPlans([khalda], models);
    expect(result.written).toEqual(['lamar:khalda']);
    expect(models.get('Booking')?.rows.size).toBe(khalda.data.Booking.length);
    expect(models.get('Member')?.rows.size).toBe(khalda.data.Member.length);
  });

  it('writes the base data set once; a finished base is never written again', async () => {
    const models = memoryModels();
    const first = await writeDemoBaseOnce(base, models);
    expect(first).not.toBe('already seeded');
    const count = total(models);
    const later = buildDemoDatasetParts({ ...context, now: new Date(NOW.getTime() + 86_400_000) });
    expect(await writeDemoBaseOnce(later.data, models)).toBe('already seeded');
    expect(total(models)).toBe(count);
  });
});

describe('seedDemoOnStart (SEED_DEMO_ON_START, SRV-160)', () => {
  const logger = createLogger({ level: 'silent' });
  const run = (
    config: Parameters<typeof seedDemoOnStart>[0]['config'],
    seed: jest.Mock,
    databaseName = 'wab-dev',
  ): ReturnType<typeof seedDemoOnStart> => seedDemoOnStart({ config, logger, databaseName, seed });

  it('does nothing unless switched on', async () => {
    const seed = jest.fn();
    expect(await run({ isProduction: false, demoSeed: { onStart: false } }, seed)).toBe('disabled');
    expect(seed).not.toHaveBeenCalled();
  });

  it('seeds outside production, and under production rules only the named database', async () => {
    const seed = jest.fn().mockResolvedValue({});
    expect(await run({ isProduction: false, demoSeed: { onStart: true } }, seed)).toBe('seeded');
    const hostedDev = {
      isProduction: true,
      demoSeed: { onStart: true, allowedDatabase: 'wab-dev' },
    };
    expect(await run(hostedDev, seed)).toBe('seeded');
    expect(seed).toHaveBeenCalledTimes(2);
    seed.mockClear();
    expect(await run(hostedDev, seed, 'wab-prod')).toBe('refused');
    expect(await run({ isProduction: true, demoSeed: { onStart: true } }, seed)).toBe('refused');
    expect(seed).not.toHaveBeenCalled();
  });

  it('never throws: a failing seed is logged and the server keeps running', async () => {
    const seed = jest.fn().mockRejectedValue(new Error('no admin yet'));
    await expect(run({ isProduction: false, demoSeed: { onStart: true } }, seed)).resolves.toBe(
      'failed',
    );
  });
});
