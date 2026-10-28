import * as dto from '../contract/generated/dto';
import { OPERATIONS } from '../contract/generated/operations';
import { defineEndpoint } from '../api/endpoint';
import { mockRoute, type TypedAnswer } from './mockRoute';
import { HTTP_STATUS } from '@/constants/http';
import { MockBusinessError, type MockRequest, type MockRoute } from './mockTransport';

type ItemRow = dto.getItemsData[number];
const O = OPERATIONS;
const SEED_AT = '2026-10-01T08:00:00.000Z';

const item = (n: number, name: string, status: ItemRow['status'], description: string | null) => ({
  id: `64d1${String(n).padStart(20, '0')}`,
  name,
  description,
  status,
  createdAt: `2026-10-${String(n).padStart(2, '0')}T08:00:00.000Z`,
  updatedAt: `2026-10-${String(n).padStart(2, '0')}T09:30:00.000Z`,
  updatedBy: null as string | null,
});
export const MOCK_ITEMS: readonly ItemRow[] = [
  item(1, 'Starter plan', 'ACTIVE', 'The first thing an admin creates'),
  item(2, 'Legacy plan', 'INACTIVE', null),
  item(3, 'Pilot batch', 'ARCHIVED', 'Kept for the audit trail'),
];
const ADMIN_ID = '64c000000000000000000a01';

const withoutReason = (body: unknown): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(body as Record<string, unknown>).filter(([k]) => k !== 'reason'),
  );

function sortRows(rows: ItemRow[], sort: string | null): ItemRow[] {
  if (!sort) return rows;
  const desc = sort.startsWith('-');
  const key = (desc ? sort.slice(1) : sort) as 'name' | 'createdAt' | 'updatedAt';
  return [...rows].sort((a, b) => a[key].localeCompare(b[key]) * (desc ? -1 : 1));
}

function listOf(rows: ItemRow[], { query }: MockRequest): TypedAnswer<ItemRow[]> {
  const q = (query.get('q') ?? '').toLowerCase();
  const status = query.get('status');
  const filtered = sortRows(
    rows.filter(
      (r) => (!status || r.status === status) && (!q || r.name.toLowerCase().includes(q)),
    ),
    query.get('sort'),
  );
  const pageSize = Number(query.get('pageSize') ?? 25);
  const page = Number(query.get('page') ?? 1);
  const start = (page - 1) * pageSize;
  return {
    data: filtered.slice(start, start + pageSize),
    meta: {
      page,
      pageSize,
      total: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)),
    },
    empty: [],
  };
}

/** In-memory items: list (search, status, sort, paging), read, create and patch with the audit reason stripped. */
export function itemsRoutes(): readonly MockRoute[] {
  const rows = MOCK_ITEMS.map((r) => ({ ...r }));
  let counter = rows.length;
  return [
    mockRoute(
      defineEndpoint(O.getItems, { data: dto.getItemsDataSchema, query: dto.getItemsQuerySchema }),
      (request) => listOf(rows, request),
    ),
    mockRoute(
      defineEndpoint(O.getItemsById, { data: dto.getItemsByIdDataSchema }),
      ({ params }) => {
        const row = rows.find((r) => r.id === params['id']);
        if (!row) throw new Error('no item');
        return { data: { ...row } };
      },
    ),
    mockRoute(
      defineEndpoint(O.postItems, { data: dto.postItemsDataSchema, body: dto.postItemsBodySchema }),
      ({ body }) => {
        const input = withoutReason(body);
        if (rows.some((r) => r.name === input['name']))
          throw new MockBusinessError(HTTP_STATUS.conflict, 'ITEM_NAME_TAKEN', ['body.name']);
        counter += 1;
        const row: ItemRow = {
          ...item(counter, '', 'ACTIVE', null),
          ...input,
          createdAt: SEED_AT,
          updatedAt: SEED_AT,
          updatedBy: ADMIN_ID,
        };
        rows.unshift(row);
        return { data: { ...row }, status: 201 };
      },
    ),
    mockRoute(
      defineEndpoint(O.patchItemsById, {
        data: dto.patchItemsByIdDataSchema,
        body: dto.patchItemsByIdBodySchema,
      }),
      ({ params, body }) => {
        const index = rows.findIndex((r) => r.id === params['id']);
        const current = rows[index];
        if (!current) throw new Error('no item');
        const next = { ...current, ...withoutReason(body), updatedBy: ADMIN_ID } as ItemRow;
        rows[index] = next;
        return { data: { ...next } };
      },
    ),
  ];
}
