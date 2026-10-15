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
  return [
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
