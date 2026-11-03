import type { RequestHandler } from 'express';
import request from 'supertest';
import { createApp } from '../src/app';
import type { MerchantBookingService } from '../src/domain/bookings/merchantBooking.service';
import { createLogger } from '../src/utils/logger';

const logger = createLogger({ level: 'silent' });
const START = new Date('2026-11-10T09:00:00.000Z');
const END = new Date('2026-11-10T09:30:00.000Z');
const calls: unknown[] = [];
const service: MerchantBookingService = {
  lookup: () => Promise.resolve({ registered: true, firstName: 'Noor', gender: 'FEMALE' }),
  create: (input) => {
    calls.push(input);
    return Promise.resolve({
      id: 'b1',
      referenceNumber: 'WAB-ABC234',
      status: 'APPROVED',
      paymentMethod: 'PAY_ON_ARRIVAL',
      paymentStatus: 'PAY_ON_ARRIVAL',
      appointmentStart: START,
      appointmentEnd: END,
      respondBy: END,
      money: { total: '8.000', dueOnline: '0.000', paidOnline: '0.000', remaining: '8.000' },
      customerRegistered: false,
    });
  },
};
const guard: RequestHandler = (req, _res, next) => {
  req.member = {
    id: 'm1',
    salonId: 's1',
    role: 'MANAGER',
    branchId: 'br1',
    permissions: (req.header('x-perms') ?? 'BOOKINGS_CREATE').split(',').filter(Boolean),
  } as never;
  next();
};
const app = createApp({
  logger,
  services: {
    merchantBooking: service,
    salonProfile: { service: undefined as never, guard: [guard] },
  },
});
const body = {
  customer: { phone: { countryCode: 'JO', number: '791234567' }, name: 'Hiba', gender: 'FEMALE' },
  persons: [{ name: 'Hiba', serviceIds: ['64a000000000000000000001'], start: START.toISOString() }],
};

describe('merchant booking routes (§5.20, SRV-188)', () => {
  it('POST /bookings answers 201 with the booking itself in `data` (not wrapped twice)', async () => {
    const res = await request(app).post('/merchant/v1/bookings').send(body);
    expect(res.status).toBe(201);
    const data = (res.body as { data: Record<string, unknown> }).data;
    expect(data).toMatchObject({
      id: 'b1',
      status: 'APPROVED',
      appointmentStart: START.toISOString(),
      customerRegistered: false,
    });
    expect(data).not.toHaveProperty('data');
    expect(calls[0]).toMatchObject({ salonId: 's1', member: { id: 'm1', branchId: 'br1' } });
  });

  it('needs BOOKINGS_CREATE for the booking and the lookup', async () => {
    const create = await request(app)
      .post('/merchant/v1/bookings')
      .set('x-perms', 'BOOKINGS_VIEW_ALL')
      .send(body);
    expect(create.status).toBe(403);
    const lookup = await request(app)
      .get('/merchant/v1/customers/lookup?countryCode=JO&number=791234567')
      .set('x-perms', 'BOOKINGS_VIEW_ALL');
    expect(lookup.status).toBe(403);
    const ok = await request(app).get(
      '/merchant/v1/customers/lookup?countryCode=JO&number=791234567',
    );
    expect((ok.body as { data: unknown }).data).toEqual({
      registered: true,
      firstName: 'Noor',
      gender: 'FEMALE',
    });
  });
});
