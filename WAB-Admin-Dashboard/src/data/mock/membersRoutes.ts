import { HTTP_STATUS } from '@/constants/http';
import { defineEndpoint } from '../api/endpoint';
import { branchQuerySchema } from '../api/objectId';
import * as dto from '../contract/generated/dto';
import { OPERATIONS } from '../contract/generated/operations';
import { MOCK_BRANCH_IDS } from './branchesFixture';
import type { BranchStore } from './branchStore';
import { mockRoute } from './mockRoute';
import { MockBusinessError, type MockRoute } from './mockTransport';

const member = (
  id: string,
  name: string,
  role: 'OWNER' | 'MANAGER' | 'EMPLOYEE',
  branchId: string | null,
) => ({
  id,
  name,
  phone: `+9627900001${String(parseInt(id.slice(-2), 16)).padStart(2, '0')}`,
  role,
  active: true,
  providesServices: role !== 'OWNER',
  permissions: role === 'OWNER' ? ['BOOKINGS_VIEW_ALL', 'FINANCE_VIEW'] : [],
  branchId,
});

/** The team of a mock salon: the owner (all branches), one employee in the main branch, a manager in the second. */
export const MOCK_MEMBERS = [
  member('64f0000000000000000000a1', 'Maha Haddad', 'OWNER', null),
  member('64f0000000000000000000a2', 'Sara Ali', 'EMPLOYEE', MOCK_BRANCH_IDS.noorMain),
  member('64f0000000000000000000a3', 'Lina Odeh', 'MANAGER', MOCK_BRANCH_IDS.noorSecond),
];

/** Members (optionally of one branch) and moving a member to another open branch of the salon. */
export function membersRoutes(store: BranchStore): readonly MockRoute[] {
  const rows = MOCK_MEMBERS.map((m) => ({ ...m }));
  const O = OPERATIONS;
  return [
    mockRoute(
      defineEndpoint(O.getSalonsByIdMembers, {
        data: dto.getSalonsByIdMembersDataSchema,
        query: branchQuerySchema,
      }),
      ({ query }) => {
        const branchId = query.get('branchId');
        const items = rows.filter((m) => !branchId || m.branchId === branchId);
        return {
          data: items,
          meta: { page: 1, pageSize: items.length, total: items.length, totalPages: 1 },
          empty: [],
        };
      },
    ),
    mockRoute(
      defineEndpoint(O.postSalonsByIdMembersByMemberIdBranch, {
        data: dto.postSalonsByIdMembersByMemberIdBranchDataSchema,
        body: dto.postSalonsByIdMembersByMemberIdBranchBodySchema,
      }),
      ({ params, body }) => {
        const row = rows.find((m) => m.id === params['memberId']);
        if (!row || row.role === 'OWNER') throw new Error('no member');
        const target = store.find(params['id'] ?? '', (body as { branchId: string }).branchId);
        if (target.status === 'CLOSED')
          throw new MockBusinessError(HTTP_STATUS.unprocessable, 'BRANCH_NOT_BOOKABLE');
        row.branchId = target.id;
        const [firstName = '', lastName = ''] = row.name.split(' ');
        return {
          data: {
            id: row.id,
            firstName,
            lastName,
            phone: row.phone,
            photoUrl: null,
            role: row.role,
            permissions: [],
            active: row.active,
            providesServices: row.providesServices,
            branchId: row.branchId,
          },
        };
      },
    ),
  ];
}
