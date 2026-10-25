import { Types } from 'mongoose';
import { SETTING_DEFAULTS } from '../src/constants/settings';
import { createBookingDraftService } from '../src/domain/bookings/bookingDraft.service';
import { createBookingReassignService } from '../src/domain/bookings/bookingReassign.service';
import { eligibleStaffQuery } from '../src/modules/merchant/bookings/bookings.validation';
import { BookingDraftsRepository } from '../src/repositories/bookingDrafts.repository';
import { BookingsRepository } from '../src/repositories/bookings.repository';
import { BranchesRepository } from '../src/repositories/branches.repository';
import { MembersRepository } from '../src/repositories/identity.repository';
import { SalonsRepository } from '../src/repositories/salons.repository';
import { createFakeModel } from './helpers/fakeModel';

const NOW = new Date('2026-10-26T09:00:00.000Z');
const LATER = new Date('2026-10-27T09:00:00.000Z');
const salonId = new Types.ObjectId();
const abdoun = new Types.ObjectId();
const mecca = new Types.ObjectId();
const lina = new Types.ObjectId();
const rana = new Types.ObjectId();
const s = (id: Types.ObjectId): string => id.toHexString();
const settings = { get: (k: string) => Promise.resolve(SETTING_DEFAULTS[k as never]) };

describe('merchant eligible staff for reassign (SRV-128a)', () => {
  const bookingsM = createFakeModel();
  const membersM = createFakeModel();
  const bookingId = new Types.ObjectId();
  const service = createBookingReassignService({
    redis: {} as never,
    bookings: new BookingsRepository(bookingsM.model as never),
    availability: { plan: () => Promise.resolve({} as never) },
    settings,
    members: new MembersRepository(membersM.model as never),
    now: () => NOW,
  });
  beforeEach(() => {
    bookingsM.docs.length = 0;
    membersM.docs.length = 0;
    bookingsM.docs.push({
      _id: bookingId,
      salonId,
      branchId: abdoun,
      status: 'APPROVED',
      persons: [{ name: 'P', staffId: lina, start: LATER, end: LATER, services: [], isMain: true }],
    });
    membersM.docs.push(
      {
        _id: lina,
        salonId,
        branchId: abdoun,
        firstName: 'Lina',
        lastName: 'H',
        active: true,
        providesServices: true,
      },
      {
        _id: rana,
        salonId,
        branchId: abdoun,
        firstName: 'Rana',
        lastName: 'K',
        active: true,
        providesServices: true,
      },
    );
  });

  it('lists the other staff of the booking’s branch for a member of that branch', async () => {
    const list = await service.eligibleStaff({
      bookingId: s(bookingId),
      personIndex: 0,
      salonId: s(salonId),
      member: { id: 'm', permissions: ['BOOKINGS_OPERATE'], branchId: s(abdoun) },
    });
    expect(list.map((x) => x.staffId)).toEqual([s(rana)]);
  });

  it('another branch is refused; another salon’s booking is not found', async () => {
    await expect(
      service.eligibleStaff({
        bookingId: s(bookingId),
        personIndex: 0,
        salonId: s(salonId),
        member: { id: 'm', permissions: ['BOOKINGS_OPERATE'], branchId: s(mecca) },
      }),
    ).rejects.toMatchObject({ code: 'BRANCH_SCOPE_DENIED' });
    await expect(
      service.eligibleStaff({
        bookingId: s(bookingId),
        personIndex: 0,
        salonId: s(new Types.ObjectId()),
        member: { id: 'm', permissions: ['BOOKINGS_OPERATE'] },
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(eligibleStaffQuery.safeParse({ personIndex: '-1' }).success).toBe(false);
  });
});

describe('booking draft shows its branch (SRV-128b)', () => {
  it('the draft view carries the branch name in the request language and its address', async () => {
    const draftsM = createFakeModel();
    const salonsM = createFakeModel();
    const branchesM = createFakeModel();
    const membersM = createFakeModel();
    const customerId = new Types.ObjectId();
    const draftId = new Types.ObjectId();
    salonsM.docs.push({ _id: salonId, name: 'Hifa' });
    branchesM.docs.push({
      _id: mecca,
      salonId,
      name: { ar: 'مكة', en: 'Mecca Street' },
      locationText: 'Mecca Street, Amman',
    });
    draftsM.docs.push({
      _id: draftId,
      customerId,
      salonId,
      branchId: mecca,
      expiresAt: LATER,
      paymentMethod: 'PAY_ON_ARRIVAL',
      persons: [
        {
          name: 'Rana',
          isMain: true,
          isBride: false,
          staffId: lina,
          staffSelection: 'ANY',
          start: LATER,
          end: LATER,
          subtotal: 10_000,
          services: [
            {
              salonServiceId: new Types.ObjectId(),
              name: { ar: 'قص', en: 'Cut' },
              price: 10_000,
              durationMinutes: 30,
            },
          ],
        },
      ],
      holds: [],
      policySnapshot: { cancellationWindowHours: 24, paymentOptions: ['PAY_ON_ARRIVAL'] },
    });
    const service = createBookingDraftService({
      branches: new BranchesRepository(branchesM.model as never),
      redis: {} as never,
      drafts: new BookingDraftsRepository(draftsM.model as never),
      availability: {} as never,
      holds: {} as never,
      catalog: {} as never,
      members: new MembersRepository(membersM.model as never),
      customers: {} as never,
      salons: new SalonsRepository(salonsM.model as never),
      settings,
      phones: {} as never,
      otpGate: {} as never,
      now: () => NOW,
    });
    const view = await service.get({ customerId: s(customerId), id: s(draftId), language: 'en' });
    expect(view.branch).toEqual({
      id: s(mecca),
      name: 'Mecca Street',
      locationText: 'Mecca Street, Amman',
    });
  });
});
