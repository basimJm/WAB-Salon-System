import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { ANALYTICS_BOARDS } from '@/constants/analytics';
import BookingsAnalyticsPage from '@/presentation/analytics/BookingsAnalyticsPage';
import ErrorsAnalyticsPage from '@/presentation/analytics/ErrorsAnalyticsPage';
import JourneyPage from '@/presentation/analytics/JourneyPage';
import MerchantsAnalyticsPage from '@/presentation/analytics/MerchantsAnalyticsPage';
import PaymentsAnalyticsPage from '@/presentation/analytics/PaymentsAnalyticsPage';
import AppUsageAnalyticsPage from '@/presentation/analytics/AppUsageAnalyticsPage';
import { makeContainer, renderWithApp } from './helpers/render';

function Where() {
  const location = useLocation();
  return <output data-testid="where">{`${location.pathname}${location.search}`}</output>;
}

const page = (ui: ReactElement, container = makeContainer()) =>
  renderWithApp(
    <MemoryRouter initialEntries={['/here']}>
      <Routes>
        <Route path="/here" element={ui} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
    container,
  );

/** The KPI card whose label is `label` (design KPI row). */
const kpi = async (label: string): Promise<HTMLElement> => {
  const text = await screen.findByText(label, { selector: '.wab-kpi__label' });
  const card = text.closest<HTMLElement>('.wab-kpi');
  if (!card) throw new Error(`no KPI card ${label}`);
  return card;
};

describe('analytics boards (design 03)', () => {
  it('bookings: real event counts, acceptance among decisions, status stack; the rest says "no data yet"', async () => {
    page(<BookingsAnalyticsPage />);
    expect(await within(await kpi('Bookings')).findByText('100')).toBeInTheDocument();
    const acceptance = await kpi('Acceptance rate');
    expect(await within(acceptance).findByText('90%')).toBeInTheDocument();
    expect(within(acceptance).getByText('of 80 decisions')).toBeInTheDocument();
    expect(await within(await kpi('Auto-cancelled')).findByText('2')).toBeInTheDocument();
    expect(await within(await kpi('No-show')).findByText('3')).toBeInTheDocument();
    const response = await kpi('Avg salon response');
    expect(within(response).getByText('No data yet')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Bookings by status' })).toBeInTheDocument();
    const method = screen.getByRole('region', { name: 'Payment method' });
    expect(
      within(method).getByText('The server does not provide this metric yet.'),
    ).toBeInTheDocument();
    expect(screen.getAllByText('No data yet').length).toBeGreaterThanOrEqual(9);
  });

  it('payments: success among finished attempts, failed refunds in rose, link to the transactions', async () => {
    page(<PaymentsAnalyticsPage />);
    expect(await within(await kpi('Success rate')).findByText('94%')).toBeInTheDocument();
    expect(await within(await kpi('Attempts')).findByText('66')).toBeInTheDocument();
    expect(await within(await kpi('Refunds')).findByText('4')).toBeInTheDocument();
    expect(await within(await kpi('Failed refunds')).findByText('1')).toHaveClass(
      'wab-kpi__value--rose',
    );
    expect(await within(await kpi('Collected')).findByText('No data yet')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Open transactions' }));
    expect(await screen.findByTestId('where')).toHaveTextContent('/finance/transactions');
  });

  it('errors: OTP blocks and the failures card from server events', async () => {
    page(<ErrorsAnalyticsPage />);
    expect(await within(await kpi('OTP blocks')).findByText('1')).toBeInTheDocument();
    const failures = await screen.findByRole('region', {
      name: 'Payment, refund and notification failures',
    });
    expect(await within(failures).findByText('Failed payments')).toBeInTheDocument();
    expect(within(failures).getByText('6')).toBeInTheDocument();
    expect(within(failures).getByText('No data yet')).toBeInTheDocument();
  });

  it('merchants: subscription counts and salons per state from the list totals', async () => {
    page(<MerchantsAnalyticsPage />);
    expect(await within(await kpi('Active trials')).findByText('1')).toBeInTheDocument();
    expect(await within(await kpi('Ending in ≤ 7 days')).findByText('1')).toBeInTheDocument();
    expect(await within(await kpi('Paid subscriptions')).findByText('1')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Salons by state' })).toBeInTheDocument();
    expect(
      await within(await kpi('Avg time to accept')).findByText('No data yet'),
    ).toBeInTheDocument();
  });

  it('a board without server data shows its design layout with every KPI and card empty', async () => {
    page(<AppUsageAnalyticsPage />);
    expect(
      await screen.findByRole('heading', { name: 'Active users and installs' }),
    ).toBeInTheDocument();
    const def = ANALYTICS_BOARDS.traffic;
    expect(screen.getAllByText('No data yet')).toHaveLength(def.kpis.length + def.cards.length);
    expect(screen.queryByRole('group', { name: /range/i })).not.toBeInTheDocument();
  });

  it('shows an error with retry when the overview fails', async () => {
    const failing = makeContainer();
    failing.mock?.scenarios.set('serverError');
    page(<BookingsAnalyticsPage />, failing);
    expect((await screen.findAllByRole('button', { name: /retry/i })).length).toBeGreaterThan(0);
  });
});

describe('user journey (design A11)', () => {
  it('asks for a user, then says the server has no journey yet and offers the customer search', async () => {
    page(<JourneyPage />);
    expect(screen.getByText('Search for a user to see their journey')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/Phone, name/), '0791234567');
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(screen.getByText('No journey data yet')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Find in customers' }));
    expect(await screen.findByTestId('where')).toHaveTextContent('/customers?q=0791234567');
  });

  it('an empty search keeps the first empty state', async () => {
    page(<JourneyPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(screen.getByText('Search for a user to see their journey')).toBeInTheDocument();
  });
});
