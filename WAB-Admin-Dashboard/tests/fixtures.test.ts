import { describe, expect, it } from 'vitest';
import type { ZodType } from 'zod';
import * as dto from '@/data/contract/generated/dto';
import { OPERATIONS } from '@/data/contract/generated/operations';
import { createMockRoutes } from '@/data/mock/fixtures';
import { createMockTransport } from '@/data/mock/mockTransport';
import { createScenarioStore } from '@/data/mock/scenarios';
import { successEnvelope } from '@/infrastructure/http/envelope';

/**
 * Operations the mock server has no fixture for, with the reason. A NEW operation in the contract is not in this
 * list, so this test fails until it gets a fixture (or an honest entry here). A fixture added for one of these
 * fails the test too, so the list can only shrink.
 */
/** Server operations whose screens are the next tasks (ADM-069..073); each task deletes its lines. */
const NOT_BUILT_YET = [
  'getBookingsByIdEligibleStaff',
  'getCustomersByIdNotifications',
  'getCustomersByIdReviews',
  'getSalonsByIdActivity',
  'getSalonsByIdAnalytics',
  'getSalonsByIdGallery',
  'getSalonsByIdHours',
  'getSalonsByIdKpis',
  'getSalonsByIdMembersByMemberIdStaff',
  'getSalonsByIdPolicy',
  'getSalonsByIdProfile',
  'getSalonsByIdServices',
  'patchCustomersById',
  'patchSalonsByIdClosuresByClosureId',
  'patchSalonsByIdProfile',
  'patchSalonsByIdServicesByServiceId',
  'postBookingsByIdCancel',
  'postBookingsByIdReassign',
  'postBookingsByIdRefund',
  'postCustomersByIdForceDelete',
  'postCustomersByIdPush',
  'postSalonsByIdClosures',
  'postSalonsByIdClosuresByClosureIdRemove',
  'postSalonsByIdClosuresPreview',
  'postSalonsByIdDeletionRequestDecision',
  'postSalonsByIdGallery',
  'postSalonsByIdGalleryByItemIdRemove',
  'postSalonsByIdHoursPreview',
  'postSalonsByIdServices',
  'putSalonsByIdGalleryOrder',
  'putSalonsByIdHours',
  'putSalonsByIdMembersByMemberIdStaff',
  'putSalonsByIdPolicy',
];

const WITHOUT_FIXTURE: Readonly<Record<string, string>> = {
  postAuthLogin: 'login runs on MockAuthRepository (mock mode)',
  postAuthVerifyOtp: 'login runs on MockAuthRepository (mock mode)',
  postAuthRefresh: 'login runs on MockAuthRepository (mock mode)',
  postAuthLogout: 'login runs on MockAuthRepository (mock mode)',
  getLocationsCountriesById: 'no screen reads one record: the list carries every field',
  getLocationsCitiesById: 'no screen reads one record: the list carries every field',
  getLocationsAreasById: 'no screen reads one record: the list carries every field',
  getContentPagesById: 'no screen reads one record: the list carries every field',
  getContentFaqsById: 'no screen reads one record: the list carries every field',
  getContentContactInfoById: 'no screen reads one record: the list carries every field',
  getAppConfigVersionsById: 'no screen reads one record: the list carries every field',
  getAppConfigMaintenanceById: 'no screen reads one record: the list carries every field',
  getBannersById: 'no screen reads one record: the list carries every field',
  getCatalogServicesById: 'no screen reads one record: the list carries every field',
  getRefundsById: 'no screen reads one record: the list carries every field',
  getPayoutsById: 'no screen reads one record: the list carries every field',
  getSubscriptionsBySalonId: 'no screen reads one record: the list carries every field',
  getCampaignsById: 'no screen reads one record: the list carries every field',
  getAuditLogsById: 'no screen reads one record: the list carries every field',
};

const key = (o: { method: string; path: string }) => `${o.method} ${o.path}`;

describe('mock fixtures', () => {
  const routes = createMockRoutes();
  const have = new Set(routes.map(key));
  const missing = Object.values(OPERATIONS)
    .filter((o) => !have.has(key(o)))
    .map((o) => o.id)
    .sort();

  it('every operation of the contract has a fixture, or a reason it has none', () => {
    expect(missing).toEqual([...Object.keys(WITHOUT_FIXTURE), ...NOT_BUILT_YET].sort());
  });

  it('every fixture route exists in the contract', () => {
    const known = new Set(Object.values(OPERATIONS).map(key));
    expect(routes.filter((r) => !known.has(key(r))).map(key)).toEqual([]);
  });

  it('every readable fixture answers with exactly what the generated schema allows', async () => {
    const fetchFn = createMockTransport({
      routes,
      scenarios: createScenarioStore(),
      sleep: () => Promise.resolve(),
    });
    const checked: string[] = [];
    for (const op of Object.values(OPERATIONS)) {
      if (op.method !== 'get' || !have.has(key(op))) continue;
      const name = `${op.id}DataSchema`;
      expect(name in dto, `${name} is generated`).toBe(true);
      const make = (dto as unknown as Record<string, () => ZodType>)[name] as () => ZodType;
      const url = `https://api.example.test${op.path.replace(/\{[A-Za-z]+\}/g, '64a000000000000000000001')}`;
      const response = await fetchFn(url, { method: 'GET' });
      // Record routes answer 404 for the made-up id: they are covered by their page tests.
      if (response.status === 404) continue;
      const answer: unknown = await response.json();
      const parsed = successEnvelope(make()).safeParse(answer);
      expect(
        parsed.success,
        `${op.id}: ${parsed.success ? '' : parsed.error.message.slice(0, 200)}`,
      ).toBe(true);
      checked.push(op.id);
    }
    expect(checked.length).toBeGreaterThan(20);
  });
});
