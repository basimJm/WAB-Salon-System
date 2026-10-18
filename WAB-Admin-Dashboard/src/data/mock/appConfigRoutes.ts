import * as dto from '../contract/generated/dto';
import { OPERATIONS } from '../contract/generated/operations';
import { defineEndpoint } from '../api/endpoint';
import { collection } from './mockCollection';
import { mockRoute } from './mockRoute';
import type { MockRoute } from './mockTransport';

const ops = OPERATIONS;

export function appConfigRoutes(): readonly MockRoute[] {
  let counter = 300;
  const nextId = () => `64b${String((counter += 1)).padStart(21, '0')}`;
  const versions = collection(
    [
      {
        id: '64b000000000000000000001',
        app: 'CUSTOMER' as const,
        platform: 'ANDROID' as const,
        latest: '1.4.0',
        minSupported: '1.2.0',
        optionalUpdate: true,
        storeUrl: 'https://play.example.test/wab', // hardcoded-ok: mock data
      },
      {
        id: '64b000000000000000000002',
        app: 'CUSTOMER' as const,
        platform: 'IOS' as const,
        latest: '1.4.0',
        minSupported: '1.3.0',
        optionalUpdate: false,
        storeUrl: 'https://apps.example.test/wab', // hardcoded-ok: mock data
      },
    ],
    nextId,
    { optionalUpdate: false },
  );
  const maintenance = collection(
    [
      {
        id: '64b000000000000000000011',
        app: 'CUSTOMER' as const,
        enabled: false,
        message: { ar: 'نعمل على التحسين', en: 'We are improving the app' },
      },
    ],
    nextId,
    { enabled: false },
  );
  return [
    mockRoute(
      defineEndpoint(ops.getAppConfigVersions, {
        data: dto.getAppConfigVersionsDataSchema,
        query: dto.getAppConfigVersionsQuerySchema,
      }),
      versions.list,
    ),
    mockRoute(
      defineEndpoint(ops.postAppConfigVersions, {
        data: dto.postAppConfigVersionsDataSchema,
        body: dto.postAppConfigVersionsBodySchema,
      }),
      versions.create,
    ),
    mockRoute(
      defineEndpoint(ops.patchAppConfigVersionsById, {
        data: dto.patchAppConfigVersionsByIdDataSchema,
        body: dto.patchAppConfigVersionsByIdBodySchema,
      }),
      versions.update,
    ),
    mockRoute(
      defineEndpoint(ops.getAppConfigMaintenance, {
        data: dto.getAppConfigMaintenanceDataSchema,
        query: dto.getAppConfigMaintenanceQuerySchema,
      }),
      maintenance.list,
    ),
    mockRoute(
      defineEndpoint(ops.postAppConfigMaintenance, {
        data: dto.postAppConfigMaintenanceDataSchema,
        body: dto.postAppConfigMaintenanceBodySchema,
      }),
      maintenance.create,
    ),
    mockRoute(
      defineEndpoint(ops.patchAppConfigMaintenanceById, {
        data: dto.patchAppConfigMaintenanceByIdDataSchema,
        body: dto.patchAppConfigMaintenanceByIdBodySchema,
      }),
      maintenance.update,
    ),
  ];
}
