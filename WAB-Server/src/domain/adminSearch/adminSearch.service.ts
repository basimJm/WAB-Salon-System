import type { AdminSearchType } from '../../constants/adminSearch';
import { ADMIN_SEARCH_TYPES } from '../../constants/adminSearch';
import type { BookingStatus, CustomerStatus, Gender, MemberRole } from '../../constants/enums';
import type { SalonState } from '../../constants/salon';
import type { BookingsRepository } from '../../repositories/bookings.repository';
import type {
  CustomersRepository,
  MembersRepository,
} from '../../repositories/identity.repository';
import type { SalonsRepository } from '../../repositories/salons.repository';
import { escapeRegex } from '../../utils/format/regex';
import { normalizeReferenceNumber } from '../../utils/reference';
import type { PaginationParams } from '../../utils/pagination';

export interface SearchCustomer {
  readonly id: string;
  readonly name: string;
  readonly phone: string;
  readonly status: CustomerStatus;
}
export interface SearchSalon {
  readonly id: string;
  readonly name: string;
  readonly gender: Gender;
  readonly state: SalonState;
}
export interface SearchBooking {
  readonly id: string;
  readonly referenceNumber: string;
  readonly status: BookingStatus;
  readonly appointmentStart: Date;
  readonly salonId: string;
  readonly customerId: string;
}
export interface SearchMember {
  readonly id: string;
  readonly name: string;
  readonly phone: string;
  readonly role: MemberRole;
  readonly salonId: string;
  readonly active: boolean;
}

export interface SearchGroup<T> {
  readonly items: readonly T[];
  readonly total: number;
}

/** Only the requested groups are present. */
export interface AdminSearchResult {
  readonly customers?: SearchGroup<SearchCustomer>;
  readonly salons?: SearchGroup<SearchSalon>;
  readonly bookings?: SearchGroup<SearchBooking>;
  readonly members?: SearchGroup<SearchMember>;
}

export interface AdminSearchService {
  search(input: {
    q: string;
    types?: readonly AdminSearchType[] | undefined;
    params: PaginationParams;
  }): Promise<AdminSearchResult>;
}

export interface AdminSearchDeps {
  readonly customers: Pick<CustomersRepository, 'findPage'>;
  readonly salons: Pick<SalonsRepository, 'findPage'>;
  readonly members: Pick<MembersRepository, 'findPage'>;
  readonly bookings: Pick<BookingsRepository, 'findPage'>;
}

/** Something a person types for a phone number: digits with an optional +, spaces or dashes. */
const PHONE_TEXT = /^\+?[0-9][0-9\s-]*$/;
const NON_DIGITS = /\D/g;
const LEADING_ZEROS = /^0+/;

/**
 * One box for the whole panel (Admin PRD §3). Phones match by prefix and references exactly, so
 * both use their unique indexes; names are a case-insensitive contains match on collections of
 * admin scale (no stemming, Arabic safe). The text is escaped: it is never a pattern.
 */
export const createAdminSearchService = (deps: AdminSearchDeps): AdminSearchService => {
  const sort = { createdAt: -1 } as const;

  return {
    async search({ q, types, params }) {
      const text = q.trim();
      const wanted = new Set<AdminSearchType>(types ?? ADMIN_SEARCH_TYPES);
      const name = { $regex: escapeRegex(text), $options: 'i' };
      const digits = PHONE_TEXT.test(text) ? text.replace(NON_DIGITS, '') : '';
      // `0786…` and `786…` are the national number; `962786…` / `+962786…` start with the dial code.
      const national = digits.replace(LEADING_ZEROS, '');
      const phoneClauses = (field: 'phone.e164' | 'phone.number' | 'phone'): object[] =>
        digits === ''
          ? []
          : field === 'phone.number'
            ? [{ 'phone.number': { $regex: `^${escapeRegex(national)}` } }]
            : [{ [field]: { $regex: `^\\+${escapeRegex(digits)}` } }];
      const reference = normalizeReferenceNumber(text);

      const [customers, salons, bookings, members] = await Promise.all([
        wanted.has('customers')
          ? deps.customers.findPage(
              {
                $or: [
                  { firstName: name },
                  { lastName: name },
                  ...phoneClauses('phone.e164'),
                  ...phoneClauses('phone.number'),
                ],
              },
              params,
              sort,
            )
          : undefined,
        wanted.has('salons') ? deps.salons.findPage({ name }, params, sort) : undefined,
        wanted.has('bookings')
          ? deps.bookings.findPage(
              reference === null ? { _id: { $in: [] } } : { referenceNumber: reference },
              params,
              { appointmentStart: -1 },
            )
          : undefined,
        wanted.has('members')
          ? deps.members.findPage(
              {
                $or: [
                  { firstName: name },
                  { lastName: name },
                  ...phoneClauses('phone'),
                  ...(national === '' ? [] : [{ phone: { $regex: escapeRegex(national) } }]),
                ],
              },
              params,
              sort,
            )
          : undefined,
      ]);

      return {
        ...(customers === undefined
          ? {}
          : {
              customers: {
                total: customers.meta.total,
                items: customers.items.map((c) => ({
                  id: c.id,
                  name: `${c.firstName} ${c.lastName}`,
                  phone: c.phone.e164,
                  status: c.status,
                })),
              },
            }),
        ...(salons === undefined
          ? {}
          : {
              salons: {
                total: salons.meta.total,
                items: salons.items.map((s) => ({
                  id: s.id,
                  name: s.name,
                  gender: s.gender,
                  state: s.state,
                })),
              },
            }),
        ...(bookings === undefined
          ? {}
          : {
              bookings: {
                total: bookings.meta.total,
                items: bookings.items.map((b) => ({
                  id: b.id,
                  referenceNumber: b.referenceNumber,
                  status: b.status,
                  appointmentStart: b.appointmentStart,
                  salonId: b.salonId,
                  customerId: b.customerId,
                })),
              },
            }),
        ...(members === undefined
          ? {}
          : {
              members: {
                total: members.meta.total,
                items: members.items.map((m) => ({
                  id: m.id,
                  name: `${m.firstName} ${m.lastName}`,
                  phone: m.phone,
                  role: m.role,
                  salonId: m.salonId,
                  active: m.active,
                })),
              },
            }),
      };
    },
  };
};
