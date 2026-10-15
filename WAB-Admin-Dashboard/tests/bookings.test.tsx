import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { MOCK_BOOKINGS } from '@/data/mock/bookingsRoutes';
import BookingDetailsPage from '@/presentation/bookings/BookingDetailsPage';
import { bookingQueryOf } from '@/presentation/bookings/bookingFilters';
import BookingsPage from '@/presentation/bookings/BookingsPage';
import { parseListState } from '@/domain/shared/listState';
import { BOOKING_FILTER_KEYS } from '@/presentation/bookings/bookingFilters';
import { makeContainer, renderWithApp } from './helpers/render';

const app = (path = '/bookings') =>
  renderWithApp(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/bookings" element={<BookingsPage />} />
        <Route path="/bookings/:id" element={<BookingDetailsPage />} />
      </Routes>
    </MemoryRouter>,
    makeContainer(),
  );
const bodyRows = () => screen.getAllByRole('row').length - 1;
const queryOf = (qs: string) =>
  bookingQueryOf(parseListState(new URLSearchParams(qs), { filterKeys: BOOKING_FILTER_KEYS }));

describe('bookingQueryOf', () => {
  it('maps the URL to the API query and drops invalid values', () => {
    expect(queryOf('')).toEqual({ page: 1, pageSize: 25 });
    expect(
      queryOf('tab=TODAY&status=APPROVED&payment=FULLY_PAID&bride=true&salon=s1&customer=c1&q=wab'),
    ).toMatchObject({
      tab: 'TODAY',
      status: ['APPROVED'],
      paymentStatus: 'FULLY_PAID',
      brideOnly: true,
      salonId: 's1',
      customerId: 'c1',
      q: 'wab',
    });
    expect(queryOf('tab=NOPE&status=NOPE&payment=NOPE&from=2026-02-30')).toEqual({
      page: 1,
      pageSize: 25,
    });
  });

  it('days are Amman days: `from` starts the day, `to` is included (exclusive instant)', () => {
    const q = queryOf('from=2026-10-10&to=2026-10-10');
    expect(q.from).toBe('2026-10-09T21:00:00.000Z');
    expect(q.to).toBe('2026-10-10T21:00:00.000Z');
  });
});

describe('BookingsPage', () => {
  it('lists bookings with status, payment and JOD totals', async () => {
    app();
    await waitFor(() => expect(bodyRows()).toBe(3));
    expect(screen.getByText('WAB-000002')).toBeInTheDocument();
    expect(screen.getByText('120.500 JOD')).toBeInTheDocument();
  });

  it('filters by status and by bride, and opens a booking', async () => {
    app();
    await waitFor(() => expect(bodyRows()).toBe(3));
    await userEvent.selectOptions(screen.getByLabelText('State'), 'COMPLETED');
    await waitFor(() => expect(bodyRows()).toBe(1));
    await userEvent.selectOptions(screen.getByLabelText('State'), '');
    await userEvent.selectOptions(screen.getByLabelText('Bride'), 'true');
    await waitFor(() => expect(bodyRows()).toBe(1));
    await userEvent.click(screen.getByText('WAB-000002'));
    expect(await screen.findByRole('heading', { name: 'WAB-000002' })).toBeInTheDocument();
  });
});

describe('BookingDetailsPage', () => {
  it('shows persons, money and history', async () => {
    app(`/bookings/${MOCK_BOOKINGS[0]!.id}`);
    expect(await screen.findByText('Haircut')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Status history' }));
    expect((await screen.findAllByText('Pending')).length).toBeGreaterThan(0);
  });

  it('changes the status with a reason and flags an irregular move', async () => {
    app(`/bookings/${MOCK_BOOKINGS[2]!.id}`);
    await userEvent.click(await screen.findByRole('button', { name: 'Change status' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('note')).toHaveTextContent('flagged');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(
      await within(dialog).findByText('Write the reason (at least 3 characters)'),
    ).toBeInTheDocument();
    await userEvent.selectOptions(within(dialog).getByLabelText('New status'), 'NO_SHOW');
    await userEvent.type(within(dialog).getByLabelText('Reason'), 'Salon reported no show');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(await screen.findByText('No-show')).toBeInTheDocument();
  });
});
