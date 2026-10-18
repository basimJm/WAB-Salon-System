import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { isMonth } from '@/domain/reports/reports';
import ReportsPage from '@/presentation/reports/ReportsPage';
import { makeContainer, renderWithApp } from './helpers/render';

describe('isMonth', () => {
  it.each([
    ['2026-10', true],
    ['2026-13', false],
    ['2026-1', false],
    ['26-10', false],
    ['', false],
  ])('%s -> %s', (v, ok) => expect(isMonth(v)).toBe(ok));
});

describe('ReportsPage', () => {
  it('shows the daily report with money and the bookings chart', async () => {
    renderWithApp(<ReportsPage />, makeContainer());
    expect(await screen.findByText('4,500.000 JOD')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getAllByText('Bookings by status').length).toBeGreaterThan(0);
  });

  it('the weekly view adds the top salons; the monthly view adds payouts and the snapshot', async () => {
    renderWithApp(<ReportsPage />, makeContainer());
    await userEvent.click(screen.getByRole('tab', { name: 'Weekly' }));
    expect(
      (await screen.findAllByText('Top salons (bookings, completed, lost)')).length,
    ).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole('tab', { name: 'Monthly' }));
    expect((await screen.findAllByText('Payouts')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Right now').length).toBeGreaterThan(0);
  });

  it('a bad month shows the format hint instead of calling the server', async () => {
    renderWithApp(<ReportsPage />, makeContainer());
    await userEvent.click(screen.getByRole('tab', { name: 'Monthly' }));
    const box = await screen.findByLabelText('Month');
    await userEvent.clear(box);
    await userEvent.type(box, '2026-99');
    expect(await screen.findByText('Use the form YYYY-MM')).toBeInTheDocument();
  });

  it('shows the error state with retry', async () => {
    const failing = makeContainer();
    failing.mock?.scenarios.set('serverError');
    renderWithApp(<ReportsPage />, failing);
    expect(await screen.findByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});
