import type { QueryFilter } from 'mongoose';
import {
  BOOKING_SEARCH_LOOKUP_LIMIT,
  CALENDAR_MAX_DAYS,
  CALENDAR_STATUSES,
  type BookingAction,
  type BookingTab,
} from '../../constants/bookings';
import type { BookingPaymentStatus, BookingStatus, Language } from '../../constants/enums';
import { ERROR_CODES } from '../../constants/errorCodes';
import type { BookingRaw } from '../../models/booking.model';
import type { BookingsRepository } from '../../repositories/bookings.repository';
import type {
  CustomersRepository,
  MembersRepository,
} from '../../repositories/identity.repository';
import type { SalonsRepository } from '../../repositories/salons.repository';
import { toObjectId } from '../../utils/database/ids';
import type { Entity } from '../../utils/database/plain';
import { ForbiddenError, NotFoundError, ValidationError } from '../../utils/errors';
import { formatJod } from '../../utils/money';
import type { PaginationParams } from '../../utils/pagination';
import { normalizeReferenceNumber } from '../../utils/reference';
import { diffDays, localDateOf, localDayRange } from '../../utils/time';
import type { SettingsService } from '../settings';
import { FINAL_STATUSES } from './stateMachine';

export type BookingAudience =
  | { readonly kind: 'CUSTOMER'; readonly customerId: string }
  | {
      readonly kind: 'MERCHANT';
      readonly salonId: string;
      readonly member: {
        readonly id: string;
        readonly permissions: readonly string[];
        /** Branch members see their branch only (§6); the owner sees every branch. */
        readonly branchId?: string | undefined;
      };
    }
  | { readonly kind: 'ADMIN' };

export interface BookingQuery {
  readonly tab?: BookingTab | undefined;
  readonly q?: string | undefined;
  /** Civil dates (Asia/Amman) bounding the appointment day, both inclusive. */
  readonly from?: string | undefined;
  readonly to?: string | undefined;
  readonly staffIds?: readonly string[] | undefined;
  readonly statuses?: readonly BookingStatus[] | undefined;
  readonly brideOnly?: boolean | undefined;
  readonly paymentStatus?: BookingPaymentStatus | undefined;
  /** Admin only. */
  readonly salonId?: string | undefined;
  readonly customerId?: string | undefined;
  /** Admin and the salon owner: one branch only (a branch member always sees their own). */
  readonly branchId?: string | undefined;
}

export interface BookingRow {
  readonly id: string;
  readonly referenceNumber: string;
  readonly status: BookingStatus;
  readonly paymentMethod: string;
  readonly paymentStatus: string;
  readonly hasBride: boolean;
  readonly appointmentStart: string;
  readonly appointmentEnd: string;
  readonly respondBy: string;
  /** When the customer sent the request ("time since request" on M07/M10). */
  readonly requestedAt: string;
  readonly personsCount: number;
  readonly total: string;
  readonly salon: { id: string; name: string } | null;
  /** The branch of the appointment, as booked (§3.5 `branchSnapshot`); `null` for older rows. */
  readonly branch: { id: string; name: string; locationText: string | null } | null;
  readonly customer: { id: string; name: string; phone: string } | null;
  readonly staff: { id: string; name: string }[];
}

export interface BookingDetail extends BookingRow {
  readonly refundStatus: string;
  readonly persons: {
    name: string;
    isBride: boolean;
    start: string;
    end: string;
    subtotal: string;
    staff: { id: string; name: string } | null;
    services: { name: string; price: string; durationMinutes: number }[];
  }[];
  readonly money: {
    total: string;
    dueOnline: string;
    paidOnline: string;
    remaining: string;
    refunded: string;
  };
  readonly policy: BookingRaw['policySnapshot'];
  readonly statusHistory: {
    status: string;
    actorType: string;
    reason: string | null;
    at: string;
  }[];
  readonly rejection: { reasonCode: string; reasonText: string | null; at: string } | null;
  readonly cancellation: { reasonCode: string; reasonText: string | null; at: string } | null;
  readonly createdAt: string;
  /** What the viewer may do now (merchant only). */
  readonly actions: BookingAction[];
}

export interface CalendarBlock {
  readonly bookingId: string;
  readonly referenceNumber: string;
  readonly status: BookingStatus;
  readonly staffId: string;
  readonly personName: string;
  readonly isBride: boolean;
  readonly start: string;
  readonly end: string;
}

export interface BookingQueriesService {
  list(input: {
    audience: BookingAudience;
    query: BookingQuery;
    params: PaginationParams;
    language: Language;
  }): Promise<{ items: BookingRow[]; total: number }>;
  detail(input: {
    audience: BookingAudience;
    bookingId: string;
    language: Language;
  }): Promise<BookingDetail>;
  calendar(input: {
    salonId: string;
    member: { id: string; permissions: readonly string[]; branchId?: string | undefined };
    from: string;
    to: string;
    staffIds?: readonly string[] | undefined;
  }): Promise<CalendarBlock[]>;
}

export interface BookingQueriesDeps {
  readonly bookings: BookingsRepository;
  readonly customers: Pick<CustomersRepository, 'findMany'>;
  readonly members: Pick<MembersRepository, 'findMany'>;
  readonly salons: Pick<SalonsRepository, 'findMany'>;
  readonly settings: Pick<SettingsService, 'get'>;
  readonly now?: () => Date;
}

const escapeRegex = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const iso = (d: Date): string => d.toISOString();
const ids = (rows: readonly { id: string }[]): string[] => rows.map((r) => r.id);

export const createBookingQueriesService = (deps: BookingQueriesDeps): BookingQueriesService => {
  const { bookings, customers, members, salons, settings } = deps;
  const now = deps.now ?? ((): Date => new Date());

  const viewScope = (member: { id: string; permissions: readonly string[] }): { own: boolean } => {
    if (member.permissions.includes('BOOKINGS_VIEW_ALL')) return { own: false };
    if (member.permissions.includes('BOOKINGS_VIEW_OWN')) return { own: true };
    throw new ForbiddenError({ code: ERROR_CODES.PERMISSION_DENIED });
  };

  /** Customers whose name or phone matches the text (merchant and admin search). */
  const customerIdsMatching = async (text: string): Promise<string[]> => {
    const pattern = { $regex: escapeRegex(text), $options: 'i' };
    const found = await customers.findMany(
      { $or: [{ firstName: pattern }, { lastName: pattern }, { 'phone.e164': pattern }] },
      undefined,
    );
    return ids(found.slice(0, BOOKING_SEARCH_LOOKUP_LIMIT));
  };
  const salonIdsMatching = async (text: string): Promise<string[]> => {
    const found = await salons.findMany({
      name: { $regex: escapeRegex(text), $options: 'i' },
    });
    return ids(found.slice(0, BOOKING_SEARCH_LOOKUP_LIMIT));
  };

  const buildFilter = async (
    audience: BookingAudience,
    query: BookingQuery,
  ): Promise<{ filter: QueryFilter<BookingRaw>; ascending: boolean }> => {
    const timeZone = await settings.get('timezone');
    const at = now();
    const and: Record<string, unknown>[] = [];
    let ascending = true;

    if (audience.kind === 'CUSTOMER') and.push({ customerId: toObjectId(audience.customerId) });
    if (audience.kind === 'MERCHANT') {
      and.push({ salonId: toObjectId(audience.salonId) });
      if (audience.member.branchId !== undefined) {
        and.push({ branchId: toObjectId(audience.member.branchId) });
      }
      if (viewScope(audience.member).own) {
        and.push({ persons: { $elemMatch: { staffId: toObjectId(audience.member.id) } } });
      }
    }
    if (audience.kind === 'ADMIN') {
      if (query.salonId !== undefined) and.push({ salonId: toObjectId(query.salonId) });
      if (query.customerId !== undefined) and.push({ customerId: toObjectId(query.customerId) });
    }
    if (audience.kind !== 'CUSTOMER' && query.branchId !== undefined) {
      and.push({ branchId: toObjectId(query.branchId) });
    }

    switch (query.tab) {
      case 'PENDING':
        and.push({ status: 'PENDING' });
        break;
      case 'UPCOMING':
        and.push({ status: { $in: ['PENDING', 'APPROVED'] }, appointmentEnd: { $gte: at } });
        break;
      case 'TODAY': {
        const day = localDayRange(localDateOf(at, timeZone), timeZone);
        and.push({ appointmentStart: { $gte: day.start, $lt: day.end } });
        break;
      }
      case 'PAST':
        and.push({
          $or: [{ status: { $in: [...FINAL_STATUSES] } }, { appointmentEnd: { $lt: at } }],
        });
        ascending = false;
        break;
      case undefined:
        break;
    }
    if (query.from !== undefined) {
      and.push({ appointmentStart: { $gte: localDayRange(query.from, timeZone).start } });
    }
    if (query.to !== undefined) {
      and.push({ appointmentStart: { $lt: localDayRange(query.to, timeZone).end } });
    }
    if (query.statuses !== undefined && query.statuses.length > 0) {
      and.push({ status: { $in: [...query.statuses] } });
    }
    if (query.staffIds !== undefined && query.staffIds.length > 0) {
      and.push({
        persons: { $elemMatch: { staffId: { $in: query.staffIds.map(toObjectId) } } },
      });
    }
    if (query.brideOnly === true) and.push({ hasBride: true });
    if (query.paymentStatus !== undefined) and.push({ paymentStatus: query.paymentStatus });

    const text = query.q?.trim();
    if (text !== undefined && text !== '') {
      const reference = normalizeReferenceNumber(text);
      const or: Record<string, unknown>[] =
        reference === null ? [] : [{ referenceNumber: reference }];
      if (audience.kind === 'CUSTOMER') {
        const salonIds = await salonIdsMatching(text);
        if (salonIds.length > 0) or.push({ salonId: { $in: salonIds.map(toObjectId) } });
      } else {
        const customerIds = await customerIdsMatching(text);
        if (customerIds.length > 0) or.push({ customerId: { $in: customerIds.map(toObjectId) } });
      }
      // No match at all must give an empty page, not everything.
      and.push(or.length === 0 ? { _id: { $in: [] } } : { $or: or });
    }
    return {
      filter: and.length === 0 ? {} : { $and: and },
      ascending,
    };
  };

  /** Names for the ids found in a set of bookings, loaded in one query per kind. */
  const lookups = async (
    rows: readonly Entity<BookingRaw>[],
    audience: BookingAudience,
  ): Promise<{
    salon: Map<string, string>;
    customer: Map<string, { name: string; phone: string }>;
    staff: Map<string, string>;
  }> => {
    const salonIds = [...new Set(rows.map((b) => b.salonId))];
    const customerIds = [...new Set(rows.map((b) => b.customerId))];
    const staffIds = [...new Set(rows.flatMap((b) => b.persons.map((p) => p.staffId)))];
    const [salonRows, customerRows, staffRows] = await Promise.all([
      audience.kind === 'MERCHANT' || salonIds.length === 0
        ? []
        : salons.findMany({ _id: { $in: salonIds } }),
      audience.kind === 'CUSTOMER' || customerIds.length === 0
        ? []
        : customers.findMany({ _id: { $in: customerIds } }),
      audience.kind === 'CUSTOMER' || staffIds.length === 0
        ? []
        : members.findMany({ _id: { $in: staffIds } }),
    ]);
    return {
      salon: new Map(salonRows.map((s) => [s.id, s.name])),
      customer: new Map(
        customerRows.map((c) => [
          c.id,
          { name: `${c.firstName} ${c.lastName}`.trim(), phone: c.phone.e164 },
        ]),
      ),
      staff: new Map(staffRows.map((s) => [s.id, `${s.firstName} ${s.lastName}`.trim()])),
    };
  };

  type Lookups = Awaited<ReturnType<typeof lookups>>;

  const toRow = (
    b: Entity<BookingRaw>,
    audience: BookingAudience,
    l: Lookups,
    language: Language,
  ): BookingRow => ({
    id: b.id,
    referenceNumber: b.referenceNumber,
    status: b.status,
    paymentMethod: b.paymentMethod,
    paymentStatus: b.paymentStatus,
    hasBride: b.hasBride,
    appointmentStart: iso(b.appointmentStart),
    appointmentEnd: iso(b.appointmentEnd),
    respondBy: iso(b.respondBy),
    requestedAt: iso(b.createdAt),
    personsCount: b.persons.length,
    total: formatJod(b.money.total),
    salon:
      audience.kind === 'MERCHANT' ? null : { id: b.salonId, name: l.salon.get(b.salonId) ?? '' },
    branch:
      b.branchId === undefined || b.branchSnapshot === undefined
        ? null
        : {
            id: b.branchId,
            name: b.branchSnapshot.name[language],
            locationText: b.branchSnapshot.locationText ?? null,
          },
    customer:
      audience.kind === 'CUSTOMER'
        ? null
        : {
            id: b.customerId,
            name: l.customer.get(b.customerId)?.name ?? '',
            phone: l.customer.get(b.customerId)?.phone ?? '',
          },
    staff:
      audience.kind === 'CUSTOMER'
        ? []
        : [...new Set(b.persons.map((p) => p.staffId))].map((id) => ({
            id,
            name: l.staff.get(id) ?? '',
          })),
  });

  const actionsFor = (
    b: Entity<BookingRaw>,
    audience: BookingAudience,
    at: Date,
  ): BookingAction[] => {
    if (audience.kind !== 'MERCHANT') return [];
    const can = (key: string): boolean => audience.member.permissions.includes(key);
    const started = at >= b.appointmentStart;
    if (b.status === 'PENDING') return can('BOOKINGS_RESPOND') ? ['APPROVE', 'REJECT'] : [];
    if (b.status !== 'APPROVED' || !can('BOOKINGS_OPERATE')) return [];
    return started ? ['COMPLETE', 'NO_SHOW', 'REASSIGN'] : ['CANCEL', 'REASSIGN'];
  };

  return {
    async list({ audience, query, params, language }) {
      const { filter, ascending } = await buildFilter(audience, query);
      const page = await bookings.findPage(filter, params, {
        appointmentStart: ascending ? 1 : -1,
      });
      const l = await lookups(page.items, audience);
      return {
        items: page.items.map((b) => toRow(b, audience, l, language)),
        total: page.meta.total,
      };
    },

    async detail({ audience, bookingId, language }) {
      const { filter } = await buildFilter(audience, {});
      const found = await bookings.findOne({
        $and: [{ _id: toObjectIdOrNull(bookingId) }, filter],
      });
      if (found === null) throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
      const l = await lookups([found], audience);
      const decision = (
        d: { reasonCode: string; reasonText?: string | undefined; at: Date } | undefined,
      ): { reasonCode: string; reasonText: string | null; at: string } | null =>
        d === undefined
          ? null
          : { reasonCode: d.reasonCode, reasonText: d.reasonText ?? null, at: iso(d.at) };
      return {
        ...toRow(found, audience, l, language),
        refundStatus: found.refundStatus,
        persons: found.persons.map((p) => ({
          name: p.name,
          isBride: p.isBride,
          start: iso(p.start),
          end: iso(p.end),
          subtotal: formatJod(p.subtotal),
          staff:
            audience.kind === 'CUSTOMER'
              ? null
              : { id: p.staffId, name: l.staff.get(p.staffId) ?? '' },
          services: p.services.map((s) => ({
            name: s.name[language],
            price: formatJod(s.price),
            durationMinutes: s.durationMinutes,
          })),
        })),
        money: {
          total: formatJod(found.money.total),
          dueOnline: formatJod(found.money.dueOnline),
          paidOnline: formatJod(found.money.paidOnline),
          remaining: formatJod(found.money.remaining),
          refunded: formatJod(found.money.refunded),
        },
        policy: found.policySnapshot,
        statusHistory: found.statusHistory.map((h) => ({
          status: h.status,
          actorType: h.actorType,
          reason: h.reason ?? null,
          at: iso(h.at),
        })),
        rejection: decision(found.rejection),
        cancellation: decision(found.cancellation),
        createdAt: iso(found.createdAt),
        actions: actionsFor(found, audience, now()),
      };
    },

    async calendar({ salonId, member, from, to, staffIds }) {
      const own = viewScope(member).own;
      if (diffDays(from, to) < 0 || diffDays(from, to) >= CALENDAR_MAX_DAYS) {
        throw new ValidationError({
          details: [
            {
              field: 'query.to',
              code: ERROR_CODES.VALIDATION_ERROR,
              messageKey: 'errors.VALIDATION_ERROR',
            },
          ],
        });
      }
      const timeZone = await settings.get('timezone');
      const start = localDayRange(from, timeZone).start;
      const end = localDayRange(to, timeZone).end;
      const found = await bookings.findMany({
        salonId: toObjectId(salonId),
        ...(member.branchId === undefined ? {} : { branchId: toObjectId(member.branchId) }),
        status: { $in: [...CALENDAR_STATUSES] },
        appointmentStart: { $lt: end },
        appointmentEnd: { $gt: start },
      });
      const wanted = own ? [member.id] : (staffIds ?? []);
      return found
        .flatMap((b) =>
          b.persons.map((p) => ({
            bookingId: b.id,
            referenceNumber: b.referenceNumber,
            status: b.status,
            staffId: p.staffId,
            personName: p.name,
            isBride: p.isBride,
            start: p.start,
            end: p.end,
          })),
        )
        .filter(
          (block) =>
            block.start < end &&
            block.end > start &&
            (wanted.length === 0 || wanted.includes(block.staffId)),
        )
        .sort((a, b) => a.start.getTime() - b.start.getTime())
        .map((block) => ({ ...block, start: iso(block.start), end: iso(block.end) }));
    },
  };
};

/** A malformed id matches nothing (the query then returns `null`, i.e. 404). */
const toObjectIdOrNull = (id: string): unknown => {
  try {
    return toObjectId(id);
  } catch {
    return null;
  }
};
