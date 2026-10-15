import { screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import ReconciliationPage from '@/presentation/transactions/ReconciliationPage';
import { makeContainer, renderWithApp } from './helpers/render';

const open = (container = makeContainer()) =>
  renderWithApp(
    <MemoryRouter>
      <ReconciliationPage />
    </MemoryRouter>,
    container,
  );

describe('ReconciliationPage', () => {
  it('shows the three problem lists with counts and the total', async () => {
    open();
    expect(await screen.findByText('2 to review')).toBeInTheDocument();
    expect(screen.getByText('Stuck pending (1)')).toBeInTheDocument();
    expect(screen.getByText('Paid without a booking (0)')).toBeInTheDocument();
    expect(screen.getByText('Missing ledger charge (1)')).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText('Nothing to review').length).toBe(1));
  });

  it('shows the error state with retry', async () => {
    const failing = makeContainer();
    failing.mock?.scenarios.set('serverError');
    open(failing);
    expect(await screen.findByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});
