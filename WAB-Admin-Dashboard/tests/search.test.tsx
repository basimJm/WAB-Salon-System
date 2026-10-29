import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18next from 'i18next';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { GlobalSearch } from '@/presentation/components/layout/GlobalSearch';
import { useGlobalSearch } from '@/presentation/hooks/useGlobalSearch';
import { toSearchResults } from '@/presentation/utils/searchHits';
import { makeContainer, renderWithApp } from './helpers/render';

describe('toSearchResults', () => {
  const t = i18next.t.bind(i18next);
  it('links every group to its page and tolerates missing groups', () => {
    const results = toSearchResults(
      {
        customers: [{ id: 'c1', name: 'Dana', phone: '+962790000001', status: 'ACTIVE' }],
        salons: [
          { id: 's1', name: 'Noor', businessType: 'SALON', audience: 'FEMALE', state: 'LIVE' },
        ],
        bookings: [
          {
            id: 'b1',
            referenceNumber: 'WAB-1',
            status: 'PENDING',
            appointmentStart: '2026-10-20T09:00:00.000Z',
            salonId: 's1',
            customerId: 'c1',
          },
        ],
        members: [
          { id: 'm1', name: 'Maha', phone: '+9627', role: 'OWNER', salonId: 's9', active: true },
        ],
      },
      t,
    );
    expect(results.customers?.[0]?.to).toBe('/customers/c1');
    expect(results.salons?.[0]?.to).toBe('/salons/s1');
    expect(results.bookings?.[0]?.to).toBe('/bookings/b1');
    expect(results.bookings?.[0]?.label).toBe('WAB-1');
    expect(results.members?.[0]?.to).toBe('/salons/s9');
    expect(toSearchResults({}, t).customers).toEqual([]);
  });
});

function Box() {
  const search = useGlobalSearch();
  return <GlobalSearch search={search} onSelect={() => undefined} />;
}

describe('global search against the mock server', () => {
  const open = () =>
    renderWithApp(
      <MemoryRouter>
        <Box />
      </MemoryRouter>,
      makeContainer(),
      'en',
    );

  it('finds a salon and a booking by what was typed, grouped', async () => {
    const user = userEvent.setup();
    open();
    const input = screen.getByRole('combobox');
    await user.type(input, 'Noor');
    await waitFor(() => expect(screen.getByText('Noor Salon')).toBeInTheDocument(), {
      timeout: 3000,
    });
    await user.clear(input);
    await user.type(input, 'WAB-1001');
    await waitFor(() => expect(screen.getByText('WAB-1001')).toBeInTheDocument(), {
      timeout: 3000,
    });
  });

  it('says nothing was found', async () => {
    const user = userEvent.setup();
    open();
    await user.type(screen.getByRole('combobox'), 'zzzz');
    await waitFor(() => expect(screen.getByText('No results')).toBeInTheDocument(), {
      timeout: 3000,
    });
  });

  it('says the search failed when the server fails', async () => {
    const container = makeContainer();
    container.mock?.scenarios.set('serverError');
    const user = userEvent.setup();
    renderWithApp(
      <MemoryRouter>
        <Box />
      </MemoryRouter>,
      container,
      'en',
    );
    await user.type(screen.getByRole('combobox'), 'Noor');
    await waitFor(() => expect(screen.getByText(/failed/i)).toBeInTheDocument(), {
      timeout: 3000,
    });
  });
});
