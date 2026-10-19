import { z } from 'zod';
import type { ApiClient } from '@/data/api/ApiClient';
import { defineEndpoint } from '@/data/api/endpoint';
import { defined } from '@/data/api/resource';
import * as dto from '@/data/contract/generated/dto';
import { OPERATIONS } from '@/data/contract/generated/operations';
import type { CampaignsRepository } from '@/domain/campaigns/campaigns';

/** The server's OpenAPI writes the id pattern as "^[a-f0-9]{24}$/i" that no id matches; see RemoteLocationsRepository. */
const ID = z.string().regex(/^[a-f0-9]{24}$/i);
const audience = z.object({
  kind: z.enum([
    'ALL',
    'GUESTS',
    'REGISTERED',
    'GENDER',
    'CITY',
    'SALON_MEMBERS',
    'SPECIFIC_USERS',
  ]),
  gender: z.enum(['MALE', 'FEMALE']).optional(),
  cityIds: z.array(ID).min(1).max(50).optional(),
  salonId: ID.optional(),
  customerIds: z.array(ID).min(1).max(500).optional(),
});
const O = OPERATIONS;
const list = defineEndpoint(O.getCampaigns, {
  data: dto.getCampaignsDataSchema,
  query: dto.getCampaignsQuerySchema,
});
const create = defineEndpoint(O.postCampaigns, {
  data: dto.postCampaignsDataSchema,
  body: () => dto.postCampaignsBodySchema().extend({ audience }),
});
const size = defineEndpoint(O.postCampaignsAudienceSize, {
  data: dto.postCampaignsAudienceSizeDataSchema,
  body: () => dto.postCampaignsAudienceSizeBodySchema().extend({ audience }),
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
