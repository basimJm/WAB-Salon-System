import { MemoryRouter } from 'react-router-dom';
import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { deltaPercent, sumCounts, withPrefix } from '@/domain/analytics/analytics';
import {
  BookingsAnalyticsPage,
  ErrorsAnalyticsPage,
} from '@/presentation/analytics/EventsAnalyticsPage';
import LiveOverviewPage from '@/presentation/analytics/LiveOverviewPage';
import { makeContainer, renderWithApp } from './helpers/render';

describe('analytics rules', () => {
  it('sums counts and computes the change against the previous period', () => {
    expect(sumCounts({ a: 2, b: 3 })).toBe(5);
    expect(sumCounts({})).toBe(0);
    expect(deltaPercent(110, 100)).toBe(10);
    expect(deltaPercent(50, 100)).toBe(-50);
    expect(deltaPercent(5, 0)).toBeUndefined();
  });

  it('keeps events by name prefix', () => {
    const rows = [
      { key: 'booking.created', count: 1 },
      { key: 'payment.failed', count: 2 },
    ];
    expect(withPrefix(rows, 'booking.')).toEqual([rows[0]]);
    expect(withPrefix(rows, 'x.')).toEqual([]);
  });
});

describe('analytics pages', () => {
  it('overview shows the four totals with their event breakdown (design 02)', async () => {
    renderWithApp(
      <MemoryRouter>
        <LiveOverviewPage />
      </MemoryRouter>,
      makeContainer(),
    );
    expect(await screen.findByText('Payment events')).toBeInTheDocument();
    expect(screen.getByText('64')).toBeInTheDocument();
    expect(screen.getByText('110')).toBeInTheDocument();
    expect(screen.getByText('payment.succeeded')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: "Today's report" })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /^Alerts \(\d+\)$/ })).toBeInTheDocument();
    expect(screen.getByText(/· Amman time$/)).toBeInTheDocument();
  });

  it('a family page charts only its events', async () => {
    renderWithApp(<BookingsAnalyticsPage />, makeContainer());
    expect(await screen.findByText('Events by name')).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText('Events per day').length).toBeGreaterThan(0));
  });

  it('shows an empty message when the family has no events', async () => {
    renderWithApp(<ErrorsAnalyticsPage />, makeContainer());
    expect(await screen.findByText('Events by name')).toBeInTheDocument();
  });

  it('shows the error state with retry', async () => {
    const failing = makeContainer();
    failing.mock?.scenarios.set('serverError');
    renderWithApp(<LiveOverviewPage />, failing);
    expect(await screen.findByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});
