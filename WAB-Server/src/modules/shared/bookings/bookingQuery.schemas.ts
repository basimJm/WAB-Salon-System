import { z } from 'zod';
import {
  BOOKING_FILTER_MAX_ITEMS,
  BOOKING_SEARCH_MAX_LENGTH,
  BOOKING_TABS,
  CUSTOMER_BOOKING_TABS,
} from '../../../constants/bookings';
import { OBJECT_ID_PATTERN } from '../../../constants/database';
import { BOOKING_PAYMENT_STATUSES, BOOKING_STATUSES } from '../../../constants/enums';
import { ADMIN_PAGE_SIZE, APP_PAGE_SIZE } from '../../../constants/pagination';
import { paginationQuery } from '../../../utils/pagination';
import { isLocalDate } from '../../../utils/time';

/** `?a=1&a=2` and `?a=1,2` both give a list. */
const list = <T extends z.ZodType>(item: T): z.ZodType<z.infer<T>[] | undefined> =>
  z.preprocess(
    (value) =>
      typeof value === 'string' ? value.split(',') : Array.isArray(value) ? value : undefined,
    z.array(item).max(BOOKING_FILTER_MAX_ITEMS).optional(),
  );
const flag = z.enum(['true', 'false']).transform((v) => v === 'true');
const civilDate = z.string().refine(isLocalDate, 'YYYY-MM-DD');
const id = z.string().regex(OBJECT_ID_PATTERN);
const text = z.string().trim().min(1).max(BOOKING_SEARCH_MAX_LENGTH);

export const bookingIdParams = z.object({ id: id });

export const customerBookingsQuery = paginationQuery(APP_PAGE_SIZE).extend({
  tab: z.enum(CUSTOMER_BOOKING_TABS).default('UPCOMING'),
  q: text.optional(),
});

export const merchantBookingsQuery = paginationQuery(APP_PAGE_SIZE).extend({
  tab: z.enum(BOOKING_TABS).optional(),
  q: text.optional(),
  from: civilDate.optional(),
  to: civilDate.optional(),
  staffId: list(id),
  status: list(z.enum(BOOKING_STATUSES)),
  brideOnly: flag.optional(),
  paymentStatus: z.enum(BOOKING_PAYMENT_STATUSES).optional(),
});

export const calendarQuery = z.object({
  from: civilDate,
  to: civilDate,
  staffId: list(id),
});

export const adminBookingsQuery = paginationQuery(ADMIN_PAGE_SIZE).extend({
  tab: z.enum(BOOKING_TABS).optional(),
  q: text.optional(),
  from: civilDate.optional(),
  to: civilDate.optional(),
  status: list(z.enum(BOOKING_STATUSES)),
  brideOnly: flag.optional(),
  paymentStatus: z.enum(BOOKING_PAYMENT_STATUSES).optional(),
  salonId: id.optional(),
  customerId: id.optional(),
});

export type MerchantBookingsQuery = z.infer<typeof merchantBookingsQuery>;
