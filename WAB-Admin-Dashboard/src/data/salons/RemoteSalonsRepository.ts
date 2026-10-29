import type { ApiClient } from '@/data/api/ApiClient';
import { defineEndpoint, optionalQuery } from '@/data/api/endpoint';
import { defined } from '@/data/api/resource';
import * as dto from '@/data/contract/generated/dto';
import { OPERATIONS } from '@/data/contract/generated/operations';
import type { Audience } from '@/domain/shared/businessType';
import type { PageQuery } from '@/domain/shared/page';
import {
  normalizeIban,
  type DeletionDecision,
  type PayoutDetailsInput,
  type SalonQuery,
  type SalonsRepository,
} from '@/domain/salons/salons';

const listSalons = defineEndpoint(OPERATIONS.getSalons, {
  data: dto.getSalonsDataSchema,
  query: dto.getSalonsQuerySchema,
});

const kpis = defineEndpoint(OPERATIONS.getSalonsByIdKpis, {
  data: dto.getSalonsByIdKpisDataSchema,
});
const analytics = defineEndpoint(OPERATIONS.getSalonsByIdAnalytics, {
  data: dto.getSalonsByIdAnalyticsDataSchema,
  query: dto.getSalonsByIdAnalyticsQuerySchema,
});
const activity = defineEndpoint(OPERATIONS.getSalonsByIdActivity, {
  data: dto.getSalonsByIdActivityDataSchema,
  query: dto.getSalonsByIdActivityQuerySchema,
});
const decision = defineEndpoint(OPERATIONS.postSalonsByIdDeletionRequestDecision, {
  data: dto.postSalonsByIdDeletionRequestDecisionDataSchema,
  body: dto.postSalonsByIdDeletionRequestDecisionBodySchema,
});

const getSalon = defineEndpoint(OPERATIONS.getSalonsById, { data: dto.getSalonsByIdDataSchema });
const getMembers = defineEndpoint(OPERATIONS.getSalonsByIdMembers, {
  data: dto.getSalonsByIdMembersDataSchema,
  query: optionalQuery(dto.getSalonsByIdMembersQuerySchema),
});

const offline = defineEndpoint(OPERATIONS.postSalonsByIdOffline, {
  data: dto.postSalonsByIdOfflineDataSchema,
  body: dto.postSalonsByIdOfflineBodySchema,
});
const online = defineEndpoint(OPERATIONS.postSalonsByIdOnline, {
  data: dto.postSalonsByIdOnlineDataSchema,
  body: dto.postSalonsByIdOnlineBodySchema,
});
const audience = defineEndpoint(OPERATIONS.patchSalonsByIdAudience, {
  data: dto.patchSalonsByIdAudienceDataSchema,
  body: dto.patchSalonsByIdAudienceBodySchema,
});
const readPayout = defineEndpoint(OPERATIONS.getSalonsByIdPayoutDetails, {
  data: dto.getSalonsByIdPayoutDetailsDataSchema,
});
const writePayout = defineEndpoint(OPERATIONS.putSalonsByIdPayoutDetails, {
  data: dto.putSalonsByIdPayoutDetailsDataSchema,
  body: dto.putSalonsByIdPayoutDetailsBodySchema,
});

export class RemoteSalonsRepository implements SalonsRepository {
  constructor(private readonly api: ApiClient) {}

  list(q: SalonQuery) {
    return this.api.executePage(listSalons, {
      query: defined({
        page: q.page,
        pageSize: q.pageSize,
        state: q.state,
        businessType: q.businessType,
        audience: q.audience,
        cityId: q.cityId,
        q: q.q,
        subscription: q.subscription,
        recommended:
          q.recommended === undefined ? undefined : (String(q.recommended) as 'true' | 'false'),
        deletionRequested: q.deletionRequested ? ('true' as const) : undefined,
      }),
    });
  }

  async get(id: string) {
    return (await this.api.execute(getSalon, { params: { id } })).data;
  }

  async members(id: string, branchId?: string) {
    const query = branchId ? { branchId } : undefined;
    return (await this.api.execute(getMembers, { params: { id }, query })).data;
  }

  async setOffline(id: string, reason: string) {
    await this.api.execute(offline, { params: { id }, body: { reason } });
  }

  async setOnline(id: string, reason: string) {
    await this.api.execute(online, { params: { id }, body: { reason } });
  }

  async changeAudience(id: string, value: Audience, reason: string) {
    return (await this.api.execute(audience, { params: { id }, body: { audience: value, reason } }))
      .data;
  }

  async payoutDetails(id: string) {
    return (await this.api.execute(readPayout, { params: { id } })).data;
  }

  async replacePayoutDetails(id: string, input: PayoutDetailsInput, reason: string) {
    const body = { ...input, iban: normalizeIban(input.iban), reason };
    return (await this.api.execute(writePayout, { params: { id }, body })).data;
  }

  async kpis(id: string) {
    return (await this.api.execute(kpis, { params: { id } })).data;
  }

  async analytics(id: string, range: { from: string; to: string }) {
    return (await this.api.execute(analytics, { params: { id }, query: range })).data;
  }

  activity(id: string, q: PageQuery) {
    return this.api.executePage(activity, {
      params: { id },
      query: { page: q.page, pageSize: q.pageSize },
    });
  }

  async decideDeletion(id: string, choice: DeletionDecision, reason: string) {
    await this.api.execute(decision, { params: { id }, body: { decision: choice, reason } });
  }
}
