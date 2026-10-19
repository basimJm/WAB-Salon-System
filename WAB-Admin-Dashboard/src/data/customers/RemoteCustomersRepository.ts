import { z } from 'zod';
import type { ApiClient } from '@/data/api/ApiClient';
import { defineEndpoint, type Endpoint } from '@/data/api/endpoint';
import { OBJECT_ID } from '@/data/api/objectId';
import { defined } from '@/data/api/resource';
import * as dto from '@/data/contract/generated/dto';
import { OPERATIONS } from '@/data/contract/generated/operations';
import type { CustomerAction, CustomersRepository } from '@/domain/customers/customers';

const list = defineEndpoint(OPERATIONS.getCustomers, {
  data: dto.getCustomersDataSchema,
  query: () => dto.getCustomersQuerySchema().extend({ cityId: OBJECT_ID.optional() }),
});
const get = defineEndpoint(OPERATIONS.getCustomersById, { data: dto.getCustomersByIdDataSchema });
const reasonOnly = <D>(
  op: Parameters<typeof defineEndpoint>[0],
  data: () => z.ZodType<D>,
  body: () => z.ZodType<{ reason: string }>,
) =>
  defineEndpoint(op, { data, body }) as unknown as Endpoint<unknown, { reason: string }, undefined>;
const actions: Record<CustomerAction, Endpoint<unknown, { reason: string }, undefined>> = {
  block: reasonOnly(
    OPERATIONS.postCustomersByIdBlock,
    dto.postCustomersByIdBlockDataSchema,
    dto.postCustomersByIdBlockBodySchema,
  ),
  unblock: reasonOnly(
    OPERATIONS.postCustomersByIdUnblock,
    dto.postCustomersByIdUnblockDataSchema,
    dto.postCustomersByIdUnblockBodySchema,
  ),
  delete: reasonOnly(
    OPERATIONS.postCustomersByIdDelete,
    dto.postCustomersByIdDeleteDataSchema,
    dto.postCustomersByIdDeleteBodySchema,
  ),
  restore: reasonOnly(
    OPERATIONS.postCustomersByIdRestore,
    dto.postCustomersByIdRestoreDataSchema,
    dto.postCustomersByIdRestoreBodySchema,
  ),
};

const LANGUAGES = ['ar', 'en'] as const;
const GENDERS = ['MALE', 'FEMALE'] as const;
const NAME_MAX = 50;
const EMAIL_MAX = 254;
/** The generated patch body is an intersection that cannot be extended, so it is restated with the id override. */
const patchBody = () =>
  z.object({
    firstName: z.string().min(1).max(NAME_MAX).optional(),
    lastName: z.string().min(1).max(NAME_MAX).optional(),
    email: z
      .string()
      .max(EMAIL_MAX)
      .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
      .optional(),
    gender: z.enum(GENDERS).optional(),
    cityId: OBJECT_ID.optional(),
    areaId: OBJECT_ID.optional(),
    language: z.enum(LANGUAGES).optional(),
    reason: z.string().min(1).max(1000),
  });
const patch = defineEndpoint(OPERATIONS.patchCustomersById, {
  data: dto.patchCustomersByIdDataSchema,
  body: patchBody,
});
const reviews = defineEndpoint(OPERATIONS.getCustomersByIdReviews, {
  data: dto.getCustomersByIdReviewsDataSchema,
  query: dto.getCustomersByIdReviewsQuerySchema,
});
const notifications = defineEndpoint(OPERATIONS.getCustomersByIdNotifications, {
  data: dto.getCustomersByIdNotificationsDataSchema,
  query: dto.getCustomersByIdNotificationsQuerySchema,
});
const forceDelete = defineEndpoint(OPERATIONS.postCustomersByIdForceDelete, {
  data: dto.postCustomersByIdForceDeleteDataSchema,
  body: dto.postCustomersByIdForceDeleteBodySchema,
});
const push = defineEndpoint(OPERATIONS.postCustomersByIdPush, {
  data: dto.postCustomersByIdPushDataSchema,
  body: dto.postCustomersByIdPushBodySchema,
});

export class RemoteCustomersRepository implements CustomersRepository {
  constructor(private readonly api: ApiClient) {}

  list: CustomersRepository['list'] = (q) =>
    this.api.executePage(list, {
      query: defined({
        page: q.page,
        pageSize: q.pageSize,
        status: q.status,
        gender: q.gender,
        cityId: q.cityId,
        q: q.q,
      }),
    });

  get: CustomersRepository['get'] = async (id) =>
    (await this.api.execute(get, { params: { id } })).data;

  act: CustomersRepository['act'] = async (id, action, reason) => {
    await this.api.execute(actions[action], { params: { id }, body: { reason } });
  };

  update: CustomersRepository['update'] = async (id, changes, reason) => {
    await this.api.execute(patch, { params: { id }, body: { ...changes, reason } });
  };

  reviews: CustomersRepository['reviews'] = (id, q) =>
    this.api.executePage(reviews, {
      params: { id },
      query: { page: q.page, pageSize: q.pageSize },
    });

  notifications: CustomersRepository['notifications'] = (id, q) =>
    this.api.executePage(notifications, {
      params: { id },
      query: { page: q.page, pageSize: q.pageSize },
    });

  forceDelete: CustomersRepository['forceDelete'] = async (id, reason) => {
    await this.api.execute(forceDelete, { params: { id }, body: { reason } });
  };

  push: CustomersRepository['push'] = async (id, input, reason) =>
    (await this.api.execute(push, { params: { id }, body: { ...input, reason } })).data;
}
