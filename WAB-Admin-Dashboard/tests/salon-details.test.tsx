import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import SalonDetailsPage from '@/presentation/salons/SalonDetailsPage';
import SalonsPage from '@/presentation/salons/SalonsPage';
import { MOCK_SALONS } from '@/data/mock/salonsRoutes';
import { makeContainer, renderWithApp } from './helpers/render';

const at = (id: string, container = makeContainer()) =>
  renderWithApp(
    <MemoryRouter initialEntries={[`/salons/${id}`]}>
      <Routes>
        <Route path="/salons/:id" element={<SalonDetailsPage />} />
      </Routes>
    </MemoryRouter>,
    container,
  );

describe('SalonDetailsPage', () => {
  it('shows the profile facts, owner and subscription', async () => {
    at(MOCK_SALONS[0]!.id);
    expect(await screen.findByRole('heading', { name: 'Noor Salon' })).toBeInTheDocument();
    expect(screen.getByText('Maha Haddad')).toBeInTheDocument();
    expect(screen.getByText('Complete')).toBeInTheDocument();
  });

  it('lists what is missing for an incomplete salon', async () => {
    at(MOCK_SALONS[2]!.id);
    expect(await screen.findByText('Missing: GALLERY')).toBeInTheDocument();
  });

  it('shows why an offline salon was taken offline', async () => {
    at(MOCK_SALONS[1]!.id);
    expect(await screen.findByText('Owner request')).toBeInTheDocument();
  });

  it('members tab lists the team with roles', async () => {
    at(MOCK_SALONS[0]!.id);
    await userEvent.click(await screen.findByRole('tab', { name: 'Members' }));
    expect(await screen.findByText('Sara Ali')).toBeInTheDocument();
    expect(screen.getByText('Owner', { selector: 'td' })).toBeInTheDocument();
  });

  it('shows the error state when the server fails', async () => {
    const c = makeContainer();
    c.mock?.scenarios.set('serverError');
    at(MOCK_SALONS[0]!.id, c);
    expect(await screen.findByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('a row of the salons list opens its page', async () => {
    renderWithApp(
      <MemoryRouter initialEntries={['/salons']}>
        <Routes>
          <Route path="/salons" element={<SalonsPage />} />
          <Route path="/salons/:id" element={<SalonDetailsPage />} />
        </Routes>
      </MemoryRouter>,
    );
    await userEvent.click(await screen.findByText('Royal Barber'));
    expect(await screen.findByRole('heading', { name: 'Royal Barber' })).toBeInTheDocument();
  });
});
