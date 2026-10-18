import * as dto from '../contract/generated/dto';
import { OPERATIONS } from '../contract/generated/operations';
import { defineEndpoint } from '../api/endpoint';
import { collection } from './mockCollection';
import { mockRoute } from './mockRoute';
import type { MockRoute } from './mockTransport';

const ops = OPERATIONS;

export function catalogRoutes(): readonly MockRoute[] {
  let counter = 900;
  const nextId = () => `64e${String((counter += 1)).padStart(21, '0')}`;
  const services = collection(
    [
      {
        id: '64e000000000000000000001',
        name: { ar: 'قص شعر', en: 'Haircut' },
        description: { ar: 'قص وتصفيف', en: 'Cut and style' },
        imageKey: 'catalog/haircut.webp',
        gender: 'FEMALE' as const,
        active: true,
        sortOrder: 1,
      },
      {
        id: '64e000000000000000000002',
        name: { ar: 'حلاقة', en: 'Shave' },
        description: { ar: 'حلاقة ذقن', en: 'Beard shave' },
        imageKey: 'catalog/shave.webp',
        gender: 'MALE' as const,
        active: true,
        sortOrder: 1,
      },
    ],
    nextId,
    { active: true, sortOrder: 0 },
  );
  const requests = [
    {
      id: '64e000000000000000000031',
      salonId: '64e000000000000000000041',
      salonName: 'Noor Salon',
      name: 'Hair spa',
      description: 'Deep conditioning treatment',
      imageKey: null,
      status: 'PENDING' as const,
      adminNote: null,
      catalogServiceId: null,
      createdAt: '2026-10-10T08:00:00.000Z',
    },
  ];
  const decide = (id: string | undefined, status: 'APPROVED' | 'REJECTED', note: string) => {
    const row = requests.find((r) => r.id === id) ?? requests[0];
    if (!row) throw new Error('no request');
    Object.assign(row, {
      status,
      adminNote: note,
      catalogServiceId: status === 'APPROVED' ? nextId() : null,
    });
    return { data: { ...row } };
  };
  return [
    mockRoute(
      defineEndpoint(ops.getCatalogRequests, {
        data: dto.getCatalogRequestsDataSchema,
        query: dto.getCatalogRequestsQuerySchema,
      }),
      ({ query }) => {
        const status = query.get('status');
        const rows = requests.filter((r) => !status || r.status === status);
        return {
          data: rows,
          meta: { page: 1, pageSize: 25, total: rows.length, totalPages: 1 },
          empty: [],
        };
      },
    ),
    mockRoute(
      defineEndpoint(ops.postCatalogRequestsByIdApprove, {
        data: dto.postCatalogRequestsByIdApproveDataSchema,
        body: dto.postCatalogRequestsByIdApproveBodySchema,
      }),
      ({ params, body }) => decide(params['id'], 'APPROVED', (body as { reason: string }).reason),
    ),
    mockRoute(
      defineEndpoint(ops.postCatalogRequestsByIdReject, {
        data: dto.postCatalogRequestsByIdRejectDataSchema,
        body: dto.postCatalogRequestsByIdRejectBodySchema,
      }),
      ({ params, body }) => decide(params['id'], 'REJECTED', (body as { reason: string }).reason),
    ),
    mockRoute(
      defineEndpoint(ops.getCatalogServices, {
        data: dto.getCatalogServicesDataSchema,
        query: dto.getCatalogServicesQuerySchema,
      }),
      services.list,
    ),
    mockRoute(
      defineEndpoint(ops.postCatalogServices, {
        data: dto.postCatalogServicesDataSchema,
        body: dto.postCatalogServicesBodySchema,
      }),
      services.create,
    ),
    mockRoute(
      defineEndpoint(ops.patchCatalogServicesById, {
        data: dto.patchCatalogServicesByIdDataSchema,
        body: dto.patchCatalogServicesByIdBodySchema,
      }),
      services.update,
    ),
  ];
}
