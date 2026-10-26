import { MemoryRouter } from 'react-router-dom';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { deltaPercent, sumCounts } from '@/domain/analytics/analytics';
import { alignDays, countOf, ratioOf } from '@/presentation/analytics/useBoardData';
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

  it('reads one event count of a section, 0 when missing or not loaded', () => {
    const overview = { payments: { 'payment.failed': 4 }, refunds: {}, bookings: {}, errors: {} };
    expect(countOf(overview, 'payments', 'payment.failed')).toBe(4);
    expect(countOf(overview, 'payments', 'payment.started')).toBe(0);
    expect(countOf(undefined, 'errors', 'api.error')).toBe(0);
  });

  it('gives a ratio only when there is something to divide by', () => {
    expect(ratioOf(72, 80)).toBe(0.9);
    expect(ratioOf(0, 0)).toBeUndefined();
    expect(ratioOf(3, 0)).toBeUndefined();
  });

  it('aligns per-name day counts on one day axis with zeros for missing days', () => {
    const aligned = alignDays([
      [
        { key: '2026-10-02', count: 3 },
        { key: '2026-10-01', count: 1 },
      ],
      [{ key: '2026-10-03', count: 5 }],
      [],
    ]);
    expect(aligned.labels).toEqual(['2026-10-01', '2026-10-02', '2026-10-03']);
    expect(aligned.values).toEqual([
      [1, 3, 0],
      [0, 0, 5],
      [0, 0, 0],
    ]);
  });
});

describe('live overview', () => {
  it('shows the four totals with their event breakdown (design 02)', async () => {
    renderWithApp(
      <MemoryRouter>
        <LiveOverviewPage />
      </MemoryRouter>,
      makeContainer(),
    );
    expect(await screen.findByText('Payment events')).toBeInTheDocument();
    // payments 70 + 60 + 4 + 2, bookings 100 + 72 + 8 + 10 + 55 + 3 + 2 (mock overview).
    expect(screen.getByText('136')).toBeInTheDocument();
    expect(screen.getByText('250')).toBeInTheDocument();
    expect(screen.getByText('payment.succeeded')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: "Today's report" })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /^Alerts \(\d+\)$/ })).toBeInTheDocument();
    expect(screen.getByText(/· Amman time$/)).toBeInTheDocument();
  });

  it('shows the error state with retry', async () => {
    const failing = makeContainer();
    failing.mock?.scenarios.set('serverError');
    renderWithApp(<LiveOverviewPage />, failing);
    expect(await screen.findByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});
