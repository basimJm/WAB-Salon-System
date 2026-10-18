import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import SalonsPage from '@/presentation/salons/SalonsPage';
import { makeContainer, renderWithApp } from './helpers/render';

const open = (container = makeContainer()) =>
  renderWithApp(
    <MemoryRouter>
      <SalonsPage />
    </MemoryRouter>,
    container,
  );
const bodyRows = () => screen.getAllByRole('row').length - 1;

describe('SalonsPage', () => {
  it('lists salons with state, city and subscription', async () => {
    open();
    await waitFor(() => expect(bodyRows()).toBe(3));
    expect(screen.getByText('Noor Salon')).toBeInTheDocument();
    expect(screen.getAllByText('Amman').length).toBeGreaterThan(0);
  });

  it('filters by audience and by state', async () => {
    open();
    await waitFor(() => expect(bodyRows()).toBe(3));
    await userEvent.selectOptions(screen.getByLabelText('Audience'), 'MALE');
    await waitFor(() => expect(bodyRows()).toBe(1));
    expect(screen.getByText('Royal Barber')).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Audience'), '');
    await userEvent.selectOptions(screen.getByLabelText('State'), 'LIVE');
    await waitFor(() => expect(bodyRows()).toBe(1));
  });

  it('searches by name', async () => {
    open();
    await waitFor(() => expect(bodyRows()).toBe(3));
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search by name' }), 'lama');
    await waitFor(() => expect(screen.getByText('Lama Beauty')).toBeInTheDocument(), {
      timeout: 3000,
    });
    await waitFor(() => expect(bodyRows()).toBe(1), { timeout: 3000 });
  });

  it('shows the error state with retry', async () => {
    const failing = makeContainer();
    failing.mock?.scenarios.set('serverError');
    open(failing);
    expect(await screen.findByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});
