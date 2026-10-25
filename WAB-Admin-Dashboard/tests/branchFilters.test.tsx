import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { MOCK_BOOKINGS } from '@/data/mock/bookingsRoutes';
import { MOCK_BRANCH_IDS } from '@/data/mock/branchesFixture';
import BookingDetailsPage from '@/presentation/bookings/BookingDetailsPage';
import BookingsPage from '@/presentation/bookings/BookingsPage';
import RefundsPage from '@/presentation/refunds/RefundsPage';
import ReviewsPage from '@/presentation/reviews/ReviewsPage';
import SalonDetailsPage from '@/presentation/salons/SalonDetailsPage';
import ReconciliationPage from '@/presentation/transactions/ReconciliationPage';
import TransactionsPage from '@/presentation/transactions/TransactionsPage';
import { renderWithApp } from './helpers/render';

const SALON = '64f000000000000000000001';
const KHALDA = MOCK_BRANCH_IDS.noorSecond;
const at = (url: string, pattern: string, element: ReactElement) =>
  renderWithApp(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path={pattern} element={element} />
      </Routes>
    </MemoryRouter>,
  );
const bodyRows = () => screen.getAllByRole('row').length - 1;
const scoped = `salon=${SALON}&branch=${KHALDA}`;

describe('branch filter and column (ADM-091)', () => {
  it('bookings: picking a salon shows its branches; a branch narrows the list; the column names it', async () => {
    at('/bookings', '/bookings', <BookingsPage />);
    await waitFor(() => expect(bodyRows()).toBe(3));
    expect(screen.queryByLabelText('Branch')).toBeNull();
    await userEvent.click(screen.getByRole('combobox', { name: 'Salon' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Noor Salon' }));
    await userEvent.selectOptions(await screen.findByLabelText('Branch'), 'Khalda');
    await waitFor(() => expect(bodyRows()).toBe(1));
    expect(within(screen.getAllByRole('row')[1]!).getByText('Khalda')).toBeInTheDocument();
  });

  it('booking details show the branch and its address', async () => {
    const booking = MOCK_BOOKINGS[1]!;
    at(`/bookings/${booking.id}`, '/bookings/:id', <BookingDetailsPage />);
    expect(await screen.findByText('Khalda · Khalda street 12')).toBeInTheDocument();
  });

  it('reviews: branch filter from the URL and the branch column', async () => {
    at(`/reviews?${scoped}`, '/reviews', <ReviewsPage />);
    await waitFor(() => expect(bodyRows()).toBe(1));
    expect(screen.getAllByText('Khalda').length).toBeGreaterThan(0);
  });

  it('transactions: branch filter and the branch name looked up from the salon', async () => {
    at(`/finance/transactions?${scoped}`, '/finance/transactions', <TransactionsPage />);
    await waitFor(() => expect(bodyRows()).toBe(1));
    expect(await screen.findByRole('cell', { name: 'Khalda' })).toBeInTheDocument();
  });

  it('refunds: salon + branch filter and column', async () => {
    at(`/finance/refunds?${scoped}`, '/finance/refunds', <RefundsPage />);
    await waitFor(() => expect(bodyRows()).toBe(1));
    expect(await screen.findByRole('cell', { name: 'Khalda' })).toBeInTheDocument();
  });

  it('reconciliation: problems of one branch only', async () => {
    at(`/finance/reconciliation?${scoped}`, '/finance/reconciliation', <ReconciliationPage />);
    expect(await screen.findByText('1 to review')).toBeInTheDocument();
    expect(await screen.findByRole('cell', { name: 'Khalda' })).toBeInTheDocument();
  });

  it('salon members: branch column (owner = all branches) and branch filter', async () => {
    at(`/salons/${SALON}`, '/salons/:id', <SalonDetailsPage />);
    await userEvent.click(await screen.findByRole('tab', { name: 'Members' }));
    expect(await screen.findByText('All branches (owner)')).toBeInTheDocument();
    await waitFor(() => expect(bodyRows()).toBe(3));
    await userEvent.selectOptions(await screen.findByLabelText('Branch'), 'Khalda');
    await waitFor(() => expect(bodyRows()).toBe(1));
    expect(screen.getByText('Lina Odeh')).toBeInTheDocument();
  });
});
