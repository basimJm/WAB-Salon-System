import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { MOCK_SALONS } from '@/data/mock/salonsRoutes';
import {
  canDecideDeletion,
  completionRatePct,
  hasOpenDeletionRequest,
} from '@/domain/salons/salonRules';
import { parseListState } from '@/domain/shared/listState';
import SalonDetailsPage from '@/presentation/salons/SalonDetailsPage';
import { SALON_FILTER_KEYS, salonQueryOf } from '@/presentation/salons/salonFilters';
import SalonsPage from '@/presentation/salons/SalonsPage';
import { makeContainer, renderWithApp } from './helpers/render';

const queryOf = (qs: string) =>
  salonQueryOf(parseListState(new URLSearchParams(qs), { filterKeys: SALON_FILTER_KEYS }));
const bodyRows = () => screen.getAllByRole('row').length - 1;

describe('salon rules', () => {
  it('knows when a deletion request is still open', () => {
    expect(hasOpenDeletionRequest({ deletionRequestedAt: null })).toBe(false);
    expect(hasOpenDeletionRequest({ deletionRequestedAt: '2026-10-01T00:00:00.000Z' })).toBe(true);
    expect(
      hasOpenDeletionRequest({
        deletionRequestedAt: '2026-10-01T00:00:00.000Z',
        deletionApprovedAt: '2026-10-02T00:00:00.000Z',
      }),
    ).toBe(false);
    expect(canDecideDeletion({ deletionRequestedAt: null, deletionApprovedAt: null })).toBe(false);
  });

  it('computes the completion rate, 0 without bookings', () => {
    expect(completionRatePct({})).toBe(0);
    expect(completionRatePct({ COMPLETED: 7, PENDING: 2, NO_SHOW: 1 })).toBe(70);
    expect(completionRatePct({ PENDING: 3 })).toBe(0);
  });
});

describe('salonQueryOf', () => {
  it('maps the new filters and drops unknown values', () => {
    expect(queryOf('')).toEqual({ page: 1, pageSize: 25 });
    expect(queryOf('subscription=TRIAL&recommended=true&deletion=true')).toEqual({
      page: 1,
      pageSize: 25,
      subscription: 'TRIAL',
      recommended: true,
      deletionRequested: true,
    });
    expect(queryOf('subscription=NOPE&recommended=maybe&deletion=false')).toEqual({
      page: 1,
      pageSize: 25,
    });
    expect(queryOf('recommended=false').recommended).toBe(false);
  });
});

describe('SalonsPage insight filters', () => {
  const open = () =>
    renderWithApp(
      <MemoryRouter>
        <SalonsPage />
      </MemoryRouter>,
      makeContainer(),
      'en',
    );

  it('shows the recommended flag, bookings of 30 days and the deletion request', async () => {
    open();
    await waitFor(() => expect(bodyRows()).toBe(4));
    expect(screen.getByRole('columnheader', { name: 'Bookings (30 days)' })).toBeInTheDocument();
    expect(screen.getAllByText('Recommended').length).toBeGreaterThan(1);
    expect(screen.getByText('Deletion requested', { selector: 'span' })).toBeInTheDocument();
  });

  it('filters by subscription, by recommended and by deletion request', async () => {
    const user = userEvent.setup();
    open();
    await waitFor(() => expect(bodyRows()).toBe(4));
    await user.selectOptions(screen.getByLabelText('Subscription'), 'ACTIVE');
    await waitFor(() => expect(bodyRows()).toBe(2));
    await user.selectOptions(screen.getByLabelText('Subscription'), '');
    await user.selectOptions(screen.getByLabelText('Recommended'), 'true');
    await waitFor(() => expect(bodyRows()).toBe(1));
    await user.selectOptions(screen.getByLabelText('Recommended'), '');
    await user.selectOptions(screen.getByLabelText('Deletion requested'), 'true');
    await waitFor(() => expect(bodyRows()).toBe(1));
    expect(screen.getByText('Lama Beauty')).toBeInTheDocument();
  });
});

describe('SalonDetailsPage insights', () => {
  const open = (index: number) =>
    renderWithApp(
      <MemoryRouter initialEntries={[`/salons/${MOCK_SALONS[index]!.id}`]}>
        <Routes>
          <Route path="/salons/:id" element={<SalonDetailsPage />} />
        </Routes>
      </MemoryRouter>,
      makeContainer(),
      'en',
    );

  it('shows KPIs, the trend and the admin activity', async () => {
    const user = userEvent.setup();
    open(0);
    await user.click(await screen.findByRole('tab', { name: 'Insights' }));
    expect(await screen.findByText('Active services')).toBeInTheDocument();
    expect(await screen.findByText('Bookings per day')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Admin activity' }));
    expect(await screen.findByText('Working hours edited')).toBeInTheDocument();
    expect(screen.getByText('Owner asked')).toBeInTheDocument();
  });

  it('asks for a reason to approve or reject a deletion request, and only shows it when one is open', async () => {
    const user = userEvent.setup();
    open(2);
    await user.click(
      await screen.findByRole('button', { name: 'Approve deletion' }, { timeout: 4000 }),
    );
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByRole('textbox'), 'Owner confirmed');
    await user.click(within(dialog).getByRole('button', { name: 'Approve deletion' }));
    expect(await screen.findByText('Decision saved')).toBeInTheDocument();
  });

  it('has no deletion buttons for a salon without a request', async () => {
    open(0);
    await screen.findByRole('button', { name: 'Take offline' }, { timeout: 4000 });
    expect(screen.queryByRole('button', { name: 'Approve deletion' })).toBeNull();
  });
});
