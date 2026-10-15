import type { ApiClient } from '@/data/api/ApiClient';
import { defineEndpoint } from '@/data/api/endpoint';
import { defined } from '@/data/api/resource';
import * as dto from '@/data/contract/generated/dto';
import { OPERATIONS } from '@/data/contract/generated/operations';
import type { ApplicationsRepository } from '@/domain/applications/applications';

const list = defineEndpoint(OPERATIONS.getSalonsApplications, {
  data: dto.getSalonsApplicationsDataSchema,
  query: dto.getSalonsApplicationsQuerySchema,
});
const get = defineEndpoint(OPERATIONS.getSalonsApplicationsById, {
  data: dto.getSalonsApplicationsByIdDataSchema,
});
const approve = defineEndpoint(OPERATIONS.postSalonsApplicationsByIdApprove, {
  data: dto.postSalonsApplicationsByIdApproveDataSchema,
  body: dto.postSalonsApplicationsByIdApproveBodySchema,
});
const reject = defineEndpoint(OPERATIONS.postSalonsApplicationsByIdReject, {
  data: dto.postSalonsApplicationsByIdRejectDataSchema,
  body: dto.postSalonsApplicationsByIdRejectBodySchema,
});

export class RemoteApplicationsRepository implements ApplicationsRepository {
  constructor(private readonly api: ApiClient) {}

  list: ApplicationsRepository['list'] = (q) =>
    this.api.executePage(list, {
      query: defined({ page: q.page, pageSize: q.pageSize, state: q.state }),
    });

  get: ApplicationsRepository['get'] = async (id) =>
    (await this.api.execute(get, { params: { id } })).data;

  approve: ApplicationsRepository['approve'] = async (id, reason) => {
    await this.api.execute(approve, { params: { id }, body: { reason } });
  };

  reject: ApplicationsRepository['reject'] = async (id, reason) => {
    await this.api.execute(reject, { params: { id }, body: { reason } });
  };
}
