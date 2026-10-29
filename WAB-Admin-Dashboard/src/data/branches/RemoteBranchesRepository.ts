import type { ApiClient } from '@/data/api/ApiClient';
import { defineEndpoint, optionalQuery } from '@/data/api/endpoint';
import { MAX_PAGE_SIZE } from '@/constants/ui';
import * as dto from '@/data/contract/generated/dto';
import { OPERATIONS } from '@/data/contract/generated/operations';
import type {
  BranchAction,
  BranchInput,
  BranchPatch,
  BranchesRepository,
} from '@/domain/shared/branches';

const O = OPERATIONS;
const list = defineEndpoint(O.getSalonsByIdBranches, {
  data: dto.getSalonsByIdBranchesDataSchema,
  query: optionalQuery(dto.getSalonsByIdBranchesQuerySchema),
});
const create = defineEndpoint(O.postSalonsByIdBranches, {
  data: dto.postSalonsByIdBranchesDataSchema,
  body: dto.postSalonsByIdBranchesBodySchema,
});
const update = defineEndpoint(O.patchSalonsByIdBranchesByBranchId, {
  data: dto.patchSalonsByIdBranchesByBranchIdDataSchema,
  body: dto.patchSalonsByIdBranchesByBranchIdBodySchema,
});
const ACTIONS = {
  main: defineEndpoint(O.postSalonsByIdBranchesByBranchIdMain, {
    data: dto.postSalonsByIdBranchesByBranchIdMainDataSchema,
    body: dto.postSalonsByIdBranchesByBranchIdMainBodySchema,
  }),
  offline: defineEndpoint(O.postSalonsByIdBranchesByBranchIdOffline, {
    data: dto.postSalonsByIdBranchesByBranchIdOfflineDataSchema,
    body: dto.postSalonsByIdBranchesByBranchIdOfflineBodySchema,
  }),
  online: defineEndpoint(O.postSalonsByIdBranchesByBranchIdOnline, {
    data: dto.postSalonsByIdBranchesByBranchIdOnlineDataSchema,
    body: dto.postSalonsByIdBranchesByBranchIdOnlineBodySchema,
  }),
  close: defineEndpoint(O.postSalonsByIdBranchesByBranchIdClose, {
    data: dto.postSalonsByIdBranchesByBranchIdCloseDataSchema,
    body: dto.postSalonsByIdBranchesByBranchIdCloseBodySchema,
  }),
} as const;

export class RemoteBranchesRepository implements BranchesRepository {
  constructor(private readonly api: ApiClient) {}

  /**
   * Every branch at once: the list is not paginated, so `meta` is not required (the contract declares it, but the
   * server answers without it; see docs/E2E_RESULTS.md).
   */
  async list(salonId: string) {
    // One page of the largest size holds every branch (`salon.maxBranches` is far below it).
    const query = { page: 1, pageSize: MAX_PAGE_SIZE };
    return (await this.api.execute(list, { params: { id: salonId }, query })).data;
  }

  async create(salonId: string, input: BranchInput, reason: string) {
    return (await this.api.execute(create, { params: { id: salonId }, body: { ...input, reason } }))
      .data;
  }

  async update(salonId: string, branchId: string, patch: BranchPatch, reason: string) {
    const params = { id: salonId, branchId };
    return (await this.api.execute(update, { params, body: { ...patch, reason } })).data;
  }

  async act(salonId: string, branchId: string, action: BranchAction, reason: string) {
    const params = { id: salonId, branchId };
    return (await this.api.execute(ACTIONS[action], { params, body: { reason } })).data;
  }
}
