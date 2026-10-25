import { HTTP_STATUS } from '@/constants/http';
import { defineEndpoint } from '../api/endpoint';
import * as dto from '../contract/generated/dto';
import { OPERATIONS } from '../contract/generated/operations';
import { MOCK_BOOKINGS } from './bookingsRoutes';
import type { BranchStore } from './branchStore';
import { mockRoute } from './mockRoute';
import { MockBusinessError, type MockRoute } from './mockTransport';
import { MOCK_SETTING_DEFAULTS } from './settingsFixture';

const UPCOMING = new Set(['PENDING', 'APPROVED']);
const MAX_BRANCHES_KEY = 'salon.maxBranches';
const DEFAULT_MAX = 20;
const maxBranches = () => {
  const v = MOCK_SETTING_DEFAULTS[MAX_BRANCHES_KEY];
  return typeof v === 'number' ? v : DEFAULT_MAX;
};

/** PENDING/APPROVED mock bookings of a branch: they block closing it (§5.16). */
const upcomingOf = (branchId: string) =>
  MOCK_BOOKINGS.filter((b) => b.branch?.id === branchId && UPCOMING.has(b.status)).map((b) => b.id);

/** `/admin/v1/salons/{id}/branches…` with the server's refusals: limit, last branch, main branch, upcoming bookings. */
export function branchesRoutes(store: BranchStore): readonly MockRoute[] {
  const O = OPERATIONS;
  const salonOf = (p: Record<string, string>) => p['id'] ?? '';
  return [
    mockRoute(
      defineEndpoint(O.getSalonsByIdBranches, { data: dto.getSalonsByIdBranchesDataSchema }),
      ({ params }) => {
        const items = store.list(salonOf(params));
        return {
          data: items,
          meta: { page: 1, pageSize: items.length, total: items.length, totalPages: 1 },
          empty: [],
        };
      },
    ),
    mockRoute(
      defineEndpoint(O.postSalonsByIdBranches, {
        data: dto.postSalonsByIdBranchesDataSchema,
        body: dto.postSalonsByIdBranchesBodySchema,
      }),
      ({ params, body }) => ({
        data: store.create(salonOf(params), body as Record<string, unknown>, maxBranches()),
      }),
    ),
    mockRoute(
      defineEndpoint(O.getSalonsByIdBranchesByBranchId, {
        data: dto.getSalonsByIdBranchesByBranchIdDataSchema,
      }),
      ({ params }) => ({ data: store.find(salonOf(params), params['branchId']) }),
    ),
    mockRoute(
      defineEndpoint(O.patchSalonsByIdBranchesByBranchId, {
        data: dto.patchSalonsByIdBranchesByBranchIdDataSchema,
        body: dto.patchSalonsByIdBranchesByBranchIdBodySchema,
      }),
      ({ params, body }) => ({
        data: store.update(salonOf(params), params['branchId'], body as Record<string, unknown>),
      }),
    ),
    mockRoute(
      defineEndpoint(O.postSalonsByIdBranchesByBranchIdMain, {
        data: dto.postSalonsByIdBranchesByBranchIdMainDataSchema,
        body: dto.postSalonsByIdBranchesByBranchIdMainBodySchema,
      }),
      ({ params }) => ({ data: store.makeMain(salonOf(params), params['branchId']) }),
    ),
    mockRoute(
      defineEndpoint(O.postSalonsByIdBranchesByBranchIdOffline, {
        data: dto.postSalonsByIdBranchesByBranchIdOfflineDataSchema,
        body: dto.postSalonsByIdBranchesByBranchIdOfflineBodySchema,
      }),
      ({ params, body }) => ({
        data: store.setStatus(
          salonOf(params),
          params['branchId'],
          'OFFLINE',
          (body as { reason: string }).reason,
        ),
      }),
    ),
    mockRoute(
      defineEndpoint(O.postSalonsByIdBranchesByBranchIdOnline, {
        data: dto.postSalonsByIdBranchesByBranchIdOnlineDataSchema,
        body: dto.postSalonsByIdBranchesByBranchIdOnlineBodySchema,
      }),
      ({ params }) => ({ data: store.setStatus(salonOf(params), params['branchId'], 'ACTIVE') }),
    ),
    mockRoute(
      defineEndpoint(O.postSalonsByIdBranchesByBranchIdClose, {
        data: dto.postSalonsByIdBranchesByBranchIdCloseDataSchema,
        body: dto.postSalonsByIdBranchesByBranchIdCloseBodySchema,
      }),
      ({ params }) => {
        const salonId = salonOf(params);
        const branch = store.find(salonId, params['branchId']);
        const open = store.list(salonId).filter((b) => b.status !== 'CLOSED');
        if (open.length <= 1) throw new MockBusinessError(HTTP_STATUS.unprocessable, 'LAST_BRANCH');
        if (branch.isMain)
          throw new MockBusinessError(
            HTTP_STATUS.unprocessable,
            'INVALID_TRANSITION',
            [],
            'branchMainCannotClose',
          );
        const blocking = upcomingOf(branch.id);
        if (blocking.length > 0)
          throw new MockBusinessError(
            HTTP_STATUS.conflict,
            'BRANCH_HAS_UPCOMING_BOOKINGS',
            blocking,
          );
        return { data: store.setStatus(salonId, branch.id, 'CLOSED') };
      },
    ),
  ];
}
