import type { RequestHandler } from 'express';
import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { createSalonAudienceService } from '../src/domain/salons/salonAudience.service';
import type { SalonStateNotifier } from '../src/domain/salons/salonState.service';
import { SalonsRepository } from '../src/repositories/salons.repository';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const salonsM = createFakeModel();
const alerts: Record<string, unknown>[] = [];
const notices: Record<string, unknown>[] = [];
const notifier: SalonStateNotifier & { fail: boolean } = {
  fail: false,
  changed(input) {
    notices.push(input);
    return this.fail ? Promise.reject(new Error('push down')) : Promise.resolve();
  },
};
const service = createSalonAudienceService({
  salons: new SalonsRepository(salonsM.model as never),
  notifier,
  alerts: {
    raise: (input) => {
      alerts.push(input as unknown as Record<string, unknown>);
      return Promise.resolve(true);
    },
  },
  logger,
});
const salonId = new Types.ObjectId();
/** Stands in for the merchant guard: the role comes from a test header. */
const guard: RequestHandler = (req, _res, next) => {
  req.member = {
    id: new Types.ObjectId().toHexString(),
    salonId: salonId.toHexString(),
    role: (req.header('x-role') ?? 'OWNER') as never,
    permissions: [],
  };
  next();
};
const app = createApp({
  logger,
  services: {
    salonAudience: service,
    salonProfile: { service: undefined as never, guard: [guard] },
  },
});
const widen = (body: object, role = 'OWNER'): request.Test =>
  request(app).patch('/merchant/v1/salon/audience').set('x-role', role).send(body);
const salon = (over: Record<string, unknown>): void => {
  salonsM.docs.push({ _id: salonId, name: 'Barber', businessType: 'SALON', ...over });
};
interface Body {
  data: { businessType: string; audience: string };
  error: { code: string };
}
const bodyOf = (res: { body: unknown }): Body => res.body as Body;

beforeEach(() => {
  salonsM.docs.length = 0;
  alerts.length = 0;
  notices.length = 0;
  notifier.fail = false;
});

describe('PATCH /merchant/v1/salon/audience (§5.19)', () => {
  it.each(['MALE', 'FEMALE'])(
    'the owner widens a %s salon to BOTH: alert + owner notice',
    async (from) => {
      salon({ audience: from });
      const res = await widen({ audience: 'BOTH' });
      expect(res.status).toBe(200);
      expect(bodyOf(res).data).toEqual({ businessType: 'SALON', audience: 'BOTH' });
      expect(salonsM.docs[0]?.['audience']).toBe('BOTH');
      expect(alerts[0]).toMatchObject({
        kind: 'SALON_AUDIENCE_WIDENED',
        entityType: 'SALON',
        entityId: salonId.toHexString(),
        data: { from, to: 'BOTH' },
      });
      expect(notices).toEqual([
        { salonId: salonId.toHexString(), event: 'salon.audience_widened' },
      ]);
    },
  );

  it.each([
    ['narrowing BOTH → MALE', { audience: 'BOTH' }, 'MALE'],
    ['switching MALE → FEMALE', { audience: 'MALE' }, 'FEMALE'],
    ['the same audience', { audience: 'BOTH' }, 'BOTH'],
    ['a clinic', { businessType: 'CLINIC', audience: 'BOTH' }, 'BOTH'],
  ])('refuses %s with AUDIENCE_CHANGE_NOT_ALLOWED and changes nothing', async (_n, over, to) => {
    salon(over);
    const res = await widen({ audience: to });
    expect(res.status).toBe(422);
    expect(bodyOf(res).error.code).toBe('AUDIENCE_CHANGE_NOT_ALLOWED');
    expect(salonsM.docs[0]?.['audience']).toBe(over['audience']);
    expect(alerts).toHaveLength(0);
  });

  it('is owner only, validates the audience and keeps the change when the notice fails', async () => {
    salon({ audience: 'MALE' });
    const manager = await widen({ audience: 'BOTH' }, 'MANAGER');
    expect(manager.status).toBe(403);
    expect(bodyOf(manager).error.code).toBe('OWNER_REQUIRED');
    expect((await widen({ audience: 'KIDS' })).status).toBe(400);
    notifier.fail = true;
    expect((await widen({ audience: 'BOTH' })).status).toBe(200);
    expect(salonsM.docs[0]?.['audience']).toBe('BOTH');
  });

  it('answers 503 when unconfigured', async () => {
    expect(
      (await request(createApp({ logger })).patch('/merchant/v1/salon/audience').send({})).status,
    ).toBe(503);
  });
});
