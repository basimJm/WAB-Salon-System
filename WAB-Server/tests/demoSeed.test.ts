import { Types } from 'mongoose';
import { DEMO_IMAGE_PREFIX, DEMO_SERVICES } from '../src/constants/demoCatalog';
import { DEMO_SALONS } from '../src/constants/demoSeed';
import { SEED_AREAS } from '../src/constants/referenceData';
import { isCustomerVisible } from '../src/domain/salons/bookable';
import { ALL_MODELS } from '../src/models';
import { buildDemoDataset } from '../src/seeds/demo/dataset';
import {
  DEMO_COLLECTIONS,
  type DemoContext,
  type DemoDataset,
  type DemoDoc,
} from '../src/seeds/demo/types';
import { toDemoModel, writeDemoDataset, type DemoModel } from '../src/seeds/demo/writer';
import { isDemoImagePurpose, planDemoImages } from '../src/seeds/demoImages';
import { assertDemoAllowed } from '../src/seeds/runDemo';
import { dayOfWeek, localDateOf, localMinutesOf, parseHHmm } from '../src/utils/time';

const NOW = new Date('2026-10-21T09:00:00.000Z');
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
const data = buildDemoDataset(context);
const realModels = new Map(ALL_MODELS.map((model) => [model.modelName, toDemoModel(model)]));
const ids = (collection: keyof DemoDataset): Set<string> =>
  new Set(data[collection].map((doc) => doc._id.toString()));
const str = (value: unknown): string => String(value);
type Person = {
  staffId: Types.ObjectId;
  start: Date;
  end: Date;
  subtotal: number;
  services: { salonServiceId: Types.ObjectId; price: number }[];
  isBride: boolean;
};

describe('demo seed data set', () => {
  it('fills every collection the seed owns, with a realistic volume', () => {
    // Branches come after the main-branch migration (`buildDemoBranches`, tests/demoBranches).
    for (const collection of DEMO_COLLECTIONS.filter((name) => name !== 'Branch')) {
      expect(data[collection].length).toBeGreaterThan(0);
    }
    expect(data.Salon).toHaveLength(DEMO_SALONS.length);
    expect(data.Booking.length).toBeGreaterThan(80);
    expect(data.Review.length).toBeGreaterThan(20);
  });

  it('every row passes its real Mongoose schema', () => {
    for (const collection of DEMO_COLLECTIONS) {
      const model = realModels.get(collection);
      expect(model).toBeDefined();
      for (const doc of data[collection]) {
        const error = model?.validateDoc(doc);
        expect([collection, doc._id.toString(), error?.message ?? null]).toEqual([
          collection,
          doc._id.toString(),
          null,
        ]);
      }
    }
  });

  it('is deterministic: the same context gives the same rows and ids', () => {
    expect(JSON.stringify(buildDemoDataset(context))).toBe(JSON.stringify(data));
  });

  it('keeps unique keys unique (phones, references, notifications, favorites, installations, alerts)', () => {
    const unique = (values: string[]): void => {
      expect(new Set(values).size).toBe(values.length);
    };
    unique(data.Member.map((m) => str(m['phone'])));
    unique(data.Customer.map((c) => str((c['phone'] as { e164: string }).e164)));
    unique(data.Booking.map((b) => str(b['referenceNumber'])));
    unique(
      data.Notification.map(
        (n) => `${str(n['recipientType'])}:${str(n['recipientId'])}:${str(n['dedupeKey'])}`,
      ),
    );
    unique(data.Favorite.map((f) => `${str(f['customerId'])}:${str(f['salonId'])}`));
    unique(data.Installation.map((i) => `${str(i['app'])}:${str(i['installationId'])}`));
    unique(data.Alert.map((a) => str(a['dedupeKey'])));
    for (const collection of DEMO_COLLECTIONS)
      unique(data[collection].map((doc) => doc._id.toString()));
  });

  it('links every reference to a row of the data set', () => {
    const customers = ids('Customer');
    const salons = ids('Salon');
    const members = ids('Member');
    const bookings = ids('Booking');
    for (const booking of data.Booking) {
      expect(customers.has(str(booking['customerId']))).toBe(true);
      expect(salons.has(str(booking['salonId']))).toBe(true);
    }
    for (const member of data.Member) expect(salons.has(str(member['salonId']))).toBe(true);
    for (const review of data.Review) {
      expect(bookings.has(str(review['bookingId']))).toBe(true);
      if (review['staffId'] !== undefined) expect(members.has(str(review['staffId']))).toBe(true);
    }
    for (const t of data.Transaction)
      if (t['bookingId'] !== undefined) expect(bookings.has(str(t['bookingId']))).toBe(true);
    for (const r of data.Refund) expect(ids('Transaction').has(str(r['transactionId']))).toBe(true);
  });

  it('respects the booking rules: gender, companions, skills, bride staff, hours, no double booking', () => {
    const salonById = new Map(data.Salon.map((s) => [s._id.toString(), s]));
    const memberById = new Map(data.Member.map((m) => [m._id.toString(), m]));
    const customerById = new Map(data.Customer.map((c) => [c._id.toString(), c]));
    const intervals = new Map<string, [number, number][]>();
    for (const booking of data.Booking) {
      const salon = salonById.get(str(booking['salonId'])) as DemoDoc;
      const persons = booking['persons'] as Person[];
      expect(booking['salonGender']).toBe(salon['gender']);
      expect(customerById.get(str(booking['customerId']))?.['gender']).toBe(salon['gender']);
      expect(persons.length).toBeGreaterThanOrEqual(1);
      expect(persons.length).toBeLessThanOrEqual(6);
      for (const person of persons) {
        const staff = memberById.get(str(person.staffId)) as DemoDoc;
        const profile = staff['staff'] as {
          serviceIds: Types.ObjectId[];
          brideQualified: boolean;
          workingDays: { day: string }[];
        };
        expect(str(staff['salonId'])).toBe(str(salon._id));
        for (const service of person.services) {
          expect(profile.serviceIds.map(str)).toContain(str(service.salonServiceId));
        }
        if (person.isBride) expect(profile.brideQualified).toBe(true);
        const day = dayOfWeek(localDateOf(person.start, TZ));
        expect(profile.workingDays.map((d) => d.day)).toContain(day);
        const hours = (
          salon['weeklySchedule'] as { day: string; isOff: boolean; open: string; close: string }[]
        ).find((d) => d.day === day);
        expect(hours?.isOff).toBe(false);
        expect(localMinutesOf(person.start, TZ)).toBeGreaterThanOrEqual(
          parseHHmm(hours?.open ?? ''),
        );
        expect(localMinutesOf(person.end, TZ)).toBeLessThanOrEqual(parseHHmm(hours?.close ?? ''));
        const list = intervals.get(str(person.staffId)) ?? [];
        for (const [s, e] of list)
          expect(person.end.getTime() <= s || person.start.getTime() >= e).toBe(true);
        list.push([person.start.getTime(), person.end.getTime()]);
        intervals.set(str(person.staffId), list);
      }
    }
  });

  it('keeps money consistent: integer fils, totals, refunds and ledger', () => {
    let charged = 0;
    for (const booking of data.Booking) {
      const money = booking['money'] as {
        total: number;
        dueOnline: number;
        paidOnline: number;
        remaining: number;
        refunded: number;
      };
      const persons = booking['persons'] as Person[];
      for (const value of Object.values(money)) expect(Number.isInteger(value)).toBe(true);
      expect(persons.reduce((sum, p) => sum + p.subtotal, 0)).toBe(money.total);
      for (const p of persons)
        expect(p.services.reduce((sum, s) => sum + s.price, 0)).toBe(p.subtotal);
      expect(money.paidOnline + money.remaining).toBe(money.total);
      expect(money.refunded).toBeLessThanOrEqual(money.paidOnline);
      if (booking['paymentMethod'] === 'PAY_ON_ARRIVAL') expect(money.paidOnline).toBe(0);
      charged += money.paidOnline;
    }
    const ledger = (type: string): number =>
      data.LedgerEntry.filter((e) => e['type'] === type).reduce(
        (sum, e) => sum + (e['amount'] as number),
        0,
      );
    expect(ledger('CHARGE')).toBe(charged);
    const refunded = data.Booking.reduce(
      (sum, b) => sum + (b['money'] as { refunded: number }).refunded,
      0,
    );
    expect(ledger('REFUND')).toBe(-refunded);
  });

  it('books payouts from the ledger: net = gross - fees - refunds, a PAYOUT line per transfer', () => {
    expect(data.Payout.length).toBeGreaterThan(0);
    for (const payout of data.Payout) {
      const n = (key: string): number => payout[key] as number;
      expect(n('net')).toBe(n('gross') - n('fees') - n('refunds') + n('adjustments'));
      const line = data.LedgerEntry.find(
        (e) => e['type'] === 'PAYOUT' && str(e['payoutId']) === payout._id.toString(),
      );
      if (payout['status'] === 'TRANSFERRED') expect(line?.['amount']).toBe(-n('net'));
      else expect(line).toBeUndefined();
    }
  });

  it('follows the state machine: ordered history, nothing after the seed run, reviews on completed only', () => {
    const completed = new Set(
      data.Booking.filter((b) => b['status'] === 'COMPLETED').map((b) => b._id.toString()),
    );
    for (const booking of data.Booking) {
      const history = booking['statusHistory'] as { status: string; at: Date }[];
      expect(history[0]?.status).toBe('PENDING');
      expect(history[history.length - 1]?.status).toBe(booking['status']);
      for (let i = 1; i < history.length; i += 1) {
        expect((history[i]?.at as Date).getTime()).toBeGreaterThanOrEqual(
          (history[i - 1]?.at as Date).getTime(),
        );
      }
      for (const entry of history) expect(entry.at.getTime()).toBeLessThanOrEqual(NOW.getTime());
      if (['COMPLETED', 'NO_SHOW', 'AUTO_CANCELLED'].includes(str(booking['status']))) {
        expect((booking['appointmentStart'] as Date).getTime()).toBeLessThan(NOW.getTime());
      }
    }
    for (const review of data.Review) expect(completed.has(str(review['bookingId']))).toBe(true);
    const states = new Set(data.Booking.map((b) => str(b['status'])));
    for (const status of ['PENDING', 'APPROVED', 'COMPLETED', 'REJECTED', 'CANCELLED_BY_CUSTOMER'])
      expect(states).toContain(status);
  });

  it('shows every salon state; only complete LIVE salons are visible to customers', () => {
    expect(new Set(data.Salon.map((s) => s['state']))).toEqual(
      new Set([
        'LIVE',
        'OFFLINE',
        'APPROVED_INCOMPLETE',
        'APPLICATION_PENDING',
        'APPLICATION_REJECTED',
      ]),
    );
    for (const salon of data.Salon) {
      const visible = isCustomerVisible(salon as never);
      expect(visible).toBe(salon['state'] === 'LIVE');
    }
  });
});

describe('writeDemoDataset', () => {
  /** In-memory stand-in: rows by id plus optional natural-key collisions. */
  const memoryModel = (
    name: string,
    collide: Set<string> = new Set(),
  ): DemoModel & { rows: Map<string, object> } => {
    const rows = new Map<string, object>();
    return {
      modelName: name,
      rows,
      validateDoc: () => null,
      find: (filter) => ({
        lean: () => {
          const wanted = (filter as { _id: { $in: Types.ObjectId[] } })._id.$in.map(str);
          return Promise.resolve(wanted.filter((id) => rows.has(id)).map((id) => ({ _id: id })));
        },
      }),
      insertMany: (docs) => {
        const writeErrors: { code: number }[] = [];
        const insertedDocs: object[] = [];
        for (const doc of docs as DemoDoc[]) {
          if (collide.has(doc._id.toString())) writeErrors.push({ code: 11000 });
          else {
            rows.set(doc._id.toString(), doc);
            insertedDocs.push(doc);
          }
        }
        return writeErrors.length > 0
          ? Promise.reject(
              Object.assign(new Error('E11000'), { code: 11000, writeErrors, insertedDocs }),
            )
          : Promise.resolve(docs);
      },
    };
  };
  const memoryModels = (collide?: Set<string>): Map<string, ReturnType<typeof memoryModel>> =>
    new Map(DEMO_COLLECTIONS.map((name) => [name, memoryModel(name, collide)]));

  it('inserts everything once; a second run inserts nothing', async () => {
    const models = memoryModels();
    const first = await writeDemoDataset(data, models);
    expect(first.Booking).toEqual({ created: data.Booking.length, existing: 0 });
    const second = await writeDemoDataset(data, models);
    for (const collection of DEMO_COLLECTIONS) expect(second[collection].created).toBe(0);
  });

  it('counts a natural-key collision (admin already made that row) as existing', async () => {
    const page = data.ContentPage[0] as DemoDoc;
    const result = await writeDemoDataset(data, memoryModels(new Set([page._id.toString()])));
    expect(result.ContentPage).toEqual({ created: data.ContentPage.length - 1, existing: 1 });
  });

  it('refuses to write anything when one row is invalid, naming it', async () => {
    const models = memoryModels();
    const broken = { ...data, Faq: [{ ...(data.Faq[0] as DemoDoc), app: 'NOPE' }] };
    const faqModel = realModels.get('Faq') as DemoModel;
    (models.get('Faq') as DemoModel & { validateDoc: DemoModel['validateDoc'] }).validateDoc = (
      doc,
    ) => faqModel.validateDoc(doc);
    await expect(writeDemoDataset(broken, models)).rejects.toThrow(/Faq .*app/);
    expect((models.get('Salon') as ReturnType<typeof memoryModel>).rows.size).toBe(0);
  });

  it('rethrows a write error that is not a duplicate key', async () => {
    const models = memoryModels();
    (models.get('Salon') as DemoModel & { insertMany: DemoModel['insertMany'] }).insertMany = () =>
      Promise.reject(new Error('connection lost'));
    await expect(writeDemoDataset(data, models)).rejects.toThrow('connection lost');
  });

  it('never runs in production', () => {
    expect(() => {
      assertDemoAllowed({ isProduction: true, demoSeed: { onStart: false } }, 'wab');
    }).toThrow();
    expect(() => {
      assertDemoAllowed({ isProduction: false, demoSeed: { onStart: false } }, 'wab');
    }).not.toThrow();
  });
});

describe('planDemoImages', () => {
  const targets = [
    { key: 'demo/catalog/haircut.jpg', purpose: 'CATALOG_IMAGE' as const },
    { key: 'demo/catalog/shave.jpg', purpose: 'CATALOG_IMAGE' as const },
    { key: 'demo/salons/a/gallery-1.jpg', purpose: 'GALLERY_IMAGE' as const },
    { key: 'demo/salons/a/gallery-2.jpg', purpose: 'GALLERY_IMAGE' as const },
    { key: 'demo/salons/b/gallery-1.jpg', purpose: 'GALLERY_IMAGE' as const },
    { key: 'demo/banners/welcome-ar.jpg', purpose: 'BANNER_IMAGE' as const },
  ];

  it('uses a photo named like the key first, then shares the rest in turn', () => {
    const plan = planDemoImages(
      targets,
      new Map([
        ['catalog', ['Haircut.PNG', 'other.jpg', 'notes.txt']],
        ['gallery', ['g2.jpg', 'g1.jpg']],
      ]),
    );
    const source = (key: string): string | undefined =>
      plan.assignments.find((a) => a.key === key)?.source;
    expect(source('demo/catalog/haircut.jpg')).toBe('catalog/Haircut.PNG');
    expect(source('demo/catalog/shave.jpg')).toBe('catalog/Haircut.PNG');
    expect([
      source('demo/salons/a/gallery-1.jpg'),
      source('demo/salons/a/gallery-2.jpg'),
      source('demo/salons/b/gallery-1.jpg'),
    ]).toEqual(['gallery/g1.jpg', 'gallery/g2.jpg', 'gallery/g1.jpg']);
  });

  it('reports keys whose folder is missing or has no photo', () => {
    const plan = planDemoImages(targets, new Map([['banners', ['readme.md']]]));
    expect(plan.assignments).toHaveLength(0);
    expect(plan.missing.map((m) => m.key).sort()).toEqual(targets.map((t) => t.key).sort());
  });

  it('knows which upload purposes have a photo folder', () => {
    expect(isDemoImagePurpose('SALON_COVER')).toBe(true);
    expect(isDemoImagePurpose('GALLERY_VIDEO')).toBe(false);
  });
});
