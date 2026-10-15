import { z } from 'zod';
import type { ApiClient } from '@/data/api/ApiClient';
import { defineEndpoint } from '@/data/api/endpoint';
import { defined } from '@/data/api/resource';
import * as dto from '@/data/contract/generated/dto';
import { OPERATIONS } from '@/data/contract/generated/operations';
import type { BookingsRepository } from '@/domain/bookings/bookings';

/** The server's OpenAPI writes the id pattern as "^[a-f0-9]{24}$/i" that no id matches; see RemoteLocationsRepository. */
const OBJECT_ID = z.string().regex(/^[a-f0-9]{24}$/i);

const list = defineEndpoint(OPERATIONS.getBookings, {
  data: dto.getBookingsDataSchema,
  query: () =>
    dto
      .getBookingsQuerySchema()
      .extend({ salonId: OBJECT_ID.optional(), customerId: OBJECT_ID.optional() }),
});
const get = defineEndpoint(OPERATIONS.getBookingsById, { data: dto.getBookingsByIdDataSchema });
const change = defineEndpoint(OPERATIONS.postBookingsByIdStatus, {
  data: dto.postBookingsByIdStatusDataSchema,
  body: dto.postBookingsByIdStatusBodySchema,
});

export class RemoteBookingsRepository implements BookingsRepository {
  constructor(private readonly api: ApiClient) {}

  list: BookingsRepository['list'] = (q) =>
    this.api.executePage(list, {
      query: defined({
        page: q.page,
        pageSize: q.pageSize,
        tab: q.tab,
        q: q.q,
        from: q.from,
        to: q.to,
        status: q.status ? [...q.status] : undefined,
        brideOnly:
          q.brideOnly === undefined ? undefined : (String(q.brideOnly) as 'true' | 'false'),
        paymentStatus: q.paymentStatus,
        salonId: q.salonId,
        customerId: q.customerId,
      }),
    });

  get: BookingsRepository['get'] = async (id) =>
    (await this.api.execute(get, { params: { id } })).data;

  changeStatus: BookingsRepository['changeStatus'] = async (id, status, reason) => {
    const { data } = await this.api.execute(change, { params: { id }, body: { status, reason } });
    return {
      referenceNumber: data.referenceNumber,
      status: data.status,
      irregular: data.irregular,
    };
  };
}
