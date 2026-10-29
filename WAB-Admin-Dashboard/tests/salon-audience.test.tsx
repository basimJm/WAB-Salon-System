import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { MOCK_BOOKINGS } from '@/data/mock/bookingsRoutes';
import { MOCK_SALONS } from '@/data/mock/salonsRoutes';
import { AppError } from '@/infrastructure/errors/AppError';
import { conflictBookingIds } from '@/presentation/salons/conflictBookings';
import SalonDetailsPage from '@/presentation/salons/SalonDetailsPage';
import { renderWithApp } from './helpers/render';

const salonNamed = (name: string) => {
  const salon = MOCK_SALONS.find((s) => s.name === name);
  if (!salon) throw new Error(`no mock salon ${name}`);
  return salon;
};
const at = (name: string) =>
  renderWithApp(
    <MemoryRouter initialEntries={[`/salons/${salonNamed(name).id}`]}>
      <Routes>
        <Route path="/salons/:id" element={<SalonDetailsPage />} />
      </Routes>
    </MemoryRouter>,
  );
const openDrawer = async () => {
  await userEvent.click(await screen.findByRole('button', { name: 'Change audience' }));
  return screen.findByRole('dialog');
};

describe('conflictBookingIds (§5.12 conflict list)', () => {
  it('reads the booking ids of a 409 SCHEDULE_CONFLICT, once each', () => {
    const conflict = new AppError({
      kind: 'conflict',
      status: 409,
      code: 'SCHEDULE_CONFLICT',
      details: [{ field: 'b1' }, { field: 'b2' }, { field: 'b1' }, { field: '' }],
    });
    expect(conflictBookingIds(conflict)).toEqual(['b1', 'b2']);
  });

  it('gives nothing for any other error', () => {
    const other = new AppError({ kind: 'conflict', status: 422, code: 'INVALID_TRANSITION' });
    expect(conflictBookingIds(other)).toEqual([]);
    expect(conflictBookingIds(new Error('x'))).toEqual([]);
    expect(conflictBookingIds(null)).toEqual([]);
  });
});

describe('salon audience drawer (BUSINESS_DOMAIN §5.19)', () => {
  it('a clinic has no audience change at all', async () => {
    at('Glow Clinic');
    expect(await screen.findByRole('button', { name: 'Take offline' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Change audience' })).toBeNull();
  });

  it('offers only other audiences, explains widening and needs a reason', async () => {
    at('Royal Barber');
    const dialog = await openDrawer();
    const select = within(dialog).getByLabelText('Audience');
    const values = within(select)
      .getAllByRole('option')
      .map((o) => (o as HTMLOptionElement).value);
    expect(values).toEqual(['FEMALE', 'BOTH']);
    await userEvent.selectOptions(select, 'BOTH');
    expect(within(dialog).getByRole('note')).toHaveTextContent('keeps every service');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(await within(dialog).findByText(/Write the reason/)).toBeInTheDocument();
    await userEvent.type(within(dialog).getByLabelText('Reason'), 'Owner asked for both');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect((await screen.findAllByText('Men & women')).length).toBeGreaterThan(0);
  });

  it('narrowing with future bookings is refused: the conflict list links to each booking', async () => {
    at('Noor Salon');
    const dialog = await openDrawer();
    await userEvent.selectOptions(within(dialog).getByLabelText('Audience'), 'MALE');
    expect(within(dialog).getByRole('note')).toHaveTextContent('switches off');
    await userEvent.type(within(dialog).getByLabelText('Reason'), 'Wrong audience');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    const blocking = MOCK_BOOKINGS.filter((b) => b.status === 'PENDING' || b.status === 'APPROVED');
    expect(await within(dialog).findByText(/block this change/)).toBeInTheDocument();
    for (const b of blocking) {
      const link = await within(dialog).findByRole('link', { name: new RegExp(b.referenceNumber) });
      expect(link).toHaveAttribute('href', `/bookings/${b.id}`);
    }
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('narrowing a mixed salon without future bookings succeeds', async () => {
    at('Lama Beauty');
    const dialog = await openDrawer();
    await userEvent.selectOptions(within(dialog).getByLabelText('Audience'), 'FEMALE');
    await userEvent.type(within(dialog).getByLabelText('Reason'), 'Women only now');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
