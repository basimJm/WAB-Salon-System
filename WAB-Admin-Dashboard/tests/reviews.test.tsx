import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { parseListState } from '@/domain/shared/listState';
import ReviewsPage from '@/presentation/reviews/ReviewsPage';
import { reviewFilters } from '@/presentation/reviews/reviewFilters';
import { makeContainer, renderWithApp } from './helpers/render';

const open = () =>
  renderWithApp(
    <MemoryRouter>
      <ReviewsPage />
    </MemoryRouter>,
    makeContainer(),
  );
const bodyRows = () => screen.getAllByRole('row').length - 1;
const filtersOf = (qs: string) =>
  reviewFilters(
    parseListState(new URLSearchParams(qs), { filterKeys: ['status', 'target', 'rating'] }),
  );

describe('reviewFilters', () => {
  it('defaults to the pending queue and drops unknown values', () => {
    expect(filtersOf('').query).toEqual({ page: 1, pageSize: 25, status: 'PENDING' });
    expect(filtersOf('status=REMOVED&target=STAFF&rating=4').query).toMatchObject({
      status: 'REMOVED',
      target: 'STAFF',
      rating: 4,
    });
    expect(filtersOf('status=X&target=Y&rating=9').query).toEqual({
      page: 1,
      pageSize: 25,
      status: 'PENDING',
    });
  });
});

describe('ReviewsPage', () => {
  it('shows the pending queue and approves one review', async () => {
    open();
    await waitFor(() => expect(bodyRows()).toBe(3));
    await userEvent.click(screen.getAllByRole('button', { name: 'Approve' })[0] as HTMLElement);
    await waitFor(() => expect(bodyRows()).toBe(2));
  });

  it('rejecting asks for a reason', async () => {
    open();
    await waitFor(() => expect(bodyRows()).toBe(3));
    await userEvent.click(screen.getAllByRole('button', { name: 'Reject' })[0] as HTMLElement);
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByRole('textbox'), 'Spam');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Reject' }));
    await waitFor(() => expect(bodyRows()).toBe(2));
  });

  it('bulk approve works on the selection and reports the count', async () => {
    open();
    await waitFor(() => expect(bodyRows()).toBe(3));
    await userEvent.click(screen.getByRole('checkbox', { name: /select all/i }));
    await userEvent.click(await screen.findByRole('button', { name: 'Approve selected' }));
    await waitFor(() => expect(screen.getByText('No reviews here')).toBeInTheDocument());
  });

  it('published reviews can be removed with a reason', async () => {
    open();
    await userEvent.click(await screen.findByRole('radio', { name: 'Published' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Remove' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByRole('textbox'), 'Offensive');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(screen.getByText('No reviews here')).toBeInTheDocument());
  });
});
