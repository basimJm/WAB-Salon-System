import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { createPolicyService } from '../src/domain/salons/policy.service';
import { requireAuth } from '../src/middlewares/auth';
import { loadMember } from '../src/middlewares/permission';
import { MembersRepository } from '../src/repositories/identity.repository';
import { SalonsRepository } from '../src/repositories/salons.repository';
import { signAccessToken } from '../src/utils/auth/accessToken';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const SECRET = 'a'.repeat(48);
const salonId = new Types.ObjectId();
const otherSalon = new Types.ObjectId();
const salonsM = createFakeModel();
const membersM = createFakeModel();
const recomputes: string[] = [];
const app = createApp({
  logger,
  services: {
    policy: createPolicyService({
      salons: new SalonsRepository(salonsM.model as never),
      state: {
        recompute: (id) => {
          recomputes.push(id);
          return Promise.resolve({ salonId: id, state: 'LIVE', missing: [], isComplete: true });
        },
      },
    }),
    salonProfile: {
      service: undefined as never,
      guard: [
        requireAuth('merchant', SECRET),
        loadMember(new MembersRepository(membersM.model as never)),
      ],
    },
  },
});

interface Body {
  data: Record<string, unknown> | null;
  error: { code: string; details: { field: string }[] };
}
const bodyOf = (res: { body: unknown }): Body => res.body as Body;
const member = (role: string, permissions: string[] = []): Record<string, string> => {
  const _id = new Types.ObjectId();
  membersM.docs.push({ _id, salonId, role, permissions, active: true });
  return {
    Authorization: `Bearer ${signAccessToken({ secret: SECRET, subjectType: 'MEMBER', subjectId: _id.toHexString(), ttlSec: 600 }).token}`,
  };
};
const POLICY = {
  cancellationWindowHours: 24,
  paymentOptions: ['PAY_ON_ARRIVAL', 'DEPOSIT'],
  depositPercentage: 20,
  depositRefundableOnCustomerCancel: true,
  fullPaymentRefundOnCustomerCancel: 'MINUS_DEPOSIT',
  noShowDeposit: 'KEEP',
  noShowFullPayment: 'REFUND_MINUS_DEPOSIT',
  notes: 'Please arrive 5 minutes early',
};
const put = async (
  headers: Record<string, string>,
  body: object,
): Promise<{ status: number; body: unknown }> =>
  await request(app).put('/merchant/v1/salon/policy').set(headers).send(body);

beforeEach(() => {
  salonsM.docs.length = 0;
  membersM.docs.length = 0;
  recomputes.length = 0;
  salonsM.docs.push({ _id: salonId, name: 'Glow' }, { _id: otherSalon, name: 'Other' });
});

describe('salon policy', () => {
  it('needs POLICIES_MANAGE: only the owner has it (a branch member never does, even granted)', async () => {
    expect((await request(app).get('/merchant/v1/salon/policy')).status).toBe(401);
    const denied = await request(app)
      .get('/merchant/v1/salon/policy')
      .set(member('MANAGER', ['SALON_PROFILE_MANAGE']));
    expect(denied.status).toBe(403);
    expect((await put(member('MANAGER', ['FINANCE_VIEW']), POLICY)).status).toBe(403);
    expect((await put(member('MANAGER', ['POLICIES_MANAGE']), POLICY)).status).toBe(403);
    expect((await put(member('OWNER'), POLICY)).status).toBe(200);
    expect((await request(app).get('/merchant/v1/salon/policy').set(member('OWNER'))).status).toBe(
      200,
    );
  });

  it('is null until set; saves the policy, recomputes completeness and reads it back', async () => {
    const owner = member('OWNER');
    expect(bodyOf(await request(app).get('/merchant/v1/salon/policy').set(owner)).data).toBeNull();
    const res = await put(owner, POLICY);
    expect(res.status).toBe(200);
    expect(bodyOf(res).data).toEqual({ ...POLICY, depositPercentage: 20 });
    expect(salonsM.docs[0]?.['policy']).toMatchObject({
      cancellationWindowHours: 24,
      depositPercentage: 20,
      notes: 'Please arrive 5 minutes early',
    });
    expect(recomputes).toEqual([salonId.toHexString()]);
    expect(
      bodyOf(await request(app).get('/merchant/v1/salon/policy').set(owner)).data,
    ).toMatchObject({ noShowFullPayment: 'REFUND_MINUS_DEPOSIT' });
    expect(String(salonsM.docs[1]?.['policy'])).toBe('undefined');
  });

  it('a deposit percentage without DEPOSIT is dropped; notes can be removed by omitting them', async () => {
    const owner = member('OWNER');
    const res = await put(owner, {
      ...POLICY,
      paymentOptions: ['FULL_ONLINE'],
      depositPercentage: 30,
      notes: '',
    });
    expect(res.status).toBe(200);
    expect(bodyOf(res).data).toMatchObject({
      depositPercentage: null,
      notes: null,
      paymentOptions: ['FULL_ONLINE'],
    });
    expect(
      (salonsM.docs[0]?.['policy'] as Record<string, unknown>)['depositPercentage'],
    ).toBeUndefined();
    await put(owner, POLICY);
    const { notes: _unused, ...withoutNotes } = POLICY;
    expect(_unused).toBeDefined();
    await put(owner, withoutNotes);
    expect((salonsM.docs[0]?.['policy'] as Record<string, unknown>)['notes']).toBeUndefined();
  });

  it.each([
    ['DEPOSIT without a percentage', { depositPercentage: undefined }, 'body.depositPercentage'],
    ['percentage 0', { depositPercentage: 0 }, 'body.depositPercentage'],
    ['percentage 101', { depositPercentage: 101 }, 'body.depositPercentage'],
    ['a fractional percentage', { depositPercentage: 12.5 }, 'body.depositPercentage'],
    ['no payment option', { paymentOptions: [] }, 'body.paymentOptions'],
    [
      'a duplicate payment option',
      { paymentOptions: ['DEPOSIT', 'DEPOSIT'] },
      'body.paymentOptions',
    ],
    ['an unknown payment option', { paymentOptions: ['CASH'] }, 'body.paymentOptions.0'],
    ['a negative window', { cancellationWindowHours: -1 }, 'body.cancellationWindowHours'],
    ['a window over 30 days', { cancellationWindowHours: 721 }, 'body.cancellationWindowHours'],
    ['a fractional window', { cancellationWindowHours: 1.5 }, 'body.cancellationWindowHours'],
    [
      'an unknown refund rule',
      { fullPaymentRefundOnCustomerCancel: 'HALF' },
      'body.fullPaymentRefundOnCustomerCancel',
    ],
    ['an unknown no-show rule', { noShowDeposit: 'MAYBE' }, 'body.noShowDeposit'],
    ['long notes', { notes: 'x'.repeat(1001) }, 'body.notes'],
  ])('rejects %s and saves nothing', async (_n, over, field) => {
    const res = await put(member('OWNER'), { ...POLICY, ...over });
    expect(res.status).toBe(400);
    expect(bodyOf(res).error.details.map((d) => d.field)).toContain(field);
    expect(salonsM.docs[0]?.['policy']).toBeUndefined();
    expect(recomputes).toHaveLength(0);
  });

  it('accepts the boundaries: window 0 and 720, percentage 1 and 100', async () => {
    const owner = member('OWNER');
    expect(
      (await put(owner, { ...POLICY, cancellationWindowHours: 0, depositPercentage: 1 })).status,
    ).toBe(200);
    expect(
      (await put(owner, { ...POLICY, cancellationWindowHours: 720, depositPercentage: 100 }))
        .status,
    ).toBe(200);
  });

  it('answers 503 when unconfigured', async () => {
    expect((await request(createApp({ logger })).get('/merchant/v1/salon/policy')).status).toBe(
      503,
    );
  });
});
