import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { MOCK_REFUNDS } from '@/data/mock/refundsRoutes';
import { canAct, isOverdue } from '@/domain/refunds/refunds';
import RefundsPage from '@/presentation/refunds/RefundsPage';
import { makeContainer, renderWithApp } from './helpers/render';

const open = () =>
  renderWithApp(
    <MemoryRouter>
      <RefundsPage />
    </MemoryRouter>,
    makeContainer(),
  );
const bodyRows = () => screen.getAllByRole('row').length - 1;
const NOW = new Date('2026-10-14T00:00:00Z');

describe('refund rules', () => {
  it('overdue = not refunded and the next attempt is in the past', () => {
    const [failed, pending, done] = MOCK_REFUNDS;
    expect(isOverdue(failed!, NOW)).toBe(true);
    expect(isOverdue(pending!, NOW)).toBe(false);
    expect(isOverdue(done!, NOW)).toBe(false);
    expect(canAct(done!)).toBe(false);
    expect(canAct(failed!)).toBe(true);
  });
});

describe('RefundsPage', () => {
  it('lists refunds, flags the overdue one and hides actions for the refunded one', async () => {
    open();
    await waitFor(() => expect(bodyRows()).toBe(3));
    expect(screen.getByText('Overdue')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Retry now' })).toHaveLength(2);
  });

  it('filters by status', async () => {
    open();
    await waitFor(() => expect(bodyRows()).toBe(3));
    await userEvent.selectOptions(screen.getByLabelText('State'), 'REFUNDED');
    await waitFor(() => expect(bodyRows()).toBe(1));
  });

  it('retry asks for a reason and marks the refund as refunded', async () => {
    open();
    await userEvent.click(
      (await screen.findAllByRole('button', { name: 'Retry now' }))[0] as HTMLElement,
    );
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByRole('textbox'), 'Gateway is back');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Retry now' }));
    await waitFor(() => expect(screen.queryByText('Overdue')).toBeNull());
  });

  it('manual refund needs a bank reference and a reason', async () => {
    open();
    await userEvent.click(
      (await screen.findAllByRole('button', { name: 'Mark as refunded' }))[0] as HTMLElement,
    );
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(await within(dialog).findByText('Required, up to 100 characters')).toBeInTheDocument();
    await userEvent.type(within(dialog).getByLabelText('Bank reference'), 'TRX-1');
    await userEvent.type(within(dialog).getByLabelText('Reason'), 'Paid by transfer');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
