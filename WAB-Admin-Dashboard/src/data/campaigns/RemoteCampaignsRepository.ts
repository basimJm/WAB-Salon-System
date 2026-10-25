import type { ApiClient } from '@/data/api/ApiClient';
import { defineEndpoint } from '@/data/api/endpoint';
import { defined } from '@/data/api/resource';
import * as dto from '@/data/contract/generated/dto';
import { OPERATIONS } from '@/data/contract/generated/operations';
import type { CampaignsRepository } from '@/domain/campaigns/campaigns';

const O = OPERATIONS;
const list = defineEndpoint(O.getCampaigns, {
  data: dto.getCampaignsDataSchema,
  query: dto.getCampaignsQuerySchema,
});
const create = defineEndpoint(O.postCampaigns, {
  data: dto.postCampaignsDataSchema,
  body: dto.postCampaignsBodySchema,
});
const size = defineEndpoint(O.postCampaignsAudienceSize, {
  data: dto.postCampaignsAudienceSizeDataSchema,
  body: dto.postCampaignsAudienceSizeBodySchema,
});
const cancel = defineEndpoint(O.postCampaignsByIdCancel, {
  data: dto.postCampaignsByIdCancelDataSchema,
  body: dto.postCampaignsByIdCancelBodySchema,
});

export class RemoteCampaignsRepository implements CampaignsRepository {
  constructor(private readonly api: ApiClient) {}

  list: CampaignsRepository['list'] = (q) =>
    this.api.executePage(list, {
      query: defined({ page: q.page, pageSize: q.pageSize, status: q.status, app: q.app }),
    });

  // `null` means "send now" for the form, but the server reads a null date as 1 Jan 1970: the key is left out.
  create: CampaignsRepository['create'] = async ({ scheduledAt, ...rest }, reason) =>
    (
      await this.api.execute(create, {
        body: { ...defined(rest), ...(scheduledAt ? { scheduledAt } : {}), reason },
      })
    ).data;

  audienceSize: CampaignsRepository['audienceSize'] = async (app, a) =>
    (await this.api.execute(size, { body: { app, audience: a } })).data.size;

  cancel: CampaignsRepository['cancel'] = async (id, reason) =>
    (await this.api.execute(cancel, { params: { id }, body: { reason } })).data;
}
