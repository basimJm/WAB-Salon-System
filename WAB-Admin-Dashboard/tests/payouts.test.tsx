import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import PayoutsPage from '@/presentation/payouts/PayoutsPage';
import { makeContainer, renderWithApp } from './helpers/render';

const open = () => renderWithApp(<PayoutsPage />, makeContainer());

describe('PayoutsPage', () => {
  it('shows what each salon is owed', async () => {
    open();
    expect(await screen.findByText('Noor Salon')).toBeInTheDocument();
    expect(screen.getAllByText('372.500 JOD').length).toBeGreaterThan(0);
  });

  it('creating a payout previews the net first and lands in the history as pending', async () => {
    open();
    await userEvent.click(
      (await screen.findAllByRole('button', { name: 'Create payout' }))[0] as HTMLElement,
    );
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText('295.500 JOD')).toBeInTheDocument();
    await userEvent.type(within(dialog).getByLabelText('Note (optional)'), 'October first half');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await userEvent.click(screen.getByRole('tab', { name: 'Payout history' }));
    await waitFor(() => expect(screen.getAllByRole('row').length - 1).toBe(3));
  });

  it('recording the transfer needs the exact net, a reference and a note', async () => {
    open();
    await userEvent.click(await screen.findByRole('tab', { name: 'Payout history' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Record transfer' }));
    const dialog = await screen.findByRole('dialog');
    const amount = within(dialog).getByLabelText('Amount transferred');
    await userEvent.clear(amount);
    await userEvent.type(amount, '100.000');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(
      await within(dialog).findByText('The amount must equal the net (384.000)'),
    ).toBeInTheDocument();
    await userEvent.clear(amount);
    await userEvent.type(amount, '384.000');
    await userEvent.type(within(dialog).getByLabelText('Bank reference'), 'TRX-9');
    await userEvent.type(within(dialog).getByLabelText('Note'), 'Cliq transfer');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Record transfer' })).toBeNull(),
    );
  });

  it('filters the history by status', async () => {
    open();
    await userEvent.click(await screen.findByRole('tab', { name: 'Payout history' }));
    await waitFor(() => expect(screen.getAllByRole('row').length - 1).toBe(2));
    await userEvent.selectOptions(screen.getByLabelText('State'), 'TRANSFERRED');
    await waitFor(() => expect(screen.getAllByRole('row').length - 1).toBe(1));
  });
});
