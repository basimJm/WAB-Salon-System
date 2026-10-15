import * as dto from '../contract/generated/dto';
import { OPERATIONS } from '../contract/generated/operations';
import { defineEndpoint } from '../api/endpoint';
import { mockRoute } from './mockRoute';
import type { MockRoute } from './mockTransport';

const O = OPERATIONS;
const owner = {
  id: '64f0000000000000000000b1',
  firstName: 'Lama',
  lastName: 'Nasser',
  phone: '+962790000200',
};
const DOC = 'https://files.example.test/license.pdf?sig=1'; // hardcoded-ok: mock data

const seed = (n: number, name: string, submittedAt: string, resubmissionCount: number) => ({
  id: `64f${String(n + 40).padStart(21, '0')}`,
  name,
  gender: 'FEMALE' as const,
  state: 'APPLICATION_PENDING' as 'APPLICATION_PENDING' | 'LIVE' | 'APPLICATION_REJECTED',
  cityId: '64a000000000000000000001' as string | null,
  owner,
  submittedAt,
  resubmissionCount,
  rejectionReason: null as string | null,
});

export function applicationsRoutes(): readonly MockRoute[] {
  const rows = [
    seed(1, 'Glow Studio', '2026-10-01T08:00:00.000Z', 0),
    seed(2, 'Rose Beauty', '2026-10-05T08:00:00.000Z', 2),
  ];
  const find = (id: string | undefined) => rows.find((r) => r.id === id) ?? rows[0];
  const decide = (
    id: string | undefined,
    state: 'LIVE' | 'APPLICATION_REJECTED',
    reason: string,
  ) => {
    const row = find(id);
    if (!row) throw new Error('no application');
    row.state = state;
    row.rejectionReason = state === 'APPLICATION_REJECTED' ? reason : null;
    return { data: { ...row } };
  };
  return [
    mockRoute(
      defineEndpoint(O.getSalonsApplications, {
        data: dto.getSalonsApplicationsDataSchema,
        query: dto.getSalonsApplicationsQuerySchema,
      }),
      ({ query }) => {
        const state = query.get('state') ?? 'APPLICATION_PENDING';
        const items = rows.filter((r) => r.state === state);
        return {
          data: items,
          meta: { page: 1, pageSize: 25, total: items.length, totalPages: 1 },
          empty: [],
        };
      },
    ),
    mockRoute(
      defineEndpoint(O.getSalonsApplicationsById, {
        data: dto.getSalonsApplicationsByIdDataSchema,
      }),
      ({ params }) => {
        const row = find(params['id']);
        if (!row) throw new Error('no application');
        return {
          data: { ...row, description: 'Hair and nails', areaId: null, documentUrls: [DOC] },
        };
      },
    ),
    mockRoute(
      defineEndpoint(O.postSalonsApplicationsByIdApprove, {
        data: dto.postSalonsApplicationsByIdApproveDataSchema,
        body: dto.postSalonsApplicationsByIdApproveBodySchema,
      }),
      ({ params, body }) => decide(params['id'], 'LIVE', (body as { reason: string }).reason),
    ),
    mockRoute(
      defineEndpoint(O.postSalonsApplicationsByIdReject, {
        data: dto.postSalonsApplicationsByIdRejectDataSchema,
        body: dto.postSalonsApplicationsByIdRejectBodySchema,
      }),
      ({ params, body }) =>
        decide(params['id'], 'APPLICATION_REJECTED', (body as { reason: string }).reason),
    ),
  ];
}
