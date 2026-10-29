import { defineEndpoint } from '../api/endpoint';
import * as dto from '../contract/generated/dto';
import { OPERATIONS } from '../contract/generated/operations';
import { mockRoute } from './mockRoute';
import type { MockRoute } from './mockTransport';
import { MOCK_SALONS } from './salonsRoutes';

const has = (value: string, q: string) => value.toLowerCase().includes(q);
const group = <T>(items: T[]) => ({ items, total: items.length });

export function searchRoutes(): readonly MockRoute[] {
  return [
    mockRoute(
      defineEndpoint(OPERATIONS.getSearch, {
        data: dto.getSearchDataSchema,
        query: dto.getSearchQuerySchema,
      }),
      ({ query }) => {
        const q = (query.get('q') ?? '').toLowerCase();
        const salons = MOCK_SALONS.filter((s) => has(s.name, q)).map(
          ({ id, name, businessType, audience, state }) => ({
            id,
            name,
            businessType,
            audience,
            state,
          }),
        );
        const customers = has('Dana Customer', q) || has('+962790000001', q) ? [DANA] : [];
        const bookings = has('WAB-1001', q) ? [BOOKING] : [];
        const members = has('Maha Haddad', q) ? [MEMBER] : [];
        return {
          data: {
            customers: group(customers),
            salons: group(salons),
            bookings: group(bookings),
            members: group(members),
            page: 1,
            pageSize: 5,
          },
        };
      },
    ),
  ];
}

const DANA = {
  id: '64b000000000000000000001',
  name: 'Dana Customer',
  phone: '+962790000001',
  status: 'ACTIVE' as const,
};
const BOOKING = {
  id: '64d000000000000000000001',
  referenceNumber: 'WAB-1001',
  status: 'PENDING' as const,
  appointmentStart: '2026-10-20T09:00:00.000Z',
  salonId: MOCK_SALONS[0]?.id ?? '',
  customerId: DANA.id,
};
const MEMBER = {
  id: '64f0000000000000000000a1',
  name: 'Maha Haddad',
  phone: '+962790000101',
  role: 'OWNER' as const,
  salonId: MOCK_SALONS[0]?.id ?? '',
  active: true,
};
