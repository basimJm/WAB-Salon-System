import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import SubscriptionsPage from '@/presentation/subscriptions/SubscriptionsPage';
import { makeContainer, renderWithApp } from './helpers/render';

const open = () =>
  renderWithApp(
    <MemoryRouter>
      <SubscriptionsPage />
    </MemoryRouter>,
    makeContainer(),
  );
const bodyRows = () => screen.getAllByRole('row').length - 1;

describe('SubscriptionsPage', () => {
  it('lists subscriptions with status and days left', async () => {
    open();
    await waitFor(() => expect(bodyRows()).toBe(3));
    expect(screen.getByText('Royal Barber')).toBeInTheDocument();
  });

  it('filters by status and by ending soon', async () => {
    open();
    await waitFor(() => expect(bodyRows()).toBe(3));
    await userEvent.selectOptions(screen.getByLabelText('State'), 'EXPIRED');
    await waitFor(() => expect(bodyRows()).toBe(1));
    await userEvent.selectOptions(screen.getByLabelText('State'), '');
    await userEvent.selectOptions(screen.getByLabelText('Ending soon'), '7');
    await waitFor(() => expect(bodyRows()).toBe(1));
    expect(screen.getByText('Royal Barber')).toBeInTheDocument();
  });

  it('records an outside payment: validates, then the salon becomes active', async () => {
    open();
    await waitFor(() => expect(bodyRows()).toBe(3));
    await userEvent.click(
      screen.getAllByRole('button', { name: 'Record payment' })[2] as HTMLElement,
    );
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(await within(dialog).findByText('Enter an amount like 25.000')).toBeInTheDocument();
    await userEvent.type(within(dialog).getByLabelText('Amount'), '25.000');
    await userEvent.type(within(dialog).getByLabelText('Method (cash, transfer...)'), 'Cash');
    await userEvent.type(within(dialog).getByLabelText('Reference'), 'RCPT-1');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(screen.getAllByText('Active').length).toBeGreaterThan(0));
  });

  it('shows the recorded payments of a salon', async () => {
    open();
    await waitFor(() => expect(bodyRows()).toBe(3));
    await userEvent.click(screen.getAllByRole('button', { name: 'Payments' })[0] as HTMLElement);
    expect(await screen.findByText('No payments recorded')).toBeInTheDocument();
  });
});
