import type { ApiClient } from '@/data/api/ApiClient';
import { defineEndpoint } from '@/data/api/endpoint';
import { defined, resource } from '@/data/api/resource';
import * as dto from '@/data/contract/generated/dto';
import { OPERATIONS } from '@/data/contract/generated/operations';
import type { AppConfigRepository, AppKind, Platform } from '@/domain/appconfig/appConfig';
import type { PageQuery } from '@/domain/shared/page';

export class RemoteAppConfigRepository implements AppConfigRepository {
  readonly versions: AppConfigRepository['versions'];
  readonly maintenance: AppConfigRepository['maintenance'];

  constructor(api: ApiClient) {
    this.versions = resource(
      api,
      {
        list: defineEndpoint(OPERATIONS.getAppConfigVersions, {
          data: dto.getAppConfigVersionsDataSchema,
          query: dto.getAppConfigVersionsQuerySchema,
        }),
        create: defineEndpoint(OPERATIONS.postAppConfigVersions, {
          data: dto.postAppConfigVersionsDataSchema,
          body: dto.postAppConfigVersionsBodySchema,
        }),
        update: defineEndpoint(OPERATIONS.patchAppConfigVersionsById, {
          data: dto.patchAppConfigVersionsByIdDataSchema,
          body: dto.patchAppConfigVersionsByIdBodySchema,
        }),
      },
      (q: PageQuery & { app?: AppKind; platform?: Platform }) =>
        defined({ page: q.page, pageSize: q.pageSize, app: q.app, platform: q.platform }),
    );
    this.maintenance = resource(
      api,
      {
        list: defineEndpoint(OPERATIONS.getAppConfigMaintenance, {
          data: dto.getAppConfigMaintenanceDataSchema,
          query: dto.getAppConfigMaintenanceQuerySchema,
        }),
        create: defineEndpoint(OPERATIONS.postAppConfigMaintenance, {
          data: dto.postAppConfigMaintenanceDataSchema,
          body: dto.postAppConfigMaintenanceBodySchema,
        }),
        update: defineEndpoint(OPERATIONS.patchAppConfigMaintenanceById, {
          data: dto.patchAppConfigMaintenanceByIdDataSchema,
          body: dto.patchAppConfigMaintenanceByIdBodySchema,
        }),
      },
      (q: PageQuery & { app?: AppKind }) =>
        defined({ page: q.page, pageSize: q.pageSize, app: q.app }),
    );
  }
}
