import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { actionsFor } from '@/domain/customers/customers';
import { MOCK_CUSTOMERS } from '@/data/mock/customersRoutes';
import CustomerDetailsPage from '@/presentation/customers/CustomerDetailsPage';
import CustomersPage from '@/presentation/customers/CustomersPage';
import { renderWithApp } from './helpers/render';

const app = (path = '/customers') =>
  renderWithApp(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/customers/:id" element={<CustomerDetailsPage />} />
      </Routes>
    </MemoryRouter>,
  );
const bodyRows = () => screen.getAllByRole('row').length - 1;

describe('actionsFor', () => {
  it('offers only the actions that fit the status', () => {
    expect(actionsFor('ACTIVE')).toEqual(['block', 'delete']);
    expect(actionsFor('BLOCKED')).toEqual(['unblock', 'delete']);
    expect(actionsFor('DELETION_PENDING')).toEqual(['restore']);
    expect(actionsFor('DELETED')).toEqual([]);
  });
});

describe('CustomersPage', () => {
  it('lists customers and filters by status', async () => {
    app();
    await waitFor(() => expect(bodyRows()).toBe(3));
    await userEvent.selectOptions(screen.getByLabelText('State'), 'BLOCKED');
    await waitFor(() => expect(bodyRows()).toBe(1));
    expect(screen.getByText('Omar Saleh')).toBeInTheDocument();
  });

  it('opens a customer from a row', async () => {
    app();
    await userEvent.click(await screen.findByText('Dana Khoury'));
    expect(await screen.findByRole('heading', { name: 'Dana Khoury' })).toBeInTheDocument();
  });
});

describe('CustomerDetailsPage', () => {
  it('shows the profile and devices', async () => {
    app(`/customers/${MOCK_CUSTOMERS[0]!.id}`);
    expect(await screen.findByText('customer@example.test')).toBeInTheDocument();
    expect(screen.getByText('1.4.0')).toBeInTheDocument();
  });

  it('blocks an active customer with a reason, then offers unblock', async () => {
    app(`/customers/${MOCK_CUSTOMERS[0]!.id}`);
    await userEvent.click(await screen.findByRole('button', { name: 'Block' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByRole('textbox'), 'Abuse reports');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Block' }));
    expect(await screen.findByRole('button', { name: 'Unblock' })).toBeInTheDocument();
  });

  it('a blocked customer shows the block reason and can start deletion', async () => {
    app(`/customers/${MOCK_CUSTOMERS[1]!.id}`);
    expect(await screen.findByText('Abuse reports')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Start deletion' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByRole('textbox'), 'Customer asked');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Start deletion' }));
    expect(await screen.findByRole('button', { name: 'Restore' })).toBeInTheDocument();
  });
});
