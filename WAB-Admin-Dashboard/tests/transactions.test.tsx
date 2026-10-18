import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { MOCK_TRANSACTIONS } from '@/data/mock/transactionsRoutes';
import TransactionDetailsPage from '@/presentation/transactions/TransactionDetailsPage';
import TransactionsPage from '@/presentation/transactions/TransactionsPage';
import { makeContainer, renderWithApp } from './helpers/render';

const app = (path = '/finance/transactions', container = makeContainer()) =>
  renderWithApp(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/finance/transactions" element={<TransactionsPage />} />
        <Route path="/finance/transactions/:id" element={<TransactionDetailsPage />} />
      </Routes>
    </MemoryRouter>,
    container,
  );
const bodyRows = () => screen.getAllByRole('row').length - 1;

describe('TransactionsPage', () => {
  it('lists attempts with amount, fee and gateway code', async () => {
    app();
    await waitFor(() => expect(bodyRows()).toBe(3));
    expect(screen.getByText('800.100.151')).toBeInTheDocument();
    expect(screen.getAllByText('12.000 JOD').length).toBeGreaterThan(0);
  });

  it('filters by status and by type', async () => {
    app();
    await waitFor(() => expect(bodyRows()).toBe(3));
    await userEvent.selectOptions(screen.getByLabelText('State'), 'FAILED');
    await waitFor(() => expect(bodyRows()).toBe(1));
    await userEvent.selectOptions(screen.getByLabelText('State'), '');
    await userEvent.selectOptions(screen.getByLabelText('Type'), 'FULL');
    await waitFor(() => expect(bodyRows()).toBe(1));
  });

  it('opens a payment with its attempts and the raw gateway answer', async () => {
    app();
    await userEvent.click(await screen.findByText('800.100.151'));
    expect((await screen.findAllByText('Attempts of this checkout')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Gateway answer (raw)').length).toBeGreaterThan(0);
    expect(screen.getByText('Card declined')).toBeInTheDocument();
  });

  it('shows the error state when the server fails', async () => {
    const failing = makeContainer();
    failing.mock?.scenarios.set('serverError');
    app('/finance/transactions', failing);
    expect(await screen.findByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('details open directly by id', async () => {
    app(`/finance/transactions/${MOCK_TRANSACTIONS[1]!.id}`);
    expect(await screen.findByText('0.450 JOD')).toBeInTheDocument();
  });
});
