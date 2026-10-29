import * as dto from '../contract/generated/dto';
import { OPERATIONS } from '../contract/generated/operations';
import { defineEndpoint } from '../api/endpoint';
import { mockRoute } from './mockRoute';
import type { MockRoute } from './mockTransport';

type Status = 'SCHEDULED' | 'ACTIVE' | 'ENDED';
type Kind = { businessType: 'SALON' | 'CLINIC'; audience: 'MALE' | 'FEMALE' | 'BOTH' };
const WOMEN: Kind = { businessType: 'SALON', audience: 'FEMALE' };
const placement = (n: number, name: string, kind: Kind, status: Status) => ({
  id: `64c7${String(n).padStart(20, '0')}`,
  salon: { id: `64f00000000000000000000${String(n)}`, name },
  ...kind,
  startAt: '2026-10-01T21:00:00.000Z',
  endAt: '2026-12-01T21:00:00.000Z',
  order: n,
  amountPaid: '150.000',
  note: null as string | null,
  status,
});
export const MOCK_PLACEMENTS = [
  placement(1, 'Noor Salon', WOMEN, 'ACTIVE'),
  placement(2, 'Lama Beauty', { businessType: 'SALON', audience: 'BOTH' }, 'SCHEDULED'),
  placement(3, 'Royal Barber', { businessType: 'SALON', audience: 'MALE' }, 'ACTIVE'),
  placement(4, 'Glow Clinic', { businessType: 'CLINIC', audience: 'BOTH' }, 'ACTIVE'),
];

export function placementsRoutes(): readonly MockRoute[] {
  const rows = MOCK_PLACEMENTS.map((p) => ({ ...p }));
  const O = OPERATIONS;
  const find = (id: string | undefined) => {
    const row = rows.find((r) => r.id === id);
    if (!row) throw new Error('no placement');
    return row;
  };
  return [
    mockRoute(
      defineEndpoint(O.getRecommended, {
        data: dto.getRecommendedDataSchema,
        query: dto.getRecommendedQuerySchema,
      }),
      ({ query }) => {
        const items = rows
          .filter(
            (r) =>
              (!query.get('businessType') || r.businessType === query.get('businessType')) &&
              (!query.get('audience') || r.audience === query.get('audience')) &&
              (!query.get('status') || r.status === query.get('status')),
          )
          .sort((a, b) => a.order - b.order);
        return {
          data: items,
          meta: { page: 1, pageSize: 100, total: items.length, totalPages: 1 },
          empty: [],
        };
      },
    ),
    mockRoute(
      defineEndpoint(O.postRecommended, {
        data: dto.postRecommendedDataSchema,
        body: dto.postRecommendedBodySchema,
      }),
      ({ body }) => {
        const b = body as { salonId: string; amountPaid: string; order?: number; note?: string };
        const row = {
          ...placement(rows.length + 1, 'New salon', WOMEN, 'SCHEDULED'),
          salon: { id: b.salonId, name: 'New salon' },
          amountPaid: b.amountPaid,
          order: b.order ?? rows.length + 1,
          note: b.note ?? null,
        };
        rows.push(row);
        return { data: row, status: 201 };
      },
    ),
    mockRoute(
      defineEndpoint(O.patchRecommendedById, {
        data: dto.patchRecommendedByIdDataSchema,
        body: dto.patchRecommendedByIdBodySchema,
      }),
      ({ params, body }) => {
        const b = body as { order?: number; amountPaid?: string; note?: string | null };
        const row = find(params['id']);
        Object.assign(row, {
          ...(b.order !== undefined ? { order: b.order } : {}),
          ...(b.amountPaid ? { amountPaid: b.amountPaid } : {}),
          ...(b.note !== undefined ? { note: b.note } : {}),
        });
        return { data: { ...row } };
      },
    ),
    mockRoute(
      defineEndpoint(O.postRecommendedByIdEnd, {
        data: dto.postRecommendedByIdEndDataSchema,
        body: dto.postRecommendedByIdEndBodySchema,
      }),
      ({ params }) => {
        const row = find(params['id']);
        row.status = 'ENDED';
        return { data: { ...row } };
      },
    ),
    mockRoute(
      defineEndpoint(O.putRecommendedReorder, {
        data: dto.putRecommendedReorderDataSchema,
        body: dto.putRecommendedReorderBodySchema,
      }),
      ({ body }) => {
        const b = body as { ids: string[] };
        b.ids.forEach((id, i) => {
          find(id).order = i + 1;
        });
        return { data: rows.filter((r) => b.ids.includes(r.id)).sort((x, y) => x.order - y.order) };
      },
    ),
  ];
}
