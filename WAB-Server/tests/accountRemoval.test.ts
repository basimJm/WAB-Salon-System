import { Types } from 'mongoose';
import { createSalonDeletionService } from '../src/domain/salons/salonDeletion.service';
import { createMemberSelfService } from '../src/domain/team/memberSelf.service';
import type { RaiseInput } from '../src/domain/alerts/alerts.service';
import { deletionRequestSchema } from '../src/modules/merchant/salon/deletion.routes';
import { FakeStorageProvider } from '../src/providers/storage';
import { MembersRepository } from '../src/repositories/identity.repository';
import { SalonsRepository } from '../src/repositories/salons.repository';
import { BusinessRuleError } from '../src/utils/errors';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const salonsM = createFakeModel();
const membersM = createFakeModel();
const salonId = new Types.ObjectId();
const NOW = new Date('2026-10-26T09:00:00.000Z');
const raised: RaiseInput[] = [];
const deletion = createSalonDeletionService({
  salons: new SalonsRepository(salonsM.model as never),
  state: { setOffline: () => Promise.resolve({}) } as never,
  bookings: { check: () => Promise.resolve([]) },
  audit: { record: (e: Record<string, unknown>) => Promise.resolve(e as never) },
  notifier: { changed: () => Promise.resolve() },
  logger: createLogger({ level: 'silent' }),
  alerts: {
    raise: (input) => {
      raised.push(input);
      return Promise.resolve(true);
    },
  },
  now: () => NOW,
});
const deactivated: string[] = [];
const self = createMemberSelfService({
  members: new MembersRepository(membersM.model as never),
  storage: new FakeStorageProvider(),
  uploads: { assertConfirmed: () => Promise.resolve() },
  phones: { resolve: () => Promise.reject(new Error('unused')), verify: () => Promise.resolve() },
  otpGate: { reset: () => Promise.resolve() },
  lifecycle: {
    deactivateMember: ({ memberId }) => {
      if (memberId === 'owner')
        return Promise.reject(new BusinessRuleError({ code: 'LAST_OWNER' }));
      deactivated.push(memberId);
      return Promise.resolve();
    },
  },
});

beforeEach(() => {
  salonsM.docs.length = 0;
  raised.length = 0;
  deactivated.length = 0;
  salonsM.docs.push({ _id: salonId, name: 'Hifa', state: 'LIVE' });
});

describe('salon deletion request (M25, SRV-133)', () => {
  it('stamps the request once and alerts the admin; asking again changes nothing', async () => {
    const first = await deletion.request({
      salonId: salonId.toHexString(),
      memberId: 'owner',
      note: 'Closing down',
    });
    expect(first.requestedAt).toEqual(NOW);
    expect(salonsM.docs[0]?.['deletionRequestedAt']).toEqual(NOW);
    expect(raised).toEqual([
      expect.objectContaining({
        kind: 'SALON_DELETION_REQUEST',
        entityType: 'SALON',
        entityId: salonId.toHexString(),
        data: { salonName: 'Hifa', memberId: 'owner', note: 'Closing down' },
      }),
    ]);
    const again = await deletion.request({ salonId: salonId.toHexString(), memberId: 'owner' });
    expect(again.requestedAt).toEqual(NOW);
    expect(raised).toHaveLength(1);
  });

  it('the admin can then decide it (reject clears it)', async () => {
    await deletion.request({ salonId: salonId.toHexString(), memberId: 'owner' });
    await deletion.decide({
      salonId: salonId.toHexString(),
      decision: 'REJECT',
      reason: 'Talked to the owner',
      actor: { adminId: new Types.ObjectId().toHexString(), ip: '127.0.0.1', userAgent: 'jest' },
    });
    expect(salonsM.docs[0]?.['deletionRequestedAt']).toBeUndefined();
  });

  it('the note is optional and bounded', () => {
    expect(deletionRequestSchema.safeParse({}).success).toBe(true);
    expect(deletionRequestSchema.safeParse({ note: 'x'.repeat(501) }).success).toBe(false);
  });
});

describe('leaving the salon (M25, SRV-133)', () => {
  it('a member removes their own access; the owner is refused (LAST_OWNER)', async () => {
    await self.leave({ memberId: 'm1', salonId: salonId.toHexString() });
    expect(deactivated).toEqual(['m1']);
    await expect(
      self.leave({ memberId: 'owner', salonId: salonId.toHexString() }),
    ).rejects.toMatchObject({ code: 'LAST_OWNER' });
  });
});
