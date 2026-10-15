import * as dto from '../contract/generated/dto';
import { OPERATIONS } from '../contract/generated/operations';
import { defineEndpoint } from '../api/endpoint';
import { collection } from './mockCollection';
import { mockRoute } from './mockRoute';
import type { MockRoute } from './mockTransport';

const ops = OPERATIONS;

export function contentRoutes(): readonly MockRoute[] {
  let counter = 500;
  const nextId = () => `64c${String((counter += 1)).padStart(21, '0')}`;
  const pages = collection(
    [
      {
        id: '64c000000000000000000001',
        app: 'CUSTOMER' as const,
        kind: 'PRIVACY' as const,
        body: { ar: '<p>سياسة الخصوصية</p>', en: '<p>Privacy policy</p>' },
      },
      {
        id: '64c000000000000000000002',
        app: 'CUSTOMER' as const,
        kind: 'TERMS' as const,
        body: { ar: '<p>الشروط</p>', en: '<p>Terms of use</p>' },
      },
    ],
    nextId,
  );
  return [
    mockRoute(
      defineEndpoint(ops.getContentPages, {
        data: dto.getContentPagesDataSchema,
        query: dto.getContentPagesQuerySchema,
      }),
      pages.list,
    ),
    mockRoute(
      defineEndpoint(ops.postContentPages, {
        data: dto.postContentPagesDataSchema,
        body: dto.postContentPagesBodySchema,
      }),
      pages.create,
    ),
    mockRoute(
      defineEndpoint(ops.patchContentPagesById, {
        data: dto.patchContentPagesByIdDataSchema,
        body: dto.patchContentPagesByIdBodySchema,
      }),
      pages.update,
    ),
  ];
}
