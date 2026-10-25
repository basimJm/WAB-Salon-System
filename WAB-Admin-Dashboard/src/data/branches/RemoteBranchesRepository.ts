import type { ApiClient } from '@/data/api/ApiClient';
import { defineEndpoint } from '@/data/api/endpoint';
import * as dto from '@/data/contract/generated/dto';
import { OPERATIONS } from '@/data/contract/generated/operations';
import type {
  BranchAction,
  BranchInput,
  BranchPatch,
  BranchesRepository,
} from '@/domain/shared/branches';

const O = OPERATIONS;
const list = defineEndpoint(O.getSalonsByIdBranches, { data: dto.getSalonsByIdBranchesDataSchema });
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

  async list(salonId: string) {
    return (await this.api.executePage(list, { params: { id: salonId } })).items;
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
