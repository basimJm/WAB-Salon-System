import { Types } from 'mongoose';
import { HOME_POPULARITY_CACHE_MS, HOME_POPULARITY_DAYS } from '../src/constants/home';
import { MS_PER_DAY } from '../src/constants/time';
import { createCatalogPopularity, createPastVisits } from '../src/domain/home/homeSources';
import { BookingsRepository } from '../src/repositories/bookings.repository';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });

describe('Explore popularity (§5.22)', () => {
  it('asks the bookings of the window once per cache period; a failure keeps the last order', async () => {
    let clock = new Date('2026-11-03T10:00:00Z');
    const asked: Date[] = [];
    let fail = false;
    const popularity = createCatalogPopularity({
      bookings: {
        catalogPopularity: (from) => {
          asked.push(from);
          return fail ? Promise.reject(new Error('down')) : Promise.resolve(['a', 'b']);
        },
      },
      logger,
      now: () => clock,
    });
    await expect(popularity.rank()).resolves.toEqual(['a', 'b']);
    expect(asked[0]?.getTime()).toBe(clock.getTime() - HOME_POPULARITY_DAYS * MS_PER_DAY);
    await popularity.rank();
    expect(asked).toHaveLength(1);
    clock = new Date(clock.getTime() + HOME_POPULARITY_CACHE_MS);
    fail = true;
    await expect(popularity.rank()).resolves.toEqual(['a', 'b']);
    expect(asked).toHaveLength(2);
  });

  it('a first failure gives no order (the home page still answers)', async () => {
    const popularity = createCatalogPopularity({
      bookings: { catalogPopularity: () => Promise.reject(new Error('down')) },
      logger,
    });
    await expect(popularity.rank()).resolves.toEqual([]);
  });
});

describe('Book again (§5.22)', () => {
  it('newest completed booking per business, with its services, up to the limit', async () => {
    const model = createFakeModel();
    const customer = new Types.ObjectId();
    const [salonA, salonB, salonC] = [
      new Types.ObjectId(),
      new Types.ObjectId(),
      new Types.ObjectId(),
    ];
    const service = (id: string): object => ({ salonServiceId: new Types.ObjectId(id) });
    const ids = Array.from({ length: 3 }, () => new Types.ObjectId().toHexString());
    const booking = (
      salonId: Types.ObjectId,
      start: string,
      status: string,
      services: string[],
    ): string => {
      const _id = new Types.ObjectId();
      model.docs.push({
        _id,
        customerId: customer,
        salonId,
        status,
        appointmentStart: new Date(start),
        persons: [{ services: services.map(service) }],
      });
      return _id.toHexString();
    };
    booking(salonA, '2026-10-01T10:00:00Z', 'COMPLETED', [ids[0] ?? '']);
    const newestA = booking(salonA, '2026-10-20T10:00:00Z', 'COMPLETED', [
      ids[1] ?? '',
      ids[1] ?? '',
    ]);
    booking(salonB, '2026-10-25T10:00:00Z', 'CANCELLED_BY_CUSTOMER', [ids[2] ?? '']);
    const c = booking(salonC, '2026-10-10T10:00:00Z', 'COMPLETED', [ids[2] ?? '']);
    const visits = createPastVisits(new BookingsRepository(model.model as never));
    await expect(visits.recent(customer.toHexString(), 5)).resolves.toEqual([
      { salonId: salonA.toHexString(), bookingId: newestA, salonServiceIds: [ids[1]] },
      { salonId: salonC.toHexString(), bookingId: c, salonServiceIds: [ids[2]] },
    ]);
    await expect(visits.recent(customer.toHexString(), 1)).resolves.toHaveLength(1);
    await expect(visits.recent('nope', 5)).resolves.toEqual([]);
  });
});
