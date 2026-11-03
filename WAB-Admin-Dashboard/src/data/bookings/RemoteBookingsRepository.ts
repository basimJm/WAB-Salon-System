import type { ApiClient } from '@/data/api/ApiClient';
import { defineEndpoint } from '@/data/api/endpoint';
import { defined } from '@/data/api/resource';
import * as dto from '@/data/contract/generated/dto';
import { OPERATIONS } from '@/data/contract/generated/operations';
import type { BookingsRepository } from '@/domain/bookings/bookings';

const list = defineEndpoint(OPERATIONS.getBookings, {
  data: dto.getBookingsDataSchema,
  query: dto.getBookingsQuerySchema,
});
const get = defineEndpoint(OPERATIONS.getBookingsById, { data: dto.getBookingsByIdDataSchema });
const change = defineEndpoint(OPERATIONS.postBookingsByIdStatus, {
  data: dto.postBookingsByIdStatusDataSchema,
  body: dto.postBookingsByIdStatusBodySchema,
});

const eligible = defineEndpoint(OPERATIONS.getBookingsByIdEligibleStaff, {
  data: dto.getBookingsByIdEligibleStaffDataSchema,
  query: dto.getBookingsByIdEligibleStaffQuerySchema,
});
const reassign = defineEndpoint(OPERATIONS.postBookingsByIdReassign, {
  data: dto.postBookingsByIdReassignDataSchema,
  body: dto.postBookingsByIdReassignBodySchema,
});
const cancel = defineEndpoint(OPERATIONS.postBookingsByIdCancel, {
  data: dto.postBookingsByIdCancelDataSchema,
  body: dto.postBookingsByIdCancelBodySchema,
});
const refund = defineEndpoint(OPERATIONS.postBookingsByIdRefund, {
  data: dto.postBookingsByIdRefundDataSchema,
  body: dto.postBookingsByIdRefundBodySchema,
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
        branchId: q.branchId,
        customerId: q.customerId,
        businessType: q.businessType,
        source: q.source,
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

  eligibleStaff: BookingsRepository['eligibleStaff'] = async (id, personIndex) =>
    (await this.api.execute(eligible, { params: { id }, query: { personIndex } })).data;

  reassign: BookingsRepository['reassign'] = async (id, personIndex, staffId, reason) => {
    await this.api.execute(reassign, { params: { id }, body: { personIndex, staffId, reason } });
  };

  cancel: BookingsRepository['cancel'] = async (id, mode, reason) => {
    const { data } = await this.api.execute(cancel, { params: { id }, body: { mode, reason } });
    return {
      referenceNumber: data.referenceNumber,
      status: data.status,
      irregular: data.irregular,
    };
  };

  refund: BookingsRepository['refund'] = async (id, amount, reason) =>
    (await this.api.execute(refund, { params: { id }, body: { amount, reason } })).data;
}
