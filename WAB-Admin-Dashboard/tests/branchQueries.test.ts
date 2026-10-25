import { describe, expect, it } from 'vitest';
import { parseListState } from '@/domain/shared/listState';
import {
  bookingExportParams,
  bookingQueryOf,
  BOOKING_FILTER_KEYS,
} from '@/presentation/bookings/bookingFilters';
import { reviewFilters } from '@/presentation/reviews/reviewFilters';
import { makeContainer } from './helpers/render';

const SALON = '64f000000000000000000001';
const BRANCH = '64b000000000000000000012';
const stateOf = (qs: string, keys: string[]) =>
  parseListState(new URLSearchParams(qs), { filterKeys: keys });

describe('branch filters -> API queries (ADM-091)', () => {
  it('bookings: branch only counts together with its salon, and reaches the export', () => {
    const q = bookingQueryOf(stateOf(`salon=${SALON}&branch=${BRANCH}`, BOOKING_FILTER_KEYS));
    expect(q).toMatchObject({ salonId: SALON, branchId: BRANCH });
    expect(bookingExportParams(q)).toMatchObject({ salonId: SALON, branchId: BRANCH });
    expect(
      bookingQueryOf(stateOf(`branch=${BRANCH}`, BOOKING_FILTER_KEYS)).branchId,
    ).toBeUndefined();
  });

  it('reviews: salon and branch filters', () => {
    const keys = ['status', 'target', 'rating', 'salon', 'branch'];
    expect(reviewFilters(stateOf(`salon=${SALON}&branch=${BRANCH}`, keys)).query).toMatchObject({
      salonId: SALON,
      branchId: BRANCH,
    });
    expect(reviewFilters(stateOf(`branch=${BRANCH}`, keys)).query.branchId).toBeUndefined();
  });

  it('exports accept real salon/branch ids and refuse a malformed one before sending', async () => {
    const { repositories } = makeContainer();
    const job = await repositories.exports.request({
      kind: 'TRANSACTIONS',
      format: 'CSV',
      params: { salonId: SALON, branchId: BRANCH },
    });
    expect(job.kind).toBe('TRANSACTIONS');
    await expect(
      repositories.exports.request({ kind: 'BOOKINGS', format: 'CSV', params: { branchId: 'x' } }),
    ).rejects.toMatchObject({ kind: 'validation' });
  });
});
