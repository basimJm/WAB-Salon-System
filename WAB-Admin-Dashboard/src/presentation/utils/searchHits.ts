import type { TFunction } from 'i18next';
import { ROUTES } from '@/constants/routes';
import type { SearchResponse } from '@/domain/search/search';
import type { SearchHit, SearchResults } from '../components/layout/GlobalSearch';

/** Turns the server's groups into top-bar results: a label, a second line and the page a pick opens. */
export function toSearchResults(response: SearchResponse, t: TFunction): SearchResults {
  return {
    customers: (response.customers ?? []).map((c): SearchHit => ({
      id: c.id,
      label: c.name,
      hint: `${c.phone} · ${t(`status.customer.${c.status}`, { defaultValue: c.status })}`,
      to: `${ROUTES.customers}/${c.id}`,
    })),
    salons: (response.salons ?? []).map((s): SearchHit => ({
      id: s.id,
      label: s.name,
      hint: t(`status.salon.${s.state}`, { defaultValue: s.state }),
      to: `${ROUTES.salons}/${s.id}`,
    })),
    bookings: (response.bookings ?? []).map((b): SearchHit => ({
      id: b.id,
      label: b.referenceNumber,
      hint: t(`status.booking.${b.status}`, { defaultValue: b.status }),
      to: `${ROUTES.bookings}/${b.id}`,
    })),
    members: (response.members ?? []).map((m): SearchHit => ({
      id: m.id,
      label: m.name,
      hint: `${m.phone} · ${t(`salons.roles.${m.role}`, { defaultValue: m.role })}`,
      to: `${ROUTES.salons}/${m.salonId}`,
    })),
  };
}
